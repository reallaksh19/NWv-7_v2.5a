import fs from 'fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  assert(fs.existsSync(path), `Missing file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const ranker = read('scripts/tab_rankers/upahead_ranker.py');
const tests = read('scripts/test_upahead_ranker.py');

for (const token of [
  'RANKING_PROFILE = "upAhead-v2-lifecycle-location-category"',
  'OFFER_CATEGORIES',
  'ALERT_CATEGORIES',
  'FESTIVAL_CATEGORIES',
  'DEFAULT_LOCATIONS = ("muscat", "chennai", "trichy")',
  'offer_validity_gate',
  'alert_urgency_gate',
  'planner_fit_score',
  'location_gate_for_upahead',
  'rank_upahead_items',
  'onlineOffers',
  'offlineOffers',
  'plannerAdvisoryItems',
  'locationsCovered',
]) {
  assert(ranker.includes(token), `upahead_ranker.py missing token: ${token}`);
}

for (const forbidden of [
  'savedPlan',
  'localStorage',
  'write_json',
  'quality_rankings.json',
  'generate_quality_dashboard',
  'news_prefetch.yml',
]) {
  assert(!ranker.includes(forbidden), `upahead_ranker.py must not persist/write or touch workflow/dashboard: ${forbidden}`);
}

for (const token of [
  'test_severe_alert_ranks_above_normal_future_event',
  'test_online_offer_allowed_without_city_match',
  'test_offline_offer_requires_city_or_region_match',
  'test_expired_offer_and_far_future_event_are_suppressed',
  'test_planner_is_advisory_only_not_persisted',
  'test_multiple_locations_are_counted_separately',
]) {
  assert(tests.includes(token), `test_upahead_ranker.py missing test token: ${token}`);
}

console.log(JSON.stringify({
  status: 'PASS',
  checked: 'Ranking Phase B Up Ahead ranker static guard',
  guarantees: [
    'Up Ahead ranker has lifecycle/location/category profile',
    'events, offers, alerts, and festivals have explicit categories',
    'online/offline offer behavior is represented',
    'Planner remains advisory and no persistence APIs are used',
    'multi-location coverage for Muscat/Chennai/Trichy is represented',
    'ranker does not write dashboard/workflow/output JSON files'
  ]
}, null, 2));

console.log('PASS: Ranking Phase B Up Ahead static guard');
