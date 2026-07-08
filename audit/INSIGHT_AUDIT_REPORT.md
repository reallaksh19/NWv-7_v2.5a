# Insight Tab — Comprehensive Audit Report

Date: 2026-06-22 · Auditor role: Senior Quality & Verification Engineer (no-fix audit)
Plan: `audit/INSIGHT_AUDIT_PLAN.md` (A0–A6) · Matrix: `audit/ISSUE_MATRIX.md` · Evidence: `audit/evidence/`
Frozen inputs (never `*_latest`):
- Pipeline: `public/newsdata/insight_2026-05-19.json` (sha256 `ade1430dd96bb5f1`, contentHash `40f989d5da9c`, 877 stories)
- Deployed artifact: live Pages `sections_latest.json` captured 2026-06-12 (contentHash `92bee8cd0344`)
Environment: Node v22.22.2 (CI uses Node 20 — cross-version identity UNVERIFIED).

## 1. Executive summary
The Insight **engine is sound** where it counts — determinism, ranking math, clustering
stability, angle reachability and contract/config truthfulness all PASS by execution. The
material risks are **operational and diagnostic**, not algorithmic:

1. **The deployed site is frozen** (Critical, I001). Hourly prefetch commits never trigger
   `deploy.yml` because they are pushed by `github-actions[bot]`/`GITHUB_TOKEN`. The live
   site has served 2026-06-12 data for 10+ days, which is the actual cause of the reported
   **empty Main tab in Hybrid mode** (High, I002). App-wide, not Insight-only.
2. **Explainability is partly untruthful** (Medium, I007): the Ranked popup shows raw factor
   values that don't add up to the displayed score, while a correct weighted breakdown exists
   unused.
3. **Breaking news may not surface** (High, I011, F5-2): persistence/momentum weighting plus
   weak-tree demotion can push genuinely new events out of the top-10.
4. **15% of stories are embedding-blind** (Medium, I010, F5-1): OOV vs the 200-term vocab →
   zero vectors → weak hyperlocal clustering.

## 2. Phase verdicts
| Phase | Verdict | Evidence |
|---|---|---|
| A0 Determinism | **PASS** | N=10 byte-identical (real `37616c2e99ccca69`, frozen `d803a31bed6982eb`). `A0.1-DET-01`, `A0.2-…CATALOGUE` |
| A1 Contracts/config | **PASS** | code matches tuning docs; only stale-doc drift. `A1.1-CONTRACT-01` |
| A2 Stage audit (7) | **PASS-with-findings** | math exact; F5-5 fixed; I007/I008/I010 raised. `A2.x-STAGE-01`, `A2-dump.json` |
| A3 Findings closure | **PASS** | all F5-x/RCA terminal. `A3.1-CLOSURE-01` |
| A4 Workflow/deploy | **FAIL (root-caused), partial** | I001/I002. `A4.1-DEPLOY-01`, `A4.2-SECTIONS-02` |
| A5 Diagnostics | **FAIL (1 metric) + 1 UNVERIFIED** | I007 at UI; hidden-count unverified. `A5.1-DIAG-01` |
| A6 Consolidation | this report | — |

## 3. Stage-by-stage (A2) one-liners
- **A2.1 normalize** PASS — 877 = 795 clustered + 82 hidden + 0 excluded; no silent drops.
- **A2.2 dedup** PASS — F5-5 cosine zero-guard verified; 134/877 OOV zero-vectors (I010).
- **A2.3 angle** PASS — 11/12 angles fire, `unknown`=0; avg 1.90, multi 9; skew base+official=67%.
- **A2.4 cluster** PASS — reversed input → 14/14 co-membership preserved (order-stable 1.000).
- **A2.5 ranking** MIXED — `final=Σ(component×weight)` exact (Δ0.000); `scoreBreakdown` not a decomposition (I007).
- **A2.6 tree** MIXED — caps OK; `isWeakTree` angle-blind (I008); `hiddenDuplicateIds` empty (I009).
- **A2.7 quality** PASS — ratchet met (1.90/9) while 8/10 top parents are "weak" (tension).

## 4. Findings, severity, and how a regression would be caught
| ID | Sev | Finding | Caught by |
|---|---|---|---|
| I001 | Critical | Deploy never triggered by bot prefetch commits → live site frozen | **Dedicated**: post-deploy live-freshness probe (B4 can't see deployed artifact) |
| I002 | High | Main/Sections Hybrid empties silently on stale snapshot (no live fallback) | **Dedicated**: same probe + static-host stale-render test |
| I011 | High | Breaking/new events demoted out of top-10 (F5-2) | **Dedicated**: 2-snapshot surfacing-latency cert |
| I007 | Medium | Score-breakdown popup shows raw values, not contributions | **Dedicated**: recompute displayed == contributionBreakdown |
| I008 | Medium | `isWeakTree` ignores angle diversity | **B4**: angle-coverage/diversity metric |
| I010 | Medium | 15.3% OOV → embedding-blind (F5-1) | **B4**: OOV-rate metric |
| I003 | Low | Scheduled prefetch cadence shortfall (OBSERVATION) | **Dedicated**: 14-day reliability table |
| I006 | Low | `destination_contract_baseline.md` stale | **Dedicated**: baseline-staleness CI check |
| I009 | Low | `hiddenDuplicateIds` empty on parents | **Dedicated**: provenance/recovery test |
| I004 | Low | Virtual-clock injection not fully plumbed | **Dedicated**: B3 replay precondition |
| I005 | Info | Audit plan quotes stale constants | doc reconciliation |
| F5-5 | Resolved | Zero-vector cosine guard | already covered |

## 5. Remediation order (by user impact)
1. **I001 + I002** — restore live publishing (PAT push / `workflow_run` / `repository_dispatch`) and add a post-deploy freshness probe. Unblocks the entire deployed app. *(Also fixes the reported Main-Hybrid symptom.)*
2. **I011 (F5-2)** — breaking-news fast-path or freshness floor so new events can enter the top-10; add the surfacing-latency cert.
3. **I007** — point the popup at `debug.rankingFormulaDiagnostics.contributionBreakdown` (already computed) instead of raw `scoreBreakdown`.
4. **I010 (F5-1)** — expand vocab / add fallback embedding; track OOV rate.
5. **I008** — add an angle-diversity term to `isWeakTree`.
6. **I003/I004/I006/I009/I005** — reliability table, clock plumbing, baseline regen, provenance, doc reconciliation.

## 6. What remains open (honest scope)
- **A4 remainder**: 14-day per-feed reliability table, smart-TTL merge correctness, 36h pruning off-by-one, validator strictness.
- **A5**: hidden-duplicate aggregate count (needs `debug.hiddenCount` re-dump).
- **F5-2 latency** and **per-locale OOV (F5-1)**: quantified mechanisms; exact measurements deferred to dedicated harnesses.
- **Node 20 cross-version** byte-identity (A0): UNVERIFIED — no Node 20 in the audit container.

## 7. Reproducibility
Every verdict is replayable from `audit/evidence/`:
- A0: `vitest run --config audit/evidence/a0.vitest.config.ts`
- A2 dump: `vitest run --config audit/evidence/a2.vitest.config.ts` → `node audit/evidence/a2_analyze.mjs`
- A4: `node audit/evidence/A4.2-SECTIONS-02_repro_real.mjs` (against captured deployed bytes)
