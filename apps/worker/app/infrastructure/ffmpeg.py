import shutil
import subprocess
import threading
from pathlib import Path

from app.domain.conversion.job import Format, Quality
from app.domain.conversion.ports import DownloadedFile, ProgressCallback

AUDIO_MIME = "audio/mpeg"
VIDEO_MIME = "video/mp4"
IMAGE_JPG_MIME = "image/jpeg"
IMAGE_PNG_MIME = "image/png"


class FfmpegConverter:
    def __init__(self, *, threads: int = 2, timeout_seconds: int = 900) -> None:
        self._threads = str(max(1, threads))
        self._timeout = timeout_seconds
        self._binary = shutil.which("ffmpeg") or "ffmpeg"

    def convert(
        self,
        source: DownloadedFile,
        fmt: Format,
        quality: Quality,
        destination: Path,
        *,
        duration_seconds: float = 0,
        on_progress: ProgressCallback | None = None,
    ) -> DownloadedFile:
        if fmt is Format.JPG:
            if source.path.suffix.lower() in {".jpg", ".jpeg"}:
                shutil.copy2(source.path, destination)
            else:
                self._run(["-i", str(source.path), "-y", str(destination)], duration_seconds, on_progress)
            if on_progress:
                on_progress(100)
            return DownloadedFile(path=destination, content_type=IMAGE_JPG_MIME, size_bytes=destination.stat().st_size)
        if fmt is Format.PNG:
            if source.path.suffix.lower() == ".png":
                shutil.copy2(source.path, destination)
            else:
                self._run(["-i", str(source.path), "-y", str(destination)], duration_seconds, on_progress)
            if on_progress:
                on_progress(100)
            return DownloadedFile(path=destination, content_type=IMAGE_PNG_MIME, size_bytes=destination.stat().st_size)
        if fmt is Format.MP3:
            args = self._audio_args(source.path, destination, quality)
        else:
            args = self._video_args(source.path, destination, quality)
        self._run(args, duration_seconds, on_progress)
        if not destination.exists():
            raise RuntimeError("ffmpeg finished without an output file")
        mime = AUDIO_MIME if fmt is Format.MP3 else VIDEO_MIME
        return DownloadedFile(path=destination, content_type=mime, size_bytes=destination.stat().st_size)

    def _run(
        self,
        args: list[str],
        duration_seconds: float,
        on_progress: ProgressCallback | None,
    ) -> None:
        command = [
            self._binary,
            "-hide_banner",
            "-loglevel",
            "error",
            "-nostats",
            "-progress",
            "pipe:1",
            "-y",
            *args,
        ]
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            encoding="utf-8",
            errors="replace",
        )

        def read_progress() -> None:
            if process.stdout is None:
                return
            for line in process.stdout:
                key, _, value = line.strip().partition("=")
                if key in {"out_time_us", "out_time_ms"} and duration_seconds > 0:
                    try:
                        seconds = int(value) / 1_000_000
                    except ValueError:
                        continue
                    if on_progress:
                        on_progress(min(99, int(seconds * 100 / duration_seconds)))
                elif key == "progress" and value == "end" and on_progress:
                    on_progress(100)

        reader = threading.Thread(target=read_progress, daemon=True)
        reader.start()
        try:
            code = process.wait(timeout=self._timeout)
        except subprocess.TimeoutExpired as error:
            process.kill()
            process.wait()
            raise RuntimeError("ffmpeg timed out") from error
        finally:
            reader.join(timeout=2)

        stderr = process.stderr.read() if process.stderr else ""
        if code != 0:
            raise RuntimeError(f"ffmpeg failed: {stderr.strip()[:500] or f'exit {code}'}")

    def _audio_args(self, source: Path, destination: Path, quality: Quality) -> list[str]:
        return [
            "-i",
            str(source),
            "-vn",
            "-map_metadata",
            "0",
            "-id3v2_version",
            "3",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            f"{quality.value}k",
            "-ar",
            "44100",
            "-threads",
            self._threads,
            str(destination),
        ]

    def _video_args(self, source: Path, destination: Path, quality: Quality) -> list[str]:
        if source.suffix.lower() in {".mp4", ".m4v"}:
            return [
                "-i",
                str(source),
                "-map",
                "0",
                "-c",
                "copy",
                "-movflags",
                "+faststart",
                str(destination),
            ]
        maxrate = _maxrate_for(quality)
        return [
            "-i",
            str(source),
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-maxrate",
            maxrate,
            "-bufsize",
            f"{int(maxrate.rstrip('k')) * 2}k",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-movflags",
            "+faststart",
            "-threads",
            self._threads,
            str(destination),
        ]


def _maxrate_for(quality: Quality) -> str:
    return {
        Quality.VIDEO_360: "800k",
        Quality.VIDEO_480: "1400k",
        Quality.VIDEO_720: "2800k",
        Quality.VIDEO_1080: "5000k",
        Quality.VIDEO_2160: "16000k",
    }.get(quality, "2800k")
