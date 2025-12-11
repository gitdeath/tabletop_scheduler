"use client";

import { useState } from "react";
import { Loader2, MapPin, Check } from "lucide-react";

interface House {
    id: number;
    name: string;
    address: string | null;
}

interface FinalizeEventProps {
    slug: string;
    slotId: number;
    existingHouses: House[];
}

export function FinalizeEvent({ slug, slotId, existingHouses }: FinalizeEventProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedHouseId, setSelectedHouseId] = useState<number | "new" | null>(null);
    const [newHouseName, setNewHouseName] = useState("");
    const [newHouseAddress, setNewHouseAddress] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append("slotId", slotId.toString());

        if (selectedHouseId === "new") {
            formData.append("houseName", newHouseName);
            formData.append("houseAddress", newHouseAddress);
        } else if (selectedHouseId) {
            formData.append("houseId", selectedHouseId.toString());
        }

        // Standard form submission to the API route
        // We use fetch here to avoid redirecting inside the form handler if we wanted to
        // show success UI, but the route redirects anyway.
        // Actually, let's just trigger the POST.

        try {
            await fetch(`/api/event/${slug}/finalize`, {
                method: "POST",
                body: formData,
            });
            // The API redirects, so we might reload or just wait for redirect.
            window.location.reload();
        } catch (error) {
            console.error("Failed to finalize", error);
            alert("Something went wrong.");
            setIsSubmitting(false);
        }
    };

    if (!isOpen) {
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
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <MapPin className="text-green-500" />
                    Confirm Location
                </h2>

                <p className="text-slate-400 text-sm">
                    Where will this session be hosted? This will be sent to the group.
                </p>

                <div className="space-y-3">
                    {/* Existing Houses List */}
                    {existingHouses.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saved Locations</label>
                            {existingHouses.map(house => (
                                <label key={house.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedHouseId === house.id ? "bg-indigo-900/30 border-indigo-500" : "bg-slate-950/50 border-slate-800 hover:border-slate-700"}`}>
                                    <input
                                        type="radio"
                                        name="houseSelection"
                                        className="mt-1"
                                        checked={selectedHouseId === house.id}
                                        onChange={() => setSelectedHouseId(house.id)}
                                    />
                                    <div>
                                        <div className="font-semibold text-slate-200">{house.name}</div>
                                        <div className="text-xs text-slate-500">{house.address}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}

                    {/* New House Option */}
                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedHouseId === "new" ? "bg-indigo-900/30 border-indigo-500" : "bg-slate-950/50 border-slate-800 hover:border-slate-700"}`}>
                        <input
                            type="radio"
                            name="houseSelection"
                            checked={selectedHouseId === "new"}
                            onChange={() => setSelectedHouseId("new")}
                        />
                        <span className="font-semibold text-slate-200">Add New Place...</span>
                    </label>

                    {/* New House Form */}
                    {selectedHouseId === "new" && (
                        <div className="pl-8 space-y-3 animation-in fade-in slide-in-from-top-2">
                            <input
                                type="text"
                                placeholder="Location Name (e.g. Chris's House)"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                                value={newHouseName}
                                onChange={(e) => setNewHouseName(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Address (Optional)"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                                value={newHouseAddress}
                                onChange={(e) => setNewHouseAddress(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="flex-1 py-3 text-slate-400 font-medium hover:bg-slate-800 rounded-xl"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || selectedHouseId === null || (selectedHouseId === "new" && !newHouseName)}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : "Confirm & Send"}
                    </button>
                </div>
            </div>
        </div>
    );
}
