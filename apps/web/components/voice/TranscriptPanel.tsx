"use client";

import { useEffect, useRef } from "react";

import { ChatBubble, TypingBubble } from "@/components/dashboard/ChatBubbles";
import { cn } from "@/lib/utils";

export function TranscriptPanel({
  messages,
  thinking = false,
  className,
}: {
  messages: { role: string; content: string }[];
  thinking?: boolean;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  return (
    <div
      className={cn("glass-card flex max-h-[26rem] flex-col overflow-hidden", className)}
      aria-live="polite"
    >
      <div className="flex items-center justify-between border-b border-signal-line px-5 py-4">
        <p className="text-[15px] font-bold text-signal-ink">Conversation</p>
        <p className="text-xs text-signal-muted">Live captions</p>
      </div>
      <div ref={listRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
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
