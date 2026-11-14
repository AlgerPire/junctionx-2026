import {
  ArrowRight,
  AudioLines,
  Building2,
  Landmark,
  Mic2,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

import { PageWaves } from "@/components/dashboard/PageWaves";
import { APP_NAME } from "@/lib/brand";

const STEPS = [
  {
    n: "01",
    icon: Building2,
    title: "Companies speak a hiring brief",
    text: "A short voice or text interview turns a vague need into a skills-based job: must-haves, learnable skills, languages, and relocation support. A human edits and publishes.",
  },
  {
    n: "02",
    icon: Mic2,
    title: "Jobseekers tell a skill story",
    text: "People describe real situations. Every skill is tied to an exact quote from their own words. Nothing is shared until they review and approve.",
  },
  {
    n: "03",
    icon: Users,
    title: "Suggested conversations",
    text: "Transparent matching proposes a small set of meetings with a plain-language “why”. No numeric hiring scores, no auto-reject, nobody hidden.",
  },
  {
    n: "04",
    icon: Scale,
    title: "Humans decide who meets",
    text: "Approach budgets cut noise. Either side can accept or decline. Names stay as aliases until both agree to talk.",
  },
  {
    n: "05",
    icon: Landmark,
    title: "Organisers see the big picture",
    text: "Supply-gap radar and Bias Mirror show aggregate demand vs supply and prove suggestions do not change when non-skill attributes change.",
  },
] as const;

const GUARDS = [
  "AI may extract, explain and draft — never score, rank or reject a person.",
  "Matching sees skills and stated needs only — never name, nationality, age, gender, school, photo or address.",
  "Audio is never stored. Every voice step has a typed fallback and captions.",
] as const;

export default function HowItWorksPage() {
  return (
    <main className="dash-bg relative min-h-screen overflow-hidden">
      <PageWaves />

      <div className="relative z-10 mx-auto max-w-3xl px-5 pb-16 pt-7 sm:px-8 sm:pt-9">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#8577f2] to-signal-accent text-white shadow-glass">
              <AudioLines className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-bold tracking-tight text-signal-ink">{APP_NAME}</p>
              <p className="text-xs text-signal-muted">Espoo · Junction 2026</p>
            </div>
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-signal-muted transition hover:text-signal-accent"
          >
            Back to home
          </Link>
        </header>

        <div id="main" className="mt-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-signal-accent">
            How it works
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight text-signal-ink sm:text-5xl">
            From vague talk to fairer meetings
          </h1>
          <p className="mt-4 max-w-xl text-base text-signal-muted sm:text-lg">
            {APP_NAME} helps companies and talent explain themselves with evidence — then suggests
            conversations. People choose. Machines never hire.
          </p>

          <ol className="mt-12 space-y-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.n}
                  className="rounded-[24px] border border-signal-line bg-white/95 p-5 shadow-soft sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-signal-accentSoft text-signal-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-signal-accent">
                        Step {step.n}
                      </p>
                      <h2 className="mt-1 text-xl font-bold tracking-tight text-signal-ink">
                        {step.title}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-signal-muted">{step.text}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <section className="mt-10 rounded-[24px] border border-signal-line bg-white/95 p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-signal-tealSoft text-signal-teal">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold text-signal-ink">Built-in guardrails</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-signal-ink/80">
              {GUARDS.map((g) => (
                <li key={g} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-teal" />
                  {g}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm">
              <Link href="/transparency" className="font-semibold text-signal-accent">
                Full transparency &amp; activity record
              </Link>
              {" · "}
              <Link href="/accessibility" className="font-semibold text-signal-accent">
                Accessibility
              </Link>
            </p>
          </section>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/auth?role=seeker"
              className="inline-flex items-center gap-2 rounded-full bg-signal-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-signal-accent"
            >
              Sign up as jobseeker
              <ArrowRight className="h-4 w-4 opacity-70" />
            </Link>
            <Link
              href="/auth?role=company"
              className="inline-flex items-center gap-2 rounded-full bg-signal-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-signal-accentDeep"
            >
              Sign up as company
              <ArrowRight className="h-4 w-4 opacity-70" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
