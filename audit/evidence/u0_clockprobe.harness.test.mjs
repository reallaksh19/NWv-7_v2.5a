// U0 — clock/timezone-coupling probe.
//
// Purpose: U0 must "explain or ticket" midnight-IST date drift. The frozen
// snapshot's visible tabs are dominated by dateless, duration-age-capped items,
// so a ±5min midnight straddle does NOT move them (see u0_determinism harness).
// This probe instead exercises the REAL date-key functions on a single
// near-midnight IST event to demonstrate the U9-3-class coupling directly and
// hand a concrete, replayable case to U2.3 / U2.8.
//
// Two date-key conventions coexist in the codebase:
//   (A) static display path  -> transformPythonItemsToDisplay():
//         eventDateKey = new Date(eventStartAt).toISOString().slice(0,10)  => UTC calendar day (TZ-independent)
//   (B) planner / dateAware  -> toLocalDateKey():                          => process-LOCAL calendar day (TZ-dependent)
//
// For an event at 02:00 IST on 2026-06-26 (== 2026-06-25T20:30:00Z) the two
// conventions name DIFFERENT days under the intended production TZ (Asia/Kolkata).
//
// Re-run (same command as the determinism harness):
//   TZ=Asia/Kolkata node_modules/.bin/vitest run --config audit/evidence/u0.vitest.config.ts
//   TZ=UTC          node_modules/.bin/vitest run --config audit/evidence/u0.vitest.config.ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, vi } from 'vitest';
import { sanitizeUpAheadData } from '../../src/services/upAheadService.js';
import { toLocalDateKey } from '../../src/utils/dateKey.js';

const TZ = process.env.TZ || 'unset';
const OUT = path.resolve(`audit/evidence/U0-clockprobe.${TZ.replace(/[^A-Za-z0-9]+/g, '_')}.json`);

// 02:00 IST on 2026-06-26 == 2026-06-25T20:30:00Z. IST day = Jun 26; UTC day = Jun 25.
const EVENT_UTC = Date.parse('2026-06-25T20:30:00Z');
const NOW_UTC = Date.parse('2026-06-20T12:00:00Z'); // fixed "now"; event is future so survives past-date filter

describe(`U0 clock/timezone coupling probe (TZ=${TZ})`, () => {
  it('date-key conventions diverge by path and by TZ for a near-midnight IST event', () => {
    let staticKey = null;
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(NOW_UTC));
      const synthItem = {
        id: 'synth-near-midnight',
        title: 'Late-night IST concert',
        summary: 'probe',
        url: 'https://example.test/probe',
        source: 'Probe',
        category: 'events',
        publishedAt: NOW_UTC,
        eventStartAt: EVENT_UTC,
        eventEndAt: null,
        city: 'Chennai',
        plannerEligible: true,
        displayEligible: true,
      };
      // Real static-host transform (Python items[] schema -> display).
      const result = sanitizeUpAheadData({ schemaVersion: 1, items: [synthItem] });
      staticKey = result?.timeline?.[0]?.date
        || result?.sections?.events?.[0]?.date
        || null;
    } finally {
      vi.useRealTimers();
    }

    // The planner / dateAware convention for the SAME instant.
    const plannerKey = toLocalDateKey(new Date(EVENT_UTC));

    const out = {
      probe: 'date-key convention divergence (U9-3 class)',
      tz: TZ,
      node: process.version,
      eventUtc: new Date(EVENT_UTC).toISOString(),
      eventLocalString: new Date(EVENT_UTC).toString(),
      // (A) static display path — toISOString().slice(0,10): expected UTC day, TZ-independent
      staticDisplayKey_via_sanitizeUpAheadData: staticKey,
      // (B) planner/dateAware path — toLocalDateKey(): process-local day, TZ-dependent
      plannerKey_via_toLocalDateKey: plannerKey,
      keysAgree: staticKey === plannerKey,
    };
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  });
});
