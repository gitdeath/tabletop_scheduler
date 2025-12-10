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
