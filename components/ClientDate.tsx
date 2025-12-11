"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

interface ClientDateProps {
    date: Date | string | number;
    formatStr: string;
    className?: string;
}

export function ClientDate({ date, formatStr, className }: ClientDateProps) {
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
