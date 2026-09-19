"use client";

import { useState } from "react";
import { DemoEvent } from "@/lib/api";

export default function DemoScenarioSelect({
  value,
  onChange,
  events,
}: {
  value: string | undefined;
  onChange: (key: string | undefined) => void;
  events: DemoEvent[];
}) {
  const [open, setOpen] = useState(false);
  const current = events.find((e) => e.key === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm px-3 py-2 rounded-[var(--radius-sm)] border"
        style={{ background: "var(--bg-panel)", borderColor: "var(--border-hairline-strong)", color: "var(--text-primary)" }}
      >
        <span>{current ? current.label : "Live weather"}</span>
        <span className="text-[var(--text-tertiary)]">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 z-20 mt-1 w-72 rounded-[var(--radius-sm)] border max-h-72 overflow-y-auto"
            style={{ background: "var(--bg-panel-raised)", borderColor: "var(--border-hairline-strong)" }}
          >
            <button
              onClick={() => { onChange(undefined); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-panel)]"
              style={{ color: !value ? "var(--accent)" : "var(--text-primary)" }}
            >
              Live weather
            </button>
            {events.map((ev) => (
              <button
                key={ev.key}
                onClick={() => { onChange(ev.key); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-panel)]"
                style={{ color: value === ev.key ? "var(--accent)" : "var(--text-primary)" }}
              >
                {ev.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}