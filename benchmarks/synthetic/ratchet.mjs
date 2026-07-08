// Regression ratchet: compares the freshly-scored synthetic run to the frozen baseline
// and FAILS (exit 1) on a material regression. Corpus is deterministic (seed), labels are
// construction-time (κ=1.0) → zero marginal cost; runtime only.
// Usage (after generate + replay + score): node benchmarks/synthetic/ratchet.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";

const CORPUS = "insight_synth_36h_v1";
const EPS = 0.05; // tolerate 5-point noise (material-defect detection, per plan §1)
const baseline = JSON.parse(readFileSync("benchmarks/synthetic/BASELINE_METRICS.json", "utf8"));
const runsDir = `benchmarks/runs/${CORPUS}`;
const sha = readdirSync(runsDir).filter(d => existsSync(`${runsDir}/${d}/metrics.json`)).sort().pop();
const cur = JSON.parse(readFileSync(`${runsDir}/${sha}/metrics.json`, "utf8"));

const fails = [];
const ge = (path, b, c) => { if (c + EPS < b) fails.push(`${path} regressed: ${c} < baseline ${b} (−${(b - c).toFixed(3)})`); };

ge("clustering.f1", baseline.clustering_pairwise.f1, cur.clustering_pairwise.f1);
ge("clustering.precision", baseline.clustering_pairwise.precision, cur.clustering_pairwise.precision);
ge("oov_stratum.f1", baseline.oov_stratum_clustering.f1, cur.oov_stratum_clustering.f1);
if (baseline.angle.accuracy != null) ge("angle.accuracy", baseline.angle.accuracy, cur.angle.accuracy ?? 0);
// time-to-surface must not get worse (higher = worse)
if (baseline.time_to_surface.median_latency_cycles != null && cur.time_to_surface.median_latency_cycles != null) {
  if (cur.time_to_surface.median_latency_cycles > baseline.time_to_surface.median_latency_cycles + 1)
    fails.push(`time_to_surface worsened: ${cur.time_to_surface.median_latency_cycles} > baseline ${baseline.time_to_surface.median_latency_cycles}`);
}
// ranking conformance must not flip from pass→fail
if (baseline.ranking_bucket_conformance.conformance_pass && !cur.ranking_bucket_conformance.conformance_pass)
  fails.push("ranking conformance regressed pass→fail (minor in top-3)");

console.log(`Synthetic ratchet — baseline ${baseline.git_sha} vs current ${cur.git_sha} (ε=${EPS})`);
console.log(JSON.stringify({
  clustering_f1: [baseline.clustering_pairwise.f1, cur.clustering_pairwise.f1],
  oov_f1: [baseline.oov_stratum_clustering.f1, cur.oov_stratum_clustering.f1],
  angle_acc: [baseline.angle.accuracy, cur.angle.accuracy],
  tts_median: [baseline.time_to_surface.median_latency_cycles, cur.time_to_surface.median_latency_cycles],
}, null, 2));
if (fails.length) { console.error("\nRATCHET FAILED:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("\nRATCHET PASSED — no material regression vs baseline.");
