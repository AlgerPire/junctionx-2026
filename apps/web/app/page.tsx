"use client";

import { ArrowRight, AudioLines, Building2, Landmark, Mic2 } from "lucide-react";
import Link from "next/link";

import { PageWaves } from "@/components/dashboard/PageWaves";
import { VoiceWave } from "@/components/dashboard/VoiceWave";
import { setPersonaId } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";

const personas = [
  {
    id: "company_demo",
    role: "Company",
    label: "Nordic Health Data Oy",
    href: "/company",
    icon: Building2,
    blurb: "Draft hiring jobs by voice, review approaches, keep humans in charge.",
    tone: "purple" as const,
  },
  {
    id: "seeker_demo_a",
    role: "Jobseeker",
    label: "Seeker #A12",
    href: "/seeker",
    icon: Mic2,
    blurb: "Tell your skill story, then choose conversations worth having.",
    tone: "teal" as const,
  },
  {
    id: "organiser_demo",
    role: "Organiser",
    label: "City of Espoo",
    href: "/organiser/dashboard",
    icon: Landmark,
    blurb: "See supply gaps and prove fairness — never individual profiling.",
    tone: "blue" as const,
  },
] as const;

const TONE = {
  purple: {
    icon: "bg-signal-accentSoft text-signal-accent",
    chip: "text-signal-accent",
    hover: "hover:border-signal-accent/40",
  },
  teal: {
    icon: "bg-signal-tealSoft text-signal-teal",
    chip: "text-signal-teal",
    hover: "hover:border-signal-teal/40",
  },
  blue: {
    icon: "bg-signal-skySoft text-signal-sky",
    chip: "text-signal-sky",
    hover: "hover:border-signal-sky/40",
  },
} as const;

export default function HomePage() {
  return (
    <main className="dash-bg relative min-h-screen overflow-hidden">
      <PageWaves />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-5 sm:px-8">
        <header className="flex items-center justify-between pt-7 sm:pt-9">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#8577f2] to-signal-accent text-white shadow-glass">
              <AudioLines className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-bold tracking-tight text-signal-ink">{APP_NAME}</p>
              <p className="text-xs text-signal-muted">Espoo · Junction 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/auth"
              className="text-sm font-semibold text-signal-accent transition hover:text-signal-accentDeep"
            >
              Sign in
            </Link>
            <Link
              href="/accessibility"
              className="hidden text-sm font-semibold text-signal-muted transition hover:text-signal-accent sm:inline"
            >
              Accessibility
            </Link>
            <Link
              href="/how-it-works"
              className="text-sm font-semibold text-signal-muted transition hover:text-signal-accent"
            >
              How it works
            </Link>
          </div>
        </header>

        <div id="main" className="contents">

        {/* First viewport: brand + voice visual as one composition */}
        <section className="flex flex-1 flex-col items-center justify-center py-14 text-center sm:py-16">
          <p className="animate-loader-rise text-[11px] font-semibold uppercase tracking-[0.22em] text-signal-accent">
            AI voice matchmaking
          </p>

          <h1 className="animate-loader-rise mt-4 font-display text-5xl leading-[1.05] tracking-tight text-signal-ink sm:text-6xl md:text-7xl [animation-delay:60ms]">
            {APP_NAME}
          </h1>

          <p className="animate-loader-rise mx-auto mt-5 max-w-lg text-base text-signal-muted sm:text-lg [animation-delay:120ms]">
            Natural conversations. Fairer meetings. AI helps people explain themselves — humans
            decide who to talk to.
          </p>

          <div className="animate-loader-rise relative mt-12 w-full max-w-3xl [animation-delay:180ms]">
            <span className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal-accent/10 blur-3xl" />
            <span className="pointer-events-none absolute left-[42%] top-[55%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal-teal/15 blur-3xl" />

            <div className="relative flex items-center justify-center gap-6 sm:gap-10">
              <VoiceWave
                bars={28}
                active
                fade="left"
                seed={2}
                baseline={false}
                className="hidden h-28 min-w-0 flex-1 justify-end sm:flex"
              />

              <div className="relative flex h-[104px] w-[104px] shrink-0 items-center justify-center">
                <span className="absolute -inset-8 rounded-full bg-signal-accent/[0.07]" />
                <span className="absolute -inset-4 rounded-full bg-signal-accent/[0.11]" />
                <span className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-signal-accent/25" />
                <span className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-b from-[#8577f2] to-signal-accent text-white shadow-orb">
                  <Mic2 className="h-10 w-10" strokeWidth={1.8} />
                </span>
              </div>

              <VoiceWave
                bars={28}
                active
                fade="right"
                seed={5}
                baseline={false}
                className="hidden h-28 min-w-0 flex-1 justify-start sm:flex"
              />
            </div>
          </div>

          <div className="animate-loader-rise mt-12 flex flex-wrap items-center justify-center gap-3 [animation-delay:240ms]">
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
        </section>

        {/* Demo personas — still available for the hackathon walkthrough */}
        <section className="relative z-10 pb-8 pt-4">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-signal-ink sm:text-2xl">
                Or try the demo
              </h2>
              <p className="mt-1 text-sm text-signal-muted">
                Synthetic data only — jump straight into a workspace.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {personas.map((p) => {
              const Icon = p.icon;
              const tone = TONE[p.tone];
              return (
                <Link
                  key={p.id}
                  href={`${p.href}?persona=${p.id}`}
                  onClick={() => setPersonaId(p.id)}
                  className={`group rounded-[24px] border border-signal-line bg-white/95 p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glass ${tone.hover}`}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone.icon}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className={`mt-4 text-xs font-semibold uppercase tracking-[0.14em] ${tone.chip}`}>
                    {p.role}
                  </p>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-signal-ink group-hover:text-signal-accent">
                    {p.label}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-signal-muted">{p.blurb}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-signal-ink transition group-hover:text-signal-accent">
                    Open workspace
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>

          <p className="relative z-10 flex items-center justify-center gap-2 pb-8 pt-12 text-sm text-signal-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-teal" />
            Decision support — you decide. No automated hiring.
          </p>
        </section>
        </div>
      </div>
    </main>
  );
}
