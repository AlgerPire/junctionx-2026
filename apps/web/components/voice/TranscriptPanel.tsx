"use client";

import { useEffect, useRef } from "react";

import { ChatBubble, TypingBubble } from "@/components/dashboard/ChatBubbles";
import { cn } from "@/lib/utils";

export function TranscriptPanel({
  messages,
  thinking = false,
  className,
  hideHeader = false,
}: {
  messages: { role: string; content: string }[];
  thinking?: boolean;
  className?: string;
  hideHeader?: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  return (
    <div
      className={cn(
        "glass-card flex max-h-[26rem] w-full min-w-0 max-w-full flex-col overflow-hidden",
        className,
      )}
      aria-live="polite"
    >
      {!hideHeader ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-signal-line px-4 py-3 sm:px-5 sm:py-4">
          <p className="min-w-0 truncate text-sm font-bold text-signal-ink sm:text-[15px]">
            Conversation
          </p>
          <p className="shrink-0 text-xs text-signal-muted">Live captions</p>
        </div>
      ) : null}
      <div
        ref={listRef}
        className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-3 py-3 sm:space-y-3.5 sm:px-4 sm:py-4"
      >
        {messages.length === 0 && !thinking ? (
          <p className="text-sm text-signal-muted">Messages will appear here.</p>
        ) : null}
        {messages.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}
        {thinking ? <TypingBubble /> : null}
      </div>
    </div>
  );
}
