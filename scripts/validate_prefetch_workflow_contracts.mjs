import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  assert(fs.existsSync(path), `Missing file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

function requireToken(text, token, message) {
  assert(text.includes(token), message || `Missing token: ${token}`);
}

function rejectToken(text, token, message) {
  assert(!text.includes(token), message || `Forbidden token: ${token}`);
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

const news = read('.github/workflows/news_prefetch.yml');
const upahead = read('.github/workflows/upahead_refresh.yml');
const audit = read('scripts/audit_destination_contracts.py');
const auditTest = read('scripts/test_audit_destination_contracts.py');

// News workflow contract.
requireOrder(news, 'Fetch Insight stories', 'Validate Insight prefetch quality');
requireOrder(news, 'Fetch Sections stories', 'Validate Sections prefetch contract');
requireOrder(news, 'Validate quality dashboard', 'Decide whether news data commit is needed');
requireOrder(news, 'Decide whether news data commit is needed', 'Commit data');
requireToken(news, 'python scripts/validate_sections_prefetch_output.py', 'news workflow must validate Sections contract');
requireToken(news, 'node scripts/generate_quality_dashboard.mjs', 'news workflow must generate Data Health dashboard');
requireToken(news, 'public/newsdata/quality_dashboard.json', 'news workflow must stage quality dashboard with meaningful data commits');
requireToken(news, 'public/newsdata/sections_quality_report.json', 'news workflow must stage Sections quality report');
rejectToken(news, 'npx gh-pages', 'news workflow must not publish Pages directly');
rejectToken(news, 'git add public/newsdata/\n', 'news workflow must not blindly stage every newsdata file');

// Up Ahead workflow contract.
requireOrder(upahead, 'Fetch UpAhead events', 'Enrich UpAhead lifecycle contract');
requireOrder(upahead, 'Fetch Festivals (weekly Saturday UTC run only)', 'Enrich UpAhead lifecycle contract');
requireOrder(upahead, 'Enrich UpAhead lifecycle contract', 'Validate UpAhead lifecycle contract');
requireOrder(upahead, 'Validate UpAhead lifecycle contract', 'Commit data');
requireToken(upahead, 'python scripts/enrich_upahead_contract.py', 'Up Ahead workflow must enrich lifecycle contract after fetch');
requireToken(upahead, 'python scripts/validate_upahead_prefetch_output.py', 'Up Ahead workflow must validate lifecycle contract');
requireToken(upahead, 'public/data/up_ahead_quality_report.json', 'Up Ahead quality report must be uploaded/staged through public/data');
requireToken(upahead, 'public/data/', 'Up Ahead workflow must stage public/data outputs');
rejectToken(upahead, 'news_prefetch', 'Up Ahead workflow must remain independent from news_prefetch workflow');

// Destination registry / no parallel JSON fork guard.
requireToken(audit, 'public/newsdata/sections_latest.json', 'Buzz/Sections upstream contract must reference sections_latest.json');
requireToken(audit, 'scripts/fetch_sections_stories.py', 'Buzz/Sections upstream contract must reference Sections producer');
requireToken(auditTest, 'FORK_BLOCKLIST', 'audit tests must keep a parallel output blocklist');
requireToken(auditTest, 'test_no_forked_latest_siblings', 'audit tests must reject forked latest siblings');
for (const forbidden of [
  'buzz_latest.json',
  'weather_latest.json',
  'market_latest.json',
  'newspaper_latest.json',
  'data_health_dashboard.json',
]) {
  requireToken(auditTest, forbidden, `audit tests must block parallel unused output ${forbidden}`);
}

// Existing certification path must include the orchestration script that invokes this validator.
const packageJson = read('package.json');
const staticTest = read('scripts/test_news_prefetch_workflow_orchestration_static.mjs');
const manifest = read('scripts/certification_manifest.json');
requireToken(packageJson, 'test:news-prefetch-workflow-orchestration', 'package.json must expose workflow orchestration test script');
requireToken(staticTest, 'validate_prefetch_workflow_contracts.mjs', 'static orchestration test must require cross-workflow validator');
requireToken(manifest, 'test:news-prefetch-workflow-orchestration', 'certification manifest workflow profile must run workflow orchestration test');

console.log(JSON.stringify({
  status: 'PASS',
  checked: 'cross-workflow static prefetch contracts',
  guarantees: [
    'news workflow validates Sections and stages Data Health diagnostics',
    'news workflow does not publish Pages directly',
    'Up Ahead workflow enriches and validates lifecycle after event/festival fetches',
    'Up Ahead remains independent from news_prefetch workflow',
    'destination registry tests block parallel unused *_latest.json outputs',
    'workflow certification profile reaches this cross-workflow validator'
  ]
}, null, 2));

console.log('PASS: cross-workflow static prefetch contracts');
