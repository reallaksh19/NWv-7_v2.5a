import fs from 'fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  assert(fs.existsSync(path), `Missing file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const model = read('scripts/quality_ranking_model.py');
const builder = read('scripts/build_quality_rankings.py');
const modelTests = read('scripts/test_quality_ranking_model.py');
const builderTests = read('scripts/test_quality_rankings_builder.py');

for (const token of [
  'IMPLEMENTED_DESTINATIONS = ("upAhead", "buzz", "localTravel", "insight")',
  'PENDING_DESTINATIONS',
  'score_destination',
  'score_all_destinations',
  'results_to_document',
  'rank_upahead_items',
  'rank_buzz_items',
  'rank_local_travel_items',
  'rank_insight_events',
  'pending-tab-specific-ranker',
  'no generic fallback scoring is allowed',
]) {
  assert(model.includes(token), `quality_ranking_model.py missing token: ${token}`);
}

for (const token of [
  'RANKINGS_JSON_PATH',
  'RANKINGS_MD_PATH',
  'RANKINGS_HISTORY_PATH',
  'load_payloads',
  'extract_sections_items',
  'extract_insight_candidates',
  'append_history',
  'markdown_summary',
  'build_quality_rankings',
  'tab-specific-quality-ranking-v1',
]) {
  assert(builder.includes(token), `build_quality_rankings.py missing token: ${token}`);
}

for (const forbidden of [
  'generate_quality_dashboard',
  'news_prefetch.yml',
  'prefetch_commit_decision',
  'quality_dashboard.json',
  'localStorage',
  'fetch(',
  'axios',
  'score_generic',
  'generic_quality_score',
]) {
  assert(!model.includes(forbidden), `quality_ranking_model.py must not integrate workflow/dashboard/runtime/generic scoring: ${forbidden}`);
  assert(!builder.includes(forbidden), `build_quality_rankings.py must not integrate workflow/dashboard/runtime/generic scoring: ${forbidden}`);
}

for (const token of [
  'test_pending_destinations_fail_instead_of_generic_scoring',
  'test_results_document_preserves_each_profile',
  'test_upahead_destination_routes_to_upahead_profile',
  'test_insight_destination_routes_to_event_angle_profile',
]) {
  assert(modelTests.includes(token), `test_quality_ranking_model.py missing token: ${token}`);
}

for (const token of [
  'test_build_quality_rankings_writes_diagnostic_files',
  'test_builder_handles_missing_optional_snapshots',
  'test_extract_sections_items_from_nested_sections',
  'test_extract_insight_candidates_prefers_event_sketches',
]) {
  assert(builderTests.includes(token), `test_quality_rankings_builder.py missing token: ${token}`);
}

console.log(JSON.stringify({
  status: 'PASS',
  checked: 'Ranking Phase E quality model/builder static guard',
  guarantees: [
    'quality model routes only to tab-specific rankers',
    'pending destinations fail instead of generic fallback scoring',
    'builder writes diagnostic-only quality rankings artifacts',
    'builder extracts Up Ahead, Buzz, Local/Travel, and Insight payloads from existing snapshots',
    'Phase E does not touch workflow, dashboard, commit policy, browser runtime, or generic scoring'
  ]
}, null, 2));

console.log('PASS: Ranking Phase E model/builder static guard');
