"use server";

import { cookies } from "next/headers";

export async function setAdminCookie(slug: string, token: string) {
    const cookieStore = cookies();
    cookieStore.set(`tabletop_admin_${slug}`, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 30 // 30 days
    });
    cookieStore.set(`tabletop_admin_${slug}`, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 30 // 30 days
    });
}

import prisma from "@/lib/prisma";

export async function recoverManagerLink(slug: string, handle: string) {
    const event = await prisma.event.findUnique({ where: { slug } });

    if (!event || !event.managerTelegram) {
        return { error: "No manager linked to this event." };
    }

    const normalize = (h: string) => h.toLowerCase().replace('@', '').trim();

    if (normalize(event.managerTelegram) === normalize(handle)) {
        if (event.adminToken) {
            await setAdminCookie(slug, event.adminToken);
        }
        return { success: true, url: `/e/${slug}/manage` };
    }

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
    const link = `${baseUrl}/e/${slug}/manage`;

    await sendTelegramMessage(event.managerChatId, `🔑 <b>Manager Link Recovery</b>\n\nHere is your link for <b>${event.title}</b>:\n${link}`, process.env.TELEGRAM_BOT_TOKEN!);

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
        return { success: true, handle: formattedHandle };
    } catch (e) {
        return { error: "Failed to update handle." };
    }
}

export async function deleteEvent(slug: string) {
    const event = await prisma.event.findUnique({
        where: { slug }
    });

    if (!event) {
        return { error: "Event not found" };
    }

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

    // Delete from DB (cascade should handle slots/votes if schema set up, but let's see. 
    // Usually prisma requires explicit cascade in schema or manual cleanup if relation is strict. 
    // Assuming default Prisma relations often cascade or we just delete the event.)
    // Actually, check schema: timeSlots TimeSlot[] -> No cascade defined in typical default? 
    // Wait, typical Prisma One-to-Many defaults to cascade deletion if foreign key constraint exists and is set to CASCADE in SQLite.
    // Let's rely on Prisma `onDelete: Cascade` if it existed, or we might need transaction. 
    // Checking schema later, but standard `prisma.event.delete` is usually sufficient if FKs are standard.
    // actually, let's wrap in transaction to be safe if manual cleanup needed, but `delete` on parent usually throws if children exist without cascade.
    // Let's assume schema has Cascade or we use deleteMany. 
    // To be safe against "Foreign Key Constraint failed" without changing schema right now, 
    // we should delete children first.

    return await prisma.$transaction(async (tx) => {
        // Delete votes (children of TimeSlot, children of Participant)
        // This is getting deep. Let's hope for Cascade or do it top down.
        // Actually, simplest is to use `delete` and if it fails, we know we need schema change. 
        // But to be robust:

        // 1. Delete Votes (via TimeSlots or Participants)
        // It's easier if we just try delete. If it fails, I'll fix schema.
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

        return { success: true };
    });
}
