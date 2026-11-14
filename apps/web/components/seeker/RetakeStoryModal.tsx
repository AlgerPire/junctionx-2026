"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ListChecks,
  Mic2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";

import { cn } from "@/lib/utils";

export interface RetakeStorySnapshot {
  status: string;
  skills: { skill_id: number; label: string; evidence_quote: string }[];
}

const STEPS = [
  { id: "why", label: "Why" },
  { id: "how", label: "How" },
  { id: "confirm", label: "Confirm" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function RetakeStoryModal({
  open,
  story,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  story: RetakeStorySnapshot | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const titleId = useId();
  const [step, setStep] = useState<StepId>("why");
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const skillCount = story?.skills?.length ?? 0;
  const isApproved = story?.status === "approved";
  const skillLabels = (story?.skills ?? []).map((s) => s.label);

  useEffect(() => {
    if (!open) return;
    setStep("why");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, busy]);

  if (!open) return null;

  function next() {
    if (step === "why") setStep("how");
    else if (step === "how") setStep("confirm");
  }

  function back() {
    if (step === "confirm") setStep("how");
    else if (step === "how") setStep("why");
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-signal-ink/45 backdrop-blur-[2px] animate-modal-backdrop"
        aria-label="Close"
        disabled={busy}
        onClick={() => {
          if (!busy) onClose();
        }}
      />

      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-signal-line bg-white shadow-glass animate-modal-panel sm:max-h-[88dvh] sm:rounded-[28px]">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-signal-line px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-signal-accent">
              Skill story
            </p>
            <h2 id={titleId} className="mt-1 text-lg font-bold tracking-tight text-signal-ink sm:text-xl">
              Retake the interview
            </h2>
            <p className="mt-1 text-sm text-signal-muted">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-signal-line bg-white text-signal-muted disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex shrink-0 gap-1.5 px-4 pt-4 sm:px-5">
          {STEPS.map((s, i) => (
            <div key={s.id} className="min-w-0 flex-1">
              <div
                className={cn(
                  "h-1.5 rounded-full transition",
                  i <= stepIndex ? "bg-signal-accent" : "bg-signal-line",
                )}
              />
              <p
                className={cn(
                  "mt-1.5 truncate text-[10px] font-semibold sm:text-[11px]",
                  i <= stepIndex ? "text-signal-accent" : "text-signal-muted",
                )}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {step === "why" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl bg-signal-accentSoft/70 px-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-signal-accent text-white">
                  <RefreshCw className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-signal-ink">Start fresh with new evidence</p>
                  <p className="mt-1 text-sm leading-relaxed text-signal-muted">
                    Use a retake when your situations changed, quotes feel weak, or you want a
                    clearer skill list. Matching only trusts skills you approve with your own words.
                  </p>
                </div>
              </div>
              <ul className="space-y-2.5 text-sm text-signal-ink/85">
                {[
                  "Same short format — about 8–10 minutes",
                  "Voice or typing, with captions",
                  "You still review and approve before anything is shared",
                ].map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-signal-accent" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {step === "how" ? (
            <div className="space-y-3">
              <p className="text-sm text-signal-muted">
                You’ll move through the same three profile steps again:
              </p>
              {[
                {
                  icon: Mic2,
                  title: "1. Talk",
                  text: "Answer about real situations — what you did and what changed.",
                },
                {
                  icon: ListChecks,
                  title: "2. Review",
                  text: "Check every suggested skill and the exact quote that supports it.",
                },
                {
                  icon: Sparkles,
                  title: "3. Share",
                  text: "Approve only when you’re happy. Until then, nothing new is shared.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 rounded-2xl border border-signal-line bg-signal-foam/50 px-3.5 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-signal-accent shadow-soft">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-signal-ink">{title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-signal-muted">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {step === "confirm" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3.5">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-signal-warn" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-signal-ink">Confirm what changes</p>
                  <p className="mt-1 text-sm leading-relaxed text-signal-muted">
                    Review this before starting. You can still cancel.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-signal-line bg-white p-3.5 sm:p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Stays the same
                </p>
                <ul className="mt-2.5 space-y-2 text-sm text-signal-ink/85">
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    Your seeker alias and account
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    Approach budget and past conversation requests
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    Privacy rules — still skills & quotes only for matching
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-red-200/80 bg-red-50/50 p-3.5 sm:p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
                  Needs a new pass / will be replaced
                </p>
                <ul className="mt-2.5 space-y-2 text-sm text-signal-ink/85">
                  {skillCount > 0 ? (
                    <li className="flex gap-2">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      <span>
                        <span className="font-semibold">
                          {skillCount} evidenced skill{skillCount === 1 ? "" : "s"}
                        </span>{" "}
                        and their quotes — replaced after you finish and approve the new interview
                        {skillLabels.length ? (
                          <span className="mt-1.5 flex flex-wrap gap-1.5">
                            {skillLabels.slice(0, 6).map((label) => (
                              <span
                                key={label}
                                className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-semibold text-signal-ink ring-1 ring-red-200/80"
                              >
                                {label}
                              </span>
                            ))}
                            {skillLabels.length > 6 ? (
                              <span className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-semibold text-signal-muted ring-1 ring-signal-line">
                                +{skillLabels.length - 6} more
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ) : (
                    <li className="flex gap-2">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      You’ll build your first evidenced skill list from the new answers
                    </li>
                  )}
                  {isApproved ? (
                    <li className="flex gap-2">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      <span>
                        <span className="font-semibold">Shared status</span> — companies keep seeing
                        the old approved story until you approve the new one
                      </span>
                    </li>
                  ) : (
                    <li className="flex gap-2">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      Draft review — you’ll approve again before anything is shared
                    </li>
                  )}
                  <li className="flex gap-2">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    Suggested conversations may change after the new skills are approved
                  </li>
                </ul>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="flex shrink-0 flex-col gap-2 border-t border-signal-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={step === "why" ? onClose : back}
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-signal-line bg-white px-4 py-3 text-sm font-semibold text-signal-ink disabled:opacity-50 sm:w-auto"
          >
            {step === "why" ? (
              "Cancel"
            ) : (
              <>
                <ArrowLeft className="h-4 w-4" />
                Back
              </>
            )}
          </button>

          {step !== "confirm" ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-signal-accent px-4 py-3 text-sm font-semibold text-white hover:bg-signal-accentDeep sm:w-auto"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              data-testid="retake-confirm"
              disabled={busy}
              onClick={() => void onConfirm()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-signal-accent px-4 py-3 text-sm font-semibold text-white hover:bg-signal-accentDeep disabled:opacity-50 sm:w-auto"
            >
              <Mic2 className="h-4 w-4" />
              {busy ? "Starting…" : "Start retake"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
