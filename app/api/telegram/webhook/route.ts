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
                const parts = text.split(" ");
                // Sub-payload: /start setup_recovery_[slug]
                if (parts.length > 1 && parts[1].startsWith("setup_recovery_")) {
                    const slug = parts[1].replace("setup_recovery_", "");
                    await connectEvent(slug, chatId, update.message.from, token);
                } else if (parts.length > 1 && (parts[1] === "login" || parts[1] === "recover_handle")) {
                    // Global Login Flow
                    await handleGlobalLogin(chatId, update.message.from, token);
                } else {
                    await sendTelegramMessage(chatId, "Hello! Just **paste a link** to a TabletopTime event to connect me!", token);
                }
            }

            // PASSIVE CAPTURE: Always try to capture/update Participant Chat ID
            if (update.message.from?.username) {
                await captureParticipantIdentity(chatId, update.message.from);
                await captureManagerIdentity(chatId, update.message.from);
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        log.error("Telegram Webhook Error", error as Error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

async function captureManagerIdentity(chatId: number, user: any) {
    const prisma = (await import("@/lib/prisma")).default;
    const username = user.username;
    if (!username) return;

    const handle = username.toLowerCase().replace('@', '');
    const chatIdStr = chatId.toString();
    const formattedHandle = `@${handle}`;

    try {
        // Find events where this user is the manager but has NO chat ID yet
        const count = await prisma.event.updateMany({
            where: {
                managerTelegram: {
                    in: [handle, formattedHandle]
                    // Note: managers usually have strict @ format validation but good to be safe
                },
                managerChatId: null
            },
            data: {
                managerChatId: chatIdStr
            }
        });

        if (count.count > 0) {
            log.info("Passively captured Manager Chat IDs", { handle, count: count.count, chatId });
        }
    } catch (e) {
        log.error("Failed passive manager capture", e as Error);
    }
}

async function captureParticipantIdentity(chatId: number, user: any) {
    const prisma = (await import("@/lib/prisma")).default;
    const username = user.username;
    // Normalize handle: remove @, lowercase
    const handle = username.toLowerCase().replace('@', '');
    const chatIdStr = chatId.toString();

    // Find all participants with this handle that MISS a chatId
    // We do this to "Backfill" identity for anyone who voted with this handle before
    try {
        // Note: Prisma sqlite doesn't support insensitive directly easily without raw, but we can do a broad check.
        // Or better: Use updateMany directly if we are confident in the handle format stored.
        // The App stores handles as they differ (some with @, some without).
        // Let's search broadly: name equals handle OR telegramId equals handle (or @handle)

        // Ideally we only update records where telegramId matches @handle or handle
        const formattedHandle = `@${handle}`;

        const count = await prisma.participant.updateMany({
            where: {
                OR: [
                    { telegramId: handle },
                    { telegramId: formattedHandle },
                    // Also check case-insensitive matches if possible? SQLite is case-sensitive by default for equal, 
                    // but often people type it differently. For now, strict match on what they typed during vote.
                ],
                chatId: null // Only update if missing
            },
            data: {
                chatId: chatIdStr
            }
        });

        if (count.count > 0) {
            log.info("Passively captured participant Chat IDs", { handle, count: count.count, chatId });
        }
    } catch (e) {
        log.error("Failed passive capture", e as Error);
    }
}

async function handleGlobalLogin(chatId: number, user: any, token: string) {
    const prisma = (await import("@/lib/prisma")).default;
    const { sendTelegramMessage } = await import("@/lib/telegram");
    const { getBaseUrl } = await import("@/lib/url");
    const { headers } = await import("next/headers");

    // 1. Create Login Token
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 min expiry

    const loginToken = await prisma.loginToken.create({
        data: {
            chatId: chatId.toString(),
            expiresAt
        }
    });

    const baseUrl = getBaseUrl(headers());
    const magicLink = `${baseUrl}/auth/login?token=${loginToken.token}`;

    await sendTelegramMessage(chatId, `🔐 <b>Magic Login</b>\n\nClick here to access <b>My Events</b>:\n${magicLink}\n\n(Valid for 15 minutes)`, token);
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

    // Customize message if this was purely a DM recovery setup
    if (chatId.toString() === senderId && updateData.managerChatId) {
        await sendTelegramMessage(chatId, `✅ <b>Recovery Setup Complete!</b>\n\nI've linked your account to <b>${event.title}</b>.\nIf you ever lose your link, just click "DM Me Manager Link" on the event page.`, token);
    } else {
        await sendTelegramMessage(chatId, `✅ <b>Connected!</b>\nThis group is now linked to: <b>${event.title}</b>${capturedMsg}`, token);
    }
}


