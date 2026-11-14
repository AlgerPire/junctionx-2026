import { Mic, Square, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { VoiceWave } from "./VoiceWave";

function OrbFace({
  recording,
  heartbeat,
  icon: Icon = Mic,
}: {
  recording?: boolean;
  heartbeat?: boolean;
  icon?: LucideIcon;
}) {
  const live = heartbeat && !recording;
  return (
    <>
      <span
        className={cn(
          "absolute -inset-10 rounded-full bg-signal-accent/[0.06]",
          live && "animate-orb-breathe",
        )}
      />
      <span className="absolute -inset-5 rounded-full bg-signal-accent/[0.10]" />
      {recording ? (
        <span className="absolute -inset-5 animate-pulse-ring rounded-full border-2 border-signal-accent/30" />
      ) : null}
      {live ? (
        <>
          <span className="absolute -inset-3 animate-heartbeat-ring rounded-full border-2 border-signal-accent/35" />
          <span className="absolute -inset-6 animate-heartbeat-ring-late rounded-full border border-signal-accent/25" />
        </>
      ) : null}
      <span
        className={cn(
          "relative flex h-[84px] w-[84px] items-center justify-center rounded-full text-white shadow-orb transition",
          recording
            ? "bg-signal-ink"
            : "bg-gradient-to-b from-[var(--signal-orb-from)] to-[var(--signal-orb-to)] group-hover:scale-[1.04]",
          live && "animate-heartbeat motion-reduce:animate-none",
        )}
      >
        {recording ? (
          <Square className="h-7 w-7 fill-current" />
        ) : (
          <Icon className="h-8 w-8" strokeWidth={1.9} />
        )}
      </span>
    </>
  );
}

const ORB_CLASS =
  "group relative flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full disabled:opacity-40";

export function MicOrb({
  href,
  onClick,
  recording,
  disabled,
  label,
  icon,
  heartbeat,
}: {
  href?: string;
  onClick?: () => void;
  recording?: boolean;
  disabled?: boolean;
  label: string;
  icon?: LucideIcon;
  /** Continuous double-beat pulse on the agent orb. */
  heartbeat?: boolean;
}) {
  if (href) {
    return (
      <Link href={href} aria-label={label} className={ORB_CLASS}>
        <OrbFace icon={icon} heartbeat={heartbeat} />
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className={ORB_CLASS}>
      <OrbFace recording={recording} icon={icon} heartbeat={heartbeat} />
    </button>
  );
}

/** Waveform — mic — waveform stage from the live voice card. */
export function VoiceStage({
  active,
  children,
  compact,
}: {
  active?: boolean;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center gap-10",
        compact ? "py-4" : "py-10",
      )}
    >
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-signal-accent/15" />
      <VoiceWave
        bars={30}
        active={active}
        fade="left"
        seed={2}
        baseline={false}
        className="hidden min-w-0 flex-1 justify-end overflow-hidden sm:flex"
      />
      {children}
      <VoiceWave
        bars={30}
        active={active}
        fade="right"
        seed={5}
        baseline={false}
        className="hidden min-w-0 flex-1 justify-start overflow-hidden sm:flex"
      />
    </div>
  );
}
