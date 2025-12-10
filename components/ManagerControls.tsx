"use client";

import { useState, useEffect } from "react";
import { dmManagerLink, checkManagerStatus } from "@/app/actions";
import { MessageCircle, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

interface ManagerControlsProps {
    slug: string;
    initialHandle: string | null;
    hasManagerChatId: boolean;
}

export function ManagerControls({ slug, initialHandle, hasManagerChatId: initialHasId }: ManagerControlsProps) {
    const [hasManagerChatId, setHasManagerChatId] = useState(initialHasId);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    // Poll for status if we don't have the ID yet
    useEffect(() => {
        if (hasManagerChatId || !initialHandle) return;

        const interval = setInterval(async () => {
            try {
                const status = await checkManagerStatus(slug);
                if (status.hasManagerChatId) {
                    setHasManagerChatId(true);
                    router.refresh();
                }
            } catch (e) {
                // ignore errors
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [hasManagerChatId, initialHandle, slug, router]);

    const handleDM = async () => {
        if (!hasManagerChatId) return;

        setLoading(true);
        setMessage("");
        setError("");

        try {
            const res = await dmManagerLink(slug);
            if (res.error) {
                setError(res.error);
            } else {
                setMessage("✅ Link sent! Check your DMs.");
            }
        } catch (e) {
            setError("Failed to send request.");
        } finally {
            setLoading(false);
        }
    };

    if (!initialHandle) {
        return (
            <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4 opacity-75">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-slate-500" />
                    Manager Controls
                </h3>
                <div className="text-sm text-slate-500 px-2">
                    Manager features (like recovering this page link via DM) are only available if you provide a Telegram handle when creating the event.
                </div>
            </div>
        );
    }

    return (
        <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-indigo-400" />
                Manager Controls
            </h3>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm text-slate-400 gap-4">
                    <span className="shrink-0">Manager Handle:</span>
                    <span className="font-mono text-slate-300 truncate">{initialHandle}</span>
                </div>

                {message && <p className="text-green-400 text-sm font-medium">{message}</p>}
                {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

                <button
                    onClick={handleDM}
                    disabled={loading || !hasManagerChatId}
                    className={`w-full py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 border ${loading || !hasManagerChatId
                        ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border-indigo-500/30"
                        }`}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                        (!hasManagerChatId ? <span className="flex items-center gap-2">Waiting for Connection... <Loader2 className="w-3 h-3 animate-spin opacity-50" /></span> : "DM Me Manager Link")}
                </button>

                {!hasManagerChatId && (
                    <div className="p-3 bg-yellow-900/20 border border-yellow-800 rounded text-xs text-yellow-200/80">
                        <p>
                            🤖 <strong>Bot doesn&apos;t know you yet!</strong> <br />
                            To enable this button:
                        </p>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                            <li>DM the bot <code>/start</code></li>
                            <li>OR paste a link in a group with the bot</li>
                        </ul>
                    </div>
                )}
                <p className="text-[10px] text-slate-500 text-center">
                    (Requires you to have started the bot)
                </p>
            </div>
        </div>
    );
}
