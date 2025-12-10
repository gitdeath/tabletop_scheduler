export async function sendTelegramMessage(chatId: string | number, text: string, token: string) {
    if (!token) {
        console.error("[Telegram] Token is missing");
        return null;
    }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    console.log(`[Telegram] Sending message to ${chatId}: ${text.substring(0, 50)}...`);
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
            console.error("[Telegram] API Error (sendMessage):", err);
            return null;
        }

        const data = await res.json();
        console.log(`[Telegram] Message sent successfully. ID: ${data.result?.message_id}`);
        return data.result?.message_id;
    } catch (e) {
        console.error("[Telegram] Failed to send message", e);
        return null;
    }
}

export async function pinChatMessage(chatId: string | number, messageId: number, token: string) {
    console.log(`[Telegram] Attempting to pin message ${messageId} in chat ${chatId}`);
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
            console.error("[Telegram] API Error (pinChatMessage):", err);

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

        console.log(`[Telegram] Message ${messageId} pinned successfully.`);
    } catch (e) {
        console.error("[Telegram] Failed to pin message", e);
    }
}

export async function editMessageText(chatId: string | number, messageId: number, text: string, token: string) {
    console.log(`[Telegram] Editing message ${messageId} in chat ${chatId}`);
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
            console.error("[Telegram] API Error (editMessageText):", err);
        } else {
            console.log(`[Telegram] Message ${messageId} edited successfully.`);
        }
    } catch (e) {
        console.error("[Telegram] Failed to edit message", e);
    }
}
