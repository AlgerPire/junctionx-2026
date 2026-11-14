"use client";

import { ArrowRight, CheckCircle2, HelpCircle, Loader2 } from "lucide-react";
import Link from "next/link";

import { FitMeter } from "@/components/match/FitMeter";
import type { Suggestion } from "@/lib/types";
import { cn } from "@/lib/utils";

const BUCKET_LABEL = {
  strong: "Strong",
  good: "Good",
  explore: "Explore",
} as const;

export function SuggestionCard({
  suggestion,
  onWhy,
  onAsk,
  askDisabled,
  askPending,
}: {
  suggestion: Suggestion;
  onWhy: () => void;
  onAsk?: () => void;
  askDisabled?: boolean;
  askPending?: boolean;
}) {
  const blurb =
    suggestion.fit_summary ??
    suggestion.overview ??
    suggestion.brief_summary ??
    null;
  const pct = suggestion.skill_overlap_pct;
  const asked =
    suggestion.approach_status === "requested" ||
    suggestion.approach_status === "accepted";
  const askLabel =
    suggestion.approach_status === "accepted"
      ? "Accepted"
      : suggestion.approach_status === "requested"
        ? "Asked"
        : "Ask to talk";

  return (
    <article
      className="group rounded-[22px] border border-signal-line/80 bg-white p-4 shadow-soft transition hover:border-signal-accent/30 hover:shadow-glass sm:p-5"
      data-testid="suggestion-card"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:text-[11px]",
                suggestion.bucket === "strong" && "bg-signal-tealSoft text-signal-teal",
                suggestion.bucket === "good" && "bg-signal-accentSoft text-signal-accent",
                suggestion.bucket === "explore" && "bg-amber-50 text-signal-warn",
              )}
            >
              {BUCKET_LABEL[suggestion.bucket]}
            </span>
            {pct != null ? (
              <span className="text-[11px] font-medium text-signal-muted">
                {pct}% skill overlap
              </span>
            ) : null}
            {asked ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-signal-tealSoft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-signal-teal">
                <CheckCircle2 className="h-3 w-3" />
                {suggestion.approach_status === "accepted" ? "Accepted" : "Requested"}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold tracking-tight text-signal-ink sm:text-lg">
                {suggestion.company_name ?? `Brief #${suggestion.brief_id}`}
              </h3>
              {suggestion.brief_summary ? (
                <p className="mt-0.5 truncate text-sm text-signal-muted">{suggestion.brief_summary}</p>
              ) : null}
            </div>
            <Link
              href={`/seeker/event/${suggestion.brief_id}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-signal-line bg-signal-foam text-signal-muted transition hover:border-signal-accent/40 hover:bg-signal-accentSoft hover:text-signal-accent"
              aria-label="Open brief"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {blurb ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-signal-ink/75">{blurb}</p>
          ) : null}
        </div>
        {pct != null ? (
          <FitMeter
            pct={pct}
            bucket={suggestion.bucket}
            covered={suggestion.must_have_covered}
            total={suggestion.must_have_total}
            className="hidden sm:flex"
          />
        ) : null}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          data-testid="suggestion-why"
          onClick={onWhy}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-signal-line bg-white px-3 py-2.5 text-sm font-medium text-signal-ink transition hover:border-signal-accent/40 sm:flex-none sm:px-4"
        >
          <HelpCircle className="h-4 w-4 text-signal-muted" />
          Why?
        </button>
        {onAsk ? (
          <button
            type="button"
            data-testid="suggestion-ask"
            disabled={askDisabled || askPending || asked}
            onClick={onAsk}
            className={cn(
              "inline-flex flex-[1.4] items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-4",
              asked
                ? "border border-signal-teal/30 bg-signal-tealSoft text-signal-teal"
                : "bg-signal-accent text-white hover:bg-signal-accentDeep disabled:opacity-40",
            )}
          >
            {askPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : asked ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {askLabel}
              </>
            ) : (
              <>
                Ask to talk
                <ArrowRight className="h-4 w-4 opacity-80" />
              </>
            )}
          </button>
        ) : null}
      </div>
    </article>
  );
}
