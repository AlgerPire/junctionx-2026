"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { SuggestionCard } from "@/components/match/SuggestionCard";
import { AppShell } from "@/components/shared/AppShell";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import type { Suggestion } from "@/lib/types";

export default function CopilotPage() {
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [cards, setCards] = useState<Suggestion[]>([]);
  const [briefId, setBriefId] = useState("");
  const [briefing, setBriefing] = useState<{ questions: string[]; notes: string } | null>(null);

  useEffect(() => {
    setPersonaId(getPersonaId() ?? "seeker_demo_a");
  }, []);

  const ask = useMutation({
    mutationFn: (q: string) =>
      apiFetch<{ answer: string; cards: Suggestion[] }>("/api/copilot/ask", {
        method: "POST",
        body: JSON.stringify({ text: q }),
      }),
    onSuccess: (data) => {
      setAnswer(data.answer);
      setCards(data.cards ?? []);
    },
  });

  const briefMe = useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ questions: string[]; notes: string }>(`/api/briefing?brief_id=${id}`),
    onSuccess: (data) => setBriefing(data),
  });

  return (
    <AppShell
      role="seeker"
      title="Event Copilot"
      subtitle="Private to you. Suggestions only — you decide."
    >
      <VoiceRecorder onTranscript={(t) => ask.mutate(t)} />
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-signal-line px-3 py-2 text-sm"
          placeholder="Who should I talk to next?"
        />
        <button
          type="button"
          className="rounded-xl bg-signal-accent px-4 py-2 text-sm font-semibold text-white"
          onClick={() => text.trim() && ask.mutate(text.trim())}
        >
          Ask
        </button>
      </div>

      {answer ? (
        <div className="mt-6 rounded-2xl border border-signal-line bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-signal-accent">
            AI-assisted, you decide
          </p>
          <p className="mt-2 text-signal-ink">{answer}</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {cards.map((c) => (
          <SuggestionCard key={c.brief_id} suggestion={c} onWhy={() => undefined} />
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-signal-line bg-white/70 p-4">
        <h2 className="font-display text-xl">Brief me</h2>
        <p className="mt-1 text-sm text-signal-ink/60">Enter a brief id before a conversation.</p>
        <div className="mt-3 flex gap-2">
          <input
            value={briefId}
            onChange={(e) => setBriefId(e.target.value)}
            className="w-28 rounded-xl border border-signal-line px-3 py-2 text-sm"
            placeholder="Brief id"
          />
          <button
            type="button"
            className="rounded-xl border border-signal-line px-4 py-2 text-sm font-semibold"
            onClick={() => briefMe.mutate(Number(briefId))}
          >
            Brief me
          </button>
        </div>
        {briefing ? (
          <div className="mt-3 text-sm">
            <p>{briefing.notes}</p>
            <ul className="mt-2 list-disc pl-5">
              {briefing.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
