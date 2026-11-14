"use client";

import type { Suggestion } from "@/lib/types";

export function WhyPanel({
  suggestion,
  open,
  onClose,
}: {
  suggestion: Suggestion | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !suggestion) return null;

  const fitReasons = suggestion.reasons.filter(
    (r) => r.type === "direct" || r.type === "transferable" || r.type === "learnable_gap",
  );
  const gapReasons = suggestion.reasons.filter((r) => r.type === "consideration");

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-signal-ink/30" role="dialog" aria-modal>
      <button className="flex-1 cursor-default" aria-label="Close" onClick={onClose} />
      <aside data-testid="why-panel" className="h-full w-full max-w-md overflow-y-auto bg-signal-foam p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl text-signal-ink">Why this suggestion?</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-signal-line px-3 py-1 text-sm"
          >
            Close
          </button>
        </div>

        {suggestion.overview ? (
          <div className="mb-5 rounded-xl border border-signal-accent/25 bg-signal-accentSoft/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-signal-accent">
              AI overview
            </p>
            <p className="mt-2 text-sm leading-relaxed text-signal-ink">{suggestion.overview}</p>
          </div>
        ) : null}

        {suggestion.fit_summary ? (
          <div className="mb-4">
            <p className="text-sm font-semibold text-signal-ink">Why it fits</p>
            <p className="mt-1 text-sm text-signal-ink/80">{suggestion.fit_summary}</p>
          </div>
        ) : null}

        {suggestion.gaps_summary ? (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/80 p-3">
            <p className="text-sm font-semibold text-signal-ink">Why not a perfect fit</p>
            <p className="mt-1 text-sm text-signal-ink/80">{suggestion.gaps_summary}</p>
          </div>
        ) : null}

        <p className="mb-2 text-sm font-semibold text-signal-ink">Supporting reasons</p>
        <ul className="space-y-3">
          {fitReasons.map((r, i) => (
            <li key={`fit-${i}`} className="rounded-xl border border-signal-line/70 bg-white p-3">
              <p className="text-sm font-semibold capitalize text-signal-accent">
                {r.type.replace("_", " ")}
              </p>
              <p className="mt-1 text-sm text-signal-ink">{r.text}</p>
              {r.evidence_quote ? (
                <p className="mt-2 border-l-2 border-signal-accent/40 pl-3 text-sm italic text-signal-ink/70">
                  “{r.evidence_quote}”
                </p>
              ) : null}
            </li>
          ))}
          {gapReasons.map((r, i) => (
            <li key={`gap-${i}`} className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3">
              <p className="text-sm font-semibold text-signal-warn">Consideration</p>
              <p className="mt-1 text-sm text-signal-ink">{r.text}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-3 text-sm">
          <div>
            <p className="font-semibold text-signal-ink">Data used</p>
            <p className="text-signal-ink/70">{suggestion.data_used.join(", ")}</p>
          </div>
          <div>
            <p className="font-semibold text-signal-ink">Data not used</p>
            <p className="text-signal-ink/70">
              Name, nationality, age, gender, school, university, photo, address.
            </p>
          </div>
          <p className="rounded-xl bg-signal-accentSoft px-3 py-2 text-signal-accent">
            You decide. Nobody is rejected automatically.
          </p>
        </div>
      </aside>
    </div>
  );
}
