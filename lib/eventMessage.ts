import { generateGoogleCalendarUrl } from "@/lib/googleCalendar";

interface EventData {
    slug: string;
    title: string;
    description: string | null;
    finalizedHost: { name: string } | null;
    location: string | null;
}

interface SlotData {
    startTime: Date;
    endTime: Date;
}

export function buildFinalizedMessage(
    event: EventData,
    slot: SlotData,
    origin: string
): string {
    const slotTime = new Date(slot.startTime);

    const icsLink = `${origin}/api/event/${event.slug}/ics`;
    const googleLink = generateGoogleCalendarUrl({
        title: event.title,
        description: `Hosted by ${event.finalizedHost?.name || 'TBD'}. View Event: ${origin}/e/${event.slug}`,
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: event.location
    });

    let locString = event.location ? `\n📍 ${event.location}` : "";
    let hostString = event.finalizedHost ? `\n🏠 Hosted by <b>${event.finalizedHost.name}</b>` : "";

    return `🎉 <b>Event Finalized!</b>\n\n<b>${event.title}</b> is happening on:\n📅 ${slotTime.toDateString()}\n⏰ ${slotTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${hostString}${locString}\n\n<a href="${icsLink}">📅 Add to Calendar (.ics)</a>\n<a href="${googleLink}">G Add to Google Calendar</a>\n\nSee you there!`;
}
