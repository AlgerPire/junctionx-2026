"use client";

import { useQuery } from "@tanstack/react-query";
import { Bot, Clock3, FileText, Inbox, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CompanyAssistantModal } from "@/components/company/CompanyAssistantModal";
import { CardHeader, SessionRow, StatRow, StatusPill, ViewAll } from "@/components/dashboard/Cards";
import { ChatPreview } from "@/components/dashboard/ChatPreview";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LanguageSwitcher } from "@/components/dashboard/LanguageCard";
import { MicOrb, VoiceStage } from "@/components/dashboard/MicOrb";
import { apiFetch, getPersonaId, setPersonaId } from "@/lib/api";
import { unlockAudio } from "@/lib/audio";
import { COMPANY_CHAT_DEMOS } from "@/lib/companyChatDemo";
import { useSpeechLang } from "@/lib/speechLang";
import type { Brief } from "@/lib/types";

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

export default function CompanyDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [firstMessage, setFirstMessage] = useState<string | undefined>();

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

  const [lang] = useSpeechLang();
  const demo = COMPANY_CHAT_DEMOS[lang];
  const published = briefs.data?.filter((b) => b.status === "published").length ?? 0;
  const drafts = briefs.data?.filter((b) => b.status === "draft").length ?? 0;
  const requested = inbox.data?.filter((i) => i.approach.status === "requested").length ?? 0;

  function openAssistant(message?: string) {
    // Must run in the click handler so the browser allows later TTS playback.
    unlockAudio();
    const first = message?.trim() || undefined;

    // Phones: open as a real page (better layout + browser back). Desktop: modal.
    if (isMobileViewport()) {
      const q = first ? `?first=${encodeURIComponent(first)}` : "";
      router.push(`/company/desk${q}`);
      return;
    }

    setFirstMessage(first);
    setAssistantOpen(true);
  }

  function closeAssistant() {
    setAssistantOpen(false);
    setFirstMessage(undefined);
  }

  return (
    <DashboardShell
      role="company"
      title="Company dashboard"
      subtitle="Talk through a role, review approaches, keep humans in charge."
      fitViewport
    >
      <div className="grid min-h-0 flex-1 gap-4 md:gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="flex min-h-0 flex-col gap-3">
          <section className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:px-6 sm:pt-5">
              <div className="min-w-0">
                <CardHeader
                  title="Hiring assistant"
                  action={<StatusPill label="Ask anything" tone="purple" />}
                />
                <p className="mt-1 max-w-xl text-sm text-signal-muted">
                  Speak or type — I’ll open a job, a candidate profile, an invite, or your inbox.
                </p>
              </div>
              <LanguageSwitcher className="w-full shrink-0 sm:w-auto" />
            </div>
            <div className="group relative flex min-h-0 flex-1 flex-col justify-center">
              <span className="pointer-events-none absolute inset-x-8 top-2 z-10 flex justify-center opacity-0 transition group-hover:opacity-100">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-signal-accentSoft px-3 py-1 text-xs font-semibold text-signal-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  Open assistant
                </span>
              </span>
              <VoiceStage compact active>
                <MicOrb
                  heartbeat
                  onClick={() => openAssistant()}
                  label="Open hiring assistant"
                  icon={Bot}
                />
              </VoiceStage>
              <p className="-mt-1 px-4 pb-3 text-center text-sm text-signal-muted sm:px-5">
                Tap to talk with your hiring assistant
              </p>
            </div>
            <StatRow
              compact
              stats={[
                { icon: FileText, value: String(published), label: "Published jobs", tone: "purple" },
                { icon: Clock3, value: String(drafts), label: "Drafts", tone: "teal" },
                { icon: Inbox, value: String(requested), label: "Open requests", tone: "blue" },
              ]}
            />
          </section>

          <section className="glass-card shrink-0 px-4 py-3.5 sm:px-6">
            <CardHeader title="Recent jobs" action={<ViewAll href="/company/briefs" />} />
            <ul className="mt-1 divide-y divide-signal-line">
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
              <p className="mt-2 text-sm text-signal-muted">
                No jobs yet — open the assistant to draft one.
              </p>
            ) : null}
          </section>
        </div>

        <ChatPreview
          className="min-h-0"
          demo={demo}
          placeholder={demo.placeholder}
          onSubmit={(text) => openAssistant(text)}
        />
      </div>

      <CompanyAssistantModal
        open={assistantOpen}
        mode="overlay"
        onClose={closeAssistant}
        firstMessage={firstMessage}
      />
    </DashboardShell>
  );
}
