# Environment Variables

TabletopTime uses environment variables for configuration. You can set these in a `.env` file for local development or pass them to the Docker container.

## Core Configuration

| Variable | Required | Default | Description |
|----------|:--------:|:-------:|-------------|
| `DATABASE_URL` | **Yes** | `file:./dev.db` | Connection string for the database. For Docker, usually `file:/app/data/scheduler.db`. |
| `TZ` | No | `UTC` | Timezone for the server (e.g., `America/Chicago`). Important for log timestamps and cron job logic. |
| `NODE_ENV` | No | `development` | Set to `production` for deployed environments. |
| `LOG_LEVEL` | No | `info` | Logging verbosity. Options: `debug`, `info`, `warn`, `error`. Prisma queries are logged only in `debug`. |
| `CRON_SECRET` | No | - | If set, the `/api/cron/cleanup` endpoint requires this value in the `Authorization: Bearer <token>` header. |

## Application URL Configuration
*Used for generating correct sharing links and calendar invites.*

| Variable | Required | Default | Description |
|----------|:--------:|:-------:|-------------|
| `PUBLIC_URL` | No* | - | The primary public URL of your instance (e.g., `https://scheduler.example.com`). Preferred over others. |
| `NEXT_PUBLIC_APP_URL` | No* | - | **Required for Calendar Links**. Used by client-side code to generate Google Calendar links with back-references. |
| `NEXT_PUBLIC_BASE_URL` | No | - | Alternative to `PUBLIC_URL`. |

*> Checks are made in this order: `PUBLIC_URL` -> `NEXT_PUBLIC_BASE_URL` -> (Inferred Header).*
*> **Note:** `NEXT_PUBLIC_APP_URL` is specifically used in some client-side components and should match your public URL.*

## Telegram Integration
*Required only if you want bot notifications.*

| Variable | Required | Default | Description |
|----------|:--------:|:-------:|-------------|
| `TELEGRAM_BOT_TOKEN` | No | - | The HTTP API Token from @BotFather. |

## Example `.env` File
```env
DATABASE_URL="file:./dev.db"
TELEGRAM_BOT_TOKEN="123456789:ABCdef..."
TZ="America/New_York"
PUBLIC_URL="https://my-scheduler.com"
NEXT_PUBLIC_APP_URL="https://my-scheduler.com"
```
