import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";
import Logger from "@/lib/logger";

const log = Logger.get("API:Webhook");

/**
 * Handles incoming Telegram Webhook updates.
 * Parses messages for commands like /start, /connect, and automatic link detection.
 */
export async function POST(req: Request) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        log.error("Config Error: TELEGRAM_BOT_TOKEN missing");
        return NextResponse.json({ error: "Config Error" }, { status: 500 });
    }

    try {
        const update = await req.json();

        if (update.message && update.message.text) {
            const text = update.message.text as string;
            const chatId = update.message.chat.id;

            log.debug("Received webhook message", { chatId, text: text.substring(0, 20) + "..." });

            // 1. Explicit Command: /connect [slug]
            if (text.startsWith("/connect")) {
                const parts = text.split(" ");
                if (parts.length < 2) {
                    await sendTelegramMessage(chatId, "Please provide the Event Slug. Usage: `/connect [slug]`", token);
                    return NextResponse.json({ ok: true });
                }
                const slug = parts[1].trim();
                await connectEvent(slug, chatId, token);
            }
            // 2. Auto-Detect Link: https://.../e/[slug]
            else if (text.includes("/e/")) {
                // Extracts slug from standard URL format.
                // Works with any domain (localhost, tunnel, production).
                const match = text.match(/\/e\/([a-zA-Z0-9]+)/);
                if (match && match[1]) {
                    const slug = match[1];
                    await connectEvent(slug, chatId, token);
                }
            }
            else if (text.startsWith("/start")) {
                await sendTelegramMessage(chatId, "Hello! Just **paste a link** to a TabletopTime event to connect me!", token);
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        log.error("Telegram Webhook Error", error as Error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

async function connectEvent(slug: string, chatId: number, token: string) {
    const prisma = (await import("@/lib/prisma")).default;
    const { sendTelegramMessage } = await import("@/lib/telegram");

    const event = await prisma.event.findUnique({ where: { slug } });

    if (!event) {
        // Silent fail on link detection? Or nice error?
        // If it was a random link, maybe silent. But if it looked like ours...
        // Let's rely on the regex being specific enough to our detected implementation? 
        // Actually, we can't be sure it's OUR event if the domain isn't checked, but slug collision is rare.
        // Let's just ignore if not found to avoid spamming on random links.
        log.warn("Connect failed: Event not found", { slug });
        return;
    }

    // Connect
    await prisma.event.update({
        where: { id: event.id },
        data: { telegramChatId: chatId.toString() }
    });

    log.info("Connected chat to event", { chatId, slug });
    await sendTelegramMessage(chatId, `✅ <b>Connected!</b> I will notify this chat for: <b>${event.title}</b>`, token);
}


