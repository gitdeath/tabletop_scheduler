import { generateGoogleCalendarUrl } from "@/lib/googleCalendar";

interface EventData {
    slug: string;
    title: string;
    description: string | null;
    finalizedHost: { name: string } | null;
    location: string | null;
    timezone?: string;
}

interface SlotData {
    startTime: Date;
    endTime: Date;
}

/**
 * Constructs the formatted Telegram message for a finalized event.
 * Includes host details, location, and calendar links (Google + ICS).
 * 
 * @param event - The event data including slug, title, and host info.
 * @param slot - The selected time slot for the event.
 * @param origin - The base URL of the application (for generating links).
 */
export function buildFinalizedMessage(
    event: EventData,
    slot: SlotData,
    origin: string
): string {
    const slotTime = new Date(slot.startTime);

    const icsLink = `${origin}/api/event/${event.slug}/ics`;
    const googleLink = generateGoogleCalendarUrl({
        title: event.title,
        description: `${event.description ? event.description + '\n\n' : ''}Hosted by ${event.finalizedHost?.name || 'TBD'}.\nView Event: ${origin}/e/${event.slug}`,
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: event.location
    });

    let locString = event.location ? `\n📍 ${event.location}` : "";
    let hostString = event.finalizedHost ? `\n🏠 Hosted by <b>${event.finalizedHost.name}</b>` : "";

    const timeString = slotTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: event.timezone || 'UTC',
        timeZoneName: 'short'
    });

    const dateString = slotTime.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: event.timezone || 'UTC'
    });

    const eventUrl = `${origin}/e/${event.slug}`;

    return `🎉 <b>Event Finalized!</b>\n\n<b>${event.title}</b> is happening on:\n📅 ${dateString}\n⏰ ${timeString}${hostString}${locString}\n\n<a href="${eventUrl}">🔗 View Event Details</a>\n<a href="${icsLink}">📅 Add to Calendar (.ics)</a>\n<a href="${googleLink}">🗓️ Google Calendar</a>\n\nSee you there!`;
}
