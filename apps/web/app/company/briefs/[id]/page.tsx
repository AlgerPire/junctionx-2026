"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/shared/AppShell";
import { SuggestionCard } from "@/components/match/SuggestionCard";
import { WhyPanel } from "@/components/match/WhyPanel";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import type { Brief, Suggestion } from "@/lib/types";

export default function CompanyBriefDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const qc = useQueryClient();
  const [why, setWhy] = useState<Suggestion | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPersonaId(getPersonaId() ?? "company_demo");
    setReady(true);
  }, []);

  const briefQuery = useQuery({
    queryKey: ["brief", id],
    enabled: ready && !!id,
    queryFn: () => apiFetch<Brief>(`/api/briefs/${id}`),
  });

  const candidatesQuery = useQuery({
    queryKey: ["brief-suggestions", id],
    enabled: ready && !!id,
    queryFn: () => apiFetch<Suggestion[]>(`/api/suggestions/brief/${id}`),
  });

  const publish = useMutation({
    mutationFn: () => apiFetch(`/api/briefs/${id}/publish`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brief", id] }),
  });

  const brief = briefQuery.data;

  return (
    <AppShell title="Brief detail">
      {brief ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-signal-line/80 bg-white/80 p-5">
            <h1 className="font-display text-3xl">{brief.title}</h1>
            <p className="mt-2 text-signal-ink/75">{brief.plain_summary}</p>
            <p className="mt-4 text-sm">
              <span className="font-semibold">90-day problem:</span> {brief.problem_90_days}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {brief.skills.map((s) => (
                <span
                  key={`${s.skill_id}-${s.importance}`}
                  className="rounded-lg border border-signal-line px-2 py-1 text-xs"
                >
                  {s.label} · {s.importance}
                </span>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-signal-accentSoft p-4 text-sm">
              <p className="font-semibold text-signal-accent">International readiness</p>
              <p className="mt-1 text-signal-ink/80">
                International OK: {brief.international_ok ? "Yes" : "No"} · Relocation support:{" "}
                {brief.relocation_support ? "Yes" : "No"}
              </p>
              <p className="mt-1 text-signal-ink/70">{brief.onboarding_support}</p>
            </div>
            {brief.status !== "published" ? (
              <button
                type="button"
                onClick={() => publish.mutate()}
                className="mt-4 rounded-xl bg-signal-accent px-4 py-2 text-sm font-semibold text-white"
              >
                Publish
              </button>
            ) : (
              <p className="mt-4 text-xs text-signal-ink/50">Published · AI-assisted, you decide</p>
            )}
          </section>

          <section>
            <h2 className="font-display text-2xl">Suggested candidates</h2>
            <p className="mt-1 text-sm text-signal-ink/60">Alias + approved story only. No names until you accept.</p>
            <div className="mt-4 grid gap-4">
              {candidatesQuery.data?.map((s) => (
                <SuggestionCard
                  key={`${s.seeker_id}-${s.brief_id}`}
                  suggestion={{
                    ...s,
                    company_name: s.seeker_alias ?? `Seeker #${s.seeker_id}`,
                  }}
                  onWhy={() => setWhy(s)}
                />
              ))}
            </div>
          </section>
        </div>
      ) : (
        <p className="text-sm">Loading…</p>
      )}
      <WhyPanel suggestion={why} open={!!why} onClose={() => setWhy(null)} />
    </AppShell>
  );
}
