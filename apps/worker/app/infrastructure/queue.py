from redis import Redis
from rq import Queue

from app.config import Settings

QUEUE_AUDIO = "audio"
QUEUE_VIDEO = "video"
QUEUE_VIDEO_4K = "video_4k"
QUEUE_AI = "ai"
ALL_QUEUES = (QUEUE_AUDIO, QUEUE_VIDEO, QUEUE_VIDEO_4K, QUEUE_AI)


def redis_connection(settings: Settings) -> Redis:
    return Redis.from_url(settings.redis_url)


def build_queues(settings: Settings) -> dict[str, Queue]:
    connection = redis_connection(settings)
    return {name: Queue(name, connection=connection) for name in ALL_QUEUES}
