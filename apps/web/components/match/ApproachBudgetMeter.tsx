export function ApproachBudgetMeter({
  remaining,
  total = 5,
}: {
  remaining: number;
  total?: number;
}) {
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
      <p className="mt-2.5 text-sm leading-snug text-signal-muted">
        Spend approaches on conversations you care about. You decide whom to contact.
      </p>
    </div>
  );
}