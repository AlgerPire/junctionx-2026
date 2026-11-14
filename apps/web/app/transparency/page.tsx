"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Bot,
  Captions,
  CheckCircle2,
  Database,
  FileCheck2,
  Mic,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ACTION_LABEL, AuditLogTable, type AuditEntry } from "@/components/shared/AuditLogTable";
import { AppShell } from "@/components/shared/AppShell";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Feature {
  icon: LucideIcon;
  title: string;
  ai: string;
  human: string;
  data: string;
  safeguard: string;
}

const FEATURES: Feature[] = [
  {
    icon: Mic,
    title: "Voice or text conversation",
    ai: "Transcribes speech and asks follow-up questions about what you just said, in your chosen language.",
    human: "You choose voice or typing, answer in your own words and can stop at any time.",
    data: "Your answers for this conversation only.",
    safeguard: "Audio is never stored. Every voice step has a typed alternative and captions.",
  },
  {
    icon: FileCheck2,
    title: "Skill story",
    ai: "Suggests skill labels from a fixed list and points to the exact sentence that shows each one.",
    human: "You edit, remove or confirm every skill before anything is shared.",
    data: "Approved skills and your own quotes.",
    safeguard: "Quotes are checked in code to be exact words from your conversation.",
  },
  {
    icon: Scale,
    title: "Matching",
    ai: "None. Matching is plain code that compares skills and stated requirements.",
    human: "Companies and jobseekers decide who to talk with.",
    data: "Approved skills, brief skills, language requirements.",
    safeguard: "Results are buckets with reasons, never numeric scores. Nobody is filtered out automatically.",
  },
  {
    icon: Users,
    title: "Candidate review for companies",
    ai: "None for ranking. Labels show which parts came from an AI mapping and which are the person's own words.",
    human: "A recruiter reads the evidence and the 'check in conversation' notes.",
    data: "Alias, approved evidence, must-have checklist.",
    safeguard: "Flags are prompts for a conversation, never a reason to reject.",
  },
  {
    icon: Send,
    title: "Interview invitations and requests",
    ai: "None.",
    human: "Companies invite, jobseekers accept or decline. Either side can say no.",
    data: "Brief, alias, proposed time slot.",
    safeguard: "Names are revealed only after the other side accepts.",
  },
  {
    icon: Bot,
    title: "Assistant and job drafting",
    ai: "Drafts jobs, explains matches and answers questions about the event.",
    human: "Companies edit and publish every job themselves.",
    data: "What you type to the assistant in that session.",
    safeguard: "The assistant may explain and draft only. It never scores or decides about a person.",
  },
  {
    icon: ShieldCheck,
    title: "Bias Mirror (organisers)",
    ai: "None. Aggregated statistics computed in code.",
    human: "Organisers decide how to close supply gaps.",
    data: "Aggregates only — no individual profiles.",
    safeguard: "Small groups are suppressed so no one can be singled out.",
  },
];

const USES = [
  "Approved skill stories with evidence quotes",
  "Company-stated language requirements",
  "Relocation support (shown as a consideration)",
  "Published hiring jobs and the skills taxonomy",
];

const NEVER_USES = [
  "Name, photo, age or gender",
  "Nationality or origin",
  "School or university",
  "Voice tone, accent, emotion or fluency",
  "Home address",
];

const RETENTION = [
  "Audio is never stored.",
  "Transcripts are deleted when you approve your story, or within 24 hours at the latest.",
  "Approved stories are removed a fixed period after the event unless you renew them.",
  "Audit records are kept for a defined period so decisions can be checked.",
];

const CATEGORIES: { id: string; label: string; match: (action: string) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "ai", label: "AI-assisted", match: (a) => a.startsWith("interview_") || a === "copilot_ask" || a === "brief_create_from_interview" },
  { id: "human", label: "Human decisions", match: (a) => ["story_approve", "story_patch", "brief_patch", "brief_publish", "approach_decide", "invite_respond", "invite_withdraw", "invite_create", "approach_create"].includes(a) },
  { id: "views", label: "Views", match: (a) => a === "suggestion_view" || a === "fairness_run" },
  { id: "privacy", label: "Consent & data", match: (a) => a.startsWith("consent_") || a === "delete_my_data" },
];

export default function TransparencyPage() {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [persona, setPersona] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);

  useEffect(() => {
    const p = getPersonaId() ?? "seeker_demo_a";
    setPersonaId(p);
    setPersona(p);
    setReady(true);
  }, []);

  const audit = useQuery({
    queryKey: ["audit"],
    enabled: ready,
    queryFn: () => apiFetch<AuditEntry[]>("/api/audit?limit=200"),
  });

  const del = useMutation({
    mutationFn: () => apiFetch("/api/me/delete", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audit"] }),
  });

  const withdraw = useMutation({
    mutationFn: () => apiFetch("/api/consent/withdraw", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audit"] }),
  });

  const entries = audit.data ?? [];
  const scoped = onlyMine ? entries.filter((e) => e.actor_id === persona) : entries;
  const counts = useMemo(
    () => Object.fromEntries(CATEGORIES.map((c) => [c.id, scoped.filter((e) => c.match(e.action)).length])),
    [scoped],
  );
  const active = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];
  const visible = scoped.filter((e) => active.match(e.action));
  const topActions = useMemo(() => {
    const tally = new Map<string, number>();
    scoped.forEach((e) => tally.set(e.action, (tally.get(e.action) ?? 0) + 1));
    return Array.from(tally.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [scoped]);

  return (
    <AppShell
      title="Transparency"
      subtitle="What every feature does, where AI helps, where people decide, and what is recorded."
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Sparkles, title: "AI drafts, people decide", text: "AI may extract, explain and draft. Never score, rank or reject." },
          { icon: Scale, title: "No numeric scores", text: "Match buckets with reasons you can read." },
          { icon: UserCheck, title: "Alias first", text: "Names are shared only after both sides agree." },
          { icon: Captions, title: "Voice optional", text: "Every voice step has a typed fallback and captions." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="glass-card p-4">
            <Icon className="h-5 w-5 text-signal-accent" />
            <p className="mt-2 text-sm font-bold text-signal-ink">{title}</p>
            <p className="mt-1 text-xs text-signal-muted">{text}</p>
          </div>
        ))}
      </section>

      <h2 className="mt-8 text-2xl font-bold text-signal-ink">Feature by feature</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {FEATURES.map((f) => (
          <article key={f.title} className="glass-card p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-signal-accentSoft text-signal-accent">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-bold text-signal-ink">{f.title}</h3>
            </div>
            <dl className="mt-4 grid gap-2.5 text-sm">
              <Row label="AI does" icon={Bot} text={f.ai} />
              <Row label="People decide" icon={UserCheck} text={f.human} />
              <Row label="Data used" icon={Database} text={f.data} />
            </dl>
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-signal-foam px-3 py-2 text-xs text-signal-ink/80">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              {f.safeguard}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <ListCard title="What matching uses" icon={CheckCircle2} tone="text-emerald-600" items={USES} />
        <ListCard title="What matching never uses" icon={Ban} tone="text-signal-warn" items={NEVER_USES} />
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-signal-ink">Activity record</h2>
            <p className="mt-1 text-sm text-signal-muted">
              Every change is written to an audit log. Conversation content is never recorded here.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-signal-ink">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            Only my actions
          </label>
        </div>

        {topActions.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {topActions.map(([action, n]) => (
              <div key={action} className="glass-card px-4 py-3">
                <p className="text-xl font-bold text-signal-ink">{n}</p>
                <p className="mt-0.5 text-xs text-signal-muted">{ACTION_LABEL[action] ?? action}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                category === c.id
                  ? "bg-signal-accent text-white"
                  : "border border-signal-line bg-white text-signal-muted hover:text-signal-ink",
              )}
            >
              {c.label} · {counts[c.id] ?? 0}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {audit.isLoading ? <p className="text-sm text-signal-muted">Loading…</p> : null}
          {audit.isError ? <p className="text-sm text-signal-warn">Audit log unavailable.</p> : null}
          {audit.data ? (
            visible.length ? (
              <AuditLogTable entries={visible} />
            ) : (
              <p className="glass-card border-dashed p-5 text-sm text-signal-muted">No activity in this view.</p>
            )
          ) : null}
        </div>
      </section>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="glass-card p-5">
          <h2 className="text-lg font-bold text-signal-ink">How long data is kept</h2>
          <ul className="mt-3 space-y-2 text-sm text-signal-ink/80">
            {RETENTION.map((r) => (
              <li key={r} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-signal-accent" />
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-signal-muted">
            Using Skills First! never affects access to public employment services or benefits.{" "}
            <Link href="/accessibility" className="font-semibold text-signal-accent">
              Accessibility statement
            </Link>
          </p>
        </section>

        <section className="glass-card p-5">
          <h2 className="text-lg font-bold text-signal-ink">Your controls</h2>
          <p className="mt-1 text-sm text-signal-muted">
            You can change your mind at any time. Both actions are recorded in the activity log.
          </p>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => {
                if (confirm("Withdraw consent for the current privacy notice version?")) withdraw.mutate();
              }}
              disabled={withdraw.isPending}
              className="flex w-full items-center justify-between rounded-2xl border border-signal-line bg-white px-4 py-3 text-left text-sm disabled:opacity-50"
            >
              <span>
                <span className="block font-semibold text-signal-ink">Withdraw consent</span>
                <span className="text-xs text-signal-muted">Marks your consent as withdrawn. You will be asked again before continuing.</span>
              </span>
              <ShieldCheck className="h-5 w-5 text-signal-accent" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Permanently delete your story, approaches, invitations, follow-ups and account data?")) {
                  del.mutate();
                }
              }}
              disabled={del.isPending}
              className="flex w-full items-center justify-between rounded-2xl border border-signal-warn/40 bg-white px-4 py-3 text-left text-sm disabled:opacity-50"
            >
              <span>
                <span className="block font-semibold text-signal-warn">Delete my data</span>
                <span className="text-xs text-signal-muted">Removes story, approaches, invitations and follow-ups.</span>
              </span>
              <Trash2 className="h-5 w-5 text-signal-warn" />
            </button>
            {withdraw.isSuccess ? <p className="text-xs text-emerald-700">Consent withdrawn.</p> : null}
            {del.isSuccess ? <p className="text-xs text-emerald-700">Your data was deleted.</p> : null}
            {withdraw.isError || del.isError ? (
              <p className="text-xs text-signal-warn">That did not work. Please try again.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Row({ label, icon: Icon, text }: { label: string; icon: LucideIcon; text: string }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2">
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-signal-muted">
        <Icon className="h-3.5 w-3.5" /> {label}
      </dt>
      <dd className="text-signal-ink/85">{text}</dd>
    </div>
  );
}

function ListCard({
  title,
  icon: Icon,
  tone,
  items,
}: {
  title: string;
  icon: LucideIcon;
  tone: string;
  items: string[];
}) {
  return (
    <section className="glass-card p-5">
      <h2 className="text-lg font-bold text-signal-ink">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm text-signal-ink/80">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} />
            {i}
          </li>
        ))}
      </ul>
    </section>
  );
}
