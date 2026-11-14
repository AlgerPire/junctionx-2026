import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import { DemoRibbon } from "@/components/shared/DemoRibbon";
import { APP_NAME } from "@/lib/brand";

import "./globals.css";
import { Providers } from "./providers";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} — Espoo recruitment matchmaking`,
  description:
    "AI helps people explain themselves. Humans decide who to talk to. Built for City of Espoo recruitment events.",
  applicationName: APP_NAME,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-signal-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <DemoRibbon visible={process.env.NEXT_PUBLIC_DEMO_CACHE === "1"} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
