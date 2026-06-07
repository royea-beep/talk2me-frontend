"use client";

import { useState, type MouseEvent } from "react";

type Props = {
  cols: Array<{
    key: string;
    label: string;
    render?: (v: unknown, row: Record<string, unknown>) => React.ReactNode;
  }>;
  row: Record<string, unknown>;
};

export default function ExpandableRow({ cols, row }: Props) {
  const [open, setOpen] = useState(false);

  // Don't toggle expand when the click originated from an interactive child
  // (link, button, input) — lets project-name links navigate cleanly.
  const handleRowClick = (e: MouseEvent<HTMLTableRowElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest("a,button,input,select,textarea")) return;
    setOpen((o) => !o);
  };

  return (
    <>
      <tr
        onClick={handleRowClick}
        className="cursor-pointer hover:bg-slate-800/60 border-b border-slate-800 transition-colors"
      >
        {cols.map((c) => (
          <td key={c.key} className="px-4 py-2 text-sm text-slate-200">
            {c.render ? c.render(row[c.key], row) : formatCell(row[c.key])}
          </td>
        ))}
        <td className="px-4 py-2 text-xs text-slate-500 w-8">{open ? "v" : ">"}</td>
      </tr>
      {open && (
        <tr className="bg-slate-900/80">
          <td colSpan={cols.length + 1} className="px-4 py-3">
            <pre className="text-xs text-slate-300 whitespace-pre-wrap break-all bg-slate-950/60 p-3 rounded border border-slate-800 max-h-96 overflow-auto">
              {JSON.stringify(row, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "-";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "-";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 80 ? s.slice(0, 77) + "..." : s;
}
