"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, Clock3, Inbox, MailCheck, Send, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { formatShortDate } from "@/components/dashboard/Cards";
import { BucketBadge } from "@/components/match/BucketBadge";
import { AppShell } from "@/components/shared/AppShell";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import type { InboxItem, Invite } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "requests" | "agreed" | "invites" | "closed";

const TABS: { id: Tab; label: string }[] = [
  { id: "requests", label: "New requests" },
  { id: "agreed", label: "Agreed conversations" },
  { id: "invites", label: "Invitations sent" },
  { id: "closed", label: "Closed" },
];

export default function CompanyInboxPage() {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("requests");

  useEffect(() => {
    setPersonaId(
      new URLSearchParams(window.location.search).get("persona") ?? getPersonaId() ?? "company_demo",
    );
    setReady(true);
  }, []);

  const inbox = useQuery({
    queryKey: ["inbox"],
    enabled: ready,
    queryFn: () => apiFetch<InboxItem[]>("/api/approaches/inbox"),
  });

  const invites = useQuery({
    queryKey: ["company-invites"],
    enabled: ready,
    queryFn: () => apiFetch<Invite[]>("/api/invites/company"),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["inbox"] });
    void qc.invalidateQueries({ queryKey: ["company-invites"] });
  };

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "accepted" | "declined" }) =>
      apiFetch(`/api/approaches/${id}/decide`, { method: "POST", body: JSON.stringify({ decision }) }),
    onSuccess: refresh,
  });

  const withdraw = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/invites/${id}/withdraw`, { method: "POST" }),
    onSuccess: refresh,
  });

  const items = inbox.data ?? [];
  const sent = invites.data ?? [];
  const requests = items.filter((i) => i.approach.status === "requested");
  const agreedRequests = items.filter((i) => i.approach.status === "accepted");
  const agreedInvites = sent.filter((i) => i.status === "accepted");
  const pendingInvites = sent.filter((i) => i.status === "invited");
  const closedRequests = items.filter((i) => i.approach.status === "declined" || i.approach.status === "done");
  const closedInvites = sent.filter((i) => i.status === "declined" || i.status === "withdrawn");

  const counts: Record<Tab, number> = {
    requests: requests.length,
    agreed: agreedRequests.length + agreedInvites.length,
    invites: pendingInvites.length,
    closed: closedRequests.length + closedInvites.length,
  };

  return (
    <AppShell
      role="company"
      title="Inbox"
      subtitle="Conversation requests from jobseekers and the interview invitations you sent. You decide."
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Inbox, label: "Waiting for your answer", value: counts.requests },
          { icon: MailCheck, label: "Agreed conversations", value: counts.agreed },
          { icon: Send, label: "Invitations pending", value: counts.invites },
          {
            icon: Clock3,
            label: "Longest queue",
            value: `${Math.max(0, ...agreedRequests.map((i) => i.approach.queue_est_minutes ?? 0))} min`,
          },
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
      </section>

      <div className="mt-6 flex flex-wrap gap-1.5 rounded-2xl bg-white p-1 shadow-soft sm:inline-flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
              tab === t.id ? "bg-signal-accent text-white" : "text-signal-muted hover:text-signal-ink",
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs",
                tab === t.id ? "bg-white/25" : "bg-signal-foam text-signal-muted",
              )}
            >
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4">
        {inbox.isLoading || invites.isLoading ? <p className="text-sm text-signal-muted">Loading…</p> : null}

        {tab === "requests" &&
          requests.map((item) => (
            <RequestCard
              key={item.approach.id}
              item={item}
              busy={decide.isPending}
              onDecide={(decision) => decide.mutate({ id: item.approach.id, decision })}
            />
          ))}

        {tab === "agreed" && (
          <>
            {agreedRequests.map((item) => (
              <RequestCard key={`a-${item.approach.id}`} item={item} busy={false} />
            ))}
            {agreedInvites.map((inv) => (
              <InviteCard key={`i-${inv.id}`} invite={inv} />
            ))}
          </>
        )}

        {tab === "invites" &&
          pendingInvites.map((inv) => (
            <InviteCard
              key={inv.id}
              invite={inv}
              busy={withdraw.isPending}
              onWithdraw={() => withdraw.mutate(inv.id)}
            />
          ))}

        {tab === "closed" && (
          <>
            {closedRequests.map((item) => (
              <RequestCard key={`a-${item.approach.id}`} item={item} busy={false} />
            ))}
            {closedInvites.map((inv) => (
              <InviteCard key={`i-${inv.id}`} invite={inv} />
            ))}
          </>
        )}

        {!inbox.isLoading && !invites.isLoading && counts[tab] === 0 ? (
          <div className="glass-card border-dashed p-6 text-sm text-signal-muted">
            {tab === "invites" ? (
              <>
                No pending invitations. Open a job in{" "}
                <Link href="/company/briefs" className="font-semibold text-signal-accent underline">
                  My jobs
                </Link>{" "}
                and invite a suggested candidate.
              </>
            ) : (
              "Nothing here yet."
            )}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function RequestCard({
  item,
  busy,
  onDecide,
}: {
  item: InboxItem;
  busy: boolean;
  onDecide?: (decision: "accepted" | "declined") => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const a = item.approach;
  const skills = item.story?.skills ?? [];
  const shown = showAll ? skills : skills.slice(0, 3);

  return (
    <article className="glass-card p-5" data-testid="inbox-request" data-seeker-alias={a.seeker_alias}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-signal-muted">
            Asked to talk · {formatShortDate(a.created_at)}
          </p>
          <h2 className="mt-1 text-lg font-bold text-signal-ink">
            {a.seeker_display_name ?? a.seeker_alias}
            <span className="font-normal text-signal-muted"> → </span>
            <Link href={`/company/briefs/${a.brief_id}`} className="text-signal-accent hover:underline">
              {a.brief_title}
            </Link>
          </h2>
          {a.seeker_display_name ? (
            <p className="text-xs text-signal-muted">{a.seeker_alias} · name shared because you accepted</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {a.bucket ? <BucketBadge bucket={a.bucket} /> : null}
          <StatusChip status={a.status} />
        </div>
      </div>

      {a.fit_summary ? (
        <p className="mt-3 text-sm text-signal-ink/80">{a.fit_summary}</p>
      ) : (
        <p className="mt-3 text-sm text-signal-muted">
          Not in your suggested list — this jobseeker found the job through Browse all. Their evidence is
          below; worth a look before deciding.
        </p>
      )}

      {skills.length ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {shown.map((s) => (
            <li key={s.skill_id} className="rounded-2xl border border-signal-line/80 bg-white px-3 py-2">
              <p className="text-sm font-semibold text-signal-ink">{s.label}</p>
              <p className="mt-0.5 line-clamp-3 text-xs italic text-signal-ink/65">“{s.evidence_quote}”</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-signal-muted">No approved story available.</p>
      )}
      {skills.length > 3 ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-xs font-semibold text-signal-accent"
        >
          {showAll ? "Show less" : `Show all ${skills.length} evidenced skills`}
        </button>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {a.status === "requested" && onDecide ? (
          <>
            <button
              type="button"
              data-testid="inbox-accept"
              disabled={busy}
              onClick={() => onDecide("accepted")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-signal-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Accept conversation
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecide("declined")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-signal-line bg-white px-4 py-2 text-sm text-signal-ink disabled:opacity-50"
            >
              <X className="h-4 w-4" /> Decline
            </button>
            <span className="text-xs text-signal-muted">Declining refunds the jobseeker&apos;s approach.</span>
          </>
        ) : null}
        {a.status === "accepted" ? (
          <p className="flex items-center gap-1.5 text-sm text-signal-ink/80">
            <Clock3 className="h-4 w-4 text-signal-accent" />
            Queue estimate ~{a.queue_est_minutes ?? 0} min at your tables
          </p>
        ) : null}
      </div>
    </article>
  );
}

function InviteCard({
  invite,
  busy,
  onWithdraw,
}: {
  invite: Invite;
  busy?: boolean;
  onWithdraw?: () => void;
}) {
  return (
    <article className="glass-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-signal-muted">
            You invited · {formatShortDate(invite.created_at)}
          </p>
          <h2 className="mt-1 text-lg font-bold text-signal-ink">
            {invite.seeker_display_name ?? invite.seeker_alias}
            <span className="font-normal text-signal-muted"> → </span>
            <Link href={`/company/briefs/${invite.brief_id}`} className="text-signal-accent hover:underline">
              {invite.brief_title}
            </Link>
          </h2>
        </div>
        <StatusChip status={invite.status} />
      </div>
      {invite.message ? (
        <p className="mt-3 rounded-2xl bg-signal-foam px-3 py-2 text-sm text-signal-ink/80">{invite.message}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-signal-ink/80">
        {invite.proposed_slot ? (
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4 text-signal-accent" /> {invite.proposed_slot}
          </span>
        ) : null}
        {invite.responded_at ? <span>Answered {formatShortDate(invite.responded_at)}</span> : null}
        {onWithdraw ? (
          <button
            type="button"
            disabled={busy}
            onClick={onWithdraw}
            className="ml-auto rounded-xl border border-signal-line bg-white px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Withdraw invitation
          </button>
        ) : null}
      </div>
    </article>
  );
}

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-signal-skySoft text-signal-sky",
  invited: "bg-signal-accentSoft text-signal-accent",
  accepted: "bg-emerald-50 text-emerald-700",
  declined: "bg-signal-foam text-signal-muted",
  withdrawn: "bg-signal-foam text-signal-muted",
  done: "bg-signal-foam text-signal-muted",
};

const STATUS_TEXT: Record<string, string> = {
  requested: "Awaiting you",
  invited: "Awaiting candidate",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
  done: "Done",
};

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        STATUS_STYLE[status] ?? "bg-signal-foam text-signal-muted",
      )}
    >
      {STATUS_TEXT[status] ?? status}
    </span>
  );
}
