"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ApproachBudgetMeter } from "@/components/match/ApproachBudgetMeter";
import { SuggestionCard } from "@/components/match/SuggestionCard";
import { WhyPanel } from "@/components/match/WhyPanel";
import { AppShell } from "@/components/shared/AppShell";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import type { Brief, Suggestion, SuggestionsResponse } from "@/lib/types";

export default function SeekerEventPage() {
  const [tab, setTab] = useState<"suggested" | "browse">("suggested");
  const [why, setWhy] = useState<Suggestion | null>(null);
  const [personaReady, setPersonaReady] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("persona") ?? getPersonaId() ?? "seeker_demo_a";
    setPersonaId(p);
    setPersonaReady(true);
  }, []);

  const suggestionsQuery = useQuery({
    queryKey: ["suggestions", getPersonaId()],
    enabled: personaReady && tab === "suggested",
    queryFn: () => apiFetch<SuggestionsResponse>("/api/suggestions/seeker"),
  });

  const browseQuery = useQuery({
    queryKey: ["browse-briefs", getPersonaId()],
    enabled: personaReady && tab === "browse",
    queryFn: () => apiFetch<Brief[]>("/api/browse/briefs"),
  });

  const remaining = suggestionsQuery.data?.budget_remaining ?? 5;
  const suggestions = suggestionsQuery.data?.suggestions ?? [];

  const ask = useMutation({
    mutationFn: (briefId: number) =>
      apiFetch("/api/approaches", {
        method: "POST",
        body: JSON.stringify({ brief_id: briefId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });

  return (
    <AppShell
      role="seeker"
      title="Conversations"
      subtitle="Suggestions with reasons — browse everything, hide nothing."
    >
      <Link
        href="/seeker/story"
        className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-signal-accent/30 bg-signal-accentSoft/60 px-4 py-3 transition hover:bg-signal-accentSoft"
      >
        <div>
          <p className="text-sm font-semibold text-signal-accent">Skill story</p>
          <p className="text-sm text-signal-ink/70">Update or review the evidenced skills companies can see.</p>
        </div>
        <span className="text-sm font-semibold text-signal-accent">Open →</span>
      </Link>

      <ApproachBudgetMeter remaining={remaining} />

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("suggested")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            tab === "suggested" ? "bg-signal-ink text-white" : "border border-signal-line bg-white"
          }`}
        >
          Suggested
        </button>
        <button
          type="button"
          onClick={() => setTab("browse")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            tab === "browse" ? "bg-signal-ink text-white" : "border border-signal-line bg-white"
          }`}
        >
          Browse all
        </button>
      </div>

      {tab === "suggested" ? (
        <section className="mt-6 grid gap-4">
          {suggestionsQuery.isLoading ? (
            <p className="text-sm text-signal-ink/60">Loading suggestions…</p>
          ) : null}
          {suggestionsQuery.isError ? (
            <p className="text-sm text-signal-warn">
              Could not load suggestions. Is the API running?
            </p>
          ) : null}
          {!suggestionsQuery.isLoading && suggestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-signal-line p-6 text-sm text-signal-ink/70">
              No approved skill story yet, or no matches in the explore+ range.{" "}
              <Link href="/seeker/story" className="underline">
                Create your skill story
              </Link>{" "}
              or use Browse all — nothing is hidden.
            </div>
          ) : null}
          {suggestions.map((s) => (
            <SuggestionCard
              key={`${s.brief_id}-${s.seeker_id}`}
              suggestion={s}
              onWhy={() => setWhy(s)}
              askDisabled={remaining <= 0 || ask.isPending}
              onAsk={() => ask.mutate(s.brief_id)}
            />
          ))}
        </section>
      ) : (
        <section className="mt-6 grid gap-4">
          {browseQuery.data?.map((b) => (
            <Link
              key={b.id}
              href={`/seeker/event/${b.id}`}
              className="rounded-2xl border border-signal-line/80 bg-white/80 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-signal-accent">
                {b.company_name}
              </p>
              <h3 className="mt-1 font-display text-xl">{b.title}</h3>
              <p className="mt-2 text-sm text-signal-ink/70">{b.plain_summary}</p>
            </Link>
          ))}
        </section>
      )}

      <WhyPanel suggestion={why} open={!!why} onClose={() => setWhy(null)} />
    </AppShell>
  );
}
