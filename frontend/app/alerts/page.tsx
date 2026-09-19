"use client";

import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import RiskBadge from "@/components/RiskBadge";
import LocationSearch from "@/components/LocationSearch";
import { api, Location } from "@/lib/api";

type Alert = {
  id: string;
  location_name: string;
  risk_level: string;
  trigger: string;
  expected_duration_days: number | null;
  actions: string[];
  status: string;
  created_at_unix: number;
};

const FILTERS = ["All", "EXTREME", "SEVERE", "HIGH", "RESOLVED"] as const;

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [location, setLocation] = useState<Location | null>(null);
  const [authorityKey, setAuthorityKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  function refresh() {
    api.getAlerts().then((r) => setAlerts(r.alerts)).catch((e) => setError(e.message));
  }

  useEffect(refresh, []);

  async function handleUnlock() {
    setKeyError(null);
    setVerifying(true);
    try {
      await api.verifyAuthorityKey(authorityKey);
      setUnlocked(true);
    } catch {
      setKeyError("Authority key rejected — issuing an alert requires valid disaster-management credentials.");
      setUnlocked(false);
    } finally {
      setVerifying(false);
    }
  }

  async function handleCreate() {
    if (!location) return;
    setCreating(true);
    setKeyError(null);
    try {
      await api.createAlert(location.location_id, authorityKey);
      refresh();
    } catch (e: any) {
      if (e.status === 403) {
        setKeyError("Authority key rejected — issuing an alert requires valid disaster-management credentials.");
        setUnlocked(false);
      } else {
        setError(e.message);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleResolve(alertId: string) {
    setResolvingId(alertId);
    setError(null);
    try {
      await api.resolveAlert(alertId, authorityKey);
      refresh();
    } catch (e: any) {
      if (e.status === 403) {
        setKeyError("Authority key rejected — resolving requires valid disaster-management credentials.");
        setUnlocked(false);
      } else {
        setError(e.message);
      }
    } finally {
      setResolvingId(null);
    }
  }

  const visible = alerts.filter((a) => {
    if (filter === "All") return true;
    if (filter === "RESOLVED") return a.status === "RESOLVED";
    return a.risk_level === filter && a.status === "ACTIVE";
  });

  return (
    <main className="min-h-screen">
      <TopNav />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Alert Centre</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Public view — anyone can see active alerts. Issuing a new alert
              requires disaster-management authority credentials.
            </p>
          </div>
        </div>

        {error && (
          <div className="text-sm p-4 rounded-[var(--radius-sm)] border mb-6" style={{ borderColor: "var(--risk-high)", color: "var(--risk-high)" }}>
            {error}
          </div>
        )}

        <div
          className="rounded-[var(--radius-md)] border p-5 mb-8"
          style={{ borderColor: "var(--border-hairline)", background: "var(--bg-panel)" }}
        >
          {!unlocked ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-[var(--text-secondary)]">Authority sign-in:</span>
              <input
                type="password"
                placeholder="Authority key"
                value={authorityKey}
                onChange={(e) => setAuthorityKey(e.target.value)}
                className="px-1 py-2 text-sm outline-none bg-transparent border-0 border-b-2 border-[var(--border-hairline-strong)] transition-colors duration-150 focus:border-[var(--accent)]"
                style={{ background: "var(--bg-panel-raised)", borderColor: "var(--border-hairline-strong)" }}
              />
              <button
                onClick={handleUnlock}
                disabled={!authorityKey || verifying}
                className="text-sm px-4 py-2 rounded-[var(--radius-sm)] font-medium disabled:opacity-40"
                style={{ background: "var(--accent)", color: "var(--bg-void)" }}
              >
                {verifying ? "Verifying…" : "Unlock issuing"}
              </button>
              {keyError && <span className="text-xs" style={{ color: "var(--risk-high)" }}>{keyError}</span>}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="text-xs font-mono font-medium uppercase tracking-[0.04em] px-2.5 py-1 border-l-2"
                style={{ color: "var(--risk-safe)", borderColor: "var(--risk-safe)", background: "var(--bg-panel-raised)" }}
              >
                Authority mode
              </span>
              <LocationSearch onSelect={setLocation} />
              <button
                onClick={handleCreate}
                disabled={!location || creating}
                className="text-sm px-4 py-2 rounded-[var(--radius-sm)] font-medium disabled:opacity-40"
                style={{ background: "var(--accent)", color: "var(--bg-void)" }}
              >
                {creating ? "Issuing…" : "Issue alert from live risk data"}
              </button>
              <button onClick={() => { setUnlocked(false); setAuthorityKey(""); }} className="text-xs text-[var(--text-tertiary)] underline transition-opacity duration-150 hover:opacity-70">
                Sign out
              </button>
              {keyError && <span className="text-xs w-full" style={{ color: "var(--risk-high)" }}>{keyError}</span>}
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="text-xs px-3 py-1.5 rounded-[var(--radius-sm)] border transition-colors duration-150"
              style={{
                borderColor: "var(--border-hairline-strong)",
                background: filter === f ? "var(--accent)" : "var(--bg-panel)",
                color: filter === f ? "var(--bg-void)" : "var(--text-secondary)",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {visible.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)]">
            No alerts issued yet.
          </p>
        )}

        <div className="space-y-4">
          {visible.map((a) => (
            <div
              key={a.id}
              className="rounded-[var(--radius-md)] border p-6 transition-colors duration-200 hover:border-[var(--border-hairline-strong)]"
              style={{ borderColor: "var(--border-hairline)", background: "var(--bg-panel)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs text-[var(--text-tertiary)] mb-1 ">
                    {new Date(a.created_at_unix * 1000).toLocaleString()}
                  </div>
                  <h2 className="font-medium">{a.location_name}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <RiskBadge category={a.status === "RESOLVED" ? "RESOLVED" : a.risk_level} />
                  {unlocked && a.status !== "RESOLVED" && (
                    <button
                      onClick={() => handleResolve(a.id)}
                      disabled={resolvingId === a.id}
                      className="text-xs px-3 py-1.5 rounded-[var(--radius-sm)] border font-medium disabled:opacity-40 transition-colors duration-150 hover:bg-[var(--bg-panel-raised)]"
                      style={{ borderColor: "var(--border-hairline-strong)", color: "var(--text-secondary)" }}
                    >
                      {resolvingId === a.id ? "Resolving…" : "Mark resolved"}
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-3">{a.trigger}</p>
              {a.expected_duration_days && (
                <p className="text-xs text-[var(--text-tertiary)] mb-4">
                  Expected duration: {a.expected_duration_days} day(s)
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {a.actions.map((act, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-[var(--radius-sm)]"
                    style={{ background: "var(--bg-panel-raised)", color: "var(--text-secondary)" }}
                  >
                    {act}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
