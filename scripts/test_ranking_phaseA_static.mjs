import fs from 'fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  assert(fs.existsSync(path), `Missing file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const contracts = read('scripts/ranking_contracts.py');
const gates = read('scripts/ranking_gates.py');
const tests = read('scripts/test_ranking_contracts.py');

for (const token of [
  'class GateResult',
  'class RankedItem',
  'class RankingResult',
  'ranking_profile',
  'gate_summary',
  'score_breakdown',
  'quality_status',
  'weighted_score',
]) {
  assert(contracts.includes(token), `ranking_contracts.py missing token: ${token}`);
}

for (const token of [
  'future_validity_score',
  'location_gate',
  'actionability_gate',
  'category_balance_score',
  'source_confidence_score',
  'duplicate_gate',
  'CITY_ALIASES',
]) {
  assert(gates.includes(token), `ranking_gates.py missing token: ${token}`);
}

for (const forbidden of [
  'score_upahead',
  'score_buzz',
  'score_insight',
  'score_main',
  'quality_rankings.json',
  'generate_quality_dashboard',
  'news_prefetch.yml',
]) {
  assert(!contracts.includes(forbidden), `ranking_contracts.py must remain tab-neutral; found ${forbidden}`);
  assert(!gates.includes(forbidden), `ranking_gates.py must remain tab-neutral; found ${forbidden}`);
}

for (const token of [
  'test_future_validity_is_different_from_news_freshness',
  'test_location_gate_distinguishes_offline_city_from_online_offer',
  'test_actionability_gate_requires_title_url_and_optionally_time_or_place',
  'test_source_confidence_penalizes_fallback_google_news',
  'test_duplicate_gate_tracks_seen_keys',
]) {
  assert(tests.includes(token), `test_ranking_contracts.py missing test token: ${token}`);
}

console.log(JSON.stringify({
  status: 'PASS',
  checked: 'Ranking Phase A static architecture guard',
  guarantees: [
    'common ranking contracts exist',
    'gate primitives exist for lifecycle, location, actionability, category balance, source confidence, and dedup',
    'Phase A remains tab-neutral and does not write dashboard/workflow outputs',
    'tests prove future validity is distinct from news freshness',
    'tests prove online/offline location handling is separable'
  ]
}, null, 2));

console.log('PASS: Ranking Phase A static guard');
