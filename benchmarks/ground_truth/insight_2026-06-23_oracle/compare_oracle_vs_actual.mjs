// Oracle (ideal) vs Actual (pipeline) on TODAY's frozen real data, EXPANDED:
// precision (merged pairs), angle accuracy, ranking, AND dedup recall (near-identical
// candidate pairs both surviving = missed dup). Reproducible.
import { readFileSync, writeFileSync } from "node:fs";

const DIR = "benchmarks/ground_truth/insight_2026-06-23_oracle";
const oracle = JSON.parse(readFileSync(`${DIR}/oracle_labels.json`, "utf8"));
const snap = JSON.parse(readFileSync("benchmarks/corpora/insight_2026-06-23/snapshot.json", "utf8"));
const dump = JSON.parse(readFileSync("benchmarks/corpora/insight_2026-06-23/pipeline_dump.json", "utf8"));
const pAngle = dump.storyFacts;
const survivors = new Set(Object.keys(dump.storyFacts)); // in storiesById post-dedup
const parentsById = new Map(dump.run1.parents.map(p => [p.parentId, p]));
const ranked = dump.run1.parents.map(p => p.parentId);
const byId = new Map(snap.stories.map(s => [String(s.id || s.url), s]));

// ── Clustering precision (merged pairs) ──
let mergedPairs = 0, confirmed = 0; const falseMerges = [];
for (const c of oracle.clusters) {
  const p = parentsById.get(c.parentId); if (!p) continue;
  const n = p.clusterStoryIds.length, nP = n * (n - 1) / 2; mergedPairs += nP;
  if (c.valid_single_event) confirmed += nP; else falseMerges.push({ parentId: c.parentId, event: c.event, pairs: nP });
}
const clusterLevel = { clusters: oracle.clusters.length, with_false_merge: falseMerges.length, clean: oracle.clusters.length - falseMerges.length };

// ── Angle accuracy ──
let aTot = 0, aOk = 0; const misses = {};
for (const c of oracle.clusters) for (const [id, oa] of Object.entries(c.angles)) {
  const pa = pAngle[id]?.angle; if (!pa) continue; aTot++;
  if (pa === oa) aOk++; else misses[`${oa}→${pa}`] = (misses[`${oa}→${pa}`] || 0) + 1;
}

// ── Ranking ──
const impBy = new Map(oracle.clusters.map(c => [c.parentId, c.importance]));
const top3 = ranked.slice(0, 3).map(p => impBy.get(p));
const minorInTop3 = top3.filter(i => i === "minor").length;
const majors = oracle.clusters.filter(c => c.importance === "major");
const majorsOutsideTop3 = majors.filter(c => ranked.indexOf(c.parentId) >= 3).map(c => ({ event: c.event, rank: ranked.indexOf(c.parentId) }));

// ── Dedup recall: near-identical candidate pairs both surviving = missed dup ──
const STOP = new Set("the a an of to in on for and or with from as at by is are was were after over amid says will new how what why its his her their this that into out up down off".split(" "));
const salient = s => { const t = String(s.title || ""); const toks = (t.match(/\b[A-Z][a-zA-Z]{3,}\b/g) || []).map(x => x.toLowerCase()); const lon = t.toLowerCase().split(/\W+/).filter(x => x.length >= 5 && !STOP.has(x)); return new Set([...toks, ...lon]); };
const sal = new Map(snap.stories.map(s => [String(s.id || s.url), salient(s)]));
const tok = new Map();
for (const [id, set] of sal) for (const t of set) { if (!tok.has(t)) tok.set(t, []); tok.get(t).push(id); }
const cand = new Map();
for (const [t, ids] of tok) { if (ids.length < 2 || ids.length > 12) continue; for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const k = [ids[i], ids[j]].sort().join("|"); if (!cand.has(k)) cand.set(k, new Set()); cand.get(k).add(t); } }
// "near-identical" = >=5 shared salient tokens (essentially the same headline)
let nearDup = 0, dupCaught = 0; const missedDups = [];
for (const [k, shared] of cand) { if (shared.size < 5) continue; const [a, b] = k.split("|"); nearDup++; const bothSurvive = survivors.has(a) && survivors.has(b); if (!bothSurvive) dupCaught++; else missedDups.push({ a, b, shared: shared.size, t: (byId.get(a)?.title || "").slice(0, 60) }); }
const dedupRecall = nearDup ? dupCaught / nearDup : null;

const metrics = {
  corpus: oracle.corpus, oracle: "claude-opus-4-8 (uncalibrated)", calibration: oracle.calibration,
  clustering_precision_pairs: +(mergedPairs ? confirmed / mergedPairs : 1).toFixed(3), merged_pairs: mergedPairs, false_merges: falseMerges, cluster_level: clusterLevel,
  angle_accuracy: +(aTot ? aOk / aTot : 0).toFixed(3), angle_evaluated: aTot, angle_correct: aOk, top_miss_patterns: Object.entries(misses).sort((a, b) => b[1] - a[1]).slice(0, 6),
  ranking: { minor_in_top3: minorInTop3, conformance_pass: minorInTop3 === 0, top3_importance: top3, majors_outside_top3: majorsOutsideTop3 },
  dedup_recall_nearident: dedupRecall == null ? null : +dedupRecall.toFixed(3), near_identical_pairs: nearDup, caught: dupCaught, missed: missedDups.length, missed_examples: missedDups.slice(0, 8),
};
writeFileSync(`${DIR}/metrics.json`, JSON.stringify(metrics, null, 2));
console.log("=== ORACLE vs ACTUAL — TODAY (insight_2026-06-23) ===");
console.log(JSON.stringify({ clustering_precision_pairs: metrics.clustering_precision_pairs, cluster_level: clusterLevel, false_merges: falseMerges.map(f => f.event), angle_accuracy: metrics.angle_accuracy, angle: `${aOk}/${aTot}`, top_miss_patterns: metrics.top_miss_patterns, ranking: metrics.ranking, dedup_recall_nearident: metrics.dedup_recall_nearident, near_identical_pairs: nearDup, missed_dups: missedDups.length }, null, 2));
