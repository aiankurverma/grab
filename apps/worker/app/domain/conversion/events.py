import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any


class EventType(StrEnum):
    JOB_PROBE_SUCCEEDED = "job.probe_succeeded.v1"
    JOB_DOWNLOAD_STARTED = "job.download_started.v1"
    JOB_PROGRESSED = "job.progressed.v1"
    JOB_CONVERTED = "job.converted.v1"
    JOB_UPLOADED = "job.uploaded.v1"
    JOB_READY = "job.ready.v1"
    JOB_FAILED = "job.failed.v1"
    JOB_CANCELLED = "job.cancelled.v1"
    JOB_ENRICHED = "job.enriched.v1"


def _now() -> datetime:
    return datetime.now(UTC)


@dataclass(slots=True)
class DomainEvent:
    type: EventType
    aggregate_id: str
    payload: dict[str, Any]
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    version: int = 1
    occurred_at: datetime = field(default_factory=_now)
    correlation_id: str | None = None
    causation_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "eventId": self.event_id,
            "type": self.type.value,
            "aggregateId": self.aggregate_id,
            "version": self.version,
            "occurredAt": self.occurred_at.isoformat(),
            "correlationId": self.correlation_id,
            "causationId": self.causation_id,
            "payload": self.payload,
        }


def new_event(
    event_type: EventType,
    aggregate_id: str,
    payload: dict[str, Any],
    *,
    correlation_id: str | None = None,
    causation_id: str | None = None,
) -> DomainEvent:
    return DomainEvent(
        type=event_type,
        aggregate_id=aggregate_id,
        payload=payload,
        correlation_id=correlation_id,
        causation_id=causation_id,
    )
