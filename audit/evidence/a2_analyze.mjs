// A2 invariant analysis over the frozen-snapshot dump (audit/evidence/A2-dump.json).
// Pure, fast, re-runnable: node audit/evidence/a2_analyze.mjs
import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync(new URL("./A2-dump.json", import.meta.url), "utf8"));
const P = d.run1.parents, SF = d.storyFacts, cfg = d.config;
const r = (n, k = 3) => Number(n).toFixed(k);
const out = (t) => console.log(t);

out(`# A2 ANALYSIS — ${d.snapshot} (contentHash ${d.contentHash}, node ${d.node})`);
out(`config: ${JSON.stringify(cfg)}`);
out(`parents=${P.length} storiesIn=${d.storiesIn} storiesClustered=${d.storiesClustered} hidden=${d.hiddenCount}\n`);

// ── A2.1 Normalize/intake accounting ──
const excluded = d.storiesIn - d.storiesClustered - d.hiddenCount;
const noAngle = Object.values(SF).filter(s => !s.angle).length;
const noTier = Object.values(SF).filter(s => !s.sourceTier).length;
const noSlot = Object.values(SF).filter(s => !s.slot).length;
out(`## A2.1 intake`);
out(`  accounting: in ${d.storiesIn} = clustered ${d.storiesClustered} + hidden ${d.hiddenCount} + excluded ${excluded} (tier-D/stale/tier-C fallback)`);
out(`  storiesClustered missing angle=${noAngle} sourceTier=${noTier} slot=${noSlot}\n`);

// ── A2.2 Dedup ──
const zeroNorm = Object.values(SF).filter(s => s.embedNorm === 0).length;
const hiddenOnParents = P.reduce((a, p) => a + (p.hiddenDuplicateIds?.length || 0), 0);
out(`## A2.2 dedup`);
out(`  zero-vector embeddings (F5-5 guard relevance): ${zeroNorm}`);
out(`  hiddenDuplicateIds carried on parents: ${hiddenOnParents} (vs pipeline hiddenCount ${d.hiddenCount})\n`);

// ── A2.3 Angle ──
const ALL_ANGLES = ["base_report","official_response","market_reaction","fact_update","expert_analysis","regional_followup","correction","background_context","reaction_public","investigative_detail","opinion_editorial","unknown"];
const angleCounts = {};
for (const s of Object.values(SF)) angleCounts[s.angle] = (angleCounts[s.angle] || 0) + 1;
const seen = new Set(Object.keys(angleCounts));
const unreachable = ALL_ANGLES.filter(a => !seen.has(a));
const unknownRate = (angleCounts["unknown"] || 0) / d.storiesClustered;
const visAngles = P.map(p => new Set(p.childAngles).size);
const avgVis = visAngles.reduce((a, b) => a + b, 0) / (P.length || 1);
const multiAngle = visAngles.filter(n => n >= 2).length;
out(`## A2.3 angle`);
out(`  per-angle firing: ${JSON.stringify(angleCounts)}`);
out(`  angle labels never seen on this corpus: ${JSON.stringify(unreachable)}`);
out(`  unknown rate=${r(unknownRate)}  avgVisibleAngles/parent=${r(avgVis)} (RCA target >=1.8)  multiAngleParents=${multiAngle} (target >=8)\n`);

// ── A2.4 Cluster order-sensitivity (normal vs reversed input) ──
const pairs = (ps) => { const set = new Set(); for (const p of ps) { const ids = [...(p.clusterStoryIds || [])].sort(); for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) set.add(ids[i] + "|" + ids[j]); } return set; };
const p1 = pairs(P), p2 = pairs(d.run2_reversed.parents);
let kept = 0; for (const x of p1) if (p2.has(x)) kept++;
out(`## A2.4 cluster order-sensitivity (normal vs reversed input)`);
out(`  parents: normal=${P.length} reversed=${d.run2_reversed.parentCount}`);
out(`  co-membership pairs: normal=${p1.size} reversed=${p2.size} preserved=${kept} -> stability=${r(p1.size ? kept / p1.size : 1)}\n`);

// ── A2.5 Ranking ──
const COMP = ["impactScore","persistenceScore","sourceDiversityScore","noveltyScore","freshnessScore","crossSnapshotMomentum","editorialClarityScore","regionBoost","timelineCompletenessScore","evolutionDiversityScore","informationDeltaScore","wirePenaltyScore"];
const W = { impactScore:0.28, persistenceScore:0.20, sourceDiversityScore:0.14, noveltyScore:0.12, freshnessScore:0.16, crossSnapshotMomentum:0.08, editorialClarityScore:0.05, regionBoost:0.03, timelineCompletenessScore:0.04, evolutionDiversityScore:0.08, informationDeltaScore:0.10, wirePenaltyScore:-0.06 };
let rangeViol = [];
for (const p of P) for (const c of COMP) { const v = p.components[c]; if (!(v >= 0 && v <= 1)) rangeViol.push(`${p.parentId}.${c}=${v}`); }
// breakdown-sum: does debug.scoreBreakdown sum to finalParentScore? does full 12-term weighted sum?
let bdRows = [];
for (const p of P) {
  const bd = p.scoreBreakdown || {};
  const bdSum = Object.values(bd).reduce((a, b) => a + Number(b || 0), 0);
  const fullWeighted = COMP.reduce((a, c) => a + (Number(p.components[c] || 0) * W[c]), 0);
  bdRows.push({ id: p.parentId, final: p.finalParentScore, bdKeys: Object.keys(bd).length, bdSum, fullWeighted });
}
const dBd = bdRows.map(x => Math.abs(x.bdSum - x.final));
const dFull = bdRows.map(x => Math.abs(x.fullWeighted - x.final));
const regionReachable = P.filter(p => p.components.regionBoost > 0).length;
const wirePos = P.filter(p => p.components.wirePenaltyScore > 0).length;
out(`## A2.5 ranking`);
out(`  components in [0,1] pre-weight: violations=${rangeViol.length} ${rangeViol.slice(0,5).join(", ")}`);
out(`  scoreBreakdown key count (first parent)=${bdRows[0]?.bdKeys} of 12 components`);
out(`  |sum(scoreBreakdown) - finalParentScore|: max=${r(Math.max(...dBd))} (does displayed breakdown explain the score?)`);
out(`  |sum(all 12 weighted) - finalParentScore|: max=${r(Math.max(...dFull))} (does full weighted model reproduce the score?)`);
out(`  region boost reachable: ${regionReachable}/${P.length} parents have regionBoost>0 (F5-1 Trichy interaction)`);
out(`  wire penalty firing: ${wirePos}/${P.length} parents have wirePenaltyScore>0\n`);

// ── A2.6 Tree ──
let childMax = 0, angleViol = [], srcViol = [], weakViol = [];
for (const p of P) {
  const n = p.childStoryIds?.length || 0; childMax = Math.max(childMax, n);
  const ac = {}; for (const a of p.childAngles) ac[a] = (ac[a] || 0) + 1;
  if (Object.values(ac).some(x => x > cfg.MAX_PER_ANGLE)) angleViol.push(`${p.parentId}:${JSON.stringify(ac)}`);
  const srcN = new Set(p.childSourceGroups).size;
  if (!p.weakTree && srcN < cfg.MIN_SOURCES_PER_TREE) srcViol.push(`${p.parentId}:src=${srcN}`);
  // weak-tree flag iff (<WEAK_TREE_CHILD_MIN children OR <2 distinct angles)
  const distinctAngles = new Set(p.childAngles).size;
  const expectWeak = (n < cfg.WEAK_TREE_CHILD_MIN) || (distinctAngles < 2);
  if (expectWeak !== !!p.weakTree) weakViol.push(`${p.parentId}: children=${n} angles=${distinctAngles} flag=${p.weakTree} expect=${expectWeak}`);
}
out(`## A2.6 tree`);
out(`  max children any parent=${childMax} (cap ${cfg.MAX_CHILDREN_PER_PARENT})  per-angle>cap violations=${angleViol.length}`);
out(`  non-weak parents with <${cfg.MIN_SOURCES_PER_TREE} source groups: ${srcViol.length} ${srcViol.slice(0,5).join(", ")}`);
out(`  weak-tree flag mismatches (flag != [children<${cfg.WEAK_TREE_CHILD_MIN} or angles<2]): ${weakViol.length}`);
out(`    ${weakViol.slice(0,8).join("\n    ")}\n`);

// ── A2.7 Quality gates (ratchet recompute) ──
out(`## A2.7 quality (ratchet recompute on frozen corpus)`);
out(`  avgVisibleAngles=${r(avgVis)} (ratchet >=1.8: ${avgVis>=1.8?"PASS":"FAIL"})  multiAngleParents=${multiAngle} (ratchet >=8: ${multiAngle>=8?"PASS":"FAIL"})`);
out(`  weakParents=${P.filter(p=>p.weakTree).length}/${P.length}`);
