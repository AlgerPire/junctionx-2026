"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mic2,
  Quote,
  ShieldCheck,
  Sparkles,
  Trash2,
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

const PROMPT_QUESTIONS = [
  "What problem did you solve?",
  "What did you personally do?",
  "What changed because of it?",
] as const;

export default function SeekerStoryPage() {
  const interview = useInterview();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [finishing, setFinishing] = useState(false);
  /** After Finish interview — review step is the destination, not a side panel. */
  const [reviewMode, setReviewMode] = useState(false);

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

  // Returning visitors with an existing story land on review (unless they just started a new interview).
  useEffect(() => {
    if (!storyQuery.isSuccess) return;
    if (interview.sessionId) return;
    if (storyQuery.data?.skills?.length || storyQuery.data?.status === "approved") {
      setReviewMode(true);
    }
  }, [storyQuery.isSuccess, storyQuery.data, interview.sessionId]);

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
  const interviewing = started && !reviewMode;
  const currentQuestion = useMemo(() => {
    const last = [...interview.messages].reverse().find((m) => m.role === "assistant");
    return last?.content ?? null;
  }, [interview.messages]);

  const activeStep = story?.status === "approved" ? 2 : reviewMode ? 1 : interviewing ? 0 : 0;

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
    setReviewMode(false);
    setShowTranscript(false);
    await interview.start("story", getPersonaId() ?? "seeker_demo_a");
  }

  async function finishInterview() {
    setFinishing(true);
    const res = await interview.finalize();
    setFinishing(false);
    if (res) {
      await qc.invalidateQueries({ queryKey: ["story"] });
      setReviewMode(true);
    }
  }

  const matchingTip = (
    <section className="rounded-[22px] border border-signal-line/70 bg-gradient-to-br from-signal-accentSoft/50 to-white p-4 sm:rounded-[28px] sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal-accent">
        How matching works
      </p>
      <p className="mt-2 text-sm leading-relaxed text-signal-ink/80">
        Suggestions use only your approved skills and stated needs — never name, nationality, age,
        gender, school, photo or address. AI explains; you decide whom to contact.
      </p>
    </section>
  );

  const reviewPanel = (
    <section
      data-testid="story-review"
      className="rounded-[22px] border border-signal-line/80 bg-white p-4 shadow-soft sm:rounded-[28px] sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-signal-tealSoft text-signal-teal">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-signal-ink sm:text-2xl">
              Review before sharing
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-signal-muted">
              Check every skill and quote. Remove anything that feels wrong. Nothing is shared until
              you approve.
            </p>
          </div>
        </div>
        {story?.skills?.length ? (
          <p className="shrink-0 self-start rounded-full bg-signal-foam px-3 py-1.5 text-xs font-semibold text-signal-ink">
            {story.skills.length} skill{story.skills.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      {story?.skills?.length ? (
        <ul className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
          {story.skills.map((s) => (
            <li
              key={s.skill_id}
              data-testid="story-skill"
              className="group relative flex flex-col rounded-[20px] border border-signal-line bg-gradient-to-b from-white to-signal-foam/80 p-4 shadow-soft transition hover:border-signal-accent/30"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex max-w-[85%] items-center rounded-xl bg-signal-accentSoft px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-signal-accent">
                  {s.label}
                </span>
                <button
                  type="button"
                  data-testid="story-skill-remove"
                  aria-label={`Remove ${s.label}`}
                  title="Remove skill"
                  disabled={removeSkill.isPending}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-signal-line bg-white text-signal-muted shadow-soft transition hover:border-signal-warn/40 hover:bg-red-50 hover:text-signal-warn disabled:opacity-50"
                  onClick={() => removeSkill.mutate({ id: story.id, skillId: s.skill_id })}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-1 gap-2.5 rounded-2xl bg-white/90 px-3 py-3 ring-1 ring-signal-line/80">
                <Quote className="mt-0.5 h-4 w-4 shrink-0 text-signal-accent/70" aria-hidden />
                <p
                  data-testid="story-evidence-quote"
                  className="text-sm italic leading-relaxed text-signal-ink/80"
                >
                  {s.evidence_quote}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-signal-line bg-signal-foam/60 px-4 py-6 text-center text-sm text-signal-muted sm:mt-6">
          {finishing
            ? "Extracting skills from your answers…"
            : "No evidenced skills yet. Finish an interview — or start a new one — to fill this list."}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2.5 border-t border-signal-line pt-5 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        {story && story.status !== "approved" ? (
          <button
            type="button"
            data-testid="story-approve"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-signal-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-signal-accentDeep disabled:opacity-40"
            onClick={() => approve.mutate(story.id)}
            disabled={approve.isPending || !story.skills?.length}
          >
            {approve.isPending ? "Saving…" : "Approve and share"}
            {!approve.isPending ? <ArrowRight className="h-4 w-4 opacity-80" /> : null}
          </button>
        ) : (
          <p
            data-testid="story-status"
            className="inline-flex items-center gap-2 rounded-xl bg-signal-accentSoft px-3 py-2 text-sm font-medium text-signal-accent"
          >
            <CheckCircle2 className="h-4 w-4" />
            Status: {story?.status ?? "no story yet"}
          </p>
        )}
        <Link
          href="/seeker/event"
          className="inline-flex items-center justify-center rounded-2xl border border-signal-line bg-white px-5 py-3 text-sm font-semibold text-signal-ink transition hover:bg-signal-foam"
        >
          Go to conversations
        </Link>
        <button
          type="button"
          onClick={() => void beginStory()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-signal-line bg-white px-5 py-3 text-sm font-semibold text-signal-ink transition hover:bg-signal-foam"
        >
          <Mic2 className="h-4 w-4 text-signal-accent" />
          {story?.skills?.length ? "Retake interview" : "Start interview"}
        </button>
      </div>
    </section>
  );

  return (
    <AppShell
      role="seeker"
      title="Skill story"
      subtitle="Build your profile in your own words — voice or text. Nothing is shared until you approve."
    >
      <ol className="mb-5 flex items-stretch gap-1.5 sm:mb-6 sm:gap-2">
        {PROFILE_STEPS.map((step, i) => (
          <li
            key={step.id}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 rounded-2xl border px-2.5 py-2.5 sm:gap-3 sm:px-4 sm:py-3",
              i === activeStep
                ? "border-signal-accent/40 bg-signal-accentSoft"
                : i < activeStep
                  ? "border-signal-line bg-white"
                  : "border-dashed border-signal-line/80 bg-white/50",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold sm:h-8 sm:w-8 sm:text-sm",
                i <= activeStep ? "bg-signal-accent text-white" : "bg-signal-foam text-signal-muted",
              )}
            >
              {i < activeStep ? <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : i + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-signal-ink sm:text-sm">{step.label}</p>
              <p className="hidden truncate text-xs text-signal-muted sm:block">{step.hint}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Idle: start hero */}
      {!started && !reviewMode ? (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <section className="seeker-story-hero relative overflow-hidden rounded-[22px] px-4 py-6 text-white sm:rounded-[28px] sm:px-8 sm:py-9">
            <div
              className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-white/10 sm:h-48 sm:w-48"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-14 left-6 h-32 w-32 rounded-full bg-black/10"
              aria-hidden
            />
            <p className="relative inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              {isNewUser ? "Welcome — finish your profile" : "Profile studio"}
            </p>
            <h2 className="relative mt-3 max-w-xl text-2xl font-extrabold leading-tight tracking-tight sm:mt-4 sm:text-3xl md:text-[2.1rem]">
              {isNewUser
                ? "Complete your skill story with a short voice chat"
                : "Tell three real situations. AI asks; you answer."}
            </h2>
            <p className="relative mt-3 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
              About 8–10 minutes. Captions stay on. Type anytime. Skills only appear when tied to
              exact quotes — you review after you finish.
            </p>
            <ul className="relative mt-5 space-y-2 sm:mt-6 sm:grid sm:grid-cols-3 sm:gap-2 sm:space-y-0">
              {PROMPT_QUESTIONS.map((q) => (
                <li
                  key={q}
                  className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white/95 backdrop-blur-[2px] sm:py-3"
                >
                  {q}
                </li>
              ))}
            </ul>
            <div className="relative mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                data-testid="story-start"
                onClick={() => void beginStory()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-signal-ink transition hover:bg-white/95 sm:w-auto sm:py-3"
              >
                <Mic2 className="h-4 w-4 text-signal-accent" />
                {isNewUser ? "Start profile interview" : "Start skill interview"}
              </button>
              <p className="text-center text-xs text-white/75 sm:text-left">
                Voice preferred · text always available
              </p>
            </div>
          </section>
          <div className="hidden lg:block">{matchingTip}</div>
          <div className="lg:hidden">{matchingTip}</div>
        </div>
      ) : null}

      {/* Interviewing: voice left, conversation right */}
      {interviewing ? (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr] lg:gap-5 xl:gap-6">
          <section className="overflow-hidden rounded-[22px] border border-signal-line/80 bg-white shadow-soft sm:rounded-[28px]">
            <div className="flex items-center justify-between gap-2 border-b border-signal-line px-3.5 py-3 sm:gap-3 sm:px-5 sm:py-4">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-signal-accentSoft text-signal-accent sm:h-10 sm:w-10">
                  {interview.status === "thinking" || interview.status === "speaking" || finishing ? (
                    <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />
                  ) : (
                    <Mic2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-signal-ink">Live interview</p>
                  <p className="truncate text-xs text-signal-muted">
                    {finishing ? "Building your skill list…" : statusLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => interview.setMuted((m) => !m)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-signal-line px-2.5 py-2 text-xs font-semibold text-signal-ink hover:bg-signal-foam sm:px-3"
                aria-label={interview.muted ? "Unmute AI" : "Mute AI voice"}
              >
                {interview.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                <span className="hidden sm:inline">{interview.muted ? "Unmute" : "Mute voice"}</span>
              </button>
            </div>

            <div className="bg-gradient-to-br from-signal-accentSoft/70 via-white to-signal-tealSoft/40 px-4 py-5 sm:px-6 sm:py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-signal-accent">
                AI question
              </p>
              <p className="mt-2 text-xl font-bold leading-snug tracking-tight text-signal-ink sm:text-2xl">
                {currentQuestion ?? "Preparing your first question…"}
              </p>
              <p className="mt-2 text-sm text-signal-muted sm:mt-3">
                Speak or type. When you pause, we send your answer and ask the next question.
              </p>
            </div>

            <div className="border-t border-signal-line">
              <VoiceRecorder
                embedded
                disabled={
                  finishing ||
                  !started ||
                  interview.status === "thinking" ||
                  interview.status === "done"
                }
                statusHint={
                  interview.status === "speaking"
                    ? "AI is speaking — tap mic to interrupt"
                    : "Answer the question out loud or type below."
                }
                onTranscript={(t) => void interview.sendUserText(t)}
              />
            </div>

            {interview.error ? (
              <p className="px-4 pb-3 text-sm text-signal-warn sm:px-5">{interview.error}</p>
            ) : null}

            <div className="flex flex-col gap-2 border-t border-signal-line px-3.5 py-3 sm:flex-row sm:flex-wrap sm:gap-3 sm:px-5 sm:py-4">
              <button
                type="button"
                disabled={finishing}
                className="rounded-2xl bg-signal-ink px-5 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
                onClick={() => void finishInterview()}
              >
                {finishing ? "Finishing…" : "Finish interview"}
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
              <button
                type="button"
                className="rounded-2xl border border-signal-line px-5 py-3 text-sm font-semibold text-signal-ink lg:hidden"
                onClick={() => setShowTranscript((v) => !v)}
              >
                {showTranscript ? "Hide conversation" : "Show conversation"}
              </button>
            </div>
          </section>

          <div className={cn("min-h-0", !showTranscript && "hidden lg:block")}>
            <TranscriptPanel
              messages={interview.messages}
              thinking={interview.replying}
              className="h-full min-h-[20rem] max-h-[70vh] rounded-[22px] sm:rounded-[28px] lg:max-h-none"
            />
          </div>
        </div>
      ) : null}

      {/* Review: after finish (or returning with an existing story) */}
      {reviewMode ? (
        <div className="grid gap-5 lg:grid-cols-[1.55fr_0.85fr] lg:gap-6">
          {reviewPanel}
          <div className="space-y-4">
            {matchingTip}
            {started && interview.messages.length ? (
              <div className="hidden lg:block">
                <button
                  type="button"
                  onClick={() => setShowTranscript((v) => !v)}
                  className="mb-3 text-sm font-semibold text-signal-accent hover:underline"
                >
                  {showTranscript ? "Hide interview transcript" : "Show interview transcript"}
                </button>
                {showTranscript ? (
                  <TranscriptPanel
                    messages={interview.messages}
                    thinking={false}
                    className="max-h-[22rem] rounded-[22px] sm:rounded-[28px]"
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
