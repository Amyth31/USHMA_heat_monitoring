"use client";

import { useEffect, useState } from "react";
import { api, Location } from "@/lib/api";

export default function LocationSearch({
  onSelect,
}: {
  onSelect: (loc: Location) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await api.searchLocations(query);
        setResults(res.results);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative w-full max-w-sm">
      <input
        type="text"
        placeholder="Search city / district"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        className="w-full px-1 py-2 text-sm outline-none bg-transparent border-0 border-b-2 border-[var(--border-hairline-strong)] transition-colors duration-150 focus:border-[var(--accent)] text-[var(--text-primary)]"
        style={{
          background: "var(--bg-panel)",
          borderColor: "var(--border-hairline-strong)",
          color: "var(--text-primary)",
        }}
      />
      {open && results.length > 0 && (
        <div
          className="absolute z-20 mt-1 w-full rounded-[var(--radius-sm)] border max-h-72 overflow-y-auto"
          style={{ background: "var(--bg-panel-raised)", borderColor: "var(--border-hairline-strong)" }}
        >
          {results.map((r) => (
            <button
              key={r.location_id}
              onClick={() => {
                onSelect(r);
                setQuery(r.name);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-panel)] flex justify-between"
            >
              <span>{r.name}</span>
              <span className="text-[var(--text-tertiary)] text-xs">{r.state}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
