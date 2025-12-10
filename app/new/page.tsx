"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TimeSlotPicker, TimeSlot } from "@/components/TimeSlotPicker";
import { Loader2 } from "lucide-react";

export default function NewEventPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [telegramLink, setTelegramLink] = useState("");
    const [managerTelegram, setManagerTelegram] = useState("");
    const [minPlayers, setMinPlayers] = useState(3);
    const [slots, setSlots] = useState<TimeSlot[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submitting form...", { title, slotsLength: slots.length });
        if (!title || slots.length === 0) {
            console.log("Validation failed", { title, slotsLength: slots.length });
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/event", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    description,
                    telegramLink,
                    managerTelegram,
                    minPlayers,
                    slots
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to create event");
            }

            const data = await res.json();

            // Set Admin Cookie via Server Action (imported dynamically or effectively)
            const { setAdminCookie } = await import("@/app/actions");
            if (data.adminToken) {
                await setAdminCookie(data.slug, data.adminToken);
            }

            router.push(`/e/${data.slug}`);
        } catch (error) {
            console.error("Submit Failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-12">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                    Create New Event
                </h1>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-slate-200">Event Title</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Campaign Session 42"
                                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-slate-200">Description (Optional)</label>
                            <textarea
                                placeholder="What are we playing? Any prep needed?"
                                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[100px] placeholder:text-slate-600"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-slate-200">Telegram Invite Link (Optional)</label>
                            <input
                                type="url"
                                placeholder="https://t.me/+AbCdEfGh"
                                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                value={telegramLink}
                                onChange={(e) => setTelegramLink(e.target.value)}
                            />
                            <p className="text-xs text-indigo-300">
                                💡 1. Add bot to group. 2. Paste invite link here. 3. <b>Post the event link in the group</b> so the bot can connect!
                            </p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-slate-200">Your Telegram Handle (For Recovery)</label>
                            <input
                                type="text"
                                placeholder="@YourHandle"
                                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                value={managerTelegram}
                                onChange={(e) => setManagerTelegram(e.target.value)}
                            />
                            <p className="text-xs text-slate-400">
                                Needed if you lose the manager link.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-slate-200">Minimum Players</label>
                            <p className="text-xs text-slate-400">How many people need to say YES for a session to happen?</p>
                            <input
                                type="number"
                                min="2"
                                max="100"
                                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-32"
                                value={minPlayers}
                                onChange={(e) => setMinPlayers(parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <label className="font-semibold text-slate-200">Propose Time Slots</label>
                            <span className="text-sm text-slate-400">{slots.length} slots added</span>
                        </div>
                        <TimeSlotPicker value={slots} onChange={setSlots} />
                    </div>

                    <div className="pt-6 border-t border-slate-800">
                        <button
                            type="submit"
                            disabled={loading || slots.length === 0}
                            className="w-full py-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg shadow-lg shadow-indigo-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Create Event & Get Link"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
