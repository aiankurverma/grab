import logging

from app.config import Settings
from app.domain.conversion.ports import AiTextProvider
from app.infrastructure.ai.mercury import MercuryProvider

logger = logging.getLogger(__name__)


def build_ai_provider(settings: Settings) -> AiTextProvider | None:
    if not settings.ai_enrichment_enabled:
        return None
    if settings.inception_api_key:
        return MercuryProvider(
            api_key=settings.inception_api_key,
            base_url=settings.mercury_base_url,
            model=settings.mercury_model,
        )
    logger.warning("AI enrichment is enabled but no provider is configured")
    return None
