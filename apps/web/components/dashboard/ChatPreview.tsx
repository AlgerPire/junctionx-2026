"use client";

import { SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ChatBubble, type ChatMessage } from "./ChatBubbles";

/** Example conversation; typing a message opens the real interview with it as the first answer. */
export function ChatPreview({
  messages,
  targetHref,
  placeholder = "Type your message…",
}: {
  messages: ChatMessage[];
  targetHref: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");

  function submit() {
    const value = text.trim();
    if (!value) return;
    const sep = targetHref.includes("?") ? "&" : "?";
    router.push(`${targetHref}${sep}first=${encodeURIComponent(value)}`);
  }

  return (
    <section className="glass-card flex flex-1 flex-col p-5">
      <div className="flex-1 space-y-5">
        {messages.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}
      </div>
      <form
        className="mt-6 flex items-center gap-2 rounded-full border border-signal-line bg-white py-1.5 pl-4 pr-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
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
