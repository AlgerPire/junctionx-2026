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

export function AuditLogTable({ entries }: { entries: AuditEntry[] }) {
  return (
    <>
      <ul className="space-y-2.5 sm:hidden">
        {entries.map((e) => (
          <li
            key={e.id}
            className="rounded-2xl border border-signal-line/80 bg-white/90 px-3.5 py-3"
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
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-signal-line/80 bg-white/80 sm:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-signal-line bg-signal-mist/50">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">What happened</th>
              <th className="px-4 py-3">Actor</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-signal-line/40">
                <td className="whitespace-nowrap px-4 py-3 text-signal-ink/60">
                  {formatWhen(e.ts)}
                </td>
                <td className="px-4 py-3">{ACTION_LABEL[e.action] ?? e.action}</td>
                <td className="px-4 py-3">
                  {e.actor_role} · {e.actor_id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
