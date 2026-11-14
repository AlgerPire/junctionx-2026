"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, MailOpen, X } from "lucide-react";

import { formatShortDate } from "@/components/dashboard/Cards";
import { apiFetch } from "@/lib/api";
import type { Invite } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_TEXT: Record<Invite["status"], string> = {
  invited: "Waiting for your answer",
  accepted: "You accepted · your name is now shared with the company",
  declined: "You declined",
  withdrawn: "Withdrawn by the company",
};

export function SeekerInvitations({ enabled }: { enabled: boolean }) {
  const qc = useQueryClient();
  const invites = useQuery({
    queryKey: ["my-invites"],
    enabled,
    queryFn: () => apiFetch<Invite[]>("/api/invites/me"),
  });

  const respond = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "accepted" | "declined" }) =>
      apiFetch(`/api/invites/${id}/respond`, { method: "POST", body: JSON.stringify({ decision }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-invites"] }),
  });

  const items = invites.data ?? [];
  if (!items.length) return null;
  const pending = items.filter((i) => i.status === "invited").length;

  return (
    <section className="mb-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-signal-ink">
        <MailOpen className="h-5 w-5 text-signal-accent" /> Interview invitations
        {pending ? (
          <span className="rounded-full bg-signal-accent px-2 py-0.5 text-xs font-semibold text-white">
            {pending} new
          </span>
        ) : null}
      </h2>
      <p className="mt-1 text-sm text-signal-muted">
        Companies saw only your alias and approved evidence. Your name is shared only if you accept.
      </p>
      <div className="mt-3 grid gap-3">
        {items.map((inv) => (
          <article
            key={inv.id}
            className={cn("glass-card p-4", inv.status === "invited" && "border-signal-accent/40")}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-signal-accent">
                  {inv.company_name}
                </p>
                <h3 className="text-base font-bold text-signal-ink">{inv.brief_title}</h3>
              </div>
              <span className="text-xs text-signal-muted">{formatShortDate(inv.created_at)}</span>
            </div>
            {inv.message ? (
              <p className="mt-2 rounded-2xl bg-signal-foam px-3 py-2 text-sm text-signal-ink/80">{inv.message}</p>
            ) : null}
            {inv.proposed_slot ? (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-signal-ink/80">
                <CalendarClock className="h-4 w-4 text-signal-accent" /> {inv.proposed_slot}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {inv.status === "invited" ? (
                <>
                  <button
                    type="button"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate({ id: inv.id, decision: "accepted" })}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-signal-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Accept
                  </button>
                  <button
                    type="button"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate({ id: inv.id, decision: "declined" })}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-signal-line bg-white px-4 py-2 text-sm disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Decline
                  </button>
                  <span className="text-xs text-signal-muted">Declining has no effect on other suggestions.</span>
                </>
              ) : (
                <span className="text-sm text-signal-muted">{STATUS_TEXT[inv.status]}</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
