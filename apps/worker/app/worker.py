import logging
import sys

from rq import Queue, Worker

from app.config import get_settings
from app.infrastructure.queue import ALL_QUEUES, redis_connection

logger = logging.getLogger(__name__)


def main() -> int:
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    requested = [name.strip() for name in settings.worker_queues.split(",") if name.strip()]
    unknown = sorted(set(requested) - set(ALL_QUEUES))
    if unknown:
        raise SystemExit(f"unknown queues: {', '.join(unknown)}")
    connection = redis_connection(settings)
    queues = [Queue(name, connection=connection) for name in requested]
    worker = Worker(queues, connection=connection)
    logger.info("worker listening on %s", ", ".join(requested))
    worker.work(with_scheduler=False, logging_level=settings.log_level.upper())
    return 0


if __name__ == "__main__":
    sys.exit(main())
