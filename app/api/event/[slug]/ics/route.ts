import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import Logger from "@/lib/logger";

const log = Logger.get("API:ICS");

// Route: /api/event/[slug]/ics

export async function GET(
    req: Request,
    { params }: { params: { slug: string } }
) {
    try {
        log.debug("Generating ICS", { slug: params.slug });
        const event = await prisma.event.findUnique({
            where: { slug: params.slug },
            include: { timeSlots: true, finalizedHost: true }
        });

        if (!event || event.status !== 'FINALIZED' || !event.finalizedSlotId) {
            return newResponse("Event not finalized or not found", 404);
        }

        const slot = event.timeSlots.find((s: any) => s.id === event.finalizedSlotId);
        if (!slot) return newResponse("Slot not found", 404);

        // Basic ICS format
        const start = formatDateICS(new Date(slot.startTime));
        const end = formatDateICS(new Date(slot.endTime));

        // Determine Base URL (Need to construct it or assume logic - ideally passed via header but this is a GET route downloaded by user)
        // Best effort: usage of getBaseUrl from lib/url if available, or just omit if tricky.
        // Actually, let's keep it simple: Just user description + Host. Link might be separate.
        // But headers might be available.
        const origin = req.headers.get("host") || "tabletop.local";
        const protocol = req.headers.get("x-forwarded-proto") || "http";
        const url = `${protocol}://${origin}/e/${event.slug}`;

        const descText = `${event.description ? event.description + '\\n\\n' : ''}Hosted by ${event.finalizedHost?.name || 'TBD'}.\\nView Event: ${url}`;

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TabletopTime//EN
BEGIN:VEVENT
UID:${event.slug}@tabletoptime.local
DTSTAMP:${formatDateICS(new Date())}
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.title}
DESCRIPTION:${descText}
END:VEVENT
END:VCALENDAR`.trim();

        return new NextResponse(icsContent, {
            headers: {
                "Content-Type": "text/calendar",
                "Content-Disposition": `attachment; filename="${event.slug}.ics"`
            }
        });

    } catch (error) {
        log.error("ICS generation failed", error as Error);
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
