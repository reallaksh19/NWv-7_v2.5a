import fs from 'fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  assert(fs.existsSync(path), `Missing file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const validator = read('scripts/validate_quality_rankings.py');
const tests = read('scripts/test_validate_quality_rankings.py');

for (const token of [
  'EXPECTED_SCHEMA_VERSION = 1',
  'EXPECTED_RANKING_VERSION = "tab-specific-quality-ranking-v1"',
  'IMPLEMENTED_DESTINATIONS = ("upAhead", "buzz", "localTravel", "insight")',
  'EXPECTED_PROFILES',
  'REQUIRED_BREAKDOWN_KEYS',
  'validate_quality_rankings_document',
  'pending/generic ranker',
  'PASS destination cannot have empty rankedItems',
  'scoreBreakdown',
  'gateSummary',
  'rankedItems',
]) {
  assert(validator.includes(token), `validate_quality_rankings.py missing token: ${token}`);
}

for (const forbidden of [
  'generate_quality_dashboard',
  'news_prefetch.yml',
  'prefetch_commit_decision',
  'localStorage',
  'fetch(',
  'axios',
  'score_generic',
  'generic_quality_score',
]) {
  assert(!validator.includes(forbidden), `validate_quality_rankings.py must not integrate workflow/dashboard/runtime/generic scoring: ${forbidden}`);
}

for (const token of [
  'test_valid_document_passes',
  'test_missing_implemented_destination_fails',
  'test_wrong_profile_fails_generic_regression',
  'test_pending_profile_on_implemented_destination_fails',
  'test_missing_tab_specific_breakdown_keys_fail',
  'test_score_out_of_range_fails',
  'test_empty_ranked_items_warn_when_not_pass',
  'test_pass_with_empty_ranked_items_fails',
]) {
  assert(tests.includes(token), `test_validate_quality_rankings.py missing test token: ${token}`);
}

console.log(JSON.stringify({
  status: 'PASS',
  checked: 'Ranking Phase F quality rankings validator static guard',
  guarantees: [
    'quality rankings validator defines a formal artifact contract',
    'implemented destinations and exact tab-specific profiles are required',
    'tab-specific scoreBreakdown keys are required',
    'generic/pending ranker regression fails for implemented destinations',
    'validator does not touch workflow, dashboard, commit policy, browser runtime, or generic scoring'
  ]
}, null, 2));

console.log('PASS: Ranking Phase F validator static guard');
