# Ground-truth coverage report — corpus `insight_4slot_2026-05-19`

Status: **BOOTSTRAP / calibration-seed** (per plan §B2; NOT a frozen final benchmark).
Generated alongside `records.yaml`, `manifest.json`, judge prompt `gtp-v1.0`.
Validator: `node benchmarks/ground_truth/validate_ground_truth.mjs` → PASSED (21/21 content
hashes verified against the frozen corpus).

## Entry-gate status (plan §B0–§B1, procedure step 1)
| Gate | Required | Actual | Verdict |
|---|---|---|---|
| A0 determinism + injected clock (B0) | done | A0 PASS; `computeEventAnchor` clock injectable (I004) | ✅ |
| B1 frozen 36h / ≥20-of-24-cycle corpus + manifest | yes | only a 4-slot daily-rollup snapshot exists | ❌ **not met** |
| Versioned judge prompt | yes | `gtp-v1.0` authored | ✅ |
| Human calibration κ (B2.4) | yes, before scaling | no human available in this environment | ❌ **PENDING** |

Because B1 + calibration are unmet, this is a **seed**, not the corpus the metrics may run
against. Labeling was done only against the **frozen** archive `insight_2026-05-19.json`
(immutable, sha256:ade1430dd96bb5f1) — so it does not violate the "no moving corpus" rule — but
all temporal strata are out of reach here.

## Record counts (14 seed records)
- PAIR same-event/related/unrelated: 7 (GT-PAIR-0002/0003/0004/0005/0006/0007/0012)
- GROUP cluster-membership: 1 real (GT-GROUP-0001) + 1 synthetic (GT-GROUP-0013)
- ANGLE: 3 (GT-ANGLE-0008/0009/0010)
- RANK importance: 1 real (GT-RANK-0011) + 1 synthetic (GT-RANK-0014)

## Challenge-taxonomy coverage (12 / 16)
| Tag | Records | Status |
|---|---|---|
| dedup_layer3_event | 0001,0002,0003,0004,0005,0007 | ✅ |
| dedup_layer2_hash | 0006 | ⚠️ thin (<10) |
| wire_syndication | 0006,0011 | ⚠️ thin |
| angle_confusable | 0008,0009,0010 | ⚠️ thin (need ≥30) |
| angle_unknown_floor | 0010 | ⚠️ thin |
| location_oov | 0006,0007 | ⚠️ thin (need ≥30) |
| rank_minor_trap | 0011 | ⚠️ thin |
| control | 0012 | ⚠️ thin |
| date_tz_mixed | 0003 | ⚠️ thin |
| breaking_new_event | 0013 (synthetic) | 🔶 synthetic only |
| breaking_vs_important | 0014 (synthetic) | 🔶 synthetic only |
| persistence_multi_cycle | 0013,0014 (synthetic) | 🔶 synthetic only |
| dedup_layer1_url | — | ❌ gap |
| date_format_zoo | — | ❌ gap |
| date_headline_vs_meta | — | ❌ gap |
| location_homonym | — | ❌ gap |

Per-tag volume targets (≥10, ≥30 for `location_oov`/`angle_confusable`) are **NOT yet met** — this
is a seed sized to prove the schema + reasoning standard, not the full corpus.

## Reliability
Cohen's κ per task: **NOT COMPUTED** (no human calibration sample). Every record carries
`human.adjudicated: false` / `PENDING-calibration`. **These labels must not feed a published
metric until κ ≥ 0.6 per task is established** (plan §B2.4 cheap-failure gate).

## To reach Definition of Done
1. Run B1: capture the frozen 36h / 24-cycle corpus → unlocks date_*, location_homonym, and all
   temporal strata (breaking_new_event, persistence_multi_cycle) with real stories.
2. Batch the `gtp-v1.0` judge over the stratified sample → fill each tag to its volume target.
3. Human calibration on ~100 stratified items → κ per task; redesign any task with κ<0.6.
4. Adjudicate abstentions + 5% audit; freeze labels next to the corpus manifest.
