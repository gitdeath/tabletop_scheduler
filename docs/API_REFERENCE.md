# API Reference

TabletopTime is primarily a user-facing Next.js application, but it exposes several API endpoints for client-side interactions, webhooks, and cron jobs.

## Base URL
All API routes are prefixed with `/api`.
Example: `https://your-domain.com/api/event`

---

## Event Management

### Create Event
**Endpoint:** `POST /api/event`
**Description:** Creates a new event with candidate time slots.

**Request Body:**
```json
{
  "title": "D&D Session 0",
  "description": "Character creation night!",
  "minPlayers": 3,
  "slots": [
    { "startTime": "2023-11-01T18:00:00.000Z", "endTime": "2023-11-01T22:00:00.000Z" }
  ]
}
```

**Response (200 OK):**
```json
{
  "slug": "a1b2c3d4",
  "id": 1,
  "adminToken": "uuid-token-string"
}
```

### Submit Vote
**Endpoint:** `POST /api/event/[eventId]/vote`
**Description:** Records a participant's availability for specific slots.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "telegramId": "@jane", // Optional
  "participantId": 123, // Optional, if updating existing vote
  "votes": [
    { "slotId": 1, "preference": "YES", "canHost": true },
    { "slotId": 2, "preference": "NO" }
  ]
}
```

**Response (200 OK):**
```json
{ "success": true, "participantId": 456 }
```

---

## Integrations

### Telegram Webhook
**Endpoint:** `POST /api/telegram/webhook`
**Description:** Entry point for Telegram Bot API updates. Configured via `setWebhook` on Telegram's side.

**Supported Triggers:**
- **Text Match**: `/e/[slug]` or `https://.../e/[slug]` (Connects group to event)
- **Command**: `/connect [slug]`
- **Command**: `/start` (Registers user for DMs)

**Response:** Always returns `200 OK` `{"ok": true}` to acknowledge receipt to Telegram, even if processing fails/is ignored.

---

## Maintenance

### Cleanup Cron
**Endpoint:** `GET /api/cron/cleanup`
**Description:** Removes old/expired events to keep the database size manageable. Designed to be called by an external scheduler (e.g., GitHub Actions, cron-job.org, or system cron).

**Authentication:** 
- **Localhost/Internal:** No authentication required (checks IP `127.0.0.1` or `::1`).
- **External:** Requires `Authorization: Bearer <CRON_SECRET>` header (if `CRON_SECRET` env var is set).

**Behavior:**
- Runs automatically daily at 03:00 UTC (via internal cron).
- Deletes events based on configured retention days (Default: 1 day).
- Unpins Telegram status messages before deletion.
