import json
import logging
import re
import struct
import urllib.parse
import urllib.request
from typing import Any

logger = logging.getLogger(__name__)

PINTEREST_HOSTS = ("pinterest.com", "pin.it")

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

_REQUEST_HEADERS = {
    "User-Agent": _USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def is_pinterest_url(url: str) -> bool:
    try:
        parts = urllib.parse.urlsplit(url.strip())
        host = (parts.hostname or "").lower().rstrip(".")
        return any(host == candidate or host.endswith(f".{candidate}") for candidate in PINTEREST_HOSTS)
    except Exception:
        return False


def parse_image_dimensions(data: bytes) -> tuple[int | None, int | None]:
    if len(data) < 10:
        return None, None
    # PNG: \x89PNG\r\n\x1a\n
    if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
        w, h = struct.unpack(">II", data[16:24])
        return w, h
    # JPEG: \xff\xd8
    if data.startswith(b"\xff\xd8"):
        i = 2
        while i + 8 < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            # Baseline & progressive SOF markers
            if marker in (
                0xC0,
                0xC1,
                0xC2,
                0xC3,
                0xC5,
                0xC6,
                0xC7,
                0xC9,
                0xCA,
                0xCB,
                0xCD,
                0xCE,
                0xCF,
            ):
                h, w = struct.unpack(">HH", data[i + 5 : i + 9])
                return w, h
            if i + 3 < len(data):
                segment_length = struct.unpack(">H", data[i + 2 : i + 4])[0]
                i += 2 + segment_length
            else:
                break
    # WebP: RIFF....WEBP
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP" and len(data) >= 30:
        vp8_chunk = data[12:16]
        if vp8_chunk == b"VP8 " and len(data) >= 26:
            w, h = struct.unpack("<HH", data[26:30])
            return w & 0x3FFF, h & 0x3FFF
        if vp8_chunk == b"VP8L" and len(data) >= 25:
            b0, b1, b2, b3 = data[21:25]
            w = 1 + (((b1 & 0x3F) << 8) | b0)
            h = 1 + (((b3 & 0x0F) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6))
            return w, h
        if vp8_chunk == b"VP8X" and len(data) >= 30:
            w = 1 + struct.unpack("<I", data[24:27] + b"\x00")[0]
            h = 1 + struct.unpack("<I", data[27:30] + b"\x00")[0]
            return w, h
    return None, None


def upgrade_pinterest_image_url(url: str) -> str:
    """Upgrades a pinterest CDN url (e.g. /236x/, /474x/, /736x/) to /originals/."""
    if "i.pinimg.com" in url:
        return re.sub(r"i\.pinimg\.com/\d+x/", "i.pinimg.com/originals/", url)
    return url


def probe_image_metadata(image_url: str, timeout: float = 6.0) -> dict[str, Any]:
    """Lightweight probe to get image dimensions and size via range request or partial read."""
    headers = {
        "User-Agent": _USER_AGENT,
        "Referer": "https://www.pinterest.com/",
        "Range": "bytes=0-65535",
    }
    size_bytes: int | None = None
    content_type: str = "image/jpeg"
    data: bytes = b""

    try:
        req = urllib.request.Request(image_url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            content_type = resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
            content_range = resp.headers.get("Content-Range")
            if content_range and "/" in content_range:
                try:
                    size_bytes = int(content_range.split("/")[-1])
                except ValueError:
                    pass
            if size_bytes is None:
                cl = resp.headers.get("Content-Length")
                if cl:
                    try:
                        size_bytes = int(cl)
                    except ValueError:
                        pass
            data = resp.read()
    except Exception:
        # Fallback without Range header
        try:
            req2 = urllib.request.Request(
                image_url,
                headers={"User-Agent": _USER_AGENT, "Referer": "https://www.pinterest.com/"},
            )
            with urllib.request.urlopen(req2, timeout=timeout) as resp:
                content_type = resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
                cl = resp.headers.get("Content-Length")
                if cl:
                    try:
                        size_bytes = int(cl)
                    except ValueError:
                        pass
                data = resp.read(65536)
        except Exception as error:
            logger.debug("Failed to probe image metadata for %s: %s", image_url, error)

    width, height = parse_image_dimensions(data)
    return {
        "width": width,
        "height": height,
        "size_bytes": size_bytes,
        "content_type": content_type,
    }


def scrape_pinterest_image(url: str, timeout: float = 8.0) -> dict[str, Any] | None:
    """Scrapes Pinterest pin page HTML to extract high-resolution photo/image metadata."""
    # Normalize pin URL to standard canonical pin URL if pin ID exists
    pin_id_match = re.search(r"/pin/(\d+)", url)
    target_url = f"https://www.pinterest.com/pin/{pin_id_match.group(1)}/" if pin_id_match else url

    req = urllib.request.Request(target_url, headers=_REQUEST_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
            resolved_url = resp.url
    except Exception as error:
        logger.warning("Could not fetch Pinterest URL %s: %s", target_url, error)
        return None

    title: str | None = None
    image_url: str | None = None
    uploader: str | None = None

    # 1. Parse JSON-LD scripts
    json_ld_matches = re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        re.DOTALL | re.I,
    )
    for script_content in json_ld_matches:
        try:
            data = json.loads(script_content)
            if isinstance(data, dict):
                img = data.get("image")
                if img:
                    if isinstance(img, str):
                        image_url = img
                    elif isinstance(img, dict):
                        image_url = img.get("contentUrl") or img.get("url")
                    elif isinstance(img, list) and img:
                        first = img[0]
                        image_url = first if isinstance(first, str) else first.get("contentUrl") or first.get("url")
                if not title:
                    title = data.get("headline") or data.get("name")
                author = data.get("author")
                if isinstance(author, dict) and not uploader:
                    uploader = author.get("name") or author.get("alternateName")
        except Exception:
            pass

    # Discard non-pin fallback logo / share banner images
    if image_url and "facebook_share_image" in image_url:
        image_url = None

    # 2. Open Graph meta tags fallback
    if not image_url:
        og_img_match = re.search(
            r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
            html,
            re.I,
        ) or re.search(
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
            html,
            re.I,
        )
        if og_img_match:
            image_url = og_img_match.group(1)

    if not title:
        og_title_match = re.search(
            r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']',
            html,
            re.I,
        ) or re.search(
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:title["\']',
            html,
            re.I,
        )
        if og_title_match:
            title = og_title_match.group(1)

    # 3. Twitter card fallback
    if not image_url:
        twitter_img_match = re.search(
            r'<meta[^>]+name=["\']twitter:image(?::src)?["\'][^>]+content=["\']([^"\']+)["\']',
            html,
            re.I,
        ) or re.search(
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image(?::src)?["\']',
            html,
            re.I,
        )
        if twitter_img_match:
            image_url = twitter_img_match.group(1)

    # 4. Embedded CDN links regex in HTML
    if not image_url:
        cdn_match = re.search(r'https://i\.pinimg\.com/(?:originals|\d+x)/[a-zA-Z0-9/_.-]+', html)
        if cdn_match:
            image_url = cdn_match.group(0)

    if not image_url:
        return None

    # Upgrade to highest resolution original image
    high_res_url = upgrade_pinterest_image_url(image_url)

    # Verify if originals is reachable; if not fallback to the extracted URL
    meta = probe_image_metadata(high_res_url)
    chosen_url = high_res_url
    if not meta.get("width") and high_res_url != image_url:
        fallback_meta = probe_image_metadata(image_url)
        if fallback_meta.get("width"):
            chosen_url = image_url
            meta = fallback_meta

    # Clean title
    clean_title = (title or "Pinterest Photo").strip()
    clean_title = re.sub(r"\s*\|\s*Pinterest\s*$", "", clean_title, flags=re.I).strip()
    if not clean_title:
        clean_title = "Pinterest Photo"

    return {
        "title": clean_title,
        "uploader": uploader,
        "thumbnail_url": chosen_url,
        "image_url": chosen_url,
        "width": meta.get("width"),
        "height": meta.get("height"),
        "size_bytes": meta.get("size_bytes"),
        "content_type": meta.get("content_type") or "image/jpeg",
        "webpage_url": resolved_url,
    }
