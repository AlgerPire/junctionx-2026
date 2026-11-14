"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Loader2,
  Mic2,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/shared/AppShell";
import { TranscriptPanel } from "@/components/voice/TranscriptPanel";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { useInterview } from "@/components/voice/useInterview";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Story {
  id: number;
  status: string;
  skills: { skill_id: number; label: string; evidence_quote: string }[];
}

const PROFILE_STEPS = [
  { id: "voice", label: "Talk", hint: "Real situations" },
  { id: "review", label: "Review", hint: "Check skills" },
  { id: "share", label: "Share", hint: "You approve" },
] as const;

export default function SeekerStoryPage() {
  const interview = useInterview();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("persona") ?? getPersonaId() ?? "seeker_demo_a";
    setPersonaId(p);
    setReady(true);
    const first = params.get("first");
    const neu = params.get("new") === "1" || params.get("onboard") === "1";
    setIsNewUser(neu);
    if (first) void interview.start("story", p, first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const storyQuery = useQuery({
    queryKey: ["story"],
    enabled: ready,
    queryFn: () => apiFetch<Story | null>("/api/stories/me"),
  });

  const approve = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/stories/${id}/approve`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["story"] }),
  });

  const removeSkill = useMutation({
    mutationFn: ({ id, skillId }: { id: number; skillId: number }) =>
      apiFetch(`/api/stories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ remove_skill_ids: [skillId] }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["story"] }),
  });

  const story = storyQuery.data;
  const started = !!interview.sessionId;
  const currentQuestion = useMemo(() => {
    const last = [...interview.messages].reverse().find((m) => m.role === "assistant");
    return last?.content ?? null;
  }, [interview.messages]);

  const activeStep =
    story?.status === "approved" ? 2 : story?.skills?.length ? 1 : started ? 0 : 0;

  const statusLabel =
    interview.status === "thinking"
      ? "Thinking…"
      : interview.status === "speaking"
        ? "AI speaking"
        : interview.status === "done"
          ? "Ready to finish"
          : interview.status === "listening"
            ? "Your turn"
            : started
              ? "In progress"
              : "Not started";

  async function beginStory() {
    setIsNewUser(false);
    await interview.start("story", getPersonaId() ?? "seeker_demo_a");
  }

  return (
    <AppShell
      role="seeker"
      title="Skill story"
      subtitle="Build your profile in your own words — voice or text. Nothing is shared until you approve."
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {PROFILE_STEPS.map((step, i) => (
          <div
            key={step.id}
            className={cn(
              "flex min-w-[9.5rem] flex-1 items-center gap-3 rounded-2xl border px-4 py-3",
              i === activeStep
                ? "border-signal-accent/40 bg-signal-accentSoft"
                : i < activeStep
                  ? "border-signal-line bg-white/80"
                  : "border-dashed border-signal-line/80 bg-white/40",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold",
                i <= activeStep ? "bg-signal-accent text-white" : "bg-signal-foam text-signal-muted",
              )}
            >
              {i < activeStep ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-signal-ink">{step.label}</p>
              <p className="text-xs text-signal-muted">{step.hint}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          {!started ? (
            <section className="seeker-story-hero relative overflow-hidden rounded-[28px] px-6 py-8 text-white sm:px-9 sm:py-10">
              <div
                className="pointer-events-none absolute -right-10 top-0 h-48 w-48 rounded-full bg-white/10"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-black/10"
                aria-hidden
              />
              <p className="relative inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
                <Sparkles className="h-3.5 w-3.5" />
                {isNewUser ? "Welcome — finish your profile" : "Profile studio"}
              </p>
              <h2 className="relative mt-4 max-w-xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
                {isNewUser
                  ? "Let’s complete your skill story with a short voice chat"
                  : "Tell three real situations. AI asks; you answer."}
              </h2>
              <p className="relative mt-3 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
                About 8–10 minutes. Captions stay on. You can type anytime. Skills only appear when
                tied to exact quotes from what you said — you review before anything is shared.
              </p>
              <ul className="relative mt-6 grid gap-2 text-sm text-white/90 sm:grid-cols-3">
                {[
                  "What problem did you solve?",
                  "What did you personally do?",
                  "What changed because of it?",
                ].map((q) => (
                  <li
                    key={q}
                    className="rounded-2xl border border-white/20 bg-white/10 px-3 py-3 backdrop-blur-[2px]"
                  >
                    {q}
                  </li>
                ))}
              </ul>
              <div className="relative mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void beginStory()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-signal-ink transition hover:bg-white/95"
                >
                  <Mic2 className="h-4 w-4 text-signal-accent" />
                  {isNewUser ? "Start profile interview" : "Start skill interview"}
                </button>
                <p className="self-center text-xs text-white/75">
                  Voice preferred · text always available
                </p>
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-[28px] border border-signal-line/80 bg-white/90 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-signal-line px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-signal-accentSoft text-signal-accent">
                    {interview.status === "thinking" || interview.status === "speaking" ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Mic2 className="h-5 w-5" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-signal-ink">Live interview</p>
                    <p className="text-xs text-signal-muted">{statusLabel}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => interview.setMuted((m) => !m)}
                  className="inline-flex items-center gap-2 rounded-xl border border-signal-line px-3 py-2 text-xs font-semibold text-signal-ink hover:bg-signal-foam"
                >
                  {interview.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {interview.muted ? "Unmute AI" : "Mute AI voice"}
                </button>
              </div>

              <div className="bg-gradient-to-br from-signal-accentSoft/70 via-white to-signal-tealSoft/40 px-5 py-6 sm:px-7">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-accent">
                  AI question
                </p>
                <p className="mt-2 font-display text-2xl font-semibold leading-snug text-signal-ink sm:text-[1.7rem]">
                  {currentQuestion ?? "Preparing your first question…"}
                </p>
                <p className="mt-3 text-sm text-signal-muted">
                  Answer out loud or type below. When you pause, we send your answer and ask the next
                  related question.
                </p>
              </div>

              <div className="border-t border-signal-line p-4 sm:p-5">
                <VoiceRecorder
                  disabled={
                    !started || interview.status === "thinking" || interview.status === "done"
                  }
                  statusHint={
                    interview.status === "speaking"
                      ? "AI is speaking — tap mic to interrupt"
                      : "Answer the question"
                  }
                  onTranscript={(t) => void interview.sendUserText(t)}
                />
              </div>

              {interview.error ? (
                <p className="px-5 pb-4 text-sm text-signal-warn">{interview.error}</p>
              ) : null}

              <div className="flex flex-wrap gap-3 border-t border-signal-line px-5 py-4">
                <button
                  type="button"
                  className="rounded-2xl bg-signal-ink px-5 py-3 text-sm font-semibold text-white hover:brightness-110"
                  onClick={() => void interview.finalize()}
                >
                  Finish interview
                </button>
                {interview.status === "speaking" ? (
                  <button
                    type="button"
                    className="rounded-2xl border border-signal-line px-5 py-3 text-sm font-semibold text-signal-ink"
                    onClick={() => interview.stopAssistant()}
                  >
                    Stop speaking
                  </button>
                ) : null}
              </div>
            </section>
          )}

          {started ? <TranscriptPanel messages={interview.messages} /> : null}
        </div>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-signal-line/80 bg-white/95 p-6 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-signal-tealSoft text-signal-teal">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-2xl font-semibold text-signal-ink">
                  Review before sharing
                </h2>
                <p className="mt-1 text-sm text-signal-muted">
                  Companies see your alias and evidenced skills only after you approve. Transcripts
                  are not kept by default.
                </p>
              </div>
            </div>

            {story?.skills?.length ? (
              <ul className="mt-5 space-y-3">
                {story.skills.map((s) => (
                  <li
                    key={s.skill_id}
                    className="rounded-2xl border border-signal-line/90 bg-signal-foam px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-signal-ink">{s.label}</p>
                      <button
                        type="button"
                        className="text-xs font-medium text-signal-muted hover:text-signal-warn"
                        onClick={() => removeSkill.mutate({ id: story.id, skillId: s.skill_id })}
                      >
                        Remove
                      </button>
                    </div>
                    <p className="mt-2 border-l-2 border-signal-accent/50 pl-3 text-sm italic text-signal-ink/75">
                      In your words: “{s.evidence_quote}”
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-signal-line bg-signal-foam/60 p-5 text-sm text-signal-muted">
                {started
                  ? "Keep answering — skills with exact quotes will land here after you finish."
                  : "Start the interview to extract skills from what you say. You can remove any skill later."}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {story && story.status !== "approved" ? (
                <button
                  type="button"
                  className="rounded-2xl bg-signal-accent px-5 py-3 text-sm font-semibold text-white hover:bg-signal-accentDeep"
                  onClick={() => approve.mutate(story.id)}
                  disabled={approve.isPending || !story.skills?.length}
                >
                  {approve.isPending ? "Saving…" : "Approve and share"}
                </button>
              ) : (
                <p className="rounded-xl bg-signal-accentSoft px-3 py-2 text-sm font-medium text-signal-accent">
                  Status: {story?.status ?? "no story yet"}
                </p>
              )}
              <Link
                href="/seeker/event"
                className="rounded-2xl border border-signal-line px-5 py-3 text-sm font-semibold text-signal-ink hover:bg-signal-foam"
              >
                Go to conversations
              </Link>
            </div>
          </section>

          <section className="rounded-[28px] border border-signal-line/70 bg-gradient-to-br from-signal-accentSoft/50 to-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal-accent">
              How matching works
            </p>
            <p className="mt-2 text-sm leading-relaxed text-signal-ink/80">
              Suggestions use only your approved skills and stated needs — never name, nationality,
              age, gender, school, photo or address. AI explains; you decide whom to contact.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
