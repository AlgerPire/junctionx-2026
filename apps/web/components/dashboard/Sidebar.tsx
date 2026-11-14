"use client";

import {
  AudioLines,
  BarChart3,
  Bot,
  Eye,
  FileText,
  Inbox,
  LayoutGrid,
  LogOut,
  MessageCircle,
  NotebookPen,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { logout, setPersonaId } from "@/lib/api";
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
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const meta = ROLE_META[role];
  const items = ROLE_NAV[role];

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    await logout();
    router.push("/auth");
  }

  return (
    <aside
      className={cn(
        "flex min-h-0 w-[248px] flex-1 flex-col overflow-hidden rounded-[28px] border px-4 py-5",
        role === "seeker" && "seeker-sidebar",
        role === "organiser" && "organiser-sidebar",
        role === "company" && "company-sidebar",
      )}
    >
      <Link href="/" className="mb-5 block shrink-0 px-2">
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-glass",
            role === "seeker" && "bg-gradient-to-b from-[#4a78d6] to-[#2f5bb8]",
            role === "organiser" && "bg-gradient-to-b from-[#4aad72] to-[#2d7a52]",
            role === "company" && "bg-gradient-to-b from-[#8577f2] to-[#6c5ce7]",
          )}
        >
          <AudioLines className="h-5 w-5" />
        </span>
        <span className="mt-3 block text-lg font-bold leading-tight tracking-tight text-white">
          {APP_NAME}
        </span>
        <span className="mt-0.5 block text-xs text-white/65">{meta.title} workspace</span>
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
                active
                  ? "bg-white/15 font-semibold text-white"
                  : "font-medium text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 shrink-0 space-y-3">
        <div className="rounded-2xl bg-white/10 p-3.5">
          <div className="flex items-start gap-2.5">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15",
                role === "seeker" && "text-[#9ec0ff]",
                role === "organiser" && "text-[#9ed4b8]",
                role === "company" && "text-[#c4baf8]",
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">
                {role === "seeker"
                  ? "Your voice first"
                  : role === "organiser"
                    ? "See the gaps"
                    : "You decide"}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/65">
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
              role === "seeker" && "bg-[#2f5bb8]",
              role === "organiser" && "bg-[#2d7a52]",
              role === "company" && "bg-[#6c5ce7]",
            )}
          >
            How it works
          </Link>
        </div>

        <div className="flex rounded-2xl bg-black/25 p-1" data-testid="persona-switcher">
          {PERSONAS.map(([r, label, persona, href]) => (
            <Link
              key={r}
              href={`${href}?persona=${persona}`}
              onClick={() => setPersonaId(persona)}
              className={cn(
                "flex-1 rounded-xl py-1.5 text-center text-[11px] font-semibold transition",
                role === r
                  ? "bg-white/20 text-white"
                  : "text-white/50 hover:text-white/80",
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={signingOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.9} />
          {signingOut ? "Signing out…" : "Log out"}
        </button>
      </div>
    </aside>
  );
}
