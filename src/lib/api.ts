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

// ---------------------------------------------------------------------------
// Ecosystem view — empire-wide manager bird-eye (EF v9).
// ---------------------------------------------------------------------------

export interface EcosystemSummary {
  total_projects: number;
  live: number;
  active: number;
  idea: number;
  paused_archived: number;
  with_blocker: number;
  total_gems: number;
  total_skills: number;
  total_sessions: number;
  total_decisions: number;
}

export interface EcosystemDomainRow {
  domain: string;
  count: number;
  avg_progress: number;
}

export interface EcosystemProject {
  slug: string;
  domain: string | null;
  type: string | null;
  status: string;
  tier: string | null;
  hands_off: boolean;
  progress_pct: number | null;
  current_focus: string | null;
  blocker: string | null;
  open_tasks: number;
  has_mega: boolean;
  has_preplan: boolean;
  timeline_entries: number;
}

export interface EcosystemAttention {
  slug: string;
  reason: string;
}

export interface EcosystemData {
  generated_at: string;
  summary: EcosystemSummary;
  by_domain: EcosystemDomainRow[];
  projects: EcosystemProject[];
  attention_needed: EcosystemAttention[];
}

export interface EcosystemResponse {
  view: "ecosystem";
  generated_at: string;
  ecosystem: EcosystemData;
}

export async function fetchEcosystem(): Promise<EcosystemData | null> {
  const res = await fetch(`${EF_URL}?view=ecosystem`, {
    headers: EF_HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as Partial<EcosystemResponse> & { error?: string };
  if (json.error || !json.ecosystem) return null;
  return json.ecosystem;
}

// ---------------------------------------------------------------------------
// Scorecard view — per-project planned-vs-done + next action.
// ---------------------------------------------------------------------------

export interface ScorecardStage {
  num: number;
  name: string;
}

export interface Scorecard {
  slug: string;
  generated_at: string;
  progress: {
    status: string | null;
    current_step: number | null;
    total_stages: number;
    percent_complete: number;
  };
  done: {
    gems_captured: number;
    sessions_worked: number;
    decisions_logged: number;
    stages_completed: ScorecardStage[] | null;
  };
  not_done: {
    open_tasks: number;
    current_blocker: string | null;
    stages_remaining: ScorecardStage[] | null;
  };
  next_action: {
    suggested: string | null;
    next_stage: ScorecardStage | null;
  };
  upgrade_options: {
    has_mega_prompt: boolean | null;
    has_real_preplan: boolean | null;
    timeline_entries: number;
  };
}

export interface ScorecardResponse {
  view: "scorecard";
  generated_at: string;
  scorecard: Scorecard;
}

export async function fetchScorecard(slug: string): Promise<Scorecard | null> {
  const url = `${EF_URL}?view=scorecard&slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, { headers: EF_HEADERS, cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as
    | (Partial<ScorecardResponse> & { error?: string; scorecard?: Scorecard })
    | (Scorecard & { error?: string });
  if ((json as { error?: string }).error) return null;
  // EF may return the scorecard at the top level OR nested.
  const sc = (json as { scorecard?: Scorecard }).scorecard ?? (json as Scorecard);
  if (!sc || !sc.slug) return null;
  return sc;
}

// ---------------------------------------------------------------------------
// Burning view — "מה בוער עכשיו" daily-attention inbox (EF v10).
// empire_action_queue(5) + attention_summary() + run_manager_self_checks(),
// plus a project_health map used to compute verifier icons.
// ---------------------------------------------------------------------------

export interface BurningAction {
  id: string;
  score: number;
  title: string;
  project: string | null;
  priority: string | null;
  hours_old: number;
  assigned_to: string | null;
}

export interface AttentionProblemProject {
  events: number;
  project: string;
  miss_rate_pct: number;
}

export interface BurningAttention {
  by_status?: Record<string, number>;
  total_events: number;
  frustration_events: number;
  followup_required_events: number;
  most_problematic_projects: AttentionProblemProject[];
}

export type Severity = "critical" | "high" | "medium" | "low";

export interface FiringRule {
  rule: string;
  name: string;
  severity: Severity;
  count: number;
}

export interface BurningSelfChecks {
  firing_by_severity: Record<Severity, number>;
  firing_rules: FiringRule[];
  rules_count: number;
  evaluated_at: string | null;
}

export interface BurningData {
  queue_size: number;
  top_actions: BurningAction[];
  attention: BurningAttention | null;
  self_checks: BurningSelfChecks;
}

export interface ProjectHealth {
  health_score: number | null;
  daily_active: number | null;
  last_activity: string | null;
}

export interface BurningResponse {
  view: "burning";
  generated_at: string;
  burning: BurningData;
  project_health: Record<string, ProjectHealth>;
}

export async function fetchBurning(): Promise<BurningResponse | null> {
  const res = await fetch(`${EF_URL}?view=burning`, {
    headers: EF_HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as Partial<BurningResponse> & { error?: string };
  if (json.error || !json.burning) return null;
  return json as BurningResponse;
}

// ---------------------------------------------------------------------------
// Project drill-down view (EF v11) — tasks + per-project burning actions + v2 card.
// ---------------------------------------------------------------------------

export interface ProjectTasksSummary {
  pending: number;
  in_progress: number;
  blocked: number;
  partial: number;
  failed: number;
  done: number;
  total_tasks: number;
  avg_completion_pct: number;
}

export interface ProjectAction {
  id: string;
  title: string;
  score: number;
  priority: string | null;
  hours_old: number;
  kind: string | null;
  recommended_actor: string | null;
}

// v2 card — defensive: only the fields we render are typed, rest passthrough.
export interface ProjectCard {
  slug: string;
  name?: string | null;
  category?: string | null;
  health_score?: number | null;
  open_risks?: number | null;
  top_risk_title?: string | null;
  top_risk_score?: number | null;
  monthly_cost?: number | null;
  last_activity?: string | null;
  features_shipped?: number | null;
  features_missing?: number | null;
  events_7d?: number | null;
  folder_path?: string | null;
  supabase_project_id?: string | null;
  status?: string | null;
  stage?: string | null;
  daily_active?: number | null;
  [k: string]: unknown;
}

export interface ProjectDetail {
  slug: string;
  tasks: ProjectTasksSummary | null;
  actions: ProjectAction[];
  card: ProjectCard | null;
}

export interface ProjectResponse {
  view: "project";
  generated_at: string;
  project_detail: ProjectDetail;
}

export async function fetchProject(slug: string): Promise<ProjectDetail | null> {
  const res = await fetch(`${EF_URL}?view=project&slug=${encodeURIComponent(slug)}`, {
    headers: EF_HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as Partial<ProjectResponse> & { error?: string };
  if (json.error || !json.project_detail) return null;
  return json.project_detail;
}

// ---------------------------------------------------------------------------
// System view (EF v11) — cost + cron health + telegram bots.
// ---------------------------------------------------------------------------

export interface CostProvider {
  count: number;
  total_cost_usd: number;
}

export interface SystemCost {
  by_provider: Record<string, CostProvider>;
  monthly_totals: {
    net_usd: number;
    total_revenue_usd: number;
    total_estimated_spend_usd: number;
  };
  free_tier_projects: string[];
  paid_tier_projects: string[];
}

export interface CronProject {
  project_slug: string;
  status: string;
  total_crons: number;
  active_crons: number;
  failed_24h: number;
  reported_at: string | null;
}

export interface SystemCron {
  as_of: string;
  projects: CronProject[];
  unreported_projects: string[];
}

export interface TelegramBot {
  username: string;
  project: string;
  active: boolean;
  webhook: boolean;
  messages: number;
  last_msg: string | null;
}

export interface SystemData {
  cost: SystemCost | null;
  cron: SystemCron | null;
  bots: TelegramBot[];
}

export interface SystemResponse {
  view: "system";
  generated_at: string;
  system: SystemData;
}

export async function fetchSystem(): Promise<SystemData | null> {
  const res = await fetch(`${EF_URL}?view=system`, {
    headers: EF_HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as Partial<SystemResponse> & { error?: string };
  if (json.error || !json.system) return null;
  return json.system;
}
