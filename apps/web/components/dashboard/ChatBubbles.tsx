import { AudioLines, User } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ChatMessage {
  role: string;
  content: string;
  time?: string;
}

function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-typing-dot rounded-full bg-current"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

export function TypingBubble({ label = "AI is thinking" }: { label?: string }) {
  return (
    <div className="flex animate-chat-in items-end gap-3" role="status">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--signal-orb-from)] to-[var(--signal-orb-to)] text-white">
        <AudioLines className="h-4 w-4" />
      </span>
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-signal-accentSoft px-4 py-3.5 text-signal-accent">
        <TypingDots />
        <span className="ml-1 text-xs text-signal-muted">{label}…</span>
      </div>
    </div>
  );
}

export function UserTypingBubble({ label = "Typing" }: { label?: string }) {
  return (
    <div className="flex animate-chat-in-right items-end justify-end gap-3" role="status">
      <div className="flex items-center gap-2 rounded-2xl rounded-br-md bg-signal-tealSoft px-4 py-3.5 text-signal-teal">
        <TypingDots />
        <span className="ml-1 text-xs text-signal-muted">{label}…</span>
      </div>
      <span className="mb-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal-teal text-white">
        <User className="h-4 w-4" />
      </span>
    </div>
  );
}

export function ChatBubble({
  message,
  animate = true,
  caret,
}: {
  message: ChatMessage;
  animate?: boolean;
  /** Blinking caret while the demo is “typing” this bubble. */
  caret?: boolean;
}) {
  const mine = message.role !== "assistant";
  return (
    <div
      className={cn(
        "flex items-end gap-3",
        mine ? "justify-end" : "justify-start",
        animate && (mine ? "animate-chat-in-right" : "animate-chat-in"),
      )}
    >
      {!mine ? (
        <span className="mb-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--signal-orb-from)] to-[var(--signal-orb-to)] text-white shadow-soft">
          <AudioLines className="h-4 w-4" />
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed text-signal-ink shadow-soft/40",
          mine ? "rounded-br-md bg-signal-tealSoft" : "rounded-bl-md bg-signal-accentSoft",
        )}
      >
        <p className="whitespace-pre-wrap">
          {message.content}
          {caret ? (
            <span
              className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-signal-ink/70 align-middle"
              aria-hidden
            />
          ) : null}
        </p>
        {message.time ? <p className="mt-1.5 text-[10px] text-signal-muted">{message.time}</p> : null}
      </div>
      {mine ? (
        <span className="mb-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal-teal text-white shadow-soft">
          <User className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  );
}
