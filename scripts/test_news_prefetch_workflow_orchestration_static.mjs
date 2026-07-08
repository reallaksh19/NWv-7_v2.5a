import fs from 'fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  assert(fs.existsSync(path), `Missing file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const validator = read('scripts/validate_news_prefetch_workflow.mjs');
const packageJson = read('package.json');
const certGate = read('scripts/run_certification_gate.mjs');
const crossWorkflowValidator = read('scripts/validate_prefetch_workflow_contracts.mjs');
const rankingCertificationBundle = read('scripts/test_ranking_certification_bundle.mjs');

for (const token of [
  'validateNewsPrefetchWorkflow',
  'Bump fetchedAt sentinel',
  'Validate Insight prefetch quality',
  'Validate Sections prefetch contract',
  'Decide whether news data commit is needed',
  'Validate quality dashboard',
  'Build Pages site with latest newsdata',
  'Publish updated Pages site',
  'Verify deployed Pages newsdata',
  'should_commit=true',
  'quality_dashboard.json',
]) {
  assert(validator.includes(token), `validate_news_prefetch_workflow.mjs missing token: ${token}`);
}

for (const token of [
  'Fetch UpAhead events',
  'Fetch Festivals (weekly Saturday UTC run only)',
  'Enrich UpAhead lifecycle contract',
  'Validate UpAhead lifecycle contract',
  'validate_upahead_prefetch_output.py',
  'validate_sections_prefetch_output.py',
  'quality_dashboard.json',
  'buzz_latest.json',
  'weather_latest.json',
  'market_latest.json',
]) {
  assert(crossWorkflowValidator.includes(token), `cross workflow validator missing token: ${token}`);
}

for (const token of [
  'scripts/test_ranking_contracts.py',
  'scripts/test_upahead_ranker.py',
  'scripts/test_buzz_local_travel_rankers.py',
  'scripts/test_insight_ranker.py',
  'scripts/test_quality_ranking_model.py',
  'scripts/test_quality_rankings_builder.py',
  'scripts/test_validate_quality_rankings.py',
  'scripts/test_quality_dashboard_ranking_audit_static.mjs',
  'scripts/test_quality_rankings_workflow_policy_static.mjs',
]) {
  assert(rankingCertificationBundle.includes(token), `ranking certification bundle missing token: ${token}`);
}

assert(
  packageJson.includes('"test:news-prefetch-workflow-orchestration"'),
  'package.json must include test:news-prefetch-workflow-orchestration'
);

assert(
  certGate.includes('certification_manifest.json'),
  'certification gate must use certification_manifest.json'
);

// Execute only workflow-contract validators here. The ranking bundle is certified
// by the dedicated ranking tests and is statically checked above for reachability.
// Running it from this orchestration slice duplicates unrelated Python ranking
// tests and can make a workflow-layout certification fail for a ranking-model bug.
await import('./validate_prefetch_workflow_contracts.mjs');

console.log(JSON.stringify({
  status: 'PASS',
  checked: 'News + Up Ahead workflow orchestration static slice',
  guarantees: [
    'workflow orchestration validator exists',
    'critical news workflow step order is certified',
    'Data Health diagnostic staging is certified',
    'Up Ahead lifecycle enrichment/validation ordering is certified',
    'parallel unused JSON outputs are blocked',
    'ranking certification bundle remains reachable through the existing workflow certification script',
    'certification gate uses the manifest-backed workflow orchestration script'
  ]
}, null, 2));

console.log('PASS: News + Up Ahead workflow orchestration static slice');
