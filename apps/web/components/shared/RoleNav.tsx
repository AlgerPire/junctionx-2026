"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { getPersonaId } from "@/lib/api";
import { cn } from "@/lib/utils";

const SEEKER_LINKS = [
  { href: "/seeker/story", label: "Skill story" },
  { href: "/seeker/event", label: "Conversations" },
  { href: "/copilot", label: "Copilot" },
  { href: "/seeker/followups", label: "Follow-ups" },
] as const;

const COMPANY_LINKS = [
  { href: "/company/brief/new", label: "New brief" },
  { href: "/company/briefs", label: "My briefs" },
  { href: "/company/inbox", label: "Inbox" },
] as const;

const ORGANISER_LINKS = [
  { href: "/organiser/dashboard", label: "Supply gap" },
  { href: "/organiser/fairness", label: "Bias Mirror" },
  { href: "/transparency", label: "Transparency" },
] as const;

function roleFromPersona(id: string | null): "seeker" | "company" | "organiser" | null {
  if (!id) return null;
  if (id.startsWith("seeker") || id.includes("seeker")) return "seeker";
  if (id.startsWith("company") || id.includes("company")) return "company";
  if (id.startsWith("organiser") || id.includes("organiser")) return "organiser";
  return null;
}

export function RoleNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<"seeker" | "company" | "organiser" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const persona = params.get("persona") ?? getPersonaId();
    setRole(roleFromPersona(persona));
  }, [pathname]);

  const links =
    role === "seeker" ? SEEKER_LINKS : role === "company" ? COMPANY_LINKS : role === "organiser" ? ORGANISER_LINKS : null;

  if (!links) return null;

  return (
    <nav aria-label="Section" className="flex flex-wrap gap-1.5">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-signal-ink text-white"
                : "text-signal-ink/65 hover:bg-white/80 hover:text-signal-ink",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
