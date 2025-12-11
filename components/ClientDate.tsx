"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

interface ClientDateProps {
    date: Date | string | number;
    formatStr: string;
    className?: string;
}

/**
 * Renders a date consistently on the client side to avoid SSR hydration mismatches.
 * Prevents "Text content does not match server-rendered HTML" errors for timezones.
 */
export function ClientDate({ date, formatStr, className }: ClientDateProps) {
    // Only render after mounting to ensure client timezone matches
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <span className={className}>
            {format(new Date(date), formatStr)}
        </span>
    );
}
