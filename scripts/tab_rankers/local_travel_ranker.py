"""Local / Travel ranking model.

Local/Travel is practical utility, not generic news. It ranks exact-city and
travel-impact items such as transport, airport, civic, school, road, weather
risk, tourism/family activity, and disruption notices.
"""
from __future__ import annotations

from collections import Counter
from typing import Any, Iterable

from ranking_contracts import GateResult, RankedItem, RankingResult, fail_gate, pass_gate, warn_gate, weighted_score
from ranking_gates import H_MS, duplicate_gate, freshness_score, location_gate, source_confidence_score, text_blob

RANKING_PROFILE = "localTravel-v1-location-utility-disruption"
DEFAULT_LOCATIONS = ("muscat", "chennai", "trichy")

SCORE_WEIGHTS = {
    "locationPrecision": 0.25,
    "utilityScore": 0.20,
    "recencyScore": 0.20,
    "authorityScore": 0.15,
    "disruptionSeverity": 0.10,
    "familyRelevance": 0.05,
    "sourceDiversity": 0.05,
}

UTILITY_TERMS = {
    "airport": 1.0,
    "flight": 1.0,
    "train": 0.92,
    "traffic": 0.92,
    "road": 0.86,
    "closure": 1.0,
    "school": 0.82,
    "civic": 0.78,
    "power cut": 0.82,
    "water supply": 0.82,
    "weather": 0.76,
    "festival": 0.64,
    "museum": 0.58,
    "tourism": 0.60,
}

DISRUPTION_TERMS = {
    "cancelled": 1.0,
    "canceled": 1.0,
    "closure": 1.0,
    "delay": 0.82,
    "strike": 0.92,
    "heavy rain": 0.84,
    "storm": 0.90,
    "flood": 0.95,
    "accident": 0.78,
    "diversion": 0.72,
}

FAMILY_TERMS = ("family", "kid", "kids", "children", "museum", "zoo", "park", "beach", "temple", "festival")
AUTHORITY_TERMS = ("official", "police", "airport", "railway", "municipal", "government", "school", "authority")
TRAVEL_TERMS = ("travel", "airport", "flight", "visa", "hotel", "tourism", "train", "road", "traffic")


def item_id(item: dict[str, Any], index: int) -> str:
    return str(item.get("id") or item.get("url") or f"local-travel-{index}")


def normalize_category(item: dict[str, Any]) -> str:
    raw = str(item.get("category") or item.get("section") or "local").lower()
    if any(term in raw for term in ("travel", "airport", "flight", "tourism")):
        return "travel"
    if any(term in raw for term in ("traffic", "road", "civic", "school", "weather")):
        return "utility"
    return "local"


def utility_gate(item: dict[str, Any]) -> GateResult:
    blob = text_blob(item)
    score = 0.0
    matched: list[str] = []
    for term, value in UTILITY_TERMS.items():
        if term in blob:
            matched.append(term)
            score = max(score, value)
    if score >= 0.75:
        return pass_gate("utility", score, "practical local/travel utility", matchedTerms=matched)
    if score >= 0.55:
        return warn_gate("utility", score, "soft local/travel utility", matchedTerms=matched)
    return warn_gate("utility", 0.35, "generic local/travel interest", matchedTerms=matched)


def disruption_gate(item: dict[str, Any]) -> GateResult:
    blob = text_blob(item)
    score = 0.0
    matched: list[str] = []
    for term, value in DISRUPTION_TERMS.items():
        if term in blob:
            matched.append(term)
            score = max(score, value)
    if score >= 0.85:
        return pass_gate("disruption", score, "active/high disruption", matchedTerms=matched)
    if score >= 0.65:
        return pass_gate("disruption", score, "moderate disruption", matchedTerms=matched)
    return pass_gate("disruption", 0.30, "no major disruption signal", matchedTerms=matched)


def authority_score(item: dict[str, Any]) -> float:
    blob = text_blob(item)
    score = source_confidence_score(item)
    if any(term in blob for term in AUTHORITY_TERMS):
        score = min(1.0, score + 0.16)
    if str(item.get("sourceRole") or "").lower() == "primary":
        score = min(1.0, score + 0.08)
    return score


def family_relevance_score(item: dict[str, Any]) -> float:
    blob = text_blob(item)
    return 0.78 if any(term in blob for term in FAMILY_TERMS) else 0.25


def travel_window_gate(item: dict[str, Any], now_ms: int) -> GateResult:
    blob = text_blob(item)
    is_travel = any(term in blob for term in TRAVEL_TERMS)
    published_at = item.get("publishedAt")
    max_hours = 72 if is_travel else 36
    score = freshness_score(published_at, now_ms, max_hours)
    if score <= 0:
        return fail_gate("recency", "local/travel item is stale", maxAgeHours=max_hours)
    if score < 0.35:
        return warn_gate("recency", score, "local/travel item is aging", maxAgeHours=max_hours)
    return pass_gate("recency", score, "local/travel item is recent enough", maxAgeHours=max_hours)


def location_precision_gate(item: dict[str, Any], locations: Iterable[str]) -> GateResult:
    gate = location_gate(item, list(locations), allow_online=False)
    if gate.status == "PASS":
        return gate
    return fail_gate("locationPrecision", "local/travel item lacks configured city/region match", **gate.details)


def source_diversity_score(item: dict[str, Any], source_counts: Counter) -> float:
    group = str(item.get("sourceGroup") or item.get("source") or "unknown_source").lower()
    if source_counts.get(group, 0) <= 1:
        return 0.72
    dominant = source_counts[group] / max(1, sum(source_counts.values()))
    return max(0.35, 1 - dominant)


def score_item(
    item: dict[str, Any],
    *,
    index: int,
    now_ms: int,
    configured_locations: Iterable[str],
    source_counts: Counter,
    seen_keys: set[str],
) -> tuple[RankedItem | None, list[str]]:
    diagnostics: list[str] = []
    category = normalize_category(item)
    gates = [
        duplicate_gate(item, seen_keys),
        location_precision_gate(item, configured_locations),
        utility_gate(item),
        travel_window_gate(item, now_ms),
        disruption_gate(item),
    ]
    failed = [gate for gate in gates if gate.status == "FAIL"]
    if failed:
        diagnostics.extend(f"{item.get('title', 'Untitled')}: {gate.name} failed — {gate.reason}" for gate in failed)
        return None, diagnostics

    parts = {
        "locationPrecision": gates[1].score,
        "utilityScore": gates[2].score,
        "recencyScore": gates[3].score,
        "authorityScore": authority_score(item),
        "disruptionSeverity": gates[4].score,
        "familyRelevance": family_relevance_score(item),
        "sourceDiversity": source_diversity_score(item, source_counts),
    }
    score = weighted_score(parts, SCORE_WEIGHTS)
    ranked = RankedItem(
        item_id=item_id(item, index),
        title=str(item.get("title") or "Untitled local/travel item"),
        score=score,
        category=category,
        location_key=str(gates[1].details.get("matchedLocation") or "unknown"),
        ranking_reasons=tuple(reason for reason in [category, gates[1].reason, gates[2].reason, gates[4].reason] if reason),
        gates=tuple(gates),
        item={**item, "normalizedCategory": category, "scoreBreakdown": parts},
    )
    return ranked, diagnostics


def rank_local_travel_items(
    items: list[dict[str, Any]],
    *,
    now_ms: int,
    configured_locations: Iterable[str] = DEFAULT_LOCATIONS,
    limit: int = 30,
) -> RankingResult:
    source_counts = Counter(str(item.get("sourceGroup") or item.get("source") or "unknown_source").lower() for item in items or [] if isinstance(item, dict))
    seen_keys: set[str] = set()
    ranked: list[RankedItem] = []
    diagnostics: list[str] = []
    suppressed_count = 0

    for index, item in enumerate(items or []):
        if not isinstance(item, dict):
            suppressed_count += 1
            diagnostics.append("non-dict local/travel item suppressed")
            continue
        ranked_item, item_diagnostics = score_item(
            item,
            index=index,
            now_ms=now_ms,
            configured_locations=configured_locations,
            source_counts=source_counts,
            seen_keys=seen_keys,
        )
        diagnostics.extend(item_diagnostics)
        if ranked_item is None:
            suppressed_count += 1
            continue
        ranked.append(ranked_item)

    ranked.sort(key=lambda item: (-item.score, item.location_key, item.category, item.title))
    selected = ranked[:limit]
    categories = Counter(item.category for item in selected)
    locations = Counter(item.location_key for item in selected)
    disruptions = sum(1 for item in selected if item.item.get("scoreBreakdown", {}).get("disruptionSeverity", 0) >= 0.65)
    travel_count = sum(1 for item in selected if item.category == "travel")
    utility_count = sum(1 for item in selected if item.category == "utility")
    family_count = sum(1 for item in selected if item.item.get("scoreBreakdown", {}).get("familyRelevance", 0) >= 0.7)

    gates: list[GateResult] = []
    if not selected:
        gates.append(fail_gate("localTravelPool", "no rankable local/travel items", suppressedCount=suppressed_count))
    else:
        gates.append(pass_gate("localTravelPool", min(1.0, len(selected) / 8), "rankable local/travel pool", itemCount=len(selected)))
    if not disruptions and selected:
        gates.append(warn_gate("disruptionCoverage", 0.45, "no active disruption item in ranked local/travel set"))
    else:
        gates.append(pass_gate("disruptionCoverage", 0.82, "disruption coverage available"))

    return RankingResult(
        destination="localTravel",
        ranking_profile=RANKING_PROFILE,
        ranked_items=tuple(selected),
        gate_results=tuple(gates),
        score_breakdown={
            "locationPrecision": _avg_item_part(selected, "locationPrecision"),
            "utilityScore": _avg_item_part(selected, "utilityScore"),
            "recencyScore": _avg_item_part(selected, "recencyScore"),
            "authorityScore": _avg_item_part(selected, "authorityScore"),
            "disruptionSeverity": _avg_item_part(selected, "disruptionSeverity"),
            "familyRelevance": _avg_item_part(selected, "familyRelevance"),
            "sourceDiversity": _avg_item_part(selected, "sourceDiversity"),
        },
        diagnostic_reasons=tuple(diagnostics[:20]),
        actionable_findings=tuple(_actionable_findings(selected, suppressed_count, locations, disruptions, family_count)),
        gate_summary={
            "inputItemCount": len(items or []),
            "rankedItemCount": len(selected),
            "suppressedItemCount": suppressed_count,
            "travelItemCount": travel_count,
            "utilityItemCount": utility_count,
            "disruptionItemCount": disruptions,
            "familyRelevantItemCount": family_count,
            "categoryCounts": dict(categories),
            "locationCounts": dict(locations),
            "locationsCovered": sorted(k for k in locations if k != "unknown"),
        },
    )


def _avg_item_part(items: list[RankedItem], key: str) -> float:
    if not items:
        return 0.0
    values = [float(item.item.get("scoreBreakdown", {}).get(key, 0.0) or 0.0) for item in items]
    return round(sum(values) / len(values), 4)


def _actionable_findings(selected: list[RankedItem], suppressed_count: int, locations: Counter, disruptions: int, family_count: int) -> list[str]:
    findings: list[str] = []
    if suppressed_count:
        findings.append(f"{suppressed_count} stale/duplicate/location-mismatched local/travel item(s) suppressed")
    if not disruptions:
        findings.append("no active local/travel disruption item")
    if not family_count:
        findings.append("no family-relevant local/travel item")
    for loc in DEFAULT_LOCATIONS:
        if loc not in locations:
            findings.append(f"no ranked local/travel item for {loc}")
    return findings[:10]
