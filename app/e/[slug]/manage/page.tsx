import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { CheckCircle, AlertCircle } from "lucide-react";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ManagerControls } from "@/components/ManagerControls";
import { ClientDate } from "@/components/ClientDate";

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
        // Check for at least one host
        const hasHost = slot.votes.some(v => v.canHost);

        const totalParticipants = event.participants.length;

        // Viable: Met minimum player count (Yes + If Needed)
        const viable = (yesCount + maybeCount) >= event.minPlayers;

        // Perfect: Everyone can make it (Yes or If Needed) AND we have a host AND min players met
        // Note: Previously "Perfect" required ALL YES. New req: "If Needed" counts as Yes but is less preferred.
        // Let's keep "Perfect" as "Everyone YES + Host".
        // And "Great" as "Everyone YES/MAYBE + Host".
        // But for sorting, let's stick to the issue req: "If items with no available house should be ranked lower".

        const allCanAttend = (yesCount + maybeCount) === totalParticipants && totalParticipants > 0;
        const perfect = allCanAttend && yesCount >= event.minPlayers && hasHost;

        return {
            ...slot,
            yesCount,
            maybeCount,
            noCount,
            hasHost,
            viable,
            perfect
        };
    });

    // Sort: Perfect first, then most YES, then most Viable
    slots.sort((a, b) => {
        // 1. Perfect (All attendees, Min players, Host)
        if (a.perfect && !b.perfect) return -1;
        if (!a.perfect && b.perfect) return 1;

        // 2. Viable + Host (Prioritize slots with a host)
        if (a.viable && a.hasHost && (!b.viable || !b.hasHost)) return -1;
        if ((!a.viable || !a.hasHost) && b.viable && b.hasHost) return 1;

        // 3. Most YES votes
        if (b.yesCount !== a.yesCount) return b.yesCount - a.yesCount;

        // 4. Most Total votes (Yes + Maybe)
        const aTotal = a.yesCount + a.maybeCount;
        const bTotal = b.yesCount + b.maybeCount;
        if (bTotal !== aTotal) return bTotal - aTotal;

        return 0;
    });

    const isFinalized = event.status === 'FINALIZED';
    const finalizedSlot = isFinalized ? event.timeSlots.find(s => s.id === event.finalizedSlotId) : null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                    {/* LEFT COLUMN: Event Info & Controls */}
                    <div className="lg:col-span-5 space-y-8">
                        <div className="border-b border-slate-800 pb-6">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <h1 className="text-3xl font-bold mb-2 break-words">Manage: {event.title}</h1>
                                    <p className="text-slate-400">Pick the best time and notify your players.</p>
                                </div>
                                <Link
                                    href={`/e/${event.slug}`}
                                    className="shrink-0 px-3 py-1.5 rounded border border-slate-700 hover:bg-slate-900 transition-colors text-xs whitespace-nowrap hidden md:inline-block"
                                >
                                    View as Player
                                </Link>
                            </div>

                            <div className="mt-4 flex items-center gap-4">
                                <CopyLinkButton url={`/e/${event.slug}`} />
                                <Link
                                    href={`/e/${event.slug}`}
                                    className="px-3 py-1.5 rounded border border-slate-700 hover:bg-slate-900 transition-colors text-xs whitespace-nowrap md:hidden"
                                >
                                    View as Player
                                </Link>
                            </div>
                        </div>

                        {!event.telegramChatId && (
                            <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-xl text-sm text-blue-300 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-bold">Connect Telegram Notifications</p>
                                    <p className="opacity-90">Bot not connected yet? Copy the event link above and <b>post it in your Telegram group</b>. The bot (if present) will see it and link the chat!</p>
                                </div>
                            </div>
                        )}

                        <ManagerControls
                            slug={event.slug}
                            initialHandle={event.managerTelegram}
                            hasManagerChatId={!!event.managerChatId}
                        />
                    </div>

                    {/* RIGHT COLUMN: Slots / Finalized State */}
                    <div className="lg:col-span-7 space-y-6">
                        {isFinalized && finalizedSlot ? (
                            <div className="p-8 rounded-2xl bg-gradient-to-br from-green-900/20 to-slate-900/40 border border-green-800/50 text-center space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-green-400 mb-2">Event Finalized!</h2>
                                    <p className="text-slate-300 text-lg">
                                        Playing on <br />
                                        <ClientDate date={finalizedSlot.startTime} formatStr="EEEE, MMMM do" className="font-semibold text-white" />
                                        <span className="text-slate-400"> at </span>
                                        <ClientDate date={finalizedSlot.startTime} formatStr="h:mm a" className="font-semibold text-white" />
                                    </p>
                                </div>

                                <div className="flex justify-center">
                                    <a
                                        href={`/api/event/${event.slug}/ics`}
                                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-all shadow-lg shadow-black/20 border border-slate-700 flex items-center gap-3 group"
                                    >
                                        <span className="text-xl group-hover:scale-110 transition-transform">📅</span>
                                        Add to Calendar
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-slate-200">Proposed Slots</h2>
                                    <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Best Options First</span>
                                </div>
                                <div className="grid gap-3">
                                    {slots.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                                            No time slots proposed yet.
                                        </div>
                                    ) : slots.map(slot => (
                                        <div key={slot.id} className="group relative p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-colors flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div className="text-center min-w-[60px] shrink-0">
                                                    {slot.perfect && <div className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1 bg-green-900/20 px-1.5 py-0.5 rounded">Perfect</div>}
                                                    {slot.viable && !slot.perfect && <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 bg-indigo-900/20 px-1.5 py-0.5 rounded">Viable</div>}
                                                    {!slot.viable && <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 bg-slate-800/50 px-1.5 py-0.5 rounded">Low T/O</div>}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-base text-slate-200">
                                                        <ClientDate date={slot.startTime} formatStr="EEE, MMM d @ h:mm a" />
                                                    </div>
                                                    <div className="text-sm text-slate-400 flex gap-3 mt-0.5">
                                                        <span className="text-green-400 font-medium">{slot.yesCount} Yes</span>
                                                        <span className="text-yellow-500/80">{slot.maybeCount} Maybe</span>
                                                        <span className="text-red-900/60">{slot.noCount} No</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <form action={`/api/event/${event.slug}/finalize`} method="POST" className="w-full sm:w-auto">
                                                <input type="hidden" name="slotId" value={slot.id} />
                                                <button
                                                    type="submit"
                                                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-500 font-medium text-sm transition-all"
                                                >
                                                    Finalize
                                                </button>
                                            </form>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
