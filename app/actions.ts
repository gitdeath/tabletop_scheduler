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

    // Attempt to dynamically detect the URL from the request headers
    const { headers } = await import("next/headers");
    const headerList = headers();
    const host = headerList.get("host");
    const protocol = headerList.get("x-forwarded-proto") || "http";

    // Priority: Env Var -> Dynamic Header -> Localhost Fallback
    const baseUrl = process.env.PUBLIC_URL || process.env.NEXT_PUBLIC_BASE_URL || (host ? `${protocol}://${host}` : "http://localhost:3000");
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
