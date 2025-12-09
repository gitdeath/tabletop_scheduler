"use client";

import { useEffect, useState, useCallback } from "react";

export interface VisitedEvent {
    slug: string;
    title: string;
    lastVisited: number;
}

export function useEventHistory() {
    const [history, setHistory] = useState<VisitedEvent[]>([]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem('tabletop_history');
            if (stored) {
                setHistory(JSON.parse(stored));
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    const addToHistory = useCallback((slug: string, title: string) => {
        try {
            const current = JSON.parse(localStorage.getItem('tabletop_history') || "[]");
            // Remove existing if present to bump to top
            const filtered = current.filter((e: VisitedEvent) => e.slug !== slug);
            const newItem = { slug, title, lastVisited: Date.now() };
            const updated = [newItem, ...filtered].slice(0, 20); // Keep last 20

            localStorage.setItem('tabletop_history', JSON.stringify(updated));
            setHistory(updated);
        } catch (e) {
            console.error(e);
        }
    }, []);

    return { history, addToHistory };
}
