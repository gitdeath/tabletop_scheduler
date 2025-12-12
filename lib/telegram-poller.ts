import { sendTelegramMessage } from "./telegram";
import prisma from "./prisma";
import Logger from "./logger";
import { getBaseUrl } from "./url";

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
            // If 409 Conflict:
            // 1. "Conflict: terminated by other getUpdates request" -> Another instance is running.
            // 2. "Conflict: can't use getUpdates method while webhook is active" -> We need to delete webhook.
            if (res.status === 409) {
                const errData = await res.json();
                const description = errData.description || "";

                if (description.includes("terminated by other getUpdates request")) {
                    log.warn("Conflict: Keep-alive terminated by another instance. Retrying...");
                    // Just retry, don't delete webhook.
                    // Random backoff to desynchronize instances
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
                    poll(token);
                    return;
                }

                if (description.includes("webhook is active")) {
                    log.warn("Webhook conflict detected. Deleting Webhook to enable Polling...");

                    const { deleteWebhook } = await import("./telegram");
                    await deleteWebhook(token);

                    // Wait a bit for Telegram to propagate the deletion
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    // Retry immediately
                    poll(token);
                    return;
                }

                log.warn(`Unknown 409 Conflict: ${description}`);
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
 * Main Message Processor - SYNCHRONIZED with Webhook Route Logic
 */
async function processUpdate(update: TelegramUpdate, token: string) {
    if (!update.message || !update.message.text) return;

    const text = update.message.text as string;
    const chatId = update.message.chat.id;
    const user = update.message.from;
    const username = user?.username;

    // Always attempt passive capture first
    if (username) {
        await captureParticipantIdentity(chatId, user);
        await captureManagerIdentity(chatId, user);
    }

    log.debug(`Received message`, { text, chatId, userId: user?.id, username });

    try {
        // 1. Explicit Command: /connect [slug]
        if (text.startsWith("/connect")) {
            const parts = text.split(" ");
            if (parts.length < 2) {
                await sendTelegramMessage(chatId, "Please provide the Event Slug. Usage: `/connect [slug]`", token);
                return;
            }
            const slug = parts[1].trim();
            await connectEvent(slug, chatId, user, token);
        }
        // 2. Start Command (with Payloads)
        else if (text.startsWith("/start")) {
            const parts = text.split(" ");

            // Payload: setup_recovery_[slug]_[token]
            if (parts.length > 1 && parts[1].startsWith("setup_recovery_")) {
                const payload = parts[1].replace("setup_recovery_", "");

                // Format: slug_token
                const lastUnderscoreIndex = payload.lastIndexOf('_');
                if (lastUnderscoreIndex === -1) {
                    await sendTelegramMessage(chatId, "⚠️ Invalid Link format.", token);
                    return;
                }

                const slug = payload.substring(0, lastUnderscoreIndex);
                const recoveryToken = payload.substring(lastUnderscoreIndex + 1);

                await handleRecoverySetup(chatId, user, slug, recoveryToken, token);
                return;
            }
            // Paint: login or recover_handle
            else if (parts.length > 1 && (parts[1] === "login" || parts[1] === "recover_handle")) {
                await handleGlobalLogin(chatId, user, token);
                return;
            }
            // Standard /start (Welcome)
            else {
                await sendTelegramMessage(chatId, "Hello! Just **paste a link** to a TabletopTime event to connect me!", token);
                return;
            }
        }
        // 3. Auto-Detect Link: https://.../e/[slug]
        else if (text.includes("/e/")) {
            // Matches: (http://...)/e/(slug)
            const linkMatch = text.match(/(https?:\/\/[^\s]+)\/e\/([a-zA-Z0-9]+)/);
            if (linkMatch && linkMatch[1] && linkMatch[2]) {
                const origin = linkMatch[1];
                const slug = linkMatch[2];
                log.info(`Detected Event Link: ${origin} -> ${slug}`);
                await connectEvent(slug, chatId, user, token, origin);
                return;
            }

            // Fallback match
            const slugMatch = text.match(/\/e\/([a-zA-Z0-9]+)/);
            if (slugMatch && slugMatch[1]) {
                await connectEvent(slugMatch[1], chatId, user, token);
            }
        }
    } catch (err) {
        log.error("Error processing update", err as Error);
    }
}

// --- LOGIC FUNCTIONS (Mirrored from route.ts) ---

async function captureManagerIdentity(chatId: number, user: any) {
    const username = user?.username;
    const userId = user?.id?.toString();

    if (!username || !userId) return;

    const handle = username.toLowerCase().replace('@', '');
    const formattedHandle = `@${handle}`;

    try {
        const count = await prisma.event.updateMany({
            where: {
                managerTelegram: { in: [handle, formattedHandle] },
                managerChatId: null
            },
            data: { managerChatId: userId }
        });

        if (count.count > 0) {
            log.info("Passively captured Manager Chat IDs", { handle, count: count.count });
        }
    } catch (e) {
        log.error("Failed passive manager capture", e as Error);
    }
}

async function captureParticipantIdentity(chatId: number, user: any) {
    const username = user?.username;
    const userId = user?.id?.toString();

    if (!userId) return;

    const handle = username ? username.toLowerCase().replace('@', '') : null;

    try {
        if (!handle) return;
        const formattedHandle = `@${handle}`;

        const count = await prisma.participant.updateMany({
            where: {
                OR: [{ telegramId: handle }, { telegramId: formattedHandle }],
                chatId: null
            },
            data: { chatId: userId }
        });

        if (count.count > 0) {
            log.info("Passively captured participant Chat IDs", { handle, count: count.count });
        }
    } catch (e) {
        log.error("Failed passive capture", e as Error);
    }
}

async function handleRecoverySetup(chatId: number, user: any, slug: string, recoveryToken: string, token: string) {
    // Verify Security Token
    const { verifyRecoveryToken } = await import("./token");
    if (!verifyRecoveryToken(slug, recoveryToken)) {
        await sendTelegramMessage(chatId, "⚠️ <b>Link Expired or Invalid</b>\n\nPlease go back to the Manage page and click the button again.", token);
        return;
    }

    const event = await prisma.event.findUnique({ where: { slug } });

    if (!event) {
        await sendTelegramMessage(chatId, "⚠️ Event not found.", token);
        return;
    }

    const senderUsername = user?.username?.toLowerCase();
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
            await sendTelegramMessage(chatId, `⚠️ <b>Identity Mismatch</b>\n\nYou are @${senderUsername}, but this event is managed by @${managerHandle}.`, token);
            return;
        }
    }

    await prisma.event.update({
        where: { id: event.id },
        data: updateData
    });

    log.info("Manager recovery linked successfully", { slug, manager: senderUsername });
    await sendTelegramMessage(chatId, `✅ <b>Recovery Setup Complete!</b>\n\nI've verified you as the manager of <b>${event.title}</b>.${claimMessage}\n\nThe event page on your device should update in a few seconds.`, token);
}

async function handleGlobalLogin(chatId: number, user: any, token: string) {
    // Create Login Token
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const loginToken = await prisma.loginToken.create({
        data: {
            chatId: chatId.toString(),
            expiresAt
        }
    });

    // Use a fixed hardcoded fallback just in case getBaseUrl is getting weird in polling
    const baseUrl = getBaseUrl(null);
    const magicLink = `${baseUrl}/auth/login?token=${loginToken.token}`;

    await sendTelegramMessage(chatId, `🔐 <b>Magic Login</b>\n\nClick here to access <b>My Events</b>:\n${magicLink}\n\n(Valid for 15 minutes)`, token);
}

async function connectEvent(slug: string, chatId: number, user: any, token: string, detectedBaseUrl?: string) {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return;

    // Auto-Capture Manager Logic
    const senderUsername = user?.username;
    const senderId = user?.id?.toString();

    let updateData: any = { telegramChatId: chatId.toString() };
    let capturedMsg = "";

    // 1. If no manager is set yet, assume the person connecting the bot is the manager.
    if (!event.managerTelegram && senderUsername) {
        updateData.managerTelegram = senderUsername;
        if (senderId) updateData.managerChatId = senderId;
        capturedMsg = `\n\n👮 <b>Manager Set:</b> @${senderUsername}`;
    }
    // 2. If the sender IS the manager, update their Chat ID
    else if (event.managerTelegram && senderUsername &&
        event.managerTelegram.toLowerCase().replace('@', '') === senderUsername.toLowerCase()) {
        if (senderId) {
            updateData.managerChatId = senderId;
            capturedMsg = `\n\n✅ <b>Manager Verified</b>`;
        }
    }

    await prisma.event.update({
        where: { id: event.id },
        data: updateData
    });

    // Pinned Dashboard
    try {
        const fullEvent = await prisma.event.findUnique({
            where: { id: event.id },
            include: { timeSlots: { include: { votes: true } } }
        });
        const participants = await prisma.participant.count({ where: { eventId: event.id } });
        const { generateStatusMessage } = await import("./status");
        const { pinChatMessage } = await import("./telegram");

        if (fullEvent) {
            const baseUrl = detectedBaseUrl || getBaseUrl(null);
            const statusMsg = generateStatusMessage(fullEvent, participants, baseUrl);
            const msgId = await sendTelegramMessage(chatId, `✅ <b>Connected!</b>\nThis group is now linked to: <b>${event.title}</b>${capturedMsg}`, token);

            if (msgId) {
                const dashboardMsgId = await sendTelegramMessage(chatId, statusMsg, token);
                if (dashboardMsgId) {
                    await pinChatMessage(chatId, dashboardMsgId, token);
                    await prisma.event.update({
                        where: { id: event.id },
                        data: { pinnedMessageId: dashboardMsgId }
                    });
                }
            }
        }
    } catch (e) {
        log.error("Failed to initialize dashboard pin", e as Error);
    }
}
