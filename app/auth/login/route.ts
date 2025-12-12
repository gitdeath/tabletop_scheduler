import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Logger from "@/lib/logger";
import { getBaseUrl } from "@/lib/url";
import { cookies } from "next/headers";

const log = Logger.get("Auth:Global");

export const dynamic = 'force-dynamic'; // Ensure no caching

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    const baseUrl = getBaseUrl(request.headers);

    if (!token) {
        return NextResponse.redirect(`${baseUrl}/profile?error=missing_token`);
    }

    try {
        // 1. Find Token
        const validToken = await prisma.loginToken.findUnique({
            where: { token }
        });

        // 2. Validate
        if (!validToken) {
            log.warn("Invalid Global Magic Link attempt");
            return NextResponse.redirect(`${baseUrl}/profile?error=invalid_token`);
        }

        if (new Date() > validToken.expiresAt) {
            log.warn("Expired Global Magic Link attempt");
            return NextResponse.redirect(`${baseUrl}/profile?error=expired_token`);
        }

        // 3. Set Cookie (HTTP Only, Secure)
        // We set 'tabletop_user_chat_id' to the token's chatId
        cookies().set("tabletop_user_chat_id", validToken.chatId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            // 30 days expiration for persistence
            maxAge: 60 * 60 * 24 * 30
        });

        // 4. Cleanup Token (One-time use)
        await prisma.loginToken.delete({
            where: { token }
        });

        log.info("Global Magic Link login successful", { chatId: validToken.chatId });
        return NextResponse.redirect(`${baseUrl}/profile?success=logged_in`);

    } catch (e) {
        log.error("Global Magic Link error", e as Error);
        return NextResponse.redirect(`${baseUrl}/profile?error=server_error`);
    }
}
