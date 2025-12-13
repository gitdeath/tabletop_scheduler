"use client";

import { useEffect } from "react";

export function GoogleAdBar() {
    useEffect(() => {
        try {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense Error", e);
        }
    }, []);

    // Use a placeholder if no ID is present (development safety)
    // For production, set NEXT_PUBLIC_GOOGLE_ADSENSE_ID in Vercel
    const adClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID || "ca-pub-XXXXXXXXXXXXXXXX";
    const adSlot = "1234567890"; // You might want to make this an env var too if you have specific slots

    // If in dev mode or no client ID configured yet, show a placeholder
    if (adClient === "ca-pub-XXXXXXXXXXXXXXXX") {
        return (
            <div className="w-full h-24 bg-slate-900 border-t border-slate-800 flex items-center justify-center text-slate-500 text-sm">
                <div className="flex flex-col items-center gap-1">
                    <span className="font-semibold tracking-wider">ADVERTISEMENT</span>
                    <span className="text-xs opacity-50">(Configure AdSense Client ID in components/GoogleAdBar.tsx)</span>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full flex justify-center py-4 bg-slate-950 border-t border-slate-900">
            <ins
                className="adsbygoogle"
                style={{ display: "block" }}
                data-ad-client={adClient}
                data-ad-slot={adSlot}
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </div>
    );
}
