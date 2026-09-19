import { RISK_COLORS } from "@/lib/api";

export default function RiskBadge({ category }: { category: string }) {
  const color = RISK_COLORS[category] || "var(--text-secondary)";
  return (
    <span
      className="text-xs font-mono font-medium uppercase tracking-[0.04em] px-2.5 py-1 inline-block border-l-2"
      style={{
        color,
        borderColor: color,
        background: "var(--bg-panel-raised)",
      }}
    >
      {category}
    </span>
  );
}