# GrabWave at 1 Million Jobs

## 1. What "1 million at a time" must mean

"1 million concurrent 4K conversions" is not a practical target. One 4K job can use 2–4 vCPU and produce 1–8 GB of egress. One million of those at once needs roughly 2–4 million vCPU and petabytes of transfer. The hourly infrastructure bill would be larger than most businesses can support.

Use two separate targets:

| Target | Meaning | Practical value |
| --- | --- | --- |
| **1M queued** | 1,000,000 jobs waiting or active in the system | Achievable with a distributed queue |
| **1M per day** | Sustained throughput | ~12 jobs/second average, ~100/second peak |
| **N active** | Jobs actually downloading/encoding now | Bound by CPU, disk, and egress |

Recommended first scale target:

- **1M queued jobs**
- **10,000–20,000 active jobs**
- **1M jobs/day sustained**
- **10–20 GB/s egress at peak** (CDN-backed)
- **99.9% API availability**
- **p95 queue wait under 30 seconds** for audio, under 5 minutes for video

## 2. Capacity math

Assumptions:

- 70% audio, 28% video at 1080p or lower, 2% 4K
- Average job: 3 CPU-minutes audio, 12 CPU-minutes 1080p, 60 CPU-minutes 4K
- Average output: 8 MB audio, 120 MB 1080p, 1.5 GB 4K

Per 1M jobs/day:

- Audio: 700k × 3 = 2.1M CPU-minutes
- 1080p video: 280k × 12 = 3.36M CPU-minutes
- 4K: 20k × 60 = 1.2M CPU-minutes
- Total: ~6.66M CPU-minutes/day = ~111,000 CPU-hours/day
- Continuous average: ~4,625 vCPU
- Peak at 3×: ~13,900 vCPU
- Egress: ~45 TB/day before CDN cache

1M queued jobs is a storage and scheduling problem. 1M active jobs is a hardware and cost problem.

## 3. Reference architecture

```text
                         Cloudflare / CDN
                                |
                    +-----------+-----------+
                    |                       |
              Next.js BFF              Signed media
              (stateless)              downloads
                    |
        +-----------+-----------+
        |                       |
   Postgres (jobs,          Kafka / SQS
   users, quotas)           command bus
        |                       |
   Outbox publisher             |
   (Debezium or worker)         |
        |                       |
        +----------> Scheduler / queue manager
                                |
        +-------------+---------+---------+-------------+
        |             |                   |             |
   Audio pool    Standard video      4K / long      AI pool
   (high density)  (CPU)             (GPU/CPU)      (Mercury)
        |             |                   |             |
        +-------------+---------+---------+-------------+
                                |
                         S3 / Cloudflare R2
                         multipart + lifecycle
                                |
                          Event bus (Kafka)
                                |
                    Projector -> Postgres / analytics
```

Rules:

- **Postgres is the source of truth for job state.**
- **Kafka or SQS is the source of truth for work dispatch.**
- **Redis is not the job queue at this scale.** Keep it for rate limits and hot counters.
- **Workers are stateless and disposable.**
- **Media never passes through the API tier.**

## 4. Job flow

1. API validates the URL and quota, creates a `Job` row and an outbox row in one transaction.
2. Outbox publisher sends `job.requested.v1` to the command bus, keyed by `jobId`.
3. Scheduler assigns a lane:
   - `audio`
   - `video_standard`
   - `video_4k`
   - `video_long`
   - `ai`
4. A worker claims one job with a visibility timeout and a lease.
5. Worker probes metadata, writes `job.probe_succeeded.v1`, and checks duration/size limits.
6. Worker downloads to local scratch, converts, uploads to object storage, emits `job.ready.v1`.
7. Projector consumes events and updates Postgres idempotently.
8. Browser polls `GET /api/jobs/:id` or receives SSE/WebSocket updates.
9. Lifecycle rule deletes the object after six hours; `job.expired.v1` closes the record.

At-least-once delivery is acceptable because every handler is idempotent on `eventId` and every stage checks `jobId` state.

## 5. Queue design

### Lanes

| Lane | Work | Worker shape | Timeout |
| --- | --- | --- | --- |
| `audio` | MP3 128/192/320 | 8–16 jobs per node | 15 min |
| `video_standard` | MP4 up to 1080p | 2–4 jobs per node | 30 min |
| `video_4k` | MP4 2160p | 1 job per GPU/high-CPU node | 4 h |
| `video_long` | Any job over 30 min | 1–2 jobs per node | 4 h |
| `ai` | Mercury enrichment | 20–50 jobs per node | 2 min |

### Fairness

- Per-tenant weighted fair queuing.
- Anonymous traffic gets a lower weight than paid traffic.
- A single tenant cannot occupy more than 5% of a lane.
- Retries go to a delayed queue, not the head of the main lane.
- Poison jobs go to a dead-letter queue after three attempts.

### Backpressure

- Return `429` when the per-IP or per-user rate limit is exceeded.
- Return `503` with `Retry-After` when queue age exceeds the SLO.
- Shed anonymous traffic before paid traffic.
- Reject new 4K jobs when the 4K lane age is over 10 minutes.
- Never let the queue grow without a hard cap.

## 6. Long-video pipeline

Long videos fail when a worker treats them like short clips. Use a staged pipeline:

1. **Probe first.** Read duration, live status, available formats, and size estimate.
2. **Route by duration.** Over 30 minutes goes to `video_long`.
3. **Download in ranges.** Use yt-dlp with retries and resumable fragments. Keep partial files on a scratch volume.
4. **Transcode in segments.** Split at 5–10 minute boundaries, encode each segment, then concatenate.
5. **Stream-copy when possible.** Remux instead of re-encoding when the codecs are already compatible.
6. **Checkpoint every stage.** Store `stage`, `segment`, and bytes processed so a retry resumes instead of restarting.
7. **Upload with multipart.** Write directly to object storage where possible.
8. **Heartbeat.** Emit `job.progressed.v1` at least every 30 seconds.
9. **Hard limits.** 2-hour duration, 8 GB for 4K, 4-hour wall clock, 30-minute no-progress timeout.
10. **Cancel cleanly.** Mark a cancel flag, stop the child process, delete scratch files, emit `job.cancelled.v1`.

Do not buffer a 2-hour video in memory. Stream it and enforce disk quotas per worker.

## 7. 4K lane

4K should be isolated and more expensive:

- Separate queue and separate worker pool.
- Prefer GPU encoding (NVENC, QSV, VideoToolbox) when available.
- Prefer remux/stream-copy over H.264 re-encode.
- One 4K job per node by default.
- Lower concurrency, longer timeout, larger disk.
- Require a paid plan or a stricter anonymous quota.
- Reject when source has no 4K stream, or fall back to the best available and tell the user.

## 8. Data layer

- **Postgres:** `Job`, `User`, `QuotaEvent`, `DomainEvent`, `JobEnrichment`.
- Partition `Job` by month once it passes tens of millions of rows.
- Shard by `user_id` only when a single primary is no longer enough.
- Keep a unique index on `Job.id` and `DomainEvent.eventId`.
- Move analytics and event history to ClickHouse or BigQuery.
- Keep Kafka retention at 7 days for replay.
- Use S3/R2 lifecycle rules instead of a cleanup cron where possible.

## 9. Autoscaling

- KEDA scales worker deployments on queue depth and oldest-message age.
- Node pools:
  - `audio`: CPU-optimized, high pod density
  - `video`: CPU-optimized, medium density
  - `4k`: GPU or high-CPU, low density
- Cluster autoscaler adds nodes before queue age breaches SLO.
- Scale to zero for the 4K and AI pools when idle.
- Use spot instances for non-urgent lanes with graceful drain.
- Set pod disruption budgets and termination grace periods long enough to stop ffmpeg cleanly.

## 10. Observability and SLOs

Track per lane:

- queue depth
- oldest job age
- jobs started and finished per minute
- stage latency: probe, download, convert, upload
- failure rate by code
- retry and DLQ counts
- CPU, memory, disk, and network per worker
- egress bytes and cost per job
- p95 end-to-end time

Alerts:

- queue age above SLO for 5 minutes
- failure rate above 5% for 10 minutes
- no worker heartbeats
- object storage errors above 1%
- database connection saturation

## 11. Security

- Keep the SSRF allowlist and private-IP blocking.
- Run yt-dlp/ffmpeg in a sandboxed, non-root container with a read-only root filesystem and a scratch volume.
- Never pass user strings to a shell.
- Sign internal callbacks with HMAC and rotate secrets.
- Rate-limit by IP, user, and tenant.
- Scan uploaded output before serving it.
- Keep object URLs private and short-lived.

## 12. Migration from the current stack

Phase A (now):

- Next.js BFF + FastAPI worker + Postgres + Redis.
- Postgres outbox and polling relay.
- RQ queues: `audio`, `video`, `video_4k`, `ai`.
- Local storage or R2.

Phase B (first 10k jobs/day):

- Replace polling relay with an outbox publisher.
- Move to S3/R2 multipart uploads.
- Add KEDA and container orchestration.
- Add queue-age backpressure and per-IP quotas.

Phase C (100k–1M jobs/day):

- Replace RQ with SQS or Kafka command topics.
- Separate event bus from command bus.
- Add projector service and event replay.
- Partition Postgres and add read replicas.
- Dedicated 4K/long pool with GPU or hardware encoding.
- Multi-region workers close to egress points.

Phase D (1M queued, high concurrency):

- Multi-region control plane.
- Tenant-aware fair scheduling.
- Cost-aware routing by region and instance type.
- Continuous load testing at 50% of peak.

## 13. Cost warning

At 1M jobs/day, the dominant costs are CPU time and egress, not the database.

- 111,000 CPU-hours/day at $0.03/hour is about **$3,300/day** before peak overhead.
- 45 TB/day egress at $0.01/GB is about **$450/day** before CDN pricing.
- 4K is the outlier: 20k jobs × 1.5 GB = 30 TB/day by itself.
- GPU encoding can cut 4K CPU cost, but GPU capacity is harder to autoscale.

A free anonymous tier at this volume is not sustainable. Quotas and paid plans must exist before reaching this scale.

## 14. Immediate implementation order

1. Queue isolation for 4K: `video_4k` lane, separate timeout, separate worker pool.
2. Probe-first routing for long videos.
3. Resumable downloads and segmented encoding.
4. Object storage with multipart uploads.
5. Queue-age backpressure and per-IP quotas.
6. Replace polling with an outbox publisher.
7. Load test at 10× expected peak before adding regions.
