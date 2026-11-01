from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    app_url: str = "http://localhost:3000"
    internal_api_secret: str = "change-me"
    log_level: str = "info"

    redis_url: str = "redis://localhost:6379"
    database_url: str = "postgresql://grabwave:grabwave@localhost:5432/grabwave"
    web_internal_url: str = "http://localhost:3000"
    event_poll_interval_ms: int = 750

    storage_driver: str = "local"
    s3_endpoint: str = "http://localhost:9000"
    s3_region: str = "us-east-1"
    s3_bucket: str = "grabwave"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_force_path_style: bool = True
    signed_url_ttl_seconds: int = 21_600

    tmp_dir: str = "/tmp/grabwave"
    inline_jobs: bool = False
    worker_threads: int = 2
    worker_queues: str = "audio,video,video_4k,ai"
    max_concurrent_downloads: int = 6
    max_concurrent_video: int = 2
    max_duration_seconds: int = 7_200
    max_file_size_mb: int = 2_048
    max_4k_file_size_mb: int = 8_192
    job_timeout_seconds: int = 1_800
    video_4k_job_timeout_seconds: int = 14_400

    ai_enrichment_enabled: bool = False
    inception_api_key: str = ""
    mercury_base_url: str = "https://api.inceptionlabs.ai/v1"
    mercury_model: str = "mercury-3"
    ai_daily_token_budget: int = 2_000_000

    allowed_hosts: tuple[str, ...] = (
        "youtube.com",
        "youtu.be",
        "instagram.com",
        "instagr.am",
        "ig.me",
        "tiktok.com",
        "facebook.com",
        "fb.watch",
        "fb.com",
        "x.com",
        "twitter.com",
        "vimeo.com",
        "soundcloud.com",
        "reddit.com",
        "v.redd.it",
        "twitch.tv",
        "dailymotion.com",
        "dai.ly",
        "pinterest.com",
        "pin.it",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
