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
                // Sub-payload: /start setup_recovery_[slug]_[token]
                if (parts.length > 1 && parts[1].startsWith("setup_recovery_")) {
                    const payload = parts[1].replace("setup_recovery_", "");

                    // Format: slug_token
                    const lastUnderscoreIndex = payload.lastIndexOf('_');
                    if (lastUnderscoreIndex === -1) {
                        await sendTelegramMessage(chatId, "⚠️ Invalid Link format.", token);
                        return NextResponse.json({ ok: true });
                    }

                    const slug = payload.substring(0, lastUnderscoreIndex);
                    const recoveryToken = payload.substring(lastUnderscoreIndex + 1);

                    await handleRecoverySetup(chatId, update.message.from, slug, recoveryToken, token);
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
    const username = user.username;
    // CRITICAL: Use the User's ID for personal messaging, not the Group Chat ID
    const userId = user.id?.toString();

    if (!username || !userId) return;

    const handle = username.toLowerCase().replace('@', '');
    const formattedHandle = `@${handle}`;

    try {
        // Find events where this user is the manager but has NO chat ID yet
        const count = await prisma.event.updateMany({
            where: {
                managerTelegram: {
                    in: [handle, formattedHandle]
                },
                managerChatId: null
            },
            data: {
                managerChatId: userId
            }
        });

        if (count.count > 0) {
            log.info("Passively captured Manager Chat IDs", { handle, count: count.count, userId });
        }
    } catch (e) {
        log.error("Failed passive manager capture", e as Error);
    }
}

async function captureParticipantIdentity(chatId: number, user: any) {
    const username = user.username;
    // CRITICAL: Use the User's ID for personal messaging, not the Group Chat ID
    const userId = user.id?.toString();

    if (!userId) return;

    // Normalize handle: remove @, lowercase
    const handle = username ? username.toLowerCase().replace('@', '') : null;

    // Find all participants with this handle that MISS a chatId
    try {
        if (!handle) return;

        const formattedHandle = `@${handle}`;

        const count = await prisma.participant.updateMany({
            where: {
                OR: [
                    { telegramId: handle },
                    { telegramId: formattedHandle },
                ],
                chatId: null // Only update if missing
            },
            data: {
                chatId: userId
            }
        });

        if (count.count > 0) {
            log.info("Passively captured participant Chat IDs", { handle, count: count.count, userId });
        }
    } catch (e) {
        log.error("Failed passive capture", e as Error);
    }
}

async function handleRecoverySetup(chatId: number, user: any, slug: string, recoveryToken: string, token: string) {
    // Verify Security Token
    const { verifyRecoveryToken } = await import("@/lib/token");
    if (!verifyRecoveryToken(slug, recoveryToken)) {
        await sendTelegramMessage(chatId, "⚠️ <b>Link Expired or Invalid</b>\n\nPlease go back to the Manage page and click the button again.", token);
        return;
    }

    const event = await prisma.event.findUnique({ where: { slug } });

    if (!event) {
        await sendTelegramMessage(chatId, "⚠️ Event not found.", token);
        return;
    }

    const senderUsername = user.username?.toLowerCase();
    if (!senderUsername) {
        await sendTelegramMessage(chatId, "⚠️ Could not verify identity. Please ensure you have a Telegram username set.", token);
        return;
    }

    const managerHandle = event.managerTelegram?.toLowerCase().replace('@', '');
    let updateData: any = { managerChatId: user.id.toString() };
    let claimMessage = "";

    // 1. If NO manager is set, this user CLAIMS it.
    if (!managerHandle) {
        updateData.managerTelegram = senderUsername;
        claimMessage = `\n\n👮 <b>Manager Set:</b> @${senderUsername}`;
        log.info("Manager claimed event via recovery", { slug, manager: senderUsername });
    }
    // 2. If manager IS set, verify identity
    else {
        if (senderUsername !== managerHandle) {
            // Security: Don't link if handles mismatch
            await sendTelegramMessage(chatId, `⚠️ <b>Identity Mismatch</b>\n\nYou are @${senderUsername}, but this event is managed by @${managerHandle}.`, token);
            return;
        }
    }

    // Link matches!
    await prisma.event.update({
        where: { id: event.id },
        data: updateData
    });

    log.info("Manager recovery linked successfully", { slug, manager: senderUsername, chatId: user.id });

    // Send success
    await sendTelegramMessage(chatId, `✅ <b>Recovery Setup Complete!</b>\n\nI've verified you as the manager of <b>${event.title}</b>.${claimMessage}\n\nThe event page on your device should update in a few seconds.`, token);
}

async function handleGlobalLogin(chatId: number, user: any, token: string) {
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
    const event = await prisma.event.findUnique({ where: { slug } });

    if (!event) {
        log.warn("Connect failed: Event not found", { slug });
        return;
    }

    // Auto-Capture Manager Logic
    const senderUsername = user?.username;
    const senderId = user?.id?.toString();

    log.debug("Checking Manager Link for Connect", {
        slug,
        sender: senderUsername,
        senderId,
        currentManager: event.managerTelegram,
        isManagerMatch: event.managerTelegram?.toLowerCase().replace('@', '') === senderUsername?.toLowerCase()
    });

    let updateData: any = { telegramChatId: chatId.toString() };
    let capturedMsg = "";

    // 1. If no manager is set yet, assume the person connecting the bot is the manager.
    if (!event.managerTelegram && senderUsername) {
        updateData.managerTelegram = senderUsername;
        if (senderId) {
            updateData.managerChatId = senderId;
        }
        capturedMsg = `\n\n👮 <b>Manager Set:</b> @${senderUsername}`;
        log.info("Manager claimed event via connect", { slug, manager: senderUsername, chatId: senderId });
    }
    // 2. If the sender IS the manager, update their Chat ID (Repair/Link DM)
    else if (event.managerTelegram && senderUsername &&
        event.managerTelegram.toLowerCase().replace('@', '') === senderUsername.toLowerCase()) {
        if (senderId) {
            updateData.managerChatId = senderId;
            capturedMsg = `\n\n✅ <b>Manager Verified</b>`;
            log.info("Manager verified via connect", { slug, manager: senderUsername, chatId: senderId });
        }
    } else {
        log.info("Connect only (No manager link)", { slug, sender: senderUsername });
    }

    // Connect
    await prisma.event.update({
        where: { id: event.id },
        data: updateData
    });

    log.info("Connected chat to event", { chatId, slug, updates: updateData });

    // Customize message if this was purely a DM recovery setup - Wait, ConnectEvent is for Groups usually. 
    // Recovery via SetupRecovery is separate. 
    await sendTelegramMessage(chatId, `✅ <b>Connected!</b>\nThis group is now linked to: <b>${event.title}</b>${capturedMsg}`, token);
}
