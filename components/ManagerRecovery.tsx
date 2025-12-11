"use client";

import { useState } from "react";
import { recoverManagerLink } from "@/app/actions";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Modal to recover manager access using the saved Telegram handle.
 * Used when a user loses their admin cookie but linked their Telegram.
 */
export function ManagerRecovery({ slug }: { slug: string }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [handle, setHandle] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleRecover = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await recoverManagerLink(slug, handle);
            if (res.error) {
                setError(res.error);
            } else if (res.success && res.url) {
                router.push(res.url);
            }
        } catch (err) {
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="text-xs text-slate-600 hover:text-indigo-400 transition-colors flex items-center gap-1 mx-auto mt-4"
            >
                <Lock className="w-3 h-3" />
                Lost Manager Link?
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl max-w-sm w-full shadow-2xl">
                <div className="flex items-center gap-2 mb-4 text-indigo-400">
                    <ShieldCheck className="w-6 h-6" />
                    <h3 className="font-bold text-lg">Recover Access</h3>
                </div>

                <p className="text-slate-400 text-sm mb-4">
                    Enter the Telegram Handle you provided when creating this event.
                </p>

                <form onSubmit={handleRecover} className="space-y-4">
                    <input
                        type="text"
                        placeholder="@YourHandle"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50"
                        value={handle}
                        onChange={e => setHandle(e.target.value)}
                    />

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex-1 px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Go"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
