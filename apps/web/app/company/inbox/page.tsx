"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/shared/AppShell";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";

interface InboxItem {
  approach: {
    id: number;
    status: string;
    seeker_alias?: string | null;
    brief_title?: string | null;
    queue_est_minutes?: number | null;
  };
  story: {
    skills: { label: string; evidence_quote: string }[];
  } | null;
}

export default function CompanyInboxPage() {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setPersonaId(getPersonaId() ?? "company_demo");
    setReady(true);
  }, []);

  const { data } = useQuery({
    queryKey: ["inbox"],
    enabled: ready,
    queryFn: () => apiFetch<InboxItem[]>("/api/approaches/inbox"),
  });

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "accepted" | "declined" }) =>
      apiFetch(`/api/approaches/${id}/decide`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  });

  return (
    <AppShell
      role="company"
      title="Approach inbox"
      subtitle="Aliases and approved evidenced skills only. You decide."
    >
      <div className="grid gap-4">
        {data?.length === 0 ? (
          <p className="glass-card border-dashed p-6 text-sm text-signal-muted">
            No requests yet.
          </p>
        ) : null}
        {data?.map((item) => (
          <article key={item.approach.id} className="glass-card p-5">
            <p className="text-xs uppercase tracking-wide text-signal-accent">{item.approach.status}</p>
            <h2 className="mt-1 font-display text-xl">
              {item.approach.seeker_alias} · {item.approach.brief_title}
            </h2>
            <ul className="mt-3 space-y-2">
              {item.story?.skills.slice(0, 4).map((s) => (
                <li key={s.label} className="text-sm">
                  <span className="font-semibold">{s.label}</span>
                  <span className="block italic text-signal-ink/60">“{s.evidence_quote}”</span>
                </li>
              ))}
            </ul>
            {item.approach.status === "requested" ? (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-signal-teal px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => decide.mutate({ id: item.approach.id, decision: "accepted" })}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-signal-line px-4 py-2 text-sm"
                  onClick={() => decide.mutate({ id: item.approach.id, decision: "declined" })}
                >
                  Decline
                </button>
              </div>
            ) : null}
            {item.approach.queue_est_minutes != null ? (
              <p className="mt-2 text-sm text-signal-ink/60">
                Queue estimate: ~{item.approach.queue_est_minutes} min
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </AppShell>
  );
}
