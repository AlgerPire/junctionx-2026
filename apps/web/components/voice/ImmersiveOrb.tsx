import { Mic, Square } from "lucide-react";

import { barHeights } from "@/components/dashboard/VoiceWave";
import { cn } from "@/lib/utils";

const SPOKES = 56;
const RADIUS = 92;
const SPOKE_HEIGHTS = barHeights(SPOKES, 3);

/** Large glowing orb with radial spokes; spokes animate while someone is talking. */
export function ImmersiveOrb({
  recording,
  speaking,
  thinking,
  disabled,
  label,
  onClick,
}: {
  recording: boolean;
  speaking: boolean;
  thinking: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  const active = recording || speaking;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="group relative flex h-[280px] w-[280px] shrink-0 scale-[0.85] items-center justify-center rounded-full xl:scale-100 outline-none focus-visible:ring-4 focus-visible:ring-signal-accent/30 disabled:cursor-not-allowed"
    >
      <span className="pointer-events-none absolute inset-6 rounded-full bg-signal-accent/15 blur-3xl" />
      {SPOKE_HEIGHTS.map((h, i) => (
        <span
          key={i}
          className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0"
          style={{ transform: `rotate(${(360 / SPOKES) * i}deg)` }}
          aria-hidden
        >
          <span
            className={cn(
              "absolute -left-px w-[2px] origin-bottom rounded-full transition-opacity",
              recording ? "bg-signal-teal" : "bg-signal-accent",
              active ? "animate-spoke opacity-70" : "opacity-25",
            )}
            style={{
              bottom: RADIUS,
              height: `${10 + h * 0.34}px`,
              animationDelay: active ? `${(i % 7) * 0.11}s` : undefined,
            }}
          />
        </span>
      ))}
      {thinking ? (
        <span className="pointer-events-none absolute h-[200px] w-[200px] animate-loader-spin-slow rounded-full border-2 border-dashed border-signal-accent/40" />
      ) : null}
      <span
        className={cn(
          "relative flex h-[150px] w-[150px] items-center justify-center rounded-full bg-gradient-to-b from-[var(--signal-orb-from)] to-[var(--signal-orb-to)] text-white shadow-orb transition",
          active || thinking ? "animate-orb-breathe" : "group-hover:scale-[1.03]",
          recording && "from-signal-teal to-signal-teal",
          disabled && "opacity-70",
        )}
      >
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.45),transparent_55%)]" />
        {recording ? (
          <Square className="relative h-9 w-9 fill-current" />
        ) : (
          <Mic className="relative h-10 w-10 opacity-45 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
        )}
      </span>
    </button>
  );
}
