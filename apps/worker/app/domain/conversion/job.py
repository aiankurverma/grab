from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Final


class Format(StrEnum):
    MP3 = "mp3"
    MP4 = "mp4"
    JPG = "jpg"
    PNG = "png"


class Quality(StrEnum):
    AUDIO_128 = "128"
    AUDIO_192 = "192"
    AUDIO_320 = "320"
    VIDEO_360 = "360"
    VIDEO_480 = "480"
    VIDEO_720 = "720"
    VIDEO_1080 = "1080"
    VIDEO_2160 = "2160"
    ORIGINAL = "original"


AUDIO_QUALITIES: Final = frozenset({Quality.AUDIO_128, Quality.AUDIO_192, Quality.AUDIO_320})
VIDEO_QUALITIES: Final = frozenset(
    {
        Quality.VIDEO_360,
        Quality.VIDEO_480,
        Quality.VIDEO_720,
        Quality.VIDEO_1080,
        Quality.VIDEO_2160,
    }
)
IMAGE_FORMATS: Final = frozenset({Format.JPG, Format.PNG})
IMAGE_QUALITIES: Final = frozenset(
    {
        Quality.ORIGINAL,
        Quality.VIDEO_360,
        Quality.VIDEO_480,
        Quality.VIDEO_720,
        Quality.VIDEO_1080,
        Quality.VIDEO_2160,
    }
)


class JobStatus(StrEnum):
    QUEUED = "queued"
    PROBING = "probing"
    DOWNLOADING = "downloading"
    CONVERTING = "converting"
    UPLOADING = "uploading"
    READY = "ready"
    FAILED = "failed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


TERMINAL: Final = frozenset({JobStatus.READY, JobStatus.FAILED, JobStatus.CANCELLED, JobStatus.EXPIRED})

TRANSITIONS: Final[dict[JobStatus, frozenset[JobStatus]]] = {
    JobStatus.QUEUED: frozenset({JobStatus.PROBING, JobStatus.FAILED, JobStatus.CANCELLED}),
    JobStatus.PROBING: frozenset({JobStatus.DOWNLOADING, JobStatus.FAILED, JobStatus.CANCELLED}),
    JobStatus.DOWNLOADING: frozenset({JobStatus.CONVERTING, JobStatus.FAILED, JobStatus.CANCELLED}),
    JobStatus.CONVERTING: frozenset({JobStatus.UPLOADING, JobStatus.FAILED, JobStatus.CANCELLED}),
    JobStatus.UPLOADING: frozenset({JobStatus.READY, JobStatus.FAILED, JobStatus.CANCELLED}),
    JobStatus.READY: frozenset({JobStatus.EXPIRED}),
    JobStatus.FAILED: frozenset(),
    JobStatus.CANCELLED: frozenset(),
    JobStatus.EXPIRED: frozenset(),
}


class InvalidTransition(Exception):
    pass


class FailureCode(StrEnum):
    URL_NOT_ALLOWED = "url_not_allowed"
    SSRF_BLOCKED = "ssrf_blocked"
    UNSUPPORTED_SOURCE = "unsupported_source"
    PRIVATE_OR_REMOVED = "private_or_removed"
    TOO_LONG = "too_long"
    TOO_LARGE = "too_large"
    DOWNLOAD_FAILED = "download_failed"
    CONVERT_FAILED = "convert_failed"
    UPLOAD_FAILED = "upload_failed"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"
    UNKNOWN = "unknown"


def validate_quality(fmt: Format, quality: Quality) -> None:
    if fmt in IMAGE_FORMATS:
        return
    allowed = AUDIO_QUALITIES if fmt is Format.MP3 else VIDEO_QUALITIES
    if quality not in allowed:
        raise ValueError(f"quality {quality} is not valid for {fmt}")


@dataclass(slots=True)
class ConversionJob:
    job_id: str
    url: str
    format: Format
    quality: Quality
    status: JobStatus = JobStatus.QUEUED
    progress: int = 0
    attempts: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    failure_code: FailureCode | None = None
    output_key: str | None = None

    def __post_init__(self) -> None:
        validate_quality(self.format, self.quality)

    def transition(self, target: JobStatus) -> None:
        if target not in TRANSITIONS[self.status]:
            raise InvalidTransition(f"{self.status} -> {target} is not allowed")
        self.status = target

    def progress_to(self, percent: int) -> None:
        bounded = max(0, min(100, percent))
        self.progress = max(self.progress, bounded)

    def fail(self, code: FailureCode) -> None:
        if self.status in TERMINAL:
            raise InvalidTransition(f"{self.status} is terminal")
        self.status = JobStatus.FAILED
        self.failure_code = code

    def cancel(self) -> None:
        if self.status in TERMINAL:
            raise InvalidTransition(f"{self.status} is terminal")
        self.status = JobStatus.CANCELLED

    @property
    def is_terminal(self) -> bool:
        return self.status in TERMINAL
