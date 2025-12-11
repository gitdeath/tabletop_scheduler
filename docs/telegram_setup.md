# Telegram Bot Setup Guide

Since TabletopTime is self-hosted, you need to provide your own Telegram Bot for notifications to work.

## 1. Create a Bot
1. Open Telegram and search for **@BotFather**.
2. Send the command `/newbot`.
3. Follow the prompts to name your bot (e.g., `MyGamingGroupSchedulerBot`).
4. **Copy the API Token** provided (it looks like `123456789:ABCdefGhI...`).

## 🚨 Important: Admin Permissions (Pinning)
For the bot to **Pin Messages** (like the event status dashboard), it must be an **Administrator** in your group with the "Pin Messages" permission enabled.

*   **Recommended Method:** Use the "Add Bot to Group" button in the Event Manager dashboard. This link automatically requests the specific admin permissions needed.
*   **Manual Method:** If you add the bot manually, go to Group Settings -> Administrators -> Add Admin -> Select Bot -> Enable "Pin Messages".

## 2. Configure Your Environment
Add this token to your `docker-compose.yml` or `.env` file:
```env
TELEGRAM_BOT_TOKEN=your_token_here
```

## 3. How it Works (Polling)
TabletopTime uses **Polling** to check for messages. This means:
*   **No Webhooks required:** You do not need to expose your server to the public internet or configure `https` webhooks.
*   **Works efficiently:** The app automatically connects to Telegram to receive updates about new messages.

## 4. Using the Bot
1. Create an Event in TabletopTime.
2. Go to the **Manager Dashboard** for your event.
3. Click the **"Add Bot to Group"** button.
   - This will open Telegram and prompt you to add the bot as an Admin.
4. Once added, the bot will automatically detect the event link if you pasted it, OR you can simply paste the link now.
5. The bot should reply "Connected!".
6. Now, when you **Finalize** the event, the bot will post the result to the group and pin it!
