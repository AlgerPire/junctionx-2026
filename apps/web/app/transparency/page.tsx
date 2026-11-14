"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/shared/AppShell";
import { AuditLogTable } from "@/components/shared/AuditLogTable";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";

export default function TransparencyPage() {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const p = getPersonaId() ?? "seeker_demo_a";
    setPersonaId(p);
    setReady(true);
  }, []);

  const audit = useQuery({
    queryKey: ["audit"],
    enabled: ready,
    queryFn: () => apiFetch("/api/audit"),
  });

  const del = useMutation({
    mutationFn: () => apiFetch("/api/me/delete", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audit"] }),
  });

  const withdraw = useMutation({
    mutationFn: () => apiFetch("/api/consent/withdraw", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audit"] }),
  });

  return (
    <AppShell title="Transparency">
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-signal-line/80 bg-white/80 p-5">
          <h2 className="font-display text-xl">What Skills First! uses</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-signal-ink/80">
            <li>Approved skill stories with evidence quotes</li>
            <li>Company-stated language requirements</li>
            <li>Relocation support flags (shown as considerations)</li>
            <li>Published hiring briefs and skills taxonomy</li>
          </ul>
        </section>
        <section className="rounded-2xl border border-signal-line/80 bg-white/80 p-5">
          <h2 className="font-display text-xl">What Skills First! never uses</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-signal-ink/80">
            <li>Name, photo, age, gender</li>
            <li>Nationality or origin</li>
            <li>School or university</li>
            <li>Voice tone, accent, emotion or fluency</li>
          </ul>
        </section>
      </div>

      <p className="mt-4 text-sm text-signal-muted">
        Using Skills First! never affects access to public employment services or benefits.{" "}
        <Link href="/accessibility" className="font-semibold text-signal-accent">
          Accessibility statement
        </Link>
      </p>

      <h2 className="mt-8 font-display text-2xl">Audit log</h2>
      <p className="mt-1 mb-4 text-sm text-signal-ink/60">Plain-language record of key actions.</p>
      {audit.data ? <AuditLogTable entries={audit.data as never} /> : <p className="text-sm">Loading…</p>}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            if (confirm("Withdraw consent for the current privacy notice version?")) {
              withdraw.mutate();
            }
          }}
          className="rounded-xl border border-signal-line px-4 py-2 text-sm font-semibold text-signal-ink"
        >
          Withdraw consent
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm("Permanently delete your story, approaches, follow-ups and account data?")) {
              del.mutate();
            }
          }}
          className="rounded-xl border border-signal-warn px-4 py-2 text-sm text-signal-warn"
        >
          Delete my data
        </button>
      </div>
    </AppShell>
  );
}
