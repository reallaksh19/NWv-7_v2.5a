// Score the synthetic replay against construction-time ground truth (plan §B4).
// Usage: node benchmarks/synthetic/score.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";

const CORPUS = "insight_synth_36h_v1";
const corpus = JSON.parse(readFileSync(`benchmarks/corpora/${CORPUS}/corpus.json`, "utf8"));
const gt = JSON.parse(readFileSync(`benchmarks/ground_truth/${CORPUS}/ground_truth.json`, "utf8"));
const runsDir = `benchmarks/runs/${CORPUS}`;
const sha = readdirSync(runsDir).filter(d => existsSync(`${runsDir}/${d}/replay.json`)).sort().pop();
const replay = JSON.parse(readFileSync(`${runsDir}/${sha}/replay.json`, "utf8"));

const storyTruth = new Map(corpus.stories.map(s => [s.id, s.truth]));
const cold = replay.cold;                 // per-cycle cold runs
const byCycle = new Map(cold.map(c => [c.cycle, c]));

// For a gt pair, first cold cycle where both stories are clustered; do they share a system cluster?
function firstCoPresent(ids) {
  for (const c of cold) if (ids.every(id => c.storyCluster[id])) return c;
  return null;
}
function sameSystemCluster(c, a, b) { return c.storyCluster[a] && c.storyCluster[a] === c.storyCluster[b]; }

// ── Clustering pairwise precision/recall/F1 (+ OOV stratum) ──
function pairwise(pairs) {
  let tp = 0, fp = 0, fn = 0, tn = 0, evaluable = 0;
  for (const p of pairs) {
    const c = firstCoPresent(p.stories); if (!c) continue; evaluable++;
    const sys = !!sameSystemCluster(c, p.stories[0], p.stories[1]);
    const truthSame = p.label === "same_event";
    if (sys && truthSame) tp++; else if (sys && !truthSame) fp++; else if (!sys && truthSame) fn++; else tn++;
  }
  const prec = tp + fp ? tp / (tp + fp) : 1, rec = tp + fn ? tp / (tp + fn) : 1;
  const f1 = prec + rec ? 2 * prec * rec / (prec + rec) : 0;
  return { evaluable, tp, fp, fn, tn, precision: +prec.toFixed(3), recall: +rec.toFixed(3), f1: +f1.toFixed(3) };
}
const allPairs = gt.pairs;
const oovPairs = gt.pairs.filter(p => (p.challenges || []).includes("location_oov"));
const clustering = pairwise(allPairs);
const oovClustering = pairwise(oovPairs);

// ── Dedup precision/recall (URL/hash hard-dup templates: 2nd variant should be hidden) ──
let dupTp = 0, dupFn = 0;
const dupGroups = gt.groups.filter(g => (g.challenges || []).some(c => c === "dedup_layer1_url" || c === "dedup_layer2_hash"));
for (const g of dupGroups) {
  const c = firstCoPresent(g.members) || cold.find(cc => g.members.some(m => cc.storyCluster[m]));
  const hidden = c ? new Set(c.hiddenIds) : new Set();
  if (g.members.some(m => hidden.has(m))) dupTp++; else dupFn++; // recall: was a dup hidden?
}
// precision proxy: of all hidden ids, fraction whose truth cluster has ≥2 members (true dup family)
const lastFull = cold.reduce((a, b) => (Object.keys(b.storyCluster).length > Object.keys(a.storyCluster).length ? b : a), cold[0]);
const clusterSizeByTruth = {};
for (const s of corpus.stories) clusterSizeByTruth[s.truth.cluster] = (clusterSizeByTruth[s.truth.cluster] || 0) + 1;
const hiddenAll = new Set(cold.flatMap(c => c.hiddenIds));
let hidOk = 0, hidTot = 0;
for (const id of hiddenAll) { hidTot++; const t = storyTruth.get(id); if (t && clusterSizeByTruth[t.cluster] >= 2) hidOk++; }
const dedup = { recall_known_dups: dupGroups.length ? +(dupTp / dupGroups.length).toFixed(3) : null, known_dup_groups: dupGroups.length, precision_proxy: hidTot ? +(hidOk / hidTot).toFixed(3) : 1, hidden_total: hidTot };

// ── Angle accuracy + unknown rate ──
function firstAnglePresent(id) { for (const c of cold) if (c.storyAngle[id]) return c.storyAngle[id]; return null; }
let aOk = 0, aTot = 0, unknownSys = 0;
const angleConf = {};
for (const a of gt.angles) {
  const sys = firstAnglePresent(a.story); if (!sys) continue; aTot++;
  if (sys === a.label) aOk++; else angleConf[`${a.label}->${sys}`] = (angleConf[`${a.label}->${sys}`] || 0) + 1;
  if (sys === "unknown") unknownSys++;
}
const angle = { accuracy: aTot ? +(aOk / aTot).toFixed(3) : null, evaluated: aTot, unknown_rate: aTot ? +(unknownSys / aTot).toFixed(3) : 0, top_confusions: Object.entries(angleConf).sort((x, y) => y[1] - x[1]).slice(0, 5) };

// ── System cluster → truth importance (majority of members) ──
function clusterTruth(c, parentId) {
  const ids = Object.keys(c.storyCluster).filter(id => c.storyCluster[id] === parentId);
  const tally = {}; let impTally = {};
  for (const id of ids) { const t = storyTruth.get(id); if (!t) continue; tally[t.cluster] = (tally[t.cluster] || 0) + 1; impTally[t.importance] = (impTally[t.importance] || 0) + 1; }
  const cluster = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];
  const importance = Object.entries(impTally).sort((a, b) => b[1] - a[1])[0]?.[0];
  return { cluster, importance };
}

// ── Ranking bucket conformance (no minor in top-3; majors in top-5) at the richest cycle ──
const rc = lastFull;
const topRanked = rc.parents.slice().sort((a, b) => a.rank - b.rank);
const top3 = topRanked.slice(0, 3).map(p => clusterTruth(rc, p.parentId).importance);
const top5 = topRanked.slice(0, 5).map(p => clusterTruth(rc, p.parentId).importance);
const minorInTop3 = top3.filter(i => i === "minor").length;
const majorsTotal = new Set(corpus.stories.filter(s => s.truth.importance === "major").map(s => s.truth.cluster)).size;
const majorInTop5 = new Set(topRanked.slice(0, 5).map(p => clusterTruth(rc, p.parentId).cluster).filter(Boolean)).size;
const ranking = { evaluated_cycle: rc.cycle, top3_importance: top3, top5_importance: top5, minor_in_top3: minorInTop3, conformance_pass: minorInTop3 === 0 };

// ── Time-to-surface (F5-2): cycles from firstSeen to first top-10 appearance ──
function clusterFirstTopN(truthCluster, topN = 10) {
  for (const c of cold) {
    const top = c.parents.slice(0, topN);
    for (const p of top) if (clusterTruth(c, p.parentId).cluster === truthCluster) return c.cycle;
  }
  return null;
}
const tts = [];
for (const g of gt.groups) {
  const t = storyTruth.get(g.members[0]);
  const firstTop = clusterFirstTopN(g.cluster);
  if (firstTop != null) tts.push({ cluster: g.cluster, importance: t?.importance, firstSeenCycle: g.firstSeenCycle, firstTopCycle: firstTop, latency: firstTop - g.firstSeenCycle, challenges: g.challenges });
}
const breaking = tts.find(x => (x.challenges || []).includes("breaking_new_event"));
const ttsMedian = tts.length ? tts.map(x => x.latency).sort((a, b) => a - b)[Math.floor(tts.length / 2)] : null;

// ── Incremental-vs-full divergence at warm checkpoints ──
const divergence = [];
for (const w of replay.warm) {
  const c = byCycle.get(w.cycle); if (!c) continue;
  const coldClusters = new Set(c.parents.map(p => clusterTruth(c, p.parentId).cluster).filter(Boolean));
  const warmClusters = new Set(w.parents.map(p => clusterTruth(w, p.parentId).cluster).filter(Boolean));
  const inColdNotWarm = [...coldClusters].filter(x => !warmClusters.has(x));
  divergence.push({ cycle: w.cycle, cold_clusters: coldClusters.size, warm_clusters: warmClusters.size, present_in_full_absent_in_incremental: inColdNotWarm });
}

const metrics = {
  corpus: CORPUS, git_sha: replay.git_sha, kappa: gt.provenance.kappa, label_method: gt.provenance.method,
  clustering_pairwise: clustering, oov_stratum_clustering: oovClustering, dedup,
  angle, ranking_bucket_conformance: ranking,
  time_to_surface: { median_latency_cycles: ttsMedian, breaking_event: breaking || null, all: tts },
  incremental_vs_full_divergence: divergence,
};
writeFileSync(`${runsDir}/${sha}/metrics.json`, JSON.stringify(metrics, null, 2));

const alarm = [];
if (clustering.f1 < 0.70) alarm.push(`clustering F1 ${clustering.f1} < 0.70`);
if (clustering.precision < 0.90) alarm.push(`dedup/cluster precision ${clustering.precision} < 0.90`);
if (angle.accuracy !== null && angle.accuracy < 0.55) alarm.push(`angle accuracy ${angle.accuracy} < 0.55`);
if (!ranking.conformance_pass) alarm.push(`minor story in top-3 (${ranking.minor_in_top3})`);
if (ttsMedian !== null && ttsMedian > 2) alarm.push(`time-to-surface median ${ttsMedian} > 2 cycles`);

console.log("=== SYNTHETIC BENCHMARK METRICS (κ=1.0 construction-time) ===");
console.log(JSON.stringify({ clustering, oov_stratum: oovClustering, dedup, angle, ranking, tts_median: ttsMedian, breaking, divergence }, null, 2));
console.log("\nALARMS:", alarm.length ? alarm : "none");
writeFileSync(`${runsDir}/${sha}/alarms.json`, JSON.stringify(alarm, null, 2));
