import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { describe, it } from "vitest";
import { DEFAULT_CONFIG, InsightStory, SnapshotSlot } from "../../src/insight/src/types/index.ts";
import { runInsightPipeline } from "../../src/insight/src/pipeline/pipeline.ts";
import { computeTrustScore, getSourceContentDomain, getSourceDistributionType, getSourceTier } from "../../src/insight/src/pipeline/normalize.ts";
import { classifyAngle } from "../../src/insight/src/dedup/dedup.ts";
import { invalidateSlot } from "../../src/insight/src/cache/cacheManager.ts";
import { getEmbeddings } from "../../src/adapters/embeddingsAdapter.js";

const CORPUS = "insight_synth_36h_v1";
const corpus = JSON.parse(fs.readFileSync(path.resolve(`benchmarks/corpora/${CORPUS}/corpus.json`), "utf8"));
let SHA = "nogit";
try { SHA = execSync("git rev-parse --short HEAD").toString().trim(); } catch { /* ignore */ }
const OUT = path.resolve(`benchmarks/runs/${CORPUS}/${SHA}`);
const SLOT_ORDER: SnapshotSlot[] = ["now", "minus4h", "minus12h", "minus24h", "minus36h", "minus48h"];
const H = 3600 * 1000;

function slotForAge(ageMs: number): SnapshotSlot | null {
  const h = ageMs / H;
  if (h < 2) return "now";
  if (h < 8) return "minus4h";
  if (h < 18) return "minus12h";
  if (h < 30) return "minus24h";
  if (h < 37) return "minus36h";
  return null; // pruned >37h
}
function toStory(raw: any, slot: SnapshotSlot, embedding: number[]): InsightStory {
  const title = String(raw.title), summary = String(raw.summary);
  const sourceGroup = String(raw.sourceGroup || raw.source).toLowerCase().replace(/[^a-z0-9]+/g, "_") || "unknown_source";
  const sourceTier = getSourceTier(sourceGroup);
  return {
    ...raw, id: String(raw.id), title, summary, source: String(raw.source), sourceGroup,
    url: String(raw.url), publishedAt: Number(raw.publishedAt), category: String(raw.category || "news"),
    region: String(raw.region || "India"), language: "en", capturedAtSnapshot: slot,
    canonicalUrl: String(raw.url), canonicalText: `${title} ${summary}`, canonicalTextHash: `h-${raw.id}`,
    entities: { people: [], orgs: [], places: [], products: [], symbols: [] },
    keywords: title.toLowerCase().split(/\W+/).filter(t => t.length >= 4).slice(0, 12),
    embedding, eventVerbs: [], numbers: [],
    sourceTier, sourceDistributionType: raw.isWire ? "wire" : getSourceDistributionType(sourceGroup),
    sourceContentDomain: getSourceContentDomain(sourceGroup, raw.category), correctionMarker: false,
    trustScore: computeTrustScore(sourceTier, raw.isWire ? "wire" : "originator"),
    sourceAuthority: raw.isWire ? 0.55 : 0.8, freshnessScore: 0.8, rawProminence: 0.7, sentiment: 0,
    factualDensity: 0.7, summaryQuality: 0.75,
  } as InsightStory;
}
const clearCache = () => { for (const s of SLOT_ORDER) invalidateSlot(s); };

// Precompute embeddings for ALL stories once (deterministic, dimension-consistent).
async function buildAll() {
  const texts = corpus.stories.map((s: any) => `${s.title} ${s.summary}`);
  const emb = await getEmbeddings(texts);
  const byId = new Map<string, any>();
  corpus.stories.forEach((s: any, i: number) => byId.set(s.id, { raw: s, emb: emb[i] || [] }));
  return byId;
}
function visibleAt(now: number, byId: Map<string, any>): Map<SnapshotSlot, InsightStory[]> {
  const bySlot = new Map<SnapshotSlot, InsightStory[]>();
  for (const slot of SLOT_ORDER) bySlot.set(slot, []);
  for (const { raw, emb } of byId.values()) {
    if (raw.publishedAt > now) continue;
    const slot = slotForAge(now - raw.publishedAt);
    if (!slot) continue;
    bySlot.get(slot)!.push(toStory(raw, slot, emb));
  }
  return bySlot;
}
function projectParents(parents: any[], storiesById: Map<string, InsightStory>) {
  return parents.map((p: any, rank: number) => ({
    rank, parentId: p.parentId, finalParentScore: p.finalParentScore, weakTree: p.weakTree,
    clusterStoryIds: p.clusterStoryIds, childStoryIds: p.childStoryIds,
    childAngles: (p.childStoryIds || []).map((id: string) => storiesById.get(id)?.angle).filter(Boolean),
  }));
}

describe("Synthetic 36h replay", () => {
  it("replays 24 cycles (cold per-cycle + warm incremental) under virtual clock", async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const byId = await buildAll();
    const realNow = Date.now;
    const cold: any[] = [];

    // COLD: each cycle is an independent full run at virtual clock = cycle fetchedAt.
    for (const { cycle, fetchedAt } of corpus.cycles) {
      (Date as any).now = () => fetchedAt;
      clearCache();
      const bySlot = visibleAt(fetchedAt, byId);
      const fetcher = async (slot: SnapshotSlot) => bySlot.get(slot) || [];
      const res = await runInsightPipeline(fetcher, DEFAULT_CONFIG);
      // capture angle for every clustered story
      const storyCluster: Record<string, string> = {};
      const storyAngle: Record<string, string> = {};
      for (const p of res.parents) for (const id of p.clusterStoryIds) { storyCluster[id] = p.parentId; const s = res.storiesById.get(id); if (s) storyAngle[id] = classifyAngle(s); }
      cold.push({ cycle, fetchedAt, parents: projectParents(res.parents, res.storiesById), storyCluster, storyAngle, hiddenIds: [...res.hiddenIds] });
    }
    (Date as any).now = realNow;

    // WARM: sequential pass retaining cache across cycles (incremental path) for divergence metric.
    const warmCheckpoints = [8, 16, 23];
    const warm: any[] = [];
    clearCache();
    for (const { cycle, fetchedAt } of corpus.cycles) {
      (Date as any).now = () => fetchedAt;
      const bySlot = visibleAt(fetchedAt, byId);
      const fetcher = async (slot: SnapshotSlot) => bySlot.get(slot) || [];
      const res = await runInsightPipeline(fetcher, DEFAULT_CONFIG); // cache persists (no clear)
      if (warmCheckpoints.includes(cycle)) {
        const storyCluster: Record<string, string> = {};
        for (const p of res.parents) for (const id of p.clusterStoryIds) storyCluster[id] = p.parentId;
        warm.push({ cycle, parents: projectParents(res.parents, res.storiesById), storyCluster });
      }
    }
    (Date as any).now = realNow;

    fs.writeFileSync(path.join(OUT, "replay.json"), JSON.stringify({ corpus: CORPUS, git_sha: SHA, cycles: corpus.cycles.length, cold, warm, warmCheckpoints }, null, 2));
    fs.appendFileSync(path.resolve("audit/evidence/A0-progress.log"), `${new Date().toISOString()} [SYNTH-REPLAY] wrote ${OUT}/replay.json cold=${cold.length} warm=${warm.length}\n`);
    console.log(`[SYNTH-REPLAY] cold cycles=${cold.length} warm checkpoints=${warm.length} → ${OUT}/replay.json`);
  }, 600000);
});
