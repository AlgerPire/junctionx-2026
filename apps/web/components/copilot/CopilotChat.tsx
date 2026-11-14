"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Bot, SendHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ChatBubble, TypingBubble, type ChatMessage } from "@/components/dashboard/ChatBubbles";
import { apiFetch } from "@/lib/api";
import type { Suggestion } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPENING =
  "Hi — I’m your private event copilot. Ask who to talk to, what to prepare, or how many approaches you have left. I only suggest; you decide.";

const QUICK_ASKS = [
  "Who should I talk to next?",
  "What should I prepare?",
  "Which matches are strongest?",
  "How many approaches do I have left?",
] as const;

type ThreadMsg = ChatMessage & {
  cards?: Suggestion[];
};

type AskResponse = { answer: string; cards: Suggestion[] };

export function CopilotChat({
  variant = "full",
  className,
}: {
  /** `compact` for the seeker dashboard card; `full` for /copilot. */
  variant?: "compact" | "full";
  className?: string;
}) {
  const [messages, setMessages] = useState<ThreadMsg[]>([
    { role: "assistant", content: OPENING },
  ]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const compact = variant === "compact";

  const ask = useMutation({
    mutationFn: async (q: string) => {
      const history = messages
        .filter((m) => m.content !== OPENING)
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));
      return apiFetch<AskResponse>("/api/copilot/ask", {
        method: "POST",
        body: JSON.stringify({ text: q, history }),
      });
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          cards: data.cards ?? [],
        },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn’t answer just now. Try again in a moment, or open Conversations to browse briefs yourself.",
        },
      ]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, ask.isPending]);

  function send(value?: string) {
    const q = (value ?? draft).trim();
    if (!q || ask.isPending) return;
    setDraft("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    ask.mutate(q);
  }

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        compact
          ? "glass-card"
          : "rounded-[24px] border border-signal-line/80 bg-white shadow-soft",
        className,
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-2 border-b border-signal-line/70",
          compact ? "px-4 py-3 sm:px-5" : "px-4 py-4 sm:px-6",
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-signal-accent text-white shadow-orb">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <h2 className={cn("font-bold text-signal-ink", compact ? "text-sm" : "text-base")}>
              Event copilot
            </h2>
            <p className="text-[11px] text-signal-muted">Private · suggests only · you decide</p>
          </div>
        </div>
        {compact ? (
          <Link href="/copilot" className="text-xs font-semibold text-signal-accent hover:underline">
            Open full chat
          </Link>
        ) : null}
      </header>

      <div
        className={cn(
          "flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-5",
          compact ? "max-h-[16rem] min-h-[12rem]" : "min-h-[22rem] max-h-[min(60vh,32rem)]",
        )}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((m, i) => (
          <div key={`${i}-${m.role}-${m.content.slice(0, 24)}`} className="space-y-2">
            <ChatBubble message={m} animate={i > 0} />
            {m.role === "assistant" && m.cards?.length ? (
              <div className={cn("flex flex-wrap gap-1.5", "pl-12")}>
                {m.cards.slice(0, 3).map((c) => (
                  <Link
                    key={c.brief_id}
                    href={`/seeker/event/${c.brief_id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-signal-line bg-white px-2.5 py-1 text-[11px] font-semibold text-signal-ink transition hover:border-signal-accent/40 hover:bg-signal-accentSoft/40"
                  >
                    {c.company_name ?? `Brief #${c.brief_id}`}
                    <ArrowRight className="h-3 w-3 text-signal-accent" />
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {ask.isPending ? <TypingBubble label="Thinking" /> : null}
        <div ref={bottomRef} />
      </div>

      {!ask.isPending && messages.length <= 2 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-signal-line/50 px-3 py-2.5 sm:px-5">
          {QUICK_ASKS.slice(0, compact ? 3 : 4).map((q) => (
            <button
              key={q}
              type="button"
              disabled={ask.isPending}
              onClick={() => send(q)}
              className="rounded-full border border-signal-line bg-signal-foam/60 px-2.5 py-1 text-[11px] font-medium text-signal-ink transition hover:border-signal-accent/40 hover:bg-signal-accentSoft/50 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className={cn(
          "flex items-center gap-2 border-t border-signal-line/70 bg-signal-foam/30",
          compact ? "px-3 py-2.5 sm:px-4" : "px-3 py-3 sm:px-5",
        )}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-signal-accent" aria-hidden />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={compact ? "Ask about the event…" : "Ask who to meet, what to prep…"}
          aria-label="Message the event copilot"
          disabled={ask.isPending}
          className="min-w-0 flex-1 rounded-xl bg-transparent px-1 py-2 text-sm outline-none placeholder:text-signal-muted disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={ask.isPending || !draft.trim()}
          aria-label="Send message"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-signal-accent text-white disabled:opacity-40"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
