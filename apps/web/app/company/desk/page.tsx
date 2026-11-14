"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { CompanyAssistantModal } from "@/components/company/CompanyAssistantModal";
import { AppShell } from "@/components/shared/AppShell";
import { PageLoader } from "@/components/shared/PageLoader";
import { getPersonaId, setPersonaId } from "@/lib/api";
import { personaForRole } from "@/lib/nav";

function DeskInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(true);
  const first = params.get("first") ?? undefined;

  useEffect(() => {
    setPersonaId(personaForRole("company", params.get("persona") ?? getPersonaId()));
  }, [params]);

  return (
    <AppShell role="company" title="Hiring assistant" subtitle="Ask anything — you decide what opens next.">
      <CompanyAssistantModal
        open={open}
        firstMessage={first ?? undefined}
        onClose={() => {
          setOpen(false);
          router.push("/company");
        }}
      />
    </AppShell>
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
