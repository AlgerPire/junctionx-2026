"use client";

import { ArrowLeft, ArrowRight, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { TranscriptPanel } from "@/components/voice/TranscriptPanel";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { apiFetch } from "@/lib/api";
import { getVoiceMuted, setVoiceMuted, speakNatural, stopSpeaking, unlockAudio } from "@/lib/audio";
import { getSpeechLang, noteUserLanguageSample } from "@/lib/speechLang";
import { cn } from "@/lib/utils";

type Msg = { role: string; content: string };

type AskResult = {
  answer: string;
  action: string;
  href: string | null;
  label: string | null;
};

const OPENING =
  "Hi — I’m your hiring assistant. Ask me to draft a new job, open candidates, invite someone, or check your inbox.";

const SHORTCUTS = [
  { label: "New job", href: "/company/brief/new" },
  { label: "My jobs", href: "/company/briefs" },
  { label: "Inbox", href: "/company/inbox" },
];

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CompanyAssistantModal({
  open,
  onClose,
  firstMessage,
  mode = "overlay",
}: {
  open: boolean;
  onClose: () => void;
  firstMessage?: string;
  /** `page` = full route (mobile). `overlay` = desktop modal. */
  mode?: "overlay" | "page";
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: OPENING }]);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<AskResult | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const speakGen = useRef(0);
  const redirectTimer = useRef<number | null>(null);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    setMuted(getVoiceMuted());
  }, []);

  const resetSession = useCallback(() => {
    speakGen.current += 1;
    stopSpeaking();
    if (redirectTimer.current) {
      window.clearInterval(redirectTimer.current);
      redirectTimer.current = null;
    }
    setMessages([{ role: "assistant", content: OPENING }]);
    setThinking(false);
    setSpeaking(false);
    setError(null);
    setPending(null);
    setCountdown(null);
    setSeconds(0);
    setShowShortcuts(false);
    startedFor.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      resetSession();
      return;
    }
    setMuted(getVoiceMuted());
    unlockAudio();
    const prevOverflow = document.body.style.overflow;
    if (mode === "overlay") {
      document.body.style.overflow = "hidden";
    }
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      if (mode === "overlay") {
        document.body.style.overflow = prevOverflow;
      }
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, resetSession, mode]);

  const clearRedirect = useCallback(() => {
    if (redirectTimer.current) {
      window.clearInterval(redirectTimer.current);
      redirectTimer.current = null;
    }
    setCountdown(null);
  }, []);

  const go = useCallback(
    (href: string) => {
      clearRedirect();
      stopSpeaking();
      onClose();
      router.push(href);
    },
    [clearRedirect, onClose, router],
  );

  const scheduleRedirect = useCallback(
    (href: string) => {
      clearRedirect();
      setCountdown(3);
      redirectTimer.current = window.setInterval(() => {
        setCountdown((c) => {
          if (c === null) return null;
          if (c <= 1) {
            if (redirectTimer.current) {
              window.clearInterval(redirectTimer.current);
              redirectTimer.current = null;
            }
            stopSpeaking();
            onClose();
            router.push(href);
            return null;
          }
          return c - 1;
        });
      }, 1000);
    },
    [clearRedirect, onClose, router],
  );

  const speak = useCallback(async (text: string) => {
    // Read storage so a restored mute is respected even before React state catches up.
    if (getVoiceMuted() || !text.trim()) return;
    unlockAudio();
    const gen = ++speakGen.current;
    setSpeaking(true);
    try {
      await speakNatural(text, getSpeechLang());
    } catch {
      /* ignore */
    }
    if (speakGen.current === gen) setSpeaking(false);
  }, []);

  const handleAsk = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || thinking) return;
      noteUserLanguageSample(trimmed);
      unlockAudio();
      speakGen.current += 1;
      stopSpeaking();
      setSpeaking(false);
      clearRedirect();
      setPending(null);
      setError(null);
      setMessages((m) => [...m, { role: "user", content: trimmed }]);
      setThinking(true);
      try {
        const res = await apiFetch<AskResult>("/api/company/ask", {
          method: "POST",
          body: JSON.stringify({ text: trimmed }),
        });
        setMessages((m) => [...m, { role: "assistant", content: res.answer }]);
        setPending(res.href ? res : null);
        setThinking(false);
        await speak(res.answer);
        if (res.href) scheduleRedirect(res.href);
      } catch (err) {
        setThinking(false);
        setSpeaking(false);
        setError(err instanceof Error ? err.message : "Could not answer");
      }
    },
    [thinking, clearRedirect, speak, scheduleRedirect],
  );

  useEffect(() => {
    if (!open) return;
    const first = firstMessage?.trim();
    if (first) {
      if (startedFor.current === first) return;
      startedFor.current = first;
      void handleAsk(first);
      return;
    }
    if (startedFor.current === "__greeting__") return;
    startedFor.current = "__greeting__";
    void speak(OPENING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, firstMessage]);

  if (!open) return null;

  const live = !thinking;
  const aiState = speaking ? "speaking" : thinking ? "thinking" : null;

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      setVoiceMuted(next);
      if (next) {
        speakGen.current += 1;
        stopSpeaking();
        setSpeaking(false);
      }
      return next;
    });
  }

  const statusChip = (
    <span className="flex items-center gap-2 rounded-full border border-signal-line bg-white px-2.5 py-1.5 text-xs font-medium text-signal-ink shadow-soft sm:px-3.5 sm:text-sm">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          thinking ? "bg-amber-400" : live ? "bg-emerald-500" : "bg-signal-muted",
        )}
        aria-hidden
      />
      {thinking ? "Thinking" : speaking ? "Speaking" : "Live"}
    </span>
  );

  const clockChip = (
    <span className="rounded-full border border-signal-line bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-signal-ink/70 shadow-soft sm:px-3.5 sm:text-sm">
      {formatClock(seconds)}
    </span>
  );

  const muteButton = (
    <button
      type="button"
      onClick={toggleMute}
      className="flex items-center gap-1.5 rounded-full border border-signal-line bg-white px-2.5 py-1.5 text-xs font-medium text-signal-ink shadow-soft hover:border-signal-accent/40 sm:px-3.5 sm:text-sm"
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      <span className="hidden sm:inline">{muted ? "Unmute" : "Mute voice"}</span>
    </button>
  );

  const pendingCard = (
    <div className="glass-card p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-accent">
        Where this goes · you decide
      </p>
      {pending?.href ? (
        <div className="mt-3 space-y-3 sm:mt-4">
          <p className="text-sm text-signal-ink/75">{pending.answer}</p>
          <button
            type="button"
            onClick={() => go(pending.href!)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-signal-accent px-5 py-3 text-sm font-semibold text-white"
          >
            {pending.label || "Open"}
            <ArrowRight className="h-4 w-4" />
          </button>
          {countdown !== null ? (
            <div className="flex items-center justify-between gap-3 text-sm text-signal-muted">
              <span>Opening in {countdown}s…</span>
              <button type="button" className="underline" onClick={clearRedirect}>
                Stay here
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-signal-ink/70">
          Try: “Show candidates for Data Analyst”, “Invite Seeker #G01”, “Open inbox”, or “We need a
          nurse for the ward”.
        </p>
      )}
    </div>
  );

  const shortcutsCard = (
    <div className="glass-card p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-signal-ink/50">
        Jump without asking
      </p>
      <ul className="mt-3 space-y-2">
        {SHORTCUTS.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              onClick={onClose}
              className="flex items-center justify-between rounded-xl border border-signal-line px-3 py-2.5 text-sm font-medium text-signal-ink transition hover:border-signal-accent/40 hover:bg-signal-accentSoft/40"
            >
              {s.label}
              <ArrowRight className="h-4 w-4 text-signal-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  /* ─── Full page (mobile / desk route) ─── */
  if (mode === "page") {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col gap-3"
        role="region"
        aria-label="Hiring assistant"
      >
        <header className="flex shrink-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-2xl border border-signal-line bg-white px-3 py-2 text-sm font-semibold text-signal-ink shadow-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <div className="flex min-w-0 shrink-0 items-center gap-1.5">
            {statusChip}
            {clockChip}
            {muteButton}
          </div>
        </header>

        <TranscriptPanel
          messages={messages}
          thinking={thinking}
          className="min-h-0 max-h-none flex-1 rounded-[20px]"
        />

        {pending?.href ? <div className="shrink-0">{pendingCard}</div> : null}

        <section className="glass-card shrink-0 overflow-hidden">
          <VoiceRecorder
            variant="card"
            embedded
            aiState={aiState}
            disabled={thinking}
            statusHint="Draft a job, open candidates, invite someone, or check inbox."
            onTranscript={(text) => void handleAsk(text)}
          />
        </section>

        <div className="shrink-0 pb-1">
          <button
            type="button"
            onClick={() => setShowShortcuts((v) => !v)}
            className="w-full rounded-2xl border border-signal-line bg-white px-4 py-2.5 text-sm font-semibold text-signal-ink shadow-soft"
          >
            {showShortcuts ? "Hide shortcuts" : "Quick jumps"}
          </button>
          {showShortcuts ? <div className="mt-2 space-y-2">{shortcutsCard}</div> : null}
          {error ? <p className="mt-2 text-sm text-signal-warn">{error}</p> : null}
        </div>
      </div>
    );
  }

  /* ─── Desktop overlay modal ─── */
  return (
    <div
      className="fixed inset-0 z-[80] flex animate-modal-backdrop items-stretch justify-center bg-signal-ink/40 p-0 backdrop-blur-[3px] sm:p-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Hiring assistant"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dash-bg relative flex h-full w-full max-w-[1400px] animate-modal-panel flex-col overflow-hidden sm:rounded-[28px] sm:border sm:border-signal-line sm:shadow-glass">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {statusChip}
            {clockChip}
          </div>
          <div className="hidden text-center md:block">
            <p className="text-base font-bold text-signal-ink">Hiring assistant</p>
            <p className="text-xs text-signal-muted">
              Draft a job · open a candidate · send an invite · check inbox
            </p>
          </div>
          <div className="flex items-center gap-2">
            {muteButton}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close assistant"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-signal-line bg-white text-signal-muted shadow-soft hover:text-signal-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-4 pb-5 sm:gap-4 sm:px-6 lg:overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
          <TranscriptPanel
            messages={messages}
            thinking={thinking}
            className="order-2 max-h-[22rem] lg:order-1 lg:h-full lg:max-h-none"
          />

          <section className="glass-card order-1 flex min-h-[360px] flex-col overflow-hidden p-4 lg:order-2 lg:min-h-0">
            <VoiceRecorder
              variant="immersive"
              aiState={aiState}
              disabled={thinking}
              statusHint="Ask for a job, candidate, invite, or inbox"
              onTranscript={(text) => void handleAsk(text)}
            />
          </section>

          <aside className="order-3 space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            {pendingCard}
            {shortcutsCard}
            {error ? <p className="text-sm text-signal-warn">{error}</p> : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
