"""Insight tab-specific event/angle ranker.

Insight is not a flat news feed. It ranks event/parent candidates using event
coherence, angle diversity, source diversity, temporal evolution, information
delta, base-report caps, and weak-tree demotion.
"""
from __future__ import annotations

import re
from collections import Counter
from typing import Any

from ranking_contracts import GateResult, RankedItem, RankingResult, fail_gate, pass_gate, warn_gate, weighted_score
from ranking_gates import H_MS, freshness_score, source_confidence_score, text_blob

RANKING_PROFILE = "insight-v2-event-angle-tree"

BASE_ANGLES = {"base_report", "unknown", "missing", "base"}
SCORE_WEIGHTS = {
    "eventImportanceScore": 0.25,
    "sourceAuthorityScore": 0.15,
    "sourceDiversityScore": 0.15,
    "angleDiversityScore": 0.20,
    "temporalEvolutionScore": 0.10,
    "noveltyDeltaScore": 0.10,
    "freshnessScore": 0.05,
}
CHILD_SCORE_WEIGHTS = {
    "angleDistinctiveness": 0.30,
    "informationDelta": 0.25,
    "sourceAuthority": 0.15,
    "sourceDiversityBenefit": 0.15,
    "freshness": 0.10,
    "readability": 0.05,
}


def candidate_id(candidate: dict[str, Any], index: int) -> str:
    return str(candidate.get("id") or candidate.get("parentId") or candidate.get("topicKey") or f"insight-{index}")


def candidate_title(candidate: dict[str, Any]) -> str:
    return str(candidate.get("representativeTitle") or candidate.get("title") or candidate.get("headline") or "Untitled Insight event").strip()


def child_items(candidate: dict[str, Any]) -> list[dict[str, Any]]:
    children = candidate.get("children") or candidate.get("childStories") or candidate.get("stories") or []
    return [child for child in children if isinstance(child, dict)]


def angle_of(item: dict[str, Any]) -> str:
    angle = item.get("angle") or item.get("primaryAngle")
    if not angle:
        hints = item.get("angleHints") or item.get("storySignals", {}).get("angleHints") or []
        if hints:
            first = hints[0]
            if isinstance(first, dict):
                angle = first.get("angle")
            else:
                angle = str(first)
    return str(angle or "base_report").strip() or "base_report"


def source_group(item: dict[str, Any]) -> str:
    return str(item.get("sourceGroup") or item.get("source") or "unknown_source").strip().lower()


def published_at(item: dict[str, Any]) -> int:
    try:
        return int(item.get("publishedAt") or item.get("latestSeenAt") or 0)
    except (TypeError, ValueError):
        return 0


def token_set(text: str) -> set[str]:
    stop = {
        "this", "that", "with", "from", "after", "before", "latest", "news",
        "says", "said", "will", "have", "update", "updates", "item",
    }
    return {token for token in re.sub(r"[^a-z0-9\s]", " ", text.lower()).split() if len(token) >= 4 and token not in stop}


def has_negated_overlap(child_text: str, overlapping_tokens: set[str]) -> bool:
    lowered = child_text.lower()
    return any(
        re.search(rf"\b(unrelated|not related|unconnected)\s+(to|with)\s+.{0,32}\b{re.escape(token)}\b", lowered)
        for token in overlapping_tokens
    )


def event_coherence_gate(candidate: dict[str, Any]) -> GateResult:
    children = child_items(candidate)
    if not children:
        story_count = int(candidate.get("storyCount") or len(candidate.get("storyIds") or []))
        if story_count >= 2:
            return pass_gate("eventCoherence", 0.62, "event sketch has repeated story count", storyCount=story_count)
        return fail_gate("eventCoherence", "no child/story evidence for event candidate")

    title_tokens = token_set(candidate_title(candidate))
    if not title_tokens:
        title_tokens = token_set(" ".join(text_blob(child) for child in children[:2]))
    overlap_count = 0
    for child in children:
        child_text = text_blob(child)
        full_overlap = title_tokens.intersection(token_set(child_text))
        if not full_overlap:
            continue
        title_overlap = title_tokens.intersection(token_set(str(child.get("title") or child.get("headline") or "")))
        strong_enough = bool(title_overlap) or len(full_overlap) >= 2
        if not strong_enough:
            continue
        if not title_overlap and has_negated_overlap(child_text, full_overlap):
            continue
        overlap_count += 1
    ratio = overlap_count / max(1, len(children))
    if ratio >= 0.67:
        return pass_gate("eventCoherence", ratio, "children share event tokens", matchingChildren=overlap_count, childCount=len(children))
    if ratio >= 0.4:
        return warn_gate("eventCoherence", ratio, "partial event coherence", matchingChildren=overlap_count, childCount=len(children))
    return fail_gate("eventCoherence", "weak event coherence", matchingChildren=overlap_count, childCount=len(children))


def angle_diversity_gate(candidate: dict[str, Any]) -> GateResult:
    angles = candidate_angles(candidate)
    non_base = [angle for angle in angles if angle not in BASE_ANGLES]
    distinct = len(set(non_base))
    base_ratio = base_report_ratio(candidate)
    if distinct >= 3 and base_ratio <= 0.55:
        return pass_gate("angleDiversity", 1.0, "strong angle diversity", distinctAngles=distinct, baseReportRatio=base_ratio)
    if distinct >= 2 and base_ratio <= 0.70:
        return pass_gate("angleDiversity", 0.78, "usable angle diversity", distinctAngles=distinct, baseReportRatio=base_ratio)
    return warn_gate("angleDiversity", max(0.25, distinct * 0.22), "weak child angle diversity", distinctAngles=distinct, baseReportRatio=base_ratio)


def source_diversity_gate(candidate: dict[str, Any]) -> GateResult:
    sources = candidate_sources(candidate)
    count = len(sources)
    if count >= 4:
        return pass_gate("sourceDiversity", 1.0, "strong source diversity", sourceGroupCount=count)
    if count >= 2:
        return pass_gate("sourceDiversity", 0.72, "multi-source event", sourceGroupCount=count)
    return warn_gate("sourceDiversity", 0.35, "one-source event candidate", sourceGroupCount=count)


def base_report_gate(candidate: dict[str, Any]) -> GateResult:
    ratio = base_report_ratio(candidate)
    if ratio <= 0.45:
        return pass_gate("baseReportCap", 1.0, "base-report ratio controlled", baseReportRatio=ratio)
    if ratio <= 0.70:
        return warn_gate("baseReportCap", 0.55, "base-report heavy but usable", baseReportRatio=ratio)
    return warn_gate("baseReportCap", 0.25, "base-report dominated event candidate", baseReportRatio=ratio)


def weak_tree_gate(candidate: dict[str, Any]) -> GateResult:
    children = child_items(candidate)
    child_count = len(children) or int(candidate.get("storyCount") or len(candidate.get("storyIds") or []))
    weak = bool(candidate.get("weakTree")) or child_count < 2
    if weak:
        return warn_gate("weakTree", 0.28, "weak/one-child tree demoted", childCount=child_count)
    return pass_gate("weakTree", min(1.0, child_count / 4), "child tree has enough depth", childCount=child_count)


def duplicate_child_gate(candidate: dict[str, Any]) -> GateResult:
    children = child_items(candidate)
    if not children:
        return pass_gate("duplicateChildren", 0.7, "no child objects to dedup")
    keys = [re.sub(r"\s+", " ", str(child.get("title") or "").strip().lower()) for child in children]
    duplicates = len(keys) - len(set(keys))
    if duplicates <= 0:
        return pass_gate("duplicateChildren", 1.0, "no duplicate child titles", duplicateCount=0)
    if duplicates < len(children) / 2:
        return warn_gate("duplicateChildren", 0.55, "some duplicate child titles suppressed", duplicateCount=duplicates)
    return warn_gate("duplicateChildren", 0.22, "duplicate wire-copy children dominate", duplicateCount=duplicates)


def candidate_angles(candidate: dict[str, Any]) -> list[str]:
    children = child_items(candidate)
    if children:
        return [angle_of(child) for child in children]
    top_angles = candidate.get("topAngles") or []
    angles: list[str] = []
    for entry in top_angles:
        if isinstance(entry, dict):
            angles.extend([str(entry.get("angle") or "base_report")] * int(entry.get("count") or 1))
        else:
            angles.append(str(entry))
    return angles or ["base_report"]


def candidate_sources(candidate: dict[str, Any]) -> set[str]:
    children = child_items(candidate)
    if children:
        return {source_group(child) for child in children}
    source_groups = candidate.get("sourceGroups") or []
    return {str(source).lower() for source in source_groups} or {"unknown_source"}


def base_report_ratio(candidate: dict[str, Any]) -> float:
    angles = candidate_angles(candidate)
    if not angles:
        return 1.0
    base = sum(1 for angle in angles if angle in BASE_ANGLES)
    return round(base / len(angles), 4)


def temporal_evolution_score(candidate: dict[str, Any]) -> float:
    children = child_items(candidate)
    roles = set()
    tiers = set()
    slots = set(candidate.get("slots") or [])
    for child in children:
        if child.get("evolutionRole"):
            roles.add(child.get("evolutionRole"))
        if child.get("temporalTier"):
            tiers.add(child.get("temporalTier"))
        if child.get("capturedAtSnapshot"):
            slots.add(child.get("capturedAtSnapshot"))
    return min(1.0, 0.25 + 0.22 * len(roles) + 0.18 * len(tiers) + 0.12 * len(slots))


def information_delta_score(candidate: dict[str, Any]) -> float:
    children = child_items(candidate)
    if not children:
        return min(1.0, 0.35 + 0.1 * int(candidate.get("angleCount") or 0))
    scores = []
    for child in children:
        value = child.get("informationDeltaScore")
        if value is None:
            value = 0.65 if angle_of(child) not in BASE_ANGLES else 0.35
        try:
            scores.append(float(value))
        except (TypeError, ValueError):
            scores.append(0.0)
    return max(0.0, min(1.0, sum(scores) / max(1, len(scores))))


def event_importance_score(candidate: dict[str, Any]) -> float:
    story_count = int(candidate.get("storyCount") or len(child_items(candidate)) or len(candidate.get("storyIds") or []))
    explicit = candidate.get("importanceScore") or candidate.get("finalParentScore")
    if explicit is not None:
        try:
            return max(0.0, min(1.0, float(explicit)))
        except (TypeError, ValueError):
            pass
    return min(1.0, 0.35 + 0.12 * story_count)


def source_authority_score(candidate: dict[str, Any]) -> float:
    children = child_items(candidate)
    if not children:
        return 0.62 if len(candidate_sources(candidate)) >= 2 else 0.38
    values = [source_confidence_score(child) for child in children]
    return round(sum(values) / max(1, len(values)), 4)


def freshness_parent_score(candidate: dict[str, Any], now_ms: int) -> float:
    children = child_items(candidate)
    timestamps = [published_at(child) for child in children if published_at(child) > 0]
    if not timestamps:
        timestamps = [int(candidate.get("publishedAt") or candidate.get("latestSeenAt") or 0)]
    newest = max(timestamps or [0])
    return freshness_score(newest, now_ms, max_age_hours=36)


def score_child(child: dict[str, Any], sibling_sources: set[str], sibling_angles: set[str], now_ms: int) -> dict[str, Any]:
    angle = angle_of(child)
    source = source_group(child)
    parts = {
        "angleDistinctiveness": 1.0 if angle not in BASE_ANGLES and angle not in sibling_angles else 0.45,
        "informationDelta": information_delta_score({"children": [child]}),
        "sourceAuthority": source_confidence_score(child),
        "sourceDiversityBenefit": 1.0 if source not in sibling_sources else 0.45,
        "freshness": freshness_score(child.get("publishedAt"), now_ms, max_age_hours=36),
        "readability": 0.85 if len(text_blob(child)) >= 80 else 0.55,
    }
    return {
        "childId": child.get("id") or child.get("url") or child.get("title"),
        "angle": angle,
        "sourceGroup": source,
        "childScore": weighted_score(parts, CHILD_SCORE_WEIGHTS),
        "scoreBreakdown": parts,
    }


def score_candidate(candidate: dict[str, Any], *, index: int, now_ms: int) -> tuple[RankedItem | None, list[str]]:
    diagnostics: list[str] = []
    gates = [
        event_coherence_gate(candidate),
        angle_diversity_gate(candidate),
        source_diversity_gate(candidate),
        base_report_gate(candidate),
        weak_tree_gate(candidate),
        duplicate_child_gate(candidate),
    ]
    failed = [gate for gate in gates if gate.status == "FAIL"]
    if failed:
        diagnostics.extend(f"{candidate_title(candidate)}: {gate.name} failed — {gate.reason}" for gate in failed)
        return None, diagnostics

    parts = {
        "eventImportanceScore": event_importance_score(candidate),
        "sourceAuthorityScore": source_authority_score(candidate),
        "sourceDiversityScore": gates[2].score,
        "angleDiversityScore": gates[1].score,
        "temporalEvolutionScore": temporal_evolution_score(candidate),
        "noveltyDeltaScore": information_delta_score(candidate),
        "freshnessScore": freshness_parent_score(candidate, now_ms),
    }
    penalty = 1.0
    if gates[3].status == "WARN":
        penalty *= max(0.45, gates[3].score)
    if gates[4].status == "WARN":
        penalty *= max(0.60, gates[4].score)
    if gates[5].status == "WARN":
        penalty *= max(0.65, gates[5].score)
    score = weighted_score(parts, SCORE_WEIGHTS) * penalty

    child_scores = []
    seen_sources: set[str] = set()
    seen_angles: set[str] = set()
    for child in child_items(candidate):
        child_score = score_child(child, seen_sources, seen_angles, now_ms)
        child_scores.append(child_score)
        seen_sources.add(child_score["sourceGroup"])
        seen_angles.add(child_score["angle"])

    ranked = RankedItem(
        item_id=candidate_id(candidate, index),
        title=candidate_title(candidate),
        score=score,
        category="insightEvent",
        location_key="event",
        ranking_reasons=(
            gates[0].reason,
            gates[1].reason,
            gates[2].reason,
        ),
        gates=tuple(gates),
        item={
            **candidate,
            "scoreBreakdown": parts,
            "baseReportRatio": base_report_ratio(candidate),
            "childScores": child_scores,
        },
    )
    return ranked, diagnostics


def rank_insight_events(
    candidates: list[dict[str, Any]],
    *,
    now_ms: int,
    limit: int = 12,
) -> RankingResult:
    ranked: list[RankedItem] = []
    diagnostics: list[str] = []
    suppressed_count = 0

    for index, candidate in enumerate(candidates or []):
        if not isinstance(candidate, dict):
            suppressed_count += 1
            diagnostics.append("non-dict Insight candidate suppressed")
            continue
        ranked_item, item_diagnostics = score_candidate(candidate, index=index, now_ms=now_ms)
        diagnostics.extend(item_diagnostics)
        if ranked_item is None:
            suppressed_count += 1
            continue
        ranked.append(ranked_item)

    ranked.sort(key=lambda item: (-item.score, item.title))
    selected = ranked[:limit]
    strong = [item for item in selected if not any(gate.name == "weakTree" and gate.status == "WARN" for gate in item.gates)]
    weak = [item for item in selected if any(gate.name == "weakTree" and gate.status == "WARN" for gate in item.gates)]
    base_heavy = [item for item in selected if item.item.get("baseReportRatio", 1) > 0.55]
    angle_counts = [len({score["angle"] for score in item.item.get("childScores", []) if score["angle"] not in BASE_ANGLES}) for item in selected]
    duplicate_warns = sum(1 for item in selected for gate in item.gates if gate.name == "duplicateChildren" and gate.status == "WARN")

    gates: list[GateResult] = []
    if not selected:
        gates.append(fail_gate("insightEventPool", "no rankable Insight event candidates", suppressedCount=suppressed_count))
    else:
        gates.append(pass_gate("insightEventPool", min(1.0, len(selected) / 6), "rankable Insight event pool", itemCount=len(selected)))
    if selected and sum(angle_counts) / max(1, len(angle_counts)) < 1.5:
        gates.append(warn_gate("angleCoverage", 0.45, "ranked Insight set has weak visible angle coverage"))
    else:
        gates.append(pass_gate("angleCoverage", 0.82, "visible angle coverage available"))

    return RankingResult(
        destination="insight",
        ranking_profile=RANKING_PROFILE,
        ranked_items=tuple(selected),
        gate_results=tuple(gates),
        score_breakdown={
            "eventImportanceScore": _avg_item_part(selected, "eventImportanceScore"),
            "sourceAuthorityScore": _avg_item_part(selected, "sourceAuthorityScore"),
            "sourceDiversityScore": _avg_item_part(selected, "sourceDiversityScore"),
            "angleDiversityScore": _avg_item_part(selected, "angleDiversityScore"),
            "temporalEvolutionScore": _avg_item_part(selected, "temporalEvolutionScore"),
            "noveltyDeltaScore": _avg_item_part(selected, "noveltyDeltaScore"),
            "freshnessScore": _avg_item_part(selected, "freshnessScore"),
        },
        diagnostic_reasons=tuple(diagnostics[:20]),
        actionable_findings=tuple(_actionable_findings(selected, suppressed_count, base_heavy, weak, duplicate_warns)),
        gate_summary={
            "inputCandidateCount": len(candidates or []),
            "parentClusters": len(selected),
            "strongParents": len(strong),
            "weakParentsDemoted": len(weak),
            "avgAnglesPerParent": round(sum(angle_counts) / max(1, len(angle_counts)), 4),
            "baseReportHeavyParents": len(base_heavy),
            "duplicateChildrenSuppressed": duplicate_warns,
            "suppressedCandidateCount": suppressed_count,
        },
    )


def _avg_item_part(items: list[RankedItem], key: str) -> float:
    if not items:
        return 0.0
    values = [float(item.item.get("scoreBreakdown", {}).get(key, 0.0) or 0.0) for item in items]
    return round(sum(values) / len(values), 4)


def _actionable_findings(selected: list[RankedItem], suppressed_count: int, base_heavy: list[RankedItem], weak: list[RankedItem], duplicate_warns: int) -> list[str]:
    findings: list[str] = []
    if suppressed_count:
        findings.append(f"{suppressed_count} incoherent Insight candidate(s) suppressed")
    if base_heavy:
        findings.append(f"{len(base_heavy)} base-report-heavy Insight parent(s) demoted")
    if weak:
        findings.append(f"{len(weak)} weak-tree Insight parent(s) demoted")
    if duplicate_warns:
        findings.append(f"{duplicate_warns} Insight parent(s) have duplicate child-title warnings")
    if selected and not base_heavy and not weak:
        findings.append("Insight event/angle ranking has no critical demotion finding")
    return findings[:10]
