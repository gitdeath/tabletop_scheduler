"use client";

import { useEventHistory } from "@/hooks/useEventHistory";
import Link from "next/link";
import { ArrowLeft, User as UserIcon, Calendar, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";

export default function ProfilePage() {
    const { history } = useEventHistory();
    const [userName, setUserName] = useState("");

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setUserName(localStorage.getItem('tabletop_username') || "Guest");
        }
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">
                <Link href="/" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors mb-4">
                    <ArrowLeft className="w-4 h-4" /> Back Home
                </Link>

                <div className="flex items-center gap-4 pb-8 border-b border-slate-800">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400">
                        <UserIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100">
                            Hello, {userName}
                        </h1>
                        <p className="text-slate-400">Welcome to your event dashboard.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-400" />
                        Recent Events
                    </h2>

                    {history.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                            <p>You haven&apos;t visited any events yet.</p>
                        </div>
                    ) : (
                        Create an Event
                </Link>
            </div>
            ) : (
            <div className="grid gap-4">
                {history.map(event => (
                    <Link
                        key={event.slug}
                        href={`/e/${event.slug}`}
                        className="group block p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold text-lg group-hover:text-indigo-300 transition-colors">
                                    {event.title}
                                </h3>
                                <p className="text-xs text-slate-500 font-mono mt-1">
                                    {format(new Date(event.lastVisited), "MMM d, yyyy")}
                                </p>
                            </div>
                            <ArrowRightIcon className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                        </div>
                    </Link>
                ))}
            </div>
                    )}
        </div>
            </div >
        </div >
    )
}

function ArrowRightIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    )
}
