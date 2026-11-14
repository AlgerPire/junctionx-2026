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
import { useEffect, useState } from "react";

import { RetakeStoryModal } from "@/components/seeker/RetakeStoryModal";
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
  const [retakeOpen, setRetakeOpen] = useState(false);
  const [retakeBusy, setRetakeBusy] = useState(false);

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
  const retaking = interviewing && Boolean(story?.skills?.length || story?.status === "approved");

  // While talking (including a retake), Talk is current — don't show Review/Share as done
  // just because an older story is still approved.
  const activeStep = interviewing ? 0 : reviewMode ? (story?.status === "approved" ? 2 : 1) : 0;

  const aiState =
    interview.status === "speaking"
      ? ("speaking" as const)
      : interview.status === "thinking" || finishing
        ? ("thinking" as const)
        : null;

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
    setRetakeOpen(false);
    await interview.start("story", getPersonaId() ?? "seeker_demo_a");
  }

  async function confirmRetake() {
    setRetakeBusy(true);
    try {
      await beginStory();
    } finally {
      setRetakeBusy(false);
    }
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
      <button
        type="button"
        onClick={() => setRetakeOpen(true)}
        className="group mb-5 flex w-full items-center gap-3 rounded-[20px] border border-signal-accent/35 bg-gradient-to-r from-signal-accentSoft via-white to-signal-tealSoft/50 p-3.5 text-left shadow-soft transition hover:border-signal-accent/55 hover:shadow-glass sm:mb-6 sm:gap-4 sm:p-4"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-signal-accent text-white shadow-orb transition group-hover:scale-[1.03]">
          <Mic2 className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-signal-ink sm:text-base">
            {story?.skills?.length ? "Retake the interview" : "Start the interview"}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-signal-muted sm:text-sm">
            {story?.skills?.length
              ? "Tell new situations — we’ll rebuild skills and quotes from your latest answers."
              : "A short voice or text chat. Skills only appear with evidence from your words."}
          </span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-signal-accent transition group-hover:translate-x-0.5" />
      </button>

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
      </div>
    </section>
  );

  return (
    <AppShell
      role="seeker"
      title="Skill story"
      subtitle={
        interviewing
          ? undefined
          : "Build your profile in your own words — voice or text. Nothing is shared until you approve."
      }
      fitViewport={interviewing}
      hideHeading={interviewing}
    >
      {!interviewing ? (
        <div className="mb-5 w-full min-w-0 sm:mb-7">
          <ol className="flex w-full min-w-0 items-stretch gap-1.5 sm:gap-2.5">
            {PROFILE_STEPS.map((step, i) => {
              const done = i < activeStep;
              const current = i === activeStep;
              return (
                <li
                  key={step.id}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-1.5 rounded-2xl border px-2 py-2 shadow-soft transition sm:gap-3 sm:px-4 sm:py-3",
                    current
                      ? "border-signal-accent/45 bg-gradient-to-br from-signal-accentSoft to-white ring-1 ring-signal-accent/20"
                      : done
                        ? "border-signal-line/90 bg-white"
                        : "border-dashed border-signal-line/70 bg-white/55",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold sm:h-8 sm:w-8 sm:text-sm",
                      current || done
                        ? "bg-signal-accent text-white shadow-orb"
                        : "bg-signal-foam text-signal-muted",
                    )}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-signal-ink sm:text-sm">
                      {step.label}
                    </p>
                    <p className="hidden truncate text-xs text-signal-muted sm:block">{step.hint}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

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

      {/* Interviewing: locked to one screen — only the message list scrolls */}
      {interviewing ? (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
          <section className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-signal-line/70 bg-white shadow-soft sm:rounded-[24px]">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-signal-line/80 px-3 py-2.5 sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-signal-accent",
                    interview.status === "speaking"
                      ? "bg-signal-accent text-white"
                      : "bg-signal-accentSoft",
                  )}
                >
                  {interview.status === "thinking" || finishing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : interview.status === "speaking" ? (
                    <Volume2 className="h-3.5 w-3.5" />
                  ) : (
                    <Mic2 className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-signal-ink">
                    {retaking ? "Retaking skill story" : "Skill story interview"}
                  </p>
                  <p className="truncate text-[11px] text-signal-muted">
                    {finishing ? "Building your skill list…" : statusLabel}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {interview.status === "speaking" ? (
                  <button
                    type="button"
                    className="rounded-xl border border-signal-accent/35 bg-white px-2.5 py-1.5 text-xs font-semibold text-signal-accent"
                    onClick={() => interview.stopAssistant()}
                  >
                    Stop
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => interview.setMuted((m) => !m)}
                  className="inline-flex items-center gap-1 rounded-xl border border-signal-line/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-signal-ink"
                  aria-label={interview.muted ? "Unmute AI" : "Mute AI voice"}
                >
                  {interview.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{interview.muted ? "Unmute" : "Mute"}</span>
                </button>
                <button
                  type="button"
                  disabled={finishing}
                  className="rounded-xl bg-signal-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  onClick={() => void finishInterview()}
                >
                  {finishing ? "…" : "Finish"}
                </button>
              </div>
            </div>

            <TranscriptPanel
              hideHeader
              messages={interview.messages}
              thinking={interview.replying}
              className="min-h-0 max-h-none flex-1 rounded-none border-0 shadow-none"
            />

            <div className="shrink-0 border-t border-signal-line/80 bg-signal-foam/40">
              <VoiceRecorder
                dense
                embedded
                aiState={aiState}
                disabled={
                  finishing ||
                  !started ||
                  interview.status === "thinking" ||
                  interview.status === "done"
                }
                statusHint={
                  interview.status === "speaking"
                    ? "Tap mic to interrupt"
                    : "Speak or type your answer"
                }
                onTranscript={(t) => void interview.sendUserText(t)}
              />
              {interview.error ? (
                <p className="px-3 pb-2 text-sm text-signal-warn sm:px-4">{interview.error}</p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {/* Review: after finish (or returning with an existing story) */}
      {reviewMode ? (
        <div className="grid w-full min-w-0 max-w-full gap-5 overflow-x-hidden lg:grid-cols-[minmax(0,1.55fr)_minmax(0,0.85fr)] lg:gap-6">
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

      <RetakeStoryModal
        open={retakeOpen}
        story={
          story
            ? { status: story.status, skills: story.skills }
            : null
        }
        busy={retakeBusy}
        onClose={() => {
          if (!retakeBusy) setRetakeOpen(false);
        }}
        onConfirm={() => void confirmRetake()}
      />
    </AppShell>
  );
}
