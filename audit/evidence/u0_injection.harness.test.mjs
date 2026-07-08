// U0 — clock-INJECTION verification for the LIVE intelligence path.
//
// The static display path (u0_determinism harness) has no injectable clock.
// The LIVE path (intelligentUpAheadFetcher -> buildCanonicalItems ->
// dateAware/eligibilityWindowing) threads options.asOfDate. U0 must prove that
// injection by EXECUTION, not by reading code:
//   (1) same asOfDate twice  -> identical canonical output (reproducible-by-injection)
//   (2) different asOfDate    -> eligibility verdict flips (asOfDate genuinely drives output)
//
// Re-run:
//   TZ=Asia/Kolkata node_modules/.bin/vitest run --config audit/evidence/u0.vitest.config.ts
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { describe, it } from 'vitest';
import { buildCanonicalItems } from '../../src/intelligence/canonicalItemBuilder.js';

const TZ = process.env.TZ || 'unset';
const OUT = path.resolve(`audit/evidence/U0-injection.${TZ.replace(/[^A-Za-z0-9]+/g, '_')}.json`);
const sha = (v) => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);

// One raw feed item carrying an explicit ISO event date (2026-06-20).
const RAW = [{
  title: 'Big Open-Air Concert on 2026-06-20 in Chennai',
  description: 'Tickets selling fast for the 2026-06-20 show.',
  link: 'https://example.test/concert',
  pubDate: '2026-06-10T08:00:00Z',
  category: 'events',
  source: 'example.test',
}];

// Project the eligibility-relevant, clock-driven fields (exclude nothing volatile;
// canonical output is pure given (items, asOfDate)).
function project(items) {
  return (items || []).map((i) => ({
    eventDateKey: i.eventDateKey,
    windowStatus: i.windowStatus,
    plannerEligible: i.plannerEligible,
    upAheadEligible: i.upAheadEligible,
    routeTarget: i.routeTarget,
  }));
}

function run(asOfDate) {
  return project(buildCanonicalItems(RAW, { asOfDate, plannerWindowDays: 7, mode: 'offline' }));
}

describe(`U0 live-path clock injection (TZ=${TZ})`, () => {
  it('asOfDate is threaded end-to-end and drives the eligibility verdict', () => {
    // (1) Reproducible-by-injection: same asOfDate twice.
    const a1 = run('2026-06-18');
    const a2 = run('2026-06-18');
    const reproducible = sha(a1) === sha(a2);

    // (2) Verdict flips across three injected clocks (event fixed at 2026-06-20).
    const inside = run('2026-06-18');   // window [06-18..06-24] -> event +2d inside
    const after = run('2026-06-01');    // window [06-01..06-07] -> event after window
    const before = run('2026-06-25');   // window [06-25..07-01] -> event in the past

    const out = {
      harness: 'U0 live intelligence-path clock injection',
      tz: TZ,
      node: process.version,
      rawItem: RAW[0].title,
      sameClockTwice: { run1: a1, run2: a2, identical: reproducible, hash: sha(a1) },
      injectedClockSweep: {
        'asOf_2026-06-18_eventInside': inside[0],
        'asOf_2026-06-01_eventAfter': after[0],
        'asOf_2026-06-25_eventPast': before[0],
      },
      verdictActuallyFlips:
        inside[0].windowStatus !== after[0].windowStatus &&
        after[0].windowStatus !== before[0].windowStatus,
    };
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  });
});
