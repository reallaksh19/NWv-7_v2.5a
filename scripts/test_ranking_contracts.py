import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from ranking_contracts import (
    GateResult,
    RankedItem,
    RankingResult,
    clamp_score,
    grade_from_score,
    pass_gate,
    warn_gate,
    weighted_score,
)
from ranking_gates import (
    DAY_MS,
    H_MS,
    actionability_gate,
    category_balance_score,
    duplicate_gate,
    freshness_score,
    future_validity_score,
    location_gate,
    source_confidence_score,
)

NOW = 1_000_000_000_000


def test_score_helpers_are_bounded_and_graded():
    assert clamp_score(-1) == 0
    assert clamp_score(2) == 1
    assert clamp_score("bad") == 0
    assert grade_from_score(0.95) == "A"
    assert grade_from_score(0.81) == "B"
    assert grade_from_score(0.71) == "C"
    assert grade_from_score(0.60) == "D"
    assert grade_from_score(0.20) == "F"


def test_weighted_score_normalizes_weights():
    score = weighted_score({"a": 1.0, "b": 0.0}, {"a": 3, "b": 1})
    assert score == 0.75


def test_ranking_result_keeps_tab_specific_profile_and_breakdown():
    result = RankingResult(
        destination="upAhead",
        ranking_profile="upAhead-v2-lifecycle-location-category",
        ranked_items=(
            RankedItem(
                item_id="event-1",
                title="Chennai music event tomorrow",
                score=0.9,
                category="events",
                location_key="chennai",
                ranking_reasons=("future valid", "exact city match"),
            ),
        ),
        gate_results=(pass_gate("futureValidity", 1.0), warn_gate("location", 0.72, "online/global allowed")),
        score_breakdown={"lifecycleScore": 1.0, "locationScore": 0.72, "actionabilityScore": 0.85},
        gate_summary={"events": 1, "onlineOffers": 0, "offlineOffers": 0, "alerts": 0},
    )
    data = result.to_dict()
    assert data["destination"] == "upAhead"
    assert data["rankingProfile"] == "upAhead-v2-lifecycle-location-category"
    assert data["qualityStatus"] == "WARN"
    assert "lifecycleScore" in data["scoreBreakdown"]
    assert data["gateSummary"]["events"] == 1
    assert data["rankedItems"][0]["locationKey"] == "chennai"


def test_fail_gate_controls_quality_status():
    result = RankingResult(
        destination="buzz",
        ranking_profile="buzz-v2-trend-local-travel",
        ranked_items=(),
        gate_results=(GateResult("trendVelocity", "FAIL", 0, "no repeated topic"),),
    )
    assert result.quality_status == "FAIL"
    assert result.to_dict()["qualityStatus"] == "FAIL"


def test_freshness_score_is_for_news_like_time_decay_only():
    fresh = freshness_score(NOW - H_MS, NOW, max_age_hours=36)
    stale = freshness_score(NOW - 40 * H_MS, NOW, max_age_hours=36)
    assert fresh > 0.9
    assert stale == 0


def test_future_validity_is_different_from_news_freshness():
    tomorrow = future_validity_score(
        event_start_at=NOW + DAY_MS,
        display_until=NOW + 2 * DAY_MS,
        now_ms=NOW,
        lookahead_days=7,
        past_grace_hours=24,
    )
    far_future = future_validity_score(
        event_start_at=NOW + 8 * DAY_MS,
        display_until=NOW + 9 * DAY_MS,
        now_ms=NOW,
        lookahead_days=7,
        past_grace_hours=24,
    )
    expired = future_validity_score(
        event_start_at=NOW - 2 * DAY_MS,
        display_until=NOW - H_MS,
        now_ms=NOW,
        lookahead_days=7,
        past_grace_hours=24,
    )
    assert tomorrow.status == "PASS"
    assert far_future.status == "FAIL"
    assert expired.status == "FAIL"


def test_location_gate_distinguishes_offline_city_from_online_offer():
    chennai_event = {
        "title": "Chennai weekend food festival",
        "location": "Chennai",
        "category": "events",
    }
    online_offer = {
        "title": "Online travel app sale",
        "category": "shopping",
    }
    unknown_offline_offer = {
        "title": "Mall discount today",
        "category": "shopping",
    }
    assert location_gate(chennai_event, ["chennai", "muscat"]).status == "PASS"
    assert location_gate(online_offer, ["chennai", "muscat"]).status == "WARN"
    assert location_gate(unknown_offline_offer, ["chennai", "muscat"]).status == "FAIL"


def test_actionability_gate_requires_title_url_and_optionally_time_or_place():
    good = {"title": "Muscat alert", "url": "https://example.com", "city": "Muscat"}
    no_url = {"title": "Muscat alert"}
    vague = {"title": "Deal", "url": "https://example.com"}
    assert actionability_gate(good, require_time_or_place=True).status == "PASS"
    assert actionability_gate(no_url).status == "FAIL"
    assert actionability_gate(vague, require_time_or_place=True).status == "FAIL"


def test_category_balance_score_penalizes_single_category_domination():
    balanced = category_balance_score([
        {"category": "events"},
        {"category": "alerts"},
        {"category": "shopping"},
    ])
    dominated = category_balance_score([
        {"category": "events"},
        {"category": "events"},
        {"category": "events"},
    ])
    assert balanced > dominated


def test_source_confidence_penalizes_fallback_google_news():
    primary = source_confidence_score({"sourceTier": "A", "sourceRole": "primary", "provider": "rss"})
    fallback = source_confidence_score({"sourceTier": "A", "sourceRole": "fallback", "provider": "google_news"})
    assert primary > fallback


def test_duplicate_gate_tracks_seen_keys():
    seen = set()
    item = {"title": "Same event", "eventStartAt": NOW, "url": "https://example.com", "category": "events"}
    assert duplicate_gate(item, seen).status == "PASS"
    assert duplicate_gate(item, seen).status == "FAIL"
