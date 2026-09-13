import { RISK_COLORS } from "@/lib/api";

export default function RiskBadge({ category }: { category: string }) {
  const color = RISK_COLORS[category] || "var(--text-secondary)";
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-[var(--radius-sm)] inline-block"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
      }}
    >
      {category}
    </span>
  );
}
