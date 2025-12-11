"use client";

import { useEffect, useState, useCallback } from "react";

export interface VisitedEvent {
    slug: string;
    title: string;
    lastVisited: number;
}

/**
 * Hook to manage the user's local history of visited events.
 * Persists data to localStorage so users can easily return to recent polls.
 */
export function useEventHistory() {
    const [history, setHistory] = useState<VisitedEvent[]>([]);

    useEffect(() => {
        // Prevent access during Server-Side Rendering (SSR)
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

    const validateHistory = useCallback(async () => {
        try {
            const current = JSON.parse(localStorage.getItem('tabletop_history') || "[]");
            if (current.length === 0) return;

            const slugs = current.map((e: VisitedEvent) => e.slug);
            const res = await fetch('/api/events/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slugs })
            });

            if (res.ok) {
                const { validSlugs } = await res.json();
                const validHistory = current.filter((e: VisitedEvent) => validSlugs.includes(e.slug));

                // Only update if changes were made
                if (validHistory.length !== current.length) {
                    localStorage.setItem('tabletop_history', JSON.stringify(validHistory));
                    setHistory(validHistory);
                }
            }
        } catch (e) {
            console.error("Failed to validate history", e);
        }
    }, []);

    return { history, addToHistory, validateHistory };
}
