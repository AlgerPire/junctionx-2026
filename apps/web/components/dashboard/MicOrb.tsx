import { AudioLines, Loader2, Mic, Square, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { VoiceWave } from "./VoiceWave";

function OrbFace({
  recording,
  speaking,
  thinking,
  heartbeat,
  icon: Icon = Mic,
}: {
  recording?: boolean;
  speaking?: boolean;
  thinking?: boolean;
  heartbeat?: boolean;
  icon?: LucideIcon;
}) {
  const live = Boolean(heartbeat && !recording && !speaking && !thinking);
  const aiLive = Boolean(speaking && !recording);
  const listening = Boolean(recording);

  return (
    <>
      {/* Soft ambient halo */}
      <span
        className={cn(
          "absolute -inset-12 rounded-full transition-opacity duration-500",
          aiLive
            ? "bg-signal-accent/20 animate-orb-breathe motion-reduce:animate-none"
            : listening
              ? "bg-signal-teal/15 animate-orb-breathe motion-reduce:animate-none"
              : thinking
                ? "bg-signal-accent/10"
                : "bg-signal-accent/[0.06]",
          live && "animate-orb-breathe",
        )}
      />
      <span
        className={cn(
          "absolute -inset-7 rounded-full transition-colors duration-300",
          aiLive
            ? "bg-signal-accent/25"
            : listening
              ? "bg-signal-teal/20"
              : "bg-signal-accent/[0.10]",
        )}
      />

      {/* Expanding rings — AI speaking */}
      {aiLive ? (
        <>
          <span className="absolute -inset-4 animate-speak-ring rounded-full border-2 border-signal-accent/40 motion-reduce:animate-none" />
          <span className="absolute -inset-8 animate-speak-ring-late rounded-full border border-signal-accent/30 motion-reduce:animate-none" />
          <span className="absolute -inset-11 animate-speak-ring-late rounded-full border border-signal-accent/15 motion-reduce:animate-none [animation-delay:0.35s]" />
        </>
      ) : null}

      {/* Expanding rings — user listening */}
      {listening ? (
        <>
          <span className="absolute -inset-5 animate-pulse-ring rounded-full border-2 border-signal-teal/45 motion-reduce:animate-none" />
          <span className="absolute -inset-9 animate-pulse-ring rounded-full border border-signal-teal/25 motion-reduce:animate-none [animation-delay:0.45s]" />
        </>
      ) : null}

      {live ? (
        <>
          <span className="absolute -inset-3 animate-heartbeat-ring rounded-full border-2 border-signal-accent/35" />
          <span className="absolute -inset-6 animate-heartbeat-ring-late rounded-full border border-signal-accent/25" />
        </>
      ) : null}

      <span
        className={cn(
          "relative flex h-[88px] w-[88px] items-center justify-center rounded-full text-white shadow-orb transition duration-300",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.42),transparent_55%)]",
          listening
            ? "scale-[1.02] bg-gradient-to-b from-signal-teal to-[#247a6c] ring-4 ring-signal-teal/25"
            : aiLive
              ? "bg-gradient-to-b from-[var(--signal-orb-from)] to-[var(--signal-orb-to)] ring-4 ring-signal-accent/30 animate-orb-breathe motion-reduce:animate-none"
              : thinking
                ? "bg-gradient-to-b from-[var(--signal-orb-from)] to-[var(--signal-orb-to)] opacity-90"
                : "bg-gradient-to-b from-[var(--signal-orb-from)] to-[var(--signal-orb-to)] group-hover:scale-[1.05] group-active:scale-[0.97]",
          live && "animate-heartbeat motion-reduce:animate-none",
        )}
      >
        {listening ? (
          <Square className="relative h-7 w-7 fill-current drop-shadow-sm" />
        ) : thinking ? (
          <Loader2 className="relative h-8 w-8 animate-spin opacity-90" strokeWidth={2} />
        ) : aiLive ? (
          <AudioLines className="relative h-8 w-8 animate-orb-breathe motion-reduce:animate-none" strokeWidth={2} />
        ) : (
          <Icon className="relative h-8 w-8 drop-shadow-sm transition group-hover:scale-105" strokeWidth={1.9} />
        )}
      </span>
    </>
  );
}

const ORB_CLASS =
  "group relative flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full outline-none transition focus-visible:ring-4 focus-visible:ring-signal-accent/30 disabled:opacity-40";

export function MicOrb({
  href,
  onClick,
  recording,
  speaking,
  thinking,
  disabled,
  label,
  icon,
  heartbeat,
}: {
  href?: string;
  onClick?: () => void;
  recording?: boolean;
  /** AI TTS / assistant audio is playing — animate the orb. */
  speaking?: boolean;
  thinking?: boolean;
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
      <OrbFace
        recording={recording}
        speaking={speaking}
        thinking={thinking}
        icon={icon}
        heartbeat={heartbeat}
      />
    </button>
  );
}

/** Waveform — mic — waveform stage from the live voice card. */
export function VoiceStage({
  active,
  speaking,
  children,
  compact,
}: {
  active?: boolean;
  /** Soft AI-speaking wave motion (distinct from user listening). */
  speaking?: boolean;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const live = Boolean(active || speaking);
  return (
    <div
      className={cn(
        "relative flex w-full min-w-0 max-w-full items-center justify-center gap-3 overflow-hidden sm:gap-8",
        compact ? "py-4 sm:py-5" : "py-6 sm:py-10",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-x-8 top-1/2 h-px -translate-y-1/2 transition-opacity duration-300 sm:inset-x-12",
          live ? "bg-signal-accent/25 opacity-100" : "bg-signal-accent/15 opacity-70",
        )}
      />
      {/* Soft stage glow behind the orb */}
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition-opacity duration-500",
          speaking
            ? "bg-signal-accent/30 opacity-100"
            : active
              ? "bg-signal-teal/25 opacity-100"
              : "bg-signal-accent/10 opacity-60",
        )}
        aria-hidden
      />
      <VoiceWave
        bars={16}
        active={live}
        fade="left"
        seed={2}
        baseline={false}
        tone={active ? "teal" : "blue"}
        className="hidden max-w-[9rem] min-w-0 flex-1 sm:flex"
      />
      {children}
      <VoiceWave
        bars={16}
        active={live}
        fade="right"
        seed={5}
        baseline={false}
        tone={active ? "teal" : "blue"}
        className="hidden max-w-[9rem] min-w-0 flex-1 sm:flex"
      />
    </div>
  );
}
