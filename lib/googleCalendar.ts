/**
 * Generates a link to create a new Google Calendar event.
 * Pre-fills title, description, start/end time, and location.
 */
export function generateGoogleCalendarUrl(event: {
    title: string;
    description?: string | null;
    startTime: Date;
    endTime: Date;
    location?: string | null;
}) {
    // Format dates to YYYYMMDDTHHMMSSZ, stripping punctuation as required by GCal API
    const start = event.startTime.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = event.endTime.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: event.title,
        dates: `${start}/${end}`,
        details: event.description || "",
        location: event.location || "",
    });

    return `https://www.google.com/calendar/render?${params.toString()}`;
}
