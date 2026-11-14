"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageLoader } from "@/components/shared/PageLoader";
import { getPersonaId, setPersonaId } from "@/lib/api";
import { personaForRole, ROLE_META, type AppRole } from "@/lib/nav";
import { cn } from "@/lib/utils";

import { MobileBottomNav, MobileMenuSheet, MobileTopBar } from "./MobileNav";
import { FooterNote, PageWaves } from "./PageWaves";
import { Sidebar } from "./Sidebar";

export function DashboardShell({
  role,
  title,
  subtitle,
  children,
  fitViewport = false,
  hideHeading = false,
}: {
  role: AppRole;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Keep the main column to one screen on desktop — mobile always scrolls. */
  fitViewport?: boolean;
  /** Hide the large page title block (useful when the child already has its own header). */
  hideHeading?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const meta = ROLE_META[role];
  const seeker = role === "seeker";
  const organiser = role === "organiser";
  const theme = seeker ? "seeker" : organiser ? "organiser" : undefined;
  const waveVariant = seeker ? "seeker" : organiser ? "organiser" : "company";

  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("persona");
    setPersonaId(personaForRole(role, fromQuery ?? getPersonaId()));
    setReady(true);
  }, [role]);

  if (!ready) {
    return (
      <div className="min-h-screen" data-theme={theme}>
        <PageLoader />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "dash-bg relative flex overflow-x-hidden",
        // Desktop: lock to viewport when requested. Mobile: natural page height + scroll.
        fitViewport ? "md:h-dvh md:max-h-dvh md:overflow-hidden" : "min-h-dvh",
        "min-h-dvh",
      )}
      data-theme={theme}
    >
      <PageWaves variant={waveVariant} />
      <div className="relative z-10 hidden h-full shrink-0 flex-col p-4 pr-0 md:flex">
        <Sidebar role={role} />
      </div>
      <div
        className={cn(
          "relative z-10 flex min-h-0 min-w-0 flex-1 flex-col",
          fitViewport ? "md:overflow-hidden" : "md:overflow-y-auto",
        )}
      >
        <header
          className={cn(
            "flex shrink-0 flex-col gap-3 px-4 sm:px-6 lg:px-10",
            fitViewport ? "pb-1 pt-3 sm:pt-5" : "pb-2 pt-4 sm:pt-8",
          )}
        >
          <MobileTopBar role={role} onOpenMenu={() => setMenuOpen(true)} />

          {!hideHeading ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1
                  className={cn(
                    "font-extrabold tracking-tight text-signal-ink",
                    fitViewport
                      ? "text-xl leading-snug sm:text-2xl sm:leading-[1.15] lg:text-[32px]"
                      : "text-2xl leading-snug sm:text-3xl sm:leading-[1.1] lg:text-[40px]",
                  )}
                >
                  {title}
                </h1>
                {subtitle ? (
                  <p
                    className={cn(
                      "max-w-2xl text-signal-muted",
                      fitViewport
                        ? "mt-1 text-sm leading-relaxed sm:text-base"
                        : "mt-1.5 text-sm leading-relaxed sm:mt-2 sm:text-base lg:text-lg",
                    )}
                  >
                    {subtitle}
                  </p>
                ) : null}
              </div>
              <div className="hidden shrink-0 items-center gap-4 pt-1 sm:gap-5 md:flex">
                <button
                  type="button"
                  className="relative text-signal-muted transition hover:text-signal-ink"
                  aria-label="Notifications"
                >
                  <Bell className="h-6 w-6" strokeWidth={1.8} />
                  <span className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-signal-bg bg-signal-teal" />
                </button>
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full bg-gradient-to-b from-[var(--signal-orb-from)] to-[var(--signal-orb-to)] font-semibold text-white shadow-glass",
                    fitViewport ? "h-10 w-10 text-base" : "h-11 w-11 text-lg sm:h-12 sm:w-12",
                  )}
                >
                  {meta.title.slice(0, 1)}
                </div>
              </div>
            </div>
          ) : (
            <h1 className="sr-only">{title}</h1>
          )}
        </header>

        <main
          id="main"
          className={cn(
            "relative flex-1 px-4 sm:px-6 lg:px-10",
            // Room for fixed bottom nav + safe area on phones
            "pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-6",
            fitViewport
              ? "flex min-h-0 flex-col py-3 md:overflow-hidden"
              : "py-4 sm:py-6",
          )}
        >
          {children}
        </main>

        <div className="hidden md:block">
          <FooterNote compact={fitViewport}>
            {seeker
              ? "Your words. Your evidence. You choose who hears it."
              : organiser
                ? "Aggregates only. Humans decide how to close the gaps."
                : "AI helps people explain themselves. Humans decide who to talk to."}
          </FooterNote>
        </div>
      </div>

      <MobileBottomNav role={role} />
      <MobileMenuSheet role={role} open={menuOpen} onClose={closeMenu} />
    </div>
  );
}
