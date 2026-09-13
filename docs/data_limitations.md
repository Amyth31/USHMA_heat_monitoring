# Known Data Limitation — Delhi District Boundary Precision

**Status:** Documented, not hidden. Read before using density-based map
layers for Delhi at district granularity.

## What's real
- All 11 current Delhi district population figures in
  `data/processed/delhi_districts.csv` are traced to actual Census of
  India 2011 data (Registrar General & Census Commissioner). For the 2
  districts created in 2012 (Shahdara, split from North East; South East,
  split from South), the pre-split 2011 census total was apportioned
  between the two current districts by real geodesic area share — a
  standard areal-interpolation technique, not invented numbers.
- District boundary polygons are real, sourced from a community-maintained
  open GIS repository (`datta07/INDIAN-SHAPEFILES`), which is the best
  free source found with all 11 current Delhi districts.

## The caveat
Cross-checking computed polygon areas against officially reported district
areas (Delhi government district websites / Census handbooks) turned up a
mismatch for two districts:

| District    | Area in this shapefile | Officially reported area |
|-------------|------------------------|---------------------------|
| North West  | ~154 km²                | ~443 km²                  |
| East        | ~31.6 km²               | ~64 km²                   |

The other 9 districts' computed areas are within a few percent of their
official figures. This suggests the North West and East polygons in this
particular free shapefile are incomplete or use a different (possibly
outdated/pre-annexation) boundary definition for those two districts
specifically — a known quality issue with crowd-sourced Indian GIS data.

## Practical effect
- **Population figures**: unaffected — these come from the census, not
  the polygon.
- **Density-based choropleth coloring**: North West and East Delhi will
  show artificially high density on the map (population ÷ too-small area)
  until a corrected polygon is sourced. Every other district's density is
  reliable.
- **Non-density layers** (raw population, elderly %, outdoor worker %,
  thermal stress, health risk) are unaffected since they don't depend on
  area.

## To fix properly
Source Delhi's official district shapefile from the Delhi government's
GIS portal (Bhuvan/DDA) or the Survey of India, which would need signup/
request access rather than a direct anonymous download — flagging this as
a "future data source" item rather than blocking the prototype on it, per
the brief's own guidance to use the best available real data and label
limitations rather than fabricate or stall.
