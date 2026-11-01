import pytest

from app.domain.urls import SsrfError, UrlNotAllowed, resolve_public_addresses, validate_media_url

ALLOWED = ("youtube.com", "youtu.be", "instagram.com")


@pytest.mark.parametrize(
    "url",
    [
        "https://youtube.com/watch?v=abc",
        "https://www.youtube.com/shorts/abc",
        "https://youtu.be/abc",
        "https://www.instagram.com/reel/abc/",
    ],
)
def test_allowed_urls_pass(url: str) -> None:
    assert validate_media_url(url, ALLOWED, resolve=False) == url


@pytest.mark.parametrize(
    "url",
    [
        "ftp://youtube.com/watch?v=abc",
        "https://example.com/watch?v=abc",
        "https://youtube.com.evil.test/watch?v=abc",
        "https://user:pass@youtube.com/watch?v=abc",
        "https://youtube.com:8080/watch?v=abc",
        "not a url",
    ],
)
def test_disallowed_urls_fail(url: str) -> None:
    with pytest.raises(UrlNotAllowed):
        validate_media_url(url, ALLOWED, resolve=False)


@pytest.mark.parametrize(
    "target",
    [
        "localhost",
        "127.0.0.1",
        "10.0.0.1",
        "172.16.0.1",
        "192.168.1.1",
        "169.254.169.254",
        "::1",
    ],
)
def test_non_public_ips_are_blocked(target: str) -> None:
    with pytest.raises(SsrfError):
        resolve_public_addresses(target)
