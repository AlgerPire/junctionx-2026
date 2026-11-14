/** Convert recorded audio to 16 kHz mono WAV (best for Azure Speech REST). */
export async function blobToWav(blob: Blob, targetRate = 16000): Promise<Blob> {
  const ctx = new AudioContext();
  const raw = await blob.arrayBuffer();
  const decoded = await ctx.decodeAudioData(raw.slice(0));
  await ctx.close();

  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetRate), targetRate);
  const source = offline.createBufferSource();
  const mono = offline.createBuffer(1, decoded.length, decoded.sampleRate);
  const out = mono.getChannelData(0);
  const channels = decoded.numberOfChannels;
  for (let i = 0; i < decoded.length; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += decoded.getChannelData(c)[i];
    out[i] = sum / channels;
  }
  source.buffer = mono;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  const pcm = rendered.getChannelData(0);
  return encodeWav(pcm, targetRate);
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

let currentAudio: HTMLAudioElement | null = null;
let speakToken = 0;
let audioUnlocked = false;
let resumeTimer: number | null = null;
let sharedCtx: AudioContext | null = null;

/** Tiny silent wav — playing it during a click keeps later TTS allowed. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

/** Call from a user gesture (mic tap / send / open assistant) so later TTS can play. */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  audioUnlocked = true;
  try {
    const ctx = getSharedAudioContext();
    if (ctx) {
      void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch {
    /* ignore */
  }
  try {
    // HTMLAudioElement unlock survives the async TTS round-trip better than AudioContext alone.
    const silent = new Audio(SILENT_WAV);
    silent.volume = 0.01;
    void silent.play().then(
      () => {
        silent.pause();
        silent.src = "";
      },
      () => undefined,
    );
  } catch {
    /* ignore */
  }
  try {
    window.speechSynthesis?.getVoices();
  } catch {
    /* ignore */
  }
}

export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}

function clearResumeTimer() {
  if (resumeTimer !== null) {
    window.clearInterval(resumeTimer);
    resumeTimer = null;
  }
}

/** Stop interviewer TTS immediately (Azure audio + browser speechSynthesis). */
export function stopSpeaking() {
  speakToken += 1;
  clearResumeTimer();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function stopSpeakingQuiet() {
  clearResumeTimer();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function speakTimeoutMs(text: string): number {
  // ~14 chars/sec + buffer; never hang the UI forever
  return Math.min(60_000, Math.max(8_000, Math.ceil(text.length / 12) * 1000 + 4_000));
}

function withTimeout(promise: Promise<void>, ms: number, token: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      if (speakToken === token) stopSpeakingQuiet();
      resolve();
    }, ms);
    promise
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(timer);
        resolve();
      });
  });
}

async function playAzureTts(text: string, lang: string, token: number): Promise<boolean> {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const persona =
    typeof document !== "undefined"
      ? decodeURIComponent(
          document.cookie.match(/(?:^|; )signal_persona=([^;]*)/)?.[1] ?? "company_demo",
        )
      : "company_demo";
  const res = await fetch(`${api}/api/voice/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Persona-Id": persona,
    },
    body: JSON.stringify({ text, lang }),
  });
  if (!res.ok) return false;
  if (speakToken !== token) return true;
  const blob = await res.blob();
  if (!blob.size || speakToken !== token) return blob.size === 0 ? false : true;
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      if (speakToken !== token) {
        URL.revokeObjectURL(url);
        resolve();
        return;
      }
      const audio = new Audio(url);
      audio.preload = "auto";
      currentAudio = audio;
      // Re-assert unlock in case the browser suspended playback mid-fetch.
      void getSharedAudioContext()?.resume();
      audio.onended = () => {
        if (currentAudio === audio) currentAudio = null;
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        if (currentAudio === audio) currentAudio = null;
        URL.revokeObjectURL(url);
        reject(new Error("audio play failed"));
      };
      const tryPlay = () => {
        void audio.play().then(
          () => undefined,
          (err: unknown) => reject(err instanceof Error ? err : new Error("audio play failed")),
        );
      };
      if (audio.readyState >= 2) tryPlay();
      else {
        audio.oncanplaythrough = () => tryPlay();
        audio.load();
      }
    });
    return true;
  } catch {
    URL.revokeObjectURL(url);
    if (currentAudio) currentAudio = null;
    return false;
  }
}

/** Prefer Azure neural TTS; fall back to a carefully chosen browser voice. */
export async function speakNatural(text: string, lang = "en-GB"): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const token = ++speakToken;
  stopSpeakingQuiet();
  speakToken = token;

  const run = async () => {
    try {
      const played = await playAzureTts(trimmed, lang, token);
      if (played || speakToken !== token) return;
    } catch {
      /* fall through to browser */
    }
    if (speakToken !== token) return;
    await speakBrowser(trimmed, lang, token);
  };

  await withTimeout(run(), speakTimeoutMs(trimmed), token);
}

function speakBrowser(text: string, lang: string, token: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }
    if (speakToken !== token) {
      resolve();
      return;
    }

    const done = () => {
      clearResumeTimer();
      resolve();
    };

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.96;
    u.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = pickVoice(voices, lang);
    if (preferred) u.voice = preferred;
    u.onend = done;
    u.onerror = done;

    const start = () => {
      if (speakToken !== token) {
        done();
        return;
      }
      const v = pickVoice(window.speechSynthesis.getVoices(), lang);
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
      // Chrome bug: utterance can stay paused forever with no onend.
      clearResumeTimer();
      resumeTimer = window.setInterval(() => {
        if (speakToken !== token) {
          clearResumeTimer();
          return;
        }
        if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
          done();
        }
      }, 250);
    };

    if (!voices.length) {
      window.speechSynthesis.onvoiceschanged = () => start();
      window.speechSynthesis.getVoices();
      window.setTimeout(start, 150);
    } else {
      start();
    }
  });
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const langPrefix = lang.slice(0, 2).toLowerCase();
  const score = (v: SpeechSynthesisVoice) => {
    const name = v.name.toLowerCase();
    let s = 0;
    if (v.lang.toLowerCase().startsWith(langPrefix)) s += 5;
    if (v.lang.toLowerCase() === lang.toLowerCase()) s += 3;
    if (name.includes("natural") || name.includes("neural")) s += 8;
    if (name.includes("sonia") || name.includes("jenny") || name.includes("aria")) s += 7;
    if (name.includes("google") || name.includes("microsoft")) s += 4;
    if (name.includes("enhanced") || name.includes("premium")) s += 3;
    if (v.localService) s += 1;
    if (name.includes("microsoft david") || name.includes("microsoft zira")) s -= 3;
    return s;
  };
  return [...voices].sort((a, b) => score(b) - score(a))[0] ?? null;
}

const VOICE_MUTE_KEY = "signal_ai_voice_muted";

/** Whether the user previously muted AI spoken replies. */
export function getVoiceMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(VOICE_MUTE_KEY) === "1";
}

/** Persist mute so reopening the assistant (or another voice flow) keeps the choice. */
export function setVoiceMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VOICE_MUTE_KEY, muted ? "1" : "0");
}
