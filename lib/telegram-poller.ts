import { sendTelegramMessage } from "./telegram";
import prisma from "./prisma";

let isPolling = false;
let lastUpdateId = 0;

export async function startPolling() {
    if (isPolling) {
        console.log("⚠️ Telegram Polling already started.");
        return;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.log("❌ Telegram Token not found. Polling skipped.");
        return;
    }

    isPolling = true;
    console.log("🚀 Starting Telegram Long Polling...");

    // Recursive poller
    poll(token);
}

async function poll(token: string) {
    if (!isPolling) return;

    try {
        const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
        const res = await fetch(url);

        if (!res.ok) {
            // If 409 Conflict, it means a webhook is active. We should delete it.
            if (res.status === 409) {
                console.log("⚠️ Webhook conflict detected. Deleting Webhook to enable Polling...");
                await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
                // Retry immediately
                setTimeout(() => poll(token), 1000);
                return;
            }
            throw new Error(`Telegram API Error: ${res.statusText}`);
        }

        const data = await res.json();

        if (data.ok && data.result.length > 0) {
            for (const update of (data.result as TelegramUpdate[])) {
                lastUpdateId = Math.max(lastUpdateId, update.update_id);
                await processUpdate(update, token);
            }
        }
    } catch (error) {
        console.error("Telegram Polling Error (Retrying in 5s):", error);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Continue polling immediately
    poll(token);
}

// Basic types for Telegram Update
interface TelegramUpdate {
    update_id: number;
    message?: {
        text?: string;
        chat: {
            id: number;
        };
    };
}

async function processUpdate(update: TelegramUpdate, token: string) {
    if (!update.message || !update.message.text) return;

    const text = update.message.text as string;
    const chatId = update.message.chat.id;

    console.log(`📩 Received Telegram message: "${text}" from ${chatId}`);

    try {
        // 1. Explicit Command: /connect [slug]
        if (text.startsWith("/connect")) {
            const parts = text.split(" ");
            if (parts.length < 2) {
                await sendTelegramMessage(chatId, "Please provide the Event Slug. Usage: `/connect [slug]`", token);
                return;
            }
            const slug = parts[1].trim();
            await connectEvent(slug, chatId, token);
        }
        // 2. Auto-Detect Link: https://.../e/[slug]
        else if (text.includes("/e/")) {
            const match = text.match(/\/e\/([a-zA-Z0-9]+)/);
            if (match && match[1]) {
                const slug = match[1];
                await connectEvent(slug, chatId, token);
            }
        }
        else if (text.startsWith("/start")) {
            await sendTelegramMessage(chatId, "Hello! Just **paste a link** to a TabletopTime event to connect me!", token);
        }
    } catch (err) {
        console.error("Error processing update:", err);
    }
}

async function connectEvent(slug: string, chatId: number, token: string) {
    const event = await prisma.event.findUnique({ where: { slug } });

    if (!event) return;

    await prisma.event.update({
        where: { id: event.id },
        data: { telegramChatId: chatId.toString() }
    });

    await sendTelegramMessage(chatId, `✅ <b>Connected!</b> I will notify this chat for: <b>${event.title}</b>`, token);
}
