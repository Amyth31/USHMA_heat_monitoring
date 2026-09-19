"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/risk-map", label: "Risk Map" },
  { href: "/forecast", label: "Forecast" },
  { href: "/thermal-stress", label: "Thermal Stress" },
  { href: "/health-risk", label: "Health Risk" },
  { href: "/alerts", label: "Alerts" },
  { href: "/analytics", label: "Analytics" },
  { href: "/methodology", label: "Methodology" },
];

export default function TopNav() {
  const pathname = usePathname();
  return (
    <nav
      className="border-b sticky top-0 z-10 backdrop-blur"
      style={{ borderColor: "var(--border-hairline)", background: "color-mix(in srgb, var(--bg-base) 90%, transparent)" }}
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-sm">
          USHMA
        </Link>
        <div className="flex gap-1 text-sm h-full">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="relative flex items-center px-3 h-full transition-colors duration-150 hover:text-[var(--text-primary)]"
                style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}
              >
                {l.label}
                <span
                  className="absolute left-3 right-3 bottom-0 h-[2px] rounded-full transition-opacity duration-150"
                  style={{
                    background: "var(--accent)",
                    opacity: active ? 1 : 0,
                  }}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
