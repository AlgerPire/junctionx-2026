"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch, applySessionFromMe, postAuthPath, type AuthMe } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";

interface Notice {
  version: string;
  title: string;
  summary: string;
  points: string[];
  ai_notice: string;
  purposes: string[];
}

export default function ConsentPage() {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const me = await apiFetch<AuthMe>("/api/auth/me");
        if (!me.authenticated) {
          router.replace("/auth");
          return;
        }
        if (me.consent_complete) {
          router.replace(postAuthPath(me));
          return;
        }
        setNotice(await apiFetch<Notice>("/api/consent/notice?locale=en"));
      } catch {
        router.replace("/auth");
      }
    })();
  }, [router]);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/consent/grant", {
        method: "POST",
        body: JSON.stringify({ purposes: notice?.purposes ?? [], locale: "en" }),
      });
      const me = await apiFetch<AuthMe>("/api/auth/me");
      await applySessionFromMe(me);
      router.replace(postAuthPath(me));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save consent");
    } finally {
      setBusy(false);
    }
  }

  if (!notice) {
    return <main className="dash-bg min-h-screen" />;
  }

  return (
    <main className="dash-bg flex min-h-screen items-center justify-center px-5 py-12">
      <div className="glass-card w-full max-w-2xl p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal-accent">
          {APP_NAME}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-signal-ink">{notice.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-signal-muted">{notice.summary}</p>
        <ul className="mt-5 list-disc space-y-2 pl-5 text-sm text-signal-ink/80">
          {notice.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="mt-5 rounded-2xl bg-signal-accentSoft/70 px-4 py-3 text-sm text-signal-ink">
          {notice.ai_notice}
        </p>
        <p className="mt-3 text-xs text-signal-muted">Notice version {notice.version}</p>
        {error ? <p className="mt-3 text-sm text-signal-warn">{error}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void accept()}
            className="rounded-2xl bg-signal-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "I understand and agree"}
          </button>
          <a
            href="/transparency"
            className="rounded-2xl border border-signal-line px-5 py-3 text-sm font-semibold"
          >
            Read more
          </a>
        </div>
      </div>
    </main>
  );
}
