import { sendTelegramMessage } from "./telegram";
import prisma from "./prisma";
import Logger from "./logger";

const log = Logger.get("TelegramPoller");

let isPolling = false;
let lastUpdateId = 0;

/**
 * Initiates the Telegram Long Polling loop.
 * Only one instance should run to avoid race conditions.
 */
export async function startPolling() {
    if (isPolling) {
        log.warn("Polling already started.");
        return;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        log.warn("Token not found. Polling skipped.");
        return;
    }

    isPolling = true;
    log.info("🚀 Starting Telegram Long Polling...");

    // Uses recursion to ensure sequential processing and avoid overlapping calls
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
                log.warn("Webhook conflict detected. Deleting Webhook to enable Polling...");

                const { deleteWebhook } = await import("./telegram");
                await deleteWebhook(token);

                // Wait a bit for Telegram to propagate the deletion
                await new Promise(resolve => setTimeout(resolve, 5000));

                // Retry immediately
                poll(token);
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
        log.error("Polling Error (Retrying in 5s)", error as Error);
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
        from?: {
            id: number;
            username?: string;
        };
    };
}

/**
 * Detects if a user is a manager based on their username and opportunistically links their ID.
 * This allows managers to receive DMs (like /start) without an explicit manual link process.
 */
async function processUpdate(update: TelegramUpdate, token: string) {
    if (!update.message || !update.message.text) return;

    const text = update.message.text as string;
    const chatId = update.message.chat.id;
    const userId = update.message.from?.id;
    const username = update.message.from?.username;

    log.debug(`Received message`, { text, chatId, userId, username });

    // --- Opportunistic Manager Discovery ---
    // If we see a user whose handle matches a known Manager in the DB, save their Chat ID.
    // This allows the bot to DM them later if needed.
    if (userId && username) {
        const handle = "@" + username;
        // Find events where this user is the manager but we might not have their numeric ID yet.
        const events = await prisma.event.findMany({
            where: {
                managerTelegram: { equals: handle },
            }
        });

        if (events.length > 0) {
            for (const ev of events) {
                if (ev.managerChatId !== userId.toString()) {
                    await prisma.event.update({
                        where: { id: ev.id },
                        data: { managerChatId: userId.toString() }
                    });
                    log.info(`Linked Manager ID ${userId} for event ${ev.slug}`);
                }
            }
            // If this was a /start command, confirm to them
            if (text.startsWith("/start")) {
                await sendTelegramMessage(chatId, `👋 Hello @${username}! I've registered you as a manager. You can now use "DM me manager link" on the website.`, token);
                return; // Stop processing /start
            }
        }
    }

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
        else if (text.startsWith("/start")) {
            await sendTelegramMessage(chatId, "Hello! Just **paste a link** to a TabletopTime event to connect me!", token);
        }
        // 2. Auto-Detect Link: https://.../e/[slug]
        else if (text.includes("/e/")) {
            // Updated regex to capture full URL if possible
            // Matches: (http://...)/e/(slug)
            const linkMatch = text.match(/(https?:\/\/[^\s]+)\/e\/([a-zA-Z0-9]+)/);

            if (linkMatch && linkMatch[1] && linkMatch[2]) {
                const origin = linkMatch[1]; // e.g. https://mytunnel.com
                const slug = linkMatch[2];
                log.info(`Detected Event Link: ${origin} -> ${slug}`);
                await connectEvent(slug, chatId, token, origin);
            }
            // Fallback for just partial text?
            else {
                const slugMatch = text.match(/\/e\/([a-zA-Z0-9]+)/);
                if (slugMatch && slugMatch[1]) {
                    await connectEvent(slugMatch[1], chatId, token);
                }
            }
        }
    } catch (err) {
        log.error("Error processing update", err as Error);
    }
}

async function connectEvent(slug: string, chatId: number, token: string, detectedBaseUrl?: string) {
    const prisma = (await import("@/lib/prisma")).default;
    const { sendTelegramMessage } = await import("@/lib/telegram");

    const event = await prisma.event.findUnique({ where: { slug } });

    if (!event) return;

    await prisma.event.update({
        where: { id: event.id },
        data: { telegramChatId: chatId.toString() }
    });



    // --- PINNED DASHBOARD INITIALIZATION ---
    try {
        const fullEvent = await prisma.event.findUnique({
            where: { id: event.id },
            include: { timeSlots: { include: { votes: true } } }
        });
        const participants = await prisma.participant.count({ where: { eventId: event.id } });

        const { generateStatusMessage } = await import("@/lib/status");
        const { pinChatMessage } = await import("@/lib/telegram");
        const { getBaseUrl } = await import("@/lib/url");

        if (fullEvent) {
            // Use detected URL, or fallback to Env/Localhost via getBaseUrl(null)
            const baseUrl = detectedBaseUrl || getBaseUrl(null);
            log.info(`Initializing Pin with Base URL: ${baseUrl}`);

            const statusMsg = generateStatusMessage(fullEvent, participants, baseUrl);
            const msgId = await sendTelegramMessage(chatId, statusMsg, token);
            if (msgId) {
                await pinChatMessage(chatId, msgId, token);
                await prisma.event.update({
                    where: { id: event.id },
                    data: { pinnedMessageId: msgId }
                });
            }
        }
    } catch (e) {
        log.error("Failed to initialize dashboard pin", e as Error);
    }
}
