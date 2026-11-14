"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe2, Languages, MapPin, Plane, Target, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CandidateCard } from "@/components/company/CandidateCard";
import { InviteDialog } from "@/components/company/InviteDialog";
import { BUCKET_LABEL } from "@/components/match/BucketBadge";
import { WhyPanel } from "@/components/match/WhyPanel";
import { AppShell } from "@/components/shared/AppShell";
import { ApiError, apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import type { Brief, BriefStats, Bucket, CandidateReview, Suggestion } from "@/lib/types";
import { cn } from "@/lib/utils";

const IMPORTANCE_LABEL = { must: "Must-have", learnable: "Can learn on the job", nice: "Nice to have" } as const;
const WORK_MODE_LABEL: Record<string, string> = { on_site: "On-site", hybrid: "Hybrid", remote: "Remote" };
type Filter = "all" | Bucket | "invited";

export default function CompanyBriefDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const qc = useQueryClient();
  const [why, setWhy] = useState<Suggestion | null>(null);
  const [inviting, setInviting] = useState<CandidateReview | null>(null);
  const [highlightSeeker, setHighlightSeeker] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [ready, setReady] = useState(false);
  const deepLinkDone = useRef(false);

  useEffect(() => {
    setPersonaId(
      new URLSearchParams(window.location.search).get("persona") ?? getPersonaId() ?? "company_demo",
    );
    setReady(true);
  }, []);

  const briefQuery = useQuery({
    queryKey: ["brief", id],
    enabled: ready && !!id,
    queryFn: () => apiFetch<Brief>(`/api/briefs/${id}`),
  });

  const candidatesQuery = useQuery({
    queryKey: ["brief-candidates", id],
    enabled: ready && !!id && briefQuery.data?.status === "published",
    queryFn: () => apiFetch<CandidateReview[]>(`/api/company/briefs/${id}/candidates`),
  });

  const statsQuery = useQuery({
    queryKey: ["brief-stats"],
    enabled: ready,
    queryFn: () => apiFetch<BriefStats[]>("/api/company/briefs/stats"),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["brief-candidates", id] });
    void qc.invalidateQueries({ queryKey: ["brief-stats"] });
    void qc.invalidateQueries({ queryKey: ["company-briefs-dash"] });
  };

  const publish = useMutation({
    mutationFn: () => apiFetch(`/api/briefs/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["brief", id] });
      refresh();
    },
  });

  const moveSkill = useMutation({
    mutationFn: (vars: { skillId: number; importance: "must" | "learnable" }) =>
      apiFetch<Brief>(`/api/briefs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ skill_importance: [{ skill_id: vars.skillId, importance: vars.importance }] }),
      }),
    onSuccess: (updated) => qc.setQueryData(["brief", id], updated),
  });

  const invite = useMutation({
    mutationFn: (vars: { seekerId: number; message: string; slot: string }) =>
      apiFetch("/api/invites", {
        method: "POST",
        body: JSON.stringify({
          brief_id: id,
          seeker_id: vars.seekerId,
          message: vars.message,
          proposed_slot: vars.slot,
        }),
      }),
    onSuccess: () => {
      setInviting(null);
      refresh();
    },
  });

  const withdraw = useMutation({
    mutationFn: (inviteId: number) => apiFetch(`/api/invites/${inviteId}/withdraw`, { method: "POST" }),
    onSuccess: refresh,
  });

  useEffect(() => {
    if (deepLinkDone.current || !candidatesQuery.data?.length) return;
    const params = new URLSearchParams(window.location.search);
    const inviteId = Number(params.get("invite") || "");
    const seekerId = Number(params.get("seeker") || "");
    const targetId = inviteId || seekerId;
    if (!targetId) return;
    const match = candidatesQuery.data.find((c) => c.suggestion.seeker_id === targetId);
    if (!match) return;
    deepLinkDone.current = true;
    setHighlightSeeker(targetId);
    setFilter("all");
    if (inviteId) setInviting(match);
    window.requestAnimationFrame(() => {
      document.getElementById(`candidate-${targetId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [candidatesQuery.data]);

  const brief = briefQuery.data;
  const stats = statsQuery.data?.find((s) => s.brief_id === id);
  const candidates = candidatesQuery.data ?? [];
  const visible = candidates.filter((c) =>
    filter === "all"
      ? true
      : filter === "invited"
        ? c.invite && c.invite.status !== "withdrawn"
        : c.suggestion.bucket === filter,
  );

  if (!brief) {
    return (
      <AppShell role="company" title="Job">
        <p className="text-sm text-signal-muted">{briefQuery.isError ? "Job not found." : "Loading…"}</p>
      </AppShell>
    );
  }

  const grouped = (["must", "learnable", "nice"] as const).map((imp) => ({
    imp,
    skills: brief.skills.filter((s) => s.importance === imp),
  }));
  const invitedCount = candidates.filter((c) => c.invite && c.invite.status !== "withdrawn").length;

  return (
    <AppShell role="company" title={brief.title} subtitle={brief.plain_summary}>
      <div className="mb-4 text-sm">
        <Link href="/company/briefs" className="font-semibold text-signal-accent hover:underline">
          ← My jobs
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="glass-card p-6" data-testid="brief-detail">
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid="brief-status"
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
                brief.status === "published"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700",
              )}
            >
              {brief.status}
            </span>
            <span className="text-xs text-signal-muted">AI-drafted from your conversation · you edit and publish</span>
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-signal-foam p-4">
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-signal-accent" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-signal-muted">First 90 days</p>
              <p className="mt-1 text-sm text-signal-ink">{brief.problem_90_days || "Not specified yet."}</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {grouped.map(({ imp, skills }) =>
              skills.length ? (
                <div key={imp}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-signal-muted">
                    {IMPORTANCE_LABEL[imp]}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <span
                        key={s.skill_id}
                        data-testid="brief-skill"
                        data-skill-importance={imp}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium",
                          imp === "must" && "bg-signal-accentSoft text-signal-accent",
                          imp === "learnable" && "bg-signal-tealSoft text-signal-teal",
                          imp === "nice" && "border border-signal-line bg-white text-signal-ink/80",
                        )}
                      >
                        {s.label}
                        {brief.status !== "published" && imp !== "nice" ? (
                          <button
                            type="button"
                            data-testid="brief-skill-move"
                            disabled={moveSkill.isPending}
                            onClick={() =>
                              moveSkill.mutate({
                                skillId: s.skill_id,
                                importance: imp === "must" ? "learnable" : "must",
                              })
                            }
                            className="rounded-lg bg-white/80 px-2 py-0.5 text-xs font-semibold text-signal-ink/70 hover:text-signal-ink disabled:opacity-50"
                          >
                            {imp === "must" ? "Can learn" : "Must-have"}
                          </button>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
          {brief.status !== "published" ? (
            <button
              type="button"
              data-testid="brief-publish"
              onClick={() => publish.mutate()}
              disabled={publish.isPending}
              className="mt-6 rounded-xl bg-signal-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {publish.isPending ? "Publishing…" : "Publish and see candidates"}
            </button>
          ) : null}
        </section>

        <div className="space-y-6">
          <section className="glass-card p-5">
            <h2 className="text-[15px] font-bold text-signal-ink">International readiness</h2>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li className="flex items-center gap-2.5">
                <Globe2 className="h-4 w-4 text-signal-accent" />
                International candidates {brief.international_ok ? "welcome" : "not stated"}
              </li>
              <li className="flex items-center gap-2.5">
                <Plane className="h-4 w-4 text-signal-accent" />
                Relocation support {brief.relocation_support ? "offered" : "not offered"}
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-signal-accent" />
                {WORK_MODE_LABEL[brief.work_mode] ?? brief.work_mode}
              </li>
              <li className="flex items-center gap-2.5">
                <Languages className="h-4 w-4 text-signal-accent" />
                {brief.required_languages.length
                  ? brief.required_languages.map((l) => `${l.lang.toUpperCase()} ${l.level}`).join(", ")
                  : "No language requirement stated"}
              </li>
            </ul>
            {brief.onboarding_support ? (
              <p className="mt-3 rounded-xl bg-signal-foam px-3 py-2 text-sm text-signal-ink/80">
                {brief.onboarding_support}
              </p>
            ) : null}
          </section>

          <section className="glass-card grid grid-cols-2 gap-px overflow-hidden bg-signal-line p-0">
            {[
              { label: "Suggested", value: candidates.length },
              { label: "Invited", value: invitedCount },
              { label: "Asked to talk", value: stats?.requests.requested ?? 0 },
              { label: "Queue estimate", value: `${stats?.queue_est_minutes ?? 0} min` },
            ].map((x) => (
              <div key={x.label} className="bg-white px-4 py-4">
                <p className="text-2xl font-bold text-signal-ink">{x.value}</p>
                <p className="mt-1 text-xs text-signal-muted">{x.label}</p>
              </div>
            ))}
          </section>
        </div>
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-signal-ink">
              <Users className="h-6 w-6 text-signal-accent" /> Suggested candidates
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-signal-muted">
              Ordered by evidence for your must-have skills. Aliases and approved evidence only — names
              are shared after a conversation is agreed. Nobody is hidden or rejected automatically.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 rounded-2xl bg-white p-1 shadow-soft">
            {(["all", "strong", "good", "explore", "invited"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                  filter === f ? "bg-signal-accent text-white" : "text-signal-muted hover:text-signal-ink",
                )}
              >
                {f === "all" ? "All" : f === "invited" ? "Invited" : BUCKET_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5">
          {brief.status !== "published" ? (
            <p className="glass-card border-dashed p-6 text-sm text-signal-muted">
              Publish the job to see candidates whose approved evidence fits it.
            </p>
          ) : null}
          {candidatesQuery.isLoading ? <p className="text-sm text-signal-muted">Finding candidates…</p> : null}
          {brief.status === "published" && !candidatesQuery.isLoading && !visible.length ? (
            <p className="glass-card border-dashed p-6 text-sm text-signal-muted">
              No candidates in this view yet.
            </p>
          ) : null}
          {visible.map((c) => (
            <div
              key={c.suggestion.seeker_id}
              id={`candidate-${c.suggestion.seeker_id}`}
              className={cn(
                highlightSeeker === c.suggestion.seeker_id &&
                  "rounded-[28px] ring-2 ring-signal-accent/50 ring-offset-2 ring-offset-signal-bg",
              )}
            >
              <CandidateCard
                review={c}
                busy={invite.isPending || withdraw.isPending}
                onWhy={() => setWhy(c.suggestion)}
                onInvite={() => {
                  invite.reset();
                  setInviting(c);
                }}
                onWithdraw={() => c.invite && withdraw.mutate(c.invite.id)}
              />
            </div>
          ))}
        </div>
      </section>

      <WhyPanel suggestion={why} open={!!why} onClose={() => setWhy(null)} />
      <InviteDialog
        open={!!inviting}
        alias={inviting?.suggestion.seeker_alias ?? "candidate"}
        briefTitle={brief.title}
        slotMinutes={brief.slot_minutes}
        pending={invite.isPending}
        error={invite.error instanceof ApiError ? invite.error.message : invite.error ? "Could not send" : null}
        onClose={() => setInviting(null)}
        onSend={(message, slot) =>
          inviting && invite.mutate({ seekerId: inviting.suggestion.seeker_id, message, slot })
        }
      />
    </AppShell>
  );
}
