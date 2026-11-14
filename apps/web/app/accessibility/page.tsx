import Link from "next/link";

import { APP_NAME } from "@/lib/brand";

export default function AccessibilityPage() {
  return (
    <main className="dash-bg min-h-screen px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal-accent">
          Accessibility
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-signal-ink">
          Accessibility statement
        </h1>
        <p className="mt-4 text-signal-muted">
          {APP_NAME} aims to meet WCAG 2.1 AA for Espoo&apos;s digital services. This pilot statement
          will be updated after formal testing with assistive technology and real users.
        </p>

        <section className="glass-card mt-8 space-y-3 p-6 text-sm leading-relaxed text-signal-ink/80">
          <h2 className="text-lg font-bold text-signal-ink">What already works</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Every voice feature has a text input and live captions.</li>
            <li>Focus outlines are visible on interactive controls.</li>
            <li>Skip link to main content on dashboard pages.</li>
            <li>Privacy and consent copy in plain language (EN / FI / SV notices available via API).</li>
          </ul>
          <h2 className="pt-4 text-lg font-bold text-signal-ink">Known gaps</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Full screen-reader audit of chart views is pending.</li>
            <li>Finnish and Swedish UI labels are partial (privacy notice first).</li>
          </ul>
          <h2 className="pt-4 text-lg font-bold text-signal-ink">Feedback</h2>
          <p>
            Report accessibility barriers to the Espoo product owner named for the pilot. We aim to
            respond within ten working days.
          </p>
        </section>

        <p className="mt-8 text-sm">
          <Link href="/" className="font-semibold text-signal-accent">
            Back to home
          </Link>
          {" · "}
          <Link href="/transparency" className="font-semibold text-signal-accent">
            Transparency
          </Link>
        </p>
      </div>
    </main>
  );
}
