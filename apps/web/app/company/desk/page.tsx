"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { CompanyAssistantModal } from "@/components/company/CompanyAssistantModal";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageLoader } from "@/components/shared/PageLoader";
import { getPersonaId, setPersonaId } from "@/lib/api";
import { unlockAudio } from "@/lib/audio";
import { personaForRole } from "@/lib/nav";

function DeskInner() {
  const router = useRouter();
  const params = useSearchParams();
  const first = params.get("first") ?? undefined;

  useEffect(() => {
    setPersonaId(personaForRole("company", params.get("persona") ?? getPersonaId()));
    unlockAudio();
  }, [params]);

  return (
    <DashboardShell
      role="company"
      title="Hiring assistant"
      subtitle="Ask anything — you decide what opens next."
      fitViewport
      hideHeading
    >
      {/* Fill the phone viewport under top bar + bottom nav. */}
      <div className="flex h-[calc(100dvh-8.5rem)] min-h-0 w-full flex-col md:h-auto md:min-h-0 md:flex-1">
        <CompanyAssistantModal
          open
          mode="page"
          firstMessage={first}
          onClose={() => router.push("/company")}
        />
      </div>
    </DashboardShell>
  );
}

export default function CompanyDeskPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <PageLoader label="Opening assistant…" />
        </div>
      }
    >
      <DeskInner />
    </Suspense>
  );
}
