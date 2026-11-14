"use client";

import { ArrowLeft, ArrowRight, Check, Mic2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { COMPANY_ONBOARDING, SEEKER_ONBOARDING, type OnboardingStep } from "@/lib/onboarding";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function OnboardingFlow({
  role,
  onComplete,
  busy,
}: {
  role: "seeker" | "company";
  onComplete: () => void;
  busy?: boolean;
}) {
  const steps = useMemo<OnboardingStep[]>(
    () => (role === "company" ? COMPANY_ONBOARDING : SEEKER_ONBOARDING),
    [role],
  );
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const last = index === steps.length - 1;
  const progress = ((index + 1) / steps.length) * 100;
  const seeker = role === "seeker";

  return (
    <main
      className={cn(
        "dash-bg relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12",
        seeker && "font-display",
      )}
      data-theme={seeker ? "seeker" : undefined}
    >
      <div
        className={cn(
          "pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full blur-3xl",
          seeker ? "bg-signal-teal/20" : "bg-signal-accent/10",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full blur-3xl",
          seeker ? "bg-signal-accent/20" : "bg-signal-teal/15",
        )}
      />

      <div className="relative z-10 w-full max-w-2xl font-sans">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[var(--signal-orb-from)] to-[var(--signal-orb-to)] text-white shadow-glass">
              <Mic2 className="h-5 w-5" />
            </span>
            <div>
              <p
                className={cn(
                  "text-signal-ink",
                  seeker ? "font-display text-lg font-semibold" : "text-sm font-bold",
                )}
              >
                {APP_NAME}
              </p>
              <p className="text-xs text-signal-muted">
                {seeker ? "Jobseeker onboarding" : "Company onboarding"}
              </p>
            </div>
          </div>
          <p className="text-xs font-semibold text-signal-muted">
            {index + 1} / {steps.length}
          </p>
        </div>

        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-signal-line">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              seeker
                ? "bg-gradient-to-r from-signal-accent to-signal-teal"
                : "bg-gradient-to-r from-signal-accent to-signal-teal",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        <section className="glass-card animate-loader-rise p-8 sm:p-10">
          <p className="inline-flex items-center gap-1.5 rounded-xl bg-signal-accentSoft px-3 py-1 text-xs font-semibold text-signal-accent">
            <Sparkles className="h-3.5 w-3.5" />
            {seeker ? "Before your first story" : "Quick intro"}
          </p>
          <h1
            className={cn(
              "mt-4 tracking-tight text-signal-ink",
              seeker
                ? "font-display text-3xl font-semibold sm:text-4xl"
                : "text-3xl font-bold sm:text-4xl",
            )}
          >
            {step.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-signal-muted sm:text-lg">{step.body}</p>
          {step.tip ? (
            <p
              className={cn(
                "mt-6 rounded-2xl border px-4 py-3 text-sm text-signal-ink",
                seeker
                  ? "border-signal-accent/25 bg-signal-accentSoft/60"
                  : "border-signal-teal/20 bg-signal-tealSoft/50",
              )}
            >
              {step.tip}
            </p>
          ) : null}

          {seeker && last ? (
            <div className="mt-6 rounded-2xl border border-dashed border-signal-line bg-signal-foam/80 p-4 text-sm text-signal-ink/80">
              Next you’ll open the skill story studio. An AI voice asks about real situations; you
              answer by mic or keyboard, then approve what companies can see.
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={index === 0 || busy}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl border border-signal-line px-4 py-2.5 text-sm font-semibold text-signal-ink",
                index === 0 && "invisible",
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {last ? (
              <button
                type="button"
                disabled={busy}
                onClick={onComplete}
                className="inline-flex items-center gap-2 rounded-2xl bg-signal-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy
                  ? "Saving…"
                  : seeker
                    ? "Continue to skill story"
                    : "Start using Skills First!"}
                <Check className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
                className="inline-flex items-center gap-2 rounded-2xl bg-signal-ink px-5 py-3 text-sm font-semibold text-white"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>

        <div className="mt-5 flex justify-center gap-2">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to step ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 w-2 rounded-full transition",
                i === index ? "bg-signal-accent" : "bg-signal-line hover:bg-signal-muted/40",
              )}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
