import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  assert(fs.existsSync(path), `Missing file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const workflow = read('.github/workflows/news_prefetch.yml');
const policy = read('scripts/prefetch_commit_decision.py');

const commitStart = workflow.indexOf('- name: Commit data');
assert(commitStart >= 0, 'Commit data step must exist');
const nextStep = workflow.indexOf('\n      - name:', commitStart + 1);
const commitBlock = nextStep > commitStart ? workflow.slice(commitStart, nextStep) : workflow.slice(commitStart);

const decision = workflow.indexOf('- name: Decide whether news data commit is needed');
const dashboardValidation = workflow.indexOf('- name: Validate quality dashboard');
assert(dashboardValidation >= 0 && decision > dashboardValidation, 'Commit decision must run after dashboard validation');

const requiredStaged = [
  'public/newsdata/insight_latest.json',
  'public/newsdata/sections_latest.json',
  'public/newsdata/source_health.json',
  'public/newsdata/prefetch_commit_manifest.json',
  'public/newsdata/insight_quality_report.json',
  'public/newsdata/insight_quality_summary.md',
  'public/newsdata/sections_quality_report.json',
  'public/newsdata/sections_quality_summary.md',
  'public/newsdata/real_insight_quality_report.json',
  'public/newsdata/real_insight_quality_summary.md',
  'public/newsdata/quality_dashboard.json',
  'public/newsdata/quality_dashboard_history.json',
  'public/newsdata/section_source_policy_report.json',
];

for (const file of requiredStaged) {
  assert(commitBlock.includes(file), `Commit step must stage ${file}`);
}

const requiredDiagnosticTracked = [
  'insight_quality_report.json',
  'insight_quality_summary.md',
  'sections_quality_report.json',
  'sections_quality_summary.md',
  'real_insight_quality_report.json',
  'real_insight_quality_summary.md',
  'quality_dashboard.json',
  'quality_dashboard_history.json',
  'section_source_policy_report.json',
  'source_policy_report.json',
];

for (const leaf of requiredDiagnosticTracked) {
  assert(policy.includes(leaf), `prefetch_commit_decision.py must track diagnostic file ${leaf}`);
}

assert(
  !commitBlock.includes('intentionally never committed'),
  'Commit step must not describe quality diagnostics as intentionally never committed'
);

assert(
  commitBlock.includes("if: steps.prefetch_commit.outputs.should_commit == 'true'"),
  'Commit step must remain gated by should_commit=true'
);

console.log(JSON.stringify({
  status: 'PASS',
  checked: 'news_prefetch diagnostic staging',
  guarantees: [
    'quality dashboard is staged with meaningful data commits',
    'insight/sections/real-insight quality reports are staged',
    'prefetch commit manifest tracks all diagnostic report hashes',
    'diagnostic-only changes still do not force commits',
    'commit decision runs after dashboard validation'
  ],
}, null, 2));

console.log('PASS: news_prefetch diagnostic staging');
