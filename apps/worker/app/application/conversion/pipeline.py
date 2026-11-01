import logging
import shutil
import tempfile
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from app.config import Settings
from app.domain.conversion.errors import classify_probe_error, friendly_failure
from app.domain.conversion.events import DomainEvent, EventType, new_event
from app.domain.conversion.job import ConversionJob, FailureCode, JobStatus, Quality
from app.domain.conversion.ports import (
    DownloadedFile,
    MediaConverter,
    MediaDownloader,
    MediaInfo,
    MediaProber,
    ObjectStorage,
    StoredObject,
)

logger = logging.getLogger(__name__)

EventSink = Callable[[DomainEvent], None]


class PipelineError(Exception):
    def __init__(self, code: FailureCode, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass(slots=True)
class PipelineDeps:
    prober: MediaProber
    downloader: MediaDownloader
    converter: MediaConverter
    storage: ObjectStorage
    settings: Settings
    emit: EventSink


class ConversionPipeline:
    def __init__(self, deps: PipelineDeps, correlation_id: str | None = None) -> None:
        self._deps = deps
        self._correlation_id = correlation_id

    def run(self, job: ConversionJob) -> ConversionJob:
        started = time.monotonic()
        workdir = Path(tempfile.mkdtemp(prefix=f"grabwave-{job.job_id}-", dir=self._deps.settings.tmp_dir))
        try:
            info = self._probe(job)
            self._guard(info)
            downloaded = self._download(job, workdir, info)
            converted = self._convert(job, workdir, downloaded, info.duration_seconds)
            stored = self._upload(job, converted)
            self._finish(job, stored.key)
            return job
        except PipelineError as error:
            job.fail(error.code)
            logger.warning(
                "conversion failed",
                extra={"jobId": job.job_id, "code": error.code.value},
                exc_info=True,
            )
            self._emit(
                EventType.JOB_FAILED,
                job,
                {
                    "code": error.code.value,
                    "message": friendly_failure(error.code, error),
                    "elapsedMs": _ms(started),
                },
            )
            return job
        except Exception as error:  # noqa: BLE001 - worker boundary
            job.fail(FailureCode.UNKNOWN)
            logger.exception("conversion failed unexpectedly", extra={"jobId": job.job_id})
            self._emit(
                EventType.JOB_FAILED,
                job,
                {
                    "code": FailureCode.UNKNOWN.value,
                    "message": friendly_failure(FailureCode.UNKNOWN, error),
                    "elapsedMs": _ms(started),
                },
            )
            return job
        finally:
            shutil.rmtree(workdir, ignore_errors=True)

    def _probe(self, job: ConversionJob) -> MediaInfo:
        job.transition(JobStatus.PROBING)
        try:
            info = self._deps.prober.probe(job.url)
        except Exception as error:  # noqa: BLE001
            raise PipelineError(classify_probe_error(error), str(error)) from error
        self._emit(
            EventType.JOB_PROBE_SUCCEEDED,
            job,
            {
                "title": info.title,
                "durationSeconds": info.duration_seconds,
                "uploader": info.uploader,
                "thumbnailUrl": info.thumbnail_url,
                "extractor": info.extractor,
            },
        )
        return info

    def _guard(self, info: MediaInfo) -> None:
        if info.is_live:
            raise PipelineError(FailureCode.UNSUPPORTED_SOURCE, "live streams are not supported")
        if info.duration_seconds > self._deps.settings.max_duration_seconds:
            raise PipelineError(FailureCode.TOO_LONG, "media exceeds the maximum duration")

    def _download(self, job: ConversionJob, workdir: Path, info: MediaInfo) -> DownloadedFile:
        job.transition(JobStatus.DOWNLOADING)
        self._emit(
            EventType.JOB_DOWNLOAD_STARTED,
            job,
            {"format": job.format.value, "quality": job.quality.value, "title": info.title},
        )

        def on_progress(percent: int) -> None:
            mapped = 5 + int(percent * 0.55)
            if mapped > job.progress:
                job.progress_to(mapped)
                self._emit(EventType.JOB_PROGRESSED, job, {"stage": "downloading", "percent": job.progress})

        try:
            downloaded = self._deps.downloader.download(job.url, job.format, job.quality, workdir, on_progress)
        except PipelineError:
            raise
        except Exception as error:  # noqa: BLE001
            raise PipelineError(FailureCode.DOWNLOAD_FAILED, str(error)) from error
        limit_mb = (
            self._deps.settings.max_4k_file_size_mb
            if job.quality is Quality.VIDEO_2160
            else self._deps.settings.max_file_size_mb
        )
        limit = limit_mb * 1024 * 1024
        if downloaded.size_bytes > limit:
            raise PipelineError(FailureCode.TOO_LARGE, "downloaded media exceeds the size limit")
        return downloaded

    def _convert(
        self,
        job: ConversionJob,
        workdir: Path,
        source: DownloadedFile,
        duration_seconds: float,
    ) -> DownloadedFile:
        job.transition(JobStatus.CONVERTING)
        destination = workdir / f"output.{job.format.value}"

        def on_progress(percent: int) -> None:
            mapped = 60 + int(percent * 0.2)
            if mapped > job.progress:
                job.progress_to(mapped)
                self._emit(
                    EventType.JOB_PROGRESSED,
                    job,
                    {"stage": "converting", "percent": job.progress},
                )

        try:
            converted = self._deps.converter.convert(
                source,
                job.format,
                job.quality,
                destination,
                duration_seconds=duration_seconds,
                on_progress=on_progress,
            )
        except Exception as error:  # noqa: BLE001
            raise PipelineError(FailureCode.CONVERT_FAILED, str(error)) from error
        job.progress_to(80)
        self._emit(
            EventType.JOB_CONVERTED,
            job,
            {"format": job.format.value, "quality": job.quality.value, "sizeBytes": converted.size_bytes},
        )
        return converted

    def _upload(self, job: ConversionJob, converted: DownloadedFile) -> StoredObject:
        job.transition(JobStatus.UPLOADING)
        key = f"jobs/{job.job_id}/output.{job.format.value}"
        try:
            stored = self._deps.storage.upload(converted.path, key, converted.content_type)
        except Exception as error:  # noqa: BLE001
            raise PipelineError(FailureCode.UPLOAD_FAILED, str(error)) from error
        job.progress_to(95)
        self._emit(
            EventType.JOB_UPLOADED,
            job,
            {"key": stored.key, "url": stored.url, "expiresInSeconds": stored.expires_in_seconds},
        )
        return stored

    def _finish(self, job: ConversionJob, key: str) -> None:
        job.transition(JobStatus.READY)
        job.output_key = key
        job.progress_to(100)
        self._emit(EventType.JOB_READY, job, {"outputKey": key, "progress": 100})

    def _emit(self, event_type: EventType, job: ConversionJob, payload: dict[str, object]) -> None:
        self._deps.emit(
            new_event(
                event_type,
                job.job_id,
                {"jobId": job.job_id, **payload},
                correlation_id=self._correlation_id,
            )
        )


def _ms(started: float) -> int:
    return int((time.monotonic() - started) * 1000)
