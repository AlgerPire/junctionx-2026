interface AuditEntry {
  id: number;
  ts: string;
  actor_role: string;
  actor_id: string;
  action: string;
  payload: Record<string, unknown>;
}

const ACTION_LABEL: Record<string, string> = {
  brief_publish: "A hiring brief was published",
  story_approve: "A skill story was approved and shared",
  approach_create: "A conversation was requested",
  approach_decide: "An approach was accepted or declined",
  suggestion_view: "Suggestions were viewed",
  fairness_run: "Bias Mirror was run",
  delete_my_data: "Seeker data was deleted",
};

export function AuditLogTable({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-signal-line/80 bg-white/80">
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
              <td className="px-4 py-3 whitespace-nowrap text-signal-ink/60">
                {new Date(e.ts).toLocaleString()}
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
  );
}
