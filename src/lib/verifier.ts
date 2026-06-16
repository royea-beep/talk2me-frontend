// Verifier layer — flags that warn the dashboard might be lying.
// ⚠️ unverified (action implies a build that may already be done — the phantom-task guard)
// 🕐 stale (waited too long / no recent activity)
// 👻 phantom (project looks healthy but is actually dead)
// Pure functions — compute server-side, render via <VerifierIcons/>. Advisory only.

import type { ProjectHealth } from "@/lib/api";

export interface VerifierFlag {
  icon: string;
  label: string;
  reason: string;
}

const STALE_ACTION_HOURS = 168; // 7 days
const STALE_PROJECT_DAYS = 14;
const PHANTOM_HEALTH_MIN = 80;

// Action title that asserts a build/change Manager may have already shipped.
const BUILD_RE = /\b(build|add|fix|deploy|redeploy|nav|create|implement|ship|wire|migrate|setup|set up)\b/i;

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 86_400_000;
}

export function isPhantom(h: ProjectHealth | undefined | null): boolean {
  if (!h) return false;
  const d = daysSince(h.last_activity);
  return (
    (h.health_score ?? 0) >= PHANTOM_HEALTH_MIN &&
    (h.daily_active ?? 0) === 0 &&
    d !== null &&
    d > STALE_PROJECT_DAYS
  );
}

export function actionVerifierFlags(
  a: { title: string; hours_old: number },
  health?: ProjectHealth | null,
): VerifierFlag[] {
  const flags: VerifierFlag[] = [];
  if (BUILD_RE.test(a.title)) {
    flags.push({
      icon: "⚠️",
      label: "לא מאומת",
      reason: "המשימה מתארת בנייה/דיפלוי — ייתכן שכבר בוצעה. אמת לפני פעולה.",
    });
  }
  if (a.hours_old > STALE_ACTION_HOURS) {
    flags.push({
      icon: "🕐",
      label: "לא טרי",
      reason: `ממתינה ${Math.round(a.hours_old / 24)} ימים — ייתכן שההקשר התיישן.`,
    });
  }
  if (isPhantom(health)) {
    flags.push({
      icon: "👻",
      label: "פרויקט רפאים",
      reason: "הפרויקט נראה בריא אך ללא פעילות אחרונה.",
    });
  }
  return flags;
}

export function projectVerifierFlags(
  h: ProjectHealth | undefined | null,
  updatedAt?: string | null,
): VerifierFlag[] {
  const flags: VerifierFlag[] = [];
  const stale = daysSince(updatedAt ?? h?.last_activity ?? null);
  if (stale !== null && stale > STALE_PROJECT_DAYS) {
    flags.push({
      icon: "🕐",
      label: "לא טרי",
      reason: `אין עדכון מזה ${Math.round(stale)} ימים.`,
    });
  }
  if (isPhantom(h)) {
    flags.push({
      icon: "👻",
      label: "פרויקט רפאים",
      reason: `health ${h?.health_score ?? "?"} אך 0 פעילות יומית ואין עדכון >${STALE_PROJECT_DAYS} ימים.`,
    });
  }
  return flags;
}
