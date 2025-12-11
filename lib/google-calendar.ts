
import { format } from "date-fns";

export function generateGoogleCalendarLink(event: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
}) {
    // Format dates as YYYYMMDDTHHmmSSZ
    const formatGCalDate = (date: Date) => date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const start = formatGCalDate(event.startTime);
    const end = formatGCalDate(event.endTime);

    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.append("action", "TEMPLATE");
    url.searchParams.append("text", event.title);
    url.searchParams.append("dates", `${start}/${end}`);
    url.searchParams.append("details", event.description || "");

    if (event.location) {
        url.searchParams.append("location", event.location);
    }

    return url.toString();
}
