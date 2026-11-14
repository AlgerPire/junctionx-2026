"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  Loader2,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ConversationTarget {
  approach_id: number;
  brief_id: number;
  brief_title?: string | null;
  company_name?: string | null;
  status: string;
  followup_count: number;
}

interface FollowupRow {
  id: number;
  approach_id: number;
  brief_title?: string | null;
  company_name?: string | null;
  structured: { summary?: string; next_step?: string; remind_in_days?: number | null };
  voice_note_text?: string;
}

const STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  accepted: "Accepted",
  declined: "Declined",
  done: "Done",
};

export default function FollowupsPage() {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPersonaId(getPersonaId() ?? "seeker_demo_a");
    setReady(true);
  }, []);

  const conversations = useQuery({
    queryKey: ["followup-conversations"],
    enabled: ready,
    queryFn: () => apiFetch<ConversationTarget[]>("/api/followups/conversations"),
  });

  const list = useQuery({
    queryKey: ["followups"],
    enabled: ready,
    queryFn: () => apiFetch<FollowupRow[]>("/api/followups"),
  });

  const targets = conversations.data ?? [];
  const selected = useMemo(
    () => targets.find((t) => t.approach_id === selectedId) ?? targets[0] ?? null,
    [targets, selectedId],
  );

  useEffect(() => {
    if (selectedId == null && targets[0]) setSelectedId(targets[0].approach_id);
  }, [targets, selectedId]);

  const create = useMutation({
    mutationFn: (text: string) => {
      if (!selected) throw new Error("Pick a conversation first");
      return apiFetch<FollowupRow>("/api/followups", {
        method: "POST",
        body: JSON.stringify({ approach_id: selected.approach_id, text }),
      });
    },
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ["followups"] });
      void qc.invalidateQueries({ queryKey: ["followup-conversations"] });
    },
    onError: (err: Error) => setError(err.message || "Could not save follow-up"),
  });

  function submitNote(text: string) {
    const q = text.trim();
    if (!q || create.isPending || !selected) return;
    setError(null);
    create.mutate(q);
  }

  return (
    <DashboardShell
      role="seeker"
      title="Follow-ups"
      subtitle="After a chat, leave a short note. We structure the next step — you stay in control."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="glass-card overflow-hidden">
          <div className="border-b border-signal-line/80 px-4 py-3.5 sm:px-5">
            <p className="inline-flex items-center gap-2 text-sm font-bold text-signal-ink">
              <Building2 className="h-4 w-4 text-signal-accent" />
              Your conversations
            </p>
            <p className="mt-1 text-xs text-signal-muted">
              Pick one, then add a voice or text note about what to do next.
            </p>
          </div>

          {conversations.isLoading ? (
            <p className="flex items-center gap-2 px-4 py-8 text-sm text-signal-muted sm:px-5">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </p>
          ) : targets.length ? (
            <ul className="divide-y divide-signal-line/70">
              {targets.map((t) => {
                const active = selected?.approach_id === t.approach_id;
                return (
                  <li key={t.approach_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(t.approach_id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3.5 text-left transition sm:px-5",
                        active ? "bg-signal-accentSoft/60" : "hover:bg-signal-foam/70",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          active
                            ? "bg-signal-accent text-white"
                            : "bg-signal-foam text-signal-accent",
                        )}
                      >
                        <NotebookPen className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-signal-ink">
                          {t.company_name ?? "Company"}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-signal-muted">
                          {t.brief_title ?? `Brief #${t.brief_id}`}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase text-signal-muted ring-1 ring-signal-line">
                            {STATUS_LABEL[t.status] ?? t.status}
                          </span>
                          {t.followup_count > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-signal-tealSoft px-1.5 py-0.5 text-[10px] font-semibold text-signal-teal">
                              <CheckCircle2 className="h-3 w-3" />
                              {t.followup_count} note{t.followup_count === 1 ? "" : "s"}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-signal-muted">
                              No note yet
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center sm:px-5">
              <p className="text-sm font-semibold text-signal-ink">No conversations yet</p>
              <p className="mt-1 text-sm text-signal-muted">
                Ask a company to talk first — then come back to capture what to do next.
              </p>
              <Link
                href="/seeker/event"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-signal-accent px-4 py-2.5 text-sm font-semibold text-white"
              >
                Browse conversations
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>

        <section className="glass-card flex min-h-0 flex-col overflow-hidden">
          <div className="border-b border-signal-line/80 px-4 py-3.5 sm:px-5">
            <p className="inline-flex items-center gap-2 text-sm font-bold text-signal-ink">
              <Sparkles className="h-4 w-4 text-signal-accent" />
              {selected
                ? `Note for ${selected.company_name ?? "this chat"}`
                : "Leave a note"}
            </p>
            <p className="mt-1 text-xs text-signal-muted">
              ~15 seconds by voice, or type. We turn it into a summary and next step — nothing is sent
              for you.
            </p>
          </div>

          {selected ? (
            <>
              <div className="border-b border-signal-line/70 bg-signal-foam/40 px-4 py-3 sm:px-5">
                <p className="text-sm font-semibold text-signal-ink">
                  {selected.company_name ?? "Company"}
                </p>
                <p className="text-xs text-signal-muted">
                  {selected.brief_title ?? `Brief #${selected.brief_id}`}
                </p>
              </div>

              <VoiceRecorder
                embedded
                dense
                disabled={create.isPending}
                statusHint={
                  create.isPending
                    ? "Saving your note…"
                    : "Speak a short note, or type and send"
                }
                onTranscript={(t) => submitNote(t)}
              />
              {error ? <p className="px-4 pb-3 text-sm text-signal-warn">{error}</p> : null}
              {create.isSuccess && !create.isPending ? (
                <p className="px-4 pb-3 text-sm font-medium text-signal-teal">
                  Saved to your digest.
                </p>
              ) : null}
            </>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-signal-muted sm:px-5">
              Select a conversation on the left to add a follow-up.
            </p>
          )}
        </section>
      </div>

      <section className="mt-4 rounded-[22px] border border-signal-line/80 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold text-signal-ink">
            <ClipboardList className="h-4 w-4 text-signal-accent" />
            Follow-up digest
          </h2>
          <p className="text-xs text-signal-muted">{list.data?.length ?? 0} saved</p>
        </div>

        {list.isLoading ? (
          <p className="mt-4 text-sm text-signal-muted">Loading digest…</p>
        ) : list.data?.length ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {list.data.map((f) => (
              <li
                key={f.id}
                className="rounded-2xl border border-signal-line/80 bg-signal-foam/40 p-4"
              >
                <p className="text-sm font-semibold text-signal-ink">
                  {f.company_name ?? f.brief_title ?? `Approach #${f.approach_id}`}
                </p>
                {f.company_name && f.brief_title ? (
                  <p className="mt-0.5 text-xs text-signal-muted">{f.brief_title}</p>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-signal-ink/90">
                  {f.structured.summary || "—"}
                </p>
                <p className="mt-2 text-sm text-signal-accent">
                  <span className="font-semibold">Next:</span>{" "}
                  {f.structured.next_step || "Decide your next step"}
                </p>
                {f.structured.remind_in_days != null ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-signal-muted">
                    <Bell className="h-3.5 w-3.5" />
                    Remind in {f.structured.remind_in_days} day
                    {f.structured.remind_in_days === 1 ? "" : "s"}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-signal-line px-4 py-6 text-center text-sm text-signal-muted">
            Your digest is empty. After a company chat, leave a note — summary and next step appear
            here.
          </p>
        )}
      </section>
    </DashboardShell>
  );
}
