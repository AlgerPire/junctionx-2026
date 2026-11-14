"use client";

import { ArrowRight, HelpCircle } from "lucide-react";
import Link from "next/link";

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
}: {
  suggestion: Suggestion;
  onWhy: () => void;
  onAsk?: () => void;
  askDisabled?: boolean;
}) {
  const overview =
    suggestion.overview ??
    suggestion.fit_summary ??
    suggestion.brief_summary ??
    "Suggested conversation based on evidenced skills.";

  const reasons = suggestion.reasons
    .filter((r) => r.type === "direct" || r.type === "transferable")
    .slice(0, 2);

  return (
    <article
      className="rounded-[22px] border border-signal-line/80 bg-white p-4 shadow-soft sm:rounded-[24px] sm:p-5"
      data-testid="suggestion-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
            suggestion.bucket === "strong" && "bg-signal-tealSoft text-signal-teal",
            suggestion.bucket === "good" && "bg-signal-accentSoft text-signal-accent",
            suggestion.bucket === "explore" && "bg-amber-50 text-signal-warn",
          )}
        >
          {BUCKET_LABEL[suggestion.bucket]}
        </span>
        <span className="text-xs text-signal-muted">AI-assisted · you decide</span>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-xl tracking-tight text-signal-ink">
            {suggestion.company_name ?? `Brief #${suggestion.brief_id}`}
          </h3>
          {suggestion.brief_summary ? (
            <p className="mt-1 text-sm font-medium text-signal-ink/70">{suggestion.brief_summary}</p>
          ) : null}
        </div>
        <Link
          href={`/seeker/event/${suggestion.brief_id}`}
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-signal-line bg-signal-foam text-signal-muted transition hover:border-signal-accent/40 hover:bg-signal-accentSoft hover:text-signal-accent"
          aria-label="Open brief"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-signal-ink/85">{overview}</p>

      {suggestion.gaps_summary ? (
        <p className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm text-signal-ink/80">
          {suggestion.gaps_summary}
        </p>
      ) : null}

      {reasons.length ? (
        <ul className="mt-3 space-y-2">
          {reasons.map((r, i) => (
            <li
              key={i}
              className="flex gap-2 rounded-xl bg-signal-foam/80 px-3 py-2 text-sm text-signal-ink/80"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-accent" />
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          data-testid="suggestion-why"
          onClick={onWhy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-signal-line bg-white px-4 py-2.5 text-sm font-medium text-signal-ink transition hover:border-signal-accent/40"
        >
          <HelpCircle className="h-4 w-4 text-signal-muted" />
          Why this suggestion?
        </button>
        {onAsk ? (
          <button
            type="button"
            data-testid="suggestion-ask"
            disabled={askDisabled}
            onClick={onAsk}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-signal-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-signal-accentDeep disabled:opacity-40"
          >
            Ask to talk
            <ArrowRight className="h-4 w-4 opacity-80" />
          </button>
        ) : null}
      </div>
    </article>
  );
}
