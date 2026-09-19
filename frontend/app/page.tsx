import Link from "next/link";
import HumidityDemo from "@/components/HumidityDemo";

const PIPELINE_STAGES = [
  { label: "Weather", detail: "Real-time observations & 5-day forecast" },
  { label: "Thermal Indices", detail: "Heat Index, WBGT, UTCI" },
  { label: "Human Stress", detail: "Composite 0-100 stress score" },
  { label: "AI Health Risk", detail: "Mortality & hospitalization estimate" },
  { label: "GIS", detail: "Hyperlocal district-level mapping" },
  { label: "Action", detail: "Recommendations for authorities" },
];

const STAKEHOLDERS = [
  { name: "Municipal Corporations", can: "Trigger cooling-centre openings and adjust civic work schedules" },
  { name: "Hospitals", can: "See hospitalization risk trends 3-5 days ahead to plan triage capacity" },
  { name: "Disaster Management Authorities", can: "Issue district-level alerts backed by explainable risk factors" },
  { name: "Public Health Departments", can: "Target outreach using real Census vulnerability data" },
  { name: "Outdoor Workforce Managers", can: "Shift labour hours around thermal stress forecasts" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* HERO */}
      <section className="border-b min-h-screen flex items-center" style={{ borderColor: "var(--border-hairline)" }}>
        <div className="max-w-6xl mx-auto px-6 py-24 relative w-full">
          {/* Left column — copy + CTAs */}
          <div>
            <div
              className="text-xs font-mono uppercase tracking-[0.14em] mb-5"
              style={{ color: "var(--text-tertiary)" }}
            >
              USHMA · Unified System for Heat Monitoring &amp; Analytics
            </div>

            <h1 className="text-4xl md:text-5xl leading-[1.1] font-semibold max-w-xl mb-6">
              Heat doesn&apos;t kill because of temperature alone.
            </h1>
            <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-xl mb-10 leading-relaxed">
              USHMA predicts what extreme heat will do to people — combining
              weather intelligence, thermal stress modelling, real population
              vulnerability data, and health-risk estimation for hyperlocal
              heatwave early warning, worldwide. India runs at real
              district-level depth; every other country uses real
              country-level data.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-[var(--radius-sm)] font-medium text-sm transition-colors duration-150"
                style={{ background: "var(--accent)", color: "var(--bg-void)" }}
              >
                Enter Command Centre
              </Link>
              <Link
                href="/risk-map"
                className="px-6 py-3 rounded-[var(--radius-sm)] font-medium text-sm border transition-colors duration-150 hover:bg-[var(--bg-panel)]"
                style={{ borderColor: "var(--border-hairline-strong)" }}
              >
                View risk map
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1 — humidity demo */}
      <section className="border-b" style={{ borderColor: "var(--border-hairline)" }}>
        <div className="max-w-6xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-semibold mb-3 max-w-xl">
            The temperature isn&apos;t the whole story.
          </h2>
          <HumidityDemo />
        </div>
      </section>

      {/* SECTION 2 — pipeline */}
      <section className="border-b" style={{ borderColor: "var(--border-hairline)" }}>
        <div className="max-w-6xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-semibold mb-3 max-w-xl">
            From weather to human impact.
          </h2>
          <p className="text-[var(--text-secondary)] mb-12 max-w-xl">
            Six real stages, each backed by documented science or real government data — not a black box.
          </p>
          <div className="grid md:grid-cols-6 gap-px" style={{ background: "var(--border-hairline)" }}>
            {PIPELINE_STAGES.map((stage) => (
              <div
                key={stage.label}
                className="p-5 transition-colors duration-200 hover:bg-[var(--bg-panel-raised)]"
                style={{ background: "var(--bg-panel)" }}
              >
                <div className="text-base font-medium mb-1.5">{stage.label}</div>
                <div className="text-xs text-[var(--text-tertiary)] leading-relaxed">{stage.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — stakeholders */}
      <section className="border-b" style={{ borderColor: "var(--border-hairline)" }}>
        <div className="max-w-6xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-semibold mb-12 max-w-xl">
            Built for people who have to act.
          </h2>
          <div className="space-y-0">
            {STAKEHOLDERS.map((s, i) => (
              <div
                key={s.name}
                className="grid md:grid-cols-[280px_1fr] gap-4 py-6 px-3 -mx-3 rounded-[var(--radius-sm)] transition-colors duration-200 hover:bg-[var(--bg-panel)]"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-hairline)" }}
              >
                <div className="font-medium">{s.name}</div>
                <div className="text-[var(--text-secondary)] text-sm">{s.can}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scientific foundation */}
      <section className="border-b" style={{ borderColor: "var(--border-hairline)" }}>
        <div className="max-w-6xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-semibold mb-6 max-w-xl">Built on real data and documented science.</h2>
          <p className="text-[var(--text-secondary)] max-w-xl mb-6 leading-relaxed">
            Weather is live from open meteorological data. Population vulnerability
            is computed from actual Census 2011 district figures joined to real
            administrative boundaries. Health-risk estimates are anchored to a
            peer-reviewed Indian heat-mortality study, not invented numbers.
            Every formula and every assumption is documented.
          </p>
          <Link href="/methodology" className="text-sm underline" style={{ color: "var(--accent)" }}>
            View methodology
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section>
        <div className="max-w-6xl mx-auto px-6 py-28 text-center">
          <h2 className="text-4xl font-semibold mb-3">Every degree matters.</h2>
          <p className="text-xl text-[var(--text-secondary)] mb-10">Every warning can save lives.</p>
          <Link
            href="/dashboard"
            className="inline-block px-8 py-4 rounded-[var(--radius-sm)] font-medium"
            style={{ background: "var(--accent)", color: "var(--bg-void)" }}
          >
            Enter HeatShield Command Centre
          </Link>
        </div>
      </section>
    </main>
  );
}