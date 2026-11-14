"use client";

import { useEffect, useRef } from "react";

import { ChatBubble } from "@/components/dashboard/ChatBubbles";

export function TranscriptPanel({
  messages,
}: {
  messages: { role: string; content: string }[];
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  return (
    <div className="glass-card flex max-h-[26rem] flex-col overflow-hidden" aria-live="polite">
      <div className="flex items-center justify-between border-b border-signal-line px-5 py-4">
        <p className="text-[15px] font-bold text-signal-ink">Conversation</p>
        <p className="text-xs text-signal-muted">Live captions</p>
      </div>
      <div className="space-y-5 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <p className="text-sm text-signal-muted">Messages will appear here.</p>
        ) : null}
        {messages.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
