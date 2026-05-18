import Link from "next/link";
import { fetchCount, type Table } from "@/lib/api";

export const dynamic = "force-dynamic";

const CARDS: Array<{ table: Table; label: string; href: string; tone: string }> = [
  { table: "project_pipeline", label: "Projects",   href: "/projects",  tone: "from-emerald-500/20 to-emerald-500/5" },
  { table: "gprompt_registry", label: "G-PROMPTs",  href: "/gprompts",  tone: "from-sky-500/20 to-sky-500/5" },
  { table: "knowledge_vault",  label: "Knowledge",  href: "/knowledge", tone: "from-fuchsia-500/20 to-fuchsia-500/5" },
  { table: "zpm_sessions",     label: "Sessions",   href: "/sessions",  tone: "from-amber-500/20 to-amber-500/5" },
];

export default async function Home() {
  const counts = await Promise.all(
    CARDS.map(async (c) => {
      try {
        return { ...c, count: await fetchCount(c.table), error: null as string | null };
      } catch (e) {
        return { ...c, count: null as number | null, error: String(e) };
      }
    }),
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-100">Empire snapshot</h2>
        <p className="text-sm text-slate-400 mt-1">
          All counts read via <code className="text-slate-300">frontend_dashboard_data</code> Edge Function. No direct backend reads.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {counts.map((c) => (
          <Link
            key={c.table}
            href={c.href}
            className={`group block rounded-lg border border-slate-800 bg-gradient-to-br ${c.tone} p-5 hover:border-slate-600 transition-colors`}
          >
            <div className="text-xs uppercase tracking-wider text-slate-400">{c.label}</div>
            <div className="mt-2 text-4xl font-semibold text-slate-100">
              {c.count === null ? <span className="text-red-400 text-lg">error</span> : c.count.toLocaleString()}
            </div>
            <div className="mt-3 text-xs text-slate-500 group-hover:text-slate-400">View list &rarr;</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
