import ipaddress
import socket
from collections.abc import Iterable
from urllib.parse import urlsplit


class UrlNotAllowed(ValueError):
    pass


class SsrfError(ValueError):
    pass


def _is_public_ip(raw: str) -> bool:
    try:
        address = ipaddress.ip_address(raw)
    except ValueError:
        return False
    return address.is_global and not (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_multicast
        or address.is_reserved
        or address.is_unspecified
    )


def resolve_public_addresses(hostname: str) -> list[str]:
    # Check if hostname itself is a raw IP literal
    try:
        if not _is_public_ip(hostname):
            raise SsrfError(f"{hostname} is a non-public IP address")
    except ValueError:
        pass

    try:
        infos = socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as error:
        raise SsrfError(f"could not resolve {hostname}") from error

    addresses = sorted({info[4][0] for info in infos})
    if not addresses:
        raise SsrfError(f"could not resolve {hostname}")
    for raw in addresses:
        if not _is_public_ip(raw):
            raise SsrfError(f"{hostname} resolves to a non-public address: {raw}")
    return addresses


def _host_matches(host: str, allowed: Iterable[str]) -> bool:
    host = host.lower().rstrip(".")
    for candidate in allowed:
        candidate = candidate.lower().rstrip(".")
        if host == candidate or host.endswith(f".{candidate}"):
            return True
    return False


def validate_direct_url(raw: str) -> str:
    parts = urlsplit(raw)
    if parts.scheme not in {"http", "https"}:
        raise UrlNotAllowed("only http and https media URLs are allowed")
    if not parts.hostname:
        raise UrlNotAllowed("media URL is missing a hostname")
    if parts.username or parts.password:
        raise UrlNotAllowed("credentials in media URLs are not allowed")
    if parts.port not in (None, 80, 443):
        raise UrlNotAllowed("only standard web ports are allowed")
    resolve_public_addresses(parts.hostname)
    return raw


def validate_media_url(raw: str, allowed_hosts: Iterable[str], *, resolve: bool = True) -> str:
    value = raw.strip()
    parts = urlsplit(value)
    if parts.scheme not in {"http", "https"}:
        raise UrlNotAllowed("only http and https links are supported")
    if not parts.hostname:
        raise UrlNotAllowed("link is missing a hostname")
    if parts.username or parts.password:
        raise UrlNotAllowed("credentials in links are not allowed")
    if not _host_matches(parts.hostname, allowed_hosts):
        raise UrlNotAllowed(f"{parts.hostname} is not an allowed media host")
    if parts.port not in (None, 80, 443):
        raise UrlNotAllowed("only standard web ports are allowed")
    if resolve:
        resolve_public_addresses(parts.hostname)
    return value
