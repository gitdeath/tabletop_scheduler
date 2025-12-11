"use client";

import { useState } from "react";
import { Loader2, MapPin, Check, Edit2 } from "lucide-react";

interface Host {
    participantId: number;
    name: string;
}

interface CurrentLocation {
    name: string;
    address: string | null;
}

interface FinalizeEventProps {
    slug: string;
    slotId: number;
    potentialHosts: Host[];
    currentLocation?: CurrentLocation;
    isUpdateMode?: boolean;
}

export function FinalizeEvent({ slug, slotId, potentialHosts, currentLocation, isUpdateMode = false }: FinalizeEventProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Selection state: "host-[id]" | "custom" | "tbd"
    const [selection, setSelection] = useState<string>(currentLocation ? "custom" : (potentialHosts.length > 0 ? `host-${potentialHosts[0].participantId}` : "tbd"));

    // Form fields
    const [customName, setCustomName] = useState(currentLocation?.name || "");
    const [address, setAddress] = useState(currentLocation?.address || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Effect to pre-fill address if we had a "host" logic (but we don't store host addresses yet, so irrelevant for now)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append("slotId", slotId.toString());

        if (selection.startsWith("host-")) {
            const hostId = parseInt(selection.replace("host-", ""));
            const host = potentialHosts.find(h => h.participantId === hostId);
            if (host) {
                // Name = "Chris's Place"
                formData.append("houseName", `${host.name}'s Place`);
                if (address) formData.append("houseAddress", address);
            }
        } else if (selection === "custom") {
            formData.append("houseName", customName);
            if (address) formData.append("houseAddress", address);
        } else if (selection === "tbd") {
            // No house data sent implies TBD
        }

        try {
            await fetch(`/api/event/${slug}/finalize`, {
                method: "POST",
                body: formData,
            });
            window.location.reload();
        } catch (error) {
            console.error("Failed to finalize", error);
            alert("Something went wrong.");
            setIsSubmitting(false);
        }
    };

    if (!isOpen) {
        if (isUpdateMode) {
            return (
                <button
                    onClick={() => setIsOpen(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2"
                >
                    <Edit2 className="w-3 h-3" />
                    Update Location
                </button>
            );
        }

        return (
            <button
                onClick={() => setIsOpen(true)}
                className="bg-green-600 hover:bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-bold shadow-green-900/20 shadow-lg flex items-center gap-2"
            >
                <Check className="w-4 h-4" />
                Finalize
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <MapPin className="text-green-500" />
                        {isUpdateMode ? "Update Location" : "Confirm Location"}
                    </h2>
                    <p className="text-slate-400 text-sm">
                        {isUpdateMode
                            ? "Change where the event is happening. We'll verify attendees."
                            : "Where will this session be hosted? This will be sent to the group."}
                    </p>
                </div>

                <div className="space-y-3">
                    {/* HOSTS LIST */}
                    {potentialHosts.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Hosts</label>
                            {potentialHosts.map(host => (
                                <label key={host.participantId} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selection === `host-${host.participantId}` ? "bg-indigo-900/30 border-indigo-500" : "bg-slate-950/50 border-slate-800 hover:border-slate-700"}`}>
                                    <input
                                        type="radio"
                                        name="locSelection"
                                        checked={selection === `host-${host.participantId}`}
                                        onChange={() => setSelection(`host-${host.participantId}`)}
                                        className="mt-0.5"
                                    />
                                    <span className="font-semibold text-slate-200">{host.name}'s Place</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {/* CUSTOM / TBD */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Other Options</label>
                        <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selection === "custom" ? "bg-indigo-900/30 border-indigo-500" : "bg-slate-950/50 border-slate-800 hover:border-slate-700"}`}>
                            <input
                                type="radio"
                                name="locSelection"
                                checked={selection === "custom"}
                                onChange={() => setSelection("custom")}
                            />
                            <span className="font-semibold text-slate-200">Custom Location...</span>
                        </label>

                        <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selection === "tbd" ? "bg-indigo-900/30 border-indigo-500" : "bg-slate-950/50 border-slate-800 hover:border-slate-700"}`}>
                            <input
                                type="radio"
                                name="locSelection"
                                checked={selection === "tbd"}
                                onChange={() => setSelection("tbd")}
                            />
                            <span className="font-semibold text-slate-200">Decide Later (TBD)</span>
                        </label>
                    </div>

                    {/* DETAILS INPUTS */}
                    {selection !== "tbd" && (
                        <div className="pt-2 space-y-3 animation-in fade-in slide-in-from-top-2">
                            {selection === "custom" && (
                                <input
                                    type="text"
                                    placeholder="Location Name (e.g. The Game Store)"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none text-slate-200"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                />
                            )}
                            <input
                                type="text"
                                placeholder="Address (Optional)"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none text-slate-200"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                            <p className="text-xs text-slate-500">
                                This address will be verified and added to the calendar event.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="flex-1 py-3 text-slate-400 font-medium hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (selection === "custom" && !customName)}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : (isUpdateMode ? "Update" : "Finalize")}
                    </button>
                </div>
            </div>
        </div>
    );
}
