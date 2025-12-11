"use client";

import { useState } from "react";
import { Plus, X, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";

export interface TimeSlot {
    id: string; // temp id for UI
    startTime: string; // ISO string
    endTime: string; // ISO string
}

interface TimeSlotPickerProps {
    value: TimeSlot[];
    onChange: (slots: TimeSlot[]) => void;
}

/**
 * UI to select multiple date/time ranges.
 * Validates inputs to ensure end time > start time and prevents duplicates.
 */
export function TimeSlotPicker({ value, onChange }: TimeSlotPickerProps) {
    const [date, setDate] = useState("");
    const [start, setStart] = useState("18:00");
    const [end, setEnd] = useState("22:00");

    const addSlot = () => {
        if (!date || !start || !end) return;

        // Construct full ISO strings from local inputs.
        // We use native Date parsing which handles local timezone automatically.
        const startDateTime = new Date(`${date}T${start}:00`);
        const endDateTime = new Date(`${date}T${end}:00`);
        const now = new Date();

        if (startDateTime < now) {
            alert("You cannot schedule events in the past.");
            return;
        }

        if (endDateTime <= startDateTime) {
            alert("End time must be after start time");
            return;
        }

        // Check for duplicates
        const isDuplicate = value.some(slot =>
            slot.startTime === startDateTime.toISOString() &&
            slot.endTime === endDateTime.toISOString()
        );

        if (isDuplicate) {
            alert("This time slot has already been added");
            return;
        }

        const newSlot: TimeSlot = {
            id: self.crypto.randomUUID(),
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
        };

        onChange([...value, newSlot]);
    };

    const removeSlot = (id: string) => {
        onChange(value.filter((s) => s.id !== id));
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-4 p-4 border border-slate-700 rounded-lg bg-slate-900/50">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">Date</label>
                    <input
                        type="date"
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">Start</label>
                    <input
                        type="time"
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">End</label>
                    <input
                        type="time"
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                    />
                </div>
                <div className="flex items-end">
                    <button
                        type="button"
                        onClick={addSlot}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Slot
                    </button>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {value.map((slot) => {
                    const startObj = parseISO(slot.startTime);
                    const endObj = parseISO(slot.endTime);
                    return (
                        <div key={slot.id} className="relative group flex items-start gap-3 p-3 rounded-lg border border-slate-700 bg-slate-800 hover:border-indigo-500/50 transition-all">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                                    <CalendarIcon className="w-4 h-4" />
                                    {format(startObj, "EEE, MMM d")}
                                </div>
                                <div className="flex items-center gap-2 text-slate-300 mt-1">
                                    <Clock className="w-4 h-4 text-slate-500" />
                                    {format(startObj, "h:mm a")} - {format(endObj, "h:mm a")}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeSlot(slot.id)}
                                aria-label={`Remove time slot starting at ${format(startObj, "h:mm a")}`}
                                className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
                {value.length === 0 && (
                    <div className="col-span-full py-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                        No times slots added. Pick a date and time above.
                    </div>
                )}
            </div>
        </div>
    );
}
