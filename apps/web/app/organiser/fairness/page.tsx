"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/shared/AppShell";
import { BiasMirrorTable } from "@/components/org/BiasMirrorTable";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";

interface FairnessResult {
  n_tested: number;
  dto_leaks: string[];
  attributes: Record<string, { identical_pct: number; n_tested: number; pass: boolean }>;
  differences: unknown[];
}

export default function FairnessPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setPersonaId(getPersonaId() ?? "organiser_demo");
    setReady(true);
  }, []);

  const run = useMutation({
    mutationFn: () =>
      apiFetch<FairnessResult>("/api/fairness/run", {
        method: "POST",
        body: JSON.stringify({ n_seekers: 20 }),
      }),
  });

  return (
    <AppShell
      role="organiser"
      title="Bias Mirror"
      subtitle="Prove suggestions stay identical when non-skill attributes change."
    >
      <p className="max-w-2xl text-sm text-signal-ink/75">
        We re-run suggestions after changing only non-skill attributes (name/alias, nationality,
        university, career-path label). Matching DTOs never include those fields — this page proves
        it live.
      </p>
      <button
        type="button"
        disabled={!ready || run.isPending}
        onClick={() => run.mutate()}
        className="mt-4 rounded-xl bg-signal-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {run.isPending ? "Running…" : "Run check"}
      </button>

      {run.data ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm">Tested {run.data.n_tested} seekers with approved stories.</p>
          {run.data.dto_leaks.length ? (
            <p className="text-sm text-red-700">DTO leaks: {run.data.dto_leaks.join(", ")}</p>
          ) : (
            <p className="text-sm text-signal-accent">DTO field-name guard: no banned fields.</p>
          )}
          <BiasMirrorTable attributes={run.data.attributes} />
          <p className="text-sm text-signal-ink/60">
            Differences found: {run.data.differences.length} (expected 0)
          </p>
        </div>
      ) : null}
    </AppShell>
  );
}
