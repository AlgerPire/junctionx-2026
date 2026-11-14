"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Compass,
  MessagesSquare,
  Mic2,
  Sparkles,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ApproachBudgetMeter } from "@/components/match/ApproachBudgetMeter";
import { SuggestionCard } from "@/components/match/SuggestionCard";
import { WhyPanel } from "@/components/match/WhyPanel";
import { SeekerInvitations } from "@/components/seeker/SeekerInvitations";
import { AppShell } from "@/components/shared/AppShell";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import type { Brief, Suggestion, SuggestionsResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const browse = browseQuery.data ?? [];

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
      <section className="relative overflow-hidden rounded-[22px] border border-signal-line/60 bg-white shadow-soft sm:rounded-[28px]">
        <div className="grid lg:grid-cols-[1.45fr_1fr]">
          <div className="relative overflow-hidden px-4 py-6 sm:px-7 sm:py-8">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_0%_0%,rgba(47,91,184,0.14),transparent_55%),radial-gradient(ellipse_50%_60%_at_100%_100%,rgba(74,120,214,0.10),transparent_50%)]"
              aria-hidden
            />
            <div className="relative">
              <p className="inline-flex items-center gap-2 rounded-xl bg-signal-accentSoft px-3 py-1 text-xs font-semibold text-signal-accent">
                <Sparkles className="h-3.5 w-3.5" />
                Event matchmaking
              </p>
              <h2 className="mt-3 max-w-xl text-2xl font-extrabold tracking-tight text-signal-ink sm:text-[1.85rem] sm:leading-tight">
                Choose conversations worth having
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-signal-muted sm:text-base">
                Plain-language suggestions explain the fit. You decide whom to approach — nothing is
                hidden if you want to browse everything.
              </p>
              <Link
                href="/seeker/story"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-signal-accent transition hover:text-signal-accentDeep"
              >
                <Mic2 className="h-4 w-4" />
                Review your skill story
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="border-t border-signal-line bg-signal-foam/40 px-4 py-5 sm:px-6 sm:py-6 lg:border-l lg:border-t-0">
            <ApproachBudgetMeter remaining={remaining} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-signal-line/80 bg-white px-3 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-signal-accentSoft text-signal-accent">
                  <MessagesSquare className="h-4 w-4" />
                </span>
                <p className="mt-2 text-xl font-bold text-signal-ink">{suggestions.length || "—"}</p>
                <p className="text-xs text-signal-muted">Suggestions</p>
              </div>
              <div className="rounded-2xl border border-signal-line/80 bg-white px-3 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-signal-tealSoft text-signal-teal">
                  <Ticket className="h-4 w-4" />
                </span>
                <p className="mt-2 text-xl font-bold text-signal-ink">{remaining}</p>
                <p className="text-xs text-signal-muted">Approaches left</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5">
        <SeekerInvitations enabled={personaReady} />
      </div>

      <div className="mt-2 flex flex-col gap-4 sm:mt-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-signal-ink sm:text-xl">
            {tab === "suggested" ? "Suggested for you" : "Browse every brief"}
          </h2>
          <p className="mt-1 text-sm text-signal-muted">
            {tab === "suggested"
              ? "AI assists with the explanation — you choose whom to contact."
              : "Nobody is filtered out. Open any role and decide for yourself."}
          </p>
        </div>

        <div
          className="inline-flex rounded-2xl border border-signal-line bg-white p-1 shadow-soft"
          role="tablist"
          aria-label="Conversation views"
        >
          {(
            [
              { id: "suggested" as const, label: "Suggested", icon: Sparkles },
              { id: "browse" as const, label: "Browse all", icon: Compass },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                tab === id
                  ? "bg-signal-ink text-white"
                  : "text-signal-muted hover:text-signal-ink",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "suggested" ? (
        <section className="mt-5 grid gap-4">
          {suggestionsQuery.isLoading ? (
            <p className="rounded-[22px] border border-dashed border-signal-line bg-white/70 px-5 py-8 text-center text-sm text-signal-muted">
              Loading suggestions…
            </p>
          ) : null}
          {suggestionsQuery.isError ? (
            <p className="rounded-[22px] border border-signal-warn/30 bg-white px-5 py-6 text-sm text-signal-warn">
              Could not load suggestions. Is the API running?
            </p>
          ) : null}
          {!suggestionsQuery.isLoading && suggestions.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-signal-line bg-white/80 px-5 py-8 text-center sm:px-8">
              <p className="text-base font-semibold text-signal-ink">No suggestions yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-signal-muted">
                Approve a skill story to unlock fit notes — or browse every brief. Nothing is hidden.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/seeker/story"
                  className="inline-flex items-center gap-2 rounded-2xl bg-signal-accent px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Create skill story
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setTab("browse")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-signal-line bg-white px-4 py-2.5 text-sm font-semibold text-signal-ink"
                >
                  Browse all
                </button>
              </div>
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
        <section className="mt-5 grid gap-3 sm:gap-4">
          {browseQuery.isLoading ? (
            <p className="rounded-[22px] border border-dashed border-signal-line bg-white/70 px-5 py-8 text-center text-sm text-signal-muted">
              Loading briefs…
            </p>
          ) : null}
          {browseQuery.isError ? (
            <p className="rounded-[22px] border border-signal-warn/30 bg-white px-5 py-6 text-sm text-signal-warn">
              Could not load briefs.
            </p>
          ) : null}
          {!browseQuery.isLoading && browse.length === 0 ? (
            <p className="rounded-[22px] border border-dashed border-signal-line bg-white/80 px-5 py-8 text-center text-sm text-signal-muted">
              No published briefs yet for this event.
            </p>
          ) : null}
          {browse.map((b) => (
            <Link
              key={b.id}
              href={`/seeker/event/${b.id}`}
              className="group rounded-[22px] border border-signal-line/80 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-signal-accent/35 hover:shadow-glass sm:rounded-[24px] sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-accent">
                    {b.company_name}
                  </p>
                  <h3 className="mt-1 font-display text-xl tracking-tight text-signal-ink group-hover:text-signal-accent">
                    {b.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-signal-muted">
                    {b.plain_summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {b.skills.slice(0, 4).map((s) => (
                      <span
                        key={s.skill_id}
                        className="rounded-lg bg-signal-foam px-2 py-1 text-[11px] font-medium text-signal-ink/75"
                      >
                        {s.label}
                      </span>
                    ))}
                    {b.skills.length > 4 ? (
                      <span className="rounded-lg bg-signal-foam px-2 py-1 text-[11px] font-medium text-signal-muted">
                        +{b.skills.length - 4}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-signal-line bg-signal-foam text-signal-muted transition group-hover:border-signal-accent/40 group-hover:bg-signal-accentSoft group-hover:text-signal-accent">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-xs text-signal-muted">
                {b.work_mode}
                {b.relocation_support ? " · Relocation support" : ""}
                {b.international_ok ? " · International OK" : ""}
              </p>
            </Link>
          ))}
        </section>
      )}

      <WhyPanel suggestion={why} open={!!why} onClose={() => setWhy(null)} />
    </AppShell>
  );
}
