"use client";

export function DemoRibbon({ visible }: { visible?: boolean }) {
  if (!visible) return null;
  return (
    <div className="bg-signal-warn px-3 py-1.5 text-center text-xs font-semibold text-white">
      Demo mode — some interview turns may be cached for reliability
    </div>
  );
}
