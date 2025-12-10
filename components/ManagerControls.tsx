"use client";

import { useState } from "react";
import { dmManagerLink } from "@/app/actions";
import { MessageCircle, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

interface ManagerControlsProps {
    slug: string;
    initialHandle: string | null;
    hasManagerChatId: boolean;
}

export function ManagerControls({ slug, initialHandle, hasManagerChatId }: ManagerControlsProps) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

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

    return (
        <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-indigo-400" />
                Manager Controls
            </h3>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Manager Handle:</span>
                    <span className="font-mono text-slate-300">{initialHandle || "Not Set"}</span>
                </div>

                {message && <p className="text-green-400 text-sm font-medium">{message}</p>}
                {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

                <button
                    onClick={handleDM}
                    disabled={loading || !initialHandle || !hasManagerChatId}
                    className={`w-full py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 border ${loading || !initialHandle || !hasManagerChatId
                        ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border-indigo-500/30"
                        }`}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "DM Me Manager Link"}
                </button>

                {!hasManagerChatId && initialHandle && (
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
