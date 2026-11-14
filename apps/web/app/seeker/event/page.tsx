"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Compass, Mic2, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ApproachBudgetMeter } from "@/components/match/ApproachBudgetMeter";
import { SuggestionCard } from "@/components/match/SuggestionCard";
import { WhyPanel } from "@/components/match/WhyPanel";
import { SeekerInvitations } from "@/components/seeker/SeekerInvitations";
import { AppShell } from "@/components/shared/AppShell";
import { ApiError, apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import type { Brief, Suggestion, SuggestionsResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SeekerEventPage() {
  const [tab, setTab] = useState<"suggested" | "browse">("suggested");
  const [why, setWhy] = useState<Suggestion | null>(null);
  const [personaReady, setPersonaReady] = useState(false);
  const [askFlash, setAskFlash] = useState<{
    kind: "ok" | "err";
    title: string;
    detail?: string;
  } | null>(null);
  const [askingBriefId, setAskingBriefId] = useState<number | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("persona") ?? getPersonaId() ?? "seeker_demo_a";
    setPersonaId(p);
    setPersonaReady(true);
  }, []);

  useEffect(() => {
    if (!askFlash || askFlash.kind !== "ok") return;
    const t = window.setTimeout(() => setAskFlash(null), 4500);
    return () => window.clearTimeout(t);
  }, [askFlash]);

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
    mutationFn: async (briefId: number) => {
      setAskingBriefId(briefId);
      return apiFetch<{ id: number; brief_id: number; status: string; brief_title?: string | null }>(
        "/api/approaches",
        {
          method: "POST",
          body: JSON.stringify({ brief_id: briefId }),
        },
      );
    },
    onSuccess: (data, briefId) => {
      setAskingBriefId(null);
      const prevStatus = suggestions.find((s) => s.brief_id === briefId)?.approach_status;
      const wasNew = !prevStatus || !["requested", "accepted"].includes(prevStatus);
      const company =
        suggestions.find((s) => s.brief_id === data.brief_id)?.company_name ??
        data.brief_title ??
        "this company";
      setAskFlash({
        kind: "ok",
        title: wasNew ? "Request sent" : "Already requested",
        detail: wasNew
          ? `You asked to talk with ${company}. They’ll see it in their inbox.`
          : `You already asked to talk with ${company}.`,
      });
      qc.setQueryData<SuggestionsResponse>(["suggestions", getPersonaId()], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          budget_remaining:
            wasNew && prev.budget_remaining != null
              ? Math.max(0, prev.budget_remaining - 1)
              : prev.budget_remaining,
          suggestions: prev.suggestions.map((s) =>
            s.brief_id === data.brief_id
              ? { ...s, approach_status: data.status }
              : s,
          ),
        };
      });
      void qc.invalidateQueries({ queryKey: ["suggestions"] });
    },
    onError: (err) => {
      setAskingBriefId(null);
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not send request";
      setAskFlash({
        kind: "err",
        title: "Couldn’t ask to talk",
        detail: message,
      });
    },
  });

  return (
    <AppShell role="seeker" title="Conversations" subtitle="Pick who to meet — you decide.">
      {/* Compact toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-2xl border border-signal-line bg-white p-1 shadow-soft"
          role="tablist"
          aria-label="Views"
        >
          {(
            [
              { id: "suggested" as const, label: "Suggested", icon: Sparkles },
              { id: "browse" as const, label: "Browse", icon: Compass },
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

        <div className="flex flex-wrap items-center gap-2">
          <ApproachBudgetMeter remaining={remaining} compact />
          <Link
            href="/seeker/story"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-signal-line bg-white px-3 py-2 text-xs font-semibold text-signal-ink shadow-soft transition hover:border-signal-accent/40"
          >
            <Mic2 className="h-3.5 w-3.5 text-signal-accent" />
            Skill story
          </Link>
        </div>
      </div>

      {askFlash ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-soft animate-modal-panel",
            askFlash.kind === "ok"
              ? "border-signal-teal/30 bg-signal-tealSoft/70 text-signal-ink"
              : "border-signal-warn/35 bg-amber-50 text-signal-ink",
          )}
        >
          {askFlash.kind === "ok" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-signal-teal" />
          ) : (
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal-warn/15 text-xs font-bold text-signal-warn">
              !
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{askFlash.title}</p>
            {askFlash.detail ? (
              <p className="mt-0.5 text-sm leading-relaxed text-signal-ink/75">{askFlash.detail}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            className="rounded-full p-1 text-signal-muted hover:bg-white/70 hover:text-signal-ink"
            onClick={() => setAskFlash(null)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="mt-5">
        <SeekerInvitations enabled={personaReady} />
      </div>

      {tab === "suggested" ? (
        <section className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
          {suggestionsQuery.isLoading ? (
            <p className="col-span-full rounded-2xl border border-dashed border-signal-line bg-white/70 px-4 py-8 text-center text-sm text-signal-muted">
              Loading…
            </p>
          ) : null}
          {suggestionsQuery.isError ? (
            <p className="col-span-full rounded-2xl border border-signal-warn/30 bg-white px-4 py-5 text-sm text-signal-warn">
              Could not load suggestions.
            </p>
          ) : null}
          {!suggestionsQuery.isLoading && suggestions.length === 0 ? (
            <div className="col-span-full rounded-[22px] border border-dashed border-signal-line bg-white px-5 py-10 text-center">
              <p className="text-base font-bold text-signal-ink">No suggestions yet</p>
              <p className="mt-1 text-sm text-signal-muted">Finish a skill story, or browse all roles.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link
                  href="/seeker/story"
                  className="inline-flex items-center gap-2 rounded-2xl bg-signal-accent px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Skill story
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setTab("browse")}
                  className="rounded-2xl border border-signal-line bg-white px-4 py-2.5 text-sm font-semibold text-signal-ink"
                >
                  Browse
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
              askPending={askingBriefId === s.brief_id}
              onAsk={() => ask.mutate(s.brief_id)}
            />
          ))}
        </section>
      ) : (
        <section className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
          {browseQuery.isLoading ? (
            <p className="col-span-full rounded-2xl border border-dashed border-signal-line bg-white/70 px-4 py-8 text-center text-sm text-signal-muted">
              Loading…
            </p>
          ) : null}
          {browseQuery.isError ? (
            <p className="col-span-full rounded-2xl border border-signal-warn/30 bg-white px-4 py-5 text-sm text-signal-warn">
              Could not load briefs.
            </p>
          ) : null}
          {!browseQuery.isLoading && browse.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-dashed border-signal-line bg-white px-4 py-8 text-center text-sm text-signal-muted">
              No published roles yet.
            </p>
          ) : null}
          {browse.map((b) => (
            <Link
              key={b.id}
              href={`/seeker/event/${b.id}`}
              className="group flex flex-col rounded-[22px] border border-signal-line/80 bg-white p-4 shadow-soft transition hover:border-signal-accent/35 hover:shadow-glass sm:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold uppercase tracking-wide text-signal-accent">
                    {b.company_name}
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-base font-bold tracking-tight text-signal-ink group-hover:text-signal-accent sm:text-lg">
                    {b.title}
                  </h3>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-foam text-signal-muted transition group-hover:bg-signal-accentSoft group-hover:text-signal-accent">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
              {b.skills.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {b.skills.slice(0, 3).map((s) => (
                    <span
                      key={s.skill_id}
                      className="rounded-lg bg-signal-foam px-2 py-1 text-[11px] font-medium text-signal-ink/75"
                    >
                      {s.label}
                    </span>
                  ))}
                  {b.skills.length > 3 ? (
                    <span className="rounded-lg bg-signal-foam px-2 py-1 text-[11px] text-signal-muted">
                      +{b.skills.length - 3}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <p className="mt-auto pt-3 text-xs text-signal-muted">{b.work_mode}</p>
            </Link>
          ))}
        </section>
      )}

      <WhyPanel suggestion={why} open={!!why} onClose={() => setWhy(null)} />
    </AppShell>
  );
}
