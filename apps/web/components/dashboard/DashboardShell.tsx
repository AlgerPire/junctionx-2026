"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

import { PageLoader } from "@/components/shared/PageLoader";
import { getPersonaId, setPersonaId } from "@/lib/api";
import { ROLE_META, type AppRole } from "@/lib/nav";

import { FooterNote, PageWaves } from "./PageWaves";
import { Sidebar } from "./Sidebar";

export function DashboardShell({
  role,
  title,
  subtitle,
  children,
}: {
  role: AppRole;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const meta = ROLE_META[role];
  const seeker = role === "seeker";

  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("persona");
    setPersonaId(fromQuery ?? getPersonaId() ?? meta.personaDefault);
    setReady(true);
  }, [meta.personaDefault]);

  if (!ready) {
    return (
      <div className="min-h-screen" data-theme={seeker ? "seeker" : undefined}>
        <PageLoader />
      </div>
    );
  }

  return (
    <div
      className="dash-bg relative flex h-dvh max-h-dvh overflow-hidden"
      data-theme={seeker ? "seeker" : undefined}
    >
      <PageWaves variant={seeker ? "seeker" : "company"} />
      <div className="relative z-10 hidden h-full shrink-0 flex-col p-4 pr-0 md:flex">
        <Sidebar role={role} />
      </div>
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex shrink-0 items-start justify-between gap-4 px-5 pb-2 pt-8 sm:px-8 lg:px-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-signal-ink sm:text-[40px] sm:leading-[1.1]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-2xl text-base text-signal-muted sm:text-lg">{subtitle}</p>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-[var(--signal-orb-from)] to-[var(--signal-orb-to)] text-lg font-semibold text-white shadow-glass">
              {meta.title.slice(0, 1)}
            </div>
          </div>
        </header>
        <main id="main" className="relative flex-1 px-5 py-6 sm:px-8 lg:px-10">
          {children}
        </main>
        <FooterNote>
          {seeker
            ? "Your words. Your evidence. You choose who hears it."
            : "AI helps people explain themselves. Humans decide who to talk to."}
        </FooterNote>
      </div>
    </div>
  );
}
