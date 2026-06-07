// Server-side fetch wrapper for frontend_dashboard_data Edge Function.
// All backend reads go through this — no direct supabase client SELECTs.
// (V3 LOCKED #5: anon key + RLS-friendly only. Strategic AI Council vetoed
//  anon SELECT policies because knowledge_vault.content holds live secrets.
//  Pattern: anon key as transport, service_role inside EF, column whitelist.)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// TODO(2026-Q3): Migrate to Path A — Supabase Auth verify_jwt=true with auth.getUser().
// Shared-secret leaks via DevTools but is acceptable for Roye-only dashboard.
const DASHBOARD_SECRET = process.env.NEXT_PUBLIC_DASHBOARD_SECRET ?? "";
const EF_URL = `${SUPABASE_URL}/functions/v1/frontend_dashboard_data`;

const EF_HEADERS: Record<string, string> = {
  Authorization: `Bearer ${ANON_KEY}`,
  apikey: ANON_KEY,
  "X-Empire-Secret": DASHBOARD_SECRET,
};

export type Table =
  | "project_pipeline"
  | "gprompt_registry"
  | "knowledge_vault"
  | "zpm_sessions";

export type DashboardResponse<T = Record<string, unknown>> = {
  table: Table;
  rows: T[];
  total_count: number;
  has_more: boolean;
  limit: number;
  offset: number;
  columns_exposed: string[];
};

export async function fetchTable<T = Record<string, unknown>>(
  table: Table,
  opts: { limit?: number; offset?: number } = {},
): Promise<DashboardResponse<T>> {
  const params = new URLSearchParams({
    table,
    limit: String(opts.limit ?? 50),
    offset: String(opts.offset ?? 0),
  });
  const res = await fetch(`${EF_URL}?${params}`, {
    headers: EF_HEADERS,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EF ${res.status}: ${text}`);
  }
  return res.json();
}

// Cheap count-only fetch for home cards (still goes through EF; small payload).
export async function fetchCount(table: Table): Promise<number> {
  const r = await fetchTable(table, { limit: 1 });
  return r.total_count;
}

// ---------------------------------------------------------------------------
// Mega view — empire-wide roll-up. Server computes summary + projects +
// dashboards + secrets_expiring in a single round-trip.
// ---------------------------------------------------------------------------

export interface MegaSummary {
  total_projects: number;
  hands_off: number;
  healthy: number;
  degraded: number;
  unknown_health: number;
  blocked: number;
  anti_fragility_flags: number;
  dashboards_cataloged: number;
  secrets_expiring_30d: number;
}

export interface MegaProject {
  slug: string;
  display_name: string | null;
  tier: number | null;
  tier_label: string | null;
  hands_off: boolean;
  db_backend: string | null;
  domain: string | null;
  github_repo: string | null;
  health_score: number | null;
  stage: string | null;
  current_focus: string | null;
  current_blocker: string | null;
  active_bots: string[] | null;
  manager_slug: string | null;
  live_state_updated_at: string | null;
  pipeline_step: number | null;
  last_simulation_score: number | null;
  pipeline_status: string | null;
  daily_active: number | null;
  weekly_revenue_usd: number | null;
  tester_count: number | null;
  db_tables_count: number | null;
  db_crons_count: number | null;
  db_edge_functions_count: number | null;
  always_active: boolean | null;
  last_heartbeat: string | null;
  heartbeat_status: string | null;
  missing_live_state: boolean;
  missing_heartbeat: boolean;
  heartbeat_stale: boolean;
}

export interface MegaDashboard {
  project_slug: string;
  dashboard_name: string;
  url: string | null;
  host_type: string | null;
  tech_stack: string | null;
  status: string | null;
  user_audience: string | null;
}

export interface MegaSecret {
  project_slug: string;
  secret_name: string;
  secret_kind: string | null;
  expires_at: string | null;
  rotation_method: string | null;
  is_active: boolean | null;
}

export interface MegaResponse {
  view: "mega";
  generated_at: string;
  summary: MegaSummary;
  projects: MegaProject[];
  dashboards: MegaDashboard[];
  secrets_expiring: MegaSecret[];
}

export async function fetchMegaView(signal?: AbortSignal): Promise<MegaResponse> {
  const res = await fetch(`${EF_URL}?view=mega`, {
    headers: EF_HEADERS,
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EF ${res.status}: ${text}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Tasks view — bot_tasks queue snapshot.
// ---------------------------------------------------------------------------

export type TaskPriority = "p0" | "high" | "normal" | "low";

export interface TasksSummary {
  pending: number;
  p0: number;
  high: number;
  normal: number;
  low: number;
  running: number;
  blocked: number;
  done_recent: number;
}

export interface PendingTask {
  id: string;
  title: string;
  project_name: string | null;
  priority: TaskPriority;
  status: string;
  assigned_to: string | null;
  created_at: string;
}

export interface RunningTask {
  id: string;
  title: string;
  project_name: string | null;
  priority: TaskPriority;
  started_at: string | null;
}

export interface DoneTask {
  id: string;
  title: string;
  project_name: string | null;
  completed_at: string | null;
}

export interface BlockedTask {
  id: string;
  title: string;
  project_name: string | null;
}

export interface TasksResponse {
  view: "tasks";
  generated_at: string;
  summary: TasksSummary;
  pending: PendingTask[];
  running: RunningTask[];
  done_recent: DoneTask[];
  blocked: BlockedTask[];
}

export async function fetchTasksView(signal?: AbortSignal): Promise<TasksResponse> {
  const res = await fetch(`${EF_URL}?view=tasks`, {
    headers: EF_HEADERS,
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EF ${res.status}: ${text}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Briefing view — canonical per-project bundle (EF v7).
// ---------------------------------------------------------------------------

export interface BriefingIdentity {
  tier: string | null;
  domain: string | null;
  surfaces: string[];
  hands_off: boolean;
  last_work: string | null;
  last_focus: string | null;
  last_blocker: string | null;
  deploy_target: string | null;
  lifecycle_stage: string | null;
  work_order_type: string | null;
}

export interface BriefingStage {
  num: number;
  name: string;
  score: string | number | null;
  is_current: boolean;
  description: string | null;
}

export interface BriefingWorkOrder {
  stages: BriefingStage[];
  status: string | null;
  step_scores: Record<string, unknown> | null;
  current_step: number | null;
  total_stages: number;
}

export interface BriefingPreplan {
  exists: boolean;
  updated?: string;
  readiness?: string;
  parameters?: Record<string, unknown>;
  tags?: string[];
  bible_version?: string;
  brief_version?: string;
}

export interface BriefingSkill {
  name: string;
  category: string | null;
  description: string | null;
}

export interface BriefingSkills {
  active: BriefingSkill[];
  dormant: BriefingSkill[];
  active_count: number;
  dormant_count: number;
}

export interface BriefingConnection {
  type: string | null;
  target?: string | null;
  source?: string | null;
  is_active: boolean;
  mechanism: string | null;
}

export interface BriefingConnections {
  incoming: BriefingConnection[];
  outgoing: BriefingConnection[];
}

export interface BriefingGem {
  title: string;
  created: string | null;
  category: string | null;
}

export interface BriefingTask {
  title: string;
  priority: string | null;
  age_days: number | null;
}

export interface BriefingRecentContext {
  recent_gems: BriefingGem[];
  open_tasks: BriefingTask[];
  historical_sessions: number;
}

export interface BriefingRulesAndLocks {
  hands_off: boolean;
  special_rules: string | string[] | Record<string, unknown> | null;
}

export interface Briefing {
  slug: string;
  identity: BriefingIdentity;
  work_order: BriefingWorkOrder;
  preplan: BriefingPreplan;
  skills: BriefingSkills;
  connections: BriefingConnections;
  recent_context: BriefingRecentContext;
  rules_and_locks: BriefingRulesAndLocks;
  briefing_generated_at: string;
}

export interface BriefingResponse {
  view: "briefing";
  generated_at: string;
  briefing: Briefing;
}

export async function fetchBriefing(slug: string): Promise<Briefing | null> {
  const url = `${EF_URL}?view=briefing&slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    headers: EF_HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as Partial<BriefingResponse> & { error?: string };
  if (json.error || !json.briefing) return null;
  return json.briefing;
}

// ---------------------------------------------------------------------------
// Timeline view — per-project conversation history (EF v8).
// ---------------------------------------------------------------------------

export interface TimelineEntry {
  id: string;
  actor: string;
  type: string;
  title: string | null;
  summary: string | null;
  content: string | null;
  chat_url: string | null;
  is_decision: boolean | string;
  decision_text: string | null;
  commit_hash: string | null;
  vamos_number: number | null;
  when: string;
}

export interface ProjectTimeline {
  project: string;
  total_entries: number;
  decisions_count: number;
  date_range: { earliest: string | null; latest: string | null };
  timeline: TimelineEntry[];
}

export interface TimelineResponse {
  view: "timeline";
  generated_at: string;
  timeline: ProjectTimeline;
}

export async function fetchTimeline(slug: string, limit = 100): Promise<ProjectTimeline | null> {
  const url = `${EF_URL}?view=timeline&slug=${encodeURIComponent(slug)}&limit=${limit}`;
  const res = await fetch(url, { headers: EF_HEADERS, cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as Partial<TimelineResponse> & { error?: string };
  if (json.error || !json.timeline) return null;
  return json.timeline;
}
