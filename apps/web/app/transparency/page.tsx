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
import { useEffect, useState } from "react";

import { AuditLogTable, type AuditEntry } from "@/components/shared/AuditLogTable";
import { AppShell } from "@/components/shared/AppShell";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import { roleFromPersona, type AppRole } from "@/lib/nav";
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
    ai: "Transcribes speech and asks follow-up questions about what you just said.",
    human: "You choose voice or typing and can stop anytime.",
    data: "Your answers for this conversation only.",
    safeguard: "Audio is never stored. Typed alternative and captions always available.",
  },
  {
    icon: FileCheck2,
    title: "Skill story",
    ai: "Suggests skill labels from a fixed list with exact quote evidence.",
    human: "You edit, remove or confirm every skill before sharing.",
    data: "Approved skills and your own quotes.",
    safeguard: "Quotes are checked in code to be exact words from your conversation.",
  },
  {
    icon: Scale,
    title: "Matching",
    ai: "None. Plain code compares skills and stated requirements.",
    human: "Companies and jobseekers decide who to talk with.",
    data: "Approved skills, brief skills, language requirements.",
    safeguard: "Buckets with reasons — never numeric scores or auto-reject.",
  },
  {
    icon: Users,
    title: "Candidate review",
    ai: "None for ranking. Labels show AI mapping vs the person’s words.",
    human: "A recruiter reads evidence and conversation notes.",
    data: "Alias, approved evidence, must-have checklist.",
    safeguard: "Flags prompt a conversation — never a reason to reject.",
  },
  {
    icon: Send,
    title: "Invitations and requests",
    ai: "None.",
    human: "Companies invite; jobseekers accept or decline.",
    data: "Brief, alias, proposed time slot.",
    safeguard: "Names are revealed only after both sides accept.",
  },
  {
    icon: Bot,
    title: "Assistant and drafting",
    ai: "Drafts jobs, explains matches, answers event questions.",
    human: "Companies edit and publish every job themselves.",
    data: "What you type to the assistant in that session.",
    safeguard: "Explain and draft only — never scores or decides about a person.",
  },
  {
    icon: ShieldCheck,
    title: "Bias Mirror",
    ai: "None. Aggregated statistics in code.",
    human: "Organisers decide how to close supply gaps.",
    data: "Aggregates only — no individual profiles.",
    safeguard: "Small groups are suppressed so no one can be singled out.",
  },
];

const USES = [
  "Approved skill stories with evidence quotes",
  "Company-stated language requirements",
  "Relocation support (as a consideration)",
  "Published jobs and the skills taxonomy",
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
  "Transcripts are deleted on approve, or within 24 hours.",
  "Approved stories expire after a fixed period unless renewed.",
  "Audit records are kept so decisions can be checked.",
];

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "activity", label: "Activity" },
  { id: "controls", label: "Your data" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const PAGE_SIZE = 8;

interface AuditPage {
  items: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

export default function TransparencyPage() {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [persona, setPersona] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>("seeker");
  const [tab, setTab] = useState<TabId>("overview");
  const [onlyMine, setOnlyMine] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const p = getPersonaId() ?? "seeker_demo_a";
    setPersonaId(p);
    setPersona(p);
    setRole(roleFromPersona(p) ?? "seeker");
    setReady(true);
  }, []);

  const audit = useQuery({
    queryKey: ["audit", page, onlyMine, persona],
    enabled: ready && tab === "activity",
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (onlyMine && persona) params.set("actor", persona);
      return apiFetch<AuditPage>(`/api/audit?${params}`);
    },
  });

  const del = useMutation({
    mutationFn: () => apiFetch("/api/me/delete", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audit"] }),
  });

  const withdraw = useMutation({
    mutationFn: () => apiFetch("/api/consent/withdraw", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audit"] }),
  });

  const entries = audit.data?.items ?? [];
  const total = audit.data?.total ?? 0;

  const canDelete = role === "seeker" || role === "company";
  const deleteLabel = role === "company" ? "Delete my draft data" : "Delete my data";
  const deleteHint =
    role === "company"
      ? "Removes draft jobs and related demo data for this company persona."
      : "Removes story, approaches, invitations and follow-ups.";

  const roleBlurb =
    role === "company"
      ? "For hiring teams: what AI drafts, what you decide, and what is logged."
      : role === "organiser"
        ? "For organisers: fairness, aggregates, and the activity record."
        : "For jobseekers: what is shared, what AI helps with, and your controls.";

  return (
    <AppShell title="Transparency" subtitle={roleBlurb} role={role}>
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-signal-line/80 bg-white/80 p-1.5 shadow-soft">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-xl px-3.5 py-2 text-sm font-semibold transition",
              tab === t.id
                ? "bg-signal-accent text-white shadow-soft"
                : "text-signal-muted hover:bg-signal-foam hover:text-signal-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="mt-4 space-y-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                icon: Sparkles,
                title: "AI drafts, people decide",
                text: "Extract, explain and draft only — never score or reject.",
              },
              {
                icon: Scale,
                title: "No numeric scores",
                text: "Match buckets with reasons you can read.",
              },
              {
                icon: UserCheck,
                title: "Alias first",
                text: "Names are shared only after both sides agree.",
              },
              {
                icon: Captions,
                title: "Voice optional",
                text: "Every voice step has typed fallback and captions.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="glass-card p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-accentSoft text-signal-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-2.5 text-sm font-bold text-signal-ink">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-signal-muted">{text}</p>
              </div>
            ))}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <ListCard title="What matching uses" icon={CheckCircle2} tone="text-emerald-600" items={USES} />
            <ListCard title="What matching never uses" icon={Ban} tone="text-signal-warn" items={NEVER_USES} />
          </div>
        </div>
      ) : null}

      {tab === "features" ? (
        <div className="mt-4 grid max-h-[min(70vh,40rem)] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <article key={f.title} className="glass-card p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-signal-accentSoft text-signal-accent">
                  <f.icon className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold text-signal-ink sm:text-base">{f.title}</h3>
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="AI" icon={Bot} text={f.ai} />
                <Row label="People" icon={UserCheck} text={f.human} />
                <Row label="Data" icon={Database} text={f.data} />
              </dl>
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-signal-foam px-2.5 py-2 text-xs text-signal-ink/80">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                {f.safeguard}
              </p>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "activity" ? (
        <section className="mt-4 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-signal-ink">Activity record</h2>
              <p className="mt-0.5 text-sm text-signal-muted">
                Changes are logged. Conversation content is never stored here.
              </p>
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-signal-line bg-white px-3 py-2 text-sm text-signal-ink">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(e) => {
                  setOnlyMine(e.target.checked);
                  setPage(0);
                }}
              />
              Only my actions
            </label>
          </div>

          {audit.isLoading ? <p className="text-sm text-signal-muted">Loading activity…</p> : null}
          {audit.isError ? <p className="text-sm text-signal-warn">Audit log unavailable.</p> : null}
          {audit.data ? (
            <AuditLogTable
              entries={entries}
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          ) : null}
        </section>
      ) : null}

      {tab === "controls" ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
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
              Using Skills First! never affects access to public employment services.{" "}
              <Link href="/accessibility" className="font-semibold text-signal-accent">
                Accessibility statement
              </Link>
            </p>
          </section>

          <section className="glass-card p-5">
            <h2 className="text-lg font-bold text-signal-ink">Your controls</h2>
            <p className="mt-1 text-sm text-signal-muted">
              {role === "organiser"
                ? "Organiser accounts can withdraw consent. Individual profile deletion is for seekers and companies."
                : "You can change your mind anytime. Actions are recorded in the activity log."}
            </p>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Withdraw consent for the current privacy notice version?")) {
                    withdraw.mutate();
                  }
                }}
                disabled={withdraw.isPending}
                className="flex w-full items-center justify-between rounded-2xl border border-signal-line bg-white px-4 py-3 text-left text-sm disabled:opacity-50"
              >
                <span>
                  <span className="block font-semibold text-signal-ink">Withdraw consent</span>
                  <span className="text-xs text-signal-muted">
                    You will be asked again before continuing.
                  </span>
                </span>
                <ShieldCheck className="h-5 w-5 text-signal-accent" />
              </button>

              {canDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Permanently ${deleteLabel.toLowerCase()}?`)) del.mutate();
                  }}
                  disabled={del.isPending}
                  className="flex w-full items-center justify-between rounded-2xl border border-signal-warn/40 bg-white px-4 py-3 text-left text-sm disabled:opacity-50"
                >
                  <span>
                    <span className="block font-semibold text-signal-warn">{deleteLabel}</span>
                    <span className="text-xs text-signal-muted">{deleteHint}</span>
                  </span>
                  <Trash2 className="h-5 w-5 text-signal-warn" />
                </button>
              ) : (
                <p className="rounded-2xl border border-dashed border-signal-line bg-signal-foam/50 px-4 py-3 text-xs text-signal-muted">
                  Profile deletion is available on seeker and company personas.
                </p>
              )}

              {withdraw.isSuccess ? <p className="text-xs text-emerald-700">Consent withdrawn.</p> : null}
              {del.isSuccess ? <p className="text-xs text-emerald-700">Your data was deleted.</p> : null}
              {withdraw.isError || del.isError ? (
                <p className="text-xs text-signal-warn">That did not work. Please try again.</p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function Row({ label, icon: Icon, text }: { label: string; icon: LucideIcon; text: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2 sm:grid-cols-[5rem_1fr]">
      <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-signal-muted">
        <Icon className="h-3 w-3" /> {label}
      </dt>
      <dd className="text-xs leading-relaxed text-signal-ink/85 sm:text-sm">{text}</dd>
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
      <h2 className="text-base font-bold text-signal-ink sm:text-lg">{title}</h2>
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
