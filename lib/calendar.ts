/**
 * Generates a Google Calendar 'Add Event' URL.
 */
export function googleCalendarUrl(event: { title: string, description?: string | null, location?: string | null }, start: Date, end: Date) {
    const startStr = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endStr = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const text = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || "");
    const location = encodeURIComponent(event.location || "");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
}

/**
 * Generates an Outlook/Office365 'Add Event' URL.
 */
export function outlookCalendarUrl(event: { title: string, description?: string | null, location?: string | null }, start: Date, end: Date) {
    const startStr = start.toISOString();
    const endStr = end.toISOString();
    const text = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || "");
    const location = encodeURIComponent(event.location || "");

    return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${startStr}&enddt=${endStr}&subject=${text}&body=${details}&location=${location}`;
}
