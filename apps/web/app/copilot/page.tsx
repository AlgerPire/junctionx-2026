"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { CopilotChat } from "@/components/copilot/CopilotChat";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";

export default function CopilotPage() {
  const [briefId, setBriefId] = useState("");
  const [briefing, setBriefing] = useState<{ questions: string[]; notes: string } | null>(null);

  useEffect(() => {
    setPersonaId(getPersonaId() ?? "seeker_demo_a");
  }, []);

  const briefMe = useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ questions: string[]; notes: string }>(`/api/briefing?brief_id=${id}`),
    onSuccess: (data) => setBriefing(data),
  });

  return (
    <DashboardShell
      role="seeker"
      title="Event copilot"
      subtitle="A private chat about this event. Suggestions only — you decide."
    >
      <div className="mx-auto grid w-full max-w-3xl gap-4">
        <CopilotChat variant="full" />

        <section className="rounded-[22px] border border-signal-line/80 bg-white/90 p-4 shadow-soft sm:p-5">
          <h2 className="text-sm font-bold text-signal-ink">Brief me before a chat</h2>
          <p className="mt-1 text-sm text-signal-muted">
            Optional prep notes for a specific company brief — still your call whether to ask.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={briefId}
              onChange={(e) => setBriefId(e.target.value)}
              className="w-32 rounded-xl border border-signal-line px-3 py-2 text-sm"
              placeholder="Brief id"
              aria-label="Brief id"
            />
            <button
              type="button"
              className="rounded-xl border border-signal-line bg-signal-foam px-4 py-2 text-sm font-semibold text-signal-ink hover:bg-white"
              onClick={() => {
                const id = Number(briefId);
                if (Number.isFinite(id) && id > 0) briefMe.mutate(id);
              }}
            >
              Brief me
            </button>
          </div>
          {briefing ? (
            <div className="mt-3 rounded-2xl bg-signal-foam/70 px-3 py-3 text-sm text-signal-ink">
              <p>{briefing.notes}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-signal-muted">
                {briefing.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </DashboardShell>
  );
}
