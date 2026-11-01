from __future__ import annotations

from typing import Final

from app.domain.conversion.job import FailureCode

_DEFAULT: Final[dict[FailureCode, str]] = {
    FailureCode.URL_NOT_ALLOWED: "That link is not allowed. Use a public media link.",
    FailureCode.SSRF_BLOCKED: "That link is not allowed. Use a public media link.",
    FailureCode.UNSUPPORTED_SOURCE: "This source is not supported for that link.",
    FailureCode.PRIVATE_OR_REMOVED: "This media is private, removed, or unavailable.",
    FailureCode.TOO_LONG: "This media is longer than the maximum allowed.",
    FailureCode.TOO_LARGE: "This file is larger than the size limit.",
    FailureCode.DOWNLOAD_FAILED: "The source did not allow the download. Try again or use a different link.",
    FailureCode.CONVERT_FAILED: "The file could not be converted. Try a different format or quality.",
    FailureCode.UPLOAD_FAILED: "The file could not be saved. Try again in a moment.",
    FailureCode.TIMEOUT: "The conversion timed out. Try a lower quality or a shorter video.",
    FailureCode.CANCELLED: "The conversion was cancelled.",
    FailureCode.UNKNOWN: "Something went wrong while converting this link. Try again.",
}

_PATTERNS: Final[tuple[tuple[tuple[str, ...], str], ...]] = (
    (
        (
            "cannot parse data",
            "unsupported url",
            "no suitable extractor",
            "no video formats found",
            "no formats found",
            "is not a valid url",
            "unable to extract",
        ),
        "This link is not a playable public video or track. Open the specific post and copy its link.",
    ),
    (
        ("age-restricted", "age restricted", "confirm your age", "inappropriate for some users"),
        "This media is age-restricted and cannot be converted.",
    ),
    (
        ("live stream", "is live", "live event", "premieres in"),
        "Live streams are not supported. Wait until the stream ends.",
    ),
    (
        ("http error 429", "too many requests", "rate limit", "rate-limit"),
        "The source is rate-limiting requests. Try again in a few minutes.",
    ),
    (
        ("http error 403", "forbidden", "access denied"),
        "The source blocked the download. Try again later or use a different link.",
    ),
    (
        ("private", "login", "log in", "sign in", "authentication", "cookies", "removed", "deleted", "does not exist", "404"),
        "This media is private, removed, or unavailable.",
    ),
    (
        ("too long", "longer than", "maximum duration", "exceeds the maximum"),
        "This media is longer than the maximum allowed.",
    ),
    (
        ("too large", "file size", "larger than the limit", "exceeds the size"),
        "This file is larger than the size limit.",
    ),
    (
        ("timed out", "timeout", "time out"),
        "The conversion timed out. Try a lower quality or a shorter video.",
    ),
    (
        ("ffmpeg", "postprocessing", "conversion failed", "encoder", "invalid data found"),
        "The file could not be converted. Try a different format or quality.",
    ),
    (
        ("network", "connection", "temporary failure", "name or service", "getaddrinfo", "unable to download"),
        "Could not reach the source. Check the link and try again.",
    ),
)


def friendly_failure(code: FailureCode, error: BaseException | str | None = None) -> str:
    raw = str(error).lower() if error is not None else ""
    for needles, message in _PATTERNS:
        if any(needle in raw for needle in needles):
            return message
    return _DEFAULT.get(code, _DEFAULT[FailureCode.UNKNOWN])


def classify_probe_error(error: BaseException | str) -> FailureCode:
    raw = str(error).lower()
    if "timed out" in raw or "timeout" in raw:
        return FailureCode.TIMEOUT
    if "unsupported url" in raw or "no suitable extractor" in raw:
        return FailureCode.UNSUPPORTED_SOURCE
    return FailureCode.PRIVATE_OR_REMOVED
