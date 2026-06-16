// /system — maintenance page: cost + cron health + telegram bots (EF ?view=system).
// Additive page. Hebrew RTL, dark, reuse existing card style. Read-only via EF.
import { fetchSystem, type SystemCost, type SystemCron, type TelegramBot } from "@/lib/api";

export const dynamic = "force-dynamic";

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 86_400_000;
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return String(iso).slice(0, 10);
}

const PROVIDER_COLORS: Record<string, string> = {
  supabase: "bg-emerald-500",
  neon: "bg-sky-500",
  static: "bg-slate-500",
  none: "bg-slate-700",
  tbd: "bg-slate-700",
};

function Empty({ label }: { label: string }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5 text-sm text-slate-500">
      אין נתוני {label}.
    </section>
  );
}

function TierList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
      <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">
        {title} ({items.length})
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <span key={s} className={`rounded border border-slate-700 bg-slate-800/40 px-2 py-0.5 text-xs ${tone}`}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function CostBlock({ cost }: { cost: SystemCost | null }) {
  if (!cost) return <Empty label="עלות" />;
  const total = cost.monthly_totals?.total_estimated_spend_usd ?? 0;
  const providers = Object.entries(cost.by_provider ?? {})
    .filter(([, v]) => (v?.total_cost_usd ?? 0) > 0)
    .sort((a, b) => b[1].total_cost_usd - a[1].total_cost_usd);
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5">
      <h2 className="mb-1 text-lg font-semibold text-slate-100">💸 עלות חודשית</h2>
      <div dir="ltr" className="mb-4 text-4xl font-semibold text-slate-100">
        ${total}
        <span className="text-base text-slate-500"> /mo</span>
      </div>
      {providers.length > 0 && (
        <div className="mb-4">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-800" dir="ltr">
            {providers.map(([name, v]) => (
              <div
                key={name}
                className={PROVIDER_COLORS[name] ?? "bg-slate-600"}
                style={{ width: `${total ? (v.total_cost_usd / total) * 100 : 0}%` }}
                title={`${name}: $${v.total_cost_usd}`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
            {providers.map(([name, v]) => (
              <span key={name} dir="ltr" className="inline-flex items-center">
                <span className={`me-1 inline-block h-2 w-2 rounded-full ${PROVIDER_COLORS[name] ?? "bg-slate-600"}`} />
                {name} ${v.total_cost_usd}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TierList title="חינמי (stay warm)" items={cost.free_tier_projects ?? []} tone="text-slate-300" />
        <TierList title="בתשלום" items={cost.paid_tier_projects ?? []} tone="text-amber-300" />
      </div>
    </section>
  );
}

function CronBlock({ cron }: { cron: SystemCron | null }) {
  if (!cron) return <Empty label="cron" />;
  const projs = cron.projects ?? [];
  const latest = projs.map((p) => p.reported_at).filter(Boolean).sort().slice(-1)[0] ?? null;
  const stale = (daysSince(latest) ?? 999) > 2;
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-100">⏱ בריאות Cron</h2>
        {stale && (
          <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
            🕐 לא טרי — דווח לאחרונה {fmtDate(latest)}
          </span>
        )}
      </div>
      <div className="overflow-x-auto rounded border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-3 py-2 text-right">פרויקט</th>
              <th className="px-3 py-2">crons</th>
              <th className="px-3 py-2">failed 24h</th>
              <th className="px-3 py-2">סטטוס</th>
              <th className="px-3 py-2">דווח</th>
            </tr>
          </thead>
          <tbody>
            {projs.map((p) => {
              const st = p.status === "STALE";
              return (
                <tr key={p.project_slug} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-slate-200">{p.project_slug}</td>
                  <td dir="ltr" className="px-3 py-2 text-center text-slate-300">
                    {p.active_crons}/{p.total_crons}
                  </td>
                  <td dir="ltr" className={`px-3 py-2 text-center ${p.failed_24h > 0 ? "text-rose-300" : "text-slate-500"}`}>
                    {p.failed_24h}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`rounded px-2 py-0.5 text-xs ${st ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td dir="ltr" className="px-3 py-2 text-center text-xs text-slate-500">{fmtDate(p.reported_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BotsBlock({ bots }: { bots: TelegramBot[] }) {
  if (!bots || bots.length === 0) return <Empty label="בוטים" />;
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5">
      <h2 className="mb-3 text-lg font-semibold text-slate-100">🤖 בוטים בטלגרם</h2>
      <div className="overflow-x-auto rounded border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-3 py-2 text-right">בוט</th>
              <th className="px-3 py-2">פרויקט</th>
              <th className="px-3 py-2">הודעות</th>
              <th className="px-3 py-2">הודעה אחרונה</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((b, i) => {
              const stale = (daysSince(b.last_msg) ?? 999) > 7;
              return (
                <tr key={`${b.username}-${i}`} className="border-t border-slate-800">
                  <td dir="ltr" className="px-3 py-2 text-slate-200">{b.username}</td>
                  <td className="px-3 py-2 text-slate-300">{b.project}</td>
                  <td dir="ltr" className="px-3 py-2 text-center">
                    {b.messages === 0 ? (
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-500">0 הודעות</span>
                    ) : (
                      <span className="text-slate-200">{b.messages.toLocaleString()}</span>
                    )}
                  </td>
                  <td dir="ltr" className="px-3 py-2 text-center text-xs">
                    {b.last_msg ? (
                      <span className={stale ? "text-amber-300" : "text-slate-400"}>
                        {stale ? "🕐 " : ""}
                        {fmtDate(b.last_msg)}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function SystemPage() {
  const system = await fetchSystem();
  if (!system) {
    return (
      <div className="rounded border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
        טעינת נתוני המערכת נכשלה — EF down או X-Empire-Secret נדחה.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">System</h1>
        <p className="mt-1 text-sm text-slate-400">בריאות התשתית + עלות — דרך frontend_dashboard_data</p>
      </div>
      <CostBlock cost={system.cost} />
      <CronBlock cron={system.cron} />
      <BotsBlock bots={system.bots} />
    </div>
  );
}
