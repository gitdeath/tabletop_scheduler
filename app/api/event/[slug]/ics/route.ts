import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { format } from "date-fns";

// Route: /api/event/[slug]/ics

export async function GET(
    req: Request,
    { params }: { params: { slug: string } }
) {
    try {
        const event = await prisma.event.findUnique({
            where: { slug: params.slug },
            include: { timeSlots: true }
        });

        if (!event || event.status !== 'FINALIZED' || !event.finalizedSlotId) {
            return newResponse("Event not finalized or not found", 404);
        }

        const slot = event.timeSlots.find(s => s.id === event.finalizedSlotId);
        if (!slot) return newResponse("Slot not found", 404);

        // Basic ICS format
        const start = formatDateICS(new Date(slot.startTime));
        const end = formatDateICS(new Date(slot.endTime));

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TabletopTime//EN
BEGIN:VEVENT
UID:${event.slug}@tabletoptime.local
DTSTAMP:${formatDateICS(new Date())}
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.title}
DESCRIPTION:${event.description || "Game Night!"}
END:VEVENT
END:VCALENDAR`.trim();

        return new NextResponse(icsContent, {
            headers: {
                "Content-Type": "text/calendar",
                "Content-Disposition": `attachment; filename="${event.slug}.ics"`
            }
        });

    } catch (error) {
        console.error(error);
        return newResponse("Error", 500);
    }
}

function newResponse(text: string, status: number) {
    return new NextResponse(text, { status });
}

function formatDateICS(date: Date) {
    // Format: YYYYMMDDTHHmmSSZ (UTC)
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
