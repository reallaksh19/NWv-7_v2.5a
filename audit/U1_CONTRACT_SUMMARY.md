# Phase U1 — Contract & Config Audit — Summary

**Status: PASS with findings. Exit gate MET.**
Scope: Up Ahead keyword tables, thresholds, feed registry, location library, dedup/campaign
config, MODE_MATRIX claims. Method: invariants-first, then mechanical scan / value reconciliation
on frozen config at git HEAD. All config audited here is **clock-invariant** (verdicts do not
depend on a reference date); the one clock site found in config is noted under I012.

## Verdicts by target

| Check | Target | Verdict | Issue |
|---|---|---|---|
| U1.1-KWD-01 | Keyword-list integrity (U9-2 class) | **FAIL** (small itemized set) | I014 |
| U1.2-THR-01 | Threshold single-source-of-truth | **FAIL** (1 drift) | I015 |
| U1.3-FEED-01 | Feed registry coverage + P005 trust filter | **PASS** (P005 clear) + finding | I016 |
| U1.4-LOC-01 | Location alias collision risk | **FAIL** (1 confirmed) + UNVERIFIED tail | I018 |
| U1.5-DDP-01 | Dedup thresholds + campaign regexes | **PASS** + 2 undocumented knobs | I017 |
| U1.6-MODE-01 | MODE_MATRIX claims vs code | **PASS** + comment drift | I017 |

Invariant tally: 3 FAIL, 3 PASS-with-findings. 0 UNVERIFIED at the config layer (one UNVERIFIED
*tail* in U1.4 is deliberately deferred to U2.4 where the match ladder executes).

## The two results that change later phases

1. **The matcher is safer than the plan assumed (U1.1).** Classification does NOT use pure
   `includes()`. Single-word keywords match on word boundaries (`\bword\b`); only multi-word
   phrases use substring `includes()` (classification.js:9-39). The mechanical scan proves 7
   feared single-token substring pairs are inert (holi/holiday, review/preview, schedule/scheduled,
   premiere/premieres, prediction/predictions, review/reviewed, review/reviews). **The U9-2
   "keyword fragility" risk is therefore smaller and more localized than the walkthrough implied** —
   it reduces to: 1 intra-category exact contradiction (`webinar`), 1 positive-vs-global
   contradiction on a safety category (`fog` in weather alerts), 1 dead global negative
   (`launches`, always signal-stripped), 1 cross-category exact tie (`trade fair`), and 7
   multi-word cross-category co-fire leaks. This is the **keyword-collision report the exit gate
   requires** and the direct input to U2.2's "how many real items flip" measurement.

2. **The enforced planner-recall gate is 10 points below the documented one (U1.2).** P004 of
   record says offline planner recall ≥ 0.75; the benchmark enforces 0.65 (the 0.75 in code is
   `upAheadRecall`). Until reconciled, a planner-recall regression into [0.65, 0.75) is invisible
   to CI — and the benchmark baseline U3 establishes inherits whichever number wins. **This must
   be resolved before any planner-recall number is trusted.**

## Top risk

I014 (weather-`fog` suppression + dead `launches` negative) and I015 (planner-recall gate drift)
are the Medium items. Neither is catastrophic, but both silently weaken correctness/CI on
user-facing surfaces (weather alerts; planner). Everything else is Low/Info.

## P005 closure contribution

P005's trust-filter regression is **VERIFIED-NOT-PRESENT**: every registry feed is `trust:'high'`
(Agent-10 elevation, WI_Agent10:31) AND the static-host filter was loosened from the regressing
`priorityScore>=3 || trust==='high'`,`slice(2)` (Agent-10:21) to `>=2 || !=='low'`,`slice(3)`.
Events (1 feed/loc) and Shopping (1-2/loc) cannot be emptied. Full P005 closure (explicit
status-flag rendering) remains a U3/MODE item.

## Handoffs

- **→ U2.2 (classification):** `audit/evidence/U1-keyword-collision-report.json` is the collision
  list to drive the real-data category-flip measurement (I014). Re-run with
  `node audit/evidence/u1_keyword_collision_scan.mjs`.
- **→ U2.4 (location):** `U1.4-LOC-01` alias catalogue — execute the `cantonment` /
  short-alias / `nagar` / `al hail` probes against the locationAware 1.0/0.95/0.82 ladder vs the
  falseLocationAcceptance 0.05 gate (I018).
- **→ U2.5 (dedup):** confirm whether `strongTokenOverlapThreshold 0.52` (undocumented, ≈ the
  0.50 normal rung) ever changes a merge decision; test the documented stack vs duplicateLeakRate
  0.03 (I017 knobs).
- **→ U3 (closure):** P004 planner-recall reconciliation (I015); P005 trust-filter clear
  recorded; U9-2 re-scoped by I014.
- **→ U4 (data layer):** civic/Trichy coverage gap yield (I016); upahead_refresh actual cadence
  vs the "5x/day" comment (I017); per-feed health.
- **→ U6:** reconcile plan locators + cache-cadence comment (I017).
- **→ I012 (U0):** `feedSourceRegistry.js:3 CURRENT_YEAR = new Date().getFullYear()` is an
  additional module-load clock site (shapes search-query year) — folded into the I012 catalogue.

## Reproduce

```
node audit/evidence/u1_keyword_collision_scan.mjs    # regenerates U1-keyword-collision-report.json
```
All other U1 checks are static value comparisons documented file:line in the evidence YAMLs
(U1.1-U1.6); a reviewer can re-derive every verdict from the cited source lines without a clock.
