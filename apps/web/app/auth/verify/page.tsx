"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PageLoader } from "@/components/shared/PageLoader";
import { apiFetch, applySessionFromMe, postAuthPath, type AuthMe } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Missing sign-in token.");
      return;
    }
    void (async () => {
      try {
        const me = await apiFetch<AuthMe>("/api/auth/verify", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        await applySessionFromMe(me);
        router.replace(postAuthPath(me));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign-in failed");
      }
    })();
  }, [params, router]);

  if (error) {
    return (
      <main className="dash-bg flex min-h-screen items-center justify-center px-5">
        <div className="glass-card max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-signal-ink">{APP_NAME}</h1>
          <p className="mt-3 text-sm text-signal-warn">{error}</p>
          <a href="/auth" className="mt-6 inline-block text-sm font-semibold text-signal-accent">
            Request a new link
          </a>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <PageLoader label="Signing you in…" />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <PageLoader label="Signing you in…" />
        </div>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
