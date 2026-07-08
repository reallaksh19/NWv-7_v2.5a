# Up Ahead Tab — Real-Data Benchmark Plan (600+ items / 7-day replay)

Status: PLANNED (no execution yet)
Companion docs: `audit/UPAHEAD_AUDIT_PLAN.md` (Phase U0 is a hard prerequisite);
sibling precedent: `benchmarks/INSIGHT_BENCHMARK_PLAN.md` (same ground-truth philosophy,
different tasks and temporal design).
Date: 2026-06-12

---

## 1. Goal & how this differs from the Insight benchmark

**Goal:** a ground-truth benchmark that answers what the existing fixtures cannot: *on real
feed data at scale, does Up Ahead put the right item in the right tab, on the right date, in
the right city, in the right mode — and does the planner keep it on that date?*

**Relationship to existing fixtures** (`benchmarks/upahead/online_input_100.json`,
`offline_input_100.json`, `planner_edgecases_*.json`, `thresholds.js`):
Up Ahead — unlike Insight — already has external ground truth. It is kept as a fast smoke
suite, but it cannot serve as the optimization source of truth because it is (a) small
(100 items/mode), (b) hand-authored, so it tests the failure modes its authors imagined,
(c) **date-rotted** — absolute 2024 dates mean relative parsers and year inference are no
longer exercised as intended under today's clock, and (d) self-confirming — thresholds were
set to what the fixtures scored. This plan supersedes it as the regression authority;
the fixtures' P001/P004 readings (re-measured in audit Phase U3) become historical baselines.

**Key design differences vs the Insight benchmark:**

| Dimension | Insight | Up Ahead |
|---|---|---|
| Primary unit | story **pairs** (clustering) | **single items** (classification, date, location) — pairs only for dedup |
| Temporal window | 36h retention replay | **7-day planner-horizon replay** (lifecycle: appear → approach → expire) |
| Clock dependency | freshness decay | **truth-changing**: "ends Friday" labels are functions of asOfDate; every label records its reference date |
| Modes | one | **online vs offline × static vs live** — labels carry expected behavior per mode |
| State | stateless render | **planner round-trip** (save → reload → correct date key) |

**Ground truth approach:** LLM-first + one-time human calibration, identical philosophy to
the Insight plan §B2 — with one Up Ahead-specific adjustment: **date-extraction ground truth
is split**. Where the item text contains an explicit resolvable date, the gold date is
computed **deterministically** (rule-assisted, human-spot-checked) and the LLM judge is used
only for genuinely ambiguous phrasing ("early next month", DMY/MDY ambiguity). Deterministic
gold where possible beats judged gold — dates have objective truth more often than event
sameness does. Judge–human κ measured and reported per task, as in the Insight plan.

---

## 2. Phase map

```
V0 Prerequisites (audit U0: determinism + injectable asOfDate end-to-end)
 └── V1 Corpus capture & freeze (7 days wall-clock; parallel with audit U1–U4)
      └── V2 Ground-truth labeling (deterministic dates + LLM judge + calibration)
      └── V3 Replay harness (dual-mode, clock-advancing)
           └── V4 Metric computation & analysis
                └── V5 Baseline report & regression ratchet integration
```

---

## Phase V0 — Prerequisites

Entry: audit U0 complete — projection reproducible for (snapshot, asOfDate); hardwired-clock
call sites resolved or catalogued; headless invocation pattern documented for BOTH
implementations (JS intelligence pipeline and Python prefetch categorizer — the U2.7 parity
track defines how each is driven). Exit: harness can evaluate any frozen item set at any
simulated asOfDate in either mode. Effort: absorbed in U0 (+0.5 d if the Python side needs a
driver).

---

## Phase V1 — Corpus capture & freeze

**Objective:** one immutable 7-day corpus, ≥600 unique items, all 9 categories × 4 locales,
captured at native cadence.

**Why 7 days (vs Insight's 36h):** the planner window IS 7 days. Only a window-length capture
lets the replay observe the full item lifecycle — an event entering at horizon-edge (+7d),
approaching (Suggested re-ranking by soonness), arriving ("today" in briefing), and expiring
(dropped as past-dated) — plus at least one weekend boundary ("this week"/"next week" parser
semantics flip on week boundaries) and the Sunday festival refresh.

**Protocol:**
1. **Window:** 7 consecutive days starting a Monday IST (captures the week-parser flip
   mid-corpus and one full weekend). Records ~112 upahead_refresh cycles + ~28 travel-local
   cycles. Avoid major festival weeks for the baseline corpus (typical-distribution rule, as
   in Insight B1) — but VERIFY at freeze time that ≥1 organic festival/holiday, ≥1 weather
   alert, and ≥1 multi-source offer campaign occurred; if not, extend capture rather than
   accept a degenerate corpus.
2. **Capture:** retain every per-cycle output of both workflows (raw feed items pre-processing
   AND the published `up_ahead*.json` / `travel-local-*.json` post-processing) — raw is what
   ground truth labels; published is what parity checks compare.
3. **Freeze:** `benchmarks/corpora/upahead_7d_<date>/` with manifest: cycle list, per-cycle
   and per-locale item counts, unique item count (target ≥600 — at 50–200 items/category/day
   this is comfortably met), per-feed yield, content hashes, and **the IST timezone statement**
   (all asOfDate replay values derive from cycle timestamps).
4. **Acceptance:** ≥600 unique items; all 9 categories ≥20 items each (offers and movies will
   dominate; floor protects alerts/civic/festivals); all 4 locales represented; ≥90% of
   expected cycles present; the three organic-event checks above pass.

**Exit gate:** frozen corpus + manifest committed; acceptance passes.
**Effort:** ~0.5 d setup + 7 days unattended + 0.5 d freeze/verify.

---

## Phase V2 — Ground-truth labeling

### V2.1 Task design

| Task | Unit | Gold label | Method | Volume |
|---|---|---|---|---|
| Category | item | one of 9 categories / `general` / `noise-gossip` | LLM judge | all ≥600 items |
| Event date | item | resolved date or date-range or `none`, **with reference date recorded** | deterministic where explicit; judge for ambiguous; every record tags `date_basis: explicit\|relative\|inferred\|none` | all items |
| Location | item | canonical city / `multi` / `none-online` | LLM judge (full text incl. source) | all items |
| Duplicate pairs | pair | same-offer/same-event/distinct | LLM judge | ~1,500 stratified pairs |
| Planner eligibility | item | plannable / display-only / suppress | LLM judge (rubric: has actionable future date + user can act on it) | ~300 stratified items |
| Alert criticality | alert item | critical / informational / stale-noise | LLM judge | all alert-category items |

Every record uses the Insight record schema (`agent_prompts/Prompt_12_Insight_Benchmark.md`)
extended with: `as_of_date` (mandatory — labels are clock-relative), `mode_expectation`
(online/offline behavioral expectation where they differ), `date_basis`, and `locale`.
Append-only with supersede semantics, full judge provenance, mandatory written reasoning —
unchanged from the Insight plan: these records are the future optimization source of truth.

### V2.2 Challenge taxonomy (every record tags ≥1; full coverage mandatory)

`category_keyword_collision` (U9-2 traps: gossip with release keywords, reviews vs releases) ·
`category_cross_bleed` (sports event vs sports news; airline offer vs airline news) ·
`date_dmy_mdy` · `date_relative_week` (labels straddling the captured weekend) ·
`date_ends_weekday` · `date_year_inference` (short dates near the −30d boundary / Dec–Jan) ·
`date_tz_midnight` (IST-evening events whose UTC date differs — U9-3 surface) ·
`date_in_title_vs_pubdate` · `location_alias` (T Nagar→Chennai etc.) ·
`location_collision` (alias firing on unrelated text; cross-locale contamination Trichy/Chennai/Muscat/Colombo) ·
`location_online_bypass` (offline-relevant item wrongly riding the online bypass) ·
`dedup_campaign` (Prime Day across N sources → one group, true sourceCount) ·
`dedup_near_offer` (same retailer, different discount — NOT duplicates) ·
`alert_expiry` (weather alert at the 36h cap; cyclone warning that was lifted) ·
`breaking_critical_alert` (new critical alert mid-corpus — the time-to-surface analog) ·
`festival_regional` (locale-specific holidays: Pongal vs Muscat public holidays) ·
`parity_probe` (items where JS and Python verdicts are predicted to diverge — fed by audit U2.7) ·
`control` (~10% cap).

### V2.3 Worked samples (the pattern V2 labeling must follow)

**Sample 1 — `date_dmy_mdy` + `date_year_inference`:** real offer "Flat 40% off, ends 02/03"
captured 2026-06-16. Gold: `date_basis: ambiguous`; judge resolves from context (Indian
retailer → DMY → 2 March → past → year-inference says 2027-03-02, which is OUTSIDE the 14-day
window → item should NOT display). *Reasoning why this meets the plan:* one record
simultaneously tests DMY policy existence (audit U2.3 found none stated), year inference, and
window exclusion — and its gold label is impossible to state without `as_of_date`, proving the
schema requirement.

**Sample 2 — `category_keyword_collision`:** real item "Actor X's next film launches teaser
amid divorce rumours". Gold: category `noise-gossip`, planner `suppress`. *Reasoning:*
'launches' + film terms score positive for movies while the gossip payload is the actual
content — exactly the U9-2 contradiction class and the P001 precision gate's hardest case.

**Sample 3 — `location_online_bypass`:** real item "Big Saver Mart T Nagar anniversary sale,
this weekend only". Gold: location `Chennai`, mode_expectation: offline tab for
Chennai-configured users; must NOT appear as a nationwide online offer. *Reasoning:* tests the
designed hole in `locationAware.js:54` — a physical-store sale with shopping keywords is the
item most likely to leak through the online bypass; also tags `date_relative_week`.

**Sample 4 — `breaking_critical_alert`:** an organic weather/civic alert first appearing
mid-corpus (e.g., IMD heavy-rain warning at day 4, cycle 60). Gold: criticality `critical`;
group its follow-ups; record first-ingestion cycle. *Reasoning:* the replay measures which
cycle the Alerts tab first showed it (time-to-surface for the one category where latency has
safety stakes) and whether it left the tab at the 36h cap or lingered (alert_expiry pairing).

**Sample 5 — `dedup_campaign` vs `dedup_near_offer`:** six real "Prime Day" items from
different feeds (gold: one group, sourceCount 6) PLUS two same-retailer items with different
discount terms (gold: distinct). *Reasoning:* tests both directions of the dedup stack —
under-merge (campaign fragmentation inflates the Offers tab) and over-merge (distinct deals
hidden), against the duplicateLeakRate 0.03 gate.

### V2.4 Calibration & adjudication
Identical to Insight §B2.4: ~100-item stratified human calibration per task family, κ-gated
(<0.6 → redesign that task before scaling), judge abstentions + 5% confident-sample human
adjudicated, κ table frozen with the labels. Deterministic date golds are spot-checked at 10%
instead of judged. Expected human time: 3–5 h (more than Insight — date adjudication).

**Exit gate:** labels frozen + κ table + `COVERAGE_REPORT.md` (every taxonomy tag ≥10 records,
≥25 for `date_*` and `location_*` families). **Effort:** ~1.5 d engineering + runtime +
3–5 h human. Budget: single-digit USD (Sonnet-class batch).

---

## Phase V3 — Replay harness

1. **Clock-advancing replay:** iterate the corpus's cycles chronologically; for each, set
   asOfDate to the cycle timestamp and run the full projection (canonical build →
   classification → date → location → dedup → windowing → per-tab visible arrays). Warm path
   (cache carried between cycles per 6h TTL rules) exactly as production.
2. **Dual-mode, dual-implementation matrix per cycle:** JS pipeline in online and offline
   configurations (per-locale), AND the Python categorizer over the same raw items — the
   parity disagreement rate becomes a tracked metric, not a one-time audit number.
3. **Planner round-trip probe:** at 3 checkpoints, programmatically save a fixed set of
   labeled items to planner storage at simulated IST-evening times, advance the clock past
   midnight, reload, and verify each item renders on its gold date (mechanical U9-3 detector).
4. **Outputs:** per-cycle results bundles under `benchmarks/runs/<corpus>/<git-sha>/`
   keyed by (corpus, code, mode, implementation).

**Exit gate:** full 7-day replay deterministic; bundle schema documented. **Effort:** ~2 d.

---

## Phase V4 — Metric suite

Initial alarm thresholds are loose (material-defect detection); existing `thresholds.js`
values are adopted where they exist so the new benchmark is comparable with P001/P004 history.

### Correctness (vs ground truth)

| Metric | Definition | Initial alarm |
|---|---|---|
| Category precision / recall (per category) | vs gold category | precision <0.85 (P001 continuity); recall <0.65 |
| Gossip suppression | % `noise-gossip` gold items excluded from Releases | <0.90 |
| Date extraction accuracy | exact-date match (or range overlap) vs gold, per `date_basis` stratum | explicit <0.95; relative <0.80; reported separately — `inferred` stratum reported, no alarm initially |
| Wrong-day rate | items shown with a resolved date ≠ gold date | >0.05 (the planner's core sin) |
| Location accuracy / false acceptance | vs gold canonical city, per locale | falseLocationAcceptance >0.05 (existing gate) |
| Online-bypass leak rate | gold-offline items appearing in online view | any `location_online_bypass` record leaking |
| Dedup leak / over-merge | vs gold pair labels | leak >0.03 (existing gate); over-merge >0.03 |
| Planner eligibility agreement | vs gold plannable/suppress | <0.80 |
| Alert criticality agreement | vs gold critical/informational | any gold-critical item missing from Alerts |

### Temporal & lifecycle (label-free, mechanical)

| Metric | Definition | Initial alarm |
|---|---|---|
| Alert time-to-surface | cycles from first ingestion of gold-critical alert to Alerts-tab visibility | median >1 cycle |
| Window-edge correctness | items enter at +14d display / +7d planner edges and expire when past, exactly | any boundary violation |
| Age-cap enforcement | weather 36h / alerts 48h / offers 30d caps honored at boundary | any violation |
| Suggested stability | cycle-over-cycle churn in Suggested top-24 not explained by date proximity changes | >25% unexplained |
| Planner round-trip integrity | V3 probe items render on gold date after midnight crossing | any failure (U9-3) |
| JS↔Python parity | per-field disagreement rate across the matrix | >0.05 on category or date |

### Reporting
Per-task κ alongside every judged metric; per-stratum and per-locale breakdowns mandatory
(esp. `date_*` families and Trichy/Colombo, the thinnest locales); legacy fixture scores
(P001/P004) reported alongside for continuity.

**Exit gate:** baseline computed; per-stratum analysis written. **Effort:** ~1.5 d.

---

## Phase V5 — Baseline report & regression ratchet

1. `benchmarks/UPAHEAD_BENCHMARK_BASELINE.md`: headline metrics, per-stage verdicts,
   cross-referenced to audit `I0xx` findings (each annotated: caught-by-metric vs needs-dedicated-cert).
2. **Ratchet integration:** nightly CI replay of the frozen corpus against HEAD; fail on alarm
   breach. The legacy 100-item fixtures stay as a fast pre-commit smoke; the corpus replay is
   the authority. **Date-rot is solved structurally:** because the harness injects asOfDate
   from the corpus manifest, the frozen corpus never rots — the flaw that invalidated the 2024
   fixtures cannot recur.
3. **Refresh policy:** new corpus per quarter or after feed-registry/locale changes; judge
   prompt + model pinned in manifest; fresh ~50-item κ check per refresh.
4. **Remediation hook:** expected headline findings, given audit priors — date parsing
   (U9-2/U9-3 families), online-bypass leakage, JS↔Python parity — ordered by wrong-day rate
   and parity impact first, since both are product-defining for a planner.

**Exit gate:** baseline published; nightly replay cert green; refresh policy documented.
**Effort:** ~1 d.

---

## 3. Timeline summary

| Phase | Effort | Wall-clock notes |
|---|---|---|
| V0 Prereqs | absorbed in audit U0 (+0.5 d) | blocking |
| V1 Corpus capture | 1 d | +7 days unattended; start right after U0 |
| V2 Ground truth | 1.5 d + 3–5 h human | parallel with V3 |
| V3 Replay harness | 2 d | parallel with V1/V2 |
| V4 Metrics | 1.5 d | after V1–V3 |
| V5 Baseline + ratchet | 1 d | last |

≈ 7–8 working days effort; ~2.5 calendar weeks dominated by the 7-day capture.
Combined with the audit: ~3.5 calendar weeks to baseline + live ratchet. If run alongside the
Insight program, V1/B1 captures overlap on the calendar and the harness/labeling
infrastructure from Insight (judge framework, record schema, ratchet wiring) is reused —
the marginal cost of Up Ahead is roughly half of building it standalone.

## 4. Risks & mitigations

- **Degenerate week** (no organic alert/festival/campaign) → V1 acceptance checks force
  extension; cost is wall-clock only.
- **Judge weakness on date ambiguity** → deterministic-first date golds shrink the judged
  surface; κ gate catches the rest at calibration, pre-spend.
- **Dual-implementation drift mid-benchmark** (a prefetch code change during the 7-day
  capture) → manifest records workflow commit SHAs per cycle; replay pins both implementations
  to the freeze-time SHA.
- **Corpus size in repo** (~140 cycles of JSON) → compressed under `benchmarks/corpora/`;
  release-artifact fallback with in-repo manifest hashes, as in the Insight plan.
- **Online/offline matrix doubles replay cost** → acceptable: cycles are small and the
  projection is milliseconds-scale; matrix stays in nightly CI budget.

## 5. Decision log

| Decision | Choice | Rationale |
|---|---|---|
| Window length | 7 days (vs Insight 36h) | Equals the planner horizon; full item lifecycle + weekend parser flip observable |
| Ground truth | LLM-first + human calibration; **deterministic golds for explicit dates** | Dates have objective truth; judge reserved for genuine ambiguity — higher reliability at lower cost |
| Unit of labeling | per-item (pairs only for dedup) | Up Ahead has no clustering; classification/date/location are item-level tasks |
| Legacy fixtures | retained as smoke, demoted from authority | small, hand-made, date-rotted, self-confirming |
| asOfDate in every record | mandatory | relative-date labels are clock-functions; schema makes date-rot structurally impossible |
| Dual-mode + dual-implementation replay matrix | yes | online-bypass and JS↔Python parity are product-defining failure surfaces unique to Up Ahead |
