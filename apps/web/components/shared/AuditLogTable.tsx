import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface AuditEntry {
  id: number;
  ts: string;
  actor_role: string;
  actor_id: string;
  action: string;
  payload: Record<string, unknown>;
}

export const ACTION_LABEL: Record<string, string> = {
  brief_publish: "A hiring job was published",
  brief_patch: "A hiring job was edited by a person",
  brief_create_from_interview: "A brief draft was created from a conversation",
  story_patch: "A skill story was edited by the jobseeker",
  story_approve: "A skill story was approved and shared",
  interview_start: "A voice or text conversation started",
  interview_turn: "A conversation answer was given",
  interview_finalize: "A conversation was finished",
  approach_create: "A conversation was requested",
  approach_decide: "An approach was accepted or declined",
  invite_create: "An interview invitation was sent",
  invite_respond: "An interview invitation was answered",
  invite_withdraw: "An interview invitation was withdrawn",
  suggestion_view: "Suggestions were viewed",
  fairness_run: "Bias Mirror was run",
  copilot_ask: "The assistant was asked a question",
  followup_create: "A follow-up was recorded",
  consent_grant: "Consent was given",
  consent_withdraw: "Consent was withdrawn",
  delete_my_data: "Seeker data was deleted",
  auth_request_link: "A sign-in link was requested",
  auth_login: "Someone signed in",
  auth_logout: "Someone signed out",
  onboarding_complete: "Onboarding was completed",
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function AuditLogTable({
  entries,
  page,
  pageSize,
  total,
  onPageChange,
}: {
  entries: AuditEntry[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="overflow-hidden rounded-2xl border border-signal-line/80 bg-white">
      <ul className="max-h-[min(22rem,45vh)] space-y-0 overflow-y-auto sm:hidden">
        {entries.map((e) => (
          <li
            key={e.id}
            className="border-b border-signal-line/60 px-3.5 py-3 last:border-b-0"
          >
            <p className="text-[11px] font-medium text-signal-muted">{formatWhen(e.ts)}</p>
            <p className="mt-1 text-sm font-semibold text-signal-ink">
              {ACTION_LABEL[e.action] ?? e.action}
            </p>
            <p className="mt-1 text-xs text-signal-muted">
              {e.actor_role} · {e.actor_id}
            </p>
          </li>
        ))}
        {!entries.length ? (
          <li className="px-3.5 py-8 text-center text-sm text-signal-muted">No activity on this page.</li>
        ) : null}
      </ul>

      <div className="hidden sm:block">
        <div className="max-h-[min(22rem,45vh)] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-signal-line bg-signal-foam/95 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-signal-muted">
                  When
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-signal-muted">
                  What happened
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-signal-muted">
                  Actor
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-signal-line/40 last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-signal-ink/60">
                    {formatWhen(e.ts)}
                  </td>
                  <td className="px-4 py-2.5 text-signal-ink">
                    {ACTION_LABEL[e.action] ?? e.action}
                  </td>
                  <td className="px-4 py-2.5 text-signal-muted">
                    {e.actor_role} · {e.actor_id}
                  </td>
                </tr>
              ))}
              {!entries.length ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-signal-muted">
                    No activity on this page.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-signal-line/80 bg-signal-foam/40 px-3 py-2.5 sm:px-4">
        <p className="text-xs text-signal-muted">
          {total === 0 ? "0 entries" : `${from}–${to} of ${total}`}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
            className={cn(
              "inline-flex items-center gap-1 rounded-xl border border-signal-line bg-white px-2.5 py-1.5 text-xs font-semibold text-signal-ink",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </button>
          <span className="min-w-[4.5rem] text-center text-xs font-semibold text-signal-ink">
            {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page + 1 >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className={cn(
              "inline-flex items-center gap-1 rounded-xl border border-signal-line bg-white px-2.5 py-1.5 text-xs font-semibold text-signal-ink",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
