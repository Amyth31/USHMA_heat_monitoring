# Data Sources

Every figure in USHMA traces to a real source. This file is the master
list; see also `docs/global_data_sources.md` for the world-scale detail
and `docs/data_limitations.md` for the one known Delhi geometry caveat.

| Data | Source | License/access | Freshness |
|---|---|---|---|
| Weather (India + world) | Open-Meteo | Free, no key, CC BY 4.0 | Live |
| India district demographics | Census of India 2011 (Registrar General & Census Commissioner), redistributed CSV | Public government data | 2011 (India's most recent completed census; 2021 census was delayed and has not yet been conducted) |
| India district boundaries | Community GIS repos (udit-001/india-maps-data, datta07/INDIAN-SHAPEFILES) | Public/community-maintained | Static |
| World country boundaries | Natural Earth 1:50m admin-0 | Public domain | Static |
| World vulnerability indicators | World Bank World Development Indicators | Free, no key, CC BY 4.0 | Live (cached 30 days; indicators are annual) |
| Heatwave criteria (India) | India Meteorological Department published operational criteria | Public | Static definition |
| Heatwave criteria (world) | WMO general heatwave definition | Public | Static definition; baseline computed live from Open-Meteo historical archive |
| Health-risk anchor | Azhar et al., Ahmedabad HAP evaluation (PMC6236972) | Peer-reviewed, public | Static (published study) |
| Historical demo events | IMD, Environment Canada, multiple cited news/scientific sources | Public record | Static (real, dated events) |

## Reproducing the data pipeline

```bash
cd backend
python utils/build_district_master.py      # Census 2011 + real boundaries -> data/processed/district_master.csv
python utils/build_delhi_districts.py       # Delhi's 11 real current districts -> data/processed/delhi_districts.csv
```

Both scripts print a match/unmatch report — read it. Known unmatched
districts are mostly post-2011 administrative splits that genuinely
don't exist in the 2011 count (not a bug to silently "fix").

## What's NOT real-time and why

- **India vulnerability (Census 2011)**: India's census is decennial;
  2011 is the most recent completed one. There is no more current
  authoritative government dataset to switch to.
- **Health risk anchor (Ahmedabad HAP study)**: a fixed peer-reviewed
  finding, not a live feed — epidemiological relative-risk curves don't
  update in real time.
- **GIS boundaries**: administrative boundaries are static by nature.

## What IS real-time

- **Weather** (current + forecast) — live on every request via Open-Meteo.
- **World Bank vulnerability indicators** — fetched live, cached only
  because the underlying statistics are themselves annual.
- **Heatwave climatological baseline (world)** — computed live from
  Open-Meteo's historical archive on each request.
