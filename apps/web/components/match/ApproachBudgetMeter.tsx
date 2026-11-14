export function ApproachBudgetMeter({
  remaining,
  total = 5,
}: {
  remaining: number;
  total?: number;
}) {
  return (
    <div className="glass-card p-4" data-testid="budget-meter">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-signal-ink">Approach budget</p>
        <p className="text-sm text-signal-muted">
          {remaining} of {total} left
        </p>
      </div>
      <div className="mt-3 flex gap-2" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 flex-1 rounded-full ${
              i < remaining ? "bg-signal-teal" : "bg-signal-line"
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-sm text-signal-muted">
        Choose conversations you care about most. You decide whom to contact.
      </p>
    </div>
  );
}
