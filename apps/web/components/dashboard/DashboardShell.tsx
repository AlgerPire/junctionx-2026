"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

import { PageLoader } from "@/components/shared/PageLoader";
import { getPersonaId, setPersonaId } from "@/lib/api";
import { personaForRole, ROLE_META, type AppRole } from "@/lib/nav";

import { cn } from "@/lib/utils";

import { FooterNote, PageWaves } from "./PageWaves";
import { Sidebar } from "./Sidebar";

export function DashboardShell({
  role,
  title,
  subtitle,
  children,
  fitViewport = false,
}: {
  role: AppRole;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Keep the main column to one screen — no page scroll. */
  fitViewport?: boolean;
}) {
  const [ready, setReady] = useState(false);
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
      className="dash-bg relative flex h-dvh max-h-dvh overflow-hidden"
      data-theme={theme}
    >
      <PageWaves variant={waveVariant} />
      <div className="relative z-10 hidden h-full shrink-0 flex-col p-4 pr-0 md:flex">
        <Sidebar role={role} />
      </div>
      <div
        className={cn(
          "relative z-10 flex min-h-0 min-w-0 flex-1 flex-col",
          fitViewport ? "overflow-hidden" : "overflow-y-auto",
        )}
      >
        <header
          className={cn(
            "flex shrink-0 items-start justify-between gap-4 px-5 sm:px-8 lg:px-10",
            fitViewport ? "pb-1 pt-5" : "pb-2 pt-8",
          )}
        >
          <div>
            <h1
              className={cn(
                "font-extrabold tracking-tight text-signal-ink",
                fitViewport
                  ? "text-2xl sm:text-[32px] sm:leading-[1.15]"
                  : "text-3xl sm:text-[40px] sm:leading-[1.1]",
              )}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                className={cn(
                  "max-w-2xl text-signal-muted",
                  fitViewport ? "mt-1 text-sm sm:text-base" : "mt-2 text-base sm:text-lg",
                )}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-5 pt-1">
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
                fitViewport ? "h-10 w-10 text-base" : "h-12 w-12 text-lg",
              )}
            >
              {meta.title.slice(0, 1)}
            </div>
          </div>
        </header>
        <main
          id="main"
          className={cn(
            "relative flex-1 px-5 sm:px-8 lg:px-10",
            fitViewport ? "flex min-h-0 flex-col overflow-hidden py-3" : "py-6",
          )}
        >
          {children}
        </main>
        <FooterNote compact={fitViewport}>
          {seeker
            ? "Your words. Your evidence. You choose who hears it."
            : organiser
              ? "Aggregates only. Humans decide how to close the gaps."
              : "AI helps people explain themselves. Humans decide who to talk to."}
        </FooterNote>
      </div>
    </div>
  );
}
