"""Tab-specific quality ranking model router.

This module intentionally does not implement a generic one-score model. It routes
each destination to the tab ranker that owns that tab's concept.
"""
from __future__ import annotations

import os
import sys
import time
from typing import Any

SCRIPT_DIR = os.path.dirname(__file__)
TAB_RANKERS_DIR = os.path.join(SCRIPT_DIR, "tab_rankers")
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)
if TAB_RANKERS_DIR not in sys.path:
    sys.path.insert(0, TAB_RANKERS_DIR)

from ranking_contracts import RankingResult, fail_gate
from upahead_ranker import rank_upahead_items
from buzz_ranker import rank_buzz_items
from local_travel_ranker import rank_local_travel_items
from insight_ranker import rank_insight_events

IMPLEMENTED_DESTINATIONS = ("upAhead", "buzz", "localTravel", "insight")
PENDING_DESTINATIONS = ("main", "weather", "market", "planner", "newspaper", "following")


def score_destination(
    destination: str,
    payloads: dict[str, Any],
    *,
    now_ms: int | None = None,
    configured_locations: list[str] | tuple[str, ...] = ("muscat", "chennai", "trichy"),
) -> RankingResult:
    """Score one destination using its tab-specific ranker.

    `payloads` is intentionally explicit so the builder can pass pre-normalized
    candidates. Unknown or pending destinations fail loudly instead of falling
    back to generic scoring.
    """
    ts = int(now_ms if now_ms is not None else time.time() * 1000)

    if destination == "upAhead":
        return rank_upahead_items(
            _items_from_payload(payloads, "upAheadItems", "items"),
            now_ms=ts,
            configured_locations=configured_locations,
        )

    if destination == "buzz":
        return rank_buzz_items(
            _items_from_payload(payloads, "buzzItems", "items"),
            now_ms=ts,
            configured_locations=configured_locations,
        )

    if destination == "localTravel":
        return rank_local_travel_items(
            _items_from_payload(payloads, "localTravelItems", "items"),
            now_ms=ts,
            configured_locations=configured_locations,
        )

    if destination == "insight":
        return rank_insight_events(
            _items_from_payload(payloads, "insightCandidates", "eventSketches", "parents"),
            now_ms=ts,
        )

    if destination in PENDING_DESTINATIONS:
        return RankingResult(
            destination=destination,
            ranking_profile=f"{destination}-pending-tab-specific-ranker",
            ranked_items=(),
            gate_results=(fail_gate("rankerImplemented", f"{destination} tab-specific ranker is not implemented yet"),),
            diagnostic_reasons=(f"{destination} is intentionally pending; no generic fallback scoring is allowed",),
            actionable_findings=(f"Implement {destination} tab-specific ranker before adding dashboard/workflow scoring",),
            gate_summary={"implemented": False},
        )

    raise ValueError(f"Unknown ranking destination: {destination}")


def score_all_destinations(
    payloads_by_destination: dict[str, dict[str, Any]],
    *,
    now_ms: int | None = None,
    configured_locations: list[str] | tuple[str, ...] = ("muscat", "chennai", "trichy"),
    destinations: list[str] | tuple[str, ...] = IMPLEMENTED_DESTINATIONS,
) -> dict[str, RankingResult]:
    return {
        destination: score_destination(
            destination,
            payloads_by_destination.get(destination, {}),
            now_ms=now_ms,
            configured_locations=configured_locations,
        )
        for destination in destinations
    }


def summarize_results(results: dict[str, RankingResult]) -> dict[str, Any]:
    destination_scores = {name: result.quality_score for name, result in results.items()}
    destination_statuses = {name: result.quality_status for name, result in results.items()}
    if destination_scores:
        overall_score = round(sum(destination_scores.values()) / len(destination_scores), 4)
    else:
        overall_score = 0.0
    status_priority = {"FAIL": 2, "WARN": 1, "PASS": 0}
    overall_status = max(destination_statuses.values(), key=lambda item: status_priority.get(item, 0)) if destination_statuses else "FAIL"
    return {
        "overallScore": overall_score,
        "overallStatus": overall_status,
        "destinationScores": destination_scores,
        "destinationStatuses": destination_statuses,
        "rankingProfiles": {name: result.ranking_profile for name, result in results.items()},
        "actionRequired": [finding for result in results.values() for finding in result.actionable_findings][:20],
        "topFindings": [reason for result in results.values() for reason in result.diagnostic_reasons][:20],
    }


def results_to_document(results: dict[str, RankingResult], *, generated_at: int | None = None) -> dict[str, Any]:
    ts = int(generated_at if generated_at is not None else time.time() * 1000)
    return {
        "schemaVersion": 1,
        "rankingVersion": "tab-specific-quality-ranking-v1",
        "generatedAt": ts,
        "summary": summarize_results(results),
        "destinations": {name: result.to_dict() for name, result in results.items()},
        "implementedDestinations": list(IMPLEMENTED_DESTINATIONS),
        "pendingDestinations": list(PENDING_DESTINATIONS),
    }


def _items_from_payload(payloads: dict[str, Any], *keys: str) -> list[dict[str, Any]]:
    for key in keys:
        value = payloads.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    return []
