import os
import sys

SCRIPT_DIR = os.path.dirname(__file__)
sys.path.insert(0, SCRIPT_DIR)
sys.path.insert(0, os.path.join(SCRIPT_DIR, "tab_rankers"))

from ranking_gates import DAY_MS, H_MS
from upahead_ranker import RANKING_PROFILE, rank_upahead_items

NOW = 1_000_000_000_000


def item(**overrides):
    base = {
        "id": "event-1",
        "title": "Chennai family event tomorrow",
        "summary": "Family event in Chennai",
        "url": "https://example.com/event-1",
        "category": "events",
        "location": "Chennai",
        "eventStartAt": NOW + DAY_MS,
        "eventEndAt": NOW + DAY_MS + 2 * H_MS,
        "publishedAt": NOW - H_MS,
        "plannerEligible": True,
        "sourceTier": "A",
        "sourceRole": "primary",
        "provider": "rss",
    }
    base.update(overrides)
    return base


def test_upahead_ranker_contract_and_profile():
    result = rank_upahead_items([item()], now_ms=NOW, configured_locations=["chennai", "muscat", "trichy"])
    data = result.to_dict()
    assert data["destination"] == "upAhead"
    assert data["rankingProfile"] == RANKING_PROFILE
    assert data["rankedItems"]
    assert "lifecycleScore" in data["scoreBreakdown"]
    assert data["gateSummary"]["events"] == 1


def test_severe_alert_ranks_above_normal_future_event():
    severe_alert = item(
        id="alert-1",
        title="Severe Muscat road closure alert",
        summary="Emergency closure in Muscat today",
        category="alerts",
        location="Muscat",
        eventStartAt=NOW + H_MS,
        eventEndAt=NOW + 4 * H_MS,
        severity="severe",
        plannerEligible=False,
    )
    normal_event = item(
        id="event-1",
        title="Chennai music event tomorrow",
        category="events",
        location="Chennai",
        eventStartAt=NOW + DAY_MS,
    )
    result = rank_upahead_items([normal_event, severe_alert], now_ms=NOW)
    ranked = result.to_dict()["rankedItems"]
    assert ranked[0]["id"] == "alert-1"
    assert ranked[0]["category"] == "alerts"
    assert result.to_dict()["gateSummary"]["alerts"] == 1


def test_online_offer_allowed_without_city_match():
    online_offer = item(
        id="offer-online",
        title="Online travel app sale for weekend flights",
        summary="Online app only offer",
        category="shopping",
        location="",
        eventStartAt=None,
        eventEndAt=None,
        expiryAt=NOW + 36 * H_MS,
        plannerEligible=False,
    )
    result = rank_upahead_items([online_offer], now_ms=NOW, configured_locations=["chennai"])
    data = result.to_dict()
    assert data["rankedItems"][0]["id"] == "offer-online"
    assert data["gateSummary"]["onlineOffers"] == 1
    assert data["gateSummary"]["offlineOffers"] == 0
    assert any(gate["name"] == "location" and gate["status"] == "WARN" for gate in data["rankedItems"][0]["gates"])


def test_offline_offer_requires_city_or_region_match():
    unknown_offer = item(
        id="offer-unknown",
        title="Mall discount today",
        summary="Local in-store discount",
        category="shopping",
        location="",
        eventStartAt=None,
        eventEndAt=None,
        expiryAt=NOW + 12 * H_MS,
        plannerEligible=False,
    )
    trichy_offer = item(
        id="offer-trichy",
        title="Trichy store discount today",
        summary="Offline in-store discount in Trichy",
        category="shopping",
        location="Trichy",
        eventStartAt=None,
        eventEndAt=None,
        expiryAt=NOW + 12 * H_MS,
        plannerEligible=False,
    )
    result = rank_upahead_items([unknown_offer, trichy_offer], now_ms=NOW, configured_locations=["trichy"])
    data = result.to_dict()
    ids = [ranked["id"] for ranked in data["rankedItems"]]
    assert ids == ["offer-trichy"]
    assert data["gateSummary"]["offlineOffers"] == 1
    assert data["gateSummary"]["suppressedItemCount"] == 1
    assert any("location failed" in reason for reason in data["diagnosticReasons"])


def test_expired_offer_and_far_future_event_are_suppressed():
    expired_offer = item(
        id="expired-offer",
        title="Chennai expired shop offer",
        category="shopping",
        location="Chennai",
        eventStartAt=None,
        eventEndAt=None,
        expiryAt=NOW - H_MS,
        plannerEligible=False,
    )
    far_event = item(
        id="far-event",
        title="Muscat event next month",
        category="events",
        location="Muscat",
        eventStartAt=NOW + 8 * DAY_MS,
        eventEndAt=NOW + 8 * DAY_MS + H_MS,
    )
    result = rank_upahead_items([expired_offer, far_event], now_ms=NOW)
    data = result.to_dict()
    assert data["rankedItems"] == []
    assert data["qualityStatus"] == "FAIL"
    assert data["gateSummary"]["suppressedItemCount"] == 2


def test_planner_is_advisory_only_not_persisted():
    planner_event = item(
        id="planner-event",
        title="Chennai museum visit tomorrow",
        category="events",
        location="Chennai",
        plannerEligible=True,
        eventStartAt=NOW + DAY_MS,
    )
    result = rank_upahead_items([planner_event], now_ms=NOW)
    data = result.to_dict()
    ranked_item = data["rankedItems"][0]
    assert data["gateSummary"]["plannerAdvisoryItems"] == 1
    assert "planner advisory fit" in ranked_item["rankingReasons"]
    assert "savedPlan" not in ranked_item["item"]
    assert "persisted" not in ranked_item["item"]


def test_multiple_locations_are_counted_separately():
    items = [
        item(id="chennai-event", title="Chennai event", location="Chennai", category="events"),
        item(id="muscat-alert", title="Muscat civic alert", location="Muscat", category="civic", eventStartAt=NOW + H_MS),
        item(id="trichy-offer", title="Trichy store offer", location="Trichy", category="shopping", eventStartAt=None, eventEndAt=None, expiryAt=NOW + 10 * H_MS),
    ]
    result = rank_upahead_items(items, now_ms=NOW, configured_locations=["chennai", "muscat", "trichy"])
    summary = result.to_dict()["gateSummary"]
    assert set(summary["locationsCovered"]) >= {"chennai", "muscat", "trichy"}
    assert summary["events"] == 1
    assert summary["alerts"] == 1
    assert summary["offlineOffers"] == 1
