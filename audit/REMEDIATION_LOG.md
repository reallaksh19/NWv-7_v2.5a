# Insight Audit — Remediation Log

Date: 2026-06-22 · Branch: `claude/fervent-keller-wwf7pb`
Follows the audit in `audit/INSIGHT_AUDIT_REPORT.md`. Each fix was validated against the
green baseline (insight cert suite: 24 files / 83 tests) + `vite build` + static insight tests.

| ID | Sev | Status | Fix | Verification |
|----|-----|--------|-----|--------------|
| I001 | Critical | ✅ Fixed | `deploy.yml`: added `workflow_run` trigger on all data workflows' completion (+ success guard) so bot/`GITHUB_TOKEN` data commits actually publish to Pages | Workflow lint (YAML), trigger fires on `completed` |
| I002 | High | ✅ Fixed | `sectionsSnapshotFetcher.js`: on a stale snapshot, serve most-recent rows flagged `stale`/`staleFallback` (UI renders "data delayed" instead of blank) rather than empty; topStories keeps strict block | Adapter logic; bounded by `rankAndFilter` 60h gate (older stays empty, correct for news) |
| I007 | Medium | ✅ Fixed | `ranking.ts`: breakdown now exposes all 12 weighted factors (was 8) so it sums to the score; `InsightPage.jsx`: popup renders the weighted-contribution breakdown (reconciles to "Final score") instead of raw signal values | cert test updated to assert length 12 **and** `Σ weightedContribution ≈ score`; suite green |
| I008 | Medium | ✅ Fixed | `treeBuilder.ts` `isWeakTree`: a tree with <2 distinct angles is now flagged weak (was angle-blind), matching the Angle RCA intent | cert suite green (no ratchet regression) |
| I010 | Medium | ✅ Fixed | `embeddingsAdapter.js`: OOV stories (all-zero vocab projection) get a deterministic feature-hashed sparse vector in the same space — no longer embedding-invisible; in-vocab stories untouched; avoids the historical "all vectors identical" collapse (weights are real per-token TF) | cert suite green; OOV measured before/after on frozen snapshot (see below) |
| I004 | Low | ✅ Fixed (seam) | `temporalTier.ts` `computeEventAnchor`: clock is now an injectable `now` param (default `Date.now()`) — the single wall-clock dependency behind A0's real-vs-frozen divergence is now replay-injectable | cert suite green; full pipeline threading is a follow-up for B3 |
| I005 | Info | ✅ Fixed | `INSIGHT_AUDIT_PLAN.md`: reconciled stale quoted constants (0.96/0.985/0.88; CACHE_TTL note) | doc |
| I006 | Low | ✅ Fixed | Regenerated `reports/destination_contract_baseline.{md,json}` via `audit_destination_contracts.py` (warnings 3→0; stale 24h/36h gap gone) | regenerator reports 0 warnings |
| I003 | Low | ◻ Mitigated (external) | GitHub throttles *scheduled* workflows — not code-fixable. I001's `workflow_run` deploy now publishes on every completed run regardless of commit, so sparse runs still refresh the site | n/a |
| I009 | Low | ◻ Accepted | Displayed hidden-duplicate aggregate is already correct (via `debug.hiddenCount`, per A5); per-parent provenance for pre-cluster hard-dups would need a dedup refactor for no user-visible gain. Provenance remains in `result.hiddenIds` | n/a |
| I011 | High | ◻ Deferred (design) | Breaking-news fast-path (F5-2) is a ranking-policy change needing a 2-snapshot latency harness to tune safely; out of scope for this no-regression remediation pass. Recommend as a dedicated follow-up | n/a |

Legend: ✅ code/doc fixed · ◻ mitigated/accepted/deferred with rationale.

## Measured before/after (frozen snapshot insight_2026-05-19.json, `a2_analyze.mjs`)
| Metric | Before | After | Fix |
|---|---|---|---|
| Zero-vector (embedding-blind) stories | 134 / 877 (15.3%) | **0** | I010 |
| avg visible angles / parent | 1.90 | **2.00** | I010 side-effect (OOV stories now cluster) |
| multi-angle parents | 9 / 10 | **10 / 10** | I010 side-effect |
| weak parents (now angle-aware) | 8 / 10 | **9 / 10** | I008 (single-angle tree now flagged) |
| ranking breakdown reconciles to score | no (Σ off by ≤5.98) | **yes (Σ ≈ score, asserted)** | I007 |

Artifacts: `audit/evidence/A2-analysis-output.before.txt` vs `A2-analysis-output.txt`.

## Notes
- No fix lowered any quality ratchet; the full insight cert suite stayed at 83/83.
- I011 (breaking-news surfacing) is intentionally NOT hacked in here — changing persistence/
  momentum weighting or weak-tree demotion without the latency harness risks regressing the
  exact metrics the rest of the suite protects. It is the one finding that warrants its own
  reviewed change with before/after measurement.
