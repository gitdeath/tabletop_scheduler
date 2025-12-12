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
                await connectEvent(slug, chatId, update.message.from, token);
            }
            // 2. Auto-Detect Link: https://.../e/[slug]
            else if (text.includes("/e/")) {
                // Extracts slug from standard URL format.
                // Works with any domain (localhost, tunnel, production).
                const match = text.match(/\/e\/([a-zA-Z0-9]+)/);
                if (match && match[1]) {
                    const slug = match[1];
                    await connectEvent(slug, chatId, update.message.from, token);
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

async function connectEvent(slug: string, chatId: number, user: any, token: string) {
    const prisma = (await import("@/lib/prisma")).default;
    const { sendTelegramMessage } = await import("@/lib/telegram");

    const event = await prisma.event.findUnique({ where: { slug } });

    if (!event) {
        log.warn("Connect failed: Event not found", { slug });
        return;
    }

    // Auto-Capture Manager Logic
    const senderUsername = user?.username;
    const senderId = user?.id?.toString();

    let updateData: any = { telegramChatId: chatId.toString() };
    let capturedMsg = "";

    // 1. If no manager is set yet, assume the person connecting the bot is the manager.
    if (!event.managerTelegram && senderUsername) {
        updateData.managerTelegram = senderUsername;
        // Also set their personal chat ID if we have it (for DMs)
        // Note: The webhook usually comes from the group chat, but 'message.from' is the user.
        // We can't DM them unless they've started the bot privately, but we can save the ID.
        if (senderId) {
            updateData.managerChatId = senderId;
        }
        capturedMsg = `\n\n👮 <b>Manager Set:</b> @${senderUsername}`;
    }
    // 2. If the sender IS the manager, update their Chat ID (Repair/Link DM)
    else if (event.managerTelegram && senderUsername &&
        event.managerTelegram.toLowerCase().replace('@', '') === senderUsername.toLowerCase()) {
        if (senderId) {
            updateData.managerChatId = senderId;
            capturedMsg = `\n\n✅ <b>Manager Verified</b>`;
        }
    }

    // Connect
    await prisma.event.update({
        where: { id: event.id },
        data: updateData
    });

    log.info("Connected chat to event", { chatId, slug, manager: updateData.managerTelegram });

    await sendTelegramMessage(chatId, `✅ <b>Connected!</b>\nThis group is now linked to: <b>${event.title}</b>${capturedMsg}`, token);
}


