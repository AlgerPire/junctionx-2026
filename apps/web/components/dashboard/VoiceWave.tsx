import { cn } from "@/lib/utils";

export type WaveTone = "purple" | "blue" | "teal";
type Fade = "left" | "right" | "both" | "none";

const TONE_BG: Record<WaveTone, string> = {
  purple: "bg-signal-accent",
  blue: "bg-signal-sky",
  teal: "bg-signal-teal",
};

export function barHeights(count: number, seed = 1): number[] {
  return Array.from({ length: count }, (_, i) => {
    const x = i + seed * 7.3;
    const jitter = Math.abs(Math.sin(x * 1.91) * Math.cos(x * 0.73));
    return Math.round((0.18 + 0.82 * jitter) * 100);
  });
}

function fadeOpacity(i: number, count: number, fade: Fade): number {
  if (fade === "none" || count < 2) return 1;
  const t = i / (count - 1);
  const edge = fade === "left" ? t : fade === "right" ? 1 - t : 1 - Math.abs(t - 0.5) * 2;
  return 0.25 + 0.75 * edge;
}

/** Symmetric, centre-aligned waveform like a live audio meter. */
export function VoiceWave({
  bars = 34,
  active = false,
  tone = "purple",
  fade = "none",
  seed = 1,
  baseline = true,
  className,
}: {
  bars?: number;
  active?: boolean;
  tone?: WaveTone;
  fade?: Fade;
  seed?: number;
  baseline?: boolean;
  className?: string;
}) {
  const heights = barHeights(bars, seed);
  return (
    <div
      className={cn(
        "relative flex h-24 w-full min-w-0 max-w-full items-center justify-center gap-0.5 overflow-hidden",
        className,
      )}
      aria-hidden
    >
      {baseline ? (
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-signal-accent/15" />
      ) : null}
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn(
            "relative max-w-[3px] min-w-0 flex-1 rounded-full",
            TONE_BG[tone],
            active && "animate-wave-bar",
          )}
          style={{
            height: `${h}%`,
            opacity: fadeOpacity(i, bars, fade),
            animationDelay: active ? `${(i % 9) * 0.09}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}
