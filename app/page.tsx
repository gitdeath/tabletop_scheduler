import Link from "next/link";
import { Copy, PlusCircle, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-950 text-slate-50">
      <div className="relative flex flex-col place-items-center text-center">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl md:text-7xl bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          Tabletop Time
        </h1>
        <p className="mt-4 max-w-[600px] text-zinc-400 md:text-xl">
          Coordinate your D&D sessions, board game nights, and RPG campaigns without the group chat chaos.
        </p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/new"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold transition-all shadow-lg shadow-indigo-500/20"
          >
            <PlusCircle className="w-5 h-5" />
            Start Scheduling
          </Link>
          <a
            href="https://github.com/gitdeath/tabletop_scheduler"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold transition-all border border-slate-700"
          >
            GitHub
          </a>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl text-left">
        <FeatureCard
          icon={<Copy className="w-6 h-6 text-indigo-400" />}
          title="No Login Required"
          desc="Send a link. Your players vote. No accounts needed."
        />
        <FeatureCard
          icon={<ArrowRight className="w-6 h-6 text-indigo-400" />}
          title="Smart Resolution"
          desc="We find the slot where everyone (or at least quorum) can play."
        />
        <FeatureCard
          icon={<PlusCircle className="w-6 h-6 text-indigo-400" />}
          title="Self Hosted"
          desc="Your data stays with you. Privacy first."
        />
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="group rounded-lg border border-slate-800 bg-slate-900/50 p-5 hover:border-indigo-500/50 transition-colors">
      <div className="mb-3">{icon}</div>
      <h2 className="mb-2 font-semibold text-slate-200">{title}</h2>
      <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  )
}
