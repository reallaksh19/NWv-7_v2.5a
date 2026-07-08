"""Buzz tab-specific ranker.

Buzz is not a clone of Top Stories. It ranks items that are trending, novel,
source-spread, local/travel-relevant, and socially/culturally interesting.
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict
from typing import Any, Iterable

from ranking_contracts import GateResult, RankedItem, RankingResult, fail_gate, pass_gate, warn_gate, weighted_score
from ranking_gates import H_MS, duplicate_gate, freshness_score, location_gate, source_confidence_score, text_blob

RANKING_PROFILE = "buzz-v2-trend-local-travel"
DEFAULT_LOCATIONS = ("muscat", "chennai", "trichy")

BUZZ_CATEGORY_PRIORITY = {
    "technology": 0.86,
    "entertainment": 0.84,
    "sports": 0.78,
    "social": 0.82,
    "culture": 0.80,
    "local": 0.78,
    "travel": 0.76,
    "lifestyle": 0.70,
    "viral": 0.74,
    "topStories": 0.52,
}

SCORE_WEIGHTS = {
    "trendVelocityScore": 0.25,
    "noveltyScore": 0.20,
    "sourceSpreadScore": 0.15,
    "freshnessScore": 0.15,
    "categoryFitScore": 0.10,
    "localTravelBoost": 0.10,
    "visualSocialSignal": 0.05,
}

TRAVEL_TERMS = ("flight", "airport", "visa", "holiday", "hotel", "tourism", "train", "traffic", "travel")
LOCAL_TERMS = ("chennai", "trichy", "tiruchirappalli", "muscat", "oman", "tamil nadu", "local")
SOCIAL_TERMS = ("viral", "trending", "reacts", "reaction", "social media", "netizens", "meme")
VISUAL_TERMS = ("photo", "video", "watch", "trailer", "poster", "images", "visual")
TOP_STORY_TERMS = ("government", "court", "minister", "policy", "election", "war", "economy")


def normalize_category(item: dict[str, Any]) -> str:
    raw = str(item.get("category") or item.get("section") or "social").strip().lower()
    if raw in {"tech", "technology", "gadgets", "ai"}:
        return "technology"
    if raw in {"entertainment", "movies", "cinema", "celebrity"}:
        return "entertainment"
    if raw in {"sports", "cricket", "football"}:
        return "sports"
    if raw in {"travel", "tourism", "aviation"}:
        return "travel"
    if raw in {"local", "city", "chennai", "trichy", "muscat"}:
        return "local"
    if raw in {"world", "india", "business", "topstories", "topStories"}:
        return "topStories"
    return raw or "social"


def buzz_topic_key(item: dict[str, Any]) -> str:
    text = text_blob(item)
    tokens = [token for token in re.sub(r"[^a-z0-9\s]", " ", text).split() if len(token) >= 4]
    stop = {"this", "that", "with", "from", "after", "before", "latest", "news", "says", "said"}
    selected = [token for token in tokens if token not in stop][:5]
    return "|".join(selected) or str(item.get("id") or item.get("url") or "unknown")


def source_group(item: dict[str, Any]) -> str:
    return str(item.get("sourceGroup") or item.get("source") or "unknown_source").strip().lower()


def trend_velocity_gate(item: dict[str, Any], topic_counts: Counter, topic_sources: dict[str, set[str]]) -> GateResult:
    key = buzz_topic_key(item)
    count = topic_counts.get(key, 0)
    sources = len(topic_sources.get(key, set()))
    if count >= 3 and sources >= 2:
        return pass_gate("trendVelocity", 1.0, "topic repeated across sources", topicKey=key, topicCount=count, sourceCount=sources)
    if count >= 2:
        return warn_gate("trendVelocity", 0.68, "topic repeated but source spread is limited", topicKey=key, topicCount=count, sourceCount=sources)
    return warn_gate("trendVelocity", 0.38, "single-observation buzz candidate", topicKey=key, topicCount=count, sourceCount=sources)


def novelty_gate(item: dict[str, Any]) -> GateResult:
    text = text_blob(item)
    # Top Stories-like civic/hard-news terms do not block Buzz, but they reduce novelty.
    top_story_like = any(term in text for term in TOP_STORY_TERMS)
    if item.get("alreadyInTopStories") or item.get("fromTopStories"):
        return warn_gate("novelty", 0.35, "already represented in Top Stories")
    if top_story_like and normalize_category(item) == "topStories":
        return warn_gate("novelty", 0.45, "hard-news item has weak Buzz novelty")
    return pass_gate("novelty", 0.86, "distinct Buzz candidate")


def source_spread_gate(item: dict[str, Any], topic_sources: dict[str, set[str]]) -> GateResult:
    key = buzz_topic_key(item)
    sources = len(topic_sources.get(key, set()))
    if sources >= 3:
        return pass_gate("sourceSpread", 1.0, "strong cross-source buzz", sourceCount=sources)
    if sources == 2:
        return pass_gate("sourceSpread", 0.74, "two-source buzz", sourceCount=sources)
    return warn_gate("sourceSpread", 0.42, "one-source buzz capped", sourceCount=sources)


def local_travel_gate(item: dict[str, Any], configured_locations: Iterable[str]) -> GateResult:
    text = text_blob(item)
    local = any(term in text for term in LOCAL_TERMS)
    travel = any(term in text for term in TRAVEL_TERMS)
    location = location_gate(item, list(configured_locations), allow_online=True)
    if local and location.status != "FAIL":
        return pass_gate("localTravelBoost", max(0.78, location.score), "local buzz preserved", location=location.details, travel=travel)
    if travel:
        return pass_gate("localTravelBoost", 0.72, "travel buzz preserved", location=location.details, travel=True)
    if location.status == "PASS":
        return pass_gate("localTravelBoost", 0.68, "configured-location relevance", location=location.details)
    return pass_gate("localTravelBoost", 0.36, "general buzz", location=location.details)


def visual_social_score(item: dict[str, Any]) -> float:
    text = text_blob(item)
    score = 0.35
    if any(term in text for term in SOCIAL_TERMS):
        score += 0.35
    if any(term in text for term in VISUAL_TERMS) or item.get("imageUrl"):
        score += 0.25
    return min(1.0, score)


def item_id(item: dict[str, Any], index: int) -> str:
    return str(item.get("id") or item.get("url") or f"buzz-{index}")


def score_item(
    item: dict[str, Any],
    *,
    index: int,
    now_ms: int,
    configured_locations: Iterable[str],
    topic_counts: Counter,
    topic_sources: dict[str, set[str]],
    seen_keys: set[str],
) -> tuple[RankedItem | None, list[str]]:
    diagnostics: list[str] = []
    category = normalize_category(item)
    gates = [
        duplicate_gate(item, seen_keys),
        trend_velocity_gate(item, topic_counts, topic_sources),
        novelty_gate(item),
        source_spread_gate(item, topic_sources),
        local_travel_gate(item, configured_locations),
    ]
    failed = [gate for gate in gates if gate.status == "FAIL"]
    if failed:
        diagnostics.extend(f"{item.get('title', 'Untitled')}: {gate.name} failed — {gate.reason}" for gate in failed)
        return None, diagnostics

    parts = {
        "trendVelocityScore": gates[1].score,
        "noveltyScore": gates[2].score,
        "sourceSpreadScore": gates[3].score,
        "freshnessScore": freshness_score(item.get("publishedAt"), now_ms, max_age_hours=24),
        "categoryFitScore": BUZZ_CATEGORY_PRIORITY.get(category, 0.55),
        "localTravelBoost": gates[4].score,
        "visualSocialSignal": visual_social_score(item),
    }
    score = weighted_score(parts, SCORE_WEIGHTS) * source_confidence_score(item)
    ranked = RankedItem(
        item_id=item_id(item, index),
        title=str(item.get("title") or "Untitled Buzz item"),
        score=score,
        category=category,
        location_key=str(gates[4].details.get("location", {}).get("matchedLocation") or "general"),
        ranking_reasons=tuple(reason for reason in [category, gates[1].reason, gates[2].reason, gates[4].reason] if reason),
        gates=tuple(gates),
        item={**item, "normalizedCategory": category, "topicKey": buzz_topic_key(item), "scoreBreakdown": parts},
    )
    return ranked, diagnostics


def rank_buzz_items(
    items: list[dict[str, Any]],
    *,
    now_ms: int,
    configured_locations: Iterable[str] = DEFAULT_LOCATIONS,
    limit: int = 30,
) -> RankingResult:
    topic_counts: Counter = Counter()
    topic_sources: dict[str, set[str]] = defaultdict(set)
    for item in items or []:
        if isinstance(item, dict):
            key = buzz_topic_key(item)
            topic_counts[key] += 1
            topic_sources[key].add(source_group(item))

    ranked: list[RankedItem] = []
    diagnostics: list[str] = []
    seen_keys: set[str] = set()
    suppressed_count = 0

    for index, item in enumerate(items or []):
        if not isinstance(item, dict):
            suppressed_count += 1
            diagnostics.append("non-dict buzz item suppressed")
            continue
        ranked_item, item_diagnostics = score_item(
            item,
            index=index,
            now_ms=now_ms,
            configured_locations=configured_locations,
            topic_counts=topic_counts,
            topic_sources=topic_sources,
            seen_keys=seen_keys,
        )
        diagnostics.extend(item_diagnostics)
        if ranked_item is None:
            suppressed_count += 1
            continue
        ranked.append(ranked_item)

    ranked.sort(key=lambda item: (-item.score, item.category, item.title))
    selected = ranked[:limit]
    categories = Counter(item.category for item in selected)
    topic_selected = Counter(str(item.item.get("topicKey") or "unknown") for item in selected)
    local_count = sum(1 for item in selected if item.item.get("scoreBreakdown", {}).get("localTravelBoost", 0) >= 0.68)
    travel_count = sum(1 for item in selected if any(term in text_blob(item.item) for term in TRAVEL_TERMS))
    one_source_capped = sum(1 for item in selected if any(gate.name == "sourceSpread" and gate.status == "WARN" for gate in item.gates))

    gates: list[GateResult] = []
    if not selected:
        gates.append(fail_gate("buzzPool", "no rankable Buzz items", suppressedCount=suppressed_count))
    else:
        gates.append(pass_gate("buzzPool", min(1.0, len(selected) / 8), "rankable Buzz pool", itemCount=len(selected)))
    if not any(count >= 2 for count in topic_selected.values()) and selected:
        gates.append(warn_gate("trendCoverage", 0.45, "ranked Buzz set has weak repeated-topic coverage"))
    else:
        gates.append(pass_gate("trendCoverage", 0.82, "repeated-topic coverage available"))

    return RankingResult(
        destination="buzz",
        ranking_profile=RANKING_PROFILE,
        ranked_items=tuple(selected),
        gate_results=tuple(gates),
        score_breakdown={
            "trendVelocityScore": _avg_item_part(selected, "trendVelocityScore"),
            "noveltyScore": _avg_item_part(selected, "noveltyScore"),
            "sourceSpreadScore": _avg_item_part(selected, "sourceSpreadScore"),
            "freshnessScore": _avg_item_part(selected, "freshnessScore"),
            "categoryFitScore": _avg_item_part(selected, "categoryFitScore"),
            "localTravelBoost": _avg_item_part(selected, "localTravelBoost"),
            "visualSocialSignal": _avg_item_part(selected, "visualSocialSignal"),
        },
        diagnostic_reasons=tuple(diagnostics[:20]),
        actionable_findings=tuple(_actionable_findings(selected, suppressed_count, categories, local_count, travel_count, one_source_capped)),
        gate_summary={
            "inputItemCount": len(items or []),
            "rankedItemCount": len(selected),
            "suppressedItemCount": suppressed_count,
            "buzzTrendCount": sum(1 for count in topic_counts.values() if count >= 2),
            "localBuzzCount": local_count,
            "travelBuzzCount": travel_count,
            "oneSourceCappedCount": one_source_capped,
            "categoryCounts": dict(categories),
            "duplicateTrendSuppressedCount": suppressed_count,
        },
    )


def _avg_item_part(items: list[RankedItem], key: str) -> float:
    if not items:
        return 0.0
    values = [float(item.item.get("scoreBreakdown", {}).get(key, 0.0) or 0.0) for item in items]
    return round(sum(values) / len(values), 4)


def _actionable_findings(selected: list[RankedItem], suppressed_count: int, categories: Counter, local_count: int, travel_count: int, one_source_capped: int) -> list[str]:
    findings: list[str] = []
    if suppressed_count:
        findings.append(f"{suppressed_count} duplicate/invalid Buzz item(s) suppressed")
    if one_source_capped:
        findings.append(f"{one_source_capped} one-source Buzz item(s) capped")
    if not local_count:
        findings.append("no local Buzz item in ranked set")
    if not travel_count:
        findings.append("no travel Buzz item in ranked set")
    if selected and len(categories) <= 1:
        findings.append("Buzz set is category-dominated")
    return findings[:10]
