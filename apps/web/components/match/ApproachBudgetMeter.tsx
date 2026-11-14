export function ApproachBudgetMeter({
  remaining,
  total = 5,
  compact,
}: {
  remaining: number;
  total?: number;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        data-testid="budget-meter"
        className="inline-flex items-center gap-2 rounded-2xl border border-signal-line bg-white px-3 py-2 shadow-soft"
      >
        <span className="text-xs font-semibold text-signal-muted">Approaches</span>
        <span className="text-sm font-bold text-signal-ink">
          {remaining}/{total}
        </span>
        <span className="flex gap-1" aria-hidden>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${
                i < remaining ? "bg-signal-teal" : "bg-signal-line"
              }`}
            />
          ))}
        </span>
      </div>
    );
  }

  return (
    <div data-testid="budget-meter">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-signal-ink">Approach budget</p>
        <p className="text-sm font-medium text-signal-muted">
          <span className="font-bold text-signal-ink">{remaining}</span> of {total} left
        </p>
      </div>
      <div className="mt-3 flex gap-1.5" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 flex-1 rounded-full transition ${
              i < remaining ? "bg-signal-teal" : "bg-signal-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
