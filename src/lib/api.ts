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
