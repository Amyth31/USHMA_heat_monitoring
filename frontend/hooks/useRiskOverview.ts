"use client";

import { useEffect, useState } from "react";
import { api, Location, RiskOverview, DemoEvent } from "@/lib/api";

export function useRiskOverview(defaultQuery = "North West Delhi") {
  const [location, setLocation] = useState<Location | null>(null);
  const [overview, setOverview] = useState<RiskOverview | null>(null);
  const [demoEvents, setDemoEvents] = useState<DemoEvent[]>([]);
  const [demoKey, setDemoKey] = useState<string | undefined>("delhi_may_2024_extreme");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDemoEvents().then((r) => setDemoEvents(r.events)).catch(() => {});
    api
      .searchLocations(defaultQuery)
      .then((r) => {
        if (r.results[0]) setLocation(r.results[0]);
      })
      .catch(() => setError("Cannot reach USHMA backend at localhost:5000. Run `python backend/app.py`."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    setError(null);
    api
      .getRiskOverview(location.location_id, demoKey)
      .then(setOverview)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [location, demoKey]);

  return { location, setLocation, overview, demoEvents, demoKey, setDemoKey, loading, error };
}
