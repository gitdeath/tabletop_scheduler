import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomBytes } from "crypto";

// Helper to generate a friendly slug (or just random string)
function generateSlug() {
    return randomBytes(4).toString("hex"); // e.g., "a1b2c3d4"
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, description, minPlayers, slots, telegramLink } = body;

        if (!title || !slots || !Array.isArray(slots) || slots.length === 0) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        const slug = generateSlug();

        // Create Event and TimeSlots in a transaction (implied by nested create)
        const event = await prisma.event.create({
            data: {
                slug,
                title,
                description,
                telegramLink,
                minPlayers: minPlayers || 3,
                status: "DRAFT",
                timeSlots: {
                    create: slots.map((slot: any) => ({
                        startTime: new Date(slot.startTime),
                        endTime: new Date(slot.endTime),
                    })),
                },
            },
        });

        return NextResponse.json({ slug: event.slug, id: event.id, adminToken: event.adminToken });
    } catch (error) {
        console.error("Failed to create event:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
