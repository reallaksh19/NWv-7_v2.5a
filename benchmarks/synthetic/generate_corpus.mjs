// ──────────────────────────────────────────────────────────────────────────
//  Insight SYNTHETIC-STRUCTURAL benchmark — corpus generator
//  Innovation: construction-time ground truth. Every story is emitted WITH its
//  true cluster / angle / importance / injection-cycle, so labels are free and
//  κ = 1.0 by construction (no LLM judge, no human calibration, no 36h wait).
//  Deterministic: corpus = f(SEED, TEMPLATE_VERSION). Frozen via content hashes.
//
//  NOTE: this measures LOGICAL/STRUCTURAL conformance ("does the pipeline obey
//  its rules"), NOT real-world editorial accuracy. It complements — never
//  replaces — the real-data benchmark (plan §B1).
//  Run: node benchmarks/synthetic/generate_corpus.mjs
// ──────────────────────────────────────────────────────────────────────────
import { writeFileSync, mkdirSync } from "node:fs";
import crypto from "node:crypto";

const SEED = 20260615;
const TEMPLATE_VERSION = "synth-tpl-v1";
const CORPUS = "insight_synth_36h_v1";
const CYCLES = 24;                 // ~hourly over 36h (1.5h spacing)
const CYCLE_SPACING_MS = 1.5 * 3600 * 1000;
const T0 = Date.parse("2026-06-15T02:00:00Z"); // virtual start (weekday IST morning)
const H = 3600 * 1000;
const OUT_CORPUS = `benchmarks/corpora/${CORPUS}`;
const OUT_GT = `benchmarks/ground_truth/${CORPUS}`;

// Deterministic RNG (mulberry32).
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = rng(SEED);
const pick = arr => arr[Math.floor(rnd() * arr.length)];

// Token banks — IN_VOCAB tokens are real FIXED_VOCAB terms (clusterable via TF-IDF);
// OOV tokens are hyperlocal/invented (exercise F5-1 / I010); HOMONYM are place≈common-word.
const VOCAB = {
  rbi: ["rbi", "repo", "rate", "inflation", "sensex", "nifty"],
  election: ["election", "vote", "party", "minister", "congress", "bjp"],
  court: ["court", "supreme", "verdict", "bail", "law"],
  oil: ["oil", "crude", "sanctions", "russia", "export"],
  market: ["sensex", "nifty", "shares", "stock", "rally", "crash"],
  cricket: ["cricket", "match", "captain", "ipl", "win"],
  space: ["isro", "satellite", "launch", "mission", "orbit"],
  defence: ["defence", "border", "army", "minister", "treaty"],
};
const OOV = {
  trichy_flyover: ["trichy", "srirangam", "woraiyur", "flyover", "manapparai"],
  local_civic: ["kollidam", "thillai", "panchayat", "collectorate", "thanjavur"],
};
const HOMONYM = ["reading", "nice", "mobile", "reading", "march"];
const ANGLE_FLAVOR = {
  base_report: [],
  official_response: ["minister", "statement", "official", "government"],
  market_reaction: ["sensex", "shares", "stock", "rally"],
  fact_update: ["update", "revised", "new"],
  expert_analysis: ["analysis", "economists"],
  investigative_detail: ["investigation", "probe", "cbi"],
  reaction_public: ["protest", "residents", "public"],
  regional_followup: ["district", "local"],
  correction: ["correction", "clarifies"],
  background_context: ["background", "explainer"],
  opinion_editorial: ["opinion", "editorial"],
};
const WIRE_SOURCES = ["PTI", "ANI", "Reuters Wire", "IANS", "Syndicated", "AP Wire"];
const ORIG_SOURCES = ["The Hindu", "Hindustan Times", "NDTV", "Moneycontrol", "Economic Times", "Business Line", "Indian Express"];

// ── Template set: one entry per declared event; coverage by enumeration. ──
// shape: { family, importance, vocab:'in'|'oov'|'homonym', firstCycle, variants:[{angle, src?, wire?, cycleOffset}], challenges:[...] }
const TEMPLATES = [];
const add = t => TEMPLATES.push(t);

// dedup_layer3_event + persistence + angle diversity (major, multi-cycle)
add({ id: "EVT_RBI", family: "rbi", importance: "major", vocab: "in", firstCycle: 2,
  variants: [{ angle: "base_report", cycleOffset: 0 }, { angle: "market_reaction", cycleOffset: 0 }, { angle: "expert_analysis", cycleOffset: 1 }, { angle: "fact_update", cycleOffset: 4 }, { angle: "official_response", cycleOffset: 6 }],
  challenges: ["dedup_layer3_event", "persistence_multi_cycle", "angle_confusable"] });
add({ id: "EVT_ELECTION", family: "election", importance: "major", vocab: "in", firstCycle: 1,
  variants: [{ angle: "base_report", cycleOffset: 0 }, { angle: "fact_update", cycleOffset: 2 }, { angle: "official_response", cycleOffset: 3 }, { angle: "reaction_public", cycleOffset: 5 }],
  challenges: ["dedup_layer3_event", "persistence_multi_cycle"] });
add({ id: "EVT_COURT", family: "court", importance: "notable", vocab: "in", firstCycle: 5,
  variants: [{ angle: "base_report", cycleOffset: 0 }, { angle: "official_response", cycleOffset: 1 }, { angle: "expert_analysis", cycleOffset: 2 }],
  challenges: ["dedup_layer3_event", "angle_confusable"] });

// dedup_layer1_url (identical URL across feeds)
add({ id: "EVT_URLDUP", family: "space", importance: "notable", vocab: "in", firstCycle: 3,
  variants: [{ angle: "base_report", cycleOffset: 0 }, { angle: "base_report", cycleOffset: 0, sameUrl: true }],
  challenges: ["dedup_layer1_url"] });
// dedup_layer2_hash (identical title/text, different URL)
add({ id: "EVT_HASHDUP", family: "cricket", importance: "notable", vocab: "in", firstCycle: 4,
  variants: [{ angle: "base_report", cycleOffset: 0 }, { angle: "base_report", cycleOffset: 0, sameText: true }],
  challenges: ["dedup_layer2_hash"] });

// wire_syndication + rank_minor_trap (minor story syndicated across many wires)
add({ id: "EVT_VIRAL", family: "cricket", importance: "minor", vocab: "in", firstCycle: 8,
  variants: Array.from({ length: 6 }, (_, i) => ({ angle: "base_report", wire: true, cycleOffset: 0, variantIdx: i })),
  challenges: ["wire_syndication", "rank_minor_trap"] });

// location_oov (F5-1) — hyperlocal cluster, oversampled
add({ id: "EVT_TRICHY", family: "trichy_flyover", importance: "notable", vocab: "oov", firstCycle: 6,
  variants: [{ angle: "base_report", cycleOffset: 0 }, { angle: "regional_followup", cycleOffset: 1 }, { angle: "official_response", cycleOffset: 2 }],
  challenges: ["location_oov", "dedup_layer3_event"] });
add({ id: "EVT_CIVIC", family: "local_civic", importance: "minor", vocab: "oov", firstCycle: 9,
  variants: [{ angle: "base_report", cycleOffset: 0 }, { angle: "reaction_public", cycleOffset: 1 }],
  challenges: ["location_oov"] });

// location_homonym
add({ id: "EVT_HOMONYM", family: "court", importance: "notable", vocab: "homonym", firstCycle: 7,
  variants: [{ angle: "base_report", cycleOffset: 0 }, { angle: "fact_update", cycleOffset: 1 }],
  challenges: ["location_homonym"] });

// breaking_new_event + breaking_vs_important (F5-2): NEW major enters mid-corpus at cycle 14
add({ id: "EVT_BREAKING", family: "defence", importance: "major", vocab: "in", firstCycle: 14,
  variants: [{ angle: "base_report", cycleOffset: 0 }, { angle: "fact_update", cycleOffset: 1 }, { angle: "official_response", cycleOffset: 2 }, { angle: "fact_update", cycleOffset: 3 }],
  challenges: ["breaking_new_event", "breaking_vs_important", "persistence_multi_cycle"] });
// a persistent-but-minor event running long (the foil for breaking_vs_important)
add({ id: "EVT_PERSIST_MINOR", family: "market", importance: "minor", vocab: "in", firstCycle: 1,
  variants: Array.from({ length: 8 }, (_, i) => ({ angle: i % 2 ? "fact_update" : "base_report", cycleOffset: i * 2 })),
  challenges: ["persistence_multi_cycle", "breaking_vs_important"] });

// date_format_zoo / date_tz_mixed / date_headline_vs_meta (raw date variants on one event)
add({ id: "EVT_DATEZOO", family: "oil", importance: "notable", vocab: "in", firstCycle: 3,
  variants: [{ angle: "base_report", cycleOffset: 0, dateFmt: "iso_z" }, { angle: "fact_update", cycleOffset: 0, dateFmt: "ist_offset" }, { angle: "base_report", cycleOffset: 0, dateFmt: "rfc822" }, { angle: "base_report", cycleOffset: 0, dateFmt: "epoch" }, { angle: "base_report", cycleOffset: 0, dateFmt: "relative" }, { angle: "base_report", cycleOffset: 0, dateFmt: "headline_vs_meta" }],
  challenges: ["date_format_zoo", "date_tz_mixed", "date_headline_vs_meta"] });

// angle_unknown_floor (deliberately vague headlines → unknown/base)
add({ id: "EVT_VAGUE", family: "court", importance: "minor", vocab: "in", firstCycle: 10,
  variants: [{ angle: "unknown", cycleOffset: 0, vague: true }, { angle: "unknown", cycleOffset: 1, vague: true }],
  challenges: ["angle_unknown_floor"] });

// control — unrelated unique stories (one per several cycles), ~10%
for (let i = 0; i < 8; i++) add({ id: `EVT_CTRL_${i}`, family: pick(Object.keys(VOCAB)), importance: pick(["minor", "notable"]), vocab: "in", firstCycle: (i * 3) % CYCLES, variants: [{ angle: "base_report", cycleOffset: 0, ctrl: true, ctrlIdx: i }], challenges: ["control"] });

// ── Expansion ──
const sha = t => "sha256:" + crypto.createHash("sha256").update(String(t)).digest("hex").slice(0, 12);
const cycleTime = c => T0 + c * CYCLE_SPACING_MS;
function fmtDate(epoch, fmt) {
  const d = new Date(epoch);
  switch (fmt) {
    case "iso_z": return d.toISOString();
    case "ist_offset": return d.toISOString().replace("Z", "+05:30");
    case "rfc822": return d.toUTCString();
    case "epoch": return String(Math.floor(epoch / 1000));
    case "relative": return "2 hours ago";
    case "headline_vs_meta": return d.toISOString(); // meta correct; headline carries a wrong date (see title)
    default: return d.toISOString();
  }
}
function tokensFor(tpl) {
  if (tpl.vocab === "oov") return OOV[tpl.family] || Object.values(OOV)[0];
  if (tpl.vocab === "homonym") return [pick(HOMONYM), pick(HOMONYM), ...(VOCAB[tpl.family] || []).slice(0, 2)];
  return VOCAB[tpl.family] || ["news"];
}

const stories = [];
const gtPairs = [], gtGroups = [], gtAngles = [], gtRanks = [];
let sidSeq = 0;

for (const tpl of TEMPLATES) {
  const core = tokensFor(tpl);
  const clusterId = `C_${tpl.id}`;
  const memberIds = [];
  let firstSeenCycle = Infinity;
  let sharedUrl = null, sharedText = null;

  tpl.variants.forEach((v, vi) => {
    const cyc = (tpl.firstCycle + (v.cycleOffset || 0)) % (CYCLES + 1);
    const t = cycleTime(cyc) + Math.floor(rnd() * 20 * 60 * 1000); // jitter within cycle
    firstSeenCycle = Math.min(firstSeenCycle, cyc);
    const id = `synth_${tpl.id}_${vi}_${(sidSeq++).toString(36)}`;
    const source = v.wire ? pick(WIRE_SOURCES) : pick(ORIG_SOURCES);
    const flavor = v.vague ? ["situation", "developments"] : (ANGLE_FLAVOR[v.angle] || []);
    const titleTokens = [...core.slice(0, 3), ...flavor.slice(0, 2)];
    let title = v.vague
      ? `Officials note developments amid ongoing ${core[0]} situation`
      : `${cap(core[0])} ${pickVerb(v.angle)}: ${titleTokens.slice(1).join(" ")} ${tpl.vocab === "oov" ? "in " + cap(core[0]) : ""}`.trim();
    if (v.dateFmt === "headline_vs_meta") title = `[Dated 2026-06-10] ${title}`; // headline date != meta
    const summary = `${title}. ${core.join(" ")} ${flavor.join(" ")}.`.trim();
    // dedup layer 1/2 controls
    let url;
    if (v.sameUrl) { sharedUrl = sharedUrl || `https://synth.example/${tpl.id}/canonical`; url = sharedUrl; }
    else url = `https://synth.example/${tpl.id}/${vi}-${id}`;
    let finalTitle = title, finalSummary = summary;
    if (v.sameText) { sharedText = sharedText || { t: title, s: summary }; finalTitle = sharedText.t; finalSummary = sharedText.s; }

    const publishedAt = t;
    const s = {
      id, url, title: finalTitle, summary: finalSummary, source,
      sourceGroup: source.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      publishedAt,
      pubDateRaw: fmtDate(publishedAt, v.dateFmt || "iso_z"),
      category: tpl.family, region: tpl.vocab === "oov" ? "Tamil Nadu" : "India",
      isWire: !!v.wire,
      // ── construction-time ground truth ──
      truth: { cluster: clusterId, angle: v.angle, importance: tpl.importance, firstSeenCycle, vocabMode: tpl.vocab, challenges: tpl.challenges },
    };
    stories.push(s);
    memberIds.push(id);

    // angle GT record (skip pure controls/dups where angle isn't the point)
    if (!v.ctrl && !v.sameUrl && !v.sameText) gtAngles.push({ gt_id: `GT-ANGLE-S${gtAngles.length + 1}`, unit: "story_angle", story: id, hash: sha(finalTitle + "|" + finalSummary), label: v.angle, stratum: tpl.challenges.includes("angle_unknown_floor") ? "angle_unknown_floor" : "angle_confusable", challenges: tpl.challenges, importance: tpl.importance, cluster: clusterId });
  });

  // group GT (≥2 members same event)
  if (memberIds.length >= 2 && !tpl.challenges.includes("control")) {
    gtGroups.push({ gt_id: `GT-GROUP-S${gtGroups.length + 1}`, unit: "cluster_membership", cluster: clusterId, members: memberIds, parent: memberIds[0], importance: tpl.importance, firstSeenCycle, challenges: tpl.challenges });
    // sampled positive pairs
    gtPairs.push({ gt_id: `GT-PAIR-S${gtPairs.length + 1}`, unit: "pair", stories: [memberIds[0], memberIds[1]], label: (tpl.challenges.includes("dedup_layer1_url") || tpl.challenges.includes("dedup_layer2_hash")) ? "same_event" : "same_event", stratum: "system_merged", challenges: tpl.challenges });
  }
  // rank GT
  gtRanks.push({ gt_id: `GT-RANK-S${gtRanks.length + 1}`, unit: "cluster_rank", cluster: clusterId, importance: tpl.importance, stratum: tpl.challenges.includes("rank_minor_trap") ? "rank_minor_trap" : (tpl.challenges.includes("breaking_vs_important") ? "breaking_vs_important" : "control"), challenges: tpl.challenges });
}

// negative control pairs (cross-cluster unrelated)
const ctrlStories = stories.filter(s => s.truth.challenges.includes("control"));
for (let i = 0; i + 1 < ctrlStories.length; i += 2) {
  gtPairs.push({ gt_id: `GT-PAIR-S${gtPairs.length + 1}`, unit: "pair", stories: [ctrlStories[i].id, ctrlStories[i + 1].id], label: "unrelated", stratum: "control", challenges: ["control"] });
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function pickVerb(angle) { return ({ base_report: "reported", market_reaction: "rattles markets", official_response: "statement issued", fact_update: "update", expert_analysis: "analysis", investigative_detail: "probe", reaction_public: "sparks reaction", regional_followup: "local update", correction: "clarification", unknown: "noted" })[angle] || "reported"; }

// ── Emit corpus + manifest + ground-truth ──
mkdirSync(OUT_CORPUS, { recursive: true });
mkdirSync(OUT_GT, { recursive: true });
const cycles = Array.from({ length: CYCLES }, (_, c) => ({ cycle: c, fetchedAt: cycleTime(c) }));
const corpusObj = { corpus: CORPUS, seed: SEED, templateVersion: TEMPLATE_VERSION, kind: "SYNTHETIC-STRUCTURAL (construction-time ground truth; complements, does not replace, the real-data benchmark)", cycles, story_count: stories.length, virtual_window: { start: new Date(T0).toISOString(), cycles: CYCLES, spacing_h: 1.5 }, stories };
writeFileSync(`${OUT_CORPUS}/corpus.json`, JSON.stringify(corpusObj, null, 2));

const tagCounts = {};
for (const s of stories) for (const ch of s.truth.challenges) tagCounts[ch] = (tagCounts[ch] || 0) + 1;
const oov = stories.filter(s => s.truth.vocabMode === "oov").length;
const manifest = {
  corpus: CORPUS, kind: corpusObj.kind, seed: SEED, templateVersion: TEMPLATE_VERSION,
  generator: "benchmarks/synthetic/generate_corpus.mjs", frozen_by: "seed + templateVersion",
  story_count: stories.length, template_count: TEMPLATES.length, cycles: CYCLES,
  oov_story_count: oov, content_hash: sha(JSON.stringify(stories.map(s => s.id + s.title))),
  challenge_tag_counts: tagCounts,
  ground_truth_counts: { pairs: gtPairs.length, groups: gtGroups.length, angles: gtAngles.length, ranks: gtRanks.length },
  // NOTE: intentionally no generated_at — the corpus is fully seed-deterministic, so the
  // manifest must be byte-stable across regenerations (avoids spurious git churn / CI noise).
};
writeFileSync(`${OUT_CORPUS}/manifest.json`, JSON.stringify(manifest, null, 2));
writeFileSync(`${OUT_GT}/ground_truth.json`, JSON.stringify({ corpus: CORPUS, provenance: { method: "construction-time (generator)", judge: "n/a-generated", kappa: 1.0, note: "labels are the generator's design intent; no judge/human needed" }, pairs: gtPairs, groups: gtGroups, angles: gtAngles, ranks: gtRanks }, null, 2));

console.log("SYNTHETIC CORPUS GENERATED");
console.log(JSON.stringify({ stories: stories.length, templates: TEMPLATES.length, cycles: CYCLES, oov, ...manifest.ground_truth_counts, tags_covered: Object.keys(tagCounts).length }, null, 2));
console.log("tag counts:", JSON.stringify(tagCounts));
