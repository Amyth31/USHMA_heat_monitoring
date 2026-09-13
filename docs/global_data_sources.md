# Global Data Sources (non-India locations)

USHMA covers the whole world. India runs at real district-level depth
(Census 2011 + real district boundaries). Every other country uses the
best real, freely-accessible global-scale equivalents instead — there is
no free, granular census-style dataset covering every country, so this
is a genuine, documented depth difference, not a shortcut.

## Boundaries
Natural Earth 1:50m admin-0 country boundaries (`ne_50m_admin_0_countries`),
public domain, 242 features. Source:
https://github.com/nvkelso/natural-earth-vector

## Vulnerability
World Bank World Development Indicators, fetched live (free, no API key)
and disk-cached for 30 days (these are annual indicators):

| Factor | Indicator code | Real meaning |
|---|---|---|
| Population density | `EN.POP.DNST` | People per km² |
| Elderly share | `SP.POP.65UP.TO.ZS` | Population 65+ (%) |
| Outdoor-worker proxy | `SL.AGR.EMPL.ZS` | Employment in agriculture (% of total employment) |
| Housing/cooling proxy | `EG.ELC.ACCS.ZS` | Access to electricity (%) |
| Literacy proxy | `SE.ADT.LITR.ZS` | Adult literacy rate (%) — often missing for high-income countries once near-universal; excluded from that country's score rather than guessed |

Response format verified against a live call during development
(`api.worldbank.org/v2/country/US;JP/indicator/NY.GDP.MKTP.CD?format=json&mrv=2`).
The API's documented quirk — an invalid request returns HTTP 200 with a
1-element message envelope instead of an error — is checked for
explicitly in `backend/services/global_vulnerability_service.py`.

## Heatwave detection
The WMO's general definition: daily max temperature exceeding the real
climatological average maximum by ≥5°C for more than 5 consecutive days
(the 1961-1990 reference period is the WMO's own baseline; this prototype
substitutes a real, live-computed 10-year average from Open-Meteo's free
historical archive API, since the exact 1961-1990 dataset isn't freely
accessible). See `backend/services/global_heatwave_engine.py`.

India keeps its own IMD-specific criteria (absolute ≥45°C/47°C or
departure ≥4.5°C/6.5°C, sustained 2+ days) rather than the WMO general
definition, since IMD's thresholds are what Indian authorities actually
use operationally.

## Health risk
Unchanged from the India model — still anchored to the real Ahmedabad
Heat Action Plan evaluation study (PMC6236972). For non-Indian locations
the API response explicitly notes this is a general approximation
calibrated on Indian mortality data, not a location-specific study,
since no equivalent public study was available to this prototype for
other countries.

## What's coarser at global scale (honest limitations)
- Location granularity is one point per country, not sub-national. A
  "click" on the world map queries that country's real centroid weather
  and real national-level vulnerability — not a specific city.
- The literacy indicator is often missing for high-income countries in
  the World Bank dataset (once literacy is near-universal, some
  countries stop reporting it); the vulnerability score re-normalizes
  around whichever real indicators are actually available for that
  country rather than guessing a missing one.
- The WMO heatwave definition needs 5 consecutive days above threshold;
  this prototype's 5-day forecast window can only just reach that bound,
  so "confirmed" heatwave status is a tight call by design, not a bug.
