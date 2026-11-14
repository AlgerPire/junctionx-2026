"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LiveBriefCard } from "@/components/brief/LiveBriefCard";
import { AppShell } from "@/components/shared/AppShell";
import { TranscriptPanel } from "@/components/voice/TranscriptPanel";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { useInterview } from "@/components/voice/useInterview";
import { getPersonaId, setPersonaId } from "@/lib/api";

export default function NewBriefPage() {
  const interview = useInterview();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("persona") ?? getPersonaId() ?? "company_demo";
    setPersonaId(p);
    void interview.start("brief", p, params.get("first") ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <AppShell
      role="company"
      title="New hiring brief"
      subtitle="Talk through the role. First: Skill! clarifies gaps. You list the job."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-signal-line/70 bg-white/80 px-4 py-3 text-sm">
            <span className="text-signal-ink/70">
              Status:{" "}
              <span className="font-semibold text-signal-accent">{interview.status}</span>
            </span>
            <button type="button" className="underline" onClick={() => interview.setMuted((m) => !m)}>
              {interview.muted ? "Unmute" : "Mute voice"}
            </button>
          </div>
          <VoiceRecorder
            disabled={
              interview.status === "thinking" ||
              interview.status === "done" ||
              saving
            }
            statusHint="Have a normal conversation"
            onTranscript={(text) => void interview.sendUserText(text)}
          />
          <TranscriptPanel messages={interview.messages} />
          {interview.error ? <p className="text-sm text-signal-warn">{interview.error}</p> : null}
        </div>
        <div className="space-y-4">
          <LiveBriefCard draft={interview.draft} />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveListing(false)}
              className="rounded-2xl border border-signal-line bg-white px-5 py-3 text-sm font-semibold text-signal-ink disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              disabled={saving || !canList}
              onClick={() => void saveListing(true)}
              className="rounded-2xl bg-signal-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              List this job
            </button>
          </div>
          <p className="text-sm text-signal-ink/60">
            Listing publishes the brief for jobseekers at the event. You can still edit it on{" "}
            <Link href="/company/briefs" className="underline">
              My briefs
            </Link>
            .
          </p>
        </div>
      </div>
    </AppShell>
  );
}
