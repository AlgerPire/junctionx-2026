import type { Bucket } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FitMeter({
  pct,
  bucket,
  covered,
  total,
  size = "md",
  className,
}: {
  pct: number;
  bucket?: Bucket;
  covered?: number | null;
  total?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const dim = size === "lg" ? 72 : size === "sm" ? 44 : 56;
  const stroke = size === "lg" ? 6 : size === "sm" ? 4 : 5;
  const r = (dim - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - clamped / 100);

  const ring =
    bucket === "strong"
      ? "stroke-signal-teal"
      : bucket === "explore"
        ? "stroke-amber-500"
        : "stroke-signal-accent";

  const label =
    total != null && covered != null
      ? `${covered}/${total} skills`
      : "Skill overlap";

  return (
    <div
      className={cn("flex shrink-0 flex-col items-center gap-1", className)}
      title="Skill overlap from your approved story vs this role’s must-haves — not a hiring score"
    >
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90" aria-hidden>
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-signal-line"
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={cn(ring, "transition-[stroke-dashoffset] duration-700 ease-out")}
            style={{ strokeDasharray: circ, strokeDashoffset: offset }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-bold leading-none tracking-tight text-signal-ink",
              size === "lg" ? "text-lg" : size === "sm" ? "text-xs" : "text-sm",
            )}
          >
            {clamped}%
          </span>
        </div>
      </div>
      <p
        className={cn(
          "max-w-[4.5rem] text-center font-medium leading-tight text-signal-muted",
          size === "sm" ? "text-[9px]" : "text-[10px]",
        )}
      >
        {label}
      </p>
    </div>
  );
}
