export async function sendTelegramMessage(chatId: string | number, text: string, token: string) {
    if (!token) {
        console.error("sendTelegramMessage: Token is missing");
        return;
    }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
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
            console.error("Telegram API Error:", err);
            return null;
        }

        const data = await res.json();
        return data.result?.message_id;
    } catch (e) {
        console.error("Failed to send Telegram message", e);
        return null;
    }
}

export async function pinChatMessage(chatId: string | number, messageId: number, token: string) {
    const url = `https://api.telegram.org/bot${token}/pinChatMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                disable_notification: true
            })
        });
    } catch (e) {
        console.error("Failed to pin message", e);
    }
}
