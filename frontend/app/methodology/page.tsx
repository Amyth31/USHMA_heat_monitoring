import TopNav from "@/components/TopNav";

const SECTIONS = [
  {
    title: "Weather data",
    body: "Live current and 5-day forecast weather comes from Open-Meteo, a free, no-key weather service blending national weather-model output. If it's unreachable, the app serves the last real cached observation (clearly marked) or an explicit unavailable status — it never fabricates a reading.",
  },
  {
    title: "Heat Index",
    body: "The Rothfusz (1990) NWS regression equation, the same formula the US National Weather Service uses operationally. Valid primarily above 27°C and 40% RH; the app flags results that fall into an extreme extrapolation region rather than hiding them.",
  },
  {
    title: "WBGT",
    body: "Outdoor WBGT is approximated as 0.7×Tw + 0.2×Tg + 0.1×Ta (Bernard 1996 / Liljegren 2008). Wet-bulb temperature (Tw) uses the Stull (2011) psychrometric approximation, validated in this build against Stull's own published example. Black-globe temperature (Tg) is estimated from air temperature plus a solar-radiation-driven offset, reduced by wind — documented as an approximation, not a direct globe-thermometer reading.",
  },
  {
    title: "UTCI",
    body: "A simplified operational approximation — air temperature adjusted for a mean-radiant-temperature proxy (from solar radiation), humidity, and wind — not the official Bröde et al. (2012) 6th-order polynomial, which needs full radiative-flux modelling this prototype doesn't have inputs for. Category thresholds follow the official UTCI scale.",
  },
  {
    title: "Human Thermal Stress Score",
    body: "A documented 0-100 composite: up to 45 points from WBGT, 20 from Heat Index, 10 for low wind, 10 for solar radiation, 5 for exposure duration, 10 for population vulnerability. Every contribution is shown, not just the final number.",
  },
  {
    title: "Heatwave detection",
    body: "Follows IMD's own published operational criteria — a heatwave is declared when departure from normal max temperature is 4.5-6.4°C (severe: ≥6.5°C), or absolute max temperature ≥45°C (severe: ≥47°C), sustained for 2+ consecutive days. Regional 'normal' temperatures use documented approximate May climatological normals by broad zone, since this prototype doesn't have access to IMD's real per-station 1981-2010 normals.",
  },
  {
    title: "Population vulnerability",
    body: "Built entirely from real Census of India 2011 district data (Registrar General & Census Commissioner), joined against real district boundary geometry with geodesic area computed directly from the polygons — not looked up. Score is a percentile-ranked composite of population density, elderly (50+) share, outdoor-worker share, household electrification, and literacy, weighted 25/25/25/15/10.",
  },
  {
    title: "Health risk (mortality & hospitalization)",
    body: "India doesn't have a public, granular heat-mortality dataset to train a supervised model on. Rather than fabricate synthetic training labels, this engine fits a documented exponential relative-risk curve through two real, peer-reviewed anchor points from the Ahmedabad Heat Action Plan evaluation study (PMC6236972): RR=2.34 at 47°C pre-intervention, RR=1.25 at 47°C post-intervention, with a threshold effect above 40°C. This is an AI-assisted relative-risk estimate anchored to real research, not a clinically validated predictive model or an absolute death-count forecast.",
  },
  {
    title: "GIS boundaries",
    body: "All-India district boundaries (760 features) and Delhi's real 11 current districts, from community-maintained open GIS repositories. For 2 Delhi districts created in 2012 (Shahdara, South East) that postdate the 2011 Census, population was apportioned from the real pre-split district total by real geodesic area share — a standard areal-interpolation technique, documented rather than invented.",
  },
  {
    title: "Global coverage",
    body: "USHMA covers every country, not just India. India keeps its real district-level depth (Census 2011 + real boundaries); every other country uses country-level real data instead, since no equivalent free, granular census exists globally: Natural Earth for real boundaries, the World Bank's live Indicators API for vulnerability (population 65+, density, agricultural-employment share as an outdoor-worker proxy, electricity access, literacy), and the WMO's general heatwave definition (≥5°C above a real climatological normal for 5+ consecutive days) in place of India-specific IMD thresholds. The real climatological normal itself comes from Open-Meteo's historical archive — an actual 10-year average, not a guessed baseline.",
  },
  {
    title: "Known limitation",
    body: "Two Delhi districts (North West, East) have imprecise polygon areas in the free boundary source used here, which would distort density-based map coloring for just those two districts. Population and every non-area-dependent figure for them is unaffected. Full detail in docs/data_limitations.md.",
  },
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen">
      <TopNav />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold mb-3">Methodology</h1>
        <p className="text-[var(--text-secondary)] mb-12">
          Every number in USHMA traces to a real, documented, cited source or a
          documented, established formula. Assumptions and limitations are stated
          here rather than hidden.
        </p>
        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <div key={s.title} className="border-t pt-6" style={{ borderColor: "var(--border-hairline)" }}>
              <h2 className="text-lg font-medium mb-2">{s.title}</h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
