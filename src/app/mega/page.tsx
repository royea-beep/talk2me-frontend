"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  fetchMegaView,
  fetchTasksView,
  type BlockedTask,
  type DoneTask,
  type MegaDashboard,
  type MegaProject,
  type MegaResponse,
  type MegaSecret,
  type MegaSummary,
  type PendingTask,
  type RunningTask,
  type TaskPriority,
  type TasksResponse,
  type TasksSummary,
} from "@/lib/api";

const REFRESH_MS = 60_000;

export default function MegaPage() {
  const [data, setData] = useState<MegaResponse | null>(null);
  const [tasks, setTasks] = useState<TasksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    try {
      const [megaResp, tasksResp] = await Promise.all([
        fetchMegaView(controller.signal),
        fetchTasksView(controller.signal),
      ]);
      setData(megaResp);
      setTasks(tasksResp);
      setLastFetched(new Date());
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">MEGA Dashboard</h2>
          <p className="text-sm text-slate-400 mt-1">
            Empire-wide roll-up - auto-refresh every 60s
          </p>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-3">
          {lastFetched && (
            <span>
              updated {Math.max(0, Math.round((now - lastFetched.getTime()) / 1000))}s ago
            </span>
          )}
          <button
            onClick={load}
            className="rounded border border-slate-700 px-3 py-1 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Refresh
          </button>
        </div>
      </header>

      {error && <ErrorCard message={error} onRetry={load} />}

      {!data && loading && !error && <LoadingSkeleton />}

      {data && (
        <>
          <SummaryStrip summary={data.summary} />
          <ProjectsGrid projects={data.projects} />
          {tasks && <TasksSection tasks={tasks} />}
          <DashboardsOfDashboards
            dashboards={data.dashboards}
            projects={data.projects}
          />
          <SecretsStrip secrets={data.secrets_expiring} />
        </>
      )}
    </div>
  );
}

interface SummaryStripProps {
  summary: MegaSummary;
}

function SummaryStrip({ summary }: SummaryStripProps) {
  const cards: Array<{
    label: string;
    value: number;
    tone: string;
    loud?: boolean;
  }> = [
    { label: "Total Projects", value: summary.total_projects, tone: "text-slate-100" },
    { label: "Healthy", value: summary.healthy, tone: "text-emerald-400" },
    { label: "Degraded", value: summary.degraded, tone: "text-amber-400" },
    { label: "Unknown", value: summary.unknown_health, tone: "text-slate-400" },
    { label: "Blocked", value: summary.blocked, tone: "text-red-400" },
    {
      label: "Anti-Fragility Flags",
      value: summary.anti_fragility_flags,
      tone: summary.anti_fragility_flags > 0 ? "text-red-400" : "text-slate-300",
      loud: summary.anti_fragility_flags > 0,
    },
    { label: "Dashboards", value: summary.dashboards_cataloged, tone: "text-sky-400" },
    {
      label: "Secrets Expiring",
      value: summary.secrets_expiring_30d,
      tone: summary.secrets_expiring_30d > 0 ? "text-red-400" : "text-slate-300",
      loud: summary.secrets_expiring_30d > 0,
    },
  ];
  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
        Empire Summary
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-lg border p-3 bg-slate-950/60 ${
              c.loud
                ? "border-red-500/60 shadow-[0_0_0_1px_rgba(239,68,68,0.25)]"
                : "border-slate-800"
            }`}
          >
            <div className={`text-3xl font-semibold tabular-nums ${c.tone}`}>
              {c.value.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">
              {c.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

interface ProjectsGridProps {
  projects: MegaProject[];
}

function ProjectsGrid({ projects }: ProjectsGridProps) {
  const sorted = useMemo(() => {
    const urgency = (p: MegaProject): number => {
      let score = 0;
      if (p.current_blocker) score -= 1000;
      if (p.missing_live_state) score -= 500;
      if (p.missing_heartbeat || p.heartbeat_stale) score -= 250;
      score += p.health_score ?? 100;
      return score;
    };
    return [...projects].sort((a, b) => {
      const ta = a.tier ?? 999;
      const tb = b.tier ?? 999;
      if (ta !== tb) return ta - tb;
      const ua = urgency(a);
      const ub = urgency(b);
      if (ua !== ub) return ua - ub;
      return a.slug.localeCompare(b.slug);
    });
  }, [projects]);
  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
        Projects ({projects.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((p) => (
          <ProjectCard key={p.slug} project={p} />
        ))}
      </div>
    </section>
  );
}

function ProjectCard({ project: p }: { project: MegaProject }) {
  const hasFlag = p.missing_live_state || p.missing_heartbeat || p.heartbeat_stale;
  const borderColor = p.hands_off
    ? "border-slate-800"
    : p.missing_live_state
    ? "border-red-500/70"
    : p.missing_heartbeat || p.heartbeat_stale
    ? "border-orange-500/70"
    : "border-slate-800";
  const healthColor =
    p.health_score === null
      ? "bg-slate-600"
      : p.health_score >= 80
      ? "bg-emerald-500"
      : "bg-amber-500";
  const muted = p.hands_off ? "opacity-70 border-l-4 border-l-slate-600" : "";
  const heartbeatDot =
    p.heartbeat_status === "healthy" && !p.heartbeat_stale
      ? "bg-emerald-500"
      : p.heartbeat_status
      ? "bg-red-500"
      : "bg-slate-600";

  return (
    <div className={`rounded-lg border ${borderColor} bg-slate-950/60 ${muted} flex flex-col`}>
      <div className="p-4 flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${healthColor}`} />
            <span className="font-semibold text-slate-100 truncate">{p.slug}</span>
            {p.tier_label && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-700 text-slate-300">
                {p.tier_label}
              </span>
            )}
          </div>
          <span className={`inline-block h-2 w-2 rounded-full ${heartbeatDot}`} title="heartbeat" />
        </div>

        {p.display_name && (
          <div className="text-xs text-slate-400 truncate mb-2" title={p.display_name}>
            {p.display_name}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-2">
          {p.hands_off && (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              HANDS OFF
            </span>
          )}
          {hasFlag && (
            <>
              {p.missing_live_state && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/60">
                  NO STATE
                </span>
              )}
              {p.missing_heartbeat && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/60">
                  NO HEARTBEAT
                </span>
              )}
              {p.heartbeat_stale && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/60">
                  STALE
                </span>
              )}
            </>
          )}
          {p.manager_slug && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
              {p.manager_slug}
            </span>
          )}
          {p.stage && (() => {
            const isEarly = p.stage === "idea" || p.stage === "concept";
            return (
              <span
                className={
                  isEarly
                    ? "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/60 border-dashed"
                    : "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800"
                }
                title={isEarly ? "Early-stage project — amber health is expected here" : (p.stage ?? undefined)}
              >
                {isEarly ? p.stage + " · early" : p.stage}
              </span>
            );
          })()}
        </div>

        {p.current_focus && (
          <p
            className="text-xs text-slate-300 mb-3 overflow-hidden"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
            title={p.current_focus}
          >
            {p.current_focus}
          </p>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-auto">
          {p.db_tables_count !== null && (
            <span title="db tables">tables {p.db_tables_count}</span>
          )}
          {p.db_crons_count !== null && (
            <span title="db crons">crons {p.db_crons_count}</span>
          )}
          {p.db_edge_functions_count !== null && (
            <span title="edge functions">efs {p.db_edge_functions_count}</span>
          )}
          {p.pipeline_step !== null && (
            <span title="pipeline step">step {p.pipeline_step}</span>
          )}
          {p.last_simulation_score !== null && (
            <span title="last simulation score">
              sim {p.last_simulation_score.toFixed(1)}
            </span>
          )}
          {p.live_state_updated_at && (
            <span title={p.live_state_updated_at}>
              {relativeTime(p.live_state_updated_at)}
            </span>
          )}
        </div>
      </div>

      {p.current_blocker && (
        <div className="bg-red-500/15 border-t border-red-500/40 px-4 py-2 text-xs text-red-200">
          <span className="font-semibold mr-1">BLOCKER:</span>
          {p.current_blocker}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tasks Section — bot_tasks queue snapshot (Hebrew RTL).
// ---------------------------------------------------------------------------

interface TasksSectionProps {
  tasks: TasksResponse;
}

function TasksSection({ tasks }: TasksSectionProps) {
  return (
    <section dir="rtl" className="space-y-4">
      <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
        תור משימות / Tasks Queue
      </h3>
      <TasksSummaryStrip summary={tasks.summary} />
      <TasksRunningStrip running={tasks.running} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TasksPendingTable pending={tasks.pending} />
        </div>
        <div className="space-y-4">
          <TasksDoneList done={tasks.done_recent} />
          <TasksBlockedList blocked={tasks.blocked} />
        </div>
      </div>
    </section>
  );
}

function TasksSummaryStrip({ summary }: { summary: TasksSummary }) {
  const cards: Array<{ label: string; value: number; tone: string; loud?: boolean }> = [
    { label: "ממתין", value: summary.pending, tone: "text-slate-100" },
    {
      label: "P0",
      value: summary.p0,
      tone: summary.p0 > 0 ? "text-red-400" : "text-slate-400",
      loud: summary.p0 > 0,
    },
    {
      label: "High",
      value: summary.high,
      tone: summary.high > 0 ? "text-amber-400" : "text-slate-400",
    },
    { label: "רץ עכשיו", value: summary.running, tone: "text-sky-400" },
    { label: "חסום", value: summary.blocked, tone: "text-orange-400" },
    { label: "הושלמו (15)", value: summary.done_recent, tone: "text-emerald-400" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={"rounded-lg border p-3 bg-slate-950/60 " + (c.loud ? "border-red-500/60 shadow-[0_0_0_1px_rgba(239,68,68,0.25)]" : "border-slate-800")}
        >
          <div className={"text-3xl font-semibold tabular-nums " + c.tone}>
            {c.value.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function TasksRunningStrip({ running }: { running: RunningTask[] }) {
  if (running.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2 text-xs text-slate-500">
        אף משימה לא רצה כרגע
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-sky-700/50 bg-sky-950/30 divide-y divide-sky-800/40">
      {running.map((t) => (
        <div key={t.id} className="px-4 py-2 text-xs flex items-center gap-3 flex-wrap">
          <span className="inline-block h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-sky-200 font-semibold">רץ</span>
          <PriorityBadge priority={t.priority} />
          {t.project_name && <ProjectBadge name={t.project_name} />}
          <span className="text-slate-200 flex-1 min-w-0 truncate" title={t.title}>
            {t.title}
          </span>
          {t.started_at && (
            <span className="text-slate-500" title={t.started_at}>
              {relativeTime(t.started_at)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function TasksPendingTable({ pending }: { pending: PendingTask[] }) {
  const top = pending.slice(0, 15);
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-slate-400">
          ממתינות ({pending.length})
        </span>
        {pending.length > top.length && (
          <span className="text-[11px] text-slate-500">
            מציג {top.length} מתוך {pending.length}
          </span>
        )}
      </div>
      {top.length === 0 ? (
        <div className="px-4 py-6 text-xs text-slate-500 text-center">
          התור ריק 🎉
        </div>
      ) : (
        <ul className="divide-y divide-slate-800">
          {top.map((t) => (
            <li key={t.id} className="px-4 py-2 text-xs flex items-center gap-3 flex-wrap">
              <PriorityBadge priority={t.priority} />
              {t.project_name && <ProjectBadge name={t.project_name} />}
              <span className="text-slate-200 flex-1 min-w-0 truncate" title={t.title}>
                {t.title}
              </span>
              {t.assigned_to && (
                <span className="text-[10px] text-slate-500" title={"assigned to " + t.assigned_to}>
                  {t.assigned_to.replace("claude_", "")}
                </span>
              )}
              <span className="text-slate-500" title={t.created_at}>
                {relativeTime(t.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TasksDoneList({ done }: { done: DoneTask[] }) {
  return (
    <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/15 overflow-hidden">
      <div className="px-4 py-2 border-b border-emerald-800/40">
        <span className="text-xs uppercase tracking-wider text-emerald-400">
          הושלמו לאחרונה ({done.length})
        </span>
      </div>
      {done.length === 0 ? (
        <div className="px-4 py-4 text-xs text-slate-500 text-center">—</div>
      ) : (
        <ul className="divide-y divide-emerald-900/30">
          {done.map((t) => (
            <li key={t.id} className="px-4 py-2 text-xs flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 truncate" title={t.title}>
                  {t.title}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                  {t.project_name && <span>{t.project_name}</span>}
                  {t.completed_at && <span>· {relativeTime(t.completed_at)}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TasksBlockedList({ blocked }: { blocked: BlockedTask[] }) {
  return (
    <div className="rounded-lg border border-orange-800/50 bg-orange-950/15 overflow-hidden">
      <div className="px-4 py-2 border-b border-orange-800/40">
        <span className="text-xs uppercase tracking-wider text-orange-400">
          חסומות ({blocked.length})
        </span>
      </div>
      {blocked.length === 0 ? (
        <div className="px-4 py-4 text-xs text-slate-500 text-center">אין חסומות</div>
      ) : (
        <ul className="divide-y divide-orange-900/30">
          {blocked.map((t) => (
            <li key={t.id} className="px-4 py-2 text-xs flex items-start gap-2">
              <span className="text-orange-400 mt-0.5">⊘</span>
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 truncate" title={t.title}>
                  {t.title}
                </div>
                {t.project_name && (
                  <div className="text-[10px] text-slate-500 mt-0.5">{t.project_name}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const cls =
    priority === "p0"
      ? "bg-red-900/50 text-red-300 border-red-700/60"
      : priority === "high"
      ? "bg-amber-900/40 text-amber-300 border-amber-700/50"
      : priority === "normal"
      ? "bg-slate-800 text-slate-300 border-slate-700"
      : "bg-slate-900 text-slate-500 border-slate-800";
  return (
    <span
      className={"inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border " + cls}
    >
      {priority}
    </span>
  );
}

function ProjectBadge({ name }: { name: string }) {
  return (
    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
      {name}
    </span>
  );
}

interface DashboardsOfDashboardsProps {
  dashboards: MegaDashboard[];
  projects: MegaProject[];
}

function DashboardsOfDashboards({
  dashboards,
  projects,
}: DashboardsOfDashboardsProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, MegaDashboard[]>();
    for (const d of dashboards) {
      const list = map.get(d.project_slug) ?? [];
      list.push(d);
      map.set(d.project_slug, list);
    }
    return projects
      .map((p) => ({ slug: p.slug, items: map.get(p.slug) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [dashboards, projects]);

  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
        Dashboards of Dashboards ({dashboards.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grouped.map((g) => (
          <div
            key={g.slug}
            className="rounded-lg border border-slate-800 bg-slate-950/60 p-4"
          >
            <div className="font-semibold text-slate-100 text-sm mb-2">{g.slug}</div>
            <ul className="space-y-1.5">
              {g.items.map((d, i) => (
                <li
                  key={d.project_slug + "-" + d.dashboard_name + "-" + i}
                  className="text-xs"
                >
                  {d.url ? (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300 hover:underline"
                    >
                      {d.dashboard_name}
                    </a>
                  ) : (
                    <span className="text-slate-300">{d.dashboard_name}</span>
                  )}
                  <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                    {d.host_type && <Badge>{d.host_type}</Badge>}
                    {d.tech_stack && <Badge>{d.tech_stack}</Badge>}
                    {d.status && (
                      <Badge
                        tone={
                          d.status === "live"
                            ? "green"
                            : d.status === "down" || d.status === "broken"
                            ? "red"
                            : "neutral"
                        }
                      >
                        {d.status}
                      </Badge>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

interface SecretsStripProps {
  secrets: MegaSecret[];
}

function SecretsStrip({ secrets }: SecretsStripProps) {
  if (secrets.length === 0) {
    return (
      <section>
        <div className="rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-4 py-2 text-xs text-emerald-300">
          No secrets expiring in 30 days
        </div>
      </section>
    );
  }
  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
        Secrets Expiring ({secrets.length})
      </h3>
      <div className="rounded-lg border border-amber-600/60 bg-amber-900/20 divide-y divide-amber-700/40">
        {secrets.map((s, i) => (
          <div
            key={s.project_slug + "-" + s.secret_name + "-" + i}
            className="px-4 py-2 text-xs text-amber-200 flex flex-wrap gap-x-2 gap-y-1"
          >
            <span className="font-semibold">{s.project_slug}</span>
            <span aria-hidden>·</span>
            <span>{s.secret_name}</span>
            {s.secret_kind && (
              <>
                <span aria-hidden>·</span>
                <span className="text-amber-300/80">{s.secret_kind}</span>
              </>
            )}
            {s.expires_at && (
              <>
                <span aria-hidden>·</span>
                <span>expires {s.expires_at}</span>
              </>
            )}
            {s.rotation_method && (
              <>
                <span aria-hidden>·</span>
                <span className="text-amber-300/70">via {s.rotation_method}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "red";
}) {
  const cls =
    tone === "green"
      ? "bg-emerald-900/40 text-emerald-300 border-emerald-700/50"
      : tone === "red"
      ? "bg-red-900/40 text-red-300 border-red-700/50"
      : "bg-slate-800 text-slate-400 border-slate-700";
  return (
    <span
      className={"inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border " + cls}
    >
      {children}
    </span>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-500/60 bg-red-900/20 p-4">
      <div className="font-semibold text-red-200 mb-1">Failed to load mega view</div>
      <div className="text-xs text-red-300/80 mb-3 break-all">{message}</div>
      <button
        onClick={onRetry}
        className="rounded border border-red-500/60 px-3 py-1 text-sm text-red-200 hover:bg-red-900/40 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-lg border border-slate-800 bg-slate-950/60 animate-pulse"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-lg border border-slate-800 bg-slate-950/60 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return diffSec + "s ago";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return diffMin + "m ago";
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 48) return diffHr + "h ago";
  const diffDay = Math.round(diffHr / 24);
  return diffDay + "d ago";
}
