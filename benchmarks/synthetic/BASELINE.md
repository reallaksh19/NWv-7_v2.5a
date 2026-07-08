# Insight SYNTHETIC-STRUCTURAL benchmark — baseline

Corpus `insight_synth_36h_v1` · seed `20260615` · templates `synth-tpl-v1` · baseline git `13a3943`
Generated/scored: 2026-06-23. **κ = 1.0 (construction-time ground truth — no judge, no human).**

## What this is (and is not)
An **innovative, self-labeling** benchmark: 57 dummy stories across 24 cycles / 36h are *generated
with their true cluster, angle, importance, and injection cycle baked in*, so ground truth is free
and the entire LLM-judge + human-calibration pipeline (plan §B2) is unnecessary. Deterministic
(`corpus = f(seed, template_version)`), frozen by content hash, regenerable on demand.

It measures **logical/structural conformance** — "does the pipeline obey its own rules" — across all
7 stages and all 16 challenge tags. It is a fast, free, deterministic **regression + edge-case
harness**, and a **complement to**, never a replacement for, the real-data benchmark (plan §B1),
which remains the source of truth for real-world editorial *accuracy*.

## Headline metrics (vs construction-time truth)
| Metric | Result | Alarm | Verdict |
|---|---|---|---|
| Clustering pairwise F1 | **0.952** (P 1.0 / R 0.909) | <0.70 | ✅ |
| OOV-stratum clustering F1 | **1.000** | reported | ✅ validates I010 (≈0 pre-fix) |
| Angle accuracy | **0.395** | <0.55 | 🚨 weakest stage (matches audit) |
| Angle `unknown` rate | 0.000 | >0.25 | ✅ |
| Ranking bucket conformance | **minor in top-3** | any minor in top-3 | 🚨 (matches I011 / rank-trap) |
| Time-to-surface (breaking) | **1 cycle** (seen c14 → top-N c15) | median >2 | ✅ |
| Incremental-vs-full divergence | **2 minor clusters dropped** (c16 `C_EVT_CIVIC`, c23 `C_EVT_VIRAL`) | any major ≥2 cyc | ⚠️ minor only |
| Dedup precision proxy | 0.80 | <0.90 | ⚠️ (metric approximate — see notes) |

## Per-stage / cross-reference to audit findings
- **Angle (0.395)** — top confusions: base_report→official_response (×5), fact_update→correction (×4),
  base_report→market_reaction (×3). Direct, reproducible evidence for the keyword-classifier weakness
  the audit flagged (A2.3 / RCA-R1) and the angle-aware weak-tree fix (**I008**).
- **OOV F1 = 1.0** — the synthetic OOV cluster (`C_EVT_TRICHY`) is held together → the **I010** OOV
  fallback embedding works; pre-fix this stratum would shatter (F5-1).
- **Ranking minor-in-top-3** — the wire-amplified minor story (`EVT_VIRAL`) reaches top-3 → reproduces
  the rank-trap behind **I011**; the wire penalty alone is insufficient.
- **Incremental divergence** — the warm/incremental path drops 2 minor clusters present in the cold
  full run → the **F5-2** mechanism, here bounded to minor events on this corpus.

## How to run / regression ratchet
```
npm run bench:synth     # generate → replay (virtual clock) → score → ratchet
```
- `generate_corpus.mjs` → frozen corpus + `ground_truth.json` (construction-time).
- `replay.harness.test.ts` → 24-cycle cold + warm replay under the injected clock (I004) → `runs/<sha>/replay.json`.
- `score.mjs` → `runs/<sha>/metrics.json` + `alarms.json` (B4 metrics).
- `ratchet.mjs` → fails CI if any metric regresses >5 pts below `BASELINE_METRICS.json`.

The ratchet **locks the current baseline** (e.g. angle 0.395) so the system can't silently get
*worse*; tightening toward the plan's alarm thresholds (angle ≥0.55 etc.) is the remediation goal,
tracked separately (I008/I010/I011).

## Notes / honest limits
- Dedup recall on the 2 hard-dup templates reads 0 via the current group-level proxy (the dup
  variant is clustered rather than appearing in `hiddenIds` at the sampled cycle) — a **metric
  refinement TODO**, not necessarily a pipeline defect; `precision_proxy` 0.80 indicates some
  over-hiding worth a look.
- 57 stories is sized to cover all 16 tags with construction-time truth, not for statistical power;
  scale templates for tighter error bars.
- Structural conformance only — see "What this is (and is not)".
