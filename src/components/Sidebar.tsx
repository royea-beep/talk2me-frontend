import Link from "next/link";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/gprompts", label: "G-PROMPTs" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/sessions", label: "Sessions" },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-slate-500">Empire</div>
        <div className="text-lg font-semibold text-slate-100">TALK2ME</div>
      </div>
      <nav className="space-y-1">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="block px-3 py-2 rounded text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8 text-xs text-slate-600">
        <div>iter-1 · read-only</div>
        <div>via frontend_dashboard_data</div>
      </div>
    </aside>
  );
}
