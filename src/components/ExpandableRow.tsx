"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";

type Col = {
  key: string;
  label: string;
  /**
   * If true, render this cell as a Link to /projects/[slug] using the
   * `__slug` field on the row. The Link wraps the formatted cell value.
   */
  asLink?: boolean;
};

type Props = {
  cols: Col[];
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

  const slug = typeof row["__slug"] === "string" ? (row["__slug"] as string) : null;

  return (
    <>
      <tr
        onClick={handleRowClick}
        className="cursor-pointer hover:bg-slate-800/60 border-b border-slate-800 transition-colors"
      >
        {cols.map((c) => {
          const formatted = formatCell(row[c.key]);
          const content =
            c.asLink && slug ? (
              <Link
                href={`/projects/${encodeURIComponent(slug)}`}
                className="text-sky-300 hover:text-sky-200 underline-offset-2 hover:underline"
              >
                {formatted}
              </Link>
            ) : (
              formatted
            );
          return (
            <td key={c.key} className="px-4 py-2 text-sm text-slate-200">
              {content}
            </td>
          );
        })}
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
