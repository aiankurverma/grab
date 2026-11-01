from collections.abc import Callable
from pathlib import Path

from app.application.conversion.pipeline import PipelineDeps
from app.config import Settings
from app.domain.conversion.events import DomainEvent
from app.domain.conversion.ports import ObjectStorage
from app.infrastructure.ffmpeg import FfmpegConverter
from app.infrastructure.storage import LocalStorage, S3Storage
from app.infrastructure.ytdlp import YtDlpDownloader, YtDlpProber


def build_storage(settings: Settings) -> ObjectStorage:
    if settings.storage_driver == "s3":
        return S3Storage(
            endpoint_url=settings.s3_endpoint or None,
            region=settings.s3_region,
            bucket=settings.s3_bucket,
            access_key=settings.s3_access_key,
            secret_key=settings.s3_secret_key,
            force_path_style=settings.s3_force_path_style,
            ttl_seconds=settings.signed_url_ttl_seconds,
        )
    return LocalStorage(
        root=Path(settings.tmp_dir) / "media",
        public_base_url=f"{settings.app_url}/api/media",
        ttl_seconds=settings.signed_url_ttl_seconds,
        signing_secret=settings.internal_api_secret,
    )


def build_pipeline_deps(settings: Settings, emit: Callable[[DomainEvent], None]) -> PipelineDeps:
    return PipelineDeps(
        prober=YtDlpProber(),
        downloader=YtDlpDownloader(),
        converter=FfmpegConverter(
            threads=settings.worker_threads,
            timeout_seconds=settings.job_timeout_seconds,
        ),
        storage=build_storage(settings),
        settings=settings,
        emit=emit,
    )
