import Link from "next/link";

const NAV = [
  { href: "/ecosystem", label: "Ecosystem", icon: "🌐" },
  { href: "/", label: "Dashboard" },
  { href: "/mega", label: "MEGA" },
  { href: "/projects", label: "Projects" },
  { href: "/gprompts", label: "G-PROMPTs" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/sessions", label: "Sessions" },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:block md:w-60 md:shrink-0 border-r border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-slate-500">Empire</div>
        <div className="text-lg font-semibold text-slate-100">TALK2ME</div>
      </div>
      <nav className="space-y-1">
        {NAV.map((n) => {
          const isEcosystem = n.href === "/ecosystem";
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                isEcosystem
                  ? "bg-slate-900 text-slate-100 ring-1 ring-slate-700 hover:bg-slate-800"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {n.icon && <span aria-hidden>{n.icon}</span>}
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 text-xs text-slate-600">
        <div>iter-1 · read-only</div>
        <div>via frontend_dashboard_data</div>
      </div>
    </aside>
  );
}
