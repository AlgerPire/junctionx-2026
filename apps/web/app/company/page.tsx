"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock3, FileText, Inbox } from "lucide-react";
import { useEffect, useState } from "react";

import { CardHeader, SessionRow, StatRow, StatusPill, ViewAll } from "@/components/dashboard/Cards";
import { ChatPreview } from "@/components/dashboard/ChatPreview";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LanguageCard } from "@/components/dashboard/LanguageCard";
import { MicOrb, VoiceStage } from "@/components/dashboard/MicOrb";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import type { Brief } from "@/lib/types";

export default function CompanyDashboardPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setPersonaId(
      new URLSearchParams(window.location.search).get("persona") ??
        getPersonaId() ??
        "company_demo",
    );
    setReady(true);
  }, []);

  const briefs = useQuery({
    queryKey: ["company-briefs-dash"],
    enabled: ready,
    queryFn: () => apiFetch<Brief[]>("/api/briefs"),
  });

  const inbox = useQuery({
    queryKey: ["inbox-dash"],
    enabled: ready,
    queryFn: () => apiFetch<{ approach: { status: string } }[]>("/api/approaches/inbox"),
  });

  const published = briefs.data?.filter((b) => b.status === "published").length ?? 0;
  const drafts = briefs.data?.filter((b) => b.status === "draft").length ?? 0;
  const requested = inbox.data?.filter((i) => i.approach.status === "requested").length ?? 0;

  return (
    <DashboardShell
      role="company"
      title="Company dashboard"
      subtitle="Talk through a role, review approaches, keep humans in charge."
    >
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section className="glass-card overflow-hidden">
            <div className="px-6 pt-6">
              <CardHeader title="Live hiring brief" action={<StatusPill label="Ready" />} />
            </div>
            <VoiceStage>
              <MicOrb href="/company/brief/new" label="Start a voice hiring brief" />
            </VoiceStage>
            <StatRow
              stats={[
                { icon: FileText, value: String(published), label: "Published briefs", tone: "purple" },
                { icon: Clock3, value: String(drafts), label: "Drafts", tone: "teal" },
                { icon: Inbox, value: String(requested), label: "Open requests", tone: "blue" },
              ]}
            />
          </section>

          <section className="glass-card p-6">
            <CardHeader title="Recent briefs" action={<ViewAll href="/company/briefs" />} />
            <ul className="mt-3 divide-y divide-signal-line">
              {(briefs.data ?? []).slice(0, 4).map((b, i) => (
                <SessionRow
                  key={b.id}
                  index={i}
                  href={`/company/briefs/${b.id}`}
                  title={b.title}
                  meta={b.status}
                  date={`${b.skills.length} skills · ${b.work_mode}`}
                />
              ))}
            </ul>
            {!briefs.isLoading && !briefs.data?.length ? (
              <p className="mt-3 text-sm text-signal-muted">No briefs yet — tap the mic to start one.</p>
            ) : null}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <LanguageCard />
          <ChatPreview
            targetHref="/company/brief/new"
            placeholder="Describe the role you're hiring for…"
            messages={[
              { role: "assistant", content: "Hi! What role are you hiring for today?" },
              { role: "user", content: "A data analyst for our energy team." },
              {
                role: "assistant",
                content: "Great. What should they achieve in their first 90 days?",
              },
            ]}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
