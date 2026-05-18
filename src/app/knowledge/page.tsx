import { fetchTable } from "@/lib/api";
import ExpandableRow from "@/components/ExpandableRow";

export const dynamic = "force-dynamic";

const COLS = [
  { key: "title", label: "Title" },
  { key: "category", label: "Category" },
  { key: "source_project", label: "Project" },
  { key: "tags", label: "Tags" },
  { key: "usage_count", label: "Usage" },
  { key: "created_at", label: "Created" },
];

export default async function Page() {
  const data = await fetchTable("knowledge_vault", { limit: 200 });
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-100 mb-1">Knowledge Vault</h2>
      <p className="text-sm text-slate-400 mb-6">
        {data.total_count} rows - click row to expand - <span className="text-amber-400">content and description intentionally hidden (54 rows contain secrets per Council audit)</span>
      </p>
      {data.rows.length === 0 ? (
        <div className="rounded border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">No knowledge items found.</div>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-800">
          <table className="w-full">
            <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
              <tr>{COLS.map((c) => (<th key={c.key} className="px-4 py-2 text-left">{c.label}</th>))}<th className="w-8" /></tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (<ExpandableRow key={(r as { id?: string }).id ?? i} cols={COLS} row={r as Record<string, unknown>} />))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
