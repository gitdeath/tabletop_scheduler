"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, User, Calendar } from "lucide-react";
import { clsx } from "clsx";

/**
 * Global navigation bar.
 * Highlights current route and provides links to key pages.
 */
export function Navbar() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
            <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl text-slate-100 hover:text-indigo-400 transition-colors">
                    <Calendar className="w-6 h-6 text-indigo-500" />
                    <span>Tabletop<span className="text-indigo-500">Scheduler</span></span>
                </Link>

                <div className="flex items-center gap-1 md:gap-4">
                    <NavLink href="/" active={isActive('/')} icon={<Home className="w-4 h-4" />}>
                        Home
                    </NavLink>
                    <NavLink href="/new" active={isActive('/new')} icon={<PlusCircle className="w-4 h-4" />}>
                        New Event
                    </NavLink>
                    <NavLink href="/profile" active={isActive('/profile')} icon={<User className="w-4 h-4" />}>
                        My Events
                    </NavLink>
                </div>
            </div>
        </nav>
    );
}

function NavLink({ href, active, icon, children }: any) {
    return (
        <Link
            href={href}
            className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                active
                    ? "bg-indigo-500/10 text-indigo-400"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            )}
        >
            {icon}
            <span className="hidden md:inline">{children}</span>
        </Link>
    );
}
