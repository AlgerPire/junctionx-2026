import { Sparkles } from "lucide-react";

/** Soft atmospheric waves along the bottom of every dashboard. */
export function PageWaves({
  variant = "company",
}: {
  variant?: "company" | "seeker" | "organiser";
}) {
  const seeker = variant === "seeker";
  const organiser = variant === "organiser";
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 overflow-hidden" aria-hidden>
      <svg
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
        className="absolute bottom-0 h-full w-full"
      >
        <defs>
          <linearGradient id={`wave-a-${variant}`} x1="0" x2="1" y1="0" y2="0">
            {seeker ? (
              <>
                <stop offset="0%" stopColor="#2f5bb8" stopOpacity="0.45" />
                <stop offset="55%" stopColor="#7a9ee0" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#4a78d6" stopOpacity="0.32" />
              </>
            ) : organiser ? (
              <>
                <stop offset="0%" stopColor="#2d7a52" stopOpacity="0.45" />
                <stop offset="55%" stopColor="#7ab892" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#4aad72" stopOpacity="0.32" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#8b7ff0" stopOpacity="0.55" />
                <stop offset="55%" stopColor="#b9b2f7" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#8fd8cb" stopOpacity="0.45" />
              </>
            )}
          </linearGradient>
          <linearGradient id={`wave-b-${variant}`} x1="0" x2="1" y1="0" y2="0">
            {seeker ? (
              <>
                <stop offset="0%" stopColor="#c5d4f0" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#b8c9eb" stopOpacity="0.4" />
              </>
            ) : organiser ? (
              <>
                <stop offset="0%" stopColor="#c5e4d2" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#b8dcc6" stopOpacity="0.4" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#c9c3fa" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#bfe9e1" stopOpacity="0.55" />
              </>
            )}
          </linearGradient>
        </defs>
        <path
          d="M0 120 C 220 60 420 70 640 120 S 1080 190 1440 90 L1440 200 L0 200 Z"
          fill={`url(#wave-b-${variant})`}
        />
        <path
          d="M0 150 C 260 100 480 170 760 150 S 1180 90 1440 140 L1440 200 L0 200 Z"
          fill={`url(#wave-a-${variant})`}
        />
      </svg>
      <div className="dot-grid absolute bottom-6 left-8 h-16 w-40 opacity-50" />
      <div className="dot-grid absolute bottom-6 right-8 h-16 w-40 opacity-40" />
    </div>
  );
}

export function FooterNote({
  children,
  compact,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <p
      className={
        compact
          ? "relative z-10 flex shrink-0 items-center justify-center gap-2 px-4 pb-3 pt-2 text-xs text-signal-muted"
          : "relative z-10 flex items-center justify-center gap-2 pb-6 pt-10 text-sm text-signal-muted"
      }
    >
      <Sparkles className="h-4 w-4 shrink-0 text-signal-accent" />
      {children}
    </p>
  );
}
