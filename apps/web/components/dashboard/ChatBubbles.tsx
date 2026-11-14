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
    <div className="flex animate-chat-in items-end gap-2.5" role="status">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-sky text-white">
        <AudioLines className="h-3.5 w-3.5" />
      </span>
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-signal-sky/25 bg-[#eef5ff] px-3.5 py-2.5 text-signal-sky">
        <TypingDots />
        <span className="ml-1 text-xs text-signal-muted">{label}…</span>
      </div>
    </div>
  );
}

export function UserTypingBubble({ label = "Typing" }: { label?: string }) {
  return (
    <div className="flex animate-chat-in-right items-end justify-end gap-2.5" role="status">
      <div className="flex items-center gap-2 rounded-2xl rounded-br-md bg-signal-accent px-3.5 py-2.5 text-white">
        <TypingDots />
        <span className="ml-1 text-xs text-white/80">{label}…</span>
      </div>
      <span className="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-ink text-white">
        <User className="h-3.5 w-3.5" />
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
        "flex min-w-0 max-w-full items-end gap-2 sm:gap-2.5",
        mine ? "justify-end" : "justify-start",
        animate && (mine ? "animate-chat-in-right" : "animate-chat-in"),
      )}
    >
      {!mine ? (
        <span className="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-sky text-white shadow-soft">
          <AudioLines className="h-3.5 w-3.5" />
        </span>
      ) : null}
      <div
        className={cn(
          "min-w-0 max-w-[calc(100%-2.5rem)] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-soft/40 sm:px-3.5 sm:py-2.5",
          mine
            ? "rounded-br-md bg-signal-accent text-white"
            : "rounded-bl-md border border-signal-sky/20 bg-[#eef5ff] text-signal-ink",
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content}
          {caret ? (
            <span
              className={cn(
                "ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse align-middle",
                mine ? "bg-white/80" : "bg-signal-ink/70",
              )}
              aria-hidden
            />
          ) : null}
        </p>
        {message.time ? (
          <p className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-signal-muted")}>
            {message.time}
          </p>
        ) : null}
      </div>
      {mine ? (
        <span className="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-ink text-white shadow-soft">
          <User className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </div>
  );
}
