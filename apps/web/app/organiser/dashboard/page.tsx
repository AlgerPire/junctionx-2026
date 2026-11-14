"use client";

import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Download, Eye, Handshake, Radar, Shield, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CardHeader, StatRow, StatusPill } from "@/components/dashboard/Cards";
import { ChatBubble } from "@/components/dashboard/ChatBubbles";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MicOrb, VoiceStage } from "@/components/dashboard/MicOrb";
import { SupplyGapChart, type SupplyGapRow } from "@/components/org/SupplyGapChart";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";

export default function OrganiserDashboardPage() {
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

  const stats = useQuery({
    queryKey: ["event-stats"],
    enabled: ready,
    queryFn: () =>
      apiFetch<{
        approaches_total: number;
        accepted: number;
        acceptance_rate: number;
        approved_stories: number;
      }>("/api/organiser/event-stats"),
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

  const top = gap.data?.[0];
  const acceptance = stats.data ? `${(stats.data.acceptance_rate * 100).toFixed(0)}%` : "—";

  return (
    <DashboardShell
      role="organiser"
      title="Organiser dashboard"
      subtitle="Aggregated supply gaps and event health — never individual profiling."
    >
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section className="glass-card overflow-hidden">
            <div className="px-6 pt-6">
              <CardHeader title="Live event pulse" action={<StatusPill label="Active" />} />
            </div>
            <VoiceStage active>
              <MicOrb href="/organiser/fairness" label="Open Bias Mirror" icon={Radar} />
            </VoiceStage>
            <StatRow
              stats={[
                {
                  icon: Handshake,
                  value: String(stats.data?.approaches_total ?? "—"),
                  label: "Approaches",
                  tone: "purple",
                },
                { icon: TrendingUp, value: acceptance, label: "Acceptance", tone: "teal" },
                {
                  icon: BadgeCheck,
                  value: String(stats.data?.approved_stories ?? "—"),
                  label: "Approved stories",
                  tone: "blue",
                },
              ]}
            />
          </section>

          <section className="glass-card p-6">
            <CardHeader
              title="Supply-gap radar"
              action={<span className="text-xs text-signal-muted">Small cells suppressed</span>}
            />
            <div className="mt-4">
              {gap.data ? (
                <SupplyGapChart rows={gap.data} />
              ) : (
                <p className="text-sm text-signal-muted">Loading chart…</p>
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="glass-card p-5">
            <h2 className="text-[15px] font-bold text-signal-ink">Quick actions</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <QuickAction href="/organiser/fairness" icon={Shield} label="Bias Mirror" />
              <QuickAction href="/transparency" icon={Eye} label="Transparency" />
              <button
                type="button"
                onClick={exportCsv}
                className="flex items-center gap-3 rounded-2xl border border-signal-line px-4 py-3 text-left text-sm font-medium text-signal-ink transition hover:border-signal-accent/30"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-signal-skySoft text-signal-sky">
                  <Download className="h-3.5 w-3.5" />
                </span>
                Export CSV
              </button>
              <QuickAction href="/organiser/supply-gap" icon={Radar} label="Supply gap" />
            </div>
          </section>

          <section className="glass-card flex-1 p-5">
            <h2 className="text-[15px] font-bold text-signal-ink">Top uncovered needs</h2>
            <ul className="mt-3 divide-y divide-signal-line">
              {gap.data?.slice(0, 5).map((r) => (
                <li key={r.skill} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-signal-ink">{r.skill}</span>
                    <span className="text-xs text-signal-muted">{r.cluster}</span>
                  </span>
                  <span className="rounded-full bg-signal-accentSoft px-2.5 py-1 text-xs font-semibold text-signal-accent">
                    gap {r.gap}
                  </span>
                </li>
              ))}
            </ul>
            {top ? (
              <div className="mt-5">
                <ChatBubble
                  message={{
                    role: "assistant",
                    content: `Biggest gap right now: ${top.skill}. Consider inviting training providers or companies who can onboard for it.`,
                  }}
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Shield;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-signal-line px-4 py-3 text-sm font-medium text-signal-ink transition hover:border-signal-accent/30"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-signal-accentSoft text-signal-accent">
        <Icon className="h-3.5 w-3.5" />
      </span>
      {label}
    </Link>
  );
}
