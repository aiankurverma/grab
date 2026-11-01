import logging
import time
from collections.abc import Callable

import httpx

from app.domain.conversion.events import DomainEvent

logger = logging.getLogger(__name__)


class EventDeliveryError(RuntimeError):
    pass


class HttpEventSink:
    def __init__(
        self,
        base_url: str,
        secret: str,
        *,
        timeout_seconds: float = 5.0,
        attempts: int = 4,
        backoff_seconds: float = 0.5,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._secret = secret
        self._timeout = timeout_seconds
        self._attempts = attempts
        self._backoff = backoff_seconds

    def __call__(self, event: DomainEvent) -> None:
        url = f"{self._base_url}/api/internal/jobs/{event.aggregate_id}/events"
        headers = {"authorization": f"Bearer {self._secret}"}
        body = event.to_dict()
        last_error: Exception | None = None
        for attempt in range(1, self._attempts + 1):
            try:
                response = httpx.post(url, json=body, headers=headers, timeout=self._timeout)
                if response.status_code < 300:
                    return
                if response.status_code in {401, 403, 404, 422}:
                    raise EventDeliveryError(f"event rejected: {response.status_code} {response.text[:200]}")
                last_error = EventDeliveryError(f"web returned {response.status_code}")
            except httpx.HTTPError as error:
                last_error = error
            if attempt < self._attempts:
                time.sleep(self._backoff * (2 ** (attempt - 1)))
        logger.error("event delivery failed", extra={"eventId": event.event_id, "type": event.type.value})
        raise EventDeliveryError(f"could not deliver {event.event_id}: {last_error}")


class BufferedEventSink:
    def __init__(self, sink: Callable[[DomainEvent], None]) -> None:
        self._sink = sink
        self._pending: list[DomainEvent] = []

    def __call__(self, event: DomainEvent) -> None:
        self._pending.append(event)

    def flush(self) -> None:
        while self._pending:
            event = self._pending[0]
            self._sink(event)
            self._pending.pop(0)


class NullEventSink:
    def __call__(self, event: DomainEvent) -> None:
        logger.debug("dropping event %s (%s)", event.event_id, event.type.value)
