from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.api.security import require_internal_token
from app.config import get_settings
from app.domain.conversion.job import (
    AUDIO_QUALITIES,
    IMAGE_FORMATS,
    Format,
    Quality,
    VIDEO_QUALITIES,
    validate_quality,
)
from app.domain.urls import validate_direct_url, validate_media_url
from app.infrastructure.queue import (
    QUEUE_AI,
    QUEUE_AUDIO,
    QUEUE_VIDEO,
    QUEUE_VIDEO_4K,
    build_queues,
    redis_connection,
)
from app.infrastructure.ytdlp import YtDlpProber
from app.jobs import run_conversion
from app.ai_jobs import enrich_job

router = APIRouter()


class JobCommand(BaseModel):
    job_id: str = Field(alias="jobId", min_length=1, max_length=64)
    url: HttpUrl
    format: Literal["mp3", "mp4", "jpg", "png"]
    quality: str
    correlation_id: str | None = Field(default=None, alias="correlationId")

    model_config = {"populate_by_name": True}

    @field_validator("quality")
    @classmethod
    def _quality_allowed(cls, value: str) -> str:
        if value not in {item.value for item in Quality}:
            raise ValueError("unsupported quality")
        return value


class PreviewCommand(BaseModel):
    url: HttpUrl


class InstantCommand(BaseModel):
    url: HttpUrl
    format: Literal["mp4", "m4a", "jpg", "png"]
    quality: str = "720"


@router.post("/internal/preview", dependencies=[Depends(require_internal_token)])
def preview(command: PreviewCommand) -> dict[str, object]:
    settings = get_settings()
    validate_media_url(str(command.url), settings.allowed_hosts)
    try:
        info = YtDlpProber().probe(str(command.url))
    except Exception as error:  # noqa: BLE001 - remote metadata boundary
        raise HTTPException(
            status_code=422,
            detail="We could not read this link. It may be private, removed, or region-locked.",
        ) from error
    return {
        "title": info.title,
        "durationSeconds": info.duration_seconds,
        "uploader": info.uploader,
        "thumbnailUrl": info.thumbnail_url,
        "platform": info.extractor,
        "isLive": info.is_live,
        "availableHeights": info.available_heights,
        "availableBitrates": info.available_bitrates,
        "maxHeight": max(info.available_heights, default=0),
        "audioOnly": not info.available_heights and not info.is_image,
        "instantHeights": info.progressive_heights,
        "instantAudio": info.instant_audio,
        "isImage": info.is_image,
        "imageUrl": info.image_url,
        "width": info.width,
        "height": info.height,
    }


@router.post("/internal/instant", dependencies=[Depends(require_internal_token)])
def instant(command: InstantCommand) -> dict[str, object]:
    settings = get_settings()
    validate_media_url(str(command.url), settings.allowed_hosts)
    if command.format == "mp4" and command.quality not in {item.value for item in VIDEO_QUALITIES}:
        raise HTTPException(status_code=422, detail="unsupported instant video quality")
    try:
        media = YtDlpProber().resolve_instant(str(command.url), command.format, command.quality)
    except Exception as error:  # noqa: BLE001 - remote metadata boundary
        raise HTTPException(status_code=422, detail="instant stream could not be resolved") from error
    if media is None:
        return {"available": False, "reason": "no compatible progressive stream"}
    try:
        validate_direct_url(media.url)
    except Exception as error:  # noqa: BLE001 - SSRF boundary
        raise HTTPException(status_code=422, detail="instant stream target is not public") from error
    return {
        "available": True,
        "directUrl": media.url,
        "headers": media.headers,
        "contentType": media.content_type,
        "title": media.title,
        "height": media.height,
        "sizeBytes": media.size_bytes,
    }


@router.get("/healthz")
def healthz() -> dict[str, object]:
    settings = get_settings()
    try:
        redis_ok = bool(redis_connection(settings).ping())
    except Exception:
        redis_ok = False
    return {
        "ok": True,
        "service": "worker",
        "redis": redis_ok,
        "aiEnrichment": settings.ai_enrichment_enabled,
    }


@router.post("/internal/jobs", status_code=202, dependencies=[Depends(require_internal_token)])
def enqueue_job(command: JobCommand, background: BackgroundTasks) -> dict[str, str]:
    settings = get_settings()
    fmt = Format(command.format)
    quality = Quality(command.quality)
    try:
        validate_quality(fmt, quality)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    validate_media_url(str(command.url), settings.allowed_hosts)
    payload = {
        "jobId": command.job_id,
        "url": str(command.url),
        "format": fmt.value,
        "quality": quality.value,
        "correlationId": command.correlation_id,
    }

    if settings.inline_jobs:
        background.add_task(run_conversion, payload)
        return {"jobId": command.job_id, "queue": "inline"}

    if fmt in IMAGE_FORMATS or fmt is Format.MP3:
        queue_name = QUEUE_AUDIO
    elif quality is Quality.VIDEO_2160:
        queue_name = QUEUE_VIDEO_4K
    else:
        queue_name = QUEUE_VIDEO

    timeout = (
        settings.video_4k_job_timeout_seconds
        if queue_name == QUEUE_VIDEO_4K
        else settings.job_timeout_seconds
    )
    queues = build_queues(settings)
    queues[queue_name].enqueue(
        "app.jobs.run_conversion",
        payload,
        job_id=command.job_id,
        job_timeout=timeout,
        failure_ttl=86_400,
        result_ttl=3_600,
    )
    return {"jobId": command.job_id, "queue": queue_name}


@router.get("/internal/queues", dependencies=[Depends(require_internal_token)])
def queue_depths() -> dict[str, int]:
    settings = get_settings()
    queues = build_queues(settings)
    return {name: len(queue) for name, queue in queues.items()}


@router.post("/internal/ai/enrich", status_code=202, dependencies=[Depends(require_internal_token)])
def enqueue_enrichment(command: dict[str, str], background: BackgroundTasks) -> dict[str, str]:
    settings = get_settings()
    if settings.inline_jobs:
        background.add_task(enrich_job, command)
        return {"enqueued": "ai_inline"}
    queues = build_queues(settings)
    queues[QUEUE_AI].enqueue(
        "app.ai_jobs.enrich_job",
        command,
        job_timeout=60,
        failure_ttl=86_400,
        result_ttl=3_600,
    )
    return {"enqueued": "ai"}
