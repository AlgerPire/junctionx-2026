"use client";

import { SendHorizontal, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  shufflePick,
  type CompanyChatDemoPack,
  type DemoQa,
} from "@/lib/companyChatDemo";
import { cn } from "@/lib/utils";

import {
  ChatBubble,
  TypingBubble,
  UserTypingBubble,
  type ChatMessage,
} from "./ChatBubbles";

const EXCHANGES_PER_LOOP = 2;
const QUICK_COUNT = 4;

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = window.setTimeout(() => resolve(), ms);
    const onAbort = () => {
      window.clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Live conversation demo: types common questions and AI replies, reshuffles
 * each page load / loop. Focusing the input clears the demo and shows quick asks.
 */
export function ChatPreview({
  messages,
  demo,
  targetHref,
  onSubmit,
  placeholder = "Type your message…",
  className,
}: {
  messages?: ChatMessage[];
  demo?: CompanyChatDemoPack;
  targetHref?: string;
  onSubmit?: (text: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [demoCleared, setDemoCleared] = useState(false);
  const [visible, setVisible] = useState<ChatMessage[]>([]);
  const [draftUser, setDraftUser] = useState("");
  const [phase, setPhase] = useState<"idle" | "user-wait" | "user-type" | "ai-wait">("idle");
  const [fading, setFading] = useState(false);
  const [quickAsks, setQuickAsks] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (demoCleared || !demo) {
      if (!demo && messages) setVisible(messages);
      return;
    }

    const pack = demo;
    const ac = new AbortController();
    const { signal } = ac;

    async function typeUser(line: string) {
      setPhase("user-type");
      setDraftUser("");
      const step = prefersReducedMotion() ? line.length : 1;
      for (let i = step; i <= line.length; i += step) {
        if (signal.aborted) return;
        setDraftUser(line.slice(0, i));
        await wait(14 + Math.random() * 26, signal);
      }
      setVisible((prev) => [...prev, { role: "user", content: line }]);
      setDraftUser("");
      setPhase("idle");
    }

    async function playExchange(qa: DemoQa) {
      setPhase("user-wait");
      await wait(480 + Math.random() * 320, signal);
      await typeUser(qa.user);
      await wait(320 + Math.random() * 200, signal);
      setPhase("ai-wait");
      await wait(680 + Math.random() * 520, signal);
      setVisible((prev) => [...prev, { role: "assistant", content: qa.assistant }]);
      setPhase("idle");
      await wait(780 + Math.random() * 420, signal);
    }

    async function runLoop() {
      try {
        if (prefersReducedMotion()) {
          const picks = shufflePick(pack.questions, EXCHANGES_PER_LOOP);
          setVisible([
            { role: "assistant", content: pack.greeting },
            ...picks.flatMap((qa) => [
              { role: "user", content: qa.user },
              { role: "assistant", content: qa.assistant },
            ]),
          ]);
          return;
        }

        while (!signal.aborted) {
          const picks = shufflePick(pack.questions, EXCHANGES_PER_LOOP);
          setFading(false);
          setVisible([]);
          setDraftUser("");
          setPhase("idle");
          await wait(280, signal);
          setVisible([{ role: "assistant", content: pack.greeting }]);
          await wait(720 + Math.random() * 380, signal);
          for (const qa of picks) {
            await playExchange(qa);
          }
          await wait(2800, signal);
          setFading(true);
          await wait(420, signal);
          setFading(false);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        throw err;
      }
    }

    void runLoop();
    return () => ac.abort();
  }, [demo, demoCleared, messages]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visible, draftUser, phase]);

  function clearDemo() {
    if (!demoCleared) {
      setDemoCleared(true);
      setVisible([]);
      setDraftUser("");
      setPhase("idle");
      setFading(false);
      if (demo) {
        setQuickAsks(shufflePick(demo.questions, QUICK_COUNT).map((q) => q.user));
      }
    }
  }

  function send(valueRaw: string) {
    const value = valueRaw.trim();
    if (!value) return;
    clearDemo();
    setText("");
    if (onSubmit) {
      onSubmit(value);
      return;
    }
    if (!targetHref) return;
    const sep = targetHref.includes("?") ? "&" : "?";
    router.push(`${targetHref}${sep}first=${encodeURIComponent(value)}`);
  }

  function submit() {
    send(text);
  }

  const showLive = Boolean(demo) && !demoCleared;

  return (
    <section className={cn("glass-card flex min-h-0 flex-1 flex-col p-5", className)}>
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-signal-muted">
          {showLive ? "Live demo" : demoCleared ? "Ask anything" : "Preview"}
        </p>
        {showLive ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-signal-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-teal" />
            Sample Q&A
          </span>
        ) : null}
      </div>

      <div
        ref={listRef}
        className={cn(
          "min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 transition-opacity duration-[400ms]",
          fading && "opacity-0",
        )}
      >
        {showLive || (!demo && visible.length > 0) ? (
          <>
            {visible.map((m, i) => (
              <ChatBubble
                key={`${m.role}-${i}-${m.content.slice(0, 16)}`}
                message={m}
                animate={i === visible.length - 1 || (phase === "idle" && i >= visible.length - 1)}
              />
            ))}
            {phase === "user-wait" ? <UserTypingBubble /> : null}
            {phase === "user-type" && draftUser ? (
              <ChatBubble
                message={{ role: "user", content: draftUser }}
                animate={false}
                caret
              />
            ) : null}
            {phase === "ai-wait" ? <TypingBubble label="Assistant" /> : null}
          </>
        ) : null}

        {demoCleared ? (
          <div className="flex h-full min-h-[10rem] flex-col justify-center animate-chat-in">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-signal-ink">
              <Sparkles className="h-4 w-4 text-signal-accent" />
              Quick questions
            </div>
            <p className="mb-3 text-sm text-signal-muted">
              Tap one to open the assistant, or type your own below.
            </p>
            <div className="flex flex-wrap gap-2">
              {quickAsks.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="max-w-full rounded-full border border-signal-line bg-white px-3.5 py-2 text-left text-sm text-signal-ink shadow-soft transition hover:border-signal-accent/40 hover:bg-signal-accentSoft/50"
                >
                  <span className="line-clamp-2">{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <form
        className="mt-4 flex shrink-0 items-center gap-2 rounded-full border border-signal-line bg-white py-1.5 pl-4 pr-1.5 transition focus-within:border-signal-accent/45 focus-within:shadow-soft"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={clearDemo}
          onClick={clearDemo}
          placeholder={placeholder}
          aria-label="Type your message"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-signal-muted"
        />
        <button
          type="submit"
          aria-label="Send"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-signal-accent text-white transition hover:bg-signal-accentDeep"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
