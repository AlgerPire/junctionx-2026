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
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        TILE[tone],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {label}
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
    <div className="grid border-t border-signal-line sm:grid-cols-3 sm:divide-x sm:divide-signal-line">
      {stats.map(({ icon: Icon, value, label, tone }) => (
        <div
          key={label}
          className={cn(
            "flex items-center gap-4",
            compact ? "px-4 py-3 sm:px-5" : "px-6 py-5",
          )}
        >
          <span
            className={cn(
              "flex items-center justify-center rounded-2xl",
              TILE[tone],
              compact ? "h-10 w-10" : "h-12 w-12",
            )}
          >
            <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </span>
          <div>
            <p
              className={cn(
                "font-bold leading-none text-signal-ink",
                compact ? "text-xl" : "text-2xl",
              )}
            >
              {value}
            </p>
            <p className={cn("text-xs text-signal-muted", compact ? "mt-1" : "mt-1.5")}>{label}</p>
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
        className="flex items-center gap-4 rounded-2xl px-2 py-3 transition hover:bg-signal-foam"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-signal-accentSoft text-signal-accent">
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-signal-ink">{title}</p>
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
        <MoreVertical className="h-4 w-4 shrink-0 text-signal-muted" />
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
