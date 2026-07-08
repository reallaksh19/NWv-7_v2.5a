/**
 * U1.1 — Keyword-list integrity scanner (Up Ahead Contract & Config audit)
 *
 * Models the ACTUAL shipped matcher from src/intelligence/classification.js:9-39:
 *   - multi-word keyword (contains a space) -> substring `String.includes()`
 *   - single-word keyword                   -> word-boundary regex `\bword\b`
 * The plan §U1 premise ("includes() matching means 'launches' hits 'launch'") is
 * therefore only true for multi-word phrases; single tokens are boundary-matched.
 * This scanner proves which collisions are REAL under the shipped matcher.
 *
 * Source of truth: src/config/settings_upahead.js (wired into classification via
 * storage.js:142 `upAhead: DEFAULT_UPAHEAD_SETTINGS`; classification.js:2 imports it).
 *
 * Reproduce: `node audit/evidence/u1_keyword_collision_scan.mjs`
 * Emits: audit/evidence/U1-keyword-collision-report.json  (machine, deterministic)
 *        prints a human summary to stdout.
 *
 * NO clock/mode dependence: keyword tables are static config; verdict is host/clock
 * invariant (mode cell: { mode: n/a, host: both, locale: n/a }).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DEFAULT_UPAHEAD_SETTINGS as S } from '../../src/config/settings_upahead.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- exact replica of classification.js matcher ----------------------------
function matchKeyword(textLower, keyword) {
  const normalized = String(keyword || '').trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes(' ')) {
    return textLower.includes(normalized);
  }
  const re = new RegExp(`\\b${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return re.test(textLower);
}
// Does the LITERAL TEXT of keyword `a` cause keyword `b` to fire? (co-trigger)
const coFires = (a, b) => matchKeyword(String(a).toLowerCase(), b);

// ---- keyword inventory -----------------------------------------------------
const CATS = ['movies', 'events', 'festivals', 'alerts', 'sports', 'shopping', 'civic', 'weather_alerts', 'airlines'];
const kw = S.keywords;
const positives = Object.fromEntries(CATS.map(c => [c, (kw[c] || []).map(x => x.toLowerCase())]));
const catNegatives = Object.fromEntries(CATS.map(c => [c, (kw[`${c}_negative`] || []).map(x => x.toLowerCase())]));
const globalNeg = (kw.negative || []).map(x => x.toLowerCase());
const signals = (S.signals || []).map(x => x.toLowerCase());
const signalSet = new Set(signals);

const norm = arr => [...new Set(arr.map(x => x.trim().toLowerCase()).filter(Boolean))];

// ---- CLASS 1: intra-category contradiction (positive also trips own negative)
const class1_exact = [];        // exact membership: P in positives[C] AND P in catNegatives[C]
const class1_cofire = [];       // P present -> some own-negative fires (and != exact)
for (const c of CATS) {
  for (const p of norm(positives[c])) {
    if (catNegatives[c].includes(p)) class1_exact.push({ category: c, term: p });
    for (const n of norm(catNegatives[c])) {
      if (n === p) continue;
      if (coFires(p, n)) class1_cofire.push({ category: c, positive: p, firesOwnNegative: n });
    }
  }
}

// ---- CLASS 2: positive vs GLOBAL negative ----------------------------------
// Account for removeScheduleSignalNegatives: a global negative whose exact string
// is in `signals` is stripped before scoring, so it is NOT an effective contradiction.
const class2_exact = [];
const class2_cofire = [];
for (const c of CATS) {
  for (const p of norm(positives[c])) {
    if (globalNeg.includes(p)) {
      class2_exact.push({ category: c, term: p, signalStripped: signalSet.has(p) });
    }
    for (const n of norm(globalNeg)) {
      if (n === p) continue;
      if (coFires(p, n)) {
        class2_cofire.push({ category: c, positive: p, firesGlobalNegative: n, signalStripped: signalSet.has(n) });
      }
    }
  }
}

// ---- CLASS 3: cross-category positive collision ----------------------------
// term that is a positive in 2+ categories (exact), OR positive A co-fires positive B
// in a different category (ambiguity that splits the score between categories).
const class3_exactMulti = [];   // same string in >=2 positive lists
const allPos = new Map();       // term -> [categories]
for (const c of CATS) for (const p of norm(positives[c])) {
  if (!allPos.has(p)) allPos.set(p, []);
  allPos.get(p).push(c);
}
for (const [term, cats] of allPos) if (cats.length >= 2) class3_exactMulti.push({ term, categories: cats });

const class3_cofire = [];       // text=A (cat c1 positive) fires B (cat c2 positive), c1!=c2
const seen3 = new Set();
for (const c1 of CATS) for (const a of norm(positives[c1])) {
  for (const c2 of CATS) {
    if (c2 === c1) continue;
    for (const b of norm(positives[c2])) {
      if (a === b) continue;            // exact handled by class3_exactMulti
      if (coFires(a, b)) {
        const k = `${c1}:${a}=>${c2}:${b}`;
        if (!seen3.has(k)) { seen3.add(k); class3_cofire.push({ fromCategory: c1, trigger: a, firesCategory: c2, firedPositive: b }); }
      }
    }
  }
}

// ---- CLASS 4: dead global negatives (always stripped because == a signal) ---
const class4_deadGlobalNeg = norm(globalNeg).filter(n => signalSet.has(n));

// ---- CLASS 5: U9-2 premise mitigation — substring pairs neutralized by \b ---
// single-word pairs where `a` is a strict substring of `b` but boundary matching
// means text=b does NOT fire a (e.g. 'launch' vs 'launches'). Documents that the
// feared substring collision class does NOT occur for single tokens.
const allSingle = norm([...Object.values(positives).flat(), ...Object.values(catNegatives).flat(), ...globalNeg, ...signals])
  .filter(t => !t.includes(' '));
const class5_neutralized = [];
for (const a of allSingle) for (const b of allSingle) {
  if (a === b || !b.includes(a)) continue;     // a is substring of b
  if (!coFires(b, a)) class5_neutralized.push({ substring: a, container: b, neutralizedBy: 'word-boundary' });
}

// ---- effective intra-category positives that self-cancel -------------------
// positive P where its net contribution can be <=0 because it also fires its own
// or an unstripped global negative (the operational harm of class1/class2 cofire).
const selfCancelling = [];
for (const c of CATS) for (const p of norm(positives[c])) {
  let neg = 0;
  for (const n of norm(catNegatives[c])) if (n !== p && coFires(p, n)) neg += 1.0;
  for (const n of norm(globalNeg)) if (n !== p && coFires(p, n) && !signalSet.has(n)) neg += 0.65;
  const net = 1 - neg;
  if (net <= 0) selfCancelling.push({ category: c, positive: p, netScoreOnLoneMatch: Number(net.toFixed(2)) });
}

const report = {
  generated: 'deterministic (no clock/mode dependence)',
  source_of_truth: 'src/config/settings_upahead.js (DEFAULT_UPAHEAD_SETTINGS.keywords); matcher: src/intelligence/classification.js:9-39',
  matcher_model: 'single-word -> \\bword\\b regex; multi-word -> substring includes()',
  counts: {
    categories: CATS.length,
    positivesTotal: Object.values(positives).reduce((a, x) => a + x.length, 0),
    globalNegatives: globalNeg.length,
    signals: signals.length,
  },
  class1_intraCategory_exact: class1_exact,
  class1_intraCategory_cofire: class1_cofire,
  class2_positiveVsGlobal_exact: class2_exact,
  class2_positiveVsGlobal_cofire: class2_cofire,
  class3_crossCategory_exactInMultiplePositiveLists: class3_exactMulti,
  class3_crossCategory_cofire: class3_cofire,
  class4_deadGlobalNegatives_strippedBySignals: class4_deadGlobalNeg,
  class5_substringPairs_neutralizedByWordBoundary: class5_neutralized,
  selfCancellingPositives_netScore_LE_0: selfCancelling,
};

const outPath = path.join(__dirname, 'U1-keyword-collision-report.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));

// ---- human summary ----------------------------------------------------------
const n = arr => arr.length;
console.log('=== U1.1 Keyword-collision scan ===');
console.log(`matcher: ${report.matcher_model}`);
console.log(`positives total: ${report.counts.positivesTotal}, global negatives: ${report.counts.globalNegatives}, signals: ${report.counts.signals}`);
console.log(`CLASS1 intra-category exact (positive == own negative): ${n(class1_exact)}`, class1_exact);
console.log(`CLASS1 intra-category co-fire: ${n(class1_cofire)}`, class1_cofire);
console.log(`CLASS2 positive vs GLOBAL negative exact: ${n(class2_exact)}`);
for (const x of class2_exact) console.log(`   - ${x.category}: "${x.term}"  signalStripped=${x.signalStripped}`);
console.log(`CLASS2 positive vs GLOBAL negative co-fire (effective, NOT signal-stripped): ${class2_cofire.filter(x => !x.signalStripped).length}`);
for (const x of class2_cofire.filter(x => !x.signalStripped)) console.log(`   - ${x.category} positive "${x.positive}" fires global negative "${x.firesGlobalNegative}"`);
console.log(`CLASS3 same term in >=2 positive lists: ${n(class3_exactMulti)}`);
for (const x of class3_exactMulti) console.log(`   - "${x.term}" in [${x.categories.join(', ')}]`);
console.log(`CLASS3 cross-category co-fire pairs: ${n(class3_cofire)} (see JSON)`);
console.log(`CLASS4 DEAD global negatives (stripped by signals, never contribute): ${n(class4_deadGlobalNeg)}`, class4_deadGlobalNeg);
console.log(`CLASS5 substring pairs neutralized by word-boundary (U9-2 premise mitigated): ${n(class5_neutralized)} (see JSON)`);
console.log(`SELF-CANCELLING positives (net <=0 on a lone positive match): ${n(selfCancelling)}`);
for (const x of selfCancelling) console.log(`   - ${x.category}: "${x.positive}" net=${x.netScoreOnLoneMatch}`);
console.log(`\nwrote ${path.relative(path.join(__dirname, '../..'), outPath)}`);
