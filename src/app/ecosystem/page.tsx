import Link from "next/link";
import {
  fetchEcosystem,
  type EcosystemAttention,
  type EcosystemDomainRow,
  type EcosystemProject,
  type EcosystemSummary,
} from "@/lib/api";

export const dynamic = "force-dynamic";

const TIER_COLORS: Record<string, string> = {
  flagship: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  autopilot: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  dormant: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  hands_off: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  concept: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  active: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  idea: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  paused: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  archived: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

const STATUS_ORDER: Record<string, number> = {
  live: 0,
  active: 1,
  idea: 2,
  paused: 3,
  archived: 4,
};

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${className || "border-slate-700 bg-slate-800/50 text-slate-300"}`}
    >
      {children}
    </span>
  );
}

function progressBarColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-slate-600";
}

function HeroStats({ s }: { s: EcosystemSummary }) {
  const stats = [
    { label: "Total Projects", value: s.total_projects, accent: "text-slate-100" },
    { label: "Live", value: s.live, accent: "text-emerald-300" },
    { label: "Active", value: s.active, accent: "text-sky-300" },
    { label: "With Blocker", value: s.with_blocker, accent: "text-rose-300" },
    { label: "Total Gems", value: s.total_gems, accent: "text-fuchsia-300" },
    { label: "Sessions", value: s.total_sessions, accent: "text-violet-300" },
    { label: "Decisions", value: s.total_decisions, accent: "text-amber-300" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {stats.map((st) => (
        <div
          key={st.label}
          className="rounded-lg border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4"
        >
          <div className="text-xs uppercase tracking-wider text-slate-500">{st.label}</div>
          <div
            dir="ltr"
            className={`mt-1 text-3xl font-semibold tabular-nums ${st.accent}`}
          >
            {st.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

function DomainBar({ row }: { row: EcosystemDomainRow }) {
  const pct = Math.max(0, Math.min(100, Math.round(row.avg_progress)));
  return (
    <div className="rounded border border-slate-800 bg-slate-950/30 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-100 truncate">{row.domain}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            <span dir="ltr">{row.count}</span> projects
          </div>
        </div>
        <span dir="ltr" className="font-mono text-sm text-slate-300">
          {pct}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
        <div
          dir="ltr"
          className={`h-full ${progressBarColor(pct)} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ByDomainSection({ rows }: { rows: EcosystemDomainRow[] }) {
  if (!rows || rows.length === 0) return null;
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">By Domain</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <DomainBar key={r.domain} row={r} />
        ))}
      </div>
    </section>
  );
}

function ProjectCard({ p }: { p: EcosystemProject }) {
  const tierClass =
    p.tier && TIER_COLORS[p.tier]
      ? TIER_COLORS[p.tier]
      : "bg-slate-500/15 text-slate-300 border-slate-500/30";
  const statusClass =
    STATUS_COLORS[p.status] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30";
  const pct = p.progress_pct ?? 0;
  return (
    <Link
      href={`/projects/${encodeURIComponent(p.slug)}`}
      className="block rounded-lg border border-slate-800 bg-slate-950/40 p-4 transition-colors hover:border-slate-600 hover:bg-slate-900/60"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-base font-semibold text-slate-100">{p.slug}</span>
        {p.tier && <Pill className={tierClass}>{p.tier}</Pill>}
        <Pill className={statusClass}>{p.status}</Pill>
        {p.hands_off && (
          <Pill className="border-rose-500/40 bg-rose-500/15 text-rose-300">🔒 locked</Pill>
        )}
        {p.domain && (
          <span className="text-xs text-slate-500">{p.domain}</span>
        )}
      </div>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-400">progress</span>
          <span dir="ltr" className="font-mono text-slate-300">
            {pct}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            dir="ltr"
            className={`h-full ${progressBarColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {p.current_focus && (
        <div className="mb-1 text-xs text-slate-400 line-clamp-1">
          <span className="text-slate-500">focus:</span> {p.current_focus}
        </div>
      )}
      {p.blocker && (
        <div className="mb-2 text-xs text-rose-300 line-clamp-1">
          <span className="text-rose-500">blocker:</span> {p.blocker}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>
          <span dir="ltr">{p.open_tasks}</span> open task{p.open_tasks === 1 ? "" : "s"}
        </span>
        <span className={p.has_mega ? "text-emerald-400" : "text-slate-600"}>
          MEGA {p.has_mega ? "✓" : "✗"}
        </span>
        <span className={p.has_preplan ? "text-emerald-400" : "text-slate-600"}>
          PREPLAN {p.has_preplan ? "✓" : "✗"}
        </span>
        <span>
          <span dir="ltr">{p.timeline_entries}</span> timeline
        </span>
      </div>
    </Link>
  );
}

function ProjectsGrid({ projects }: { projects: EcosystemProject[] }) {
  const sorted = [...projects].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 99;
    const sb = STATUS_ORDER[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    return (b.progress_pct ?? 0) - (a.progress_pct ?? 0);
  });
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-100 mb-4">
        Projects <span className="text-slate-500 text-sm font-normal">({sorted.length})</span>
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((p) => (
          <ProjectCard key={p.slug} p={p} />
        ))}
      </div>
    </section>
  );
}

function AttentionPanel({ items }: { items: EcosystemAttention[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
      <h2 className="text-lg font-semibold text-amber-200 mb-1">
        Attention Needed{" "}
        <span className="text-amber-400/60 text-sm font-normal">({items.length})</span>
      </h2>
      <p className="mb-4 text-xs text-amber-200/60">
        Projects flagged by the empire manager — review or unblock.
      </p>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li
            key={`${it.slug}-${i}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded border border-amber-500/20 bg-slate-950/40 px-3 py-2"
          >
            <Link
              href={`/projects/${encodeURIComponent(it.slug)}`}
              className="text-sm font-medium text-amber-100 hover:text-amber-50 underline-offset-2 hover:underline"
            >
              {it.slug}
            </Link>
            <span className="text-xs text-amber-200/80">{it.reason}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function EcosystemPage() {
  const eco = await fetchEcosystem();
  if (!eco) {
    return (
      <div className="rounded border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
        Failed to load ecosystem data. EF v9 may be down or X-Empire-Secret rejected.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Ecosystem</h1>
        <p className="mt-1 text-sm text-slate-400">
          Empire command center — generated at{" "}
          <span dir="ltr" className="font-mono text-slate-300">
            {eco.generated_at?.slice(0, 19).replace("T", " ") ?? "?"}
          </span>
        </p>
      </div>

      <HeroStats s={eco.summary} />
      <ByDomainSection rows={eco.by_domain ?? []} />
      <AttentionPanel items={eco.attention_needed ?? []} />
      <ProjectsGrid projects={eco.projects ?? []} />
    </div>
  );
}
