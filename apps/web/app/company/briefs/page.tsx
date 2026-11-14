"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock3, FileText, Inbox, Send, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { formatShortDate } from "@/components/dashboard/Cards";
import { AppShell } from "@/components/shared/AppShell";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import type { BriefStats, Bucket } from "@/lib/types";
import { cn } from "@/lib/utils";

const WORK_MODE_LABEL: Record<string, string> = { on_site: "On-site", hybrid: "Hybrid", remote: "Remote" };
const BUCKETS: { id: Bucket; label: string; tone: string }[] = [
  { id: "strong", label: "Strong", tone: "bg-emerald-500" },
  { id: "good", label: "Good", tone: "bg-signal-accent" },
  { id: "explore", label: "Explore", tone: "bg-amber-400" },
];

function sum(record: Record<string, number>): number {
  return Object.values(record).reduce((a, b) => a + b, 0);
}

export default function CompanyBriefsPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setPersonaId(
      new URLSearchParams(window.location.search).get("persona") ?? getPersonaId() ?? "company_demo",
    );
    setReady(true);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["brief-stats"],
    enabled: ready,
    queryFn: () => apiFetch<BriefStats[]>("/api/company/briefs/stats"),
  });

  const briefs = data ?? [];
  const totals = {
    published: briefs.filter((b) => b.status === "published").length,
    candidates: briefs.reduce((n, b) => n + sum(b.candidates), 0),
    requests: briefs.reduce((n, b) => n + (b.requests.requested ?? 0), 0),
    invites: briefs.reduce((n, b) => n + (b.invites.invited ?? 0) + (b.invites.accepted ?? 0), 0),
  };

  return (
    <AppShell role="company" title="My jobs" subtitle="AI-assisted drafts. You edit and publish.">
      <div className="mb-4 flex justify-end">
        <Link
          href="/company/brief/new"
          className="rounded-2xl bg-signal-accent px-4 py-2.5 text-sm font-semibold text-white"
        >
          New voice job
        </Link>
      </div>
      <div className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: FileText, label: "Published jobs", value: `${totals.published}/${briefs.length}` },
            { icon: Users, label: "Suggested candidates", value: totals.candidates },
            { icon: Inbox, label: "Requests waiting", value: totals.requests },
            { icon: Send, label: "Interview invites", value: totals.invites },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass-card flex items-center gap-3 px-4 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-signal-accentSoft text-signal-accent">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xl font-bold leading-none text-signal-ink">{value}</p>
                <p className="mt-1 text-xs text-signal-muted">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? <p className="text-sm text-signal-muted">Loading…</p> : null}
      {isError ? <p className="text-sm text-signal-warn">API unavailable</p> : null}
      {!isLoading && !isError && !briefs.length ? (
        <p className="glass-card border-dashed p-6 text-sm text-signal-muted">
          No jobs yet. Start with a short voice or text conversation.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {briefs.map((b) => {
          const total = sum(b.candidates);
          return (
            <Link
              key={b.brief_id}
              href={`/company/briefs/${b.brief_id}`}
              className="glass-card group block p-5 transition hover:shadow-glass"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-signal-ink">{b.title}</h2>
                  <p className="mt-0.5 text-xs text-signal-muted">
                    {WORK_MODE_LABEL[b.work_mode] ?? b.work_mode}
                    {b.created_at ? ` · created ${formatShortDate(b.created_at)}` : ""}
                    {b.languages.length
                      ? ` · ${b.languages.map((l) => `${l.lang.toUpperCase()} ${l.level}`).join(", ")}`
                      : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                    b.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
                  )}
                >
                  {b.status}
                </span>
              </div>

              <p className="mt-3 text-xs text-signal-muted">
                {b.must_count} must-have · {b.learnable_count} learnable · {b.nice_count} nice-to-have skills
              </p>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-signal-muted">
                  <span>Suggested candidates</span>
                  <span className="font-semibold text-signal-ink">{total}</span>
                </div>
                <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-signal-foam">
                  {total
                    ? BUCKETS.map((bk) =>
                        b.candidates[bk.id] ? (
                          <span
                            key={bk.id}
                            className={bk.tone}
                            style={{ width: `${(b.candidates[bk.id] / total) * 100}%` }}
                          />
                        ) : null,
                      )
                    : null}
                </div>
                <div className="mt-1.5 flex gap-3 text-[11px] text-signal-muted">
                  {BUCKETS.map((bk) => (
                    <span key={bk.id} className="flex items-center gap-1">
                      <span className={cn("h-2 w-2 rounded-full", bk.tone)} />
                      {bk.label} {b.candidates[bk.id] ?? 0}
                    </span>
                  ))}
                </div>
                {b.status !== "published" ? (
                  <p className="mt-1.5 text-[11px] text-signal-muted">Publish to see candidates.</p>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Requests", value: (b.requests.requested ?? 0) + (b.requests.accepted ?? 0) },
                  { label: "Invites", value: (b.invites.invited ?? 0) + (b.invites.accepted ?? 0) },
                  { label: "Agreed", value: (b.requests.accepted ?? 0) + (b.invites.accepted ?? 0) },
                ].map((x) => (
                  <div key={x.label} className="rounded-2xl bg-signal-foam px-2 py-2">
                    <p className="text-lg font-bold text-signal-ink">{x.value}</p>
                    <p className="text-[11px] text-signal-muted">{x.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-signal-muted">
                  <Clock3 className="h-4 w-4" /> Queue ~{b.queue_est_minutes} min
                </span>
                <span className="flex items-center gap-1 font-semibold text-signal-accent">
                  Review candidates <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
