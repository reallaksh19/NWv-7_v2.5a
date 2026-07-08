# Phase U0 — Determinism & clock injection (Up Ahead): VERDICT = PASS (with 2 findings)

Date: 2026-06-24 · Auditor role: Quality & Verification (no-fix)
Entry gate: none (U0 is the root prerequisite). Exit gate: **MET**.
Plan: `audit/UPAHEAD_AUDIT_PLAN.md` §U0.

## Invariants (written before inspection)
1. The full projection (raw items → visible per-tab arrays) is byte-reproducible for a
   fixed (input snapshot, reference date).
2. The reference date is injectable **end-to-end** — every consumer threads it; any direct
   `new Date()`/`Date.now()` is a finding.
3. A midnight-IST straddle diff is explained or ticketed (U9-3-class date-key drift).

## How (foolproof / grounded / replayable)
- **Frozen input:** `audit/evidence/frozen/up_ahead_2026-06-24.json` — sha256
  `52e90023b5150af6…`, 92-item Python-prefetch schema. Travel-local-{chennai,muscat,
  trichy,colombo} also frozen with hashes. Never the live `public/data/*` the hourly CI rewrites.
- **Harnesses** (vitest, isolated config `audit/evidence/u0.vitest.config.ts`, re-run:
  `TZ=Asia/Kolkata node_modules/.bin/vitest run --config audit/evidence/u0.vitest.config.ts`,
  and again with `TZ=UTC`):
  - `u0_determinism.harness.test.mjs` — N=10 real-clock + N=10 frozen-clock projections of
    the static-host chain `sanitizeUpAheadData → getVisibleUpAheadProjection`, plus a ±5min
    midnight straddle. Clock pinned with vitest fake timers (both `new Date()` and `Date.now()`).
  - `u0_injection.harness.test.mjs` — drives the LIVE path `buildCanonicalItems({asOfDate})`
    to prove asOfDate is threaded and drives the verdict.
  - `u0_clockprobe.harness.test.mjs` — runs one near-midnight IST event through the static
    transform vs `toLocalDateKey` to expose the date-key convention divergence.
- **Catalogue:** `audit/evidence/U0.3-CLOCK-CATALOGUE.md` — every clock site on the U0 surface
  classified injected / injectable / hardwired.

## Result (by execution)
| Check | Surface | Result | Verdict |
|---|---|---|---|
| U0.1-DET-01 | static display projection | N=10 real & frozen identical (`ec4a31491a6492d9`), real==frozen, **same hash under both TZ** | **PASS** |
| U0.2-INJ-01 | live intelligence path | same asOfDate → identical; sweep flips `inside→after→before_window` | **PASS** |
| U0.3-CLK-01 | clock injectability | live path injected/injectable; **static path hardwired (13+ sites, no asOfDate param)** | **FAIL → I012 (Low)** |
| U0.4-TZ-01 | date-key convention | static UTC-day `2026-06-25` vs planner local-day `2026-06-26` for a 02:00-IST event (keysAgree:false under IST) | **FAIL → I013 (Medium)** |
| U0.5-MID-01 | midnight straddle | no tab-level change (dateless duration-capped items; calendar surfaces out of this projection) | **PASS** (risk routed to I013) |

Machine outputs: `audit/evidence/U0-run-projection.{Asia_Kolkata,UTC}.json`,
`U0-injection.*.json`, `U0-clockprobe.*.json`; logs `U0-progress.*.log`.

## Findings
- **I012 (Low):** the static-host display projection — the path most deployed users hit
  (`upAheadMode: limited-live`, MODE_MATRIX:29) — has **no injectable reference clock**.
  Production browser runs are deterministic given the wall clock (no user impact), but
  audit/benchmark replay at a dated reference needs a global clock shim. Mirrors A0/I004,
  broader scope. The LIVE path's asOfDate injection is sound and execution-verified.
- **I013 (Medium):** **two date-key conventions diverge by a day** — static display uses
  `toISOString().slice(0,10)` (UTC day); planner/dateAware use `toLocalDateKey` (local day).
  For events timed 00:00–05:29 IST they name different days → wrong-day placement on the
  product's core surface; contradicts MODE_MATRIX:56. Full verdict handed to U2.3/U2.8;
  JS↔Python convention parity to U2.7.

## Honesty notes
- **U0.5 (midnight straddle) is a clean PASS only because the current snapshot is dominated by
  dateless, duration-age-capped items.** A snapshot with real dated events near midnight would
  move tabs; the calendar-coupled surfaces (`timeline`/`weekly_plan` day labels) are not in
  `getVisibleUpAheadProjection`'s output and were not hashed here — they belong to U2.6/U2.8.
  The genuine midnight risk is I013, demonstrated directly rather than via the tab diff.
- **The live-path reproducibility is verified at the `buildCanonicalItems` unit, not the full
  networked `fetchIntelligentUpAheadData`** (which needs the proxy/feeds). End-to-end live
  determinism is therefore UNVERIFIED at U0 and inherited by U2.1/U2.7.
- **Node-version byte-identity UNVERIFIED:** ran Node v22.22.2; `upahead_refresh.yml` runner
  Node version unconfirmed (same residual as A0).

## Gate handoff
**U0 EXIT GATE MET.** Reproducible (snapshot, clock) established; every clock site catalogued
and classified; midnight diff explained (U0.5) and the real drift ticketed (I013).
**U1, U2.x, U3, U4 are now unblocked** (U5 needs U2 evidence; U6 closes). The frozen snapshot +
fake-timer harness pattern here is the substrate U2/U5 reuse; I012 is the input to the
benchmark's replay decision; I013 feeds U2.3/U2.7/U2.8.
