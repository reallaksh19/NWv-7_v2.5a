import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ALERT_FALLBACK_HOURS,
  NEWS_RETAIN_HOURS,
  OFFER_FALLBACK_HOURS,
  PLANNER_PAST_GRACE_HOURS,
  UPAHEAD_EVENT_PAST_GRACE_HOURS,
  UPAHEAD_LOOKAHEAD_DAYS,
} from '../src/config/horizonPolicy.js';

const pyPath = path.join(process.cwd(), 'scripts', 'horizon_policy.py');
const py = fs.readFileSync(pyPath, 'utf8');

function readPyConst(name) {
  const match = py.match(new RegExp(`^${name}\\s*=\\s*(\\d+)`, 'm'));
  assert(match, `missing Python constant ${name}`);
  return Number(match[1]);
}

assert.equal(NEWS_RETAIN_HOURS, readPyConst('NEWS_RETAIN_HOURS'));
assert.equal(UPAHEAD_LOOKAHEAD_DAYS, readPyConst('UPAHEAD_LOOKAHEAD_DAYS'));
assert.equal(UPAHEAD_EVENT_PAST_GRACE_HOURS, readPyConst('UPAHEAD_EVENT_PAST_GRACE_HOURS'));
assert.equal(PLANNER_PAST_GRACE_HOURS, readPyConst('PLANNER_PAST_GRACE_HOURS'));
assert.equal(ALERT_FALLBACK_HOURS, readPyConst('ALERT_FALLBACK_HOURS'));
assert.equal(OFFER_FALLBACK_HOURS, readPyConst('OFFER_FALLBACK_HOURS'));

console.log('horizon constants match Python/JS mirrors');
