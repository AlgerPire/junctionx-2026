export type AppRole = "company" | "seeker" | "organiser";

export interface NavItem {
  href: string;
  label: string;
  icon: "home" | "mic" | "list" | "inbox" | "users" | "chart" | "shield" | "bot" | "note" | "eye";
}

export const ROLE_NAV: Record<AppRole, NavItem[]> = {
  company: [
    { href: "/company", label: "Dashboard", icon: "home" },
    { href: "/company/brief/new", label: "New brief", icon: "mic" },
    { href: "/company/briefs", label: "My briefs", icon: "list" },
    { href: "/company/inbox", label: "Inbox", icon: "inbox" },
    { href: "/transparency", label: "Transparency", icon: "eye" },
  ],
  seeker: [
    { href: "/seeker", label: "Dashboard", icon: "home" },
    { href: "/seeker/story", label: "Skill story", icon: "mic" },
    { href: "/seeker/event", label: "Conversations", icon: "users" },
    { href: "/copilot", label: "Copilot", icon: "bot" },
    { href: "/seeker/followups", label: "Follow-ups", icon: "note" },
    { href: "/transparency", label: "Transparency", icon: "eye" },
  ],
  organiser: [
    { href: "/organiser/dashboard", label: "Dashboard", icon: "home" },
    { href: "/organiser/supply-gap", label: "Supply gap", icon: "chart" },
    { href: "/organiser/fairness", label: "Bias Mirror", icon: "shield" },
    { href: "/transparency", label: "Transparency", icon: "eye" },
  ],
};

export function roleFromPersona(id: string | null): AppRole | null {
  if (!id) return null;
  if (id.startsWith("seeker")) return "seeker";
  if (id.startsWith("company")) return "company";
  if (id.startsWith("organiser")) return "organiser";
  return null;
}

export const ROLE_META: Record<
  AppRole,
  { title: string; tagline: string; personaDefault: string; home: string }
> = {
  company: {
    title: "Company",
    tagline: "Describe needs. Meet evidenced talent.",
    personaDefault: "company_demo",
    home: "/company",
  },
  seeker: {
    title: "Jobseeker",
    tagline: "Explain your skills. Choose conversations.",
    personaDefault: "seeker_demo_a",
    home: "/seeker",
  },
  organiser: {
    title: "Organiser",
    tagline: "See gaps. Prove fairness.",
    personaDefault: "organiser_demo",
    home: "/organiser/dashboard",
  },
};
