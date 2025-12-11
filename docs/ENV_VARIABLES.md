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
```
