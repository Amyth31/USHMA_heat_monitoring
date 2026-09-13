// Client-side mirror of backend/thermal/indices.py — same documented formulas,
// used only for the instant interactive landing-page demo so it doesn't need
// a network round trip per slider tick. The authoritative calculation for the
// rest of the app always comes from the Flask API.

export function wetBulbTemperature(tempC: number, rh: number): number {
  const r = Math.max(5, Math.min(99, rh));
  return (
    tempC * Math.atan(0.151977 * Math.sqrt(r + 8.313659)) +
    Math.atan(tempC + r) -
    Math.atan(r - 1.676331) +
    0.00391838 * Math.pow(r, 1.5) * Math.atan(0.023101 * r) -
    4.686035
  );
}

export function heatIndexC(tempC: number, rh: number): { value: number; extrapolated: boolean } {
  const T = (tempC * 9) / 5 + 32;
  const R = rh;
  const hiSimple = 0.5 * (T + 61 + (T - 68) * 1.2 + R * 0.094);

  let hi: number;
  if ((hiSimple + T) / 2 >= 80) {
    hi =
      -42.379 +
      2.04901523 * T +
      10.14333127 * R -
      0.22475541 * T * R -
      0.00683783 * T * T -
      0.05481717 * R * R +
      0.00122874 * T * T * R +
      0.00085282 * T * R * R -
      0.00000199 * T * T * R * R;
    if (R < 13 && T >= 80 && T <= 112) {
      hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    } else if (R > 85 && T >= 80 && T <= 87) {
      hi += ((R - 85) / 10) * ((87 - T) / 5);
    }
  } else {
    hi = hiSimple;
  }
  return { value: ((hi - 32) * 5) / 9, extrapolated: hi > 130 };
}

export function wbgtC(tempC: number, rh: number, solarWm2: number, windMs: number): number {
  const tw = wetBulbTemperature(tempC, rh);
  const solarOffset = (solarWm2 / 1000) * 8;
  const windRelief = Math.min(2.5, windMs * 0.6);
  const tg = tempC + solarOffset - windRelief;
  return 0.7 * tw + 0.2 * tg + 0.1 * tempC;
}

export function thermalStressScore(
  tempC: number,
  rh: number,
  windMs: number,
  solarWm2: number,
  heatIndex: number,
  wbgt: number
): { score: number; category: string } {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const wbgtC_ = clamp(((wbgt - 20) / 20) * 45, 0, 45);
  const hiC_ = clamp(((heatIndex - 27) / 28) * 20, 0, 20);
  const windC_ = clamp((3 - windMs) / 3, 0, 1) * 10;
  const solarC_ = clamp(solarWm2 / 1000, 0, 1) * 10;
  const total = clamp(wbgtC_ + hiC_ + windC_ + solarC_ + 5, 0, 100); // fixed mid exposure+vuln for demo
  let category = "SAFE";
  if (total > 80) category = "EXTREME";
  else if (total > 60) category = "HIGH";
  else if (total > 40) category = "MODERATE";
  else if (total > 20) category = "CAUTION";
  return { score: Math.round(total * 10) / 10, category };
}
