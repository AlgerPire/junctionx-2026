import { AudioLines } from "lucide-react";

import { VoiceWave } from "@/components/dashboard/VoiceWave";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function PageLoader({
  label = "Getting ready…",
  className,
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center justify-center overflow-hidden",
        compact ? "min-h-[50vh] py-16" : "min-h-full py-20",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="pointer-events-none absolute inset-0 dash-bg" />
      <div className="pointer-events-none absolute inset-0 wave-decor" />
      <div className="pointer-events-none absolute left-1/2 top-[38%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal-accent/15 blur-3xl animate-loader-glow" />
      <div className="pointer-events-none absolute left-[42%] top-[48%] h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal-teal/20 blur-3xl animate-loader-glow [animation-delay:0.6s]" />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center animate-loader-rise">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-signal-accent/25 animate-pulse-ring" />
          <span className="absolute -inset-3 rounded-full border border-signal-accent/20 animate-loader-spin-slow" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-[#8577f2] to-signal-accent text-white shadow-glass">
            <AudioLines className="h-7 w-7" />
          </span>
        </div>

        <div className="space-y-2">
          <p className="font-display text-2xl tracking-tight text-signal-ink sm:text-3xl">{APP_NAME}</p>
          <p className="text-sm text-signal-muted">{label}</p>
        </div>

        <VoiceWave active bars={22} fade="both" baseline={false} className="h-12" />

        <div className="mt-2 h-1 w-44 overflow-hidden rounded-full bg-signal-line/80">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-signal-accent via-signal-teal to-signal-accent animate-loader-shimmer" />
        </div>
      </div>

      <span className="sr-only">Loading page</span>
    </div>
  );
}
