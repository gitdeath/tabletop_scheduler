import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomBytes } from "crypto";
import Logger from "@/lib/logger";

const log = Logger.get("API:EventCreate");

// Helper to generate a friendly slug (or just random string)
function generateSlug() {
    return randomBytes(4).toString("hex"); // e.g., "a1b2c3d4"
}

/**
 * Creates a new event with its initial time slots.
 * Returns an Admin Token which the creator must save (via cookie) to manage the event later.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, description, minPlayers, slots, telegramLink, managerTelegram } = body;

        log.debug("Request received", { title });

        if (!title || !slots || !Array.isArray(slots) || slots.length === 0) {
            log.warn("Invalid payload", { title, slotsLength: slots?.length });
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        const slug = generateSlug();

        // Transactional creation ensures we don't have an event without slots.
        const event = await prisma.event.create({
            data: {
                slug,
                title,
                description,
                telegramLink,
                managerTelegram,
                timezone: body.timezone || "UTC",
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

        log.info("Event created successfully", { slug, id: event.id });
        return NextResponse.json({ slug: event.slug, id: event.id, adminToken: event.adminToken });
    } catch (error) {
        log.error("Failed to create event", error as Error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
