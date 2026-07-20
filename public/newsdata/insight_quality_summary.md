# Insight Prefetch Quality Report

- Status: **WARN**
- Schema: `3`
- Collector: `insight-collector-json-v4`
- Content hash: `1564f19b4a9fe9f8`
- Stories: `405`
- Usable 36h stories: `386`
- Source groups: `9`
- Angle hint coverage: `100%`
- Non-base angle stories: `275`
- Event sketches: `5`
- Multi-source sketches: `1`

## Slot health

| Slot | Story IDs | Linked | Sources | Thin |
|---|---:|---:|---:|---|
| now | 40 | 40 | 2 | True |
| minus4h | 40 | 40 | 2 | True |
| minus12h | 60 | 60 | 3 | False |
| minus24h | 36 | 36 | 2 | True |

## Warnings

- Weak multi-source event sketch coverage: 1 sketches < recommended 2
- feed 'ndtv' has returned zero items for 67 consecutive runs
- feed 'financial_express' has returned zero items for 419 consecutive runs
- feed 'muscat_daily' has returned zero items for 399 consecutive runs (last zero at 1784523582542)

## Top angles

- base_report: 130
- official_response: 98
- fact_update: 52
- market_reaction: 45
- reaction_public: 27
- regional_followup: 19
- investigative_detail: 18
- expert_analysis: 7
- correction: 5
- background_context: 4
