import { clsx } from "clsx";

interface AddToCalendarProps {
    event: {
        title: string;
        description?: string;
        location?: string | null;
        slug: string;
    };
    slot: {
        startTime: Date | string;
        endTime: Date | string;
    };
    className?: string;
}

export function AddToCalendar({ event, slot, className }: AddToCalendarProps) {
    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);

    const googleUrl = googleCalendarUrl(event, start, end);
    const outlookUrl = outlookCalendarUrl(event, start, end);

    return (
        <div className={clsx("grid grid-cols-1 sm:grid-cols-3 gap-3", className)}>
            <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-950/40 hover:bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col items-center gap-2 transition-colors group"
            >
                <span className="text-xl group-hover:scale-110 transition-transform">📅</span>
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200">Google Calendar</span>
            </a>
            <a
                href={outlookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-950/40 hover:bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col items-center gap-2 transition-colors group"
            >
                <span className="text-xl group-hover:scale-110 transition-transform">📧</span>
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200">Outlook</span>
            </a>
            <a
                href={`/api/event/${event.slug}/ics`}
                className="bg-slate-950/40 hover:bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col items-center gap-2 transition-colors group"
            >
                <span className="text-xl group-hover:scale-110 transition-transform">📎</span>
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200">Apple/ICS Download</span>
            </a>
        </div>
    );
}

function googleCalendarUrl(event: any, start: Date, end: Date) {
    const startStr = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endStr = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const text = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || "");
    const location = encodeURIComponent(event.location || "");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
}

function outlookCalendarUrl(event: any, start: Date, end: Date) {
    const startStr = start.toISOString();
    const endStr = end.toISOString();
    const text = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || "");
    const location = encodeURIComponent(event.location || "");

    return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${startStr}&enddt=${endStr}&subject=${text}&body=${details}&location=${location}`;
}
