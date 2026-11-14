"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { PageLoader } from "@/components/shared/PageLoader";
import { apiFetch, applySessionFromMe, roleHome, type AuthMe } from "@/lib/api";

export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = useState<"seeker" | "company" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const me = await apiFetch<AuthMe>("/api/auth/me");
        if (!me.authenticated || me.auth_mode !== "session") {
          router.replace("/auth");
          return;
        }
        if (!me.consent_complete) {
          router.replace("/consent");
          return;
        }
        if (me.onboarding_completed || (me.role !== "seeker" && me.role !== "company")) {
          router.replace(roleHome(me.role));
          return;
        }
        setRole(me.role);
      } catch {
        router.replace("/auth");
      }
    })();
  }, [router]);

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const me = await apiFetch<AuthMe>("/api/auth/onboarding/complete", { method: "POST" });
      await applySessionFromMe(me);
      if (me.role === "seeker") {
        router.replace("/seeker/story?new=1");
        return;
      }
      router.replace(roleHome(me.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish onboarding");
      setBusy(false);
    }
  }

  if (!role) {
    return (
      <div className="min-h-screen">
        <PageLoader label="Preparing your intro…" />
      </div>
    );
  }

  return (
    <>
      <OnboardingFlow role={role} busy={busy} onComplete={() => void finish()} />
      {error ? (
        <p className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-white px-4 py-2 text-sm text-signal-warn shadow-soft">
          {error}
        </p>
      ) : null}
    </>
  );
}
