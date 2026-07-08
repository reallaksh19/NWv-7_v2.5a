import fs from 'node:fs';

const WORKFLOW_PATH = '.github/workflows/news_prefetch.yml';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function read(path) {
  assert(fs.existsSync(path), `Missing file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

function indexOfStep(workflow, stepName) {
  const token = `- name: ${stepName}`;
  return workflow.indexOf(token);
}

function requireStep(workflow, stepName) {
  const index = indexOfStep(workflow, stepName);
  assert(index >= 0, `Missing workflow step: ${stepName}`);
  return index;
}

function requireOrder(workflow, beforeStep, afterStep) {
  const before = requireStep(workflow, beforeStep);
  const after = requireStep(workflow, afterStep);
  assert(
    before < after,
    `Workflow order invalid: "${beforeStep}" must appear before "${afterStep}"`
  );
}

function rejectToken(workflow, token, reason) {
  assert(!workflow.includes(token), reason);
}

function requireToken(workflow, token, reason) {
  assert(workflow.includes(token), reason);
}

function getStepBlock(workflow, stepName) {
  const stepIndex = requireStep(workflow, stepName);
  const nextStepIndex = workflow.indexOf('\n      - name:', stepIndex + 1);
  return nextStepIndex > stepIndex
    ? workflow.slice(stepIndex, nextStepIndex)
    : workflow.slice(stepIndex);
}

function validateNewsPrefetchWorkflow(workflow) {
  requireToken(workflow, 'concurrency:', 'workflow must use concurrency guard');
  requireToken(workflow, 'group: news-prefetch', 'workflow concurrency group must be news-prefetch');
  requireToken(workflow, 'contents: write', 'workflow needs contents: write for data commits');

  rejectToken(
    workflow,
    'Bump fetchedAt sentinel',
    'workflow must not mutate fetchedAt just to force commits'
  );

  rejectToken(
    workflow,
    'git add public/newsdata/\n',
    'workflow must not blindly add all public/newsdata files'
  );

  for (const forbidden of [
    'npx gh-pages',
    'Publish updated Pages site',
    'Verify deployed Pages newsdata',
    'Build Pages site with latest newsdata',
    'pages-newsdata-verification',
  ]) {
    rejectToken(
      workflow,
      forbidden,
      `news_prefetch.yml must not contain "${forbidden}" — Pages publish is owned by deploy.yml`
    );
  }

  requireStep(workflow, 'Fetch Insight stories');
  requireStep(workflow, 'Validate Insight prefetch quality');
  requireStep(workflow, 'Fetch Sections stories');
  requireStep(workflow, 'Validate Sections prefetch contract');
  requireStep(workflow, 'Validate generated newsdata freshness');
  requireStep(workflow, 'Upload newsdata freshness report');
  requireStep(workflow, 'Run real Insight snapshot quality benchmark');
  requireStep(workflow, 'Generate quality dashboard');
  requireStep(workflow, 'Validate quality dashboard');
  requireStep(workflow, 'Decide whether news data commit is needed');
  requireStep(workflow, 'Upload prefetch commit manifest');
  requireStep(workflow, 'Commit data');

  requireOrder(workflow, 'Fetch Insight stories', 'Validate Insight prefetch quality');
  requireOrder(workflow, 'Fetch Sections stories', 'Validate Sections prefetch contract');
  requireOrder(workflow, 'Validate Insight prefetch quality', 'Validate generated newsdata freshness');
  requireOrder(workflow, 'Validate Sections prefetch contract', 'Validate generated newsdata freshness');
  requireOrder(workflow, 'Validate generated newsdata freshness', 'Run real Insight snapshot quality benchmark');
  requireOrder(workflow, 'Validate generated newsdata freshness', 'Generate quality dashboard');
  requireOrder(workflow, 'Run real Insight snapshot quality benchmark', 'Generate quality dashboard');
  requireOrder(workflow, 'Generate quality dashboard', 'Validate quality dashboard');
  requireOrder(workflow, 'Validate quality dashboard', 'Decide whether news data commit is needed');
  requireOrder(workflow, 'Decide whether news data commit is needed', 'Upload prefetch commit manifest');
  requireOrder(workflow, 'Decide whether news data commit is needed', 'Commit data');

  const commitBlock = getStepBlock(workflow, 'Commit data');
  assert(
    commitBlock.includes("if: steps.prefetch_commit.outputs.should_commit == 'true'"),
    'Commit data must be conditional on should_commit=true'
  );

  const requiredStagedOutputs = [
    'public/newsdata/insight_latest.json',
    'public/newsdata/sections_latest.json',
    'public/newsdata/source_health.json',
    'public/newsdata/prefetch_commit_manifest.json',
    'public/newsdata/insight_quality_report.json',
    'public/newsdata/insight_quality_summary.md',
    'public/newsdata/sections_quality_report.json',
    'public/newsdata/sections_quality_summary.md',
    'public/newsdata/newsdata_freshness_report.json',
    'public/newsdata/newsdata_freshness_summary.md',
    'public/newsdata/real_insight_quality_report.json',
    'public/newsdata/real_insight_quality_summary.md',
    'public/newsdata/quality_dashboard.json',
    'public/newsdata/quality_dashboard_history.json',
    'public/newsdata/section_source_policy_report.json',
  ];

  for (const path of requiredStagedOutputs) {
    requireToken(commitBlock, path, `commit step must stage generated output: ${path}`);
  }

  rejectToken(
    commitBlock,
    'intentionally never committed',
    'commit step must not describe generated Data Health diagnostics as never committed'
  );

  for (const token of [
    'python scripts/validate_insight_prefetch_output.py',
    'python scripts/validate_sections_prefetch_output.py',
    'python scripts/validate_newsdata_freshness.py',
    'python scripts/prefetch_commit_decision.py',
    'insight-quality-report',
    'sections-quality-report',
    'newsdata-freshness-report',
    'prefetch-commit-manifest',
    'real-insight-quality-report',
    'quality-dashboard',
  ]) {
    requireToken(workflow, token, `workflow missing required command/artifact token: ${token}`);
  }

  requireToken(
    workflow,
    'Skip commit for diagnostic-only changes',
    'workflow must explicitly skip commits for diagnostic-only changes'
  );

  return {
    status: 'PASS',
    checked: 'News prefetch workflow orchestration, freshness gate, and diagnostic staging',
    guarantees: [
      'concurrency guard exists',
      'fetchedAt-only sentinel is rejected',
      'blind public/newsdata git add is rejected',
      'Insight quality validation runs after Insight fetch',
      'Sections contract validation runs after Sections fetch',
      'freshness gate runs after fetch validation and before benchmark/dashboard/commit',
      'benchmark and dashboard run before commit decision',
      'commit decision sees generated dashboard diagnostics',
      'data commit is gated by should_commit=true',
      'workflow does not publish Pages directly — deploy.yml owns publish',
      'Data Health diagnostics are staged with meaningful data commits',
    ],
  };
}

const workflow = read(WORKFLOW_PATH);
const result = validateNewsPrefetchWorkflow(workflow);

console.log(JSON.stringify(result, null, 2));
console.log('PASS: News prefetch workflow orchestration');
