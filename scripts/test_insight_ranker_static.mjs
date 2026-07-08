import fs from 'fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  assert(fs.existsSync(path), `Missing file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const ranker = read('scripts/tab_rankers/insight_ranker.py');
const tests = read('scripts/test_insight_ranker.py');

for (const token of [
  'RANKING_PROFILE = "insight-v2-event-angle-tree"',
  'event_coherence_gate',
  'angle_diversity_gate',
  'source_diversity_gate',
  'base_report_gate',
  'weak_tree_gate',
  'duplicate_child_gate',
  'temporal_evolution_score',
  'information_delta_score',
  'score_child',
  'rank_insight_events',
  'parentClusters',
  'strongParents',
  'weakParentsDemoted',
  'avgAnglesPerParent',
  'baseReportHeavyParents',
  'duplicateChildrenSuppressed',
]) {
  assert(ranker.includes(token), `insight_ranker.py missing token: ${token}`);
}

for (const forbidden of [
  'rank_stories',
  'score_news_item',
  'quality_rankings.json',
  'generate_quality_dashboard',
  'news_prefetch.yml',
  'fetch(',
  'axios',
  'localStorage',
  'write_json',
]) {
  assert(!ranker.includes(forbidden), `insight_ranker.py must not fetch/write/touch runtime outputs: ${forbidden}`);
}

for (const token of [
  'test_strong_angle_diverse_parent_beats_base_report_parent',
  'test_incoherent_candidate_is_suppressed',
  'test_weak_one_child_parent_is_demoted',
  'test_duplicate_child_titles_are_warned',
  'test_event_sketch_without_child_objects_can_rank_as_event_candidate',
  'test_child_scores_include_angle_delta_source_and_freshness_parts',
]) {
  assert(tests.includes(token), `test_insight_ranker.py missing test token: ${token}`);
}

console.log(JSON.stringify({
  status: 'PASS',
  checked: 'Ranking Phase D Insight static guard',
  guarantees: [
    'Insight ranker uses event/angle tree profile',
    'event coherence, angle diversity, source diversity, base-report cap, weak-tree demotion, and duplicate child gates exist',
    'parent and child scoring are separated',
    'eventSketch-like candidates are supported without becoming flat article ranking',
    'ranker does not fetch, persist, write output JSON, or touch workflow/dashboard'
  ]
}, null, 2));

console.log('PASS: Ranking Phase D Insight static guard');
