import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import { DEFAULT_CONFIG, InsightStory, SnapshotSlot } from "../../src/insight/src/types/index.ts";
import { runInsightPipeline } from "../../src/insight/src/pipeline/pipeline.ts";
import {
  computeTrustScore, getSourceContentDomain, getSourceDistributionType, getSourceTier,
} from "../../src/insight/src/pipeline/normalize.ts";
import { classifyAngle } from "../../src/insight/src/dedup/dedup.ts";
import { invalidateSlot } from "../../src/insight/src/cache/cacheManager.ts";
import { getEmbeddings } from "../../src/adapters/embeddingsAdapter.js";

const SNAPSHOT_PATH = path.resolve(process.env.SNAPSHOT_PATH || "public/newsdata/insight_2026-05-19.json");
const OUT = path.resolve(process.env.DUMP_OUT || "audit/evidence/A2-dump.json");
const PROGRESS = path.resolve("audit/evidence/A0-progress.log");
const SLOT_ORDER: SnapshotSlot[] = ["now", "minus4h", "minus12h", "minus24h", "minus36h", "minus48h"];
const log = (s: string) => fs.appendFileSync(PROGRESS, `${new Date().toISOString()} [A2] ${s}\n`);

function normalizeSlot(slot: string): SnapshotSlot { return (SLOT_ORDER.includes(slot as SnapshotSlot) ? slot : "now") as SnapshotSlot; }
function getStorySlot(story: any, snapshot: any): SnapshotSlot {
  const explicit = story?.capturedAtSnapshot || story?._snapshotIntake?.selectedFromSlot;
  if (explicit) return normalizeSlot(String(explicit));
  const slotMeta = snapshot?.slotMeta || {};
  for (const slot of SLOT_ORDER) { const ids = Array.isArray(slotMeta?.[slot]?.storyIds) ? slotMeta[slot].storyIds : []; if (ids.includes(story?.id)) return slot; }
  return "now";
}
function toInsightStory(raw: any, index: number, slot: SnapshotSlot, embedding: number[]): InsightStory {
  const title = String(raw?.title || raw?.headline || "Untitled");
  const summary = String(raw?.summary || raw?.description || raw?.content || "");
  const source = String(raw?.source || raw?.sourceGroup || "Unknown source");
  const sourceGroup = (String(raw?.sourceGroup || raw?.source || "unknown_source").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")) || "unknown_source";
  const sourceTier = raw?.sourceTier || getSourceTier(sourceGroup);
  const sourceDistributionType = getSourceDistributionType(sourceGroup);
  const sourceContentDomain = getSourceContentDomain(sourceGroup, raw?.category);
  const topicTokens = Array.isArray(raw?.storySignals?.topicTokens) ? raw.storySignals.topicTokens : [];
  const numbers = Array.isArray(raw?.storySignals?.numbers) ? raw.storySignals.numbers : Array.isArray(raw?.numbers) ? raw.numbers : [];
  const keywords = Array.from(new Set([...topicTokens, ...(Array.isArray(raw?.keywords) ? raw.keywords : []), ...title.toLowerCase().split(/\W+/).filter((t: string) => t.length >= 4).slice(0, 8)])).slice(0, 16);
  return {
    ...raw, id: String(raw?.id || raw?.url || `real-snapshot-${index}`), title, summary, source, sourceGroup,
    url: String(raw?.url || raw?.link || `snapshot://real/${index}`), publishedAt: Number(raw?.publishedAt || Date.now()),
    category: String(raw?.category || "news"), region: String(raw?.region || "India"), language: String(raw?.language || "en"),
    capturedAtSnapshot: slot, canonicalUrl: String(raw?.canonicalUrl || raw?.url || raw?.link || `snapshot://real/${index}`),
    canonicalText: String(raw?.canonicalText || `${title} ${summary}`), canonicalTextHash: String(raw?.canonicalTextHash || raw?.contentHash || `real-hash-${index}`),
    entities: { people: raw?.entities?.people ?? [], orgs: raw?.entities?.orgs ?? [], places: raw?.entities?.places ?? [], products: raw?.entities?.products ?? [], symbols: raw?.entities?.symbols ?? [] },
    keywords, embedding, eventVerbs: Array.isArray(raw?.eventVerbs) ? raw.eventVerbs : [], numbers, sourceTier, sourceDistributionType, sourceContentDomain,
    sectionDomain: raw?.category ? getSourceContentDomain(sourceGroup, raw.category) : undefined,
    correctionMarker: /\b(corrects|correction|update|clarification|retraction)\b/i.test(title),
    trustScore: computeTrustScore(sourceTier, sourceDistributionType), sourceAuthority: Number(raw?.sourceAuthority || 0.7),
    freshnessScore: Number(raw?.freshnessScore || 0.75), rawProminence: Number(raw?.rawProminence || 0.65), sentiment: Number(raw?.sentiment || 0),
    factualDensity: Number(raw?.factualDensity || 0.7), summaryQuality: Number(raw?.summaryQuality || 0.75),
  } as InsightStory;
}
const clearCache = () => { for (const s of SLOT_ORDER) invalidateSlot(s); };
const l2 = (v?: number[]) => Array.isArray(v) ? Math.sqrt(v.reduce((a, x) => a + x * x, 0)) : 0;

describe("A2 dump harness", () => {
  it("dumps full pipeline output (normal + reversed input order)", async () => {
    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
    const stories = Array.isArray(snapshot?.stories) ? snapshot.stories : [];
    const texts = stories.map((s: any) => `${String(s?.title || s?.headline || "Untitled")} ${String(s?.summary || s?.description || s?.content || "")}`);
    const embeddings = await getEmbeddings(texts);
    const normalized = stories.map((s: any, i: number) => toInsightStory(s, i, getStorySlot(s, snapshot), embeddings[i] || []));
    log(`normalized ${normalized.length} stories`);

    const fetcherFrom = (arr: InsightStory[]) => async (slot: SnapshotSlot) => arr.filter(s => s.capturedAtSnapshot === slot);

    // RUN 1: normal order, full dump.
    clearCache();
    const r1 = await runInsightPipeline(fetcherFrom(normalized), DEFAULT_CONFIG);
    log(`run1 parents=${r1.parents.length} hidden=${r1.hiddenIds.size}`);

    // RUN 2: reversed input order (deterministic perturbation) for A2.4 order-sensitivity.
    clearCache();
    const reversed = [...normalized].reverse();
    const r2 = await runInsightPipeline(fetcherFrom(reversed), DEFAULT_CONFIG);
    log(`run2(reversed) parents=${r2.parents.length} hidden=${r2.hiddenIds.size}`);

    // Story-level facts (angle recomputed via classifyAngle for A2.3 reachability).
    const storyFacts: Record<string, any> = {};
    for (const [id, s] of r1.storiesById.entries()) {
      storyFacts[id] = {
        slot: s.capturedAtSnapshot, sourceGroup: s.sourceGroup, sourceTier: s.sourceTier,
        sourceDistributionType: s.sourceDistributionType, temporalTier: (s as any).temporalTier,
        angle: classifyAngle(s), embedNorm: Number(l2(s.embedding).toFixed(4)),
      };
    }
    const dumpParents = (ps: any[]) => ps.map(p => ({
      parentId: p.parentId, finalParentScore: p.finalParentScore, weakTree: p.weakTree, isRising: p.isRising,
      clusterStoryIds: p.clusterStoryIds, childStoryIds: p.childStoryIds, hiddenDuplicateIds: p.hiddenDuplicateIds,
      components: {
        impactScore: p.impactScore, persistenceScore: p.persistenceScore, sourceDiversityScore: p.sourceDiversityScore,
        noveltyScore: p.noveltyScore, freshnessScore: p.freshnessScore, crossSnapshotMomentum: p.crossSnapshotMomentum,
        editorialClarityScore: p.editorialClarityScore, regionBoost: p.regionBoost, timelineCompletenessScore: p.timelineCompletenessScore,
        evolutionDiversityScore: p.evolutionDiversityScore, informationDeltaScore: p.informationDeltaScore, wirePenaltyScore: p.wirePenaltyScore,
      },
      scoreBreakdown: p.debug?.scoreBreakdown ?? null,
      childAngles: (p.childStoryIds || []).map((id: string) => storyFacts[id]?.angle).filter(Boolean),
      childSourceGroups: (p.childStoryIds || []).map((id: string) => storyFacts[id]?.sourceGroup).filter(Boolean),
    }));

    fs.writeFileSync(OUT, JSON.stringify({
      snapshot: "public/newsdata/insight_2026-05-19.json", contentHash: "40f989d5da9c", node: process.version,
      config: { TOP_PARENTS: DEFAULT_CONFIG.TOP_PARENTS, MAX_CHILDREN_PER_PARENT: DEFAULT_CONFIG.MAX_CHILDREN_PER_PARENT,
        MAX_PER_ANGLE: DEFAULT_CONFIG.MAX_PER_ANGLE, MIN_SOURCES_PER_TREE: DEFAULT_CONFIG.MIN_SOURCES_PER_TREE,
        WEAK_TREE_CHILD_MIN: DEFAULT_CONFIG.WEAK_TREE_CHILD_MIN, MIN_CHILD_INFO_GAIN: DEFAULT_CONFIG.MIN_CHILD_INFO_GAIN,
        SAME_EVENT_THRESHOLD: DEFAULT_CONFIG.SAME_EVENT_THRESHOLD, REGION_TAGS: DEFAULT_CONFIG.REGION_TAGS },
      storiesIn: normalized.length, storiesClustered: r1.storiesById.size, hiddenCount: r1.hiddenIds.size,
      run1: { parents: dumpParents(r1.parents) },
      run2_reversed: { parentCount: r2.parents.length, parents: dumpParents(r2.parents) },
      storyFacts,
    }, null, 2));
    log(`A2 dump written: ${OUT}`);
  }, 600000);
});
