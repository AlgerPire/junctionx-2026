"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageLoader } from "@/components/shared/PageLoader";
import { getPersonaId } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";
import { roleFromPersona, type AppRole } from "@/lib/nav";

function roleFromPath(pathname: string): AppRole | null {
  if (pathname.startsWith("/company")) return "company";
  if (pathname.startsWith("/seeker") || pathname.startsWith("/copilot")) return "seeker";
  if (pathname.startsWith("/organiser")) return "organiser";
  if (pathname.startsWith("/transparency")) {
    return roleFromPersona(getPersonaId()) ?? "seeker";
  }
  return null;
}

export function AppShell({
  children,
  title,
  subtitle,
  role: roleProp,
  fitViewport = false,
  hideHeading = false,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  role?: AppRole;
  fitViewport?: boolean;
  hideHeading?: boolean;
}) {
  const pathname = usePathname();
  const [role, setRole] = useState<AppRole | null>(roleProp ?? null);

  useEffect(() => {
    setRole(roleProp ?? roleFromPath(pathname) ?? roleFromPersona(getPersonaId()) ?? "seeker");
  }, [pathname, roleProp]);

  if (!role) {
    return (
      <div className="min-h-screen">
        <PageLoader />
      </div>
    );
  }

  return (
    <DashboardShell
      role={role}
      title={title || APP_NAME}
      subtitle={subtitle}
      fitViewport={fitViewport}
      hideHeading={hideHeading}
    >
      {children}
    </DashboardShell>
  );
}
