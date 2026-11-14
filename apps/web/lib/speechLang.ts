export type SpeechLangCode = "en-GB" | "fi-FI" | "sv-SE" | "uk-UA";

export const SPEECH_LANGS: { code: SpeechLangCode; label: string; flag: "gb" | "fi" | "se" | "ua" }[] = [
  { code: "en-GB", label: "English", flag: "gb" },
  { code: "fi-FI", label: "Suomi", flag: "fi" },
  { code: "sv-SE", label: "Svenska", flag: "se" },
  { code: "uk-UA", label: "Українська", flag: "ua" },
];

const KEY = "signal_speech_lang";

function isCode(value: string | null): value is SpeechLangCode {
  return SPEECH_LANGS.some((l) => l.code === value);
}

export function getSpeechLang(): SpeechLangCode {
  if (typeof window === "undefined") return "en-GB";
  const stored = window.localStorage.getItem(KEY);
  return isCode(stored) ? stored : "en-GB";
}

export function setSpeechLang(code: SpeechLangCode): void {
  window.localStorage.setItem(KEY, code);
}
