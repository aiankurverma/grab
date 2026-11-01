import pytest

from app.domain.conversion.job import (
    ConversionJob,
    FailureCode,
    Format,
    InvalidTransition,
    JobStatus,
    Quality,
)


def make_job(**overrides: object) -> ConversionJob:
    values: dict[str, object] = {
        "job_id": "job-1",
        "url": "https://youtu.be/dQw4w9WgXcQ",
        "format": Format.MP3,
        "quality": Quality.AUDIO_192,
    }
    values.update(overrides)
    return ConversionJob(**values)  # type: ignore[arg-type]


def test_happy_path_reaches_ready() -> None:
    job = make_job()
    for status in (
        JobStatus.PROBING,
        JobStatus.DOWNLOADING,
        JobStatus.CONVERTING,
        JobStatus.UPLOADING,
        JobStatus.READY,
    ):
        job.transition(status)
    assert job.status is JobStatus.READY
    assert job.is_terminal


def test_illegal_transition_is_rejected() -> None:
    job = make_job()
    with pytest.raises(InvalidTransition):
        job.transition(JobStatus.READY)


def test_failure_is_terminal() -> None:
    job = make_job()
    job.fail(FailureCode.DOWNLOAD_FAILED)
    assert job.status is JobStatus.FAILED
    with pytest.raises(InvalidTransition):
        job.cancel()


def test_quality_must_match_format() -> None:
    with pytest.raises(ValueError):
        make_job(format=Format.MP3, quality=Quality.VIDEO_720)


def test_4k_is_valid_for_video() -> None:
    job = make_job(format=Format.MP4, quality=Quality.VIDEO_2160)
    assert job.quality is Quality.VIDEO_2160


def test_progress_never_regresses() -> None:
    job = make_job()
    job.progress_to(60)
    job.progress_to(20)
    assert job.progress == 60
    job.progress_to(140)
    assert job.progress == 100
