
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/url";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { CheckCircle, AlertCircle } from "lucide-react";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ManagerControls } from "@/components/ManagerControls";
import { ClientDate } from "@/components/ClientDate";
import { FinalizeEventModal } from "./FinalizeEventModal";
import { EditLocationModal } from "./EditLocationModal";
import { getBotUsername } from "@/lib/telegram";
import { AddToCalendar } from "@/components/AddToCalendar";
import { TelegramConnect } from "@/components/TelegramConnect";
import { ManagerVoteWarning } from "@/components/ManagerVoteWarning";

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
            participants: true,
            finalizedHost: true
        },
    });
    return event;
}

export default async function ManageEventPage({ params }: PageProps) {
    const event = await getEventWithVotes(params.slug);

    if (!event) {
        notFound();
    }

    const botUsername = await getBotUsername(process.env.TELEGRAM_BOT_TOKEN || '');

    // Calculate scores
    const slots = event.timeSlots.map(slot => {
        const yesCount = slot.votes.filter(v => v.preference === 'YES').length;
        const maybeCount = slot.votes.filter(v => v.preference === 'MAYBE').length;
        const noCount = slot.votes.filter(v => v.preference === 'NO').length;
        const totalParticipants = event.participants.length;

        // Check if anyone can host in this slot
        const hasHost = slot.votes.some(v => (v.preference === 'YES' || v.preference === 'MAYBE') && v.canHost);

        // Simple score: YES = 1, MAYBE = 0.5 (for sorting)
        // But for Quorum, usually we count Yes+Maybe >= MinPlayers
        const viable = (yesCount + maybeCount) >= event.minPlayers;

        // Perfect now requires a host and enough Yes votes
        const perfect = yesCount >= event.minPlayers && hasHost;

        const potentialHosts = slot.votes
            .filter(v => (v.preference === 'YES' || v.preference === 'MAYBE') && v.canHost)
            .map(v => v.participant);

        return {
            ...slot,
            yesCount,
            maybeCount,
            noCount,
            viable,
            perfect,
            hasHost,
            potentialHosts
        };
    });

    // Sort: Perfect first, then most YES, then Host Available, then most If Needed
    slots.sort((a, b) => {
        // 1. Status Category (Perfect > Viable > Low)
        // We rely on 'perfect' flag for top tier. Viable vs Low is implicit in scores.
        if (a.perfect && !b.perfect) return -1;
        if (!a.perfect && b.perfect) return 1;

        // 2. Has Host House
        if (a.hasHost && !b.hasHost) return -1;
        if (!a.hasHost && b.hasHost) return 1;

        // 3. Total Turnout (Yes + Maybe)
        const aTotal = a.yesCount + a.maybeCount;
        const bTotal = b.yesCount + b.maybeCount;
        if (bTotal !== aTotal) return bTotal - aTotal;

        // 4. Total Yes
        if (b.yesCount !== a.yesCount) return b.yesCount - a.yesCount;

        // 5. Time (Implicitly handled by initial sort, but let's be explicit if needed, or rely on stable sort)
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

                        <TelegramConnect
                            slug={event.slug}
                            botUsername={botUsername || 'TabletopSchedulerBot'}
                            initialTelegramLink={event.telegramLink}
                            hasChatId={!!event.telegramChatId}
                        />

                        <ManagerControls
                            slug={event.slug}
                            initialHandle={event.managerTelegram}
                            hasManagerChatId={!!event.managerChatId}
                            isFinalized={isFinalized}
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


                                    {(event.finalizedHost || event.location) && (
                                        <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 inline-block text-left text-sm space-y-2 min-w-[250px]">
                                            {event.finalizedHost && (
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <span className="text-lg">🏠</span>
                                                    <span>Hosted by <span className="font-semibold text-white">{event.finalizedHost.name}</span></span>
                                                </div>
                                            )}
                                            {event.location && (
                                                <div className="flex items-start gap-2 text-slate-300">
                                                    <span className="text-lg mt-0.5">📍</span>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-medium text-slate-400 text-xs uppercase tracking-wide">Location</div>
                                                            <EditLocationModal slug={event.slug} initialLocation={event.location} />
                                                        </div>
                                                        <div className="text-white">{event.location}</div>
                                                    </div>
                                                </div>
                                            )}
                                            {!event.location && (
                                                <div className="flex items-start gap-2 text-slate-300">
                                                    <span className="text-lg mt-0.5">📍</span>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-medium text-slate-400 text-xs uppercase tracking-wide">Location</div>
                                                            <EditLocationModal slug={event.slug} initialLocation={null} />
                                                        </div>
                                                        <div className="text-slate-500 italic">TBD</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-slate-700/50 pt-6">
                                    <AddToCalendar
                                        event={{
                                            ...event,
                                            description: event.description || undefined
                                        }}
                                        slot={finalizedSlot}
                                        className="justify-center"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-slate-200">Proposed Slots</h2>
                                    <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Best Options First</span>
                                </div>

                                <ManagerVoteWarning
                                    eventId={event.id}
                                    participants={event.participants}
                                    slug={event.slug}
                                />

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
                                                    {!slot.hasHost && <div className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1 bg-orange-900/20 px-1.5 py-0.5 rounded">No Host</div>}
                                                    {slot.viable && !slot.perfect && slot.hasHost && <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 bg-indigo-900/20 px-1.5 py-0.5 rounded">Viable</div>}
                                                    {!slot.viable && <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 bg-slate-800/50 px-1.5 py-0.5 rounded">Low T/O</div>}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-base text-slate-200">
                                                        <ClientDate date={slot.startTime} formatStr="EEE, MMM d @ h:mm a" />
                                                    </div>
                                                    <div className="text-sm text-slate-400 flex gap-3 mt-0.5">
                                                        <span className="text-green-400 font-medium">{slot.yesCount} Yes</span>
                                                        <span className="text-yellow-500/80">{slot.maybeCount} If Needed</span>
                                                        <span className="text-red-900/60">{slot.noCount} No</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <FinalizeEventModal
                                                slug={event.slug}
                                                slotId={slot.id}
                                                potentialHosts={slot.potentialHosts}
                                            />
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
