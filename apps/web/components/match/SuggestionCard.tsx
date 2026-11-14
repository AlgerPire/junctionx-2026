"use client";

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

  return (
    <article className="glass-card p-5" data-testid="suggestion-card">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-lg px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
            suggestion.bucket === "strong" && "bg-signal-tealSoft text-signal-teal",
            suggestion.bucket === "good" && "bg-signal-accentSoft text-signal-accent",
            suggestion.bucket === "explore" && "bg-amber-50 text-signal-warn",
          )}
        >
          {BUCKET_LABEL[suggestion.bucket]}
        </span>
        <span className="text-xs text-signal-muted">AI-assisted, you decide</span>
      </div>
      <h3 className="mt-3 font-display text-xl text-signal-ink">
        {suggestion.company_name ?? `Brief #${suggestion.brief_id}`}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-signal-ink/85">{overview}</p>
      {suggestion.gaps_summary ? (
        <p className="mt-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-signal-ink/80">
          {suggestion.gaps_summary}
        </p>
      ) : null}
      <ul className="mt-3 space-y-1.5">
        {suggestion.reasons
          .filter((r) => r.type === "direct" || r.type === "transferable")
          .slice(0, 2)
          .map((r, i) => (
            <li key={i} className="text-sm text-signal-ink/80">
              · {r.text}
            </li>
          ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="suggestion-why"
          onClick={onWhy}
          className="rounded-xl border border-signal-line px-4 py-2 text-sm font-medium text-signal-ink"
        >
          Why?
        </button>
        {onAsk ? (
          <button
            type="button"
            data-testid="suggestion-ask"
            disabled={askDisabled}
            onClick={onAsk}
            className="rounded-xl bg-signal-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Ask to talk
          </button>
        ) : null}
      </div>
    </article>
  );
}
