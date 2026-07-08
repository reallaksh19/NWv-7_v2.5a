# Insight Tab — Comprehensive Audit Plan (Phase-wise)

Status: PLANNED (no execution yet)
Scope owner: Insight pipeline (`src/insight/src/`), its adapters, data layer, and UI diagnostics
Companion doc: `benchmarks/INSIGHT_BENCHMARK_PLAN.md` (validation benchmark; depends on Phase A0 of this plan)
Date: 2026-06-12

---

## 1. Purpose

Replace snippet-level review (walkthroughs, critic ratings, synthetic scenario checks) with a
**comprehensive, evidence-based audit**: every pipeline stage verified against its contract with
real snapshot data flowing through it, every known finding (F5-1…F5-7, Angle RCA residuals)
driven to *verified-fixed* or *formally risk-accepted*, and every UI diagnostic checked for
truthfulness against the underlying computation.

What "comprehensive" means here:

1. **Stage coverage** — all 7 pipeline stages + adapters + cache + config + CI, not a sampled subset.
2. **Real inputs** — audits run against live/archived snapshots (`public/newsdata/insight_*.json`),
   not only hand-made fixtures.
3. **Contract-first** — each stage is judged against its *stated* invariants (types, thresholds,
   documented weights), so "works on my data" is not an exit criterion.
4. **Closure** — output is an updated `audit/ISSUE_MATRIX.md` with detection method and exit gate
   per issue, in the existing matrix format (IDs `I0xx` for Insight).

Out of scope: non-Insight tabs (market, weather, planner), visual styling, performance tuning
beyond correctness-relevant pathologies.

---

## 2. Audit principles

- **Evidence or it didn't happen.** Every finding cites file:line plus a reproducing input
  (snapshot slice or story IDs).
- **Determinism before everything.** If the pipeline is not reproducible for a fixed input,
  no other audit result is trustworthy (and the benchmark replay is impossible). Hence Phase A0.
- **Severity = user impact**, not code smell. A mutation bug that never corrupts rendered output
  is Low; a silent drop of breaking-news clusters (F5-2) is High.
- **No fixes during audit phases.** Fixing while auditing destroys the baseline. Findings are
  logged; remediation is a separate workstream gated on the consolidated matrix (Phase A6).
  Exception: a defect that *blocks the audit itself* (e.g., non-determinism) may be fixed
  immediately and documented.

---

## 3. Phase map and dependencies

```
A0 Determinism & harness readiness        (prerequisite for everything, incl. benchmark)
 ├── A1 Contract & config audit
 ├── A2 Stage-by-stage algorithmic audit  (largest phase; 7 sub-tracks)
 ├── A3 Known-findings closure            (F5-1..F5-7, Angle RCA residuals)
 ├── A4 Data-layer & automation audit
 └── A5 Diagnostics truthfulness audit    (needs A2 outputs to compare against)
      └── A6 Consolidation & issue matrix (exit of the audit)
```

A1–A4 can run in parallel after A0. A5 consumes A2 evidence. A6 closes.

---

## Phase A0 — Determinism & reproducibility (prerequisite)

**Objective:** prove that a fixed snapshot input produces byte-identical pipeline output
(cluster membership, parent IDs, scores, child trees) across repeated runs and across
Node versions used in CI.

**Why first:** (a) all later audit evidence assumes reruns reproduce findings;
(b) the 36-hour benchmark replay (`benchmarks/INSIGHT_BENCHMARK_PLAN.md`, Phase B3)
is meaningless without it.

**Inputs:** one frozen archive snapshot (e.g., `public/newsdata/insight_2026-05-19.json`).

**Activities:**
- Run the headless pipeline (pattern already proven by `scripts/test_insight_*.mjs`) N=10 times
  on the same input; diff full serialized output.
- Identify non-deterministic sources: `Date.now()` freshness decay, `Math.random()`,
  unordered Map/Set iteration, locale-dependent sorting, in-process cache (F5-7) leakage
  between runs.
- Verify a "clock injection" point exists or is needed (freshness/persistence scores depend on
  wall-clock; replay requires a virtual clock).

**Evidence required:** diff report; list of non-determinism sources with file:line.

**Exit gate:** pipeline output is reproducible given (snapshot, injected clock), or every
divergence source is catalogued with a remediation ticket. Virtual-clock feasibility confirmed
(needed by benchmark Phase B3).

**Effort:** ~0.5 day.

---

## Phase A1 — Contract & config audit

**Objective:** verify that what the pipeline *emits* matches what the contracts *say*.

**Targets:**
- `reports/destination_contract_baseline.md` / `.json` vs. actual emitted parent/child schema.
- `src/insight/src/types/index.ts` (~400 lines) vs. runtime objects (fields present, enums valid,
  no undocumented fields the UI secretly depends on).
- `config/insight_sources.json` coverage rules (min 3 feeds/slot, min 6 Tier-A, min 8 source
  groups, min 5 topics) vs. what `scripts/insight_source_policy.py` actually enforces.
- `config/insight_policy.json` snapshot-age TTLs (fresh 8h / stale 48h / heartbeat 3h) vs.
  `DEFAULT_CONFIG.CACHE_TTL` per-slot values (now 0 / −4h 1h / −12h 1.5h / −24h 2h / −36h 2.5h /
  −48h 3h) — these are distinct concerns (snapshot age vs slot cache), not duplicated values.
  [Reconciled per audit finding I005 — earlier draft quoted now 1h / −4h 2h / −12h 3h / −24h 4h.]
- Documented ranking weights (12 factors, README/critic doc) vs. constants in `ranking.ts` —
  confirm weights match documentation and note whether they are intended to sum to a target.

**Method:** schema validation of real snapshot outputs; side-by-side constant comparison;
grep for fields consumed by `InsightPage.jsx` / `useInsightTabViewModel.js` not present in types.

**Evidence required:** field-by-field conformance table; list of drift items.

**Exit gate:** zero unexplained schema drift; every config value has exactly one source of truth
or the duplication is ticketed.

**Effort:** ~1 day.

---

## Phase A2 — Stage-by-stage algorithmic audit

The core phase. Each sub-track audits one stage against its invariants using real snapshot data.
For each: read the implementation fully (not sampled), enumerate invariants, run real data
through the stage in isolation, and verify invariants hold on the *actual* distribution.

### A2.1 Normalize & intake (`pipeline/normalize.ts`, `adapters/insightSnapshotIntake.js`)
- Invariants: every story gets tier, freshness, topic; no story silently dropped; timestamps
  parsed correctly across feed formats (RSS date zoo, IST vs UTC).
- Known risk: timezone bugs here corrupt *every* downstream freshness/persistence score.
- Exit: drop/parse-failure rate measured on a full real snapshot; 0 silent drops.

### A2.2 Dedup — 3 layers (`dedup/dedup.ts`, ~983 lines)
- Invariants: layer ordering (URL → hash → embedding) short-circuits correctly; thresholds
  `HARD_DUP_TITLE_SIM=0.96`, `HARD_DUP_EMBED_SIM=0.985` applied as documented (values per
  DEFAULT_CONFIG + action_3_deep.md; reconciled per I005 — earlier draft quoted 0.92 / 0.85);
  hidden duplicates retain provenance (needed by usefulVariantRescue).
- Specific checks: zero-vector cosine guard (F5-5); behavior when *both* stories are OOV for the
  200-term vocabulary (hyperlocal pairs — the F5-1 interaction); SHA-256 normalization rules
  (case, whitespace, punctuation) and their false-merge potential for short titles.
- Exit: layer-by-layer pass/fail counts on a real snapshot; F5-5 explicitly verified.

### A2.3 Angle classification (`dedup/dedup.ts: classifyAngle`)
- Invariants: threshold 0.9 (post-RCA) actually in effect; each of the 12 angle signal sets
  reachable (no dead angle that can never fire); `unknown` rate measured.
- Known risk: keyword-driven classifier; expected weakest stage. Distribution of assigned angles
  on real data vs. RCA expectations (avg ≥1.8 visible angles).
- Exit: per-angle firing counts on real corpus; list of unreachable/starved angles.

### A2.4 Clustering (`cluster/cluster.ts`, ~325 lines)
- Invariants: greedy single-pass with running centroid (FIX M-1) — verify centroid update is an
  incremental mean, not seed-anchored; `SAME_EVENT_THRESHOLD=0.88` applied symmetrically
  (reconciled per I005 — earlier draft quoted 0.75; 0.75 is POSSIBLE_EVENT_THRESHOLD);
  order-sensitivity quantified (greedy clustering depends on seed-sort; check how much cluster
  membership changes if input order is perturbed — this bounds achievable benchmark stability).
- Exit: order-sensitivity measurement; centroid math verified; cluster size distribution on
  real data documented.

### A2.5 Ranking (`ranking/ranking.ts`, ~416 lines)
- Invariants: all 12 component scores in [0,1] before weighting; weights match documentation;
  `scoreBreakdown` sums (within epsilon) to `finalParentScore`; wire penalty applied only to
  syndicated sources; persistence/momentum read the slot data they claim to read.
- Specific check: region boost — which region tags actually trigger it on real data (interaction
  with F5-1 vocab gap: can a Trichy story ever earn the boost?).
- Exit: per-component range/weight verification on real corpus; breakdown-sum property holds
  for 100% of parents.

### A2.6 Tree building & recovery (`tree/treeBuilder.ts` ~842 lines + 4 recovery modules)
- The densest logic; audit in full. Invariants: max 7 children, max 3/angle, min 2 source groups;
  `MIN_CHILD_INFO_GAIN=0.10` gate; info-gain formula caps (0.5/0.3/0.3 minus 0.10 repeat penalty)
  implemented as documented; weak-tree flag fires iff (<3 children or <2 angles).
- Recovery audit: the 4 strategies (angleDiverse, sourceDiverse, angleDiversityRecovery,
  usefulVariantRescue) — trigger conditions, ordering, and whether any pair can oscillate or
  undo each other's work.
- Mutation audit (F5-3): map every mutation of shared story/parent objects; classify each as
  benign or rendering-risk.
- Exit: invariant pass/fail table on real corpus; recovery trigger matrix; F5-3 mutation map.

### A2.7 Quality gates & repair (`diagnostics/insightRuntimeQualityGate.ts`,
`quality/insightRealSnapshotQualityRatchet.ts`, `diagnostics/insightResultRepair.ts`)
- Invariants: grade boundaries (F/D/C/B) match documentation; ratchet thresholds
  (avgAngles ≥1.8, multiAngle ≥8, hiddenDup ≤40) match the cert tests; recovery never *lowers*
  a metric it reports as improved; repair fills missing fields without fabricating data the UI
  then presents as real.
- Exit: gate boundary table verified; before/after recovery diagnostics spot-audited against
  recomputed metrics.

**Phase A2 effort:** ~4–5 days total (A2.6 is the largest single item).

---

## Phase A3 — Known-findings closure

**Objective:** move every previously identified finding from "noted" to a terminal state:
*verified fixed*, *confirmed open (ticketed with severity)*, or *risk-accepted (documented why)*.

| Finding | Source | Claim to verify | Closure test |
|---|---|---|---|
| F5-1 | walkthrough_05 | 200-term vocab misses hyperlocal (Trichy etc.) → weak local clustering | Measure OOV rate per locale on real travel-local snapshots; quantify clustering degradation for high-OOV stories |
| F5-2 | walkthrough_05 | Incremental updates silently drop new-event clusters | Construct real-data incremental run with a genuinely new event; observe surfacing latency. **Candidate High severity** (breaking-news product) |
| F5-3 | walkthrough_05 | Shared object mutation in tree building | Covered by A2.6 mutation map |
| F5-4 | walkthrough_05 | Full tree build before top-N slicing (over-computation) | Confirm; classify Low unless latency-relevant |
| F5-5 | walkthrough_05 | Zero-vector cosine 0/0 risk | Covered by A2.2 |
| F5-6 | walkthrough_05 | Three similarity engines coexist | Architectural: document divergence between engines on identical pairs |
| F5-7 | walkthrough_05 | In-process Map cache layer | Covered by A0 (determinism) + A4 (cache audit) |
| RCA-R1 | INSIGHT_ANGLE_RCA | Angle threshold 0.9 & info-gain 0.10 still appropriate post-fix | Distribution check in A2.3; flag if `unknown` or single-angle dominance persists |

**Exit gate:** every row terminal-stated in `audit/ISSUE_MATRIX.md`.

**Effort:** ~1.5 days (mostly F5-1/F5-2 measurement).

---

## Phase A4 — Data-layer & automation audit

**Objective:** verify the data the pipeline consumes is what the fetch layer claims to produce.

**Targets & checks:**
- `scripts/fetch_insight_stories.py` (~270 lines): smart-TTL merge correctness (a story present
  in cache and feed must not duplicate or lose the fresher copy); retry behavior; 36-hour
  pruning boundary (off-by-one at exactly 36h); per-slot story counts vs. coverage requirements.
- `cacheManager.ts`: slot staleness logic; FIX M-5 confirmed (topParents not cached); browser
  TTL (3–6h) vs. prefetch cadence coherence.
- GitHub Actions `news_prefetch.yml`: confirm the ~16 runs/day actually land (commit history
  audit over the last 14 days — gaps, failures, skipped runs); archive rotation keeps exactly 7 days.
- Feed health: per-feed success rate and story yield over the same 14 days; identify feeds that
  are configured but effectively dead (silently shrinking the corpus and biasing source diversity).
- `scripts/validate_insight_prefetch_output.py`: do its gates actually reject malformed output,
  or only warn?

**Evidence:** 14-day fetch reliability table; merge-correctness verification on real consecutive
snapshots; pruning boundary check.

**Exit gate:** fetch reliability quantified; any silent-degradation path (dead feed, failed run,
weak validation) ticketed.

**Effort:** ~1.5 days.

---

## Phase A5 — Diagnostics truthfulness audit

**Objective:** the Insight UI's selling point is explainability (score breakdowns, "why thin",
behavior evidence, source audit panel). A diagnostic that misreports is worse than none.
Verify each displayed diagnostic equals the recomputed truth.

**Targets:** `InsightPage.jsx` popups (Ranked / Rising / Stories / Angles / Source),
`InsightQualityDashboard.jsx`, `insightBehaviorEvidence.ts`, `insightCoreQuality.ts`,
`src/services/pageAuditGrading.js`.

**Method:** for a frozen snapshot run (from A0), independently recompute each displayed number
(signal score, grade, angle counts, duplicate counts, score breakdown components, replacement
history) from raw pipeline output and diff against what the UI layer derives.

**Exit gate:** 100% of displayed diagnostics match recomputation, or mismatches ticketed with
severity = (how misleading × how prominent).

**Effort:** ~1 day.

---

## Phase A6 — Consolidation

**Objective:** single source of truth for everything found.

**Activities:**
- Extend `audit/ISSUE_MATRIX.md` with `I0xx` entries in the existing format
  (ID / Area / Severity / Owner files / Detection / Exit gate).
- Severity calibration pass across all findings (user impact, not aesthetics).
- Mark which findings the benchmark (Phase B) would *detect as a regression* vs. which need
  dedicated tests — this wires the audit into the benchmark's ratchet so fixes stay fixed.
- Produce `audit/INSIGHT_AUDIT_REPORT.md` (executive summary: stage-by-stage verdicts,
  top risks, remediation order).

**Exit gate:** matrix updated; report published; remediation backlog ordered by severity.

**Effort:** ~0.5 day.

---

## 4. Timeline & sequencing summary

| Phase | Effort | Can parallelize with |
|---|---|---|
| A0 Determinism | 0.5 d | — (blocking) |
| A1 Contracts | 1 d | A2, A3, A4 |
| A2 Stage audit | 4–5 d | A1, A3, A4 |
| A3 Findings closure | 1.5 d | A1, A2, A4 |
| A4 Data layer | 1.5 d | A1, A2, A3 |
| A5 Diagnostics truth | 1 d | after A2 |
| A6 Consolidation | 0.5 d | last |

Serial worst case ≈ 10 days; with parallel tracks ≈ 6–7 working days.
Recommended interleave: run A0 first, then start benchmark Phase B1 (36-hour corpus capture is
wall-clock-bound, not effort-bound) *in parallel* with A1–A4, so the corpus is ready when the
audit concludes.

---

## 5. Risks

- **Audit churn from live repo:** hourly prefetch commits keep changing `insight_latest.json`.
  Mitigation: all audit evidence pinned to frozen archive snapshots, never `latest`.
- **Greedy-clustering order sensitivity (A2.4)** may bound reproducibility below byte-identical.
  If so, A0's exit gate relaxes to "stable cluster membership", and the benchmark's stability
  metric inherits that bound — documented, not hidden.
- **Scope creep into fixing.** Guarded by the no-fix rule (§2); remediation is a separate
  workstream after A6.
