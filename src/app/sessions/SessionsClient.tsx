"use client";

import { useState } from "react";
import ExpandableRow from "@/components/ExpandableRow";

type Row = Record<string, unknown>;

const COLS = [
  { key: "project_name", label: "Project" },
  { key: "phase", label: "Phase" },
  { key: "turn_count", label: "Turns" },
  { key: "ingested_at", label: "Ingested" },
];

export default function SessionsClient({
  initial,
  initialHasMore,
  totalCount,
}: { initial: Row[]; initialHasMore: boolean; totalCount: number }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadMore() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/sessions-page?offset=${rows.length}&limit=50`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows((prev) => [...prev, ...(data.rows as Row[])]);
      setHasMore(data.has_more);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-100 mb-1">ZPM Sessions</h2>
      <p className="text-sm text-slate-400 mb-6">
        {totalCount.toLocaleString()} total - showing {rows.length} - click row to expand
      </p>
      <div className="overflow-x-auto rounded border border-slate-800">
        <table className="w-full">
          <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
            <tr>{COLS.map((c) => (<th key={c.key} className="px-4 py-2 text-left">{c.label}</th>))}<th className="w-8" /></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (<ExpandableRow key={(r as { id?: string }).id ?? `${i}`} cols={COLS} row={r} />))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-3">
        {hasMore ? (
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sm font-medium border border-slate-700"
          >
            {loading ? "Loading..." : "Load 50 more"}
          </button>
        ) : (
          <span className="text-xs text-slate-500">End of list.</span>
        )}
        {err && <span className="text-xs text-red-400">{err}</span>}
      </div>
    </div>
  );
}
