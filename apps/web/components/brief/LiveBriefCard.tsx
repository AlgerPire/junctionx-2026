"use client";

type Draft = {
  title?: string;
  plain_summary?: string;
  problem_90_days?: string;
  must_skills?: string[];
  learnable_skills?: string[];
  nice_skills?: string[];
  required_languages?: { lang: string; level: string }[];
  international_ok?: boolean | null;
  relocation_support?: boolean | null;
  onboarding_support?: string;
  work_mode?: string;
  missing?: string[];
  skills?: { label: string; importance?: string }[];
  status?: string;
  brief_id?: number;
};

export function LiveBriefCard({ draft }: { draft: Record<string, unknown> }) {
  const d = draft as Draft;
  const title = d.title || "Job listing draft";
  const summary = d.plain_summary || "This listing builds as you talk…";
  const problem = d.problem_90_days || "";
  const must = d.must_skills?.length
    ? d.must_skills
    : (d.skills || []).filter((s) => s.importance === "must").map((s) => s.label);
  const learnable = d.learnable_skills || [];
  const missing = d.missing || [];

  return (
    <div className="glass-card p-5" data-testid="brief-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-accent">
          Live job listing · you decide
        </p>
        {d.status ? (
          <span className="rounded-full bg-signal-tealSoft px-2 py-0.5 text-xs font-semibold text-signal-teal">
            {d.status}
          </span>
        ) : null}
      </div>
      <h2 className="mt-2 font-display text-2xl text-signal-ink">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-signal-ink/75">{summary}</p>

      {problem ? (
        <p className="mt-4 rounded-2xl bg-signal-mist/80 px-3 py-3 text-sm">
          <span className="font-semibold">First 90 days:</span> {problem}
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="h-3 animate-pulse rounded-full bg-signal-mist" />
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-signal-mist" />
        </div>
      )}

      {must.length ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-signal-ink/50">Must-have</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {must.map((s) => (
              <span key={s} data-testid="brief-card-skill" className="rounded-lg border border-signal-accent/30 bg-signal-accentSoft px-2 py-1 text-xs font-medium text-signal-accent">
                {s}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {learnable.length ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-signal-ink/50">Can learn</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {learnable.map((s) => (
              <span key={s} className="rounded-lg border border-signal-line px-2 py-1 text-xs text-signal-ink/70">
                {s}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-1 text-sm text-signal-ink/70">
        {d.work_mode ? <p>Work mode: <span className="font-medium text-signal-ink">{d.work_mode}</span></p> : null}
        {d.required_languages?.length ? (
          <p>
            Languages:{" "}
            <span className="font-medium text-signal-ink">
              {d.required_languages.map((l) => `${l.lang} ${l.level}`).join(", ")}
            </span>
          </p>
        ) : null}
        {d.international_ok != null ? (
          <p>International OK: {d.international_ok ? "Yes" : "No"}</p>
        ) : null}
        {d.relocation_support != null ? (
          <p>Relocation support: {d.relocation_support ? "Yes" : "No"}</p>
        ) : null}
        {d.onboarding_support ? <p>Onboarding: {d.onboarding_support}</p> : null}
      </div>

      {missing.length ? (
        <div className="mt-4 rounded-2xl border border-dashed border-signal-warn/40 bg-amber-50/60 px-3 py-3 text-sm text-signal-warn">
          <p className="font-semibold">Still clarifying</p>
          <p className="mt-1">{missing.join(" · ")}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-signal-accent">Looking solid — you can list this when ready.</p>
      )}
    </div>
  );
}
