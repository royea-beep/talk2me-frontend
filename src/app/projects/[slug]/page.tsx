import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchBriefing,
  fetchTimeline,
  type Briefing,
  type BriefingConnection,
  type BriefingGem,
  type BriefingSkill,
  type BriefingStage,
  type BriefingTask,
  type ProjectTimeline,
  type TimelineEntry,
} from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { slug: string };

interface PageProps {
  params: Promise<Params>;
}

const TIER_COLORS: Record<string, string> = {
  flagship: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  autopilot: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  dormant: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  hands_off: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  concept: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
};

const READINESS_COLORS: Record<string, string> = {
  complete: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  ready: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  in_progress: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  needs_work: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  draft: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  high: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  normal: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  low: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

function isUrl(s: string | null | undefined): s is string {
  if (!s) return false;
  return s.startsWith("http://") || s.startsWith("https://");
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${className || "border-slate-700 bg-slate-800/50 text-slate-300"}`}
    >
      {children}
    </span>
  );
}

function SectionCard({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function IdentitySection({ slug, identity }: { slug: string; identity: Briefing["identity"] }) {
  const tier = identity.tier ?? "unknown";
  const tierClass = TIER_COLORS[tier] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30";
  return (
    <section className="rounded-lg border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-slate-100">{slug}</h1>
        <Pill className={tierClass}>{tier}</Pill>
        {identity.domain && (
          <span className="text-sm text-slate-400">{identity.domain}</span>
        )}
        {identity.work_order_type && (
          <Pill>type: {identity.work_order_type}</Pill>
        )}
      </div>

      {identity.surfaces.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {identity.surfaces.map((s) => (
            <Pill key={s} className="border-indigo-500/30 bg-indigo-500/15 text-indigo-300">
              {s}
            </Pill>
          ))}
        </div>
      )}

      {identity.hands_off && (
        <div className="mb-4 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          ⚠ HANDS-OFF — do not touch without explicit Roye directive.
        </div>
      )}

      {identity.deploy_target && (
        <div className="mb-4 text-sm">
          <span className="text-slate-400">Deploy: </span>
          {isUrl(identity.deploy_target) ? (
            <a
              href={identity.deploy_target}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-300 hover:text-sky-200 underline"
            >
              {identity.deploy_target}
            </a>
          ) : (
            <span className="text-slate-300">{identity.deploy_target}</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">Last focus</div>
          <div className="mt-1 text-sm text-slate-200">{identity.last_focus ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">Last blocker</div>
          <div
            className={`mt-1 text-sm ${identity.last_blocker ? "text-rose-300" : "text-slate-500"}`}
          >
            {identity.last_blocker ?? "—"}
          </div>
        </div>
      </div>

      {identity.last_work && (
        <div className="mt-4 text-xs text-slate-400 whitespace-pre-wrap">{identity.last_work}</div>
      )}
    </section>
  );
}

function WorkOrderSection({ wo }: { wo: Briefing["work_order"] }) {
  const stages = wo.stages ?? [];
  const total = wo.total_stages ?? stages.length;
  const current = wo.current_step ?? 0;
  return (
    <SectionCard
      title={`Work Order — ${total} stages`}
      right={wo.status ? <Pill>{wo.status}</Pill> : null}
    >
      {stages.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1">
          {stages.map((s: BriefingStage) => {
            const isActive = s.num <= current;
            const isCurrent = s.is_current || s.num === current;
            return (
              <div
                key={s.num}
                className={`h-2 flex-1 min-w-[20px] rounded-full ${
                  isCurrent
                    ? "bg-amber-400"
                    : isActive
                      ? "bg-emerald-500"
                      : "bg-slate-800"
                }`}
                title={`${s.num}. ${s.name}`}
              />
            );
          })}
        </div>
      )}
      <ol className="space-y-2">
        {stages.map((s: BriefingStage) => {
          const isCurrent = s.is_current || s.num === current;
          return (
            <li
              key={s.num}
              className={`flex items-start justify-between gap-3 rounded border px-3 py-2 ${
                isCurrent
                  ? "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/30"
                  : "border-slate-800 bg-slate-950/30"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-100">
                  <span className="mr-2 text-slate-500">{s.num}.</span>
                  {s.name}
                </div>
                {s.description && (
                  <div className="mt-0.5 text-xs text-slate-400">{s.description}</div>
                )}
              </div>
              <div className="shrink-0 text-sm font-mono text-slate-300">
                {s.score ?? "—"}
              </div>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}

function PreplanSection({ preplan }: { preplan: Briefing["preplan"] }) {
  if (!preplan || preplan.exists === false) {
    return (
      <SectionCard title="PREPLAN">
        <div className="rounded border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
          No PREPLAN yet — populate via empire_sync or chat with Strategic AI.
        </div>
      </SectionCard>
    );
  }
  const readiness = preplan.readiness ?? "unknown";
  const readinessClass =
    READINESS_COLORS[readiness] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30";
  const params = preplan.parameters ?? {};
  const paramEntries = Object.entries(params).filter(([, v]) => v != null);
  const tags = preplan.tags ?? [];

  return (
    <SectionCard
      title="PREPLAN"
      right={<Pill className={readinessClass}>{readiness}</Pill>}
    >
      <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-500">
        {preplan.bible_version && <span>bible: {preplan.bible_version}</span>}
        {preplan.brief_version && <span>brief: {preplan.brief_version}</span>}
      </div>
      {paramEntries.length > 0 && (
        <div className="mb-4 overflow-hidden rounded border border-slate-800">
          <table className="w-full text-sm">
            <tbody>
              {paramEntries.map(([k, v]) => (
                <tr key={k} className="border-b border-slate-800 last:border-0">
                  <td className="bg-slate-950/40 px-3 py-1.5 text-xs uppercase tracking-wider text-slate-400 align-top w-1/3">
                    {k}
                  </td>
                  <td className="px-3 py-1.5 text-slate-200 whitespace-pre-wrap break-all">
                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Pill key={t}>{t}</Pill>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function SkillItem({ skill }: { skill: BriefingSkill }) {
  return (
    <li className="rounded border border-slate-800 bg-slate-950/30 px-3 py-2">
      <div className="text-sm font-medium text-slate-100">{skill.name}</div>
      {skill.description && (
        <div className="mt-0.5 text-xs text-slate-400 line-clamp-2">{skill.description}</div>
      )}
    </li>
  );
}

function SkillsSection({ skills }: { skills: Briefing["skills"] }) {
  const active = skills.active ?? [];
  const dormant = skills.dormant ?? [];
  const grouped = active.reduce<Record<string, BriefingSkill[]>>((acc, s) => {
    const cat = s.category ?? "other";
    (acc[cat] ??= []).push(s);
    return acc;
  }, {});

  return (
    <SectionCard
      title="Skills"
      right={
        <span className="text-xs text-slate-400">
          {skills.active_count} active, {skills.dormant_count} dormant
        </span>
      }
    >
      {skills.active_count === 0 ? (
        <div className="text-sm text-slate-500">—</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">{cat}</div>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {items.map((s) => (
                  <SkillItem key={s.name} skill={s} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {dormant.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-300">
            Dormant ({dormant.length})
          </summary>
          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {dormant.map((s) => (
              <SkillItem key={s.name} skill={s} />
            ))}
          </ul>
        </details>
      )}
    </SectionCard>
  );
}

function ConnectionItem({
  conn,
  side,
}: {
  conn: BriefingConnection;
  side: "incoming" | "outgoing";
}) {
  const label = side === "outgoing" ? conn.target ?? "?" : conn.source ?? "?";
  return (
    <li className="flex items-start gap-2 rounded border border-slate-800 bg-slate-950/30 px-3 py-2">
      <span
        className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${conn.is_active ? "bg-emerald-400" : "bg-slate-600"}`}
        aria-label={conn.is_active ? "active" : "inactive"}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-100">{label}</div>
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          {conn.type && <Pill>{conn.type}</Pill>}
          {conn.mechanism && (
            <span className="text-xs text-slate-400">{conn.mechanism}</span>
          )}
        </div>
      </div>
    </li>
  );
}

function ConnectionsSection({ connections }: { connections: Briefing["connections"] }) {
  const outgoing = connections.outgoing ?? [];
  const incoming = connections.incoming ?? [];
  if (outgoing.length === 0 && incoming.length === 0) {
    return (
      <SectionCard title="Connections">
        <div className="text-sm text-slate-500">No connections registered</div>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Connections">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">
            Outgoing ({outgoing.length})
          </div>
          {outgoing.length > 0 ? (
            <ul className="space-y-2">
              {outgoing.map((c, i) => (
                <ConnectionItem key={`${c.target ?? "?"}-${i}`} conn={c} side="outgoing" />
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-500">—</div>
          )}
        </div>
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">
            Incoming ({incoming.length})
          </div>
          {incoming.length > 0 ? (
            <ul className="space-y-2">
              {incoming.map((c, i) => (
                <ConnectionItem key={`${c.source ?? "?"}-${i}`} conn={c} side="incoming" />
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-500">—</div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function RecentContextSection({ rc }: { rc: Briefing["recent_context"] }) {
  const gems: BriefingGem[] = rc.recent_gems ?? [];
  const tasks: BriefingTask[] = rc.open_tasks ?? [];
  const sessions = rc.historical_sessions ?? 0;
  if (gems.length === 0 && tasks.length === 0 && sessions === 0) {
    return null;
  }
  return (
    <SectionCard title="Recent Context">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">
            Recent Gems ({gems.length})
          </div>
          {gems.length > 0 ? (
            <ul className="space-y-2">
              {gems.slice(0, 10).map((g, i) => (
                <li
                  key={`${g.title}-${i}`}
                  className="rounded border border-slate-800 bg-slate-950/30 px-3 py-2"
                >
                  <div className="text-sm text-slate-100 line-clamp-2">{g.title}</div>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-500">
                    {g.category && <Pill>{g.category}</Pill>}
                    {g.created && <span>{g.created}</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-500">—</div>
          )}
        </div>
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">
            Open Tasks ({tasks.length})
          </div>
          {tasks.length > 0 ? (
            <ul className="space-y-2">
              {tasks.map((t, i) => {
                const prClass =
                  PRIORITY_COLORS[t.priority ?? "normal"] ??
                  "bg-slate-500/15 text-slate-300 border-slate-500/30";
                return (
                  <li
                    key={`${t.title}-${i}`}
                    className="rounded border border-slate-800 bg-slate-950/30 px-3 py-2"
                  >
                    <div className="text-sm text-slate-100 line-clamp-2">{t.title}</div>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs">
                      {t.priority && <Pill className={prClass}>{t.priority}</Pill>}
                      {t.age_days != null && (
                        <span className="text-slate-500">{t.age_days}d old</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-sm text-slate-500">—</div>
          )}
        </div>
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">
            Historical Sessions
          </div>
          <div className="text-3xl font-semibold text-slate-100">
            {sessions.toLocaleString()}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

const ACTOR_COLORS: Record<string, string> = {
  roye: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "strategic-ai": "bg-sky-500/15 text-sky-300 border-sky-500/30",
  claude_code: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  manager: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  system: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

function isTruthy(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === "string") return v.toLowerCase() === "true";
  return false;
}

function formatWhen(iso: string): string {
  // Render as "YYYY-MM-DD HH:MM" — locale-safe and RTL-friendly.
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TimelineItem({ entry }: { entry: TimelineEntry }) {
  const actor = entry.actor ?? "system";
  const actorClass =
    ACTOR_COLORS[actor] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30";
  const isDecision = isTruthy(entry.is_decision) || entry.type === "decision";
  const icon = isDecision ? "◆" : "●";
  const title = entry.title ?? entry.summary ?? "(no title)";
  return (
    <li
      className={`relative rounded border bg-slate-950/30 px-4 py-3 ${
        isDecision
          ? "border-amber-500/40 ring-1 ring-amber-500/20"
          : "border-slate-800"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-base ${isDecision ? "text-amber-400" : "text-slate-500"}`}
            aria-hidden
          >
            {icon}
          </span>
          <Pill className={actorClass}>{actor}</Pill>
          {entry.type && entry.type !== "decision" && <Pill>{entry.type}</Pill>}
          {entry.vamos_number != null && (
            <Pill className="border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-300">
              VAMOS {entry.vamos_number}
            </Pill>
          )}
        </div>
        <span
          dir="ltr"
          className="font-mono text-xs text-slate-500"
        >
          {formatWhen(entry.when)}
        </span>
      </div>
      <div className="text-sm font-medium text-slate-100 line-clamp-2">{title}</div>
      {entry.summary && entry.summary !== entry.title && (
        <div className="mt-1 text-xs text-slate-400 line-clamp-2">{entry.summary}</div>
      )}
      {isDecision && entry.decision_text && entry.decision_text !== entry.title && (
        <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/90 line-clamp-3">
          {entry.decision_text}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        {entry.chat_url && (
          <a
            href={entry.chat_url}
            target="_blank"
            rel="noopener noreferrer"
            dir="ltr"
            className="text-sky-300 hover:text-sky-200 underline underline-offset-2"
          >
            פתח שיחה מקורית ↗
          </a>
        )}
        {entry.commit_hash && (
          <span
            dir="ltr"
            className="font-mono text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded px-2 py-0.5"
          >
            {entry.commit_hash.slice(0, 10)}
          </span>
        )}
      </div>
    </li>
  );
}

function TimelineSection({ timeline }: { timeline: ProjectTimeline | null }) {
  if (!timeline || (timeline.timeline ?? []).length === 0) {
    return (
      <SectionCard title="Conversation Timeline">
        <div className="rounded border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
          אין עדיין היסטוריית שיחות לפרויקט הזה
        </div>
      </SectionCard>
    );
  }
  const dr = timeline.date_range ?? {};
  const range =
    dr.earliest && dr.latest
      ? `${formatWhen(dr.earliest)} → ${formatWhen(dr.latest)}`
      : null;
  return (
    <SectionCard
      title="Conversation Timeline"
      right={
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <Pill>{timeline.total_entries} entries</Pill>
          <Pill className="border-amber-500/30 bg-amber-500/15 text-amber-300">
            {timeline.decisions_count} decisions
          </Pill>
          {range && (
            <span dir="ltr" className="font-mono text-xs text-slate-500">
              {range}
            </span>
          )}
        </div>
      }
    >
      <ol className="space-y-3">
        {timeline.timeline.map((e) => (
          <TimelineItem key={e.id} entry={e} />
        ))}
      </ol>
    </SectionCard>
  );
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [briefing, timeline] = await Promise.all([
    fetchBriefing(slug),
    fetchTimeline(slug, 50),
  ]);
  if (!briefing) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="text-sm text-slate-400 hover:text-slate-200">
          &larr; Back to projects
        </Link>
      </div>

      <IdentitySection slug={briefing.slug} identity={briefing.identity} />
      <WorkOrderSection wo={briefing.work_order} />
      <PreplanSection preplan={briefing.preplan} />
      <SkillsSection skills={briefing.skills} />
      <ConnectionsSection connections={briefing.connections} />
      <RecentContextSection rc={briefing.recent_context} />
      <TimelineSection timeline={timeline} />
    </div>
  );
}
