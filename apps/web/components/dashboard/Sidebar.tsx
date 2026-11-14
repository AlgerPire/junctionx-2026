"use client";

import {
  AudioLines,
  BarChart3,
  Bot,
  Eye,
  FileText,
  Inbox,
  LayoutGrid,
  MessageCircle,
  NotebookPen,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { setPersonaId } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";
import { ROLE_META, ROLE_NAV, type AppRole } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ICONS = {
  home: LayoutGrid,
  mic: AudioLines,
  list: FileText,
  inbox: Inbox,
  users: MessageCircle,
  chart: BarChart3,
  shield: Shield,
  bot: Bot,
  note: NotebookPen,
  eye: Eye,
} as const;

const PERSONAS = [
  ["company", "Company", "company_demo", "/company"],
  ["seeker", "Seeker", "seeker_demo_a", "/seeker"],
  ["organiser", "Organiser", "organiser_demo", "/organiser/dashboard"],
] as const;

export function Sidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const meta = ROLE_META[role];
  const items = ROLE_NAV[role];
  const dark = role === "seeker" || role === "organiser";

  return (
    <aside
      className={cn(
        "flex min-h-0 w-[248px] flex-1 flex-col overflow-hidden rounded-[28px] border px-4 py-5",
        role === "seeker" && "seeker-sidebar",
        role === "organiser" && "organiser-sidebar",
        role === "company" && "border-signal-line bg-white shadow-soft",
      )}
    >
      <Link href="/" className="mb-5 block shrink-0 px-2">
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-glass",
            role === "seeker" && "bg-gradient-to-b from-[#e05a3c] to-[#c44a32]",
            role === "organiser" && "bg-gradient-to-b from-[#5b9af5] to-[#3d7de0]",
            role === "company" &&
              "bg-gradient-to-b from-[var(--signal-orb-from)] to-[var(--signal-orb-to)]",
          )}
        >
          <AudioLines className="h-5 w-5" />
        </span>
        <span
          className={cn(
            "mt-3 block text-lg font-bold leading-tight tracking-tight",
            dark ? "text-white" : "text-signal-ink",
          )}
        >
          {APP_NAME}
        </span>
        <span className={cn("mt-0.5 block text-xs", dark ? "text-white/65" : "text-signal-muted")}>
          {meta.title} workspace
        </span>
      </Link>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active =
            pathname === item.href ||
            (item.href !== meta.home && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
                dark
                  ? active
                    ? "bg-white/15 font-semibold text-white"
                    : "font-medium text-white/70 hover:bg-white/10 hover:text-white"
                  : active
                    ? "bg-signal-accentSoft font-semibold text-signal-accent"
                    : "font-medium text-signal-ink/80 hover:bg-signal-foam hover:text-signal-ink",
              )}
            >
              <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 shrink-0 space-y-3">
        <div
          className={cn(
            "rounded-2xl p-3.5",
            dark ? "bg-white/10" : "bg-signal-tealSoft/70",
          )}
        >
          <div className="flex items-start gap-2.5">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                role === "seeker" && "bg-white/15 text-[#ffb39f]",
                role === "organiser" && "bg-white/15 text-[#9ec0ff]",
                role === "company" && "bg-white/80 text-signal-teal",
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className={cn("text-sm font-bold", dark ? "text-white" : "text-signal-ink")}>
                {role === "seeker"
                  ? "Your voice first"
                  : role === "organiser"
                    ? "See the gaps"
                    : "You decide"}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[11px] leading-snug",
                  dark ? "text-white/65" : "text-signal-muted",
                )}
              >
                {role === "seeker"
                  ? "Approve skills before anything is shared."
                  : role === "organiser"
                    ? "Aggregates only — never individual profiles."
                    : "AI assists. Humans decide."}
              </p>
            </div>
          </div>
          <Link
            href="/transparency"
            className={cn(
              "mt-3 flex w-full items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold text-white hover:brightness-105",
              role === "seeker" && "bg-[#e05a3c]",
              role === "organiser" && "bg-[#4f8cf0]",
              role === "company" && "bg-signal-teal",
            )}
          >
            How it works
          </Link>
        </div>

        <div className={cn("flex rounded-2xl p-1", dark ? "bg-black/25" : "bg-signal-foam")}>
          {PERSONAS.map(([r, label, persona, href]) => (
            <Link
              key={r}
              href={`${href}?persona=${persona}`}
              onClick={() => setPersonaId(persona)}
              className={cn(
                "flex-1 rounded-xl py-1.5 text-center text-[11px] font-semibold transition",
                role === r
                  ? dark
                    ? "bg-white/20 text-white"
                    : "bg-white text-signal-accent shadow-soft"
                  : dark
                    ? "text-white/50 hover:text-white/80"
                    : "text-signal-muted hover:text-signal-ink",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
