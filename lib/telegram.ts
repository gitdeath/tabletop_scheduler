import Logger from "@/lib/logger";

const log = Logger.get("Telegram");

/**
 * Sends a raw text message to a Telegram chat.
 * 
 * @param chatId - The target Telegram chat ID.
 * @param text - The message content (HTML supported).
 * @param token - The Telegram Bot API token.
 * @returns The message ID of the list sent message, or null on failure.
 */
export async function sendTelegramMessage(chatId: string | number, text: string, token: string) {
    if (!token) {
        log.error("Token is missing");
        return null;
    }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    log.debug(`Sending message to ${chatId}`, { textSnippet: text.substring(0, 50) });

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });

        if (!res.ok) {
            const err = await res.text();
            log.error("API Error (sendMessage)", { error: err });
            return null;
        }

        const data = await res.json();
        log.debug(`Message sent successfully. ID: ${data.result?.message_id}`);
        return data.result?.message_id;
    } catch (e) {
        log.error("Failed to send message", e as Error);
        return null;
    }
}

/**
 * Unpins a specific message in a chat.
 * Used to clean up old status messages when a new one is sent.
 */
export async function unpinChatMessage(chatId: string | number, messageId: number, token: string) {
    log.debug(`Attempting to UNPIN message ${messageId} in chat ${chatId}`);
    const url = `https://api.telegram.org/bot${token}/unpinChatMessage`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId
            })
        });

        if (!res.ok) {
            const err = await res.text();
            log.warn("API Error (unpinChatMessage)", { error: err });
            return false;
        }

        log.debug(`Message ${messageId} unpinned successfully.`);
        return true;
    } catch (e) {
        log.error("Failed to unpin message", e as Error);
        return false;
    }
}

/**
 * Pins a message in a chat to ensure high visibility.
 * Checks for "not enough rights" errors to guide the user to fix bot permissions.
 */
export async function pinChatMessage(chatId: string | number, messageId: number, token: string) {
    log.debug(`Attempting to pin message ${messageId} in chat ${chatId}`);
    const url = `https://api.telegram.org/bot${token}/pinChatMessage`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                disable_notification: true
            })
        });

        if (!res.ok) {
            const err = await res.text();
            log.error("API Error (pinChatMessage)", { error: err });

            // Handle "not enough rights" error specifically
            try {
                const jsonErr = JSON.parse(err);
                if (jsonErr.error_code === 400 && jsonErr.description?.includes("not enough rights")) {
                    await sendTelegramMessage(chatId, "⚠️ I tried to pin the message above, but I don't have permission. Please promote me to **Admin** with 'Pin Messages' rights!", token);
                }
            } catch (parseErr) {
                // ignore parsing error
            }
            return;
        }

        log.info(`Message ${messageId} pinned successfully.`);
    } catch (e) {
        log.error("Failed to pin message", e as Error);
    }
}

/**
 * Edits an existing message's text.
 * Used for real-time updates of the event dashboard as votes come in.
 */
export async function editMessageText(chatId: string | number, messageId: number, text: string, token: string) {
    log.debug(`Editing message ${messageId} in chat ${chatId}`);
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: text,
                parse_mode: 'HTML'
            })
        });

        if (!res.ok) {
            const err = await res.text();
            log.error("API Error (editMessageText)", { error: err });
        } else {
            log.debug(`Message ${messageId} edited successfully.`);
        }
    } catch (e) {
        log.error("Failed to edit message", e as Error);
    }
}
