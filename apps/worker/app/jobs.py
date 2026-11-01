import logging
from typing import Any

from app.application.conversion.pipeline import ConversionPipeline
from app.composition import build_pipeline_deps
from app.config import get_settings
from app.domain.conversion.job import ConversionJob, Format, Quality
from app.infrastructure.events import HttpEventSink

logger = logging.getLogger(__name__)


def run_conversion(payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    job = ConversionJob(
        job_id=str(payload["jobId"]),
        url=str(payload["url"]),
        format=Format(payload["format"]),
        quality=Quality(payload["quality"]),
    )
    sink = HttpEventSink(settings.web_internal_url, settings.internal_api_secret)
    deps = build_pipeline_deps(settings, sink)
    pipeline = ConversionPipeline(deps, correlation_id=payload.get("correlationId"))
    result = pipeline.run(job)
    logger.info("conversion finished", extra={"jobId": result.job_id, "status": result.status.value})
    return {
        "jobId": result.job_id,
        "status": result.status.value,
        "outputKey": result.output_key,
        "failureCode": result.failure_code.value if result.failure_code else None,
    }
