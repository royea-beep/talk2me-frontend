// Server-side fetch wrapper for frontend_dashboard_data Edge Function.
// All backend reads go through this — no direct supabase client SELECTs.
// (V3 LOCKED #5: anon key + RLS-friendly only. Strategic AI Council vetoed
//  anon SELECT policies because knowledge_vault.content holds live secrets.
//  Pattern: anon key as transport, service_role inside EF, column whitelist.)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const EF_URL = `${SUPABASE_URL}/functions/v1/frontend_dashboard_data`;

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
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
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
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
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
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EF ${res.status}: ${text}`);
  }
  return res.json();
}
