"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { SPEECH_LANGS, getSpeechLang, setSpeechLang, type SpeechLangCode } from "@/lib/speechLang";
import { cn } from "@/lib/utils";

function Flag({ kind }: { kind: "gb" | "fi" | "se" | "ua" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 overflow-hidden rounded-full" aria-hidden>
      <defs>
        <clipPath id={`flag-${kind}`}>
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath={`url(#flag-${kind})`}>
        {kind === "gb" ? (
          <>
            <rect width="24" height="24" fill="#2b3f8f" />
            <path d="M0 0 24 24M24 0 0 24" stroke="#fff" strokeWidth="5" />
            <path d="M0 0 24 24M24 0 0 24" stroke="#d6283a" strokeWidth="1.6" />
            <path d="M12 0v24M0 12h24" stroke="#fff" strokeWidth="7" />
            <path d="M12 0v24M0 12h24" stroke="#d6283a" strokeWidth="4" />
          </>
        ) : null}
        {kind === "fi" ? (
          <>
            <rect width="24" height="24" fill="#fff" />
            <path d="M9 0v24M0 12h24" stroke="#1f4fa3" strokeWidth="5" />
          </>
        ) : null}
        {kind === "se" ? (
          <>
            <rect width="24" height="24" fill="#2a6bb5" />
            <path d="M9 0v24M0 12h24" stroke="#f5c400" strokeWidth="4" />
          </>
        ) : null}
        {kind === "ua" ? (
          <>
            <rect width="24" height="12" fill="#2a6bd1" />
            <rect y="12" width="24" height="12" fill="#f8d23a" />
          </>
        ) : null}
      </g>
    </svg>
  );
}

export function LanguageCard() {
  const [current, setCurrent] = useState<SpeechLangCode>("en-GB");

  useEffect(() => {
    setCurrent(getSpeechLang());
  }, []);

  function choose(code: SpeechLangCode) {
    setSpeechLang(code);
    setCurrent(code);
  }

  return (
    <section className="glass-card p-5">
      <h2 className="text-[15px] font-bold text-signal-ink">Language</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {SPEECH_LANGS.map((l) => {
          const active = l.code === current;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => choose(l.code)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                active
                  ? "border-signal-accent/60 bg-signal-accentSoft/60 text-signal-ink"
                  : "border-signal-line bg-white text-signal-ink hover:border-signal-accent/30",
              )}
            >
              <Flag kind={l.flag} />
              <span className="min-w-0 flex-1 truncate">{l.label}</span>
              {active ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-signal-accent text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-signal-muted">Used for speech recognition and live captions.</p>
    </section>
  );
}
