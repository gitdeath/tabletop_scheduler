import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { CheckCircle, AlertCircle } from "lucide-react";
import { CopyLinkButton } from "@/components/CopyLinkButton";

interface PageProps {
    params: { slug: string };
}

async function getEventWithVotes(slug: string) {
    const event = await prisma.event.findUnique({
        where: { slug },
        include: {
            timeSlots: {
                include: {
                    votes: {
                        include: {
                            participant: true
                        }
                    }
                },
                orderBy: { startTime: 'asc' }
            },
            participants: true
        },
    });
    return event;
}

export default async function ManageEventPage({ params }: PageProps) {
    const event = await getEventWithVotes(params.slug);

    if (!event) {
        notFound();
    }

    // Calculate scores
    const slots = event.timeSlots.map(slot => {
        const yesCount = slot.votes.filter(v => v.preference === 'YES').length;
        const maybeCount = slot.votes.filter(v => v.preference === 'MAYBE').length;
        const noCount = slot.votes.filter(v => v.preference === 'NO').length;
        const totalParticipants = event.participants.length;

        // Simple score: YES = 1, MAYBE = 0.5 (for sorting)
        // But for Quorum, usually we count Yes+Maybe >= MinPlayers
        const viable = (yesCount + maybeCount) >= event.minPlayers;
        const perfect = yesCount === totalParticipants && totalParticipants > 0 && yesCount >= event.minPlayers;

        return {
            ...slot,
            yesCount,
            maybeCount,
            noCount,
            viable,
            perfect
        };
    });

    // Sort: Perfect first, then most YES, then most Viable
    slots.sort((a, b) => {
        if (a.perfect && !b.perfect) return -1;
        if (!a.perfect && b.perfect) return 1;
        if (b.yesCount !== a.yesCount) return b.yesCount - a.yesCount;
        return 0;
    });

    const isFinalized = event.status === 'FINALIZED';
    const finalizedSlot = isFinalized ? event.timeSlots.find(s => s.id === event.finalizedSlotId) : null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-12">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Manage: {event.title}</h1>
                        <p className="text-slate-400">Pick the best time and notify your players.</p>
                        <div className="mt-4 flex items-center gap-4">
                            <CopyLinkButton url={`/e/${event.slug}`} />
                        </div>
                        {!event.telegramChatId && (
                            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg text-sm text-blue-300 flex items-start gap-2 max-w-xl">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <div>
                                    <p className="font-bold">Connect Telegram Notifications</p>
                                    <p>Bot not connected yet? Copy the event link above and <b>post it in your Telegram group</b>. The bot (if present) will see it and link the chat!</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <Link
                        href={`/e/${event.slug}`}
                        className="px-4 py-2 rounded border border-slate-700 hover:bg-slate-900 transition-colors text-sm"
                    >
                        View As Player
                    </Link>
                </div>

                {isFinalized && finalizedSlot ? (
                    <div className="p-6 rounded-xl bg-green-900/20 border border-green-800 text-center space-y-4">
                        <h2 className="text-2xl font-bold text-green-400 mb-2">Event Finalized!</h2>
                        <p className="text-slate-300 text-lg">
                            Playing on {format(new Date(finalizedSlot.startTime), "EEEE, MMMM do 'at' h:mm a")}
                        </p>

                        <div className="flex justify-center gap-4">
                            <a
                                href={`/api/event/${event.slug}/ics`}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-700 flex items-center gap-2"
                            >
                                <span className="text-xl">📅</span> Add to Calendar
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-200">Proposed Slots (Best First)</h2>
                        <div className="grid gap-4">
                            {slots.map(slot => (
                                <div key={slot.id} className="group relative p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="text-center min-w-[60px]">
                                            {slot.perfect && <div className="text-xs font-bold text-green-400 uppercase tracking-widest mb-1">Perfect</div>}
                                            {slot.viable && !slot.perfect && <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Viable</div>}
                                            {!slot.viable && <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Low T/O</div>}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-lg text-slate-200">
                                                {format(new Date(slot.startTime), "EEE, MMM d @ h:mm a")}
                                            </div>
                                            <div className="text-sm text-slate-400 flex gap-3">
                                                <span className="text-green-400">{slot.yesCount} Yes</span>
                                                <span className="text-yellow-500">{slot.maybeCount} Maybe</span>
                                                <span className="text-red-400">{slot.noCount} No</span>
                                            </div>
                                        </div>
                                        {slot.votes.some(v => v.canHost) && (
                                            <div className="mt-2 text-xs text-indigo-300 flex items-center gap-1">
                                                <span className="font-bold">Hosts:</span>
                                                {slot.votes.filter(v => v.canHost).map(v => v.participant.name).join(", ")}
                                            </div>
                                        )}
                                    </div>

                                    <form action={`/api/event/${event.slug}/finalize`} method="POST">
                                        <input type="hidden" name="slotId" value={slot.id} />
                                        <button
                                            type="submit"
                                            className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors opacity-90 hover:opacity-100"
                                        >
                                            Finalize This Time
                                        </button>
                                    </form>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
