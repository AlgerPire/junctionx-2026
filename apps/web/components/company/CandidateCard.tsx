"use client";

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  GitBranch,
  MailCheck,
  Quote,
  UserCheck,
} from "lucide-react";
import { useState } from "react";

import { BucketBadge } from "@/components/match/BucketBadge";
import type { CandidateReview, MustHaveCheck } from "@/lib/types";
import { cn } from "@/lib/utils";

const CHECK_META: Record<MustHaveCheck["status"], { label: string; icon: typeof CheckCircle2; tone: string }> = {
  evidenced: { label: "Evidenced", icon: CheckCircle2, tone: "text-emerald-600" },
  related: { label: "Related skill", icon: GitBranch, tone: "text-signal-accent" },
  not_evidenced: { label: "Not evidenced yet", icon: CircleDashed, tone: "text-signal-muted" },
};

function InviteStatus({ review }: { review: CandidateReview }) {
  const invite = review.invite;
  if (review.approach_status === "requested" || review.approach_status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-signal-skySoft px-2.5 py-1 text-xs font-semibold text-signal-sky">
        <MailCheck className="h-3.5 w-3.5" />
        {review.approach_status === "requested" ? "Asked to talk with you" : "Conversation accepted"}
      </span>
    );
  }
  if (!invite || invite.status === "withdrawn") return null;
  const label = {
    invited: "Invitation pending",
    accepted: "Accepted your invitation",
    declined: "Declined invitation",
  }[invite.status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        invite.status === "accepted" && "bg-emerald-50 text-emerald-700",
        invite.status === "invited" && "bg-signal-accentSoft text-signal-accent",
        invite.status === "declined" && "bg-signal-foam text-signal-muted",
      )}
    >
      <UserCheck className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function CandidateCard({
  review,
  onWhy,
  onInvite,
  onWithdraw,
  busy,
}: {
  review: CandidateReview;
  onWhy: () => void;
  onInvite: () => void;
  onWithdraw: () => void;
  busy: boolean;
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const s = review.suggestion;
  const alias = s.seeker_alias ?? `Candidate #${s.seeker_id}`;
  const evidenced = review.must_haves.filter((m) => m.status === "evidenced").length;
  const related = review.must_haves.filter((m) => m.status === "related").length;
  const invite = review.invite;
  const canInvite = !invite || invite.status === "declined" || invite.status === "withdrawn";

  return (
    <article className="glass-card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-signal-accentSoft text-sm font-bold text-signal-accent">
            {alias.replace(/^Seeker\s*/, "").slice(0, 4)}
          </span>
          <div>
            <h3 className="text-lg font-bold text-signal-ink">
              {invite?.seeker_display_name ?? alias}
            </h3>
            <p className="text-xs text-signal-muted">
              {invite?.seeker_display_name ? `${alias} · name shared after acceptance` : "Alias only until a conversation is agreed"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InviteStatus review={review} />
          <BucketBadge bucket={s.bucket} />
        </div>
      </header>

      <div className="grid gap-5 px-5 py-4 lg:grid-cols-[1.2fr_1fr]">
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-signal-muted">
            Must-have skills · {evidenced} evidenced{related ? `, ${related} related` : ""} of{" "}
            {review.must_haves.length}
          </p>
          <ul className="mt-2 space-y-2">
            {review.must_haves.map((m) => {
              const meta = CHECK_META[m.status];
              const Icon = meta.icon;
              return (
                <li key={m.skill} className="rounded-2xl border border-signal-line/80 bg-white px-3 py-2.5">
                  <div className="flex items-start gap-2.5">
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.tone)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-signal-ink">
                        {m.skill}
                        <span className={cn("ml-2 text-xs font-medium", meta.tone)}>{meta.label}</span>
                      </p>
                      {m.seeker_skill && m.status === "related" ? (
                        <p className="text-xs text-signal-muted">via {m.seeker_skill}</p>
                      ) : null}
                      {m.evidence_quote ? (
                        <p className="mt-1 border-l-2 border-signal-accent/30 pl-2 text-xs italic text-signal-ink/70">
                          “{m.evidence_quote}”
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-3">
          <div className="rounded-2xl bg-signal-foam px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-signal-muted">
              <Bot className="h-3.5 w-3.5" /> Fit summary · generated from match reasons
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-signal-ink/85">{s.fit_summary}</p>
          </div>

          {review.flags.length ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" /> Check in conversation
              </p>
              <ul className="mt-1.5 space-y-1">
                {review.flags.slice(0, 5).map((f, i) => (
                  <li key={`${f.kind}-${i}`} className="text-sm text-signal-ink/85">
                    · {f.text}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-amber-800/80">
                Prompts for a human conversation — never used to rank or filter anyone.
              </p>
            </div>
          ) : (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-3 text-sm text-emerald-800">
              No review flags — evidence is specific and confirmed by the jobseeker.
            </p>
          )}
        </section>
      </div>

      <div className="border-t border-signal-line px-5 py-3">
        <button
          type="button"
          onClick={() => setShowEvidence((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-semibold text-signal-ink"
          aria-expanded={showEvidence}
        >
          <span className="flex items-center gap-2">
            <Quote className="h-4 w-4 text-signal-accent" /> All approved evidence ({review.skills.length})
          </span>
          <ChevronDown className={cn("h-4 w-4 transition", showEvidence && "rotate-180")} />
        </button>
        {showEvidence ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {review.skills.map((sk) => (
              <li key={sk.skill_id} className="rounded-2xl border border-signal-line/80 bg-white px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-signal-ink">{sk.label}</span>
                  <span className="rounded-full bg-signal-foam px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-signal-muted">
                    AI-mapped label
                  </span>
                  {sk.seeker_confirmed ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Confirmed by jobseeker
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      Not confirmed
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs italic text-signal-ink/70">“{sk.evidence_quote}” — own words</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="border-t border-signal-line px-5 py-3">
        <button
          type="button"
          onClick={() => setShowProvenance((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-semibold text-signal-ink"
          aria-expanded={showProvenance}
        >
          <span className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-signal-accent" /> What was AI-assisted vs. human
          </span>
          <ChevronDown className={cn("h-4 w-4 transition", showProvenance && "rotate-180")} />
        </button>
        {showProvenance ? (
          <ul className="mt-2 space-y-1">
            {review.provenance.map((p) => (
              <li key={p} className="text-sm text-signal-ink/80">
                · {p}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-signal-line bg-signal-foam/50 px-5 py-3">
        <button
          type="button"
          onClick={onWhy}
          className="rounded-xl border border-signal-line bg-white px-4 py-2 text-sm font-medium text-signal-ink"
        >
          Why suggested?
        </button>
        {canInvite ? (
          <button
            type="button"
            onClick={onInvite}
            disabled={busy}
            className="rounded-xl bg-signal-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-signal-accentDeep disabled:opacity-50"
          >
            {invite?.status === "declined" || invite?.status === "withdrawn" ? "Invite again" : "Invite to interview"}
          </button>
        ) : null}
        {invite?.status === "invited" ? (
          <>
            <span className="text-sm text-signal-muted">
              Sent{invite.proposed_slot ? ` · ${invite.proposed_slot}` : ""}
            </span>
            <button
              type="button"
              onClick={onWithdraw}
              disabled={busy}
              className="rounded-xl border border-signal-line bg-white px-3 py-2 text-sm text-signal-ink disabled:opacity-50"
            >
              Withdraw
            </button>
          </>
        ) : null}
        {invite?.status === "accepted" ? (
          <span className="text-sm font-medium text-emerald-700">
            Interview agreed{invite.proposed_slot ? ` · ${invite.proposed_slot}` : ""}
          </span>
        ) : null}
        <span className="ml-auto text-xs text-signal-muted">You decide. Nobody is rejected automatically.</span>
      </footer>
    </article>
  );
}
