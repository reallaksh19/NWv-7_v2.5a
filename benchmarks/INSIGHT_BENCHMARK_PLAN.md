# Insight Tab — Real-Data Benchmark Plan (500+ stories / 36-hour replay)

Status: PLANNED (no execution yet)
Companion doc: `audit/INSIGHT_AUDIT_PLAN.md` (Phase A0 of that plan is a hard prerequisite here)
Date: 2026-06-12

---

## 1. Goal & non-goals

**Goal:** establish an externally-referenced, repeatable benchmark that answers — with real
data at real scale — the question current quality metrics cannot: *did the pipeline cluster the
right stories together, label the right angles, and rank what an editor would rank?*

Today's ratchet (avgAngles ≥1.8, multiAngle ≥8, hiddenDup ≤40) measures internal consistency
only; the system grades its own homework. This benchmark replaces that with ground-truth-based
metrics, then becomes the **permanent regression ratchet** for all future Insight changes.

**Non-goals:**
- Chasing last-few-percent accuracy. Ground-truth precision is sized to detect *material*
  defects (≥5-point metric movements), not 94%-vs-96% distinctions.
- Performance/latency benchmarking (only recorded incidentally during replay).
- Synthetic scenario testing (already covered by `benchmark_results.md` and cert tests).

**Decided approach (from planning discussion):** **LLM-first ground truth with one-time human
calibration** — LLM judge labels ~95% of items; humans (a) calibrate the judge once on a
stratified ~100-item sample and (b) adjudicate judge abstentions/low-confidence items.
Rationale: the system under test is 200-term TF-IDF + keyword heuristics; a frontier LLM
reading full articles is categorically stronger, so judge labels suffice to find all material
defects at ~10× lower cost than manual labeling, and the judge is repeatable for future
corpus refreshes. Judge–human agreement is measured and **reported alongside every benchmark
metric** to keep the benchmark defensible.

---

## 2. Why 36 hours / 500+ stories (design constraints)

- **Persistence (weight 0.20) + cross-snapshot momentum (0.08) = 28% of the ranking score**
  exercise only across multiple fetch cycles. A static corpus can never test them.
- 36 hours = the pipeline's own retention window (stories pruned >36h from `publishedAt`),
  so the corpus exercises the full story lifecycle including pruning.
- 36 hours ≈ 24 prefetch cycles (16/day cadence) → tests incremental-vs-full-run behavior,
  including the F5-2 "new event dropped by incremental run" failure mode.
- Volume: prefetch yields 200–400 unique stories/cycle, ~700+/day → a 36-hour window
  comfortably exceeds 500 unique stories without any special collection effort.

---

## 3. Phase map

```
B0 Prerequisites (audit A0: determinism + virtual clock)
 └── B1 Corpus capture & freeze (36h wall-clock; runs in parallel with audit A1–A4)
      └── B2 Ground-truth labeling (LLM judge + calibration + adjudication)
      └── B3 Replay harness (can build during B1 capture)
           └── B4 Metric computation & analysis
                └── B5 Baseline report & regression ratchet integration
```

B1 is wall-clock-bound (36 h) but near-zero effort — start it early.
B2 and B3 are independent and parallelizable.

---

## Phase B0 — Prerequisites

**Entry condition:** audit Phase A0 complete. Specifically:
1. Pipeline output reproducible for (frozen snapshot, injected clock) — or divergence bounded
   and documented (greedy-clustering order sensitivity sets the noise floor for B4's stability
   metrics; metrics cannot alarm below that floor).
2. Virtual clock injection available — freshness decay and persistence read wall-clock today;
   replay of historical cycles requires evaluating "now" as the cycle's capture time.

**Exit gate:** a documented headless invocation pattern (per `scripts/test_insight_*.mjs`
precedent) that accepts (snapshot, clock) and emits full serialized pipeline output.

**Effort:** absorbed in audit A0; +0.5 day if clock injection needs design.

---

## Phase B1 — Corpus capture & freeze

**Objective:** one immutable, hourly-granular, 36-hour corpus of ≥500 unique stories.

**Why fresh capture, not May archives:** existing archives
(`public/newsdata/insight_2026-05-13..19.json`) are daily rollups — the hourly slot structure
the replay needs is collapsed. The prefetch pipeline already runs hourly; capture is
configuration, not construction.

**Protocol:**
1. **Window selection:** pick a 36-hour window starting on a weekday morning IST (captures a
   full news day + overnight + second morning: breaking cycles, market hours, and the
   low-volume overnight regime). Avoid scheduled mega-events (election results day) — we want
   a *typical* news distribution for the baseline; an event-day corpus can be a second corpus later.
2. **Capture:** retain every per-cycle snapshot produced by the existing prefetch
   (~24 cycles × 4 slots) instead of letting them overwrite. Each cycle saved with its
   `fetchedAt`, `contentHash`, and slot metadata intact.
3. **Freeze:** copy to `benchmarks/corpora/insight_36h_<date>/` with a manifest:
   cycle list, per-cycle story counts, unique story count, per-feed yield, content hashes.
   Corpus is append-only thereafter; any correction = new corpus version.
4. **Acceptance check:** ≥500 unique deduplicated stories; ≥20 of 24 cycles present (feed
   failures tolerated, gaps documented); all 4 slots represented in ≥90% of cycles; every
   configured topic represented; at least one organic multi-cycle developing story present
   (verified by eyeball — needed to make persistence/momentum metrics non-degenerate).

**Exit gate:** frozen corpus + manifest committed; acceptance checks pass.

**Effort:** ~0.5 day setup + 36 h wall-clock (unattended) + 0.5 day freeze/verify.

---

## Phase B2 — Ground-truth labeling

**Objective:** external reference labels for the three judged tasks, with measured reliability.

### B2.1 Task design (what gets labeled)

| Task | Unit | Labels | Volume |
|---|---|---|---|
| Same-event judgment | story **pair** | same-event / related-not-same / unrelated / abstain | ~3,000–5,000 sampled pairs |
| Angle classification | story (within its cluster context) | one of the 12 angle labels / abstain | ~500–700 stories |
| Editorial importance | cluster (parent + children digest) | **coarse bucket**: major / notable / minor | all parents per evaluated cycle (~10 × selected cycles) |

Design choices baked in from planning:
- **Pairs, not full clusterings.** Exhaustive grouping of 500 stories is ~125k pairs; sampled
  pairs give statistically sufficient pairwise precision/recall at ~10× less labeling.
- **Coarse ranking buckets, not full orderings.** Editor-grade total orderings don't agree even
  between humans; buckets catch the failure class that matters ("minor story ranked #1").
- **Temporal metrics need no labels** — computed mechanically in B4 from timestamps/cluster IDs.

### B2.2 Pair sampling design (stratified — this determines benchmark power)

Random pairs alone would be ~99% trivially-unrelated. Strata:

1. **System-merged pairs** (same cluster per pipeline): tests false merges → precision.
2. **Near-threshold pairs** (eventSimilarity in 0.55–0.75, the POSSIBLE band): the decision
   boundary — highest information per label.
3. **Cross-cluster similar pairs** (high embedding similarity, different clusters): tests
   false splits → recall.
4. **Hidden-duplicate pairs** (dedup layer 1–2 removals): tests over-aggressive dedup.
5. **OOV-heavy pairs** (both stories low vocabulary coverage): targets the F5-1 regime where
   TF-IDF is blind — oversampled deliberately.
6. **Random control pairs** (~10%): calibration floor.

### B2.3 Judge design

- Judge model: mid-tier (Sonnet-class) for pair and angle judgments; stronger model for
  importance buckets. Batched API, temperature 0, fixed prompt version recorded in corpus
  manifest (judge prompt + model ID are part of the benchmark's reproducibility surface).
- Judge sees **full title + summary + source + timestamp** for both stories (more context than
  the pipeline's TF-IDF gets — by design: ground truth must be stronger than system under test).
- Mandatory **confidence + abstain**. Abstentions and low-confidence go to human adjudication.
- Anti-leakage rule: the judge is never shown the pipeline's own cluster/angle/score output for
  the judged item (except implicitly via stratum membership, which is unavoidable and documented).

### B2.4 Calibration & adjudication (the two human touchpoints)

1. **Calibration (once):** human labels a stratified ~100-item sample spanning all 3 tasks.
   Compute judge–human agreement (Cohen's κ per task).
   - Agreement ≥0.8 κ → judge trusted for full corpus.
   - 0.6–0.8 → judge trusted, metric error bars widened accordingly.
   - <0.6 on any task → that task's labeling redesigned (better prompt/model or human-labeled)
     **before** scaling. This is the cheap failure point — by design it happens before spend.
2. **Adjudication (ongoing, small):** humans resolve judge abstentions + a 5% audit sample of
   confident judgments. Expected total human time: 2–4 hours.

**Exit gate:** all labels produced; κ per task computed and recorded; adjudication queue empty;
label files frozen alongside corpus manifest.

**Effort:** ~1 day engineering (prompts, batching, sampling) + API runtime + 2–4 h human.
**Budget:** single-digit USD at Sonnet-class batch pricing for ~5k short judgments.

---

## Phase B3 — Replay harness

**Objective:** drive the frozen corpus through the pipeline chronologically and capture
everything B4 needs. (Buildable during B1's 36-hour capture window.)

**Specification (behavioral, not code):**
1. For each captured cycle in chronological order: set virtual clock to the cycle's
   `fetchedAt`; feed the cycle's slot snapshots through the full pipeline
   (merge → dedup → cluster → rank → tree → gates) exactly as production does, including the
   cache/merge path so incremental behavior (F5-2 regime) is exercised — **not** 24 independent
   cold runs.
2. Capture per cycle: full serialized result (parents, children, scores, scoreBreakdown,
   angle labels, hidden duplicates, weak-tree flags, gate/recovery diagnostics) + stage
   intermediates needed for metrics (dedup decisions, cluster membership, candidate pools).
3. Also run a **cold full-run** at 3 checkpoint cycles (start/middle/end) to quantify
   incremental-vs-full divergence directly (the F5-2 measurement).
4. Output: one results bundle per cycle under `benchmarks/runs/<corpus>/<git-sha>/`,
   keyed by corpus version + code version — the unit the ratchet compares.

**Exit gate:** full 24-cycle replay completes deterministically (within A0's documented noise
floor); results bundle schema documented.

**Effort:** ~1.5–2 days.

---

## Phase B4 — Metric suite

All metrics computed from (results bundles × ground-truth labels). Targets below are
**initial alarm thresholds** — deliberately loose (material-defect detection, per §1);
tightened only after the baseline run shows where the system actually sits.

### Correctness metrics (vs. ground truth)

| Metric | Definition | Initial alarm threshold |
|---|---|---|
| Dedup precision | of pairs the system hid as duplicates, % judge-confirmed same/near-same | <0.90 (false merges destroy stories — weighted strictest) |
| Dedup recall | of judge-confirmed duplicate pairs, % system caught | <0.75 |
| Clustering pairwise F1 | precision/recall over sampled pairs (same-cluster vs judge same-event) | <0.70 |
| Clustering B-cubed | per-story precision/recall (penalizes both mega-clusters and shattering) | reported, no alarm initially |
| OOV-stratum clustering F1 | pairwise F1 restricted to stratum 5 | reported separately — quantifies F5-1; expected to be the headline finding |
| Angle accuracy | % stories where pipeline angle = judge angle (abstentions excluded) | <0.55 (12-class keyword classifier; expected weakest stage) |
| Angle `unknown` rate | % children labeled unknown | >0.25 |
| Ranking bucket conformance | % of "major" clusters in pipeline top-5; no "minor" cluster in top-3 | any minor-in-top-3 |
| nDCG@10 vs buckets | graded relevance major=2/notable=1/minor=0 | <0.75 |

### Temporal metrics (label-free, mechanical)

| Metric | Definition | Initial alarm threshold |
|---|---|---|
| Time-to-surface | cycles between a new event's first story ingested and its cluster first rendered top-N | median >2 cycles (direct F5-2 detector) |
| Incremental-vs-full divergence | cluster-set difference between incremental result and cold full-run at the 3 checkpoints | any event present in full but absent in incremental for ≥2 cycles |
| Cluster stability / churn | cycle-over-cycle membership agreement for persisting events (above A0 noise floor) | >20% unexplained churn |
| Lifecycle correctness | stories pruned at 36h boundary, not before/after; persistence score monotone with actual cross-cycle presence | any violation |

### Reporting requirements
- Every correctness metric reported **with the B2 judge–human κ for its task** and label counts.
- Per-stratum breakdowns mandatory (esp. OOV stratum and near-threshold stratum).
- Existing internal metrics (avgAngles, signal score, hiddenDup) reported alongside for
  continuity with the old ratchet — and to reveal where internal metrics disagree with
  ground-truth metrics (itself a finding).

**Exit gate:** all metrics computed on baseline run; per-stratum analysis written.

**Effort:** ~1.5 days.

---

## Phase B5 — Baseline report & regression ratchet integration

**Objective:** turn the one-time benchmark into permanent infrastructure.

**Activities:**
1. `benchmarks/INSIGHT_BENCHMARK_BASELINE.md`: headline metrics, per-stage verdicts,
   per-stratum findings, cross-references to audit issue matrix entries (each audit `I0xx`
   finding annotated: *detected by benchmark metric X* or *needs dedicated test*).
2. Ratchet integration: replace/augment `test:real-insight-snapshot-quality` cert with a
   benchmark-replay cert — replay the frozen corpus against HEAD, compare against baseline
   bundle, fail on alarm-threshold breach. Frozen corpus + frozen labels = zero marginal
   labeling cost per run; runtime is the only cost (acceptable for CI-nightly, not per-commit).
3. Refresh policy: new corpus captured quarterly or after major feed-registry changes; judge
   re-labels new corpus automatically (the repeatability dividend of LLM-first); calibration
   re-checked with a fresh ~50-item human sample per refresh.
4. Remediation hook: baseline numbers + audit matrix jointly define the remediation order
   (expected: F5-2 time-to-surface and F5-1 OOV clustering first, angle accuracy second).

**Exit gate:** baseline published; nightly replay cert green on baseline; refresh policy documented.

**Effort:** ~1 day.

---

## 4. Timeline summary

| Phase | Effort | Wall-clock notes |
|---|---|---|
| B0 Prereqs | absorbed in audit A0 (+0.5 d) | blocking |
| B1 Corpus capture | 1 d effort | +36 h unattended; start ASAP, parallel with audit A1–A4 |
| B2 Ground truth | 1 d + 2–4 h human | parallel with B3 |
| B3 Replay harness | 1.5–2 d | parallel with B1/B2 |
| B4 Metrics | 1.5 d | after B1–B3 |
| B5 Baseline + ratchet | 1 d | last |

Total ≈ 6–7 working days effort, ~2 calendar weeks interleaved with the audit.
Combined audit + benchmark program: ~3 calendar weeks to a published baseline and live ratchet.

---

## 5. Risks & mitigations

- **Judge reliability below bar (κ<0.6) on a task** → caught at the ~100-item calibration step
  *before* full-corpus spend; that task redesigned or human-labeled. This is the plan's
  designed cheap-failure point.
- **Atypical capture window** (news drought / mega-event) → acceptance check in B1 requires a
  typical distribution and ≥1 organic developing story; if violated, capture another window
  (cost: 36 h wall-clock, near-zero effort).
- **Greedy clustering order-noise** (from audit A2.4) sets a floor under stability metrics →
  floor measured in A0/A2.4 and encoded into B4 thresholds rather than ignored.
- **Corpus in-repo size** (~24 cycles × ~1 MB) → store compressed under `benchmarks/corpora/`;
  if repo weight becomes an issue, corpus moves to a release artifact with the manifest staying
  in-repo (manifest hashes keep it verifiable).
- **Judge/model drift across future refreshes** → judge model ID + prompt version pinned in
  manifest; κ re-measured per refresh; metric deltas attributable to (code, corpus, judge)
  separately because all three are versioned.

---

## 6. Decision log

| Decision | Choice | Rationale |
|---|---|---|
| Ground truth method | LLM-first + human calibration/adjudication | System under test is keyword/TF-IDF heuristics; judge categorically stronger; ~10× cheaper than manual; repeatable for refreshes (planning discussion, 2026-06-12) |
| Clustering labels | Sampled stratified pairs, not full grouping | Statistical sufficiency at ~10× less labeling |
| Ranking labels | 3 coarse buckets, not total order | Human orderings don't inter-agree; buckets catch material mis-rankings |
| Corpus source | Fresh 36 h capture, not May archives | Archives are daily rollups; replay needs hourly slot structure |
| Replay mode | Warm/incremental chronological + 3 cold checkpoints | Exercises F5-2 regime and quantifies incremental divergence |
| Threshold philosophy | Loose initial alarms, tighten post-baseline | Goal is material-defect detection, not miniscule-% optimization |
