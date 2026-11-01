import threading
import time
import urllib.request
from collections.abc import Callable
from pathlib import Path

import yt_dlp

from app.domain.conversion.job import Format, Quality
from app.domain.conversion.ports import (
    DownloadedFile,
    InstantMedia,
    MediaInfo,
    ProgressCallback,
)
from app.infrastructure.pinterest import (
    is_pinterest_url,
    scrape_pinterest_image,
)

AUDIO_MIME = "audio/mpeg"
VIDEO_MIME = "video/mp4"

BASE_OPTIONS: dict[str, object] = {
    "quiet": True,
    "no_warnings": True,
    "noplaylist": True,
    "socket_timeout": 20,
    "retries": 3,
    "fragment_retries": 3,
    "concurrent_fragment_downloads": 4,
    "cachedir": False,
}

_SAFE_HEADERS = {
    "user-agent",
    "accept",
    "accept-language",
    "referer",
    "origin",
}

_INFO_TTL_SECONDS = 300
_INFO_CACHE_LIMIT = 200
_INFO_CACHE: dict[str, tuple[float, dict[str, object]]] = {}
_INFO_CACHE_LOCK = threading.Lock()


def _cache_get(url: str) -> dict[str, object] | None:
    now = time.monotonic()
    with _INFO_CACHE_LOCK:
        hit = _INFO_CACHE.get(url)
        if not hit:
            return None
        expires_at, info = hit
        if expires_at <= now:
            _INFO_CACHE.pop(url, None)
            return None
        return info


def _cache_set(url: str, info: dict[str, object]) -> None:
    with _INFO_CACHE_LOCK:
        if len(_INFO_CACHE) >= _INFO_CACHE_LIMIT:
            oldest = min(_INFO_CACHE, key=lambda key: _INFO_CACHE[key][0])
            _INFO_CACHE.pop(oldest, None)
        _INFO_CACHE[url] = (time.monotonic() + _INFO_TTL_SECONDS, info)


def _http_format(fmt: dict[str, object]) -> bool:
    return str(fmt.get("protocol") or "").startswith("http") and bool(fmt.get("url"))


def _height(fmt: dict[str, object]) -> int | None:
    value = fmt.get("height")
    if not value:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _progressive_mp4(fmt: dict[str, object]) -> bool:
    return (
        str(fmt.get("ext") or "").lower() == "mp4"
        and fmt.get("vcodec") not in (None, "none")
        and fmt.get("acodec") not in (None, "none")
        and _http_format(fmt)
    )


def _audio_m4a(fmt: dict[str, object]) -> bool:
    return (
        str(fmt.get("ext") or "").lower() in {"m4a", "mp4"}
        and fmt.get("vcodec") in (None, "none")
        and fmt.get("acodec") not in (None, "none")
        and _http_format(fmt)
    )


def _sort_size(fmt: dict[str, object]) -> int:
    return int(fmt.get("filesize") or fmt.get("filesize_approx") or 0)


def _safe_headers(
    info: dict[str, object], fmt: dict[str, object] | None = None
) -> dict[str, str]:
    combined: dict[str, object] = {}
    for source in (info.get("http_headers"), (fmt or {}).get("http_headers")):
        if isinstance(source, dict):
            combined.update(source)
    headers: dict[str, str] = {}
    for key, value in combined.items():
        if str(key).lower() in _SAFE_HEADERS and value:
            headers[str(key)] = str(value)
    return headers


def _first_entry(info: dict[str, object]) -> dict[str, object]:
    if "entries" not in info:
        return info
    entries = [entry for entry in info["entries"] if isinstance(entry, dict)]  # type: ignore[index]
    if not entries:
        raise RuntimeError("playlist or carousel has no playable entries")
    return entries[0]


class YtDlpProber:
    def __init__(self, options: dict[str, object] | None = None) -> None:
        self._options = {**BASE_OPTIONS, **(options or {})}

    def _extract(self, url: str, *, client: str | None = None) -> dict[str, object]:
        cache_key = f"{url}|{client or 'default'}"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached
        options: dict[str, object] = {**self._options, "skip_download": True}
        if client:
            options["extractor_args"] = {"youtube": {"player_client": [client]}}
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=False)
        if info is None:
            raise RuntimeError("no media info returned")
        _cache_set(cache_key, info)
        return info

    def probe(self, url: str) -> MediaInfo:
        if is_pinterest_url(url):
            try:
                info = _first_entry(self._extract(url))
                formats = [fmt for fmt in (info.get("formats") or []) if isinstance(fmt, dict)]
                has_video = any(fmt.get("vcodec") not in (None, "none") for fmt in formats)
                if not has_video:
                    scraped = scrape_pinterest_image(url)
                    if scraped:
                        h = scraped.get("height")
                        h_tuple = (h,) if h else (1080,)
                        return MediaInfo(
                            title=scraped["title"],
                            duration_seconds=0.0,
                            uploader=scraped["uploader"],
                            thumbnail_url=scraped["thumbnail_url"],
                            webpage_url=scraped["webpage_url"],
                            extractor="pinterest",
                            is_live=False,
                            available_heights=h_tuple,
                            available_bitrates=(),
                            progressive_heights=h_tuple,
                            instant_audio=False,
                            is_image=True,
                            image_url=scraped["image_url"],
                            width=scraped.get("width"),
                            height=scraped.get("height"),
                        )
            except Exception:
                scraped = scrape_pinterest_image(url)
                if scraped:
                    h = scraped.get("height")
                    h_tuple = (h,) if h else (1080,)
                    return MediaInfo(
                        title=scraped["title"],
                        duration_seconds=0.0,
                        uploader=scraped["uploader"],
                        thumbnail_url=scraped["thumbnail_url"],
                        webpage_url=scraped["webpage_url"],
                        extractor="pinterest",
                        is_live=False,
                        available_heights=h_tuple,
                        available_bitrates=(),
                        progressive_heights=h_tuple,
                        instant_audio=False,
                        is_image=True,
                        image_url=scraped["image_url"],
                        width=scraped.get("width"),
                        height=scraped.get("height"),
                    )
                raise

        info = _first_entry(self._extract(url))
        formats = [fmt for fmt in (info.get("formats") or []) if isinstance(fmt, dict)]
        heights: set[int] = set()
        bitrates: set[int] = set()
        progressive: set[int] = set()
        for fmt in formats:
            height = _height(fmt)
            if height and fmt.get("vcodec") not in (None, "none"):
                heights.add(height)
            if height and _progressive_mp4(fmt):
                progressive.add(height)
            abr = fmt.get("abr")
            if abr:
                try:
                    bitrates.add(int(abr))
                except (TypeError, ValueError):
                    pass
        return MediaInfo(
            title=str(info.get("title") or "Untitled"),
            duration_seconds=float(info.get("duration") or 0),
            uploader=info.get("uploader") or info.get("channel"),
            thumbnail_url=info.get("thumbnail"),
            webpage_url=str(info.get("webpage_url") or url),
            extractor=str(info.get("extractor_key") or info.get("extractor") or "unknown"),
            is_live=bool(info.get("is_live")),
            available_heights=tuple(sorted(heights)),
            available_bitrates=tuple(sorted(bitrates)),
            progressive_heights=tuple(sorted(progressive)),
            instant_audio=any(_audio_m4a(fmt) for fmt in formats),
        )

    def resolve_instant(self, url: str, kind: str, quality: str) -> InstantMedia | None:
        if is_pinterest_url(url):
            if kind in ("jpg", "png", "image"):
                scraped = scrape_pinterest_image(url)
                if scraped:
                    ct = "image/png" if kind == "png" else "image/jpeg"
                    return InstantMedia(
                        url=scraped["image_url"],
                        headers={"referer": "https://www.pinterest.com/"},
                        content_type=ct,
                        title=scraped["title"],
                        height=scraped.get("height"),
                        size_bytes=scraped.get("size_bytes"),
                    )

        info = None
        try:
            info = _first_entry(self._extract(url))
        except Exception:
            if is_pinterest_url(url):
                scraped = scrape_pinterest_image(url)
                if scraped:
                    ct = "image/png" if kind == "png" else "image/jpeg"
                    return InstantMedia(
                        url=scraped["image_url"],
                        headers={"referer": "https://www.pinterest.com/"},
                        content_type=ct,
                        title=scraped["title"],
                        height=scraped.get("height"),
                        size_bytes=scraped.get("size_bytes"),
                    )
            raise

        if info.get("is_live"):
            return None
        formats = [fmt for fmt in (info.get("formats") or []) if isinstance(fmt, dict)]

        # Check if Pinterest pin without video formats
        if is_pinterest_url(url) and not any(fmt.get("vcodec") not in (None, "none") for fmt in formats):
            scraped = scrape_pinterest_image(url)
            if scraped:
                ct = "image/png" if kind == "png" else "image/jpeg"
                return InstantMedia(
                    url=scraped["image_url"],
                    headers={"referer": "https://www.pinterest.com/"},
                    content_type=ct,
                    title=scraped["title"],
                    height=scraped.get("height"),
                    size_bytes=scraped.get("size_bytes"),
                )

        if kind == "m4a":
            candidates = [fmt for fmt in formats if _audio_m4a(fmt)]
            if not candidates:
                return None
            selected = max(
                candidates,
                key=lambda fmt: (
                    float(fmt.get("abr") or fmt.get("tbr") or 0),
                    _sort_size(fmt),
                ),
            )
            return InstantMedia(
                url=str(selected["url"]),
                headers=_safe_headers(info, selected),
                content_type="audio/mp4",
                title=str(info.get("title") or "Untitled"),
                size_bytes=_sort_size(selected) or None,
            )

        try:
            requested = int(quality)
        except (TypeError, ValueError):
            requested = 720
        candidates = [
            fmt for fmt in formats if _progressive_mp4(fmt) and _height(fmt) == requested
        ]
        if not candidates and str(info.get("extractor_key") or "").lower() == "youtube":
            fallback = _first_entry(self._extract(url, client="android"))
            fallback_formats = [
                fmt for fmt in (fallback.get("formats") or []) if isinstance(fmt, dict)
            ]
            candidates = [
                fmt
                for fmt in fallback_formats
                if _progressive_mp4(fmt) and _height(fmt) == requested
            ]
            if candidates:
                info = fallback
        if not candidates:
            return None
        selected = max(
            candidates,
            key=lambda fmt: (
                _height(fmt) or 0,
                float(fmt.get("tbr") or 0),
                _sort_size(fmt),
            ),
        )
        return InstantMedia(
            url=str(selected["url"]),
            headers=_safe_headers(info, selected),
            content_type="video/mp4",
            title=str(info.get("title") or "Untitled"),
            height=_height(selected),
            size_bytes=_sort_size(selected) or None,
        )


class YtDlpDownloader:
    def __init__(self, options: dict[str, object] | None = None) -> None:
        self._options = {**BASE_OPTIONS, **(options or {})}

    def download(
        self,
        url: str,
        fmt: Format,
        quality: Quality,
        destination: Path,
        on_progress: ProgressCallback,
    ) -> DownloadedFile:
        destination.mkdir(parents=True, exist_ok=True)

        if fmt in (Format.JPG, Format.PNG):
            scraped = scrape_pinterest_image(url) if is_pinterest_url(url) else None
            image_url = scraped["image_url"] if scraped else url
            ext = "png" if fmt is Format.PNG else "jpg"
            target = destination / f"source.{ext}"
            _download_direct_file(image_url, target, on_progress)
            mime = "image/png" if fmt is Format.PNG else "image/jpeg"
            return DownloadedFile(path=target, content_type=mime, size_bytes=target.stat().st_size)

        hook = _progress_hook(on_progress)
        options: dict[str, object] = {
            **self._options,
            "outtmpl": str(destination / "source.%(ext)s"),
            "progress_hooks": [hook],
            "overwrites": True,
        }
        if fmt is Format.MP3:
            options["format"] = "bestaudio[ext=m4a]/bestaudio/best"
        else:
            height = int(quality.value)
            options["format"] = (
                f"bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/"
                f"bestvideo[height<={height}]+bestaudio/best[height<={height}]/best"
            )
            options["merge_output_format"] = "mp4"

        try:
            with yt_dlp.YoutubeDL(options) as ydl:
                ydl.extract_info(url, download=True)
            source = _find_source(destination)
            content_type = AUDIO_MIME if fmt is Format.MP3 else VIDEO_MIME
            return DownloadedFile(path=source, content_type=content_type, size_bytes=source.stat().st_size)
        except Exception:
            if is_pinterest_url(url):
                scraped = scrape_pinterest_image(url)
                if scraped:
                    target = destination / "source.jpg"
                    _download_direct_file(scraped["image_url"], target, on_progress)
                    return DownloadedFile(
                        path=target,
                        content_type="image/jpeg",
                        size_bytes=target.stat().st_size,
                    )
            raise


def _download_direct_file(url: str, destination: Path, on_progress: ProgressCallback) -> None:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.pinterest.com/",
        },
    )
    on_progress(10)
    with urllib.request.urlopen(req, timeout=30) as resp, open(destination, "wb") as out:
        total = int(resp.headers.get("Content-Length") or 0)
        downloaded = 0
        chunk_size = 65536
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            out.write(chunk)
            downloaded += len(chunk)
            if total > 0:
                on_progress(min(99, int(downloaded * 100 / total)))
    on_progress(100)


def _progress_hook(on_progress: Callable[[int], None]) -> Callable[[dict[str, object]], None]:
    def hook(data: dict[str, object]) -> None:
        if data.get("status") != "downloading":
            return
        downloaded = int(data.get("downloaded_bytes") or 0)
        total = int(data.get("total_bytes") or data.get("total_bytes_estimate") or 0)
        if total > 0:
            on_progress(min(100, int(downloaded * 100 / total)))

    return hook


def _find_source(destination: Path) -> Path:
    candidates = [
        path
        for path in destination.glob("source.*")
        if path.is_file() and not path.name.endswith((".part", ".ytdl"))
    ]
    if not candidates:
        raise FileNotFoundError("yt-dlp did not produce an output file")
    return max(candidates, key=lambda path: path.stat().st_size)
