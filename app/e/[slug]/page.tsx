import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { HistoryTracker } from "@/components/HistoryTracker";
import { format } from "date-fns";
import { Calendar, Users } from "lucide-react";
import { ManagerRecovery } from "@/components/ManagerRecovery";
import { VotingInterface } from "@/components/VotingInterface";
import { FinalizedEventView } from "@/components/FinalizedEventView";

interface PageProps {
    params: { slug: string };
}

async function getEvent(slug: string) {
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
            finalizedHost: true,
        },
    });

    return event;
}

export default async function EventPage({ params }: PageProps) {
    const event = await getEvent(params.slug);

    if (!event) {
        notFound();
    }

    // Calculate vote counts for display
    const slotsWithCounts = event.timeSlots.map(slot => {
        const yes = slot.votes.filter(v => v.preference === 'YES').length;
        const maybe = slot.votes.filter(v => v.preference === 'MAYBE').length;
        const no = slot.votes.filter(v => v.preference === 'NO').length;
        return { ...slot, counts: { yes, maybe, no } };
    });

    // Determine finalized slot if applicable
    const isFinalized = event.status === 'FINALIZED' && event.finalizedSlotId;
    const finalizedSlot = isFinalized ? event.timeSlots.find(s => s.id === event.finalizedSlotId) : null;

    return (
        <main className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8">
            <HistoryTracker slug={event.slug} title={event.title} />
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header Section */}
                <div className="space-y-4 border-b border-slate-800 pb-6">
                    <div className="flex items-center gap-3 text-indigo-400 mb-2">
                        <Calendar className="w-5 h-5" />
                        <span className="font-mono text-sm uppercase tracking-wider">Scheduling Event</span>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        {event.title}
                    </h1>

                    {event.description && (
                        <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
                            {event.description}
                        </p>
                    )}

                    {event.telegramLink && (
                        <div className="pt-2">
                            <a
                                href={event.telegramLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 rounded-lg border border-sky-600/50 transition-colors font-medium text-sm"
                            >
                                <Users className="w-4 h-4" />
                                Join Telegram Chat
                            </a>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-slate-500 text-sm mt-4">
                        <Users className="w-4 h-4" />
                        <span>Target: {event.minPlayers} players needed</span>
                    </div>
                </div>

                {/* Voting or Finalized View */}
                {isFinalized && finalizedSlot ? (
                    <FinalizedEventView
                        event={event}
                        finalizedSlot={finalizedSlot}
                    />
                ) : (
                    <VotingInterface
                        eventId={event.id}
                        initialSlots={slotsWithCounts}
                        participants={event.participants}
                        minPlayers={event.minPlayers}
                    />
                )}

                <div className="text-center pt-8 border-t border-slate-800">
                    <p className="text-slate-500 text-sm mb-2">Are you the organizer?</p>
                    <a
                        href={`/e/${event.slug}/manage`}
                        className="text-indigo-400 hover:text-indigo-300 underline text-sm transition-colors"
                    >
                        Manage Event & Finalize Time
                    </a>
                </div>

                <ManagerRecovery slug={event.slug} />

            </div>
        </main>
    );
}
