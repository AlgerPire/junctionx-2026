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
    <section>
      <div className="mb-3 flex items-center gap-2">
        <MailOpen className="h-4 w-4 text-signal-accent" />
        <h2 className="text-sm font-bold text-signal-ink">Invitations</h2>
        {pending ? (
          <span className="rounded-full bg-signal-accent px-2 py-0.5 text-[11px] font-semibold text-white">
            {pending}
          </span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((inv) => (
          <article
            key={inv.id}
            className={cn(
              "rounded-[20px] border border-signal-line/80 bg-white p-4 shadow-soft",
              inv.status === "invited" && "border-signal-accent/40",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-wide text-signal-accent">
                  {inv.company_name}
                </p>
                <h3 className="mt-0.5 truncate text-sm font-bold text-signal-ink">{inv.brief_title}</h3>
              </div>
              <span className="shrink-0 text-[11px] text-signal-muted">
                {formatShortDate(inv.created_at)}
              </span>
            </div>
            {inv.proposed_slot ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-signal-ink/75">
                <CalendarClock className="h-3.5 w-3.5 text-signal-accent" /> {inv.proposed_slot}
              </p>
            ) : null}
            <div className="mt-3 flex gap-2">
              {inv.status === "invited" ? (
                <>
                  <button
                    type="button"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate({ id: inv.id, decision: "accepted" })}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-signal-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Accept
                  </button>
                  <button
                    type="button"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate({ id: inv.id, decision: "declined" })}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-signal-line bg-white px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Decline
                  </button>
                </>
              ) : (
                <span className="text-xs text-signal-muted">{STATUS_TEXT[inv.status]}</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
