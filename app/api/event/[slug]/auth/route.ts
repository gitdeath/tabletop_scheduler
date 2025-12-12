import { NextRequest, NextResponse } from "next/server";
import { setAdminCookie } from "@/app/actions";
import prisma from "@/lib/prisma";
import Logger from "@/lib/logger";
import { getBaseUrl } from "@/lib/url";

const log = Logger.get("AuthRoute");

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    const slug = params.slug;
    const baseUrl = getBaseUrl(request.headers);

    if (!token) {
        return NextResponse.redirect(`${baseUrl}/e/${slug}`);
    }

    try {
        const event = await prisma.event.findUnique({
            where: { slug }
        });

        if (!event || event.adminToken !== token) {
            log.warn("Invalid Magic Link attempt", { slug });
            return NextResponse.redirect(`${baseUrl}/e/${slug}?error=invalid_token`);
        }

        // Set the cookie via the helper (which uses Next.js cookies())
        await setAdminCookie(slug, token);

        log.info("Magic Link login successful", { slug });
        return NextResponse.redirect(`${baseUrl}/e/${slug}/manage`);

    } catch (e) {
        log.error("Magic Link error", e as Error);
        return NextResponse.redirect(`${baseUrl}/e/${slug}?error=server_error`);
    }
}
