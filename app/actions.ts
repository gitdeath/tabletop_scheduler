"use server";

import { cookies } from "next/headers";
import Logger from "@/lib/logger";

const log = Logger.get("Actions");

export async function setAdminCookie(slug: string, token: string) {
    const cookieStore = cookies();
    const opts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        path: "/",
        maxAge: 60 * 60 * 24 * 30 // 30 days
    };
    cookieStore.set(`tabletop_admin_${slug}`, token, opts);
}

import prisma from "@/lib/prisma";

export async function recoverManagerLink(slug: string, handle: string) {
    const event = await prisma.event.findUnique({ where: { slug } });

    if (!event || !event.managerTelegram) {
        return { error: "No manager linked to this event." };
    }

    const normalize = (h: string) => h.toLowerCase().replace('@', '').trim();

    if (normalize(event.managerTelegram) === normalize(handle)) {
        // MATCH!
        // Instead of logging them in directly, we send a Magic Link to their DM.
        if (!event.managerChatId) {
            return { error: "Handle matched, but the bot hasn't connected with you yet. Please open the bot and click 'Start' first." };
        }

        const { sendTelegramMessage } = await import("@/lib/telegram");
        const { getBaseUrl } = await import("@/lib/url");
        const { headers } = await import("next/headers");

        const baseUrl = getBaseUrl(headers());
        const magicLink = `${baseUrl}/api/event/${slug}/auth?token=${event.adminToken}`;

        await sendTelegramMessage(
            event.managerChatId,
            `🔐 <b>Login Request</b>\n\nClick here to manage "${event.title}":\n${magicLink}`,
            process.env.TELEGRAM_BOT_TOKEN!
        );

        log.info("Manager recovery DM sent", { slug, chatId: event.managerChatId });
        return { success: true, message: "Recovery link sent to your Telegram DMs!" };
    }

    log.warn("Manager recovery failed: Handle mismatch", { slug, inputHandle: handle });
    return { error: "Telegram handle does not match our records." };
}

export async function dmManagerLink(slug: string) {
    const event = await prisma.event.findUnique({ where: { slug } });

    if (!event || !event.managerTelegram) {
        return { error: "No manager linked to this event." };
    }

    if (!event.managerChatId) {
        return { error: `Bot doesn't know you yet. Please start the bot first!` };
    }

    const { sendTelegramMessage } = await import("@/lib/telegram");

    const { getBaseUrl } = await import("@/lib/url");
    const { headers } = await import("next/headers");
    const headerList = headers();

    // Priority: Dynamic Header -> Localhost Fallback
    const baseUrl = getBaseUrl(headerList);
    const magicLink = `${baseUrl}/api/event/${slug}/auth?token=${event.adminToken}`;

    log.info("Sending DM recovery link", { slug, chatId: event.managerChatId });

    await sendTelegramMessage(event.managerChatId, `🔑 <b>Manager Link Recovery</b>\n\nClick here to manage <b>${event.title}</b>:\n${magicLink}`, process.env.TELEGRAM_BOT_TOKEN!);

    return { success: true };
}

export async function checkManagerStatus(slug: string) {
    const event = await prisma.event.findUnique({
        where: { slug },
        select: { managerChatId: true, managerTelegram: true }
    });

    return {
        hasManagerChatId: !!event?.managerChatId,
        handle: event?.managerTelegram
    };
}

export async function checkEventStatus(slug: string) {
    const event = await prisma.event.findUnique({
        where: { slug },
        select: { telegramChatId: true }
    });

    return {
        hasTelegramChatId: !!event?.telegramChatId
    };
}

export async function updateManagerHandle(slug: string, handle: string) {
    if (!handle || handle.trim().length < 2) {
        return { error: "Handle must be at least 2 characters." };
    }

    // Ensure handle starts with @
    const formattedHandle = handle.startsWith("@") ? handle : `@${handle}`;

    try {
        await prisma.event.update({
            where: { slug },
            data: { managerTelegram: formattedHandle }
        });
        log.info("Manager handle updated", { slug, handle: formattedHandle });
        return { success: true, handle: formattedHandle };
    } catch (e) {
        log.error("Failed to update handle", e as Error);
        return { error: "Failed to update handle." };
    }
}

export async function updateTelegramInviteLink(slug: string, link: string) {
    if (!link || !link.startsWith("https://t.me/")) {
        return { error: "Invalid Telegram link. It should start with https://t.me/" };
    }

    try {
        await prisma.event.update({
            where: { slug },
            data: { telegramLink: link }
        });
        log.info("Telegram invite link updated", { slug });
        return { success: true };
    } catch (e) {
        log.error("Failed to update telegram link", e as Error);
        return { error: "Failed to save link." };
    }
}

export async function deleteEvent(slug: string) {
    const event = await prisma.event.findUnique({
        where: { slug }
    });

    if (!event) {
        return { error: "Event not found" };
    }

    log.warn("Deleting event", { slug, title: event.title });

    // Attempt to notify and unpin in Telegram if connected
    if (event.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
        const { sendTelegramMessage, unpinChatMessage } = await import("@/lib/telegram");

        // Unpin if we have a pin
        if (event.pinnedMessageId) {
            await unpinChatMessage(event.telegramChatId, event.pinnedMessageId, process.env.TELEGRAM_BOT_TOKEN);
        }

        // Notify cancellation
        await sendTelegramMessage(
            event.telegramChatId,
            `🚫 <b>Event Cancelled</b>\n\nThe event "${event.title}" has been removed by the organizer.`,
            process.env.TELEGRAM_BOT_TOKEN
        );
    }

    // Transactional deletion ensures partial failures don't leave orphaned data.
    // We explicitly delete child records (Votes, TimeSlots, Participants) 
    // to handle schemas where CASCADE deletion might not be configured.
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Delete Votes (via TimeSlots or Participants)
            // Manual cleanup is safer than relying on implicit DB cascades in this context.
            await tx.vote.deleteMany({
                where: { timeSlot: { eventId: event.id } }
            });

            // 2. Delete TimeSlots
            await tx.timeSlot.deleteMany({
                where: { eventId: event.id }
            });

            // 3. Delete Participants
            await tx.participant.deleteMany({
                where: { eventId: event.id }
            });

            // 4. Delete Event
            await tx.event.delete({
                where: { id: event.id }
            });
        });

        log.info("Event deleted successfully", { slug });
        return { success: true };
    } catch (e) {
        log.error("Failed to delete event", e as Error);
        return { error: "Failed to delete event" };
    }
}

export async function cancelEvent(slug: string) {
    const event = await prisma.event.findUnique({
        where: { slug }
    });

    if (!event) {
        return { error: "Event not found" };
    }

    log.warn("Cancelling event", { slug, title: event.title });

    try {
        // Update status first
        await prisma.event.update({
            where: { id: event.id },
            data: { status: 'CANCELLED' }
        });

        // Handle Telegram
        if (event.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
            const { editMessageText, unpinChatMessage } = await import("@/lib/telegram");
            const token = process.env.TELEGRAM_BOT_TOKEN;
            const { getBaseUrl } = await import("@/lib/url");
            const { headers } = await import("next/headers");
            const baseUrl = getBaseUrl(headers());

            if (event.pinnedMessageId) {
                // Edit the pinned message to show cancellation
                // We keep it pinned so everyone sees it
                await editMessageText(
                    event.telegramChatId,
                    event.pinnedMessageId,
                    `🚫 <b>Event Cancelled</b> (was: ${event.finalizedSlotId ? 'Finalized' : 'Planned'})\n\n` +
                    `The event "<b>${event.title}</b>" has been cancelled by the host.\n\n` +
                    `<a href="${baseUrl}/e/${slug}">View Event Details</a>`,
                    token
                );
            }
        }

        log.info("Event cancelled successfully", { slug });
        return { success: true };
    } catch (e) {
        log.error("Failed to cancel event", e as Error);
        return { error: "Failed to cancel event" };
    }
}

export async function sendGlobalMagicLink(handle: string) {
    const normalize = (h: string) => h.toLowerCase().replace('@', '').trim();
    const cleanHandle = normalize(handle);
    const formattedHandle = handle.startsWith('@') ? handle : `@${handle}`;

    if (cleanHandle.length < 2) {
        return { error: "Please enter a valid Telegram handle." };
    }

    try {
        // 1. Find User by Chat ID (look for ANY record that has a chat ID for this handle)
        // We look in Participant records first as they are most common
        const participant = await prisma.participant.findFirst({
            where: {
                OR: [
                    { telegramId: cleanHandle },
                    { telegramId: formattedHandle }
                ],
                NOT: { chatId: null }
            },
            select: { chatId: true }
        });

        // Also check Manager records if not found
        let chatId = participant?.chatId;
        if (!chatId) {
            const manager = await prisma.event.findFirst({
                where: {
                    managerTelegram: formattedHandle, // Managers usually have @ enforced
                    NOT: { managerChatId: null }
                },
                select: { managerChatId: true }
            });
            chatId = manager?.managerChatId;
        }

        // 2. Logic Branch
        if (chatId) {
            // Case A: User is Known & Verified (Has Chat ID) -> Send Link
            const { sendTelegramMessage } = await import("@/lib/telegram");
            const { getBaseUrl } = await import("@/lib/url");
            const { headers } = await import("next/headers");

            // Create temporary login token
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 15);

            const loginToken = await prisma.loginToken.create({
                data: {
                    chatId: chatId,
                    expiresAt
                }
            });

            const baseUrl = getBaseUrl(headers());
            const magicLink = `${baseUrl}/auth/login?token=${loginToken.token}`;

            await sendTelegramMessage(
                chatId,
                `🔐 <b>Magic Login Requested</b>\n\nSomeone (hopefully you) requested a link to view all your events.\n\n👉 <a href="${magicLink}">Click here to Login</a>\n\n(Valid for 15 minutes)`,
                process.env.TELEGRAM_BOT_TOKEN!
            );

            return { success: true, message: "Magic Link sent to your Telegram DMs!" };

        } else {
            // Case B: User has records but NO Chat ID (or no records at all)
            // We can't verify them, so we can't send a link.
            // We prompt them to start the bot.

            // Should we check if they even exist?
            const exists = await prisma.participant.count({
                where: { OR: [{ telegramId: cleanHandle }, { telegramId: formattedHandle }] }
            }) > 0 || await prisma.event.count({
                where: { managerTelegram: formattedHandle }
            }) > 0;

            if (exists) {
                return {
                    error: "UNLINKED",
                    message: "We found your events, but the bot hasn't verified you yet.",
                    deepLink: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME || "TabletopSchedulerBot"}?start=recover_handle`
                };
            } else {
                return { error: "No events found for this handle." };
            }
        }

    } catch (e) {
        log.error("Global recovery failed", e as Error);
        return { error: "System error. Please try again." };
    }
}

export async function generateShortRecoveryToken(slug: string) {
    const crypto = await import('crypto');
    // Generate a short 8-character hex token (4 bytes)
    const token = crypto.randomBytes(4).toString('hex');

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    try {
        await prisma.event.update({
            where: { slug },
            data: {
                recoveryToken: token,
                recoveryTokenExpires: expiresAt
            }
        });
        return { success: true, token };
    } catch (e) {
        log.error("Failed to generate recovery token", e as Error);
        return { error: "Failed to generate token" };
    }
}


