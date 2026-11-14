"use client";

import { useEffect, useState } from "react";

export type SpeechLangCode = "en-GB" | "fi-FI" | "sv-SE" | "uk-UA";
export type SpeechLangPreference = SpeechLangCode | "auto";

export const SPEECH_LANGS: {
  code: SpeechLangCode;
  label: string;
  short: string;
  flag: "gb" | "fi" | "se" | "ua";
}[] = [
  { code: "en-GB", label: "English", short: "EN", flag: "gb" },
  { code: "fi-FI", label: "Suomi", short: "FI", flag: "fi" },
  { code: "sv-SE", label: "Svenska", short: "SV", flag: "se" },
  { code: "uk-UA", label: "Українська", short: "UK", flag: "ua" },
];

const KEY = "signal_speech_lang";
const DETECTED_KEY = "signal_speech_detected";
const EVENT = "signal:speech-lang";
const DETECTED_EVENT = "signal:speech-detected";

function isCode(value: string | null): value is SpeechLangCode {
  return SPEECH_LANGS.some((l) => l.code === value);
}

function isPreference(value: string | null): value is SpeechLangPreference {
  return value === "auto" || isCode(value);
}

function countMatches(text: string, re: RegExp): number {
  return (text.match(re) || []).length;
}

/**
 * Infer language from spoken/typed content (not browser locale).
 * Returns null when there isn't enough signal yet.
 */
export function detectLangFromText(text: string): SpeechLangCode | null {
  const raw = text.trim();
  if (raw.length < 3) return null;

  const cyrillic = countMatches(raw, /[\u0400-\u04FF]/g);
  const latin = countMatches(raw, /[A-Za-zÄÖÅäöå]/g);
  if (cyrillic >= 3 && cyrillic >= latin) {
    return "uk-UA";
  }

  const lower = raw.toLowerCase();
  const scores: Record<SpeechLangCode, number> = {
    "en-GB": 0,
    "fi-FI": 0,
    "sv-SE": 0,
    "uk-UA": 0,
  };

  // Character cues
  scores["fi-FI"] += countMatches(lower, /[äö]/g) * 2;
  scores["sv-SE"] += countMatches(lower, /[åäö]/g) * 2;
  scores["sv-SE"] += countMatches(lower, /å/g) * 3; // å is strongly Swedish among our set

  // Word cues (word boundaries; keep lists short and distinctive)
  const fiWords =
    /\b(ja|on|ei|että|olen|olenko|minä|sinä|me|te|he|kun|jos|tai|mutta|hyvä|kiitos|tarvitsemme|tarvitsen|haluan|voidaan|sekä|tämä|tuo|ne|mitä|mikä|olleet|pitäisi|työntekijä|rooli)\b/g;
  const svWords =
    /\b(och|att|det|är|som|för|med|jag|du|vi|ni|de|inte|eller|men|tack|behöver|behövs|skulle|kan|denna|detta|vilken|roll|anställa|tjänst)\b/g;
  const enWords =
    /\b(the|and|is|are|to|for|with|you|we|they|need|want|have|this|that|would|can|please|hiring|role|job|candidate|brief|analyst|developer)\b/g;

  scores["fi-FI"] += countMatches(lower, fiWords) * 4;
  scores["sv-SE"] += countMatches(lower, svWords) * 4;
  scores["en-GB"] += countMatches(lower, enWords) * 4;

  // Finnish often compounds without spaces — reward long tokens with umlauts
  if (/[äö]/.test(lower) && lower.split(/\s+/).some((w) => w.length >= 10)) {
    scores["fi-FI"] += 2;
  }

  let best: SpeechLangCode = "en-GB";
  let bestScore = -1;
  let second = -1;
  (Object.keys(scores) as SpeechLangCode[]).forEach((code) => {
    const s = scores[code];
    if (s > bestScore) {
      second = bestScore;
      bestScore = s;
      best = code;
    } else if (s > second) {
      second = s;
    }
  });

  // Need a clear winner
  if (bestScore < 4) return null;
  if (bestScore - second < 2 && bestScore < 8) return null;
  return best;
}

export function getSpeechLangPreference(): SpeechLangPreference {
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem(KEY);
  if (isPreference(stored)) return stored;
  return "auto";
}

/** Last language inferred from the user's speech/text while Auto is on. */
export function getDetectedSpeechLang(): SpeechLangCode | null {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(DETECTED_KEY);
  return isCode(stored) ? stored : null;
}

function setDetectedSpeechLang(code: SpeechLangCode) {
  if (typeof window === "undefined") return;
  const prev = window.sessionStorage.getItem(DETECTED_KEY);
  window.sessionStorage.setItem(DETECTED_KEY, code);
  if (prev !== code) {
    window.dispatchEvent(new CustomEvent(DETECTED_EVENT, { detail: code }));
  }
}

export function clearDetectedSpeechLang() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(DETECTED_KEY);
  window.dispatchEvent(new CustomEvent(DETECTED_EVENT, { detail: null }));
}

/**
 * Feed a user utterance (typed or transcribed). When preference is Auto,
 * updates the session-detected language from the content.
 */
export function noteUserLanguageSample(text: string): SpeechLangCode | null {
  if (getSpeechLangPreference() !== "auto") return null;
  const detected = detectLangFromText(text);
  if (!detected) return getDetectedSpeechLang();
  setDetectedSpeechLang(detected);
  return detected;
}

export function resolveSpeechLang(
  pref: SpeechLangPreference = getSpeechLangPreference(),
): SpeechLangCode {
  if (pref !== "auto") return pref;
  return getDetectedSpeechLang() ?? "en-GB";
}

/** Resolved language for mic, TTS, and API calls. */
export function getSpeechLang(): SpeechLangCode {
  return resolveSpeechLang(getSpeechLangPreference());
}

export function setSpeechLang(code: SpeechLangPreference) {
  window.localStorage.setItem(KEY, code);
  if (code !== "auto") {
    // Fixed choice wins; clear content-based detection so it doesn't linger.
    clearDetectedSpeechLang();
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: code }));
}

/** Preference including Auto — use in language pickers. */
export function useSpeechLangPreference(): [
  SpeechLangPreference,
  (code: SpeechLangPreference) => void,
  SpeechLangCode | null,
] {
  const [pref, setPref] = useState<SpeechLangPreference>("auto");
  const [detected, setDetected] = useState<SpeechLangCode | null>(null);

  useEffect(() => {
    setPref(getSpeechLangPreference());
    setDetected(getDetectedSpeechLang());
    const onPref = () => setPref(getSpeechLangPreference());
    const onDetected = () => setDetected(getDetectedSpeechLang());
    window.addEventListener(EVENT, onPref);
    window.addEventListener(DETECTED_EVENT, onDetected);
    window.addEventListener("storage", onPref);
    return () => {
      window.removeEventListener(EVENT, onPref);
      window.removeEventListener(DETECTED_EVENT, onDetected);
      window.removeEventListener("storage", onPref);
    };
  }, []);

  return [pref, setSpeechLang, detected];
}

/** Resolved language for UI that needs a concrete locale (chat copy, etc.). */
export function useSpeechLang(): [SpeechLangCode, (code: SpeechLangPreference) => void] {
  const [pref, setPref, detected] = useSpeechLangPreference();
  const resolved = pref === "auto" ? (detected ?? "en-GB") : pref;
  return [resolved, setPref];
}
