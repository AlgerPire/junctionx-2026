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

/** Stop interviewer TTS immediately (Azure audio + browser speechSynthesis). */
export function stopSpeaking() {
  speakToken += 1;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/** Prefer Azure neural TTS; fall back to a carefully chosen browser voice. */
export async function speakNatural(text: string, lang = "en-GB"): Promise<void> {
  const token = ++speakToken;
  stopSpeakingQuiet();
  // stopSpeakingQuiet doesn't bump token; restore ours
  speakToken = token;

  try {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const persona =
      typeof document !== "undefined"
        ? decodeURIComponent(
            document.cookie.match(/(?:^|; )signal_persona=([^;]*)/)?.[1] ?? "seeker_demo_a",
          )
        : "seeker_demo_a";
    const res = await fetch(`${api}/api/voice/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Persona-Id": persona,
      },
      body: JSON.stringify({ text, lang }),
    });
    if (res.ok) {
      if (speakToken !== token) return;
      const blob = await res.blob();
      if (speakToken !== token) return;
      const url = URL.createObjectURL(blob);
      await new Promise<void>((resolve, reject) => {
        if (speakToken !== token) {
          URL.revokeObjectURL(url);
          resolve();
          return;
        }
        const audio = new Audio(url);
        currentAudio = audio;
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
        void audio.play().catch(reject);
      });
      return;
    }
  } catch {
    /* fall through */
  }
  if (speakToken !== token) return;
  await speakBrowser(text, lang, token);
}

function stopSpeakingQuiet() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
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
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.96;
    u.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = pickVoice(voices, lang);
    if (preferred) u.voice = preferred;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    if (!voices.length) {
      window.speechSynthesis.onvoiceschanged = () => {
        if (speakToken !== token) {
          resolve();
          return;
        }
        const v = pickVoice(window.speechSynthesis.getVoices(), lang);
        if (v) u.voice = v;
        window.speechSynthesis.speak(u);
      };
      window.speechSynthesis.getVoices();
      setTimeout(() => {
        if (speakToken === token) window.speechSynthesis.speak(u);
        else resolve();
      }, 150);
    } else {
      window.speechSynthesis.speak(u);
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
