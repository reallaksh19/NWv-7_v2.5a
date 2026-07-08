import fs from 'fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  assert(fs.existsSync(path), `Missing file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const packageJson = read('package.json');
const manifest = read('scripts/certification_manifest.json');
const workflowOrchestration = read('scripts/test_news_prefetch_workflow_orchestration_static.mjs');
const rankingBundle = read('scripts/test_ranking_certification_bundle.mjs');

assert(
  packageJson.includes('"test:news-prefetch-workflow-orchestration"'),
  'package.json must expose test:news-prefetch-workflow-orchestration'
);

for (const token of [
  '"id": "news-prefetch-workflow-orchestration"',
  '"test:news-prefetch-workflow-orchestration"',
  '"workflow"',
  '"full"',
]) {
  assert(manifest.includes(token), `certification_manifest.json missing token: ${token}`);
}

for (const token of [
  "await import('./test_ranking_certification_bundle.mjs')",
  'ranking certification bundle is reachable through the existing workflow certification script',
  'rankingCertificationBundle',
]) {
  assert(workflowOrchestration.includes(token), `workflow orchestration certification missing ranking bundle token: ${token}`);
}

for (const token of [
  'scripts/test_ranking_contracts.py',
  'scripts/test_upahead_ranker.py',
  'scripts/test_buzz_local_travel_rankers.py',
  'scripts/test_insight_ranker.py',
  'scripts/test_quality_ranking_model.py',
  'scripts/test_quality_rankings_builder.py',
  'scripts/test_validate_quality_rankings.py',
  'scripts/test_prefetch_commit_decision.py',
  'scripts/test_ranking_phaseA_static.mjs',
  'scripts/test_upahead_ranker_static.mjs',
  'scripts/test_buzz_local_travel_rankers_static.mjs',
  'scripts/test_insight_ranker_static.mjs',
  'scripts/test_quality_ranking_model_builder_static.mjs',
  'scripts/test_validate_quality_rankings_static.mjs',
  'scripts/test_quality_dashboard_ranking_audit_static.mjs',
  'scripts/test_quality_rankings_workflow_policy_static.mjs',
]) {
  assert(rankingBundle.includes(token), `ranking bundle missing test target: ${token}`);
}

for (const forbidden of [
  'localStorage',
  'fetch(',
  'axios',
  'src/services/upAheadService.js',
  'src/pages/InsightPage.jsx',
  'gh-pages',
]) {
  assert(!rankingBundle.includes(forbidden), `ranking certification bundle must not touch runtime/deploy behavior: ${forbidden}`);
}

console.log(JSON.stringify({
  status: 'PASS',
  checked: 'Ranking Phase I certification wiring static guard',
  guarantees: [
    'ranking bundle exists and includes all ranking phase tests',
    'existing package script test:news-prefetch-workflow-orchestration remains the entry point',
    'certification manifest already runs the workflow orchestration script for workflow/full profiles',
    'workflow orchestration certification imports the ranking bundle',
    'no browser runtime, fetcher, UI, or Pages deployment behavior is introduced'
  ]
}, null, 2));

console.log('PASS: Ranking Phase I certification wiring static guard');
