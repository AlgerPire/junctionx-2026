"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { CardHeader } from "@/components/dashboard/Cards";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SupplyGapChart, type SupplyGapRow } from "@/components/org/SupplyGapChart";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";

export default function OrganiserSupplyGapPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setPersonaId(
      new URLSearchParams(window.location.search).get("persona") ??
        getPersonaId() ??
        "organiser_demo",
    );
    setReady(true);
  }, []);

  const gap = useQuery({
    queryKey: ["supply-gap"],
    enabled: ready,
    queryFn: () => apiFetch<SupplyGapRow[]>("/api/organiser/supply-gap"),
  });

  function exportCsv() {
    if (!gap.data) return;
    const header = "skill,cluster,demand,supply,gap,suppressed\n";
    const body = gap.data
      .map((r) =>
        [r.skill, r.cluster, r.demand, r.suppressed ? "fewer than 3" : r.supply, r.gap, r.suppressed].join(
          ",",
        ),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skills-first-supply-gap.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell
      role="organiser"
      title="Supply gap"
      subtitle="Aggregated demand vs evidenced supply — small cells are suppressed."
    >
      <section className="glass-card p-6">
        <CardHeader
          title="Demand vs supply by skill"
          action={
            <button
              type="button"
              onClick={exportCsv}
              disabled={!gap.data?.length}
              className="inline-flex items-center gap-2 rounded-xl border border-signal-line px-3 py-1.5 text-xs font-semibold text-signal-ink disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          }
        />
        <p className="mt-2 text-sm text-signal-muted">
          Counts are event-level only. No names, nationalities, or individual profiles.
        </p>
        <div className="mt-5">
          {gap.isLoading ? (
            <p className="text-sm text-signal-muted">Loading chart…</p>
          ) : gap.data?.length ? (
            <SupplyGapChart rows={gap.data} />
          ) : (
            <p className="rounded-2xl border border-dashed border-signal-line p-4 text-sm text-signal-muted">
              No supply-gap data yet for this event.
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 glass-card p-6">
        <CardHeader title="Largest gaps" />
        <ul className="mt-3 divide-y divide-signal-line">
          {gap.data?.slice(0, 12).map((r) => (
            <li key={r.skill} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium text-signal-ink">{r.skill}</span>
                <span className="text-xs text-signal-muted">{r.cluster}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3 text-xs">
                <span className="text-signal-muted">
                  demand {r.demand} · supply {r.suppressed ? "<3" : r.supply}
                </span>
                <span className="rounded-full bg-signal-accentSoft px-2.5 py-1 font-semibold text-signal-accent">
                  gap {r.gap}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </DashboardShell>
  );
}
