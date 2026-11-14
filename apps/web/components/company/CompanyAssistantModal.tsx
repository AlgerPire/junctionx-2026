"use client";

import { ArrowRight, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { TranscriptPanel } from "@/components/voice/TranscriptPanel";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { apiFetch } from "@/lib/api";
import { speakNatural, stopSpeaking, unlockAudio } from "@/lib/audio";
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
}: {
  open: boolean;
  onClose: () => void;
  firstMessage?: string;
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
  const speakGen = useRef(0);
  const redirectTimer = useRef<number | null>(null);
  const startedFor = useRef<string | null>(null);

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
    setMuted(false);
    setError(null);
    setPending(null);
    setCountdown(null);
    setSeconds(0);
    startedFor.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      resetSession();
      return;
    }
    unlockAudio();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
      // Speech is stopped in resetSession when `open` becomes false — not on every re-run.
    };
  }, [open, onClose, resetSession]);

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

  const speak = useCallback(
    async (text: string) => {
      if (muted || !text.trim()) return;
      unlockAudio();
      const gen = ++speakGen.current;
      setSpeaking(true);
      try {
        await speakNatural(text, getSpeechLang());
      } catch {
        /* ignore */
      }
      if (speakGen.current === gen) setSpeaking(false);
    },
    [muted],
  );

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
    // Opening click already unlocked audio — speak the greeting right away.
    if (startedFor.current === "__greeting__") return;
    startedFor.current = "__greeting__";
    void speak(OPENING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, firstMessage]);

  if (!open) return null;

  const live = !thinking;

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
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-signal-line bg-white px-3.5 py-1.5 text-sm font-medium text-signal-ink shadow-soft">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  thinking ? "bg-amber-400" : live ? "bg-emerald-500" : "bg-signal-muted",
                )}
                aria-hidden
              />
              {thinking ? "Thinking" : speaking ? "Speaking" : "Live"}
            </span>
            <span className="rounded-full border border-signal-line bg-white px-3.5 py-1.5 font-mono text-sm font-semibold text-signal-ink/70 shadow-soft">
              {formatClock(seconds)}
            </span>
          </div>
          <div className="hidden text-center md:block">
            <p className="text-base font-bold text-signal-ink">Hiring assistant</p>
            <p className="text-xs text-signal-muted">
              Draft a job · open a candidate · send an invite · check inbox
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMuted((m) => {
                  if (!m) {
                    speakGen.current += 1;
                    stopSpeaking();
                    setSpeaking(false);
                  }
                  return !m;
                });
              }}
              className="flex items-center gap-1.5 rounded-full border border-signal-line bg-white px-3.5 py-1.5 text-sm font-medium text-signal-ink shadow-soft hover:border-signal-accent/40"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {muted ? "Unmute" : "Mute voice"}
            </button>
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

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 pb-5 sm:px-6 lg:overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
          <TranscriptPanel
            messages={messages}
            thinking={thinking}
            className="order-2 max-h-[22rem] lg:order-1 lg:h-full lg:max-h-none"
          />

          <section className="glass-card order-1 flex min-h-[420px] flex-col overflow-hidden p-4 lg:order-2 lg:min-h-0">
            <VoiceRecorder
              variant="immersive"
              aiState={speaking ? "speaking" : thinking ? "thinking" : null}
              disabled={thinking}
              statusHint="Ask for a job, candidate, invite, or inbox"
              onTranscript={(text) => void handleAsk(text)}
            />
          </section>

          <aside className="order-3 space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <div className="glass-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-accent">
                Where this goes · you decide
              </p>
              {pending?.href ? (
                <div className="mt-4 space-y-3">
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
                  Try: “Show candidates for Data Analyst”, “Invite Seeker #G01”, “Open inbox”, or
                  “We need a nurse for the ward”.
                </p>
              )}
            </div>

            <div className="glass-card p-5">
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

            {error ? <p className="text-sm text-signal-warn">{error}</p> : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
