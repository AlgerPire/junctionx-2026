"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/shared/AppShell";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";

interface FollowupRow {
  id: number;
  approach_id: number;
  brief_title?: string | null;
  structured: { summary?: string; next_step?: string; remind_in_days?: number | null };
}

export default function FollowupsPage() {
  const [approachId, setApproachId] = useState("1");
  const qc = useQueryClient();
  useEffect(() => {
    setPersonaId(getPersonaId() ?? "seeker_demo_a");
  }, []);

  const list = useQuery({
    queryKey: ["followups"],
    queryFn: () => apiFetch<FollowupRow[]>("/api/followups"),
  });

  const create = useMutation({
    mutationFn: (text: string) =>
      apiFetch("/api/followups", {
        method: "POST",
        body: JSON.stringify({ approach_id: Number(approachId), text }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["followups"] }),
  });

  return (
    <AppShell title="Follow-ups">
      <p className="mb-4 text-sm text-signal-ink/70">
        After a conversation, leave a 15-second note. Skills First! structures next steps — you stay in control.
      </p>
      <label className="text-sm">
        Approach id{" "}
        <input
          value={approachId}
          onChange={(e) => setApproachId(e.target.value)}
          className="ml-2 rounded-lg border border-signal-line px-2 py-1"
        />
      </label>
      <div className="mt-3">
        <VoiceRecorder onTranscript={(t) => create.mutate(t)} />
      </div>
      <ul className="mt-6 space-y-3">
        {list.data?.map((f) => (
          <li key={f.id} className="rounded-2xl border border-signal-line bg-white/80 p-4 text-sm">
            <p className="font-semibold">{f.brief_title ?? `Approach #${f.approach_id}`}</p>
            <p className="mt-1">{f.structured.summary}</p>
            <p className="mt-1 text-signal-ink/70">Next: {f.structured.next_step}</p>
            {f.structured.remind_in_days != null ? (
              <p className="mt-1 text-signal-ink/50">Remind in {f.structured.remind_in_days} days</p>
            ) : null}
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
