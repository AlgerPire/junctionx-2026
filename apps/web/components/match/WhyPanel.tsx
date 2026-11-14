"use client";

import { ShieldCheck, X } from "lucide-react";
import { useEffect, useId } from "react";

import { FitMeter } from "@/components/match/FitMeter";
import type { Suggestion } from "@/lib/types";
import { cn } from "@/lib/utils";

export function WhyPanel({
  suggestion,
  open,
  onClose,
}: {
  suggestion: Suggestion | null;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !suggestion) return null;

  const fitReasons = suggestion.reasons.filter(
    (r) => r.type === "direct" || r.type === "transferable" || r.type === "learnable_gap",
  );
  const gapReasons = suggestion.reasons.filter((r) => r.type === "consideration");
  const pct = suggestion.skill_overlap_pct;

  return (
    <div
      key={`why-${suggestion.brief_id}`}
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-signal-ink/50 backdrop-blur-[3px] animate-modal-backdrop motion-reduce:animate-none"
        aria-label="Close"
        onClick={onClose}
      />

      <div
        data-testid="why-panel"
        className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-signal-line bg-white shadow-glass animate-modal-panel motion-reduce:animate-none sm:max-h-[88dvh] sm:rounded-[28px] sm:animate-modal-panel-desktop"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-signal-line px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-signal-accent">
              Why this suggestion
            </p>
            <h2 id={titleId} className="mt-1 text-xl font-bold tracking-tight text-signal-ink sm:text-2xl">
              {suggestion.company_name ?? `Brief #${suggestion.brief_id}`}
            </h2>
            {suggestion.brief_summary ? (
              <p className="mt-1 line-clamp-2 text-sm text-signal-muted">{suggestion.brief_summary}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-signal-line bg-white text-signal-muted transition hover:bg-signal-foam hover:text-signal-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {pct != null ? (
            <div className="flex items-center gap-4 rounded-2xl border border-signal-accent/20 bg-gradient-to-br from-signal-accentSoft/70 via-white to-signal-tealSoft/40 p-4">
              <FitMeter
                pct={pct}
                bucket={suggestion.bucket}
                covered={suggestion.must_have_covered}
                total={suggestion.must_have_total}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-signal-ink">Skill overlap</p>
                <p className="mt-1 text-sm leading-relaxed text-signal-ink/75">
                  How your approved skill story covers this role’s must-haves (direct + related
                  evidence). Not a hiring score — you decide whether to talk.
                </p>
              </div>
            </div>
          ) : null}

          {suggestion.overview ? (
            <div className="rounded-2xl border border-signal-line/80 bg-signal-foam/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-signal-accent">
                Overview
              </p>
              <p className="mt-2 text-sm leading-relaxed text-signal-ink">{suggestion.overview}</p>
            </div>
          ) : null}

          {suggestion.fit_summary ? (
            <div>
              <p className="text-sm font-semibold text-signal-ink">Why it fits</p>
              <p className="mt-1 text-sm leading-relaxed text-signal-ink/80">{suggestion.fit_summary}</p>
            </div>
          ) : null}

          {suggestion.gaps_summary ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5">
              <p className="text-sm font-semibold text-signal-ink">Why not a perfect fit</p>
              <p className="mt-1 text-sm leading-relaxed text-signal-ink/80">{suggestion.gaps_summary}</p>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-semibold text-signal-ink">Supporting reasons</p>
            <ul className="space-y-2.5">
              {fitReasons.map((r, i) => (
                <li
                  key={`fit-${i}`}
                  className="rounded-2xl border border-signal-line/70 bg-white p-3.5 shadow-soft"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-signal-accent">
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
                <li
                  key={`gap-${i}`}
                  className={cn("rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5")}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-signal-warn">
                    Consideration
                  </p>
                  <p className="mt-1 text-sm text-signal-ink">{r.text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 rounded-2xl border border-signal-line/80 bg-white p-4 text-sm">
            <div>
              <p className="font-semibold text-signal-ink">Data used</p>
              <p className="mt-0.5 text-signal-ink/70">{suggestion.data_used.join(", ")}</p>
            </div>
            <div>
              <p className="font-semibold text-signal-ink">Data not used</p>
              <p className="mt-0.5 text-signal-ink/70">
                Name, nationality, age, gender, school, university, photo, address.
              </p>
            </div>
            <p className="inline-flex items-start gap-2 rounded-xl bg-signal-accentSoft px-3 py-2 text-signal-accent">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>You decide. Nobody is rejected automatically.</span>
            </p>
          </div>
        </div>

        <footer className="shrink-0 border-t border-signal-line px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-signal-ink px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Got it
          </button>
        </footer>
      </div>
    </div>
  );
}
