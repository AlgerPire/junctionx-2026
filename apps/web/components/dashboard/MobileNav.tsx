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
  Menu,
  MessageCircle,
  NotebookPen,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

/** Primary tabs shown in the bottom bar (rest live in the More sheet). */
function primaryItems(role: AppRole) {
  const items = ROLE_NAV[role];
  if (role === "seeker") {
    return items.filter((i) =>
      ["/seeker", "/seeker/story", "/seeker/event", "/copilot"].includes(i.href),
    );
  }
  if (role === "company") {
    return items.filter((i) =>
      ["/company", "/company/desk", "/company/briefs", "/company/inbox"].includes(i.href),
    );
  }
  return items.filter((i) =>
    ["/organiser/dashboard", "/organiser/supply-gap", "/organiser/fairness"].includes(i.href),
  );
}

function isActive(pathname: string, href: string, home: string) {
  return pathname === href || (href !== home && pathname.startsWith(`${href}/`));
}

export function MobileTopBar({
  role,
  onOpenMenu,
}: {
  role: AppRole;
  onOpenMenu: () => void;
}) {
  const meta = ROLE_META[role];
  return (
    <div className="flex items-center justify-between gap-3 md:hidden">
      <Link href={meta.home} className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-glass",
            role === "seeker" && "bg-gradient-to-b from-[#4a78d6] to-[#2f5bb8]",
            role === "organiser" && "bg-gradient-to-b from-[#4aad72] to-[#2d7a52]",
            role === "company" && "bg-gradient-to-b from-[#8577f2] to-[#6c5ce7]",
          )}
        >
          <AudioLines className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold leading-tight text-signal-ink">
            {APP_NAME}
          </span>
          <span className="block truncate text-[11px] text-signal-muted">{meta.title}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-signal-line bg-white text-signal-ink shadow-soft"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
    </div>
  );
}

export function MobileBottomNav({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const home = ROLE_META[role].home;
  const items = primaryItems(role);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-signal-line/80 bg-white/95 px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_-16px_rgba(27,31,75,0.25)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(pathname, item.href, home);
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold leading-tight transition",
                  active
                    ? "bg-signal-accentSoft text-signal-accent"
                    : "text-signal-muted hover:text-signal-ink",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.3 : 1.8} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileMenuSheet({
  role,
  open,
  onClose,
}: {
  role: AppRole;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const meta = ROLE_META[role];
  const items = ROLE_NAV[role];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    await logout();
    onClose();
    router.push("/auth");
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        className="absolute inset-0 bg-signal-ink/40 backdrop-blur-[2px] animate-modal-backdrop"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[28px] border border-signal-line bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-soft animate-modal-panel">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-bold text-signal-ink">{meta.title} menu</p>
            <p className="text-xs text-signal-muted">Navigate, switch role, or sign out</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-signal-foam text-signal-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="grid gap-1">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(pathname, item.href, meta.home);
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition",
                  active
                    ? "bg-signal-accentSoft text-signal-accent"
                    : "text-signal-ink hover:bg-signal-foam",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-2xl border border-signal-line bg-signal-foam/70 p-3.5">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-accentSoft text-signal-accent">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-signal-ink">How matching works</p>
              <p className="mt-0.5 text-[11px] leading-snug text-signal-muted">
                Skills and evidence only — never name, nationality, school or photo.
              </p>
            </div>
          </div>
          <Link
            href="/transparency"
            onClick={onClose}
            className="mt-3 flex w-full items-center justify-center rounded-xl bg-signal-accent px-3 py-2.5 text-xs font-semibold text-white"
          >
            Open transparency
          </Link>
        </div>

        <div className="mt-4">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-signal-muted">
            Demo role
          </p>
          <div className="flex rounded-2xl bg-signal-mist p-1" data-testid="persona-switcher-mobile">
            {PERSONAS.map(([r, label, persona, href]) => (
              <Link
                key={r}
                href={`${href}?persona=${persona}`}
                onClick={() => {
                  setPersonaId(persona);
                  onClose();
                }}
                className={cn(
                  "flex-1 rounded-xl py-2 text-center text-[11px] font-semibold transition",
                  role === r
                    ? "bg-white text-signal-ink shadow-soft"
                    : "text-signal-muted hover:text-signal-ink",
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={signingOut}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-signal-line px-3 py-3 text-sm font-semibold text-signal-ink transition hover:bg-signal-foam disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.9} />
          {signingOut ? "Signing out…" : "Log out"}
        </button>
      </div>
    </div>
  );
}
