// Recall-candidate sampler: find likely same-event story pairs (shared salient entities)
// that the pipeline did NOT co-surface in the same cluster → candidates for false splits /
// recall misses. Prints texts for oracle judgment.
// Usage: node benchmarks/ground_truth/insight_2026-06-23_oracle/sample_recall_candidates.mjs
import { readFileSync } from "node:fs";

const snap = JSON.parse(readFileSync("benchmarks/corpora/insight_2026-06-23/snapshot.json", "utf8"));
const dump = JSON.parse(readFileSync("benchmarks/corpora/insight_2026-06-23/pipeline_dump.json", "utf8"));
const byId = new Map(snap.stories.map(s => [String(s.id || s.url), s]));

// surfaced cluster assignment (top-N parents)
const clusterOf = new Map();
for (const p of dump.run1.parents) for (const id of p.clusterStoryIds) clusterOf.set(id, p.parentId);

const STOP = new Set("the a an of to in on for and or with from as at by is are was were after over amid says will new how what why its his her their this that into out up down off".split(" "));
function salient(s) {
  const title = String(s.title || "");
  // capitalized / proper-noun-ish tokens + long content tokens
  const toks = (title.match(/\b[A-Z][a-zA-Z]{3,}\b/g) || []).map(t => t.toLowerCase());
  const longt = title.toLowerCase().split(/\W+/).filter(t => t.length >= 5 && !STOP.has(t));
  return new Set([...toks, ...longt].filter(t => !STOP.has(t)));
}
const sal = new Map(snap.stories.map(s => [String(s.id || s.url), salient(s)]));

// invert: token -> stories
const tokStories = new Map();
for (const [id, set] of sal) for (const t of set) { if (!tokStories.has(t)) tokStories.set(t, []); tokStories.get(t).push(id); }
// token rarity: ignore tokens appearing in >12 stories (too generic)
const candidates = new Map(); // pairKey -> {a,b,shared:Set}
for (const [t, ids] of tokStories) {
  if (ids.length < 2 || ids.length > 12) continue;
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = ids[i], b = ids[j]; const key = a < b ? a + "|" + b : b + "|" + a;
    if (!candidates.has(key)) candidates.set(key, { a, b, shared: new Set() });
    candidates.get(key).shared.add(t);
  }
}
// keep pairs with >=2 shared salient tokens AND not co-surfaced in the same cluster
const out = [];
for (const { a, b, shared } of candidates.values()) {
  if (shared.size < 2) continue;
  const ca = clusterOf.get(a), cb = clusterOf.get(b);
  if (ca && cb && ca === cb) continue; // already co-clustered → caught, skip
  out.push({ a, b, shared: [...shared], coSurfaced: false, ca: ca || null, cb: cb || null,
    ta: (byId.get(a)?.title || "").slice(0, 80), sa: byId.get(a)?.source,
    tb: (byId.get(b)?.title || "").slice(0, 80), sb: byId.get(b)?.source });
}
out.sort((x, y) => y.shared.length - x.shared.length);
console.log(`recall candidates (>=2 shared salient tokens, NOT co-surfaced): ${out.length}`);
for (const c of out.slice(0, 22)) {
  console.log(`\n[${c.shared.join(",")}]  ca=${c.ca ? "surfaced" : "—"} cb=${c.cb ? "surfaced" : "—"}`);
  console.log(`  A ${c.a}: ${c.ta} <${c.sa}>`);
  console.log(`  B ${c.b}: ${c.tb} <${c.sb}>`);
}
