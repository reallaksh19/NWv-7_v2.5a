// Compare the ORACLE (ideal) labels vs the ACTUAL pipeline output on the real
// frozen snapshot insight_2026-05-19. Reproducible: reads oracle_labels.json +
// the A2 dump (pipeline output). Emits metrics + ORACLE_VS_ACTUAL.md.
// Usage: node benchmarks/ground_truth/insight_2026-05-19_oracle/compare_oracle_vs_actual.mjs
import { readFileSync, writeFileSync } from "node:fs";

const DIR = "benchmarks/ground_truth/insight_2026-05-19_oracle";
const oracle = JSON.parse(readFileSync(`${DIR}/oracle_labels.json`, "utf8"));
const dump = JSON.parse(readFileSync("audit/evidence/A2-dump.json", "utf8"));
const pAngle = dump.storyFacts;
const parentsById = new Map(dump.run1.parents.map(p => [p.parentId, p]));
const ranked = dump.run1.parents.map(p => p.parentId); // dump order = pipeline order

// ── Clustering precision: of the within-cluster (merged) pairs, % oracle confirms same-event ──
let mergedPairs = 0, confirmed = 0; const falseMerges = [];
for (const c of oracle.clusters) {
  const p = parentsById.get(c.parentId); if (!p) continue;
  const ids = p.clusterStoryIds;
  const nPairs = ids.length * (ids.length - 1) / 2;
  mergedPairs += nPairs;
  if (c.valid_single_event) confirmed += nPairs; else falseMerges.push({ parentId: c.parentId, event: c.event, pairs: nPairs });
}
const clusteringPrecision = mergedPairs ? confirmed / mergedPairs : 1;

// ── Angle accuracy: oracle angle vs pipeline angle, per story ──
let aTot = 0, aOk = 0; const angleMisses = [];
for (const c of oracle.clusters) for (const [id, oa] of Object.entries(c.angles)) {
  const pa = pAngle[id]?.angle; if (!pa) continue; aTot++;
  if (pa === oa) aOk++; else angleMisses.push({ id, cluster: c.parentId, oracle: oa, pipeline: pa });
}
const angleAccuracy = aTot ? aOk / aTot : null;

// ── Ranking conformance: minor in top-3? majors placement? ──
const impByParent = new Map(oracle.clusters.map(c => [c.parentId, c.importance]));
const top3 = ranked.slice(0, 3).map(pid => ({ pid, imp: impByParent.get(pid) }));
const top5 = ranked.slice(0, 5).map(pid => impByParent.get(pid));
const minorInTop3 = top3.filter(x => x.imp === "minor").length;
const majors = oracle.clusters.filter(c => c.importance === "major").map(c => ({ event: c.event, rank: ranked.indexOf(c.parentId) }));
const majorsOutsideTop5 = majors.filter(m => m.rank >= 5);

const metrics = {
  corpus: oracle.corpus, oracle: "claude-opus-4-8 (uncalibrated)", calibration: oracle.calibration,
  clustering_precision: +clusteringPrecision.toFixed(3), merged_pairs: mergedPairs, confirmed_same_event: confirmed, false_merges: falseMerges,
  angle_accuracy: angleAccuracy == null ? null : +angleAccuracy.toFixed(3), angle_evaluated: aTot, angle_misses: angleMisses,
  ranking: { minor_in_top3: minorInTop3, conformance_pass: minorInTop3 === 0, top3_importance: top3.map(x => x.imp), top5_importance: top5, majors_outside_top5: majorsOutsideTop5 },
};
writeFileSync(`${DIR}/metrics.json`, JSON.stringify(metrics, null, 2));

const md = [
  "# Oracle (ideal) vs Actual (pipeline) — real snapshot insight_2026-05-19",
  "", `Oracle: **${metrics.oracle}** · ${oracle.calibration}`,
  `Corpus: \`${oracle.source_snapshot}\` (sha256 ${oracle.source_file_sha256_12}); scope: top-10 clusters / ${aTot} stories.`,
  "", "## Headline (real-data accuracy, INDICATIVE)",
  "| Metric | Oracle-vs-Actual | Note |", "|---|---|---|",
  `| Clustering precision | **${metrics.clustering_precision}** (${confirmed}/${mergedPairs} merged pairs) | ${falseMerges.length} false merge(s) |`,
  `| Angle accuracy | **${metrics.angle_accuracy}** (${aOk}/${aTot}) | pipeline keyword classifier vs ideal |`,
  `| Ranking: minor in top-3 | **${minorInTop3}** → ${metrics.ranking.conformance_pass ? "PASS" : "FAIL"} | |`,
  `| Majors outside top-5 | ${majorsOutsideTop5.length} | ${majorsOutsideTop5.map(m => m.event + " (rank " + m.rank + ")").join("; ") || "none"} |`,
  "", "## False merges (clustering precision)",
  ...(falseMerges.length ? falseMerges.map(f => `- \`${f.parentId}\` — ${f.event}`) : ["- none"]),
  "", "## Angle disagreements (ideal → pipeline)",
  ...angleMisses.map(m => `- \`${m.id}\` (${m.cluster.split("_")[1]}): ideal **${m.oracle}**, pipeline **${m.pipeline}**`),
  "", "## Reading",
  "- Clustering precision is high — when the pipeline merges, it is usually right; the one false merge is the 'US oil waiver extends vs lapses' pair (related, not same).",
  "- Angle is the weak stage on real data too (≈" + Math.round((metrics.angle_accuracy||0)*100) + "%), echoing the synthetic benchmark (39.5%) and the audit (A2.3). Most misses over-apply official_response / market_reaction.",
  "- No minor story reached top-3 on this snapshot; but " + majorsOutsideTop5.length + " major story/ies sit outside the top-5 (a routine ministerial tour outranks them) — a ranking-quality signal, not a hard alarm.",
  "", "_Caveat: single uncalibrated LLM oracle. Treat as indicative; certify with a human κ sample (plan §B2.4) before gating on these numbers._",
].join("\n");
writeFileSync(`${DIR}/ORACLE_VS_ACTUAL.md`, md + "\n");

console.log("=== ORACLE vs ACTUAL (real insight_2026-05-19, top-10 clusters) ===");
console.log(JSON.stringify({ clustering_precision: metrics.clustering_precision, false_merges: falseMerges.length, angle_accuracy: metrics.angle_accuracy, angle_misses: angleMisses.length, minor_in_top3: minorInTop3, majors_outside_top5: majorsOutsideTop5.length }, null, 2));
