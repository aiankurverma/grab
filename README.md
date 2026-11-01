# Grab

A high-performance, multi-platform media converter and downloader built with Next.js 16, Python 3.13 FastAPI, yt-dlp, and Inception Labs Mercury-3 AI.

Grab supports 11 major platforms with smart format auto-detection, instant downloads, live administrative control switches, and Cloudinary media feeds.

---

## Features

- **Multi-Platform Support**: YouTube, Pinterest, Instagram, TikTok, Facebook, X (Twitter), Reddit, SoundCloud, Twitch, Vimeo, and Dailymotion.
- **Smart Format Auto-Detection**:
  - Automatically identifies whether an input link is a **Photo** (`.jpg`), **Video** (`.mp4`), or **Audio** (`.mp3`).
  - Highlights the recommended format with a subtle glow badge while preserving manual override options.
- **Real-Time Admin Insights & Live Controls**:
  - **Live Active People Counter**: Real-time heartbeat tracking active users.
  - **3-Lines Hamburger Drawer**: Slide-over control panel on the left side of the admin dashboard.
  - **Emergency Killswitches**: Instantly disable or enable any individual platform if it experiences outages or rate limits.
  - **AI Engine Toggle**: Turn Mercury-3 AI enrichment on or off dynamically.
  - **Persistent State**: Control switches are saved directly to disk and stay persistent across browser reloads and restarts.
  - **Historical Activity Feed**: Filter by platform, search by title or job ID, with complete pagination (5, 10, 20, 50 per page) and Cloudinary media preview links.
- **Mercury-3 AI Enrichment**:
  - Powered by Inception Labs `mercury-3` model.
  - Automatically extracts concise summaries, high-relevance tags, chapters, and language metadata in a non-blocking background queue.

---

## Architecture

```mermaid
flowchart TD
    User["🌐 User / Browser"] --> Web["⚡ Next.js 16 App Router (apps/web)"]
    Web --> DB[("🐘 PostgreSQL (Prisma)")]
    Web --> Worker["🐍 Python 3.13 Worker (apps/worker)"]
    Worker --> YTDLP["📥 yt-dlp & FFmpeg"]
    Worker --> Mercury["🧠 Mercury-3 AI (Inception Labs)"]
    Worker --> Cloudinary["☁️ Cloudinary Storage"]
    Cloudinary --> Web
```

| Component | Technology | Path |
|---|---|---|
| **Web Service** | Next.js 16 (App Router), React 19, Tailwind CSS, Prisma | `apps/web/` |
| **Worker Service** | Python 3.13, FastAPI, yt-dlp, FFmpeg | `apps/worker/` |
| **AI Engine** | Inception Labs Mercury-3 (`/v1/chat/completions`) | `apps/worker/app/infrastructure/ai/` |
| **Admin Panel** | Server-Sent Heartbeats, Slide-Over Controls Drawer | `apps/web/src/app/admin/insights/` |

---

## Getting Started Locally

### 1. Prerequisites
- **Node.js**: 20.x or higher
- **pnpm**: `corepack enable && pnpm --version`
- **Python**: 3.13+
- **FFmpeg**: Installed and available in your `PATH`

### 2. Installation

Clone the repository:
```bash
git clone https://github.com/aiankurverma/grab.git
cd grab
```

Install Node.js dependencies:
```bash
pnpm install
```

Set up Python virtual environment for the worker:
```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r apps/worker/requirements.txt
```

### 3. Environment Setup

Create `.env` files based on the provided `.env.example`:

**`apps/web/.env`**:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
WORKER_URL=http://127.0.0.1:8000
INTERNAL_TOKEN=your_secure_internal_token
ADMIN_SECRET=your_master_admin_key
DATABASE_URL="postgresql://user:password@localhost:5432/grabwave"
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**`apps/worker/.env`**:
```env
INTERNAL_TOKEN=your_secure_internal_token
WEB_URL=http://127.0.0.1:3000
AI_PROVIDER=mercury
AI_MODEL=mercury-3
AI_API_BASE=https://api.inceptionlabs.ai/v1
INCEPTION_API_KEY=your_inception_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Running the Development Servers

Run the web frontend:
```bash
pnpm --filter web dev
```

Run the worker in a separate terminal:
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir apps/worker
```

The web app will be available at **`http://localhost:3000`**.

---

## Admin Insights & Control Panel

Access the Admin Insights panel at:
```text
http://localhost:3000/admin/insights?key=<YOUR_ADMIN_SECRET>
```

- **Top-left Menu Button**: Opens the left slide-over drawer to toggle any of the 11 platforms or the AI enrichment engine.
- **Live Active Counter**: Displays the current concurrent active visitors.
- **History Table**: Platform-filtered activity with Cloudinary asset links and pagination.

---

## License

This project is licensed under the MIT License.
