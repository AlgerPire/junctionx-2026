"use client";

import { Keyboard, Mic, SendHorizontal, Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { StatusPill } from "@/components/dashboard/Cards";
import { LanguageSwitcher } from "@/components/dashboard/LanguageCard";
import { MicOrb, VoiceStage } from "@/components/dashboard/MicOrb";
import { ImmersiveOrb } from "@/components/voice/ImmersiveOrb";
import { apiFetch } from "@/lib/api";
import { blobToWav, getSpeechRecognition, stopSpeaking, unlockAudio } from "@/lib/audio";
import {
  getDetectedSpeechLang,
  getSpeechLangPreference,
  noteUserLanguageSample,
  useSpeechLang,
} from "@/lib/speechLang";
import { cn } from "@/lib/utils";

type Phase = "idle" | "recording" | "transcribing";

const SILENCE_MS = 1100;

export function VoiceRecorder({
  onTranscript,
  lang: langProp,
  disabled,
  statusHint,
  variant = "card",
  aiState = null,
  embedded = false,
  dense = false,
}: {
  onTranscript: (text: string) => void;
  lang?: string;
  disabled?: boolean;
  statusHint?: string;
  variant?: "card" | "immersive";
  /** Skip the outer glass card when already wrapped by a parent. */
  embedded?: boolean;
  /** Compact composer for viewport-locked interview layouts. */
  dense?: boolean;
  aiState?: "speaking" | "thinking" | null;
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
  const [sharedLang] = useSpeechLang();
  const lang = langProp ?? sharedLang;

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
      if (text) deliverTranscript(text);
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
        // Auto with no sample yet: let cloud STT detect; otherwise pin the resolved lang.
        const pref = getSpeechLangPreference();
        const sttLang =
          pref === "auto" && !getDetectedSpeechLang() ? "auto" : lang;
        form.append("lang", sttLang);
        const res = await apiFetch<{ text: string }>("/api/voice/transcribe", {
          method: "POST",
          body: form,
        });
        if (res.text?.trim()) deliverTranscript(res.text);
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
    unlockAudio();
    stopSpeaking();
    setError(null);
    setLiveCaption("");
    try {
      // Browser SpeechRecognition needs a fixed locale; when Auto hasn't heard
      // anything yet, use cloud STT so language comes from the audio/text.
      const autoUnresolved =
        getSpeechLangPreference() === "auto" && !getDetectedSpeechLang();
      if (autoUnresolved) {
        await startAzureRecording();
      } else {
        const ok = await startBrowserRecognition();
        if (!ok) await startAzureRecording();
      }
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

  function deliverTranscript(text: string) {
    const clean = text.trim();
    if (!clean) return;
    noteUserLanguageSample(clean);
    onTranscript(clean);
  }

  function sendTyped() {
    if (!typed.trim() || disabled) return;
    unlockAudio();
    stopSpeaking();
    deliverTranscript(typed);
    setTyped("");
  }

  const recording = phase === "recording";
  const busy = phase === "transcribing" || disabled;
  const aiSpeaking = aiState === "speaking" && !recording;
  const aiThinking = (aiState === "thinking" || phase === "transcribing") && !recording;

  // Keep the pill short — long hints wrap and leak on narrow screens.
  const statusLabel =
    phase === "recording"
      ? "Listening"
      : phase === "transcribing"
        ? "Transcribing"
        : aiState === "thinking"
          ? "Thinking"
          : aiState === "speaking"
            ? "Speaking"
            : "Ready";

  const statusTone: "teal" | "purple" | "blue" = recording
    ? "teal"
    : aiSpeaking || aiThinking
      ? "blue"
      : "purple";

  const orbLabel = recording
    ? "Stop recording"
    : aiSpeaking
      ? "Interrupt AI and start speaking"
      : "Start recording";

  const headline = recording
    ? `Listening · ${elapsed}s`
    : phase === "transcribing"
      ? "Turning speech into text…"
      : aiSpeaking
        ? "AI is speaking"
        : aiThinking
          ? "Thinking…"
          : "Tap to speak";

  const subline = liveCaption
    ? null
    : recording
      ? "Stops automatically when you pause."
      : aiSpeaking
        ? statusHint || "Tap the mic to interrupt"
        : statusHint || "Tap the mic to speak. Stops automatically when you pause.";

  const textForm = showText ? (
    <form
      className="flex w-full items-center gap-2 rounded-full border border-signal-line bg-white py-1.5 pl-4 pr-1.5 focus-within:border-signal-accent/50"
      onSubmit={(e) => {
        e.preventDefault();
        sendTyped();
      }}
    >
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        disabled={busy && !recording}
        data-testid="voice-text-input"
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
  ) : null;

  const langSelect =
    langProp ? null : (
      <LanguageSwitcher disabled={recording} menu={variant === "immersive" ? "up" : "down"} />
    );

  if (dense) {
    return (
      <div className="min-w-0 space-y-2 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {langSelect}
          <StatusPill label={statusLabel} tone={statusTone} />
          <p className="min-w-0 flex-1 truncate text-xs text-signal-muted" aria-live="polite">
            {liveCaption
              ? `“${liveCaption}”`
              : recording
                ? `Listening · ${elapsed}s`
                : statusHint || headline}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => (recording ? stop() : void start())}
            disabled={busy && !recording}
            aria-label={orbLabel}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-soft transition disabled:opacity-40",
              recording
                ? "bg-signal-teal text-white"
                : "bg-signal-accent text-white hover:bg-signal-accentDeep",
            )}
          >
            {recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
          </button>
          <form
            className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-signal-line bg-white py-1 pl-3.5 pr-1 focus-within:border-signal-accent/50"
            onSubmit={(e) => {
              e.preventDefault();
              sendTyped();
            }}
          >
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={busy && !recording}
              data-testid="voice-text-input"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-signal-muted"
              placeholder="Type your answer…"
              aria-label="Type your answer"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={busy && !recording}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-signal-ink text-white transition hover:brightness-110 disabled:opacity-40"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </form>
        </div>
        {error ? <p className="text-sm text-signal-warn">{error}</p> : null}
      </div>
    );
  }

  if (variant === "immersive") {
    const immersiveHeadline = recording
      ? `Listening · ${elapsed}s`
      : phase === "transcribing"
        ? "Turning speech into text…"
        : aiState === "thinking"
          ? "Thinking…"
          : aiState === "speaking"
            ? "AI is speaking · tap to interrupt"
            : "Tap the orb to speak";
    return (
      <div className="flex h-full w-full flex-col items-center justify-between gap-6">
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <ImmersiveOrb
            recording={recording}
            speaking={aiState === "speaking"}
            thinking={aiState === "thinking" || phase === "transcribing"}
            disabled={busy && !recording}
            onClick={() => (recording ? stop() : void start())}
            label={orbLabel}
          />
          <p
            data-testid="voice-status"
            data-phase={phase}
            className="flex items-center gap-2 text-sm font-medium text-signal-accent"
            aria-live="polite"
          >
            <Volume2 className="h-4 w-4" aria-hidden />
            {immersiveHeadline}
          </p>
          <p className="min-h-[2.5rem] max-w-md text-center text-sm italic text-signal-muted" aria-live="polite">
            {liveCaption ? `“${liveCaption}”` : recording ? "" : "Stops automatically when you pause."}
          </p>
        </div>
        <div className="flex w-full max-w-lg flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            {langSelect}
            <button
              type="button"
              onClick={() => (recording ? stop() : void start())}
              disabled={busy && !recording}
              aria-label={recording ? "Stop recording" : "Start recording"}
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full border shadow-soft transition disabled:opacity-40",
                recording
                  ? "border-transparent bg-signal-teal text-white"
                  : "border-signal-line bg-white text-signal-accent hover:border-signal-accent/40",
              )}
            >
              {recording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => setShowText((v) => !v)}
              aria-label={showText ? "Hide text input" : "Type instead"}
              aria-pressed={showText}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border transition",
                showText
                  ? "border-signal-accent/40 bg-signal-accentSoft text-signal-accent"
                  : "border-signal-line bg-white text-signal-muted hover:text-signal-accent",
              )}
            >
              <Keyboard className="h-4 w-4" />
            </button>
          </div>
          {textForm}
          {error ? <p className="text-center text-sm text-signal-warn">{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden transition-colors duration-300",
        embedded ? "" : "glass-card",
        aiSpeaking && embedded && "bg-gradient-to-b from-signal-accentSoft/40 to-transparent",
        recording && embedded && "bg-gradient-to-b from-signal-tealSoft/50 to-transparent",
      )}
    >
      <div className={cn(embedded ? "px-3 pt-3 sm:px-5 sm:pt-4" : "px-6 pt-6")}>
        <div className="flex min-w-0 items-center justify-between gap-2">
          {!embedded ? (
            <h2 className="shrink-0 text-[15px] font-bold text-signal-ink">Live voice</h2>
          ) : (
            <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.12em] text-signal-muted">
              {aiSpeaking ? "Your mic · tap to interrupt" : "Your answer"}
            </p>
          )}
          <div className="flex min-w-0 items-center gap-2">
            {langSelect}
            <StatusPill label={statusLabel} tone={statusTone} />
          </div>
        </div>
      </div>

      <VoiceStage active={recording} speaking={aiSpeaking} compact={embedded}>
        <MicOrb
          recording={recording}
          speaking={aiSpeaking}
          thinking={aiThinking}
          disabled={busy && !recording}
          onClick={() => (recording ? stop() : void start())}
          label={orbLabel}
        />
      </VoiceStage>

      <div className={cn("-mt-1 text-center", embedded ? "px-3 pb-3 sm:px-5" : "-mt-4 px-6 pb-5")}>
        <p
          data-testid="voice-status"
          data-phase={phase}
          className={cn(
            "font-bold tracking-tight text-signal-ink transition-colors",
            embedded ? "text-base sm:text-lg" : "text-lg",
            aiSpeaking && "text-signal-accent",
            recording && "text-signal-teal",
          )}
        >
          {headline}
        </p>
        {liveCaption ? (
          <p className="mx-auto mt-1.5 max-w-md text-sm italic leading-relaxed text-signal-muted" aria-live="polite">
            “{liveCaption}”
          </p>
        ) : (
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-signal-muted">{subline}</p>
        )}
      </div>

      <div
        className={cn(
          "border-t border-signal-line/80",
          embedded ? "px-3 py-3 sm:px-5" : "px-6 py-4",
        )}
      >
        {textForm}
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-signal-muted hover:text-signal-accent sm:mt-3"
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
