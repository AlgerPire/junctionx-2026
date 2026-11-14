import { AudioLines, User } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ChatMessage {
  role: string;
  content: string;
  time?: string;
}

export function ChatBubble({ message }: { message: ChatMessage }) {
  const mine = message.role !== "assistant";
  return (
    <div className={cn("flex items-end gap-3", mine ? "justify-end" : "justify-start")}>
      {!mine ? (
        <span className="mb-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--signal-orb-from)] to-[var(--signal-orb-to)] text-white">
          <AudioLines className="h-4 w-4" />
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed text-signal-ink",
          mine ? "rounded-br-md bg-signal-tealSoft" : "rounded-bl-md bg-signal-accentSoft",
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.time ? <p className="mt-1.5 text-[10px] text-signal-muted">{message.time}</p> : null}
      </div>
      {mine ? (
        <span className="mb-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal-teal text-white">
          <User className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  );
}
