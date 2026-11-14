"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getPersonaId, setPersonaId } from "@/lib/api";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "company_demo", label: "Company", href: "/company" },
  { id: "seeker_demo_a", label: "Jobseeker", href: "/seeker" },
  { id: "organiser_demo", label: "Organiser", href: "/organiser/dashboard" },
] as const;

export function PersonaSwitcher() {
  const [persona, setPersona] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("persona");
    if (fromQuery) {
      setPersonaId(fromQuery);
      setPersona(fromQuery);
      return;
    }
    setPersona(getPersonaId());
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-signal-ink/50">
        Persona
      </span>
      {OPTIONS.map((opt) => (
        <Link
          key={opt.id}
          href={`${opt.href}?persona=${opt.id}`}
          onClick={() => {
            setPersonaId(opt.id);
            setPersona(opt.id);
          }}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm transition",
            persona === opt.id
              ? "border-signal-accent bg-signal-accentSoft text-signal-accent"
              : "border-signal-line bg-white/70 text-signal-ink/70 hover:border-signal-accent",
          )}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
