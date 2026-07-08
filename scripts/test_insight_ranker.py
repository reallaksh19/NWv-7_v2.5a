import os
import sys

SCRIPT_DIR = os.path.dirname(__file__)
sys.path.insert(0, SCRIPT_DIR)
sys.path.insert(0, os.path.join(SCRIPT_DIR, "tab_rankers"))

from ranking_gates import H_MS
from insight_ranker import RANKING_PROFILE, rank_insight_events

NOW = 1_000_000_000_000


def child(idx, **overrides):
    base = {
        "id": f"child-{idx}",
        "title": "Metro service update and public response",
        "summary": "Update with official response, public reaction, and useful context",
        "url": f"https://example.com/{idx}",
        "publishedAt": NOW - idx * H_MS,
        "source": f"Source {idx}",
        "sourceGroup": f"source_{idx}",
        "sourceTier": "A",
        "sourceRole": "primary",
        "angle": "official_response",
        "temporalTier": "now",
        "evolutionRole": "update",
        "informationDeltaScore": 0.8,
        "capturedAtSnapshot": "now",
    }
    base.update(overrides)
    return base


def candidate(**overrides):
    base = {
        "id": "event-1",
        "representativeTitle": "Metro service update draws official and public response",
        "storyCount": 4,
        "children": [
            child(1, angle="official_response", sourceGroup="gov", evolutionRole="update", temporalTier="now"),
            child(2, angle="reaction_public", sourceGroup="local", evolutionRole="reaction", temporalTier="minus4h"),
            child(3, angle="market_reaction", sourceGroup="market", evolutionRole="consequence", temporalTier="minus12h"),
            child(4, angle="background_context", sourceGroup="explainer", evolutionRole="background", temporalTier="minus24h"),
        ],
    }
    base.update(overrides)
    return base


def test_insight_ranker_contract_and_profile():
    result = rank_insight_events([candidate()], now_ms=NOW)
    data = result.to_dict()
    assert data["destination"] == "insight"
    assert data["rankingProfile"] == RANKING_PROFILE
    assert data["rankedItems"]
    assert "angleDiversityScore" in data["scoreBreakdown"]
    assert data["gateSummary"]["parentClusters"] == 1


def test_strong_angle_diverse_parent_beats_base_report_parent():
    strong = candidate(id="strong")
    base_heavy = candidate(
        id="base-heavy",
        children=[
            child(10, angle="base_report", sourceGroup="wire1"),
            child(11, angle="base_report", sourceGroup="wire2"),
            child(12, angle="base_report", sourceGroup="wire3"),
            child(13, angle="official_response", sourceGroup="gov"),
        ],
    )
    result = rank_insight_events([base_heavy, strong], now_ms=NOW)
    ranked = result.to_dict()["rankedItems"]
    assert ranked[0]["id"] == "strong"
    heavy = next(item for item in ranked if item["id"] == "base-heavy")
    assert heavy["item"]["baseReportRatio"] > 0.55
    assert result.to_dict()["gateSummary"]["baseReportHeavyParents"] >= 1


def test_incoherent_candidate_is_suppressed():
    incoherent = candidate(
        id="bad",
        representativeTitle="Metro service update",
        children=[
            child(1, title="Cricket score update", summary="Sports item unrelated to metro"),
            child(2, title="Movie trailer launch", summary="Entertainment item unrelated to metro"),
        ],
    )
    result = rank_insight_events([incoherent], now_ms=NOW)
    data = result.to_dict()
    assert data["rankedItems"] == []
    assert data["qualityStatus"] == "FAIL"
    assert data["gateSummary"]["suppressedCandidateCount"] == 1


def test_weak_one_child_parent_is_demoted():
    weak = candidate(
        id="weak",
        weakTree=True,
        children=[child(1, angle="official_response", sourceGroup="gov")],
    )
    strong = candidate(id="strong")
    result = rank_insight_events([weak, strong], now_ms=NOW)
    data = result.to_dict()
    assert data["rankedItems"][0]["id"] == "strong"
    assert data["gateSummary"]["weakParentsDemoted"] >= 1


def test_duplicate_child_titles_are_warned():
    duplicate = candidate(
        id="duplicate",
        children=[
            child(1, title="Same headline", angle="official_response", sourceGroup="wire1"),
            child(2, title="Same headline", angle="reaction_public", sourceGroup="wire2"),
            child(3, title="Same headline", angle="market_reaction", sourceGroup="wire3"),
        ],
    )
    result = rank_insight_events([duplicate], now_ms=NOW)
    data = result.to_dict()
    assert data["rankedItems"]
    assert data["gateSummary"]["duplicateChildrenSuppressed"] >= 1


def test_event_sketch_without_child_objects_can_rank_as_event_candidate():
    sketch = {
        "id": "sketch-1",
        "topicKey": "metro|service|update",
        "representativeTitle": "Metro service update",
        "storyCount": 5,
        "topAngles": [
            {"angle": "official_response", "count": 1},
            {"angle": "reaction_public", "count": 1},
            {"angle": "market_reaction", "count": 1},
        ],
        "sourceGroups": ["gov", "local", "market"],
        "slots": ["now", "minus4h", "minus12h"],
    }
    result = rank_insight_events([sketch], now_ms=NOW)
    data = result.to_dict()
    assert data["rankedItems"]
    assert data["rankedItems"][0]["category"] == "insightEvent"
    assert data["gateSummary"]["parentClusters"] == 1


def test_child_scores_include_angle_delta_source_and_freshness_parts():
    result = rank_insight_events([candidate()], now_ms=NOW)
    child_scores = result.to_dict()["rankedItems"][0]["item"]["childScores"]
    assert child_scores
    first = child_scores[0]
    for key in ["angleDistinctiveness", "informationDelta", "sourceAuthority", "sourceDiversityBenefit", "freshness", "readability"]:
        assert key in first["scoreBreakdown"]
