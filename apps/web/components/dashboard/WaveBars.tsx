import { cn } from "@/lib/utils";

export function WaveBars({
  active,
  bars = 12,
  className,
}: {
  active?: boolean;
  bars?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex h-12 items-end gap-1", className)} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "w-1 rounded-full bg-signal-accent/70",
            active && "animate-wave-bar",
          )}
          style={{
            height: `${30 + ((i * 17) % 70)}%`,
            animationDelay: active ? `${(i % 6) * 0.08}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}
