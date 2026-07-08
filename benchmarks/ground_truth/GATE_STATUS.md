# Insight benchmark — entry-gate status (Prompt_12 / plan §B0–B2 step 1)

Date: 2026-06-23. Procedure step 1 of `agent_prompts/Prompt_12_Insight_Benchmark.md` requires
verifying the entry gates and **stopping + reporting if absent** rather than labeling against a
moving/absent corpus. This is that report.

## Verdict: ground-truth labeling is **gated** — a calibration seed was produced, not the full corpus.

| Prerequisite | State | Evidence |
|---|---|---|
| B0: A0 determinism | ✅ done | `audit/evidence/A0.1-DET-01.yaml` (N=10 identical) |
| B0: virtual clock | ✅ seam added | `computeEventAnchor(parent, hours, now)` (I004) |
| B1: frozen 36h / 24-cycle corpus + manifest | ❌ **absent** | no `benchmarks/corpora/insight_36h_*`; only daily-rollup snapshots exist |
| B2.3: versioned judge prompt | ✅ | `JUDGE_PROMPT_gtp-v1.0.md` |
| B2.4: human calibration κ | ❌ **cannot perform** | no human labeler in this environment |

## Why I did not mass-label
- The prescribed B1 corpus (36h, ≥20 of 24 hourly cycles) does not exist; capturing it needs 36h
  of unattended prefetch retention (config, then wall-clock) — see plan §B1.
- B2.4 calibration is a **human** touchpoint by design; without it, κ is unknown and labels are
  untrusted. Plan §B2.4 makes κ<0.6 a stop condition *before* scaling.
- Mass-producing labels now would violate the prompt's accountability mandate.

## What was produced instead (gate-respecting)
A frozen, content-hashed **bootstrap corpus** + **14 seed ground-truth records** against the
immutable `insight_2026-05-19` archive (not the moving `*_latest`), to:
- prove the record schema, reasoning standard, and hash-integrity validator work end-to-end
  (validator PASSED, 21/21 hashes verified),
- seed the future human calibration sample,
- demonstrate every coverable stratum with real stories, and tag temporal strata as
  `synthetic_probe` placeholders.

Plus benchmark infrastructure: `manifest.json`, `JUDGE_PROMPT_gtp-v1.0.md`,
`validate_ground_truth.mjs`, `COVERAGE_REPORT.md`.

## To unblock (owner action)
1. Capture the B1 36h corpus (set prefetch to retain per-cycle snapshots for 36h; freeze + manifest).
2. Provide a human to label the ~100-item calibration sample (κ per task).
Then the `gtp-v1.0` judge can scale labeling over the real corpus and the B4 metrics become valid.
