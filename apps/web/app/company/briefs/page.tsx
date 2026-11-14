"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/shared/AppShell";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import type { Brief } from "@/lib/types";

export default function CompanyBriefsPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const p =
      new URLSearchParams(window.location.search).get("persona") ??
      getPersonaId() ??
      "company_demo";
    setPersonaId(p);
    setReady(true);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["company-briefs", getPersonaId()],
    enabled: ready,
    queryFn: () => apiFetch<Brief[]>("/api/briefs"),
  });

  return (
    <AppShell
      role="company"
      title="My briefs"
      subtitle="AI-assisted drafts. You edit and publish."
    >
      <div className="mb-5 flex justify-end">
        <Link
          href="/company/brief/new"
          className="rounded-2xl bg-signal-accent px-4 py-2.5 text-sm font-semibold text-white"
        >
          New voice brief
        </Link>
      </div>
      {isLoading ? <p className="text-sm text-signal-muted">Loading…</p> : null}
      {isError ? <p className="text-sm text-signal-warn">API unavailable</p> : null}
      <div className="grid gap-4">
        {data?.map((b) => (
          <Link key={b.id} href={`/company/briefs/${b.id}`} className="glass-card block p-5 transition hover:shadow-glass">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl text-signal-ink">{b.title}</h2>
              <span className="rounded-full bg-signal-accentSoft px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-signal-accent">
                {b.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-signal-muted">{b.plain_summary}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
