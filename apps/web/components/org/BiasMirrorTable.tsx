interface AttrResult {
  identical_pct: number;
  n_tested: number;
  pass: boolean;
}

export function BiasMirrorTable({
  attributes,
}: {
  attributes: Record<string, AttrResult>;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-signal-line/80 bg-white/80">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-signal-line bg-signal-mist/60">
          <tr>
            <th className="px-4 py-3 font-semibold">Attribute varied</th>
            <th className="px-4 py-3 font-semibold">% identical</th>
            <th className="px-4 py-3 font-semibold">N tested</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(attributes).map(([attr, row]) => (
            <tr key={attr} className="border-b border-signal-line/50">
              <td className="px-4 py-3 capitalize">{attr.replace("_", " ")}</td>
              <td className="px-4 py-3">{row.identical_pct}%</td>
              <td className="px-4 py-3">{row.n_tested}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                    row.pass ? "bg-signal-accentSoft text-signal-accent" : "bg-red-100 text-red-800"
                  }`}
                >
                  {row.pass ? "Pass" : "Fail"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
