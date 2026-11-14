"use client";

import { Building2, Mic2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type SignupRole = "seeker" | "company";

const ROLE_COPY: Record<
  SignupRole,
  { title: string; blurb: string; cta: string; icon: typeof Mic2 }
> = {
  seeker: {
    title: "I’m a jobseeker",
    blurb: "Explain your skills with evidence, then choose conversations at the event.",
    cta: "Sign up as jobseeker",
    icon: Mic2,
  },
  company: {
    title: "I’m hiring",
    blurb: "Describe a role by voice, receive evidenced approaches, decide who to meet.",
    cta: "Sign up as company",
    icon: Building2,
  },
};

function AuthInner() {
  const params = useSearchParams();
  const initial = params.get("role") === "company" ? "company" : "seeker";
  const [role, setRole] = useState<SignupRole>(initial);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"pick" | "email">(params.get("role") ? "email" : "pick");
  const [status, setStatus] = useState<string | null>(null);
  const [devPath, setDevPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const r = params.get("role");
    if (r === "company" || r === "seeker") {
      setRole(r);
      setStep("email");
    }
  }, [params]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    setDevPath(null);
    try {
      const res = await apiFetch<{ ok: boolean; message: string; dev_link?: string }>(
        "/api/auth/request-link",
        {
          method: "POST",
          body: JSON.stringify({ email, role, locale: "en" }),
        },
      );
      setStatus(res.message);
      if (res.dev_link) {
        const path = res.dev_link.replace(/^https?:\/\/[^/]+/, "");
        setDevPath(path);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not send link");
    } finally {
      setBusy(false);
    }
  }

  const copy = ROLE_COPY[role];

  return (
    <main className="dash-bg relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-signal-accent/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal-accent">
            Create account
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-signal-ink">{APP_NAME}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-signal-muted">
            Magic-link sign-up — no password. Using this service never affects public employment
            services or benefits.
          </p>
        </div>

        {step === "pick" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {(["seeker", "company"] as const).map((id) => {
              const item = ROLE_COPY[id];
              const Icon = item.icon;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setRole(id);
                    setStep("email");
                  }}
                  className="glass-card group p-6 text-left transition hover:-translate-y-0.5 hover:shadow-glass"
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl",
                      id === "company" ? "bg-signal-accentSoft text-signal-accent" : "bg-signal-tealSoft text-signal-teal",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 text-xl font-bold text-signal-ink">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-signal-muted">{item.blurb}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-signal-accent">
                    Continue <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="glass-card p-8">
            <button
              type="button"
              className="text-sm font-semibold text-signal-muted hover:text-signal-accent"
              onClick={() => {
                setStep("pick");
                setStatus(null);
                setDevPath(null);
              }}
            >
              ← Change role
            </button>
            <h2 className="mt-4 text-2xl font-bold text-signal-ink">{copy.title}</h2>
            <p className="mt-1 text-sm text-signal-muted">{copy.blurb}</p>

            <form className="mt-6 space-y-4" onSubmit={(e) => void submit(e)}>
              <label className="block text-sm font-medium text-signal-ink">
                Work email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-signal-line bg-white px-4 py-3 text-sm outline-none focus:border-signal-accent"
                  placeholder={role === "company" ? "you@company.fi" : "you@email.com"}
                  autoComplete="email"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-signal-accent px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Sending…" : copy.cta}
              </button>
            </form>

            {status ? <p className="mt-4 text-sm text-signal-muted">{status}</p> : null}
            {devPath ? (
              <Link
                href={devPath}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-signal-ink px-4 py-3.5 text-sm font-semibold text-white"
              >
                Open sign-in link <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        )}

        <p className="mt-8 text-center text-sm text-signal-muted">
          Already exploring?{" "}
          <Link href="/" className="font-semibold text-signal-accent">
            Use a demo persona
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<main className="dash-bg min-h-screen" />}>
      <AuthInner />
    </Suspense>
  );
}
