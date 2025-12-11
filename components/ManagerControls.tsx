"use client";

import { useState, useEffect } from "react";
import { dmManagerLink, checkManagerStatus, updateManagerHandle, deleteEvent } from "@/app/actions";
import { MessageCircle, Loader2, Save, Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ManagerControlsProps {
    slug: string;
    initialHandle: string | null;
    hasManagerChatId: boolean;
}

/**
 * Control panel for the event creator.
 * Allows setting a manager handle, sending recovery links via DM, and deleting the event.
 */
export function ManagerControls({ slug, initialHandle: propsInitialHandle, hasManagerChatId: initialHasId }: ManagerControlsProps) {
    const [initialHandle, setInitialHandle] = useState(propsInitialHandle);
    const [hasManagerChatId, setHasManagerChatId] = useState(initialHasId);

    // Form state for adding handle
    const [newHandle, setNewHandle] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Delete state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    // Polling mechanism to auto-detect when the user has finally messaged the bot.
    // This provides immediate feedback on the UI without requiring a manual refresh.
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

    const handleSaveHandle = async () => {
        if (!newHandle) return;
        setIsSaving(true);
        setError("");

        try {
            const res = await updateManagerHandle(slug, newHandle);
            if (res.error) {
                setError(res.error);
            } else if (res.success && res.handle) {
                setInitialHandle(res.handle);
                setNewHandle("");
                router.refresh();
            }
        } catch (e) {
            setError("Failed to save handle.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!initialHandle) {
        return (
            <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-slate-400" />
                    Manager Controls
                </h3>

                <div className="space-y-3">
                    <p className="text-sm text-slate-400">
                        Set a Telegram handle to enable manager features (like link recovery).
                    </p>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="@username"
                            value={newHandle}
                            onChange={(e) => setNewHandle(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                            onClick={handleSaveHandle}
                            disabled={isSaving || !newHandle.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                        </button>
                    </div>
                    {error && <p className="text-red-400 text-xs">{error}</p>}
                </div>
            </div>
        );
    }

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await deleteEvent(slug);
            if ('error' in res) {
                setError(res.error || "Unknown error");
                setIsDeleting(false);
            } else {
                // Redirect happened on server usually, but just in case
                router.push("/");
            }
        } catch (e) {
            setError("Failed to delete event.");
            setIsDeleting(false);
        }
    };

    return (
        <div className="mt-6 space-y-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
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

            {/* Danger Zone */}
            <div className="p-4 rounded-xl border border-red-900/30 bg-red-950/10 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        Danger Zone
                    </h3>
                    {!showDeleteConfirm && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-xs text-red-400 hover:text-red-300 underline"
                        >
                            Delete Event...
                        </button>
                    )}
                </div>

                {showDeleteConfirm && (
                    <div className="space-y-3 animation-in fade-in slide-in-from-top-2">
                        <div className="p-3 bg-red-950/40 border border-red-900/50 rounded text-xs text-red-200 flex gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                            <p>
                                <b>Warning:</b> This action cannot be undone. All votes, participants, and data will be permanently erased.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex-1 py-2 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm Delete"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

