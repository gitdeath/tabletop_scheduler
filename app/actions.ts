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
        select: { managerChatId: true }
    });

    return {
        hasManagerChatId: !!event?.managerChatId
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
