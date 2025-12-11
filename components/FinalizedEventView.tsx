"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Home, User as UserIcon, Loader2, Check } from "lucide-react";
import { clsx } from "clsx";
import { ClientDate } from "./ClientDate";
import { AddToCalendar } from "./AddToCalendar";

interface FinalizedEventViewProps {
    event: any;
    finalizedSlot: any;
}

export function FinalizedEventView({ event, finalizedSlot }: FinalizedEventViewProps) {
    // State for joining
    const [userName, setUserName] = useState("");
    const [userTelegram, setUserTelegram] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);
    const [participantId, setParticipantId] = useState<number | null>(null);

    // Filter participants who voted YES/MAYBE for this slot
    const attendees = finalizedSlot.votes
        .filter((v: any) => v.preference === 'YES' || v.preference === 'MAYBE')
        .map((v: any) => ({
            ...v.participant,
            preference: v.preference
        }));

    // Check if user is already in attendees list
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedId = localStorage.getItem(`tabletop_participant_${event.id}`);
            if (savedId) {
                setParticipantId(parseInt(savedId));
                // Check if this ID is in the attendees list
                const isAttending = attendees.some((a: any) => a.id === parseInt(savedId));
                if (isAttending) {
                    setHasJoined(true);
                }
            } else {
                // Pre-fill from global prefs
                setUserName(localStorage.getItem('tabletop_username') || "");
                setUserTelegram(localStorage.getItem('tabletop_telegram') || "");
            }
        }
    }, [event.id, attendees]);

    const handleJoin = async () => {
        if (!userName) return alert("Please enter your name");

        setIsSubmitting(true);
        try {
            // Save prefs
            localStorage.setItem('tabletop_username', userName);
            localStorage.setItem('tabletop_telegram', userTelegram);

            // Construct vote payload: YES for finalized slot
            const payload = {
                name: userName,
                telegramId: userTelegram,
                participantId, // if we have it (e.g. updating details? or re-joining?)
                votes: [{
                    slotId: finalizedSlot.id,
                    preference: 'YES',
                    canHost: false // Guests don't host
                }]
            };

            const res = await fetch(`/api/event/${event.id}/vote`, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.participantId) {
                    localStorage.setItem(`tabletop_participant_${event.id}`, data.participantId.toString());
                }
                setHasJoined(true);
                window.location.reload(); // Refresh to show new attendee in list
            } else {
                alert("Failed to join event");
            }
        } catch (e) {
            console.error(e);
            alert("Error joining event");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid gap-8 lg:grid-cols-3">
            {/* LEFT COLUMN: Event Details & Join Form */}
            <div className="lg:col-span-2 space-y-8">

                {/* Finalized Summary Card */}
                <div className="bg-gradient-to-br from-green-900/20 to-slate-900 border border-green-800/50 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Calendar className="w-32 h-32" />
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Passports Ready!</h2>
                        <p className="text-green-300">This event is finalized and ready to play.</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="bg-slate-950/50 rounded-xl p-4 flex items-start gap-3 border border-slate-800">
                            <Clock className="w-5 h-5 text-indigo-400 mt-1" />
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">When</div>
                                <div className="font-semibold text-white">
                                    <ClientDate date={finalizedSlot.startTime} formatStr="EEEE, MMMM do" />
                                </div>
                                <div className="text-indigo-300 text-sm">
                                    <ClientDate date={finalizedSlot.startTime} formatStr="h:mm a" />
                                    {" - "}
                                    <ClientDate date={finalizedSlot.endTime} formatStr="h:mm a" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-950/50 rounded-xl p-4 flex items-start gap-3 border border-slate-800">
                            <MapPin className="w-5 h-5 text-red-400 mt-1" />
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Where</div>
                                <div className="font-semibold text-white">
                                    {event.location || "Location TBD"}
                                </div>
                                {event.finalizedHost && (
                                    <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-1">
                                        <Home className="w-3 h-3" />
                                        <span>Hosted by {event.finalizedHost.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Add to Calendar */}
                    <div className="border-t border-slate-700/50 pt-6">
                        <AddToCalendar
                            event={event}
                            slot={finalizedSlot}
                        />
                    </div>
                </div>
