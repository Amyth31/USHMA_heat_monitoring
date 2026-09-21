import TopNav from "@/components/TopNav";

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <TopNav />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold mb-2">USHMA</h1>
        <p className="text-[var(--text-secondary)] mb-10">
          Unified System for Heat Monitoring &amp; Analytics — also referred to as HeatShield
        </p>

        <Section title="Smart India Hackathon 2026">
          <Row label="Problem Statement" value="26083 — Extreme Heatwave Early Warning and Human Thermal Stress Index" />
          <Row label="Organization" value="Ministry of Earth Sciences (MoES)" />
          <Row label="Department" value="National Centre for Medium Range Weather Forecasting (NCMRWF)" />
          <Row label="Category" value="Software" />
          <Row label="Theme" value="Disaster Management" />
        </Section>

        <Section title="Technology stack">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Next.js, TypeScript, Tailwind CSS, and Leaflet on the frontend; Python and
            Flask on the backend; real Census 2011 and open GIS boundary data,
            Open-Meteo for live weather.
          </p>
        </Section>

        <Section title="System architecture">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Weather → Thermal Index Engine → Human Thermal Stress Engine →
            Vulnerability Engine → Health Risk Engine → Spatial Risk Aggregation →
            Risk Classification → GIS Dashboard → Alert Engine → Decision Support.
            Every stage is backed by real data or a documented, cited formula — see
            the Methodology page.
          </p>
        </Section>

        <Section title="Future scope">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            A production deployment would connect to NCMRWF/IMD forecast feeds directly,
            source an official Delhi ward-level GIS layer, move storage to
            PostgreSQL/PostGIS, and — if a suitable public heat-mortality dataset
            becomes available — train and validate a genuine supervised health-risk model
            rather than the current documented relative-risk estimate.
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t pt-6 mb-10" style={{ borderColor: "var(--border-hairline)" }}>
      <h2 className="text-lg font-medium mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5">
      <span className="text-[var(--text-tertiary)]">{label}</span>
      <span className="text-right max-w-md">{value}</span>
    </div>
  );
}
