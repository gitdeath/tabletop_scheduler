"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

/**
 * Button to copy a URL to the clipboard.
 * Handles both absolute URLs and relative paths (by prepending origin).
 */
export function CopyLinkButton({ url }: { url: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
        navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs font-medium text-slate-300 transition-colors border border-slate-700"
        >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Link2 className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy Link"}
        </button>
    )
}
