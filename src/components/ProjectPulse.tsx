// Project drill-down "pulse" block — live operational state for one project.
// Additive: rendered at the top of /projects/[slug], above the existing briefing sections.
// Pure server component. Data from EF ?view=project.
import type { ProjectDetail } from "@/lib/api";
import { actionVerifierFlags, projectVerifierFlags } from "@/lib/verifier";
import VerifierIcons from "@/components/VerifierIcons";

function healthColor(h: number | null | undefined): string {
  if (h == null) return "text-slate-400";
  if (h >= 80) return "text-emerald-300";
  if (h >= 50) return "text-amber-300";
  return "text-red-400";
}
function scoreColor(s: number): string {
  if (s >= 80) return "text-emerald-300";
  if (s >= 50) return "text-amber-300";
  return "text-red-400";
}
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return String(iso).slice(0, 10);
}

export default function ProjectPulse({ detail }: { detail: ProjectDetail }) {
  const { tasks, actions, card } = detail;
  // Map the v2 card to the verifier's health shape; events_7d is the activity signal.
  const health = card
    ? {
        health_score: card.health_score ?? null,
        daily_active: (card.events_7d ?? card.daily_active) ?? null,
        last_activity: card.last_activity ?? null,
      }
    : null;
  const projFlags = projectVerifierFlags(health, card?.last_activity ?? null);

  const taskCells = tasks
    ? [
        { k: "pending", label: "ממתין", v: tasks.pending, c: "text-sky-300" },
        { k: "in_progress", label: "בעבודה", v: tasks.in_progress, c: "text-amber-300" },
        { k: "blocked", label: "חסום", v: tasks.blocked, c: "text-rose-300" },
        { k: "done", label: "הושלם", v: tasks.done, c: "text-emerald-300" },
        { k: "total", label: "סה״כ", v: tasks.total_tasks, c: "text-slate-200" },
        { k: "pct", label: "% השלמה", v: Math.round(tasks.avg_completion_pct), c: "text-slate-200" },
      ]
    : [];

  const facts = card
    ? [
        { label: "עלות חודשית", v: card.monthly_cost != null ? `$${card.monthly_cost}` : "—" },
        { label: "פעילות אחרונה", v: fmtDate(card.last_activity) },
        { label: "events 7d", v: card.events_7d ?? "—" },
        { label: "סיכונים פתוחים", v: card.open_risks ?? "—" },
        { label: "פיצ׳רים", v: `${card.features_shipped ?? "—"}✓ / ${card.features_missing ?? "—"}✗` },
        { label: "Supabase", v: card.supabase_project_id ?? "—" },
        { label: "תיקייה", v: card.folder_path ?? "—" },
        { label: "סטטוס", v: card.status ?? card.stage ?? "—" },
      ]
    : [];

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-100">🔥 דופק הפרויקט</h3>
        <div className="flex items-center gap-2">
          {card?.category && (
            <span className="rounded-full border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-xs text-slate-300">
              {card.category}
            </span>
          )}
          {card?.health_score != null && (
            <span dir="ltr" className={`font-mono text-sm ${healthColor(card.health_score)}`}>
              health {card.health_score}
            </span>
          )}
          <VerifierIcons flags={projFlags} />
        </div>
      </div>

      {taskCells.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
          {taskCells.map((s) => (
            <div key={s.k} className="rounded border border-slate-800 bg-slate-950/40 px-2 py-2 text-center">
              <div dir="ltr" className={`text-lg font-semibold tabular-nums ${s.c}`}>{s.v}</div>
              <div className="text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">
            🔥 מה בוער בפרויקט ({actions.length})
          </div>
          <ol className="space-y-2">
            {actions.map((a) => (
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
                <VerifierIcons flags={actionVerifierFlags(a)} />
                {a.priority && <span className="shrink-0 text-xs text-slate-400">{a.priority}</span>}
                <span dir="ltr" className="shrink-0 text-xs text-slate-500">
                  {Math.round(a.hours_old / 24)}d
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {facts.length > 0 && (
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-4">
          {facts.map((f, i) => (
            <div key={i} className="rounded border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-slate-500">{f.label}</div>
              <div dir="ltr" className="mt-0.5 truncate text-slate-200" title={String(f.v)}>
                {String(f.v)}
              </div>
            </div>
          ))}
          {card?.top_risk_title && (
            <div className="col-span-2 rounded border border-rose-500/30 bg-rose-500/5 px-3 py-2 lg:col-span-4">
              <div className="text-rose-400">סיכון מוביל</div>
              <div className="mt-0.5 text-rose-200">{card.top_risk_title}</div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
