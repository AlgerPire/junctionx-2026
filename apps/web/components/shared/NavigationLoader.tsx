"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PageLoader } from "@/components/shared/PageLoader";
import { stopSpeaking } from "@/lib/audio";
import { cn } from "@/lib/utils";

const MIN_VISIBLE_MS = 320;
const FADE_MS = 240;
const MAX_VISIBLE_MS = 3500;

function samePath(a: string, b: string): boolean {
  const normalize = (value: string) => {
    try {
      const url = new URL(value, window.location.origin);
      const path = url.pathname.replace(/\/$/, "") || "/";
      return `${path}${url.search}`;
    } catch {
      return value;
    }
  };
  return normalize(a) === normalize(b);
}

/** Full-screen branded loader during client-side route changes. */
export function NavigationLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const pending = useRef(false);
  const startedAt = useRef(0);
  const targetPath = useRef<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathnameRef = useRef(pathname);

  pathnameRef.current = pathname;

  const clearTimers = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    hideTimer.current = null;
    fadeTimer.current = null;
    safetyTimer.current = null;
  };

  const finishLoading = () => {
    if (!pending.current) return;
    const elapsed = Date.now() - startedAt.current;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    clearTimers();
    hideTimer.current = setTimeout(() => {
      setExiting(true);
      fadeTimer.current = setTimeout(() => {
        setVisible(false);
        setExiting(false);
        pending.current = false;
        targetPath.current = null;
      }, FADE_MS);
    }, wait);
  };

  const startLoading = (nextPath: string) => {
    if (samePath(nextPath, `${pathnameRef.current}${window.location.search}`)) return;
    clearTimers();
    pending.current = true;
    startedAt.current = Date.now();
    targetPath.current = nextPath;
    stopSpeaking();
    setExiting(false);
    setVisible(true);
    // Never leave the overlay stuck if the route never settles.
    safetyTimer.current = setTimeout(() => {
      finishLoading();
    }, MAX_VISIBLE_MS);
  };

  useEffect(() => {
    if (!pending.current) return;
    const arrived =
      !targetPath.current ||
      samePath(pathname, targetPath.current) ||
      pathname === (targetPath.current.split("?")[0] || "/");
    if (arrived) finishLoading();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to committed path
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.hasAttribute("download")) return;
      const target = anchor.getAttribute("target");
      if (target && target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const next = `${url.pathname}${url.search}`;
      const current = `${window.location.pathname}${window.location.search}`;
      if (samePath(next, current)) return;

      startLoading(next);
    };

    const onPopState = () => {
      // location is already updated; show until React commits the new pathname (or safety fires).
      clearTimers();
      pending.current = true;
      startedAt.current = Date.now();
      targetPath.current = `${window.location.pathname}${window.location.search}`;
      stopSpeaking();
      setExiting(false);
      setVisible(true);
      safetyTimer.current = setTimeout(() => {
        finishLoading();
      }, MAX_VISIBLE_MS);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[120] transition-opacity ease-out",
        exiting ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-hidden={exiting}
    >
      <div className="absolute inset-0 bg-signal-foam/70 backdrop-blur-md" />
      <div className="relative flex h-full w-full items-center justify-center">
        <PageLoader label="Opening the next page…" />
      </div>
    </div>
  );
}
