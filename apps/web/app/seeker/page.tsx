"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  AudioLines,
  BadgeCheck,
  EyeOff,
  MessagesSquare,
  Mic2,
  PencilLine,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CopilotChat } from "@/components/copilot/CopilotChat";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import type { SuggestionsResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const BUCKET_LABEL = { strong: "Strong", good: "Good", explore: "Explore" } as const;

export default function SeekerDashboardPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPersonaId(
      new URLSearchParams(window.location.search).get("persona") ??
        getPersonaId() ??
        "seeker_demo_a",
    );
    setReady(true);
  }, []);

  const suggestions = useQuery({
    queryKey: ["suggestions-dash"],
    enabled: ready,
    queryFn: () => apiFetch<SuggestionsResponse>("/api/suggestions/seeker"),
  });

  const story = useQuery({
    queryKey: ["story-dash"],
    enabled: ready,
    queryFn: () =>
      apiFetch<{ status: string; skills: { label: string }[] } | null>("/api/stories/me"),
  });

  const list = suggestions.data?.suggestions ?? [];
  const budget = suggestions.data?.budget_remaining ?? 5;
  const storyStatus = story.data?.status;
  const skillCount = story.data?.skills?.length ?? 0;
  const profileReady = storyStatus === "approved";
  const skills = story.data?.skills ?? [];

  return (
    <DashboardShell
      role="seeker"
      title="Your space"
      subtitle="Story, conversations, and a private AI helper — you decide."
    >
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="glass-card overflow-hidden">
          <div className="relative overflow-hidden px-4 py-5 sm:px-6 sm:py-6">
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-signal-accent/10 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-signal-sky/15 blur-2xl"
              aria-hidden
            />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              <div className="relative mx-auto shrink-0 sm:mx-0">
                <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-signal-accent to-signal-accentDeep text-white shadow-orb sm:h-[4.5rem] sm:w-[4.5rem]">
                  {profileReady ? (
                    <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.8} />
                  ) : skillCount ? (
                    <PencilLine className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.8} />
                  ) : (
                    <Mic2 className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.8} />
                  )}
                </span>
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-white shadow-soft",
                    profileReady ? "bg-signal-teal" : skillCount ? "bg-signal-sky" : "bg-signal-accent",
                  )}
                >
                  {profileReady ? (
                    <BadgeCheck className="h-3.5 w-3.5" />
                  ) : (
                    <AudioLines className="h-3.5 w-3.5" />
                  )}
                </span>
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-signal-accentSoft px-2.5 py-1 text-[11px] font-semibold text-signal-accent">
                    <Sparkles className="h-3 w-3" />
                    Skill story
                  </p>
                  <p
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      profileReady
                        ? "bg-signal-tealSoft text-signal-teal"
                        : skillCount
                          ? "bg-signal-skySoft text-signal-sky"
                          : "bg-signal-foam text-signal-muted",
                    )}
                  >
                    {profileReady ? (
                      <>
                        <BadgeCheck className="h-3 w-3" />
                        Shared
                      </>
                    ) : skillCount ? (
                      <>
                        <PencilLine className="h-3 w-3" />
                        Needs review
                      </>
                    ) : (
                      <>
                        <Mic2 className="h-3 w-3" />
                        Not started
                      </>
                    )}
                  </p>
                </div>

                <h2 className="mt-2.5 text-xl font-extrabold tracking-tight text-signal-ink sm:text-2xl">
                  {profileReady
                    ? "Your story is ready"
                    : skillCount
                      ? "Review before you share"
                      : "Tell your skill story"}
                </h2>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-signal-muted sm:mx-0 mx-auto">
                  {profileReady
                    ? "Evidence-backed skills only — companies never see your name here."
                    : "A short voice or text chat. Captions stay on. You approve every skill."}
                </p>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-start">
                  <Link
                    href={profileReady ? "/seeker/event" : "/seeker/story?new=1"}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-signal-accent px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-signal-accentDeep"
                  >
                    {profileReady ? (
                      <>
                        <MessagesSquare className="h-4 w-4" />
                        Find conversations
                      </>
                    ) : (
                      <>
                        <Mic2 className="h-4 w-4" />
                        {skillCount ? "Continue story" : "Start interview"}
                      </>
                    )}
                    <ArrowRight className="h-4 w-4 opacity-80" />
                  </Link>
                  <Link
                    href="/seeker/story"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-signal-line bg-white/90 px-4 py-2.5 text-sm font-semibold text-signal-ink transition hover:border-signal-accent/35 hover:bg-signal-foam"
                  >
                    <PencilLine className="h-4 w-4 text-signal-accent" />
                    Open studio
                  </Link>
                </div>
              </div>
            </div>

            {skills.length ? (
              <div className="relative mt-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-signal-muted">
                    <BadgeCheck className="h-3.5 w-3.5 text-signal-accent" />
                    Evidenced skills
                  </p>
                  {profileReady ? (
                    <p className="inline-flex items-center gap-1 text-[11px] font-medium text-signal-teal">
                      <EyeOff className="h-3 w-3" />
                      Alias only
                    </p>
                  ) : null}
                </div>
                <ul className="flex flex-wrap gap-2">
                  {skills.slice(0, 6).map((s) => (
                    <li
                      key={s.label}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-signal-accent/15 bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-signal-ink shadow-soft"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-signal-accentSoft text-signal-accent">
                        <BadgeCheck className="h-3 w-3" />
                      </span>
                      {s.label}
                    </li>
                  ))}
                  {skillCount > 6 ? (
                    <li className="inline-flex items-center rounded-xl border border-dashed border-signal-line bg-signal-foam/70 px-2.5 py-1.5 text-xs font-semibold text-signal-muted">
                      +{skillCount - 6} more
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : (
              <div className="relative mt-5 flex items-start gap-3 rounded-2xl border border-dashed border-signal-line/90 bg-signal-foam/50 px-3.5 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-signal-accentSoft text-signal-accent">
                  <Mic2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-signal-ink">No skills yet</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-signal-muted">
                    Record a few real situations — skills appear only with quotes from your words.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-px border-t border-signal-line bg-signal-line/80">
            {[
              {
                icon: BadgeCheck,
                value: String(skillCount),
                label: "Skills",
                hint: profileReady ? "Approved" : "In story",
                tone: "accent" as const,
              },
              {
                icon: MessagesSquare,
                value: String(list.length),
                label: "Suggested",
                hint: "Matches",
                tone: "sky" as const,
              },
              {
                icon: Ticket,
                value: String(budget),
                label: "Approaches",
                hint: "Left today",
                tone: "deep" as const,
              },
            ].map(({ icon: Icon, value, label, hint, tone }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 bg-white px-2 py-3.5 text-center sm:flex-row sm:justify-center sm:gap-3 sm:px-3 sm:text-left"
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl",
                    tone === "accent" && "bg-signal-accentSoft text-signal-accent",
                    tone === "sky" && "bg-signal-skySoft text-signal-sky",
                    tone === "deep" && "bg-signal-tealSoft text-signal-teal",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-lg font-bold leading-none tabular-nums text-signal-ink">{value}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-signal-ink/80">{label}</p>
                  <p className="hidden text-[10px] text-signal-muted sm:block">{hint}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <CopilotChat variant="compact" />
      </div>

      <section className="mt-4 rounded-[22px] border border-signal-line/80 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-signal-ink">Suggested conversations</h2>
          <Link href="/seeker/event" className="text-xs font-semibold text-signal-accent hover:underline">
            See all
          </Link>
        </div>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {list.slice(0, 4).map((s) => (
            <Link
              key={s.brief_id}
              href={`/seeker/event/${s.brief_id}`}
              className="group flex items-start gap-2.5 rounded-2xl border border-signal-line/80 bg-signal-foam/40 px-3 py-3 transition hover:border-signal-accent/30 hover:bg-white"
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                  s.bucket === "strong" && "bg-signal-accentSoft text-signal-accent",
                  s.bucket === "good" && "bg-signal-skySoft text-signal-sky",
                  s.bucket === "explore" && "bg-signal-tealSoft text-signal-teal",
                )}
              >
                {BUCKET_LABEL[s.bucket]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-signal-ink">
                  {s.company_name ?? `Brief #${s.brief_id}`}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-signal-muted">
                  {s.fit_summary ?? s.overview ?? s.brief_summary ?? "See why"}
                </p>
              </div>
              {s.skill_overlap_pct != null ? (
                <span className="mt-0.5 shrink-0 rounded-lg bg-white px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-signal-accent">
                  {s.skill_overlap_pct}%
                </span>
              ) : (
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-signal-muted group-hover:text-signal-accent" />
              )}
            </Link>
          ))}
        </div>
        {!suggestions.isLoading && !list.length ? (
          <p className="mt-3 rounded-2xl border border-dashed border-signal-line px-3 py-4 text-center text-sm text-signal-muted">
            Approve a skill story to unlock suggestions, or{" "}
            <Link href="/seeker/event" className="font-semibold text-signal-accent underline">
              browse all
            </Link>
            .
          </p>
        ) : null}
      </section>
    </DashboardShell>
  );
}
