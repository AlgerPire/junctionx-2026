"use client";

import { Check, ChevronDown, Languages, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  SPEECH_LANGS,
  useSpeechLangPreference,
  type SpeechLangPreference,
} from "@/lib/speechLang";
import { cn } from "@/lib/utils";

export function Flag({
  kind,
  className,
}: {
  kind: "gb" | "fi" | "se" | "ua" | "auto";
  className?: string;
}) {
  if (kind === "auto") {
    return (
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal-accentSoft text-signal-accent",
          className,
        )}
        aria-hidden
      >
        <Sparkles className="h-3 w-3" />
      </span>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5 shrink-0 overflow-hidden rounded-full", className)}
      aria-hidden
    >
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

function preferenceLabel(pref: SpeechLangPreference): string {
  if (pref === "auto") return "Auto-detect";
  return SPEECH_LANGS.find((l) => l.code === pref)?.label ?? pref;
}

function preferenceFlag(pref: SpeechLangPreference): "gb" | "fi" | "se" | "ua" | "auto" {
  if (pref === "auto") return "auto";
  return SPEECH_LANGS.find((l) => l.code === pref)?.flag ?? "gb";
}

const OPTIONS: { value: SpeechLangPreference; label: string; hint?: string }[] = [
  { value: "auto", label: "Auto-detect", hint: "From your speech or text" },
  ...SPEECH_LANGS.map((l) => ({ value: l.code as SpeechLangPreference, label: l.label })),
];

/** Compact language picker with prefix icon — dropdown so it never wraps awkwardly. */
export function LanguageSwitcher({
  className,
  disabled,
  menu = "down",
}: {
  className?: string;
  disabled?: boolean;
  menu?: "up" | "down";
}) {
  const [pref, choose, detected] = useSpeechLangPreference();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const autoHint = detected
    ? SPEECH_LANGS.find((l) => l.code === detected)?.short
    : null;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex max-w-full items-center gap-2 rounded-full border border-signal-line bg-white py-1.5 pl-2.5 pr-2.5 text-left text-sm font-medium text-signal-ink shadow-soft transition",
          "hover:border-signal-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-accent/30",
          open && "border-signal-accent/50",
          disabled && "opacity-50",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal-accentSoft text-signal-accent">
          <Languages className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-signal-muted sm:inline">
          Language
        </span>
        <span className="h-4 w-px shrink-0 bg-signal-line" aria-hidden />
        <Flag kind={preferenceFlag(pref)} />
        <span className="min-w-0 truncate">
          {preferenceLabel(pref)}
          {pref === "auto" ? (
            <span className="ml-1 text-xs font-normal text-signal-muted">
              {autoHint ? `(${autoHint})` : "· listening…"}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-signal-muted transition", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Conversation language"
          className={cn(
            "absolute left-0 z-40 min-w-[220px] overflow-hidden rounded-2xl border border-signal-line bg-white py-1.5 shadow-glass animate-loader-rise",
            menu === "up" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {OPTIONS.map((opt) => {
            const active = pref === opt.value;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    choose(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition",
                    active
                      ? "bg-signal-accentSoft/70 font-semibold text-signal-ink"
                      : "text-signal-ink/80 hover:bg-signal-mist",
                  )}
                >
                  <Flag kind={preferenceFlag(opt.value)} />
                  <span className="min-w-0 flex-1">
                    <span className="block leading-tight">{opt.label}</span>
                    {opt.hint ? (
                      <span className="block text-[11px] font-normal text-signal-muted">{opt.hint}</span>
                    ) : null}
                  </span>
                  {active ? <Check className="h-4 w-4 text-signal-accent" strokeWidth={2.5} /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function LanguageCard() {
  const [pref, choose, detected] = useSpeechLangPreference();

  return (
    <section className="glass-card p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-accentSoft text-signal-accent">
          <Languages className="h-4 w-4" />
        </span>
        <h2 className="text-[15px] font-bold text-signal-ink">Language</h2>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => choose("auto")}
          aria-pressed={pref === "auto"}
          className={cn(
            "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
            pref === "auto"
              ? "border-signal-accent/60 bg-signal-accentSoft/60 text-signal-ink"
              : "border-signal-line bg-white text-signal-ink hover:border-signal-accent/30",
          )}
        >
          <Flag kind="auto" />
          <span className="min-w-0 flex-1">
            <span className="block truncate">Auto-detect</span>
            <span className="block text-[11px] font-normal text-signal-muted">
              {detected
                ? `Heard as ${SPEECH_LANGS.find((l) => l.code === detected)?.label}`
                : "Learns from what you say or type"}
            </span>
          </span>
          {pref === "auto" ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-signal-accent text-white">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          ) : null}
        </button>
        {SPEECH_LANGS.map((l) => {
          const active = pref === l.code;
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
      <p className="mt-3 text-xs text-signal-muted">
        Auto learns from what you say or type — not from the browser language. The mic and
        captions follow the detected or chosen language.
      </p>
    </section>
  );
}
