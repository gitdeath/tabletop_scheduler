# Telegram Bot Setup Guide

Since TabletopTime is self-hosted, you need to provide your own Telegram Bot for notifications to work.

## 1. Create a Bot
1. Open Telegram and search for **@BotFather**.
2. Send the command `/newbot`.
3. Follow the prompts to name your bot (e.g., `MyGamingGroupSchedulerBot`).
4. **Copy the API Token** provided (it looks like `123456789:ABCdefGhI...`).

## 🚨 Important: Group Privacy Settings
By default, bots in group chats **cannot see messages** unless they start with `/` (commands) or mention the bot `@MyBot`. This means pasting a link won't work out of the box.

**To fix this:**
1. Go to **@BotFather** on Telegram.
2. Send command `/mybots` -> Select your bot.
3. Go to **Bot Settings** -> **Group Privacy**.
4. Select **Turn off**.
5. You may need to remove and re-add the bot to your group for this to take effect.

## 2. Configure Your Environment
Add this token to your `docker-compose.yml` or `.env` file:
```env
TELEGRAM_BOT_TOKEN=your_token_here
```

## 3. Setup the Webhook
For the bot to "hear" messages (like the `/connect` command), you need to tell Telegram where your server is.
**Note**: Your server must be accessible from the internet (e.g., via a reverse proxy/domain like `https://scheduler.mydomain.com`).

Run this URL in your web browser (replace values):
```
https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://<YOUR_DOMAIN>/api/telegram/webhook
```

You should see a response like: `{"ok":true,"result":true,"description":"Webhook was set"}`.

## 4. Using the Bot
1. Create an Event in TabletopTime.
2. **Add the Bot** to your Telegram Group.
3. **Paste the Event Link** into the group chat (e.g. `https://scheduler.com/e/a1b2c3d4`).
   - *Alternatively, you can type `/connect [event-slug]`.*
4. The bot should reply "Connected!".
5. Now, when you **Finalize** the event, the bot will post the result to the group!

## FAQ: Why do I need a Webhook?
You might wonder: *"The bot is in the group, why can't it just see the messages?"*
*   **The Problem**: The Bot lives on Telegram's servers. Your TabletopTime app lives on **your** server. Your app has no idea what is happening in the Telegram chat unless Telegram tells it.
*   **The Solution**: A **Webhook** is a phone number for your app. It tells Telegram: *"When someone posts a message, call this URL to let me know."*
*   Without the Webhook, your app acts like it is deaf—it can shout (send notifications), but it cannot hear (detect the connect link).
