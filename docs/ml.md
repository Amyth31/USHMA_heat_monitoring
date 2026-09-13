# Health Risk Model

## Why this isn't a trained ML model

The brief asks for an ML-based mortality/hospitalization predictor.
India does not have a public, granular (district/day-level) heat-mortality
dataset available to train one — and no real dataset exists for most
other countries either. Two options existed:

1. Fabricate synthetic training labels and train a model on them, then
   present its output as a "prediction."
2. Build a transparent, documented relative-risk estimate anchored to
   real published epidemiological findings instead.

Option 1 would produce a model whose apparent precision (an ROC-AUC, an
F1 score) is meaningless, since the labels it learned from are made up.
That fails the brief's own scientific-credibility requirement more badly
than not having an ML model at all. Option 2 is what's implemented.

## The real anchor

Source: Azhar et al., **"Heat-Related Mortality in India: Excess All-Cause
Mortality Associated with the 2010 Ahmedabad Heat Wave"** and the
follow-up **Heat Action Plan evaluation** (PMC6236972), which used a
distributed-lag nonlinear model on real Ahmedabad mortality registry data:

| Scenario | Temperature | Relative risk of death |
|---|---|---|
| Pre-Heat-Action-Plan | 47°C | RR = 2.34 (95% CI 1.98–2.76) |
| Post-Heat-Action-Plan | 47°C | RR = 1.25 |
| Threshold effect | above ~40°C | mortality risk begins rising materially |

`backend/ml/health_risk_engine.py` fits an exponential curve through
`RR(40°C) = 1.0` and `RR(47°C) = 2.34` (or 1.25, depending on whether
`has_heat_action_plan` is set), then scales the result by:

- **Heatwave duration** — de Bont et al.'s multi-city Indian mortality
  study documents materially higher risk for sustained multi-day
  heatwaves; modelled here as +4%/day beyond day 1, capped at +25%
  (a documented prototype assumption, not from the cited study directly).
- **Population vulnerability** — the real Census/World Bank-derived
  score from the vulnerability engines; 100 doubles relative risk, 0
  leaves it unchanged (linear, documented assumption).

Hospitalization risk is derived from the same curve, scaled up
(`1 + (mortality_rr - 1) * 1.6`), reflecting the documented pattern that
heat-illness hospitalizations are more frequent than heat deaths.

## What the API actually returns

A **relative risk multiplier** and category (LOW/MODERATE/HIGH/SEVERE),
not an absolute death count — an absolute count would need real local
baseline mortality rates this prototype doesn't have. The methodology
note is included in every response and explicitly states: *"AI-ASSISTED
RELATIVE RISK ESTIMATE anchored to peer-reviewed Indian heat-mortality
research, not a clinically validated predictive model."* For non-Indian
locations, an additional note clarifies the curve is calibrated on
Indian data and applied as a general approximation.

## If a real ML model becomes viable

Should a suitable public dataset become available (e.g. a national
heat-mortality surveillance dataset), the natural next step is:
`feature engineering (thermal indices + vulnerability + heatwave
duration) → train XGBoost/Random Forest → SHAP explainability → replace
health_risk_engine.py's curve-fit with the trained model's `.predict()``.
The API contract (`mortality_relative_risk`, `mortality_risk_category`,
`explanation`) is already shaped to support that swap without touching
the frontend.
