"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { stopSpeaking } from "@/lib/audio";

/** Stops Azure/browser TTS whenever the route changes. */
export function StopVoiceOnNavigate() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    stopSpeaking();
  }, [pathname]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  return null;
}
