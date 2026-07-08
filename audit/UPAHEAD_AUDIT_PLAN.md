# Up Ahead Tab — Comprehensive Audit Plan (Phase-wise)

Status: PLANNED (no execution yet)
Scope owner: Up Ahead tab and all sub-tabs (Suggested / Offers online+offline / Releases /
Events / Alerts / Festivals / Civics), the planner, and the intelligence layer
(`src/intelligence/`), services, configs, and data workflows behind them.
Companion docs: `benchmarks/UPAHEAD_BENCHMARK_PLAN.md` (depends on Phase U0 here);
sibling precedent: `audit/INSIGHT_AUDIT_PLAN.md` (same method, different invariants).
Date: 2026-06-12

---

## 1. Purpose

Same standard as the Insight audit — comprehensive, evidence-based, real-data verification of
every stage against its contract — adapted to what Up Ahead actually is. Up Ahead is NOT a
clustering pipeline; it is an **actionability pipeline**: classify → extract event date →
resolve location → window into a 7-day planner horizon → render per category tab, with a
stateful planner on top. The audit must therefore cover four things Insight's audit did not:

1. **Date semantics** — event-date extraction and date-key generation are the product's core
   correctness surface (a planner that puts an event on the wrong day is worse than no planner).
2. **Dual-mode behavior** — online (location-bypassed) vs offline (location-strict) and
   static-host vs live-host divergence (`reports/MODE_MATRIX.md`).
3. **Dual implementation parity** — the JS live classifier (`src/intelligence/classification.js`)
   and the Python prefetch classifier must agree, or static-host users see a different product (U9-7).
4. **Stateful user flows** — planner save/dedupe/export paths in `plannerStorage.js`
   (U9-1, U9-3, U9-4, U9-5) have user-data-loss potential, a risk class Insight doesn't have.

Out of scope: Insight (own plan), market/weather tabs, visual styling.

## 2. Audit principles

Identical to `audit/INSIGHT_AUDIT_PLAN.md` §2 and binding here: evidence or it didn't happen
(file:line + reproducing input); determinism first; severity = user impact; **no fixes during
audit** (sole exception: audit-blocking defects, flagged `AUDIT-ENABLING CHANGE`); frozen
inputs only (pin dated copies of `public/data/up_ahead*.json` and
`travel-local-*.json`, never live files); ternary verdicts PASS / FAIL / UNVERIFIED.
Evidence records use the same YAML schema (`agent_prompts/Prompt_11_Insight_Audit.md`),
stored under `audit/evidence/`, check IDs prefixed `U` (e.g., `U2.2-CLS-01`).

One addition specific to Up Ahead: **every date-dependent check states its reference date.**
Classification of "ends Friday" has no truth value without an `asOfDate`; an evidence record
missing the injected clock is invalid.

## 3. Phase map and dependencies

```
U0 Determinism & clock injection            (prerequisite for everything, incl. benchmark)
 ├── U1 Contract & config audit
 ├── U2 Stage-by-stage algorithmic audit    (8 sub-tracks, incl. JS↔Python parity)
 ├── U3 Known-findings closure              (U9-1..U9-7, P001, P004, P005, MODE gaps)
 ├── U4 Data-layer & automation audit
 └── U5 Diagnostics & evidence truthfulness
      └── U6 Consolidation & issue matrix
```

U1–U4 parallel after U0; U5 consumes U2 outputs; U6 closes.

---

## Phase U0 — Determinism & clock injection (prerequisite)

**Objective:** prove the full projection (raw items → visible per-tab arrays) is reproducible
for a fixed (input snapshot, reference date), and that the reference date is injectable
end-to-end.

**Why harder than Insight's A0:** date logic permeates everything — `chooseReferenceDate`
(`dateAware.js:28`) accepts `asOfDate`, but the audit must verify that *every* consumer threads
it: year inference (`inferYearForShortDate`, ±30-day boundary), relative parsers ("this week",
"ends Friday"), eligibility windows (7-day strict / 14-day expanded), age caps (36h weather /
48h alerts / 30d offers / 365d civic), `isStaticUpAheadFresh` (12h), cache max-age (6h), and
**date-key generation** in `plannerStorage.js` (the U9-3 UTC-vs-local suspect). Any code path
that calls `new Date()` directly instead of the injected reference is a finding, because it
makes both audit evidence and benchmark replay time-of-day-dependent.

**Activities:** N=10 repeated headless projections on a frozen snapshot with fixed asOfDate;
diff outputs. Grep-and-trace every `new Date()` / `Date.now()` in `src/intelligence/`,
`src/services/upAhead*`, `src/utils/plannerStorage.js`, `src/viewModels/useUpAheadPageViewModel.js`;
classify each as injected / injectable / hardwired. Run the same projection at two simulated
wall-clock times either side of midnight IST and diff (catches U9-3-class date-key drift).

**Exit gate:** reproducible (snapshot, asOfDate) output; hardwired-clock call sites catalogued;
midnight-boundary diff explained or ticketed. **Effort:** ~1 day.

---

## Phase U1 — Contract & config audit

**Targets & checks:**
- **Keyword-list integrity** (`src/config/settings_upahead.js:48–67`): mechanical scan for the
  U9-2 contradiction class — terms appearing in both a category's positive and negative lists,
  or in one category's positives and the global negatives; substring-collision scan
  (`includes()` matching means 'launches' hits 'launch'); report every collision.
- **Threshold single-source-of-truth:** `benchmarks/upahead/thresholds.js` vs
  `audit/ISSUE_MATRIX.md` P001/P004 prose vs any constants in code — values must match
  (plannerPrecision 0.85, onlinePrecision 0.82, offlineRecall 0.75, duplicateLeakRate 0.03,
  falseLocationAcceptance 0.05).
- **Feed registry** (`src/intelligence/feedSourceRegistry.js:50–116`): every category×location
  cell has the coverage MODE_MATRIX claims; trust levels consistent with the Agent-10 elevation
  (`WI_Agent10_UpAhead_Feeds.md`) — verify the static-host `priorityScore >= 2` filter no longer
  empties Events/Shopping (P005 regression check).
- **Location library** (`src/config/locationLibrary.js`): alias sets reviewed for collision risk
  (aliases that are common words or substrings of other cities' aliases) — feeds the U2.4 tests.
- **Dedup thresholds** (`settings_upahead.js:35–42`) vs their documented intent; campaign
  regexes (`OFFER_CAMPAIGNS`) vs current real campaign names.
- **MODE_MATRIX.md** claims vs code (snapshot-first/limited-live, cache TTLs, static fallbacks).

**Exit gate:** zero unexplained drift; full keyword-collision report (input to U2.2);
every duplicated constant ticketed. **Effort:** ~1 day.

---

## Phase U2 — Stage-by-stage algorithmic audit

Same method as Insight A2: enumerate invariants FIRST, then verify by execution on frozen real
data. Sub-tracks:

### U2.1 Normalize & canonical build (`canonicalItemBuilder.js`, `intelligentUpAheadFetcher.js:34–85`)
- Invariants: no silent drops; every canonical item carries category, location annotation,
  date analysis, eligibility verdict with `decisionTrace`; pubDate parsed across the RSS format zoo.
- Exit: drop/parse-failure rates measured on one full real cycle per locale.

### U2.2 Classification (`classification.js`, 201 lines) — P001 surface
- Invariants: scoring formula as documented (positives − 1.0×category-negatives −
  0.65×global-negatives + sourceType 0.3–1.4 + explicit 0.6; confidence = score/4 capped);
  Phase-B suppression (≥2 global negatives ∧ score <2.25 → general) actually fires;
  word-boundary vs substring matching behavior characterized (U9-2).
- Real-data check: per-category assignment distribution on a frozen cycle; gossip leak-through
  measured on the Releases pool against `RELEASE_GOSSIP_PATTERNS` (23 patterns).
- Exit: formula verified; keyword-collision impact quantified (how many real items flip
  category if collisions fixed — sizes the U9-2 risk).

### U2.3 Date awareness (`dateAware.js`, 274 lines) — highest-stakes track
- Invariants per parser: short-numeric year inference flips year only beyond the −30d boundary;
  "this week"/"next week" windows are IST-week-correct; "ends today/tomorrow"/"ends Friday"
  resolve against asOfDate not wall clock; DMY-vs-MDY policy is *stated and consistent*
  (02/03 ambiguity — if no policy exists, that's a finding, not a guess);
  reference-date fallback order (asOfDate → publishDate → today) honored.
- Boundary battery: items at exactly +7d and +14d (window edges), exactly 30d year-inference
  edge, Feb 29, year rollover (Dec→Jan short dates), midnight IST.
- Exit: per-parser PASS/FAIL table over the boundary battery + real-cycle extraction rate
  (what % of items get an event date at all, per category).

### U2.4 Location awareness (`locationAware.js`, 150 lines) — P004 surface
- Invariants: score ladder (1.0 exact / 0.95 word-boundary / 0.82 substring) as documented;
  online-category bypass fires ONLY for online-friendly categories (the bypass is a designed
  hole — verify nothing else leaks through it); `decisionTrace` present on every verdict.
- Real-data checks: alias collision probes from U1 (common-word aliases firing on unrelated
  text); cross-locale contamination (Muscat items matched into Chennai via substring);
  text-scan fallback (`matchesConfiguredLocationByText`) false-positive rate sampled.
- Exit: falseLocationAcceptance measured on real data per locale vs the 0.05 gate.

### U2.5 Deduplication (`deDuplication.js` + `uniqByKey` + `groupOnlineOffers`)
- Invariants: threshold stack (0.82 / 0.58 / token overlap 0.5 / min shared 3 / strong 4)
  applied as configured; same-link short-circuit; location-mismatch veto; ≤1-day date-gap rule;
  campaign grouping keeps newest as representative and exposes true sourceCount.
- Exit: duplicate-leak and over-merge rates sampled on real cycles vs duplicateLeakRate 0.03.

### U2.6 Eligibility windowing & age caps (`eligibilityWindowing.js`, projection in
`useUpAheadPageViewModel.js:281–398`)
- Invariants: planner window 7d strict, display 14d; past-dated items dropped; per-tab age caps
  (weather 36h + ≥2 context keywords, alerts 48h, civic 365d/20 cap, online offers 30d,
  offline offers 365d) enforced at the boundary (off-by-one at exactly the cap);
  Suggested = cross-category dedupe + soonest-first, capped 24.
- Exit: boundary battery PASS/FAIL per cap; Suggested composition verified against rules.

### U2.7 JS ↔ Python parity (U9-7) — Up Ahead-specific track
- Run the same frozen raw items through `classification.js` and the Python prefetch
  categorizer (`scripts/fetch_upahead_events.py` / `transform_python_items.py`); diff
  category, date, location verdicts item-by-item.
- Exit: parity disagreement rate quantified per field. Static-host users see Python's output;
  live users see JS's — the disagreement rate IS the static/live product divergence, and this
  number feeds the benchmark plan (which mode to treat as system-under-test).

### U2.8 Planner state & interaction (`plannerStorage.js`, 299 lines; `MyPlannerPage.jsx`)
- Invariants: date-key generation timezone-consistent (U9-3: `toISOString()` UTC vs local
  `setHours` — test with IST evening event dates, where UTC date ≠ IST date); save failures
  surfaced not swallowed (U9-4 quota path); `addItem` dedup-vs-error return distinguishable
  (U9-5); export path wired (U9-1 dead button); prune/normalize round-trips lossless.
- Exit: each invariant verified by execution including a simulated quota-exceeded and an
  IST-evening save; this is user-data territory — failures default High severity.

**Phase U2 effort:** ~5 days (U2.3 and U2.7 are the heavy items).

---

## Phase U3 — Known-findings closure

Drive every prior finding to VERIFIED-FIXED / CONFIRMED-OPEN(I0xx) / RISK-ACCEPTED:

| Finding | Source | Closure test |
|---|---|---|
| U9-1 export button dead | walkthrough_09 | Execute export path; verify handler wiring |
| U9-2 keyword fragility | walkthrough_09 | U1 collision report + U2.2 flip quantification |
| U9-3 date-key timezone | walkthrough_09 | U2.8 IST-evening + U0 midnight diff |
| U9-4 silent quota loss | walkthrough_09 | U2.8 simulated quota |
| U9-5 false-vs-duplicate | walkthrough_09 | U2.8 return-shape check |
| U9-6 dead code/imports | walkthrough_09 | lint evidence; severity Low |
| U9-7 dual implementation | walkthrough_09 | U2.7 parity rate |
| P001 planner precision ≥0.85 | ISSUE_MATRIX | re-run `planner_edgecases` fixtures; record current value (baseline for benchmark) |
| P004 online ≥0.82 / offline recall ≥0.75 | ISSUE_MATRIX | re-run `online/offline_input_100` fixtures; flag the date-rot problem (fixtures carry absolute 2024 dates — are they even still evaluating what they claim under today's clock?) |
| P005 static-host emptiness | ISSUE_MATRIX | U1 trust-filter regression check |
| MODE gap #1 (Following topics no prefetch) | MODE_MATRIX | confirm + ticket; likely RISK-ACCEPTED |

**Exit gate:** all rows terminal-stated in the issue matrix. **Effort:** ~1.5 days.

---

## Phase U4 — Data-layer & automation audit

- **Two workflows audited over 14 days of history:** `upahead_refresh.yml` (hourly 6am–10pm IST
  + Sunday festivals) and `travel-local-news.yml` (6-hourly, 4 locales) — runs landed, gaps,
  failure handling.
- **Retention check:** travel-local JSONs have **no explicit pruning** (exploration finding) —
  measure actual file growth and oldest-item age; unbounded growth on a static host is a
  ticketable defect.
- **Validation gates:** does `validate_upahead_prefetch_output.py` reject or merely warn?
  Feed a deliberately malformed item through it.
- **Cache coherence:** 6h live cache vs 12h static freshness vs hourly refresh — verify no
  regime where a user is pinned to stale data while fresher exists (MODE_MATRIX cross-check).
- **Feed health:** per-feed yield over 14 days; dead-but-configured feeds (silently shrinks
  category coverage, which the evidence score then *reports as a content problem* — miscoding
  an ops failure as editorial thinness).

**Exit gate:** reliability tables; every silent-degradation path ticketed. **Effort:** ~1.5 days.

---

## Phase U5 — Diagnostics & evidence truthfulness

The 🏅 score, evidence panel, and briefing make claims; verify them against independent
recomputation, same method as Insight A5.

- `upAheadEvidence.js` (198 lines): score formula
  `(coveredCategories/enabled) × (populatedDays/7) × 100` recomputed from raw visible arrays;
  strong/partial/thin bucket boundaries (74/45) honored; location and item counts accurate.
- `upAheadBriefing.js` (237 lines): "today", "next 72h", planner-ready counts recomputed with
  the injected clock — these are date-arithmetic claims and inherit all U2.3 risks.
- `up_ahead_quality_report.json` / summary: per-run metrics spot-audited against the cycle's
  actual data.

**Exit gate:** 100% of displayed numbers match recomputation or are ticketed
(severity = misleading × prominent). **Effort:** ~1 day.

---

## Phase U6 — Consolidation

Extend `audit/ISSUE_MATRIX.md` (`I0xx`, same format), severity calibration by user impact
(planner data loss and wrong-day placement rank above cosmetic miscounts), map every finding to
either a `benchmarks/UPAHEAD_BENCHMARK_PLAN.md` §V4 metric or a dedicated cert, publish
`audit/UPAHEAD_AUDIT_REPORT.md`.

**Exit gate:** matrix updated; report published; remediation backlog ordered. **Effort:** ~0.5 day.

---

## 4. Timeline summary

| Phase | Effort | Parallel with |
|---|---|---|
| U0 Determinism/clock | 1 d | — (blocking) |
| U1 Contracts/config | 1 d | U2–U4 |
| U2 Stage audit (8 tracks) | ~5 d | U1, U3, U4 |
| U3 Findings closure | 1.5 d | U1, U2, U4 |
| U4 Data layer | 1.5 d | U1–U3 |
| U5 Diagnostics truth | 1 d | after U2 |
| U6 Consolidation | 0.5 d | last |

Serial ≈ 11.5 days; parallelized ≈ 7–8 working days. Start the benchmark's corpus capture
(V1, wall-clock-bound) immediately after U0, as with Insight.

## 5. Risks

- **Date-rot in existing fixtures:** the 100-item benchmarks embed absolute 2024 dates; their
  historical pass rates may be meaningless under today's clock. U3 measures this explicitly
  before anyone trusts P001/P004 baselines.
- **Clock-coupling depth:** if U0 finds many hardwired `new Date()` sites, U0's exit gate may
  require an AUDIT-ENABLING refactor (single clock injection point) — budgeted as the +1 day
  contingency.
- **Live repo churn:** hourly/6-hourly CI commits — all evidence pinned to frozen dated copies.
- **Scope creep into fixing:** no-fix rule, as in the Insight plan.
