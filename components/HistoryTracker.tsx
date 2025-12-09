"use client";

import { useEventHistory } from "@/hooks/useEventHistory";
import { useEffect } from "react";

export function HistoryTracker({ slug, title }: { slug: string, title: string }) {
    const { addToHistory } = useEventHistory();

    useEffect(() => {
        addToHistory(slug, title);
    }, [slug, title, addToHistory]);

    return null;
}
