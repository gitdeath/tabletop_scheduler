
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { slugs } = body;

        if (!slugs || !Array.isArray(slugs)) {
            return NextResponse.json({ error: "Invalid slugs" }, { status: 400 });
        }

        if (slugs.length === 0) {
            return NextResponse.json({ validSlugs: [] });
        }

        const foundEvents = await prisma.event.findMany({
            where: {
                slug: { in: slugs }
            },
            select: { slug: true }
        });

        const validSlugs = foundEvents.map(e => e.slug);

        return NextResponse.json({ validSlugs });
    } catch (e) {
        console.error("Validation error", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
