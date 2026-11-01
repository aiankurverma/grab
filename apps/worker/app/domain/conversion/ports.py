from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

from app.domain.conversion.job import Format, Quality


@dataclass(slots=True, frozen=True)
class MediaInfo:
    title: str
    duration_seconds: float
    uploader: str | None
    thumbnail_url: str | None
    webpage_url: str
    extractor: str
    is_live: bool = False
    available_heights: tuple[int, ...] = ()
    available_bitrates: tuple[int, ...] = ()
    progressive_heights: tuple[int, ...] = ()
    instant_audio: bool = False
    is_image: bool = False
    image_url: str | None = None
    width: int | None = None
    height: int | None = None


@dataclass(slots=True, frozen=True)
class InstantMedia:
    url: str
    headers: dict[str, str]
    content_type: str
    title: str
    height: int | None = None
    size_bytes: int | None = None


@dataclass(slots=True, frozen=True)
class DownloadedFile:
    path: Path
    content_type: str
    size_bytes: int


@dataclass(slots=True, frozen=True)
class StoredObject:
    key: str
    url: str
    size_bytes: int
    expires_in_seconds: int


class MediaProber(Protocol):
    def probe(self, url: str) -> MediaInfo: ...


class MediaDownloader(Protocol):
    def download(
        self,
        url: str,
        fmt: Format,
        quality: Quality,
        destination: Path,
        on_progress: "ProgressCallback",
    ) -> DownloadedFile: ...


class MediaConverter(Protocol):
    def convert(
        self,
        source: DownloadedFile,
        fmt: Format,
        quality: Quality,
        destination: Path,
        *,
        duration_seconds: float = 0,
        on_progress: "ProgressCallback | None" = None,
    ) -> DownloadedFile: ...


class ObjectStorage(Protocol):
    def upload(self, path: Path, key: str, content_type: str) -> StoredObject: ...

    def delete(self, key: str) -> None: ...


class AiTextProvider(Protocol):
    def complete_json(
        self,
        *,
        system: str,
        user: str,
        schema: dict[str, Any],
        timeout_seconds: float = 12.0,
    ) -> dict[str, Any]: ...


class ProgressCallback(Protocol):
    def __call__(self, percent: int) -> None: ...
