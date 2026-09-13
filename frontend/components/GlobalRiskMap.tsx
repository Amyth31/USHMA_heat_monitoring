"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import type { Feature } from "geojson";
import "leaflet/dist/leaflet.css";
import { api, RISK_COLORS } from "@/lib/api";

// India's real bounding box (approx) — used only to decide when to swap
// in the finer real district layer as the user zooms/pans, never to draw
// a fabricated boundary.
const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.5, 68.0],
  [37.5, 97.5],
];
const DELHI_BOUNDS: [[number, number], [number, number]] = [
  [28.35, 76.75],
  [28.95, 77.45],
];

type DetailLevel = "world" | "india" | "delhi";

function boundsIntersect(a: [[number, number], [number, number]], b: any): boolean {
  const [aSouth, aWest] = a[0];
  const [aNorth, aEast] = a[1];
  return (
    b.getSouth() <= aNorth &&
    b.getNorth() >= aSouth &&
    b.getWest() <= aEast &&
    b.getEast() >= aWest
  );
}

function ZoomWatcher({ onLevelChange }: { onLevelChange: (level: DetailLevel) => void }) {
  const map = useMapEvents({
    zoomend: () => evaluate(),
    moveend: () => evaluate(),
  });

  function evaluate() {
    const zoom = map.getZoom();
    const bounds = map.getBounds();
    if (zoom >= 8 && boundsIntersect(DELHI_BOUNDS, bounds)) {
      onLevelChange("delhi");
    } else if (zoom >= 4 && boundsIntersect(INDIA_BOUNDS, bounds)) {
      onLevelChange("india");
    } else {
      onLevelChange("world");
    }
  }

  useEffect(() => {
    evaluate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function GlobalRiskMap({
  mode,
  onSelectRegion,
}: {
  mode: "vulnerability" | "population";
  onSelectRegion?: (info: { name: string; locationHint: string }) => void;
}) {
  const [level, setLevel] = useState<DetailLevel>("world");
  const [worldData, setWorldData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [indiaData, setIndiaData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [delhiData, setDelhiData] = useState<GeoJSON.FeatureCollection | null>(null);
  const loadedRef = useRef({ world: false, india: false, delhi: false });

  useEffect(() => {
    if (level === "world" && !loadedRef.current.world) {
      loadedRef.current.world = true;
      api.getWorldCountriesGeoJSON().then(setWorldData).catch(() => {});
    }
    if (level === "india" && !loadedRef.current.india) {
      loadedRef.current.india = true;
      api.getIndiaDistrictsGeoJSON().then(setIndiaData).catch(() => {});
    }
    if (level === "delhi" && !loadedRef.current.delhi) {
      loadedRef.current.delhi = true;
      api.getDelhiDistrictsGeoJSON().then(setDelhiData).catch(() => {});
    }
  }, [level]);

  const activeData = level === "delhi" ? delhiData : level === "india" ? indiaData : worldData;

  function style(feature?: Feature): PathOptions {
    const props: any = feature?.properties || {};
    let fillColor = "#2a3244";
    let fillOpacity = 0.35;

    if (mode === "vulnerability" && props.vulnerability_category) {
      fillColor = RISK_COLORS[props.vulnerability_category] || "#2a3244";
      fillOpacity = 0.55;
    } else if (mode === "population") {
      const pop = props.population_2011 || props.POP_EST || 0;
      const t = Math.min(1, pop / 20_000_000);
      fillColor = `color-mix(in srgb, var(--accent) ${Math.round(20 + t * 60)}%, #1a2030)`;
      fillOpacity = 0.5;
    }

    return {
      fillColor,
      fillOpacity,
      color: "#0e1218",
      weight: level === "world" ? 0.6 : 1.2,
    };
  }

  function onEachFeature(feature: Feature, layer: Layer) {
    const props: any = feature.properties || {};
    const name = props.district || props.NAME || props.name || "Unknown";
    const vuln = props.vulnerability_score;
    const cat = props.vulnerability_category;
    const popupHtml = `
      <div style="font-family: var(--font-sans, sans-serif); font-size: 13px; min-width: 170px;">
        <div style="font-weight:600; margin-bottom:4px;">${name}</div>
        <div>Vulnerability: <b>${vuln ?? "—"}</b>${cat ? ` (${cat})` : ""}</div>
      </div>
    `;
    layer.bindPopup(popupHtml);
    layer.on("click", () => onSelectRegion?.({ name, locationHint: props.state || props.NAME || name }));
    layer.on("mouseover", (e: any) => e.target.setStyle({ weight: 2.2, fillOpacity: Math.min(1, style(feature).fillOpacity! + 0.2) }));
    layer.on("mouseout", (e: any) => e.target.setStyle(style(feature)));
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[22.5, 79]}
        zoom={4}
        minZoom={2}
        style={{ height: "100%", width: "100%", background: "var(--bg-panel)" }}
        worldCopyJump
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors. Country/district boundaries: Natural Earth &amp; public administrative GIS data.'
          className="map-tiles-dark"
        />
        {activeData && (
          <GeoJSON key={level} data={activeData as any} style={style} onEachFeature={onEachFeature} />
        )}
        <ZoomWatcher onLevelChange={setLevel} />
      </MapContainer>

      <MapLegend mode={mode} level={level} />
    </div>
  );
}

function MapLegend({ mode, level }: { mode: "vulnerability" | "population"; level: DetailLevel }) {
  const categories = ["LOW", "MODERATE", "ELEVATED", "HIGH", "SEVERE"];
  return (
    <div
      className="absolute bottom-3 left-3 z-[1000] rounded-[var(--radius-sm)] border px-3 py-2.5 text-xs"
      style={{ background: "color-mix(in srgb, var(--bg-panel) 92%, transparent)", borderColor: "var(--border-hairline-strong)" }}
    >
      <div className="text-[var(--text-tertiary)] mb-1.5">
        {level === "world" ? "World" : level === "india" ? "India (districts)" : "Delhi (districts)"} — {mode === "vulnerability" ? "vulnerability" : "population"}
      </div>
      {mode === "vulnerability" ? (
        <div className="flex items-center gap-2">
          {categories.map((c) => (
            <div key={c} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: RISK_COLORS[c] }} />
              <span className="text-[var(--text-secondary)]">{c[0]}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="w-16 h-2 rounded-full inline-block" style={{ background: "linear-gradient(to right, #1a2030, var(--accent))" }} />
          <span className="text-[var(--text-secondary)]">low → high</span>
        </div>
      )}
    </div>
  );
}
