// Advisory verifier icons. Pure presentational (no client JS — native title tooltip).
import type { VerifierFlag } from "@/lib/verifier";

export default function VerifierIcons({ flags }: { flags: VerifierFlag[] }) {
  if (!flags || flags.length === 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 align-middle">
      {flags.map((f, i) => (
        <span
          key={`${f.icon}-${i}`}
          title={`${f.label}: ${f.reason}`}
          aria-label={f.label}
          className="cursor-help text-sm leading-none"
        >
          {f.icon}
        </span>
      ))}
    </span>
  );
}
