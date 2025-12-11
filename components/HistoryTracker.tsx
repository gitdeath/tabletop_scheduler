"use client";

import { useEventHistory } from "@/hooks/useEventHistory";
import { useEffect } from "react";

/**
 * Invisible component that automatically tracks visited events in the user's history.
 * Must be a client component to access localStorage via the hook.
 */
export function HistoryTracker({ slug, title }: { slug: string, title: string }) {
    const { addToHistory } = useEventHistory();

    useEffect(() => {
        addToHistory(slug, title);
    }, [slug, title, addToHistory]);

    return null;
}
