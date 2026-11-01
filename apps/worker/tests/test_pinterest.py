import struct
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.domain.conversion.job import (
    ConversionJob,
    Format,
    JobStatus,
    Quality,
    validate_quality,
)
from app.domain.conversion.ports import DownloadedFile
from app.infrastructure.ffmpeg import FfmpegConverter
from app.infrastructure.pinterest import (
    is_pinterest_url,
    parse_image_dimensions,
    scrape_pinterest_image,
    upgrade_pinterest_image_url,
)
from app.infrastructure.ytdlp import YtDlpDownloader, YtDlpProber


def test_is_pinterest_url() -> None:
    assert is_pinterest_url("https://www.pinterest.com/pin/123456789/")
    assert is_pinterest_url("https://pinterest.com/pin/123456789")
    assert is_pinterest_url("https://pin.it/abcXYZ")
    assert is_pinterest_url("https://www.pin.it/7WvUtSr")
    assert not is_pinterest_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    assert not is_pinterest_url("https://example.com/pin/123")


def test_upgrade_pinterest_image_url() -> None:
    assert (
        upgrade_pinterest_image_url("https://i.pinimg.com/736x/ab/cd/ef/abcdef.jpg")
        == "https://i.pinimg.com/originals/ab/cd/ef/abcdef.jpg"
    )
    assert (
        upgrade_pinterest_image_url("https://i.pinimg.com/236x/11/22/33/112233.png")
        == "https://i.pinimg.com/originals/11/22/33/112233.png"
    )
    assert (
        upgrade_pinterest_image_url("https://i.pinimg.com/originals/11/22/33/112233.png")
        == "https://i.pinimg.com/originals/11/22/33/112233.png"
    )


def test_parse_png_dimensions() -> None:
    # 8-byte PNG signature + 4-byte len + 'IHDR' + 4-byte width (800) + 4-byte height (600)
    data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + struct.pack(">II", 800, 600)
    w, h = parse_image_dimensions(data)
    assert w == 800
    assert h == 600


def test_parse_jpeg_dimensions() -> None:
    # JPEG header \xff\xd8 + SOF0 marker \xff\xc0 + len(17) + precision(8) + height(1080) + width(1920) + padding
    data = b"\xff\xd8\xff\xc0\x00\x11\x08" + struct.pack(">HH", 1080, 1920) + b"\x00" * 16
    w, h = parse_image_dimensions(data)
    assert w == 1920
    assert h == 1080


def test_validate_quality_for_image_formats() -> None:
    validate_quality(Format.JPG, Quality.ORIGINAL)
    validate_quality(Format.PNG, Quality.ORIGINAL)
    validate_quality(Format.JPG, Quality.VIDEO_1080)

    job = ConversionJob(
        job_id="pin-img-1",
        url="https://www.pinterest.com/pin/1098174690415756357/",
        format=Format.JPG,
        quality=Quality.ORIGINAL,
    )
    assert job.format is Format.JPG
    assert job.quality is Quality.ORIGINAL


MOCK_PINTEREST_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta property="og:title" content="Aesthetic Nature Photo | Pinterest" />
    <meta property="og:image" content="https://i.pinimg.com/736x/aa/bb/cc/aabbcc.jpg" />
    <script type="application/ld+json">
    {
        "@type": "SocialMediaPosting",
        "headline": "Aesthetic Nature Photo",
        "author": {"@type": "Person", "name": "Traveler"},
        "image": "https://i.pinimg.com/originals/aa/bb/cc/aabbcc.jpg"
    }
    </script>
</head>
<body></body>
</html>
"""


@patch("urllib.request.urlopen")
def test_scrape_pinterest_image_from_html(mock_urlopen: MagicMock) -> None:
    mock_resp = MagicMock()
    mock_resp.read.return_value = MOCK_PINTEREST_HTML.encode("utf-8")
    mock_resp.url = "https://www.pinterest.com/pin/123456789/"
    mock_resp.headers = {"Content-Type": "text/html", "Content-Length": str(len(MOCK_PINTEREST_HTML))}
    mock_urlopen.return_value.__enter__.return_value = mock_resp

    with patch(
        "app.infrastructure.pinterest.probe_image_metadata",
        return_value={"width": 1200, "height": 1800, "size_bytes": 250000, "content_type": "image/jpeg"},
    ):
        result = scrape_pinterest_image("https://www.pinterest.com/pin/123456789/")

    assert result is not None
    assert result["title"] == "Aesthetic Nature Photo"
    assert result["uploader"] == "Traveler"
    assert result["image_url"] == "https://i.pinimg.com/originals/aa/bb/cc/aabbcc.jpg"
    assert result["width"] == 1200
    assert result["height"] == 1800
    assert result["size_bytes"] == 250000


@patch("app.infrastructure.ytdlp.scrape_pinterest_image")
def test_ytdlp_prober_detects_pinterest_photo(mock_scrape: MagicMock) -> None:
    mock_scrape.return_value = {
        "title": "Minimalist Interior",
        "uploader": "Designer",
        "thumbnail_url": "https://i.pinimg.com/originals/11/22/33/112233.jpg",
        "image_url": "https://i.pinimg.com/originals/11/22/33/112233.jpg",
        "width": 1080,
        "height": 1920,
        "size_bytes": 150000,
        "content_type": "image/jpeg",
        "webpage_url": "https://www.pinterest.com/pin/999888777/",
    }

    prober = YtDlpProber()
    with patch.object(prober, "_extract", side_effect=RuntimeError("No video formats found")):
        info = prober.probe("https://www.pinterest.com/pin/999888777/")

    assert info.is_image is True
    assert info.title == "Minimalist Interior"
    assert info.image_url == "https://i.pinimg.com/originals/11/22/33/112233.jpg"
    assert info.height == 1920
    assert info.width == 1080
    assert info.extractor == "pinterest"


@patch("app.infrastructure.ytdlp.scrape_pinterest_image")
def test_ytdlp_prober_resolves_instant_pinterest_photo(mock_scrape: MagicMock) -> None:
    mock_scrape.return_value = {
        "title": "Minimalist Interior",
        "image_url": "https://i.pinimg.com/originals/11/22/33/112233.jpg",
        "width": 1080,
        "height": 1920,
        "size_bytes": 150000,
        "content_type": "image/jpeg",
    }

    prober = YtDlpProber()
    media_jpg = prober.resolve_instant("https://www.pinterest.com/pin/999888777/", "jpg", "original")
    assert media_jpg is not None
    assert media_jpg.content_type == "image/jpeg"
    assert media_jpg.url == "https://i.pinimg.com/originals/11/22/33/112233.jpg"

    media_png = prober.resolve_instant("https://www.pinterest.com/pin/999888777/", "png", "original")
    assert media_png is not None
    assert media_png.content_type == "image/png"


def test_ffmpeg_converter_copies_matching_image(tmp_path: Path) -> None:
    converter = FfmpegConverter()
    source_file = tmp_path / "source.jpg"
    source_file.write_bytes(b"\xff\xd8\xff\xe0testjpeg")

    dest_file = tmp_path / "output.jpg"
    result = converter.convert(
        source=DownloadedFile(path=source_file, content_type="image/jpeg", size_bytes=len(source_file.read_bytes())),
        fmt=Format.JPG,
        quality=Quality.ORIGINAL,
        destination=dest_file,
    )
    assert result.path.exists()
    assert result.content_type == "image/jpeg"
    assert result.size_bytes == len(source_file.read_bytes())
