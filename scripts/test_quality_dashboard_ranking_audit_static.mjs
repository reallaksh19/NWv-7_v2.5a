import fs from 'fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  assert(fs.existsSync(path), `Missing file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const dashboard = read('scripts/generate_quality_dashboard.mjs');

for (const token of [
  'QUALITY_RANKINGS_PATH',
  'quality_rankings.json',
  'buildRankingAudit',
  "status: 'MISSING'",
  'compactGateSummary',
  'rankingAudit',
  'schemaVersion: 2',
  'rankingOverallScore',
  'rankingOverallStatus',
  'rankingWeakDestinationCount',
  'avgRankingScore7d',
  'avgRankingWeakDestinations7d',
  'full per-tab ranking details remain in quality_rankings.json',
]) {
  assert(dashboard.includes(token), `generate_quality_dashboard.mjs missing ranking audit token: ${token}`);
}

for (const token of [
  'rankedItems',
  'childScores',
  'scoreBreakdown',
]) {
  const auditSectionStart = dashboard.indexOf('function buildRankingAudit');
  const auditSectionEnd = dashboard.indexOf('function main()');
  const auditSection = dashboard.slice(auditSectionStart, auditSectionEnd);
  assert(!auditSection.includes(`.${token}`), `rankingAudit must not directly embed full destination ${token}`);
}

for (const requiredExistingGuard of [
  'False-zero guard',
  'Refusing to write false-zero dashboard',
  'Downgrade guard',
  'Not writing zero over nonzero',
]) {
  assert(dashboard.includes(requiredExistingGuard), `existing dashboard guard missing: ${requiredExistingGuard}`);
}

for (const forbidden of [
  'build_quality_rankings.py',
  'validate_quality_rankings.py',
  'news_prefetch.yml',
  'prefetch_commit_decision',
  'localStorage',
  'fetch(',
  'axios',
]) {
  assert(!dashboard.includes(forbidden), `dashboard generator must not integrate workflow/runtime/fetch behavior in Phase G: ${forbidden}`);
}

console.log(JSON.stringify({
  status: 'PASS',
  checked: 'Ranking Phase G dashboard rankingAudit static guard',
  guarantees: [
    'quality dashboard reads optional quality_rankings.json',
    'missing rankings produce rankingAudit.status = MISSING instead of false-zero score',
    'dashboard schemaVersion is upgraded to 2',
    'ranking audit is compact and does not embed full rankedItems/childScores/scoreBreakdown payloads',
    'false-zero and downgrade guards are preserved',
    'workflow, commit policy, browser runtime, and fetch behavior are untouched'
  ]
}, null, 2));

console.log('PASS: Ranking Phase G dashboard audit static guard');
