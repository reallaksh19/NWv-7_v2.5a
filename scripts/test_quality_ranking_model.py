import os
import sys

SCRIPT_DIR = os.path.dirname(__file__)
sys.path.insert(0, SCRIPT_DIR)
sys.path.insert(0, os.path.join(SCRIPT_DIR, "tab_rankers"))

from quality_ranking_model import (
    IMPLEMENTED_DESTINATIONS,
    PENDING_DESTINATIONS,
    results_to_document,
    score_all_destinations,
    score_destination,
)
from ranking_gates import DAY_MS, H_MS

NOW = 1_000_000_000_000


def upahead_item():
    return {
        "id": "event-1",
        "title": "Chennai event tomorrow",
        "url": "https://example.com/event",
        "category": "events",
        "location": "Chennai",
        "eventStartAt": NOW + DAY_MS,
        "eventEndAt": NOW + DAY_MS + H_MS,
        "publishedAt": NOW - H_MS,
        "plannerEligible": True,
        "sourceTier": "A",
        "sourceRole": "primary",
    }


def buzz_item(source_group="a"):
    return {
        "id": f"buzz-{source_group}",
        "title": "AI phone trailer goes viral in Chennai",
        "summary": "Social media reacts to video trailer",
        "url": f"https://example.com/{source_group}",
        "category": "technology",
        "location": "Chennai",
        "publishedAt": NOW - H_MS,
        "sourceGroup": source_group,
        "sourceTier": "A",
        "sourceRole": "primary",
    }


def local_item():
    return {
        "id": "local-1",
        "title": "Chennai airport flight delay advisory",
        "summary": "Official airport advisory says flight delay due to heavy rain",
        "url": "https://example.com/local",
        "category": "travel",
        "location": "Chennai airport",
        "publishedAt": NOW - H_MS,
        "sourceTier": "A",
        "sourceRole": "primary",
    }


def insight_candidate():
    return {
        "id": "sketch-1",
        "representativeTitle": "Metro service update",
        "storyCount": 4,
        "topAngles": [
            {"angle": "official_response", "count": 1},
            {"angle": "reaction_public", "count": 1},
            {"angle": "market_reaction", "count": 1},
        ],
        "sourceGroups": ["gov", "local", "market"],
        "slots": ["now", "minus4h"],
    }


def test_implemented_destinations_are_router_only_tab_rankers():
    assert IMPLEMENTED_DESTINATIONS == ("upAhead", "buzz", "localTravel", "insight")


def test_upahead_destination_routes_to_upahead_profile():
    result = score_destination("upAhead", {"upAheadItems": [upahead_item()]}, now_ms=NOW)
    data = result.to_dict()
    assert data["rankingProfile"] == "upAhead-v2-lifecycle-location-category"
    assert data["destination"] == "upAhead"
    assert data["rankedItems"]


def test_buzz_destination_routes_to_buzz_profile():
    result = score_destination("buzz", {"buzzItems": [buzz_item("a"), buzz_item("b"), buzz_item("c")]}, now_ms=NOW)
    data = result.to_dict()
    assert data["rankingProfile"] == "buzz-v2-trend-local-travel"
    assert data["destination"] == "buzz"
    assert "trendVelocityScore" in data["scoreBreakdown"]


def test_local_travel_destination_routes_to_local_travel_profile():
    result = score_destination("localTravel", {"localTravelItems": [local_item()]}, now_ms=NOW)
    data = result.to_dict()
    assert data["rankingProfile"] == "localTravel-v1-location-utility-disruption"
    assert data["destination"] == "localTravel"
    assert "locationPrecision" in data["scoreBreakdown"]


def test_insight_destination_routes_to_event_angle_profile():
    result = score_destination("insight", {"insightCandidates": [insight_candidate()]}, now_ms=NOW)
    data = result.to_dict()
    assert data["rankingProfile"] == "insight-v2-event-angle-tree"
    assert data["destination"] == "insight"
    assert data["rankedItems"][0]["category"] == "insightEvent"


def test_pending_destinations_fail_instead_of_generic_scoring():
    for destination in PENDING_DESTINATIONS:
        result = score_destination(destination, {}, now_ms=NOW)
        data = result.to_dict()
        assert data["qualityStatus"] == "FAIL"
        assert data["rankingProfile"].endswith("pending-tab-specific-ranker")
        assert "generic fallback" in data["diagnosticReasons"][0]


def test_unknown_destination_raises():
    try:
        score_destination("unknownTab", {}, now_ms=NOW)
    except ValueError as exc:
        assert "Unknown ranking destination" in str(exc)
    else:
        raise AssertionError("unknown destination should raise")


def test_results_document_preserves_each_profile():
    results = score_all_destinations({
        "upAhead": {"upAheadItems": [upahead_item()]},
        "buzz": {"buzzItems": [buzz_item("a"), buzz_item("b"), buzz_item("c")]},
        "localTravel": {"localTravelItems": [local_item()]},
        "insight": {"insightCandidates": [insight_candidate()]},
    }, now_ms=NOW)
    document = results_to_document(results, generated_at=NOW)
    assert document["schemaVersion"] == 1
    assert document["rankingVersion"] == "tab-specific-quality-ranking-v1"
    assert set(document["destinations"].keys()) == set(IMPLEMENTED_DESTINATIONS)
    assert document["summary"]["rankingProfiles"]["upAhead"] == "upAhead-v2-lifecycle-location-category"
    assert document["summary"]["rankingProfiles"]["insight"] == "insight-v2-event-angle-tree"
