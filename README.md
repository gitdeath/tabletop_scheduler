# TabletopTime

> **Ditch the group chat chaos.** A self-hosted, simplified scheduling tool for tabletop gamers.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Overview
TabletopTime helps you find the best time for your gaming group to meet. It is designed to be self-hosted on your home server (Synology, Unraid, Rasp Pi) and integrates deeply with Telegram for real-time coordination.

### Key Features
- **Host**: Create events with multiple time slots and quorum rules (min players).
- **Vote**: No login required for players. Simple "Yes", "If Needed", or "No" voting.
- **Finalize**: Select a host/location and generate calendar invites (.ics / Google Calendar).
- **Telegram Bot**: 
  - Pins a live-updating dashboard in your group chat.
  - Notifies everyone when an event is finalized.
- **Privacy-First**: Your data stays on your server (SQLite).

## Quick Start (Docker)

The easiest way to run TabletopTime is using the pre-built Docker image.

```bash
docker run -d \
  -p 3000:3000 \
  -v ./data:/app/data \
  -e DATABASE_URL="file:/app/data/scheduler.db" \
  --name tabletop-time \
  ghcr.io/gitdeath/tabletop_scheduler:latest
```

Open `http://localhost:3000` to start creating events.

## Configuration

TabletopTime is configured via environment variables.

| Variable | Required | Description | Default / Example |
|----------|----------|-------------|-------------------|
| `DATABASE_URL` | **Yes** | Path to SQLite DB. Must match volume mount. | `file:/app/data/scheduler.db` |
| `TELEGRAM_BOT_TOKEN` | Optional | Token from @BotFather for notifications. | `123456:ABC...` |

| `TZ` | Optional | Timezone for logs/database. | `America/Chicago` |

## Documentation

- **[Telegram Bot Setup](docs/telegram_setup.md)**: How to create a bot and get your tokens.
- **[Reverse Proxy Example](docs/examples/nginx.conf)**: Nginx configuration for exposing to the web.

## Development

To build from source:

1. Clone the repo.
2. `npm install`
3. `npx prisma generate`
4. `npm run dev`

## License
MIT
