// U0 — Determinism & clock injection harness for the Up Ahead STATIC-HOST
// display projection (the path real GitHub-Pages users see):
//
//   public/data/up_ahead.json (Python prefetch: items[])
//     -> sanitizeUpAheadData()            [src/services/upAheadService.js]
//        -> transformPythonItemsToDisplay -> buildLegacyDisplayFromRanked
//     -> getVisibleUpAheadProjection()    [src/viewModels/useUpAheadPageViewModel.js]
//        -> per-tab visible arrays + upAheadEvidence + upAheadBriefing
//
// Both stages are re-run INSIDE every clocked iteration on purpose:
// sanitizeUpAheadData is itself clock-coupled (filterPastDatedDisplayItems,
// generateWeeklyPlan, lastUpdated), so freezing only the view-model layer would
// understate the coupling.
//
// Re-run:
//   TZ=Asia/Kolkata node_modules/.bin/vitest run --config audit/evidence/u0.vitest.config.ts
//   TZ=UTC          node_modules/.bin/vitest run --config audit/evidence/u0.vitest.config.ts
//
// Mirrors audit/evidence/a0_determinism.harness.test.ts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { describe, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/utils/storage.js';
import { sanitizeUpAheadData } from '../../src/services/upAheadService.js';
import { __upAheadPageViewModelInternalsForTest } from '../../src/viewModels/useUpAheadPageViewModel.js';

const { getVisibleUpAheadProjection } = __upAheadPageViewModelInternalsForTest;

const TZ = process.env.TZ || 'unset';
const FROZEN = path.resolve('audit/evidence/frozen/up_ahead_2026-06-24.json');
const FROZEN_SHA = '52e90023b5150af6ecc50193c616f1036524a5032e8bb13954173fcdc6f9d378';
const OUT = path.resolve(`audit/evidence/U0-run-projection.${TZ.replace(/[^A-Za-z0-9]+/g, '_')}.json`);
const PROGRESS = path.resolve(`audit/evidence/U0-progress.${TZ.replace(/[^A-Za-z0-9]+/g, '_')}.log`);
const N = 10;

// asOfDate used for the reproducibility runs: midday, far from any midnight in
// either TZ so the N=10 result is boundary-stable for an honest determinism read.
const REPRO_INSTANT = Date.parse('2026-06-24T12:00:00Z'); // 17:30 IST / 12:00 UTC

const sha = (v) => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
function log(line) { fs.appendFileSync(PROGRESS, `${new Date().toISOString()} ${line}\n`); }

function itemId(i) {
  return String(i?.id || i?.hiddenKey || i?.canonicalId || i?.link || i?.title || '').trim();
}
const TAB_KEYS = [
  'weatherAlerts', 'generalAlerts', 'civicAlerts', 'civicItems', 'combinedAlerts',
  'offerItems', 'onlineOffers', 'offlineOffers', 'movieCards', 'festivalCards',
  'eventItems', 'suggestedItems',
];

// Project to the MEANINGFUL, user-visible content surface. Deliberately excludes
// volatile timestamp fields (lastUpdated = new Date().toISOString()) so the hash
// reflects content reproducibility, not clock noise.
function project(vis) {
  const tabs = {};
  for (const k of TAB_KEYS) {
    const arr = Array.isArray(vis?.[k]) ? vis[k] : [];
    tabs[k] = { len: arr.length, ids: arr.map(itemId) };
  }
  const ev = vis?.upAheadEvidence || {};
  const br = vis?.upAheadBriefing || {};
  return {
    tabs,
    evidence: {
      score: ev.score ?? ev.evidenceScore ?? null,
      tier: ev.tier ?? ev.band ?? null,
      coveredCategories: ev.coveredCategories ?? null,
      populatedDays: ev.populatedDays ?? null,
    },
    briefing: {
      status: br.status ?? null,
      alertCount: br.alertCount ?? null,
      offerCount: br.offerCount ?? null,
      eventCount: br.eventCount ?? null,
      movieCount: br.movieCount ?? null,
      festivalCount: br.festivalCount ?? null,
      todayCount: br.todayCount ?? null,
      next72hCount: br.next72hCount ?? null,
      plannerReadyCount: br.plannerReadyCount ?? null,
    },
  };
}

// One full projection run from raw frozen bytes (re-parsed each time so no shared
// mutable state leaks between runs), through the clock-coupled static path.
function runOnce(rawText, settings) {
  const raw = JSON.parse(rawText);
  const data = sanitizeUpAheadData(raw);
  const vis = getVisibleUpAheadProjection({ data, settings });
  return project(vis);
}

describe(`U0 Up Ahead determinism harness (frozen up_ahead_2026-06-24.json, TZ=${TZ})`, () => {
  it(`N=${N} reproducibility + midnight straddle`, () => {
    fs.writeFileSync(PROGRESS, '');
    const rawText = fs.readFileSync(FROZEN, 'utf8');
    const fileSha = crypto.createHash('sha256').update(rawText).digest('hex');
    if (fileSha !== FROZEN_SHA) {
      log(`WARNING: frozen file sha mismatch expected=${FROZEN_SHA} got=${fileSha}`);
    }
    const settings = DEFAULT_SETTINGS;
    const locations = settings?.upAhead?.locations || [];
    log(`start TZ=${TZ} node=${process.version} locations=${JSON.stringify(locations)} fileSha=${fileSha.slice(0,16)}`);

    // ---- Variant 1: REAL clock, N runs (seconds apart) ----
    const realHashes = [];
    let firstReal = null;
    for (let i = 0; i < N; i++) {
      const proj = runOnce(rawText, settings);
      if (i === 0) firstReal = proj;
      const h = sha(proj);
      realHashes.push(h);
      log(`real run ${i} hash=${h}`);
    }

    // ---- Variant 2: FROZEN clock (vi fake timers pin new Date() AND Date.now()) ----
    const frozenHashes = [];
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(REPRO_INSTANT));
      for (let i = 0; i < N; i++) {
        const proj = runOnce(rawText, settings);
        frozenHashes.push(sha(proj));
        log(`frozen run ${i} hash=${frozenHashes[i]} clock=${new Date().toISOString()}`);
      }
    } finally {
      vi.useRealTimers();
    }

    // ---- Variant 3: midnight straddle in the ACTIVE TZ ----
    // localMidnight(June 25) computed with REAL timers so the process TZ governs it.
    const localMidnightJun25 = new Date(2026, 5, 25, 0, 0, 0, 0).getTime(); // local 00:00 in TZ
    const before = localMidnightJun25 - 5 * 60 * 1000; // 23:55 local Jun 24
    const after = localMidnightJun25 + 5 * 60 * 1000;  // 00:05 local Jun 25

    let projBefore = null;
    let projAfter = null;
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(before));
      projBefore = runOnce(rawText, settings);
      log(`straddle BEFORE clock=${new Date().toISOString()} (local ${new Date(before).toString()})`);
      vi.setSystemTime(new Date(after));
      projAfter = runOnce(rawText, settings);
      log(`straddle AFTER  clock=${new Date().toISOString()} (local ${new Date(after).toString()})`);
    } finally {
      vi.useRealTimers();
    }

    // Diff the two straddle projections at the tab-count + briefing level.
    const straddleDiff = {};
    for (const k of TAB_KEYS) {
      const b = projBefore.tabs[k].len;
      const a = projAfter.tabs[k].len;
      const idsB = projBefore.tabs[k].ids;
      const idsA = projAfter.tabs[k].ids;
      const dropped = idsB.filter((id) => !idsA.includes(id));
      const added = idsA.filter((id) => !idsB.includes(id));
      if (b !== a || dropped.length || added.length) {
        straddleDiff[k] = { lenBefore: b, lenAfter: a, dropped, added };
      }
    }
    const briefingDiff = {};
    for (const key of Object.keys(projBefore.briefing)) {
      if (projBefore.briefing[key] !== projAfter.briefing[key]) {
        briefingDiff[key] = { before: projBefore.briefing[key], after: projAfter.briefing[key] };
      }
    }

    const uniqReal = [...new Set(realHashes)];
    const uniqFrozen = [...new Set(frozenHashes)];
    const out = {
      harness: 'U0 Up Ahead static-host display projection',
      snapshot: 'audit/evidence/frozen/up_ahead_2026-06-24.json',
      contentHash: `sha256:${fileSha}`,
      tz: TZ,
      node: process.version,
      N,
      locations,
      reproInstantUtc: new Date(REPRO_INSTANT).toISOString(),
      realClock: { hashes: realHashes, uniqueCount: uniqReal.length, identical: uniqReal.length === 1 },
      frozenClock: {
        fixedInstantUtc: new Date(REPRO_INSTANT).toISOString(),
        hashes: frozenHashes, uniqueCount: uniqFrozen.length, identical: uniqFrozen.length === 1,
      },
      realVsFrozenSame: uniqReal.length === 1 && uniqFrozen.length === 1 && uniqReal[0] === uniqFrozen[0],
      midnightStraddle: {
        tz: TZ,
        beforeUtc: new Date(before).toISOString(),
        afterUtc: new Date(after).toISOString(),
        localMidnightUtc: new Date(localMidnightJun25).toISOString(),
        changed: Object.keys(straddleDiff).length > 0 || Object.keys(briefingDiff).length > 0,
        tabDiff: straddleDiff,
        briefingDiff,
      },
      firstProjectionSample: {
        tabs: Object.fromEntries(Object.entries(firstReal.tabs).map(([k, v]) => [k, v.len])),
        briefing: firstReal.briefing,
        evidence: firstReal.evidence,
      },
    };
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
    log(`DONE realIdentical=${out.realClock.identical} frozenIdentical=${out.frozenClock.identical} straddleChanged=${out.midnightStraddle.changed}`);
  }, 120000);
});
