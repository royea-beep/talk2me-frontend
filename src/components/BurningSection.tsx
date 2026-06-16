// "מה בוער עכשיו" — daily-attention inbox. Sits above the Empire snapshot on /.
// Pure server component. Data comes pre-fetched from the burning EF view.
import type { BurningData, ProjectHealth } from "@/lib/api";
import { actionVerifierFlags } from "@/lib/verifier";
import VerifierIcons from "@/components/VerifierIcons";

const SEV = [
  { key: "critical", icon: "🔴", label: "קריטי" },
  { key: "high", icon: "🟠", label: "גבוה" },
  { key: "medium", icon: "🟡", label: "בינוני" },
] as const;

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-300";
  if (score >= 50) return "text-amber-300";
  return "text-red-400";
}

function missColor(pct: number): string {
  if (pct >= 50) return "text-red-400";
  if (pct > 0) return "text-amber-300";
  return "text-emerald-300";
}

export default function BurningSection({
  burning,
  health,
}: {
  burning: BurningData;
  health: Record<string, ProjectHealth>;
}) {
  const { top_actions, queue_size, attention, self_checks } = burning;
  const sev = self_checks?.firing_by_severity ?? { critical: 0, high: 0, medium: 0, low: 0 };
  const integrityTitle =
    (self_checks?.firing_rules ?? []).map((r) => `${r.severity}: ${r.rule} (${r.count})`).join("\n") ||
    "אין כללים בוערים";

  return (
    <section className="mb-8 rounded-lg border border-slate-800 bg-slate-950/40 p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold text-slate-100">🔥 מה בוער עכשיו</h2>
        <span className="text-xs text-slate-500">
          <span dir="ltr">{queue_size}</span> פעולות בתור · מציג top {top_actions.length}
        </span>
      </div>

      <ol className="space-y-2">
        {top_actions.map((a) => {
          const flags = actionVerifierFlags(a, a.project ? health[a.project] : null);
          return (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded border border-slate-800 bg-slate-900/40 px-3 py-2"
            >
              <span dir="ltr" className={`font-mono text-sm tabular-nums ${scoreColor(a.score)}`}>
                {a.score}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-100" title={a.title}>
                {a.title}
              </span>
              <VerifierIcons flags={flags} />
              {a.project && (
                <span className="shrink-0 rounded-full border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-xs text-slate-300">
                  {a.project}
                </span>
              )}
              <span dir="ltr" className="shrink-0 text-xs text-slate-500">
                {Math.round(a.hours_old / 24)}d
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {attention?.most_problematic_projects?.slice(0, 4).map((p) => (
          <span
            key={p.project}
            className="rounded border border-slate-800 bg-slate-900/40 px-2 py-1 text-xs text-slate-300"
          >
            {p.project}{" "}
            <span dir="ltr" className={missColor(p.miss_rate_pct)}>
              {p.miss_rate_pct}%
            </span>{" "}
            כשל
          </span>
        ))}
        {attention && attention.frustration_events > 0 && (
          <span className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-300">
            😤 <span dir="ltr">{attention.frustration_events}</span> תסכול
          </span>
        )}

        <span
          title={integrityTitle}
          className="ms-auto inline-flex cursor-help items-center gap-3 rounded border border-slate-800 bg-slate-900/40 px-3 py-1 text-xs"
        >
          <span className="text-slate-400">תקינות מערכת:</span>
          {SEV.map((s) => {
            const n = sev[s.key] ?? 0;
            return (
              <span key={s.key} dir="ltr" className={n > 0 ? "text-slate-100" : "text-slate-600"}>
                {s.icon} {n}
              </span>
            );
          })}
        </span>
      </div>
    </section>
  );
}
