"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetch } from "@/lib/api";
import { getVoiceMuted, setVoiceMuted, speakNatural, stopSpeaking, unlockAudio } from "@/lib/audio";
import { getSpeechLang, noteUserLanguageSample } from "@/lib/speechLang";

type Status = "idle" | "listening" | "transcribing" | "thinking" | "speaking" | "done";

export function useInterview() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [briefId, setBriefId] = useState<number | null>(null);
  const [replying, setReplying] = useState(false);
  const speakGen = useRef(0);

  useEffect(() => {
    setMutedState(getVoiceMuted());
  }, []);

  const setMuted = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setMutedState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      setVoiceMuted(next);
      if (next) {
        speakGen.current += 1;
        stopSpeaking();
      }
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      speakGen.current += 1;
      stopSpeaking();
    };
  }, []);

  const speak = useCallback(async (text: string) => {
    if (getVoiceMuted() || !text.trim()) return;
    unlockAudio();
    const gen = ++speakGen.current;
    setStatus("speaking");
    try {
      await speakNatural(text, getSpeechLang());
    } catch {
      /* ignore play errors */
    }
    if (speakGen.current === gen) {
      /* caller sets next status */
    }
  }, []);

  const runTurn = useCallback(
    async (sid: number, text: string) => {
      noteUserLanguageSample(text);
      setMessages((m) => [...m, { role: "user", content: text }]);
      setStatus("thinking");
      setReplying(true);
      try {
        const res = await apiFetch<{
          assistant_text: string;
          draft: Record<string, unknown>;
          done: boolean;
        }>(`/api/interviews/${sid}/turn`, {
          method: "POST",
          body: JSON.stringify({ user_text: text, lang: getSpeechLang() }),
        });
        setDraft(res.draft ?? {});
        setMessages((m) => [...m, { role: "assistant", content: res.assistant_text }]);
        setReplying(false);
        await speak(res.assistant_text);
        setStatus(res.done ? "done" : "listening");
      } catch (err) {
        setReplying(false);
        setError(err instanceof Error ? err.message : "Turn failed");
        setStatus("listening");
      }
    },
    [speak],
  );

  const start = useCallback(
    async (kind: "brief" | "story", ownerId: string, firstMessage?: string) => {
      setError(null);
      setBriefId(null);
      setStatus("thinking");
      setReplying(true);
      try {
        const res = await apiFetch<{
          session_id: number;
          first_question: string;
          draft?: Record<string, unknown>;
        }>("/api/interviews", {
          method: "POST",
          body: JSON.stringify({ kind, owner_id: ownerId, lang: getSpeechLang() }),
        });
        setReplying(false);
        setSessionId(res.session_id);
        setMessages([{ role: "assistant", content: res.first_question }]);
        if (res.draft) setDraft(res.draft);
        if (firstMessage?.trim()) {
          await runTurn(res.session_id, firstMessage.trim());
          return;
        }
        await speak(res.first_question);
        setStatus("listening");
      } catch (err) {
        setReplying(false);
        setError(err instanceof Error ? err.message : "Could not start interview");
        setStatus("idle");
      }
    },
    [runTurn, speak],
  );

  const sendUserText = useCallback(
    async (text: string) => {
      if (!sessionId) return;
      await runTurn(sessionId, text);
    },
    [runTurn, sessionId],
  );

  const finalize = useCallback(
    async (opts?: { publish?: boolean }) => {
      if (!sessionId) return null;
      setStatus("thinking");
      try {
        const res = await apiFetch<Record<string, unknown>>(`/api/interviews/${sessionId}/finalize`, {
          method: "POST",
          body: JSON.stringify({ publish: !!opts?.publish }),
        });
        setDraft(res);
        if (typeof res.brief_id === "number") setBriefId(res.brief_id);
        setStatus("done");
        return res;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create listing");
        setStatus("listening");
        return null;
      }
    },
    [sessionId],
  );

  const stopAssistant = useCallback(() => {
    speakGen.current += 1;
    stopSpeaking();
    if (status === "speaking") setStatus("listening");
  }, [status]);

  return {
    sessionId,
    messages,
    draft,
    status,
    error,
    muted,
    setMuted,
    briefId,
    replying,
    start,
    sendUserText,
    finalize,
    stopAssistant,
  };
}
