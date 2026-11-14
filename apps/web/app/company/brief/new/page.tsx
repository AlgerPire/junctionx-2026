"use client";

import { ArrowLeft, LayoutPanelLeft, Maximize2, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LiveBriefCard } from "@/components/brief/LiveBriefCard";
import { AppShell } from "@/components/shared/AppShell";
import { TranscriptPanel } from "@/components/voice/TranscriptPanel";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { useInterview } from "@/components/voice/useInterview";
import { getPersonaId, setPersonaId } from "@/lib/api";
import { personaForRole } from "@/lib/nav";

type View = "immersive" | "classic";

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ListingActions({
  saving,
  canList,
  onSave,
}: {
  saving: boolean;
  canList: boolean;
  onSave: (publish: boolean) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="brief-save-draft"
          disabled={saving}
          onClick={() => onSave(false)}
          className="rounded-2xl border border-signal-line bg-white px-5 py-3 text-sm font-semibold text-signal-ink disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          data-testid="brief-list"
          disabled={saving || !canList}
          onClick={() => onSave(true)}
          className="rounded-2xl bg-signal-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          List this job
        </button>
      </div>
      <p className="text-sm text-signal-ink/60">
        Listing publishes the job for jobseekers at the event. You can still edit it on{" "}
        <Link href="/company/briefs" className="underline">
          My jobs
        </Link>
        .
      </p>
    </>
  );
}

export default function NewBriefPage() {
  const interview = useInterview();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<View>("immersive");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "classic") setView("classic");
    const p = personaForRole("company", params.get("persona") ?? getPersonaId());
    setPersonaId(p);
    void interview.start("brief", p, params.get("first") ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (view !== "immersive") return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setView("classic");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [view]);

  async function saveListing(publish: boolean) {
    setSaving(true);
    const res = await interview.finalize({ publish });
    setSaving(false);
    const id = typeof res?.brief_id === "number" ? res.brief_id : null;
    if (id) router.push(`/company/briefs/${id}`);
  }

  const canList =
    interview.status === "done" ||
    !!(interview.draft.title && interview.draft.problem_90_days) ||
    ((interview.draft.must_skills as string[] | undefined)?.length ?? 0) > 0;

  const recorderDisabled =
    interview.status === "thinking" || interview.status === "done" || saving;
  const thinking = interview.replying && !saving;
  const aiState =
    interview.status === "speaking" ? "speaking" : thinking ? "thinking" : null;
  const live = interview.status !== "idle" && interview.status !== "done";

  return (
    <AppShell
      role="company"
      title="New job"
      subtitle="Talk through the role. Skills First! clarifies gaps. You list the job."
    >
      {view === "immersive" ? (
        <div
          className="dash-bg fixed inset-0 z-50 flex flex-col overflow-y-auto lg:overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="New job — immersive conversation"
        >
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && window.history.length > 1) router.back();
                  else router.push("/company");
                }}
                className="flex items-center gap-1.5 rounded-full border border-signal-line bg-white px-3.5 py-1.5 text-sm font-medium text-signal-ink shadow-soft hover:border-signal-accent/40"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <span className="flex items-center gap-2 rounded-full border border-signal-line bg-white px-3.5 py-1.5 text-sm font-medium text-signal-ink shadow-soft">
                <span
                  className={live ? "h-2 w-2 rounded-full bg-emerald-500" : "h-2 w-2 rounded-full bg-signal-muted"}
                  aria-hidden
                />
                {live ? "Live" : interview.status === "done" ? "Ready to review" : "Connecting"}
              </span>
              <span className="rounded-full border border-signal-line bg-white px-3.5 py-1.5 font-mono text-sm font-semibold text-signal-ink/70 shadow-soft">
                {formatClock(seconds)}
              </span>
            </div>
            <div className="hidden text-center md:block">
              <p className="text-base font-bold text-signal-ink">New job</p>
              <p className="text-xs text-signal-muted">Talk it through. AI drafts. You decide what gets listed.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => interview.setMuted((m) => !m)}
                className="flex items-center gap-1.5 rounded-full border border-signal-line bg-white px-3.5 py-1.5 text-sm font-medium text-signal-ink shadow-soft hover:border-signal-accent/40"
              >
                {interview.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {interview.muted ? "Unmute" : "Mute voice"}
              </button>
              <button
                type="button"
                onClick={() => setView("classic")}
                className="flex items-center gap-1.5 rounded-full border border-signal-line bg-white px-3.5 py-1.5 text-sm font-medium text-signal-ink shadow-soft hover:border-signal-accent/40"
              >
                <LayoutPanelLeft className="h-4 w-4" />
                Classic view
              </button>
              <Link
                href="/company"
                aria-label="Leave new job"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-signal-line bg-white text-signal-muted shadow-soft hover:text-signal-ink"
              >
                <X className="h-4 w-4" />
              </Link>
            </div>
          </header>

          <div className="grid flex-1 gap-5 px-5 pb-6 sm:px-8 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] 2xl:grid-cols-[400px_minmax(0,1fr)_440px]">
            <TranscriptPanel
              messages={interview.messages}
              thinking={thinking}
              className="order-2 max-h-[28rem] lg:order-1 lg:h-full lg:max-h-none"
            />
            <section className="glass-card order-1 flex min-h-[520px] flex-col overflow-hidden p-4 lg:order-2 lg:min-h-0 xl:p-6">
              <VoiceRecorder
                variant="immersive"
                aiState={aiState}
                disabled={recorderDisabled}
                statusHint="Have a normal conversation"
                onTranscript={(text) => void interview.sendUserText(text)}
              />
            </section>
            <aside className="order-3 space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
              <LiveBriefCard draft={interview.draft} />
              <ListingActions saving={saving} canList={canList} onSave={(p) => void saveListing(p)} />
              {interview.error ? <p className="text-sm text-signal-warn">{interview.error}</p> : null}
            </aside>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-signal-line/70 bg-white/80 px-4 py-3 text-sm">
              <span className="text-signal-ink/70">
                Status:{" "}
                <span className="font-semibold text-signal-accent">{interview.status}</span>
              </span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 font-medium text-signal-accent hover:underline"
                  onClick={() => setView("immersive")}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Immersive view
                </button>
                <button type="button" className="underline" onClick={() => interview.setMuted((m) => !m)}>
                  {interview.muted ? "Unmute" : "Mute voice"}
                </button>
              </div>
            </div>
            <VoiceRecorder
              disabled={recorderDisabled}
              statusHint="Have a normal conversation"
              onTranscript={(text) => void interview.sendUserText(text)}
            />
            <TranscriptPanel messages={interview.messages} thinking={thinking} />
            {interview.error ? <p className="text-sm text-signal-warn">{interview.error}</p> : null}
          </div>
          <div className="min-w-0 space-y-4">
            <LiveBriefCard draft={interview.draft} />
            <ListingActions saving={saving} canList={canList} onSave={(p) => void saveListing(p)} />
          </div>
        </div>
      )}
    </AppShell>
  );
}
