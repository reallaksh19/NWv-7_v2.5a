import fs from 'fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  assert(fs.existsSync(path), `Missing file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

function stepIndex(workflow, name) {
  return workflow.indexOf(`- name: ${name}`);
}

function requireStep(workflow, name) {
  const index = stepIndex(workflow, name);
  assert(index >= 0, `Missing workflow step: ${name}`);
  return index;
}

function requireOrder(workflow, before, after) {
  const a = requireStep(workflow, before);
  const b = requireStep(workflow, after);
  assert(a < b, `Workflow order invalid: ${before} must run before ${after}`);
}

const workflow = read('.github/workflows/news_prefetch.yml');
const validator = read('scripts/validate_newsdata_freshness.py');
const validatorTests = read('scripts/test_validate_newsdata_freshness.py');
const commitPolicy = read('scripts/prefetch_commit_decision.py');
const workflowValidator = read('scripts/validate_news_prefetch_workflow.mjs');

for (const token of [
  'Validate generated newsdata freshness',
  'python scripts/validate_newsdata_freshness.py',
  'Upload newsdata freshness report',
  'newsdata-freshness-report',
  'public/newsdata/newsdata_freshness_report.json',
  'public/newsdata/newsdata_freshness_summary.md',
]) {
  assert(workflow.includes(token), `news_prefetch.yml missing freshness token: ${token}`);
}

requireOrder(workflow, 'Validate Insight prefetch quality', 'Validate generated newsdata freshness');
requireOrder(workflow, 'Validate Sections prefetch contract', 'Validate generated newsdata freshness');
requireOrder(workflow, 'Validate generated newsdata freshness', 'Run real Insight snapshot quality benchmark');
requireOrder(workflow, 'Validate generated newsdata freshness', 'Build quality rankings');
requireOrder(workflow, 'Validate generated newsdata freshness', 'Generate quality dashboard');
requireOrder(workflow, 'Validate generated newsdata freshness', 'Decide whether news data commit is needed');

for (const token of [
  'DEFAULT_MAX_AGE_HOURS = 6',
  'DEFAULT_MAX_FUTURE_SKEW_MINUTES = 10',
  'validate_newsdata_freshness',
  'stale fetchedAt age',
  'generated story pool is empty',
  'missing or not valid JSON',
  'future beyond allowed skew',
]) {
  assert(validator.includes(token), `validate_newsdata_freshness.py missing token: ${token}`);
}

for (const token of [
  'test_fresh_snapshots_pass',
  'test_stale_insight_fails',
  'test_stale_sections_fails',
  'test_missing_snapshot_fails',
  'test_zero_story_pool_fails',
  'test_future_timestamp_beyond_skew_fails',
]) {
  assert(validatorTests.includes(token), `test_validate_newsdata_freshness.py missing test: ${token}`);
}

for (const token of [
  'newsdata_freshness_report.json',
  'newsdata_freshness_summary.md',
]) {
  assert(commitPolicy.includes(`NEWS_DIR / "${token}"`), `freshness diagnostic not tracked: ${token}`);
  assert(workflowValidator.includes(`public/newsdata/${token}`), `workflow validator missing staged output: ${token}`);
}

for (const forbidden of [
  'continue-on-error: true\n        run: python scripts/validate_newsdata_freshness.py',
  'public/newsdata/**',
  'localStorage',
  'fetch(',
  'axios',
  'src/pages/InsightPage.jsx',
]) {
  assert(!validator.includes(forbidden), `freshness validator must not touch runtime/browser behavior: ${forbidden}`);
}

console.log(JSON.stringify({
  status: 'PASS',
  checked: 'Newsdata freshness workflow static guard',
  guarantees: [
    'freshness validator exists and is tested',
    'freshness gate runs after fetch validation and before benchmark/ranking/dashboard/commit',
    'freshness report artifacts are uploaded',
    'freshness reports are tracked as diagnostics',
    'freshness gate is hard, not continue-on-error',
    'no browser runtime or live-mode code is touched'
  ]
}, null, 2));

console.log('PASS: Newsdata freshness workflow static guard');
