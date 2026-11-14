"use client";

import { Keyboard, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { StatusPill } from "@/components/dashboard/Cards";
import { MicOrb, VoiceStage } from "@/components/dashboard/MicOrb";
import { apiFetch } from "@/lib/api";
import { blobToWav, getSpeechRecognition, stopSpeaking } from "@/lib/audio";
import { getSpeechLang } from "@/lib/speechLang";

type Phase = "idle" | "recording" | "transcribing";

const SILENCE_MS = 1100;

export function VoiceRecorder({
  onTranscript,
  lang: langProp,
  disabled,
  statusHint,
}: {
  onTranscript: (text: string) => void;
  lang?: string;
  disabled?: boolean;
  statusHint?: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showText, setShowText] = useState(true);
  const [typed, setTyped] = useState("");
  const [liveCaption, setLiveCaption] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<ReturnType<typeof getSpeechRecognition>>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const modeRef = useRef<"browser" | "azure">("browser");
  const finalTextRef = useRef("");
  const interimRef = useRef("");
  const heardSpeechRef = useRef(false);
  const stoppingRef = useRef(false);
  const analyserCleanupRef = useRef<(() => void) | null>(null);
  const [lang, setLang] = useState(langProp ?? "en-GB");

  useEffect(() => {
    setLang(langProp ?? getSpeechLang());
  }, [langProp]);

  useEffect(() => {
    return () => {
      clearTimer();
      clearSilenceTimer();
      analyserCleanupRef.current?.();
      mediaRef.current?.stop();
      recognitionRef.current?.abort();
    };
  }, []);

  function clearTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function clearSilenceTimer() {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }

  function armSilenceStop() {
    clearSilenceTimer();
    silenceTimerRef.current = window.setTimeout(() => {
      if (heardSpeechRef.current && !stoppingRef.current) stop();
    }, SILENCE_MS);
  }

  function startTimer() {
    setElapsed(0);
    timerRef.current = window.setInterval(() => {
      setElapsed((s) => {
        if (s >= 89) {
          stop();
          return 90;
        }
        return s + 1;
      });
    }, 1000);
  }

  async function startBrowserRecognition() {
    const recognition = getSpeechRecognition();
    if (!recognition) return false;

    modeRef.current = "browser";
    recognitionRef.current = recognition;
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    finalTextRef.current = "";
    interimRef.current = "";
    heardSpeechRef.current = false;
    stoppingRef.current = false;

    recognition.onresult = (ev) => {
      let interim = "";
      let finals = "";
      for (let i = 0; i < ev.results.length; i++) {
        const piece = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finals += `${piece} `;
        else interim += piece;
      }
      if (finals.trim()) finalTextRef.current = `${finalTextRef.current} ${finals}`.trim();
      interimRef.current = interim;
      const caption = (finalTextRef.current || interim).trim();
      setLiveCaption(caption);
      if (caption) {
        heardSpeechRef.current = true;
        armSilenceStop();
      }
    };
    recognition.onerror = (ev) => {
      if (ev.error === "aborted" || ev.error === "no-speech") return;
      setError(`Mic recognition: ${ev.error}. You can type instead.`);
      setShowText(true);
    };
    recognition.onend = () => {
      clearTimer();
      clearSilenceTimer();
      setPhase("idle");
      const text = (finalTextRef.current || interimRef.current).trim();
      setLiveCaption("");
      stoppingRef.current = false;
      if (text) onTranscript(text);
      else {
        setError("No speech detected. Hold a bit longer, or type instead.");
        setShowText(true);
      }
    };

    recognition.start();
    setPhase("recording");
    startTimer();
    return true;
  }

  async function startAzureRecording() {
    modeRef.current = "azure";
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/mp4";
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    chunksRef.current = [];
    heardSpeechRef.current = false;
    stoppingRef.current = false;

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      if (rms > 0.04) {
        heardSpeechRef.current = true;
        armSilenceStop();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    analyserCleanupRef.current = () => {
      cancelAnimationFrame(raf);
      void audioCtx.close();
      analyserCleanupRef.current = null;
    };

    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      analyserCleanupRef.current?.();
      stream.getTracks().forEach((t) => t.stop());
      clearTimer();
      clearSilenceTimer();
      const raw = new Blob(chunksRef.current, { type: mime });
      setPhase("transcribing");
      try {
        const wav = await blobToWav(raw);
        const form = new FormData();
        form.append("audio", wav, "take.wav");
        form.append("lang", lang);
        const res = await apiFetch<{ text: string }>("/api/voice/transcribe", {
          method: "POST",
          body: form,
        });
        if (res.text?.trim()) onTranscript(res.text.trim());
        else {
          setError("No speech detected. Try again or type instead.");
          setShowText(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transcription failed");
        setShowText(true);
      } finally {
        setPhase("idle");
        stoppingRef.current = false;
      }
    };
    mediaRef.current = recorder;
    recorder.start();
    setPhase("recording");
    startTimer();
  }

  async function start() {
    if (disabled || phase !== "idle") return;
    stopSpeaking();
    setError(null);
    setLiveCaption("");
    try {
      const ok = await startBrowserRecognition();
      if (!ok) await startAzureRecording();
    } catch {
      setError("Microphone permission denied. Type instead — that’s fully supported.");
      setShowText(true);
      setPhase("idle");
    }
  }

  function stop() {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    clearTimer();
    clearSilenceTimer();
    if (modeRef.current === "browser") {
      recognitionRef.current?.stop();
      return;
    }
    mediaRef.current?.stop();
  }

  function sendTyped() {
    if (!typed.trim() || disabled) return;
    stopSpeaking();
    onTranscript(typed.trim());
    setTyped("");
  }

  const recording = phase === "recording";
  const busy = phase === "transcribing" || disabled;

  const statusLabel =
    phase === "recording" ? "Listening" : phase === "transcribing" ? "Transcribing" : statusHint || "Ready";

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-signal-ink">Live voice</h2>
          <StatusPill label={statusLabel} tone={recording ? "teal" : "purple"} />
        </div>
      </div>

      <VoiceStage active={recording}>
        <MicOrb
          recording={recording}
          disabled={busy && !recording}
          onClick={() => (recording ? stop() : void start())}
          label={recording ? "Stop recording" : "Start recording"}
        />
      </VoiceStage>

      <div className="-mt-4 px-6 pb-5 text-center">
        <p className="text-lg font-bold text-signal-ink">
          {recording
            ? `Listening · ${elapsed}s`
            : phase === "transcribing"
              ? "Turning speech into text…"
              : "Tap to speak"}
        </p>
        {liveCaption ? (
          <p className="mx-auto mt-1 max-w-md text-sm italic text-signal-muted" aria-live="polite">
            “{liveCaption}”
          </p>
        ) : (
          <p className="mx-auto mt-1 max-w-sm text-sm text-signal-muted">
            Tap the mic to interrupt. Stops automatically when you pause.
          </p>
        )}
      </div>

      <div className="border-t border-signal-line px-6 py-4">
        {showText ? (
          <form
            className="flex items-center gap-2 rounded-full border border-signal-line bg-white py-1.5 pl-4 pr-1.5 focus-within:border-signal-accent/50"
            onSubmit={(e) => {
              e.preventDefault();
              sendTyped();
            }}
          >
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={busy && !recording}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-signal-muted"
              placeholder="Type your message…"
              aria-label="Type your answer"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={busy && !recording}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-signal-accent text-white transition hover:bg-signal-accentDeep disabled:opacity-40"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </form>
        ) : null}
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-signal-muted hover:text-signal-accent"
          onClick={() => setShowText((v) => !v)}
        >
          <Keyboard className="h-3.5 w-3.5" />
          {showText ? "Hide text input" : "Type instead"}
        </button>
        {error ? <p className="mt-2 text-sm text-signal-warn">{error}</p> : null}
      </div>
    </div>
  );
}
