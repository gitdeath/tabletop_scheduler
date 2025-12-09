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
        }
    } catch (e) {
        console.error("Failed to send Telegram message", e);
    }
}
