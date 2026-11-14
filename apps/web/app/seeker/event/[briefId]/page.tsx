"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/shared/AppShell";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import type { Brief } from "@/lib/types";

export default function BriefDetailPage() {
  const params = useParams<{ briefId: string }>();
  const id = Number(params.briefId);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setPersonaId(getPersonaId() ?? "seeker_demo_a");
    setReady(true);
  }, []);

  const brief = useQuery({
    queryKey: ["brief", id],
    enabled: ready && !!id,
    queryFn: () => apiFetch<Brief>(`/api/briefs/${id}`),
  });

  const queue = useQuery({
    queryKey: ["queue", id],
    enabled: ready && !!id,
    queryFn: () => apiFetch<{ position: number; est_minutes: number }>(`/api/queue/${id}`),
  });

  const b = brief.data;
  return (
    <AppShell title="Conversation brief">
      {b ? (
        <article className="space-y-4 rounded-2xl border border-signal-line/80 bg-white/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-signal-accent">
            {b.company_name}
          </p>
          <h1 className="font-display text-3xl">{b.title}</h1>
          <p className="text-signal-ink/80">{b.plain_summary}</p>
          <p className="text-sm">
            <span className="font-semibold">90-day problem:</span> {b.problem_90_days}
          </p>
          <div className="flex flex-wrap gap-2">
            {b.skills.map((s) => (
              <span key={`${s.skill_id}-${s.importance}`} className="rounded-lg border border-signal-line px-2 py-1 text-xs">
                {s.label} · {s.importance}
              </span>
            ))}
          </div>
          <div className="rounded-xl bg-signal-accentSoft p-4 text-sm">
            <p className="font-semibold text-signal-accent">International readiness</p>
            <p className="mt-1">
              Relocation: {b.relocation_support ? "Yes" : "No"} · Mode: {b.work_mode}
            </p>
            <p className="mt-1 text-signal-ink/70">{b.onboarding_support}</p>
          </div>
          {queue.data ? (
            <p className="text-sm text-signal-ink/60">
              Queue estimate: position {queue.data.position}, ~{queue.data.est_minutes} min
            </p>
          ) : null}
        </article>
      ) : (
        <p className="text-sm">Loading…</p>
      )}
    </AppShell>
  );
}
