"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface ManagerVoteWarningProps {
    eventId: number;
    participants: { id: number }[];
    slug: string;
}

export function ManagerVoteWarning({ eventId, participants, slug }: ManagerVoteWarningProps) {
    const [shouldWarn, setShouldWarn] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // 1. Check if we have a participant ID in local storage for this event
        const savedParticipantId = localStorage.getItem(`tabletop_participant_${eventId}`);

        if (savedParticipantId) {
            const pid = parseInt(savedParticipantId);
            // 2. Check if this ID is valid in the current participants list
            // (If valid, it means they HAVE voted, because participants are only created on vote)
            const hasVoted = participants.some(p => p.id === pid);

            if (hasVoted) {
                setShouldWarn(false);
                return;
            }
        }

        // If no ID or ID not found in list -> They haven't voted.
        // We assume the manager IS the user viewing this page.
        setShouldWarn(true);
    }, [eventId, participants]);

    if (!shouldWarn) return null;

    return (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div className="text-sm">
                    <p className="text-yellow-200 font-medium">You haven&apos;t voted yet!</p>
                    <p className="text-yellow-200/70">Remember to cast your own votes for this event.</p>
                </div>
            </div>
            <Link
                href={`/e/${slug}`}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
            >
                Vote Now
            </Link>
        </div>
    );
}
