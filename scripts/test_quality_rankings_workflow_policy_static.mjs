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
const policy = read('scripts/prefetch_commit_decision.py');
const policyTests = read('scripts/test_prefetch_commit_decision.py');

for (const token of [
  'Build quality rankings',
  'python scripts/build_quality_rankings.py',
  'Validate quality rankings',
  'python scripts/validate_quality_rankings.py',
  'Upload quality rankings',
  'quality-rankings',
  'public/newsdata/quality_rankings.json',
  'public/newsdata/quality_rankings.md',
  'public/newsdata/quality_rankings_history.json',
  'public/newsdata/quality_rankings_validation_report.json',
]) {
  assert(workflow.includes(token), `news_prefetch.yml missing ranking workflow token: ${token}`);
}

requireOrder(workflow, 'Run real Insight snapshot quality benchmark', 'Build quality rankings');
requireOrder(workflow, 'Build quality rankings', 'Validate quality rankings');
requireOrder(workflow, 'Validate quality rankings', 'Generate quality dashboard');
requireOrder(workflow, 'Generate quality dashboard', 'Validate quality dashboard');
requireOrder(workflow, 'Validate quality dashboard', 'Decide whether news data commit is needed');
requireOrder(workflow, 'Decide whether news data commit is needed', 'Commit data');

for (const token of [
  'changed_diagnostic_files',
  'prefetch-commit-policy-v4-ranking-diagnostics',
  'quality_rankings.json',
  'quality_rankings.md',
  'quality_rankings_history.json',
  'quality_rankings_validation_report.json',
]) {
  assert(policy.includes(token), `prefetch_commit_decision.py missing ranking diagnostic token: ${token}`);
}

for (const name of [
  'quality_rankings.json',
  'quality_rankings.md',
  'quality_rankings_history.json',
  'quality_rankings_validation_report.json',
]) {
  assert(policy.includes(`NEWS_DIR / "${name}"`), `ranking file must be tracked as diagnostic: ${name}`);
  assert(!policy.includes(`CONTENT_FILES = [\n    NEWS_DIR / "${name}"`), `ranking file must not be tracked as content: ${name}`);
}

for (const token of [
  'test_quality_rankings_are_diagnostic_not_content',
  'test_policy_version_marks_ranking_diagnostics',
  'changedDiagnosticFiles',
]) {
  assert(policyTests.includes(token), `test_prefetch_commit_decision.py missing policy test token: ${token}`);
}

for (const forbidden of [
  'git add public/newsdata/\n',
  'npx gh-pages',
  'localStorage',
  'src/services/upAheadService.js',
  'src/pages/InsightPage.jsx',
]) {
  assert(!workflow.includes(forbidden), `news_prefetch.yml must not introduce runtime/deploy coupling: ${forbidden}`);
}

console.log(JSON.stringify({
  status: 'PASS',
  checked: 'Ranking Phase H workflow/policy static guard',
  guarantees: [
    'quality rankings are built and validated before dashboard generation',
    'dashboard validation runs before commit decision',
    'quality rankings artifacts are uploaded',
    'quality rankings are tracked as diagnostics, not content',
    'changed_diagnostic_files is exported for GitHub Actions visibility',
    'workflow does not publish Pages or touch browser runtime files'
  ]
}, null, 2));

console.log('PASS: Ranking Phase H workflow/policy static guard');
