# Phase A0 — Determinism & reproducibility: VERDICT = PASS

Date: 2026-06-22 · Auditor role: Quality & Verification (no-fix)
Entry gate: none (A0 is the root prerequisite). Exit gate: **MET**.

## What was tested (invariants, written before inspection)
1. Fixed (snapshot, clock) → byte-identical pipeline output across N=10 runs.
2. Non-determinism sources enumerated by file:line (RNG, clock, iteration order, cache leakage).
3. Virtual-clock feasibility for the B3 replay benchmark.

## How (foolproof / grounded)
- **Frozen input:** `public/newsdata/insight_2026-05-19.json` — sha256 `ade1430dd96bb5f1`,
  contentHash `40f989d5da9c`, 877 stories. Never `insight_latest.json`.
- **Harness:** `audit/evidence/a0_determinism.harness.test.ts` runs `runInsightPipeline`
  N=10 under the real clock and N=10 under a pinned `Date.now`, clearing the F5-7 module
  cache (`invalidateSlot`) before each run, projecting the exit-gate surface (parent IDs,
  scores, cluster membership, child trees) and sha256-ing each run. Re-runnable:
  `node_modules/.bin/vitest run --config audit/evidence/a0.vitest.config.ts`.

## Result (by execution)
| Variant | Runs | Unique hashes | Hash | Identical |
|---|---|---|---|---|
| Real clock | 10 | 1 | `37616c2e99ccca69` | ✅ (despite ~24 min wall-clock drift) |
| Frozen clock | 10 | 1 | `d803a31bed6982eb` | ✅ |

`real ≠ frozen` → output is genuinely **clock-coupled**. Raw per-run log:
`audit/evidence/A0-progress.log`; machine output: `audit/evidence/A0-run-projection.json`.

## Findings
- **No true non-determinism**: zero `Math.random`, deterministic TF-IDF embeddings,
  module cache fully clearable. (Catalogue: `audit/evidence/A0.2-NONDETERMINISM-CATALOGUE.md`.)
- **Wall-clock is the sole divergence vector**, via `temporalTier.ts:33` (anchor window),
  `cacheManager.ts` TTLs, and `normalize.ts` freshness. → **I004 (Low)**: clock injection
  is only partially wired, so cross-time replay needs a global shim today.
- **UNVERIFIED**: Node 20 (CI) vs Node 22 (this run) byte-identity — no Node 20 available.

## Honesty notes
- The pinned constant `1747645200000` is **2025-05-19T09:00Z**, not 2026 as the harness
  comment said (off-by-one-year). Does not affect the verdict (a fixed clock is a fixed
  clock; the load-bearing result is the 10/10 real-clock identity), but the frozen hash is
  "an arbitrary fixed clock", not "the snapshot's capture time".
- The real-clock runs being identical is partly *because* the snapshot is 30+ days stale:
  all stories fall below the temporal window so tiers collapse stably. On a fresh snapshot,
  minutes-apart runs could differ slightly — which is exactly why B3 needs the virtual clock.

## Gate handoff
A0 EXIT GATE MET. **A1, A2.x, A3, A4(remainder), A5 are now unblocked.** The frozen
snapshot + harness pattern established here is the substrate A2/A5 will reuse.
