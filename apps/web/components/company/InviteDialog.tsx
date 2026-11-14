"use client";

import { CalendarClock, Send, X } from "lucide-react";
import { useEffect, useState } from "react";

const SLOTS = [
  "Event day · 10:00",
  "Event day · 11:30",
  "Event day · 13:00",
  "Event day · 14:30",
  "Online call after the event",
];

export function InviteDialog({
  open,
  alias,
  briefTitle,
  slotMinutes,
  pending,
  error,
  onClose,
  onSend,
}: {
  open: boolean;
  alias: string;
  briefTitle: string;
  slotMinutes: number;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSend: (message: string, slot: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [slot, setSlot] = useState(SLOTS[0]);

  useEffect(() => {
    if (!open) return;
    setMessage(
      `Hi ${alias}, we read your skill story and would like a ${slotMinutes}-minute conversation ` +
        `about the ${briefTitle} role. Would that work for you?`,
    );
    setSlot(SLOTS[0]);
  }, [open, alias, briefTitle, slotMinutes]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-signal-ink/40 p-4"
      role="dialog"
      aria-modal
      aria-labelledby="invite-title"
    >
      <div className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="invite-title" className="text-xl font-bold text-signal-ink">
              Invite {alias} to an interview
            </h2>
            <p className="mt-1 text-sm text-signal-muted">For: {briefTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-signal-muted hover:bg-signal-foam"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSend(message, slot);
          }}
        >
          <label className="block text-sm font-semibold text-signal-ink">
            Message
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={4}
              className="mt-1.5 w-full rounded-2xl border border-signal-line bg-white px-3 py-2 text-sm font-normal outline-none focus:border-signal-accent/50"
            />
          </label>
          <label className="block text-sm font-semibold text-signal-ink">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-signal-accent" /> Proposed time
            </span>
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-signal-line bg-white px-3 py-2 text-sm font-normal"
            >
              {SLOTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <p className="rounded-2xl bg-signal-accentSoft/60 px-3 py-2 text-xs text-signal-ink/80">
            The candidate decides whether to accept. Their name is shared with you only if they
            accept; until then you see the alias and approved evidence only.
          </p>
          {error ? <p className="text-sm text-signal-warn">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-signal-line px-4 py-2 text-sm font-medium text-signal-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-signal-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {pending ? "Sending…" : "Send invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
