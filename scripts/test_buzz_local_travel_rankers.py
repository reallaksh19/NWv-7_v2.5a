import os
import sys

SCRIPT_DIR = os.path.dirname(__file__)
sys.path.insert(0, SCRIPT_DIR)
sys.path.insert(0, os.path.join(SCRIPT_DIR, "tab_rankers"))

from ranking_gates import H_MS
from buzz_ranker import RANKING_PROFILE as BUZZ_PROFILE, rank_buzz_items
from local_travel_ranker import RANKING_PROFILE as LOCAL_TRAVEL_PROFILE, rank_local_travel_items

NOW = 1_000_000_000_000


def buzz_item(**overrides):
    base = {
        "id": "buzz-1",
        "title": "AI phone trailer goes viral in Chennai",
        "summary": "Social media reacts to the AI phone trailer video",
        "url": "https://example.com/buzz-1",
        "category": "technology",
        "location": "Chennai",
        "publishedAt": NOW - H_MS,
        "source": "Source A",
        "sourceGroup": "source_a",
        "sourceTier": "A",
        "sourceRole": "primary",
        "provider": "rss",
        "imageUrl": "https://example.com/img.jpg",
    }
    base.update(overrides)
    return base


def local_item(**overrides):
    base = {
        "id": "local-1",
        "title": "Chennai airport flight delay advisory",
        "summary": "Official airport advisory says flights face delay due to heavy rain",
        "url": "https://example.com/local-1",
        "category": "travel",
        "location": "Chennai",
        "publishedAt": NOW - H_MS,
        "source": "Airport Authority",
        "sourceGroup": "airport_authority",
        "sourceTier": "A",
        "sourceRole": "primary",
        "provider": "official",
    }
    base.update(overrides)
    return base


def test_buzz_ranker_contract_and_profile():
    result = rank_buzz_items([buzz_item()], now_ms=NOW)
    data = result.to_dict()
    assert data["destination"] == "buzz"
    assert data["rankingProfile"] == BUZZ_PROFILE
    assert data["rankedItems"]
    assert "trendVelocityScore" in data["scoreBreakdown"]
    assert "localBuzzCount" in data["gateSummary"]


def test_buzz_repeated_topic_cross_source_beats_one_source_hype():
    repeated = [
        buzz_item(id="ai-1", title="AI phone trailer goes viral in Chennai", sourceGroup="a", source="A"),
        buzz_item(id="ai-2", title="AI phone trailer goes viral in Chennai", sourceGroup="b", source="B"),
        buzz_item(id="ai-3", title="AI phone trailer goes viral in Chennai", sourceGroup="c", source="C"),
    ]
    one_source = buzz_item(
        id="one-source",
        title="Celebrity rumor becomes viral online",
        summary="One source says celebrity rumor is viral",
        category="entertainment",
        sourceGroup="single",
        source="Single",
    )
    result = rank_buzz_items(repeated + [one_source], now_ms=NOW)
    data = result.to_dict()
    assert data["rankedItems"][0]["id"] in {"ai-1", "ai-2", "ai-3"}
    assert data["gateSummary"]["buzzTrendCount"] >= 1
    assert data["gateSummary"]["oneSourceCappedCount"] >= 1


def test_buzz_preserves_local_and_travel_buzz():
    items = [
        buzz_item(id="local", title="Muscat food festival video goes viral", location="Muscat", category="social", sourceGroup="a"),
        buzz_item(id="travel", title="Chennai airport holiday flight trend goes viral", location="Chennai airport", category="travel", sourceGroup="b"),
    ]
    result = rank_buzz_items(items, now_ms=NOW, configured_locations=["muscat", "chennai", "trichy"])
    summary = result.to_dict()["gateSummary"]
    assert summary["localBuzzCount"] >= 1
    assert summary["travelBuzzCount"] >= 1


def test_buzz_does_not_simply_mirror_top_stories():
    top_story_like = buzz_item(
        id="topstory-copy",
        title="Government policy court minister economy update",
        summary="Hard news item already in Top Stories",
        category="topStories",
        alreadyInTopStories=True,
    )
    distinct_buzz = buzz_item(
        id="distinct-buzz",
        title="Movie trailer video goes viral as fans react",
        summary="Social media reacts to trailer video",
        category="entertainment",
        alreadyInTopStories=False,
        sourceGroup="ent_a",
    )
    result = rank_buzz_items([top_story_like, distinct_buzz], now_ms=NOW)
    ranked = result.to_dict()["rankedItems"]
    assert ranked[0]["id"] == "distinct-buzz"
    top_item = next(item for item in ranked if item["id"] == "topstory-copy")
    assert any(gate["name"] == "novelty" and gate["status"] == "WARN" for gate in top_item["gates"])


def test_local_travel_contract_and_profile():
    result = rank_local_travel_items([local_item()], now_ms=NOW)
    data = result.to_dict()
    assert data["destination"] == "localTravel"
    assert data["rankingProfile"] == LOCAL_TRAVEL_PROFILE
    assert data["rankedItems"]
    assert "locationPrecision" in data["scoreBreakdown"]
    assert data["gateSummary"]["travelItemCount"] == 1


def test_local_travel_exact_city_disruption_ranks_high():
    disruption = local_item(
        id="delay",
        title="Chennai airport flight delay closure advisory",
        summary="Official airport says flight delay and terminal closure due to heavy rain",
        location="Chennai airport",
        category="travel",
        sourceGroup="airport",
    )
    generic = local_item(
        id="generic",
        title="Tamil Nadu tourism museum weekend guide",
        summary="Family museum and park guide",
        location="Tamil Nadu",
        category="local",
        sourceGroup="tourism",
    )
    result = rank_local_travel_items([generic, disruption], now_ms=NOW, configured_locations=["chennai"])
    ranked = result.to_dict()["rankedItems"]
    assert ranked[0]["id"] == "delay"
    assert result.to_dict()["gateSummary"]["disruptionItemCount"] >= 1


def test_local_travel_requires_configured_location_match():
    unmatched = local_item(
        id="unmatched",
        title="Delhi road closure advisory",
        summary="Official road closure in Delhi",
        location="Delhi",
        category="travel",
    )
    matched = local_item(
        id="matched",
        title="Trichy road closure advisory",
        summary="Police says road closure in Trichy",
        location="Trichy",
        category="travel",
    )
    result = rank_local_travel_items([unmatched, matched], now_ms=NOW, configured_locations=["trichy"])
    data = result.to_dict()
    assert [item["id"] for item in data["rankedItems"]] == ["matched"]
    assert data["gateSummary"]["suppressedItemCount"] == 1
    assert any("locationPrecision failed" in reason for reason in data["diagnosticReasons"])


def test_local_travel_stale_travel_item_is_suppressed():
    stale = local_item(
        id="stale-flight",
        title="Chennai airport flight delay advisory",
        location="Chennai airport",
        publishedAt=NOW - 80 * H_MS,
    )
    result = rank_local_travel_items([stale], now_ms=NOW, configured_locations=["chennai"])
    data = result.to_dict()
    assert data["rankedItems"] == []
    assert data["qualityStatus"] == "FAIL"
    assert data["gateSummary"]["suppressedItemCount"] == 1


def test_local_travel_family_relevance_is_counted():
    family = local_item(
        id="family",
        title="Chennai museum and park family weekend guide",
        summary="Kids and children activities at museum and park",
        category="local",
        location="Chennai",
    )
    result = rank_local_travel_items([family], now_ms=NOW, configured_locations=["chennai"])
    data = result.to_dict()
    assert data["gateSummary"]["familyRelevantItemCount"] == 1
    assert data["rankedItems"][0]["item"]["scoreBreakdown"]["familyRelevance"] >= 0.7
