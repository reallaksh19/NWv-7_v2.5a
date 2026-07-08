import { spawnSync } from 'node:child_process';

const steps = [
  ['python', ['-m', 'pytest', 'scripts/test_ranking_contracts.py']],
  ['python', ['-m', 'pytest', 'scripts/test_upahead_ranker.py']],
  ['python', ['-m', 'pytest', 'scripts/test_buzz_local_travel_rankers.py']],
  ['python', ['-m', 'pytest', 'scripts/test_insight_ranker.py']],
  ['python', ['-m', 'pytest', 'scripts/test_quality_ranking_model.py']],
  ['python', ['-m', 'pytest', 'scripts/test_quality_rankings_builder.py']],
  ['python', ['-m', 'pytest', 'scripts/test_validate_quality_rankings.py']],
  ['python', ['-m', 'pytest', 'scripts/test_prefetch_commit_decision.py']],
  ['node', ['scripts/test_ranking_phaseA_static.mjs']],
  ['node', ['scripts/test_upahead_ranker_static.mjs']],
  ['node', ['scripts/test_buzz_local_travel_rankers_static.mjs']],
  ['node', ['scripts/test_insight_ranker_static.mjs']],
  ['node', ['scripts/test_quality_ranking_model_builder_static.mjs']],
  ['node', ['scripts/test_validate_quality_rankings_static.mjs']],
  ['node', ['scripts/test_quality_dashboard_ranking_audit_static.mjs']],
  ['node', ['scripts/test_quality_rankings_workflow_policy_static.mjs']],
];

const results = [];

for (const [cmd, args] of steps) {
  const label = `${cmd} ${args.join(' ')}`;
  console.log(`\nRANKING CERTIFICATION STEP: ${label}`);
  console.log('='.repeat(80));
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  results.push({ command: label, status: result.status === 0 ? 'PASS' : 'FAIL', exitCode: result.status });
  if (result.status !== 0) {
    console.error(JSON.stringify({
      status: 'FAIL',
      failedCommand: label,
      results,
    }, null, 2));
    process.exit(result.status || 1);
  }
}

console.log(JSON.stringify({
  status: 'PASS',
  checked: 'Ranking certification bundle',
  commandCount: results.length,
  results,
  guarantees: [
    'ranking contracts/gates are certified',
    'Up Ahead events/offers/alerts/location ranking is certified',
    'Buzz and Local/Travel rankers are certified',
    'Insight event/angle ranking is certified',
    'quality ranking model/builder/validator are certified',
    'dashboard rankingAudit is compact-certified',
    'workflow diagnostic commit policy is certified'
  ]
}, null, 2));

console.log('PASS: Ranking certification bundle');
