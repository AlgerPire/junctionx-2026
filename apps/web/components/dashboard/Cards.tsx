import { MoreVertical, Play, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { VoiceWave, type WaveTone } from "./VoiceWave";

export type Tone = "purple" | "teal" | "blue";

const TILE: Record<Tone, string> = {
  purple: "bg-signal-accentSoft text-signal-accent",
  teal: "bg-signal-tealSoft text-signal-teal",
  blue: "bg-signal-skySoft text-signal-sky",
};

export function CardHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-bold text-signal-ink">{title}</h2>
      {action}
    </div>
  );
}

export function StatusPill({ label, tone = "teal" }: { label: string; tone?: Tone }) {
  const dot = tone === "teal" ? "bg-signal-teal" : tone === "blue" ? "bg-signal-sky" : "bg-signal-accent";
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-3 py-1 text-xs font-semibold",
        TILE[tone],
      )}
      title={label}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function StatRow({
  stats,
  compact,
}: {
  stats: { icon: LucideIcon; value: string; label: string; tone: Tone }[];
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 border-t border-signal-line divide-x divide-signal-line">
      {stats.map(({ icon: Icon, value, label, tone }) => (
        <div
          key={label}
          className={cn(
            "flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left",
            compact ? "px-2 py-3 sm:px-5" : "px-2.5 py-4 sm:px-6 sm:py-5",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-2xl",
              TILE[tone],
              compact ? "h-9 w-9 sm:h-10 sm:w-10" : "h-10 w-10 sm:h-12 sm:w-12",
            )}
          >
            <Icon className={compact ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-4 w-4 sm:h-5 sm:w-5"} />
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                "font-bold leading-none text-signal-ink",
                compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
              )}
            >
              {value}
            </p>
            <p
              className={cn(
                "text-[10px] leading-snug text-signal-muted sm:text-xs",
                compact ? "mt-1" : "mt-1 sm:mt-1.5",
              )}
            >
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

const WAVE_TONES: WaveTone[] = ["purple", "blue", "teal"];

export function SessionRow({
  href,
  title,
  meta,
  date,
  index,
}: {
  href: string;
  title: string;
  meta: string;
  date: string;
  index: number;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-2xl px-1.5 py-2.5 transition hover:bg-signal-foam sm:gap-4 sm:px-2 sm:py-3"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal-accentSoft text-signal-accent sm:h-10 sm:w-10">
          <Play className="ml-0.5 h-3.5 w-3.5 fill-current sm:h-4 sm:w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-signal-ink">{title}</p>
          <p className="mt-0.5 truncate text-[11px] text-signal-muted sm:hidden">
            {meta}
            {date ? ` · ${date}` : ""}
          </p>
          <VoiceWave
            bars={28}
            tone={WAVE_TONES[index % WAVE_TONES.length]}
            seed={index + 3}
            baseline={false}
            className="mt-1 hidden h-6 gap-[3px] md:flex"
          />
        </div>
        <span className="hidden w-20 text-right text-sm text-signal-muted sm:block">{meta}</span>
        <span className="hidden w-32 text-right text-sm text-signal-muted lg:block">{date}</span>
        <MoreVertical className="hidden h-4 w-4 shrink-0 text-signal-muted sm:block" />
      </Link>
    </li>
  );
}

export function ViewAll({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="text-sm font-semibold text-signal-accent hover:text-signal-accentDeep">
      {label}
    </Link>
  );
}

export function formatShortDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
