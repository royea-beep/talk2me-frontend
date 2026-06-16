import { fetchTable, fetchBurning } from "@/lib/api";
import { projectVerifierFlags } from "@/lib/verifier";
import ExpandableRow from "@/components/ExpandableRow";

export const dynamic = "force-dynamic";

function pickSlug(row: Record<string, unknown>): string | null {
  const cs = row["canonical_slug"];
  if (typeof cs === "string" && cs.length > 0) return cs;
  const pn = row["project_name"];
  if (typeof pn === "string" && pn.length > 0) return pn;
  return null;
}

const COLS = [
  { key: "project_name", label: "Project", asLink: true },
  { key: "status", label: "Status" },
  { key: "current_step", label: "Step" },
  { key: "last_simulation_score", label: "Sim score" },
  { key: "updated_at", label: "Updated" },
  { key: "__flags", label: "אימות", asFlags: true },
];

export default async function Page() {
  const [data, burning] = await Promise.all([
    fetchTable("project_pipeline", { limit: 200 }),
    fetchBurning(),
  ]);
  const health = burning?.project_health ?? {};
  // Enrich rows with a __slug field so ExpandableRow can wrap the project name
  // in a Link without crossing the server→client boundary with a function, and
  // a __flags array (serializable) so it can render verifier icons.
  const rows = data.rows.map((r) => {
    const row = r as Record<string, unknown>;
    const slug = pickSlug(row);
    const updatedAt = typeof row["updated_at"] === "string" ? (row["updated_at"] as string) : null;
    const flags = projectVerifierFlags(slug ? health[slug] : null, updatedAt);
    return { ...row, __slug: slug, __flags: flags };
  });
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-100 mb-1">Projects</h2>
      <p className="text-sm text-slate-400 mb-6">
        {data.total_count} rows — click name to open briefing, row to expand raw
      </p>
      {rows.length === 0 ? (
        <div className="rounded border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">
          No projects found. Check Supabase RLS or the EF whitelist.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-800">
          <table className="w-full">
            <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
              <tr>{COLS.map((c) => (<th key={c.key} className="px-4 py-2 text-left">{c.label}</th>))}<th className="w-8" /></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <ExpandableRow key={(r as { id?: string }).id ?? i} cols={COLS} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
