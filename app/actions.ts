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
}
