# Understanding Magic Links

TabletopTime uses a **passwordless** authentication system for event managers, relying on "Magic Links" to securely verify identity.

There are two distinct types of Magic Links in the ecosystem:

| Link Type | Direction | Purpose | Format |
|-----------|-----------|---------|--------|
| **Recovery Link** | **Web ➔ Telegram** | Connects your Telegram account to an event you created. | `t.me/Bot?start=rec_...` |
| **Login Link** | **Telegram ➔ Web** | Logs you into the Event Manager dashboard on a new device. | `.../auth/login?token=...` |

---

## 1. The Recovery Link
*Connects the Event to You.*

When you create an event, you are the "Manager". However, because there are no accounts or passwords, if you clear your browser cookies, you lose access.

To prevent this, you **Register for Magic Links** immediately after creating an event.

### The Flow
1.  **Generate**: On the `/manage` page, you click **"Register for Magic Links"**.
2.  **Redirect**: This opens a specific Telegram URL: `https://t.me/YourBot?start=rec_<SecureToken>`.
3.  **Verify**: The Bot receives this token, checks the database to see which event generated it, and securely saves your generic Telegram ID (`chatId`) as the manager for that event.
4.  **Confirm**: The Bot replies "Success! You are now linked."

**Security Note**: These tokens are short-lived (15 minutes) and single-use to prevent hijacking.

---

## 2. The Login Link
*Connects You to the Event.*

Once you are linked (via step 1), you can log in from anywhere—your phone, a new laptop, etc.

### The Flow
1.  **Request**: You message the bot (or use the menu) with the command: `/login`.
2.  **Verify**: The bot checks its database to see which events your Telegram account owns.
3.  **Generate**: The bot generates a cryptic, signed URL containing a Login Token.
4.  **Send**: The bot sends this link to your DMs: *"Here is your magic login link to manage [Event Name]..."*
5.  **Access**: You click the link. The browser validates the token, sets a secure cookie, and redirects you to the dashboard.

**Security Note**: Login links expire after 1 hour and grant administrative access to the specific event only.
