"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, MessagesSquare, Mic2, Ticket } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LanguageCard } from "@/components/dashboard/LanguageCard";
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

  return (
    <DashboardShell
      role="seeker"
      title="Your space"
      subtitle="Complete your skill story, then choose conversations that fit — on your terms."
    >
      <section className="relative overflow-hidden rounded-[28px] border border-signal-line/60 bg-white shadow-soft">
        <div className="grid lg:grid-cols-[1.55fr_1fr]">
          <div className="relative overflow-hidden px-6 py-8 sm:px-8 sm:py-9">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_0%_0%,rgba(14,124,116,0.14),transparent_55%),radial-gradient(ellipse_50%_60%_at_100%_100%,rgba(224,90,60,0.10),transparent_50%)]"
              aria-hidden
            />
            <div className="relative">
              <p className="inline-flex items-center gap-2 rounded-xl bg-signal-accentSoft px-3 py-1 text-xs font-semibold text-signal-accent">
                <Mic2 className="h-3.5 w-3.5" />
                Profile progress
              </p>
              <h2 className="mt-4 max-w-xl text-3xl font-extrabold tracking-tight text-signal-ink sm:text-[2.1rem] sm:leading-tight">
                {profileReady
                  ? "Your story is shared — pick conversations"
                  : skillCount
                    ? "Review and approve your skills"
                    : "Start with your voice"}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-signal-muted sm:text-base">
                {profileReady
                  ? "Companies only see your alias and approved evidence. You decide whom to contact."
                  : "A short AI interview asks about real situations. Type or speak — captions stay on."}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={profileReady ? "/seeker/event" : "/seeker/story?new=1"}
                  className="inline-flex items-center gap-2 rounded-2xl bg-signal-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-signal-accentDeep"
                >
                  {profileReady ? "Open conversations" : "Complete skill story"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/seeker/story"
                  className="inline-flex items-center gap-2 rounded-2xl border border-signal-line bg-white px-5 py-3 text-sm font-semibold text-signal-ink hover:bg-signal-foam"
                >
                  Open studio
                </Link>
              </div>
            </div>
          </div>

          <div className="seeker-story-hero flex flex-col justify-between gap-6 px-6 py-8 text-white sm:px-7 sm:py-9">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
                Story status
              </p>
              <p className="mt-2 text-2xl font-bold leading-snug">
                {storyStatus === "approved"
                  ? "Shared with companies"
                  : storyStatus
                    ? "Draft — awaiting approval"
                    : "Not started yet"}
              </p>
              <p className="mt-2 text-sm text-white/80">
                Matching never uses name, nationality, age, gender, school, photo or address.
              </p>
            </div>
            {story.data?.skills?.length ? (
              <ul className="flex flex-wrap gap-2">
                {story.data.skills.slice(0, 5).map((s) => (
                  <li
                    key={s.label}
                    className="rounded-xl border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-semibold"
                  >
                    {s.label}
                  </li>
                ))}
                {skillCount > 5 ? (
                  <li className="rounded-xl border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                    +{skillCount - 5} more
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-white/75">No evidenced skills yet — start your story.</p>
            )}
          </div>
        </div>

        <div className="grid border-t border-signal-line sm:grid-cols-3 sm:divide-x sm:divide-signal-line">
          {[
            {
              icon: BadgeCheck,
              value: String(skillCount),
              label: "Evidenced skills",
              tone: "accent" as const,
            },
            {
              icon: MessagesSquare,
              value: String(list.length),
              label: "Suggestions",
              tone: "sky" as const,
            },
            {
              icon: Ticket,
              value: String(budget),
              label: "Approaches left",
              tone: "coral" as const,
            },
          ].map(({ icon: Icon, value, label, tone }) => (
            <div key={label} className="flex items-center gap-4 px-6 py-5">
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl",
                  tone === "accent" && "bg-signal-accentSoft text-signal-accent",
                  tone === "sky" && "bg-signal-skySoft text-signal-sky",
                  tone === "coral" && "bg-signal-tealSoft text-signal-teal",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-bold leading-none text-signal-ink">{value}</p>
                <p className="mt-1.5 text-xs text-signal-muted">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-[28px] border border-signal-line/80 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-signal-ink">Suggested conversations</h2>
              <p className="mt-1 text-sm text-signal-muted">
                Plain-language fit notes — AI assists, you decide.
              </p>
            </div>
            <Link
              href="/seeker/event"
              className="text-sm font-semibold text-signal-accent hover:underline"
            >
              Browse all
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {list.slice(0, 4).map((s) => (
              <Link
                key={s.brief_id}
                href={`/seeker/event/${s.brief_id}`}
                className="group flex items-start gap-4 rounded-2xl border border-signal-line/80 bg-signal-foam/50 px-4 py-4 transition hover:border-signal-accent/30 hover:bg-white"
              >
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                    s.bucket === "strong" && "bg-signal-accentSoft text-signal-accent",
                    s.bucket === "good" && "bg-signal-skySoft text-signal-sky",
                    s.bucket === "explore" && "bg-signal-tealSoft text-signal-teal",
                  )}
                >
                  {BUCKET_LABEL[s.bucket]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-signal-ink">
                    {s.company_name ?? `Brief #${s.brief_id}`}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-signal-muted">
                    {s.fit_summary ?? s.overview ?? s.brief_summary ?? "See why this was suggested."}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-signal-muted transition group-hover:text-signal-accent" />
              </Link>
            ))}
          </div>

          {!suggestions.isLoading && !list.length ? (
            <p className="mt-4 rounded-2xl border border-dashed border-signal-line p-4 text-sm text-signal-muted">
              Approve a skill story to unlock suggestions — or{" "}
              <Link href="/seeker/event" className="font-semibold text-signal-accent underline">
                browse every brief
              </Link>
              .
            </p>
          ) : null}
        </section>

        <LanguageCard />
      </div>
    </DashboardShell>
  );
}
