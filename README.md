# TabletopTime

A self-hosted, simplified scheduling tool for tabletop gamers. Ditch the group chat chaos and find a time that works for everyone.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features
- **Host**: Create events, propose multiple time slots, set quorum.
- **Players**: No login required. Vote "Available", "If Needed", or "No".
- **Self-Hosted**: Dockerized, with local SQLite persistence.
- **Infrastructure**: Optimized for home servers (NAS, Synology, Unraid).

## Quick Start (Pre-built Docker Image)

You can pull the latest image directly from the GitHub Container Registry without cloning the code.

```bash
# Run with Docker
docker run -d \
  -p 3000:3000 \
  -v ./data:/app/data \
  -e DATABASE_URL="file:/app/data/scheduler.db" \
  --name tabletop-time \
  ghcr.io/gitdeath/tabletop_scheduler:latest
```

## Quick Start (Docker Compose from Source)

1. **Clone the repo**
   ```bash
   git clone https://github.com/gitdeath/tabletop_scheduler.git
   cd tabletop_scheduler
   ```

2. **Run with Docker Compose**
    ```bash
    docker-compose up -d
    ```
    The app will be available at `http://localhost:3000`.
    Data will be persisted in a `./data` folder on your host machine.

## Configuration & Environment Variables

The application can be configured via environment variables. These can be passed to Docker with `-e` or defined in a `.env` file for docker-compose.

| Variable | Required | Description | Default / Example |
|----------|----------|-------------|-------------------|
| `DATABASE_URL` | **Yes** | Connection string for Prisma. For SQLite with Docker, use the mounted volume path. | `file:/app/data/scheduler.db` |
| `TELEGRAM_BOT_TOKEN` | No | Token from @BotFather for Telegram notifications. | `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11` |
| `PUBLIC_URL` | No | Public URL for Webhooks (e.g. Reverse Proxy). | `https://scheduler.example.com` |
| `NODE_ENV` | No | Node Environment. | `production` |
| `PORT` | No | Port the app listens on internally. | `3000` |

### Volume Persistence
The container expects to find/store data at `/app/data`.
- **Database**: The SQLite file (e.g. `scheduler.db`) should be stored here.
- **Backups**: Ensure this host directory is backed up.

## Architecture
- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite
- **ORM**: Prisma
- **Styling**: Tailwind CSS + Shadcn concepts

## License
MIT
