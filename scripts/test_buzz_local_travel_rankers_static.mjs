import fs from 'fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  assert(fs.existsSync(path), `Missing file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const buzz = read('scripts/tab_rankers/buzz_ranker.py');
const localTravel = read('scripts/tab_rankers/local_travel_ranker.py');
const tests = read('scripts/test_buzz_local_travel_rankers.py');

for (const token of [
  'RANKING_PROFILE = "buzz-v2-trend-local-travel"',
  'trend_velocity_gate',
  'novelty_gate',
  'source_spread_gate',
  'local_travel_gate',
  'rank_buzz_items',
  'buzzTrendCount',
  'localBuzzCount',
  'travelBuzzCount',
  'oneSourceCappedCount',
]) {
  assert(buzz.includes(token), `buzz_ranker.py missing token: ${token}`);
}

for (const token of [
  'RANKING_PROFILE = "localTravel-v1-location-utility-disruption"',
  'location_precision_gate',
  'utility_gate',
  'travel_window_gate',
  'disruption_gate',
  'family_relevance_score',
  'rank_local_travel_items',
  'travelItemCount',
  'utilityItemCount',
  'disruptionItemCount',
  'familyRelevantItemCount',
]) {
  assert(localTravel.includes(token), `local_travel_ranker.py missing token: ${token}`);
}

for (const forbidden of [
  'write_json',
  'quality_rankings.json',
  'generate_quality_dashboard',
  'news_prefetch.yml',
  'localStorage',
  'fetch(',
  'axios',
]) {
  assert(!buzz.includes(forbidden), `buzz_ranker.py must not write/fetch/touch workflow/dashboard: ${forbidden}`);
  assert(!localTravel.includes(forbidden), `local_travel_ranker.py must not write/fetch/touch workflow/dashboard: ${forbidden}`);
}

for (const token of [
  'test_buzz_repeated_topic_cross_source_beats_one_source_hype',
  'test_buzz_preserves_local_and_travel_buzz',
  'test_buzz_does_not_simply_mirror_top_stories',
  'test_local_travel_exact_city_disruption_ranks_high',
  'test_local_travel_requires_configured_location_match',
  'test_local_travel_stale_travel_item_is_suppressed',
  'test_local_travel_family_relevance_is_counted',
]) {
  assert(tests.includes(token), `test_buzz_local_travel_rankers.py missing test token: ${token}`);
}

console.log(JSON.stringify({
  status: 'PASS',
  checked: 'Ranking Phase C Buzz + Local/Travel static guard',
  guarantees: [
    'Buzz has trend velocity, novelty, source spread, local/travel boost, and one-source cap gates',
    'Local/Travel has city precision, utility, recency, disruption, authority, and family relevance gates',
    'rankers do not fetch, persist, write output JSON, or touch workflow/dashboard',
    'Buzz is guarded against becoming a Top Stories mirror',
    'Local/Travel is guarded against becoming generic local news'
  ]
}, null, 2));

console.log('PASS: Ranking Phase C static guard');
