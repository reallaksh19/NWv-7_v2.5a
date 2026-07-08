import os
import sys

SCRIPT_DIR = os.path.dirname(__file__)
sys.path.insert(0, SCRIPT_DIR)
sys.path.insert(0, os.path.join(SCRIPT_DIR, "tab_rankers"))

import build_quality_rankings as builder
from ranking_gates import DAY_MS, H_MS

NOW = 1_000_000_000_000


def test_extract_sections_items_from_nested_sections():
    snapshot = {
        "sections": {
            "technology": {"stories": [{"id": "tech-1", "title": "AI phone trailer goes viral", "category": "technology"}]},
            "muscat": {"stories": [{"id": "muscat-1", "title": "Muscat road closure", "category": "travel"}]},
            "business": {"stories": [{"id": "biz-1", "title": "Stocks rise", "category": "business"}]},
        }
    }
    buzz = builder.extract_sections_items(snapshot, {"technology"})
    local = builder.extract_sections_items(snapshot, {"muscat"})
    assert [item["id"] for item in buzz] == ["tech-1"]
    assert buzz[0]["section"] == "technology"
    assert [item["id"] for item in local] == ["muscat-1"]


def test_extract_insight_candidates_prefers_event_sketches():
    snapshot = {
        "eventSketches": [{"id": "sketch-1"}],
        "parents": [{"id": "parent-1"}],
    }
    assert builder.extract_insight_candidates(snapshot) == [{"id": "sketch-1"}]


def test_build_quality_rankings_writes_diagnostic_files(tmp_path, monkeypatch):
    upahead = tmp_path / "public/data/up_ahead.json"
    insight = tmp_path / "public/newsdata/insight_latest.json"
    sections = tmp_path / "public/newsdata/sections_latest.json"
    rankings_json = tmp_path / "public/newsdata/quality_rankings.json"
    rankings_md = tmp_path / "public/newsdata/quality_rankings.md"
    rankings_history = tmp_path / "public/newsdata/quality_rankings_history.json"

    upahead.parent.mkdir(parents=True, exist_ok=True)
    insight.parent.mkdir(parents=True, exist_ok=True)

    builder.write_json(upahead, {
        "items": [{
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
        }]
    })
    builder.write_json(insight, {
        "eventSketches": [{
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
        }]
    })
    builder.write_json(sections, {
        "sections": {
            "technology": {"stories": [
                {"id": "buzz-a", "title": "AI phone trailer goes viral in Chennai", "summary": "Social media reacts", "url": "https://example.com/a", "category": "technology", "location": "Chennai", "publishedAt": NOW - H_MS, "sourceGroup": "a", "sourceTier": "A", "sourceRole": "primary"},
                {"id": "buzz-b", "title": "AI phone trailer goes viral in Chennai", "summary": "Social media reacts", "url": "https://example.com/b", "category": "technology", "location": "Chennai", "publishedAt": NOW - H_MS, "sourceGroup": "b", "sourceTier": "A", "sourceRole": "primary"},
                {"id": "buzz-c", "title": "AI phone trailer goes viral in Chennai", "summary": "Social media reacts", "url": "https://example.com/c", "category": "technology", "location": "Chennai", "publishedAt": NOW - H_MS, "sourceGroup": "c", "sourceTier": "A", "sourceRole": "primary"},
            ]},
            "muscat": {"stories": [
                {"id": "local-1", "title": "Muscat airport flight delay advisory", "summary": "Official airport advisory", "url": "https://example.com/local", "category": "travel", "location": "Muscat airport", "publishedAt": NOW - H_MS, "sourceTier": "A", "sourceRole": "primary"}
            ]},
        }
    })

    monkeypatch.setattr(builder, "UPAHEAD_PATH", upahead)
    monkeypatch.setattr(builder, "INSIGHT_PATH", insight)
    monkeypatch.setattr(builder, "SECTIONS_PATH", sections)
    monkeypatch.setattr(builder, "RANKINGS_JSON_PATH", rankings_json)
    monkeypatch.setattr(builder, "RANKINGS_MD_PATH", rankings_md)
    monkeypatch.setattr(builder, "RANKINGS_HISTORY_PATH", rankings_history)

    document = builder.build_quality_rankings(now_ms=NOW)
    assert rankings_json.exists()
    assert rankings_md.exists()
    assert rankings_history.exists()
    assert document["rankingVersion"] == "tab-specific-quality-ranking-v1"
    assert set(document["destinations"].keys()) == {"upAhead", "buzz", "localTravel", "insight"}
    assert document["destinations"]["upAhead"]["rankingProfile"] == "upAhead-v2-lifecycle-location-category"
    assert document["destinations"]["insight"]["rankingProfile"] == "insight-v2-event-angle-tree"


def test_builder_handles_missing_optional_snapshots(tmp_path, monkeypatch):
    rankings_json = tmp_path / "public/newsdata/quality_rankings.json"
    rankings_md = tmp_path / "public/newsdata/quality_rankings.md"
    rankings_history = tmp_path / "public/newsdata/quality_rankings_history.json"
    monkeypatch.setattr(builder, "UPAHEAD_PATH", tmp_path / "missing_upahead.json")
    monkeypatch.setattr(builder, "INSIGHT_PATH", tmp_path / "missing_insight.json")
    monkeypatch.setattr(builder, "SECTIONS_PATH", tmp_path / "missing_sections.json")
    monkeypatch.setattr(builder, "RANKINGS_JSON_PATH", rankings_json)
    monkeypatch.setattr(builder, "RANKINGS_MD_PATH", rankings_md)
    monkeypatch.setattr(builder, "RANKINGS_HISTORY_PATH", rankings_history)
    document = builder.build_quality_rankings(now_ms=NOW)
    assert rankings_json.exists()
    assert document["summary"]["overallStatus"] == "FAIL"
    assert all(payload["qualityStatus"] == "FAIL" for payload in document["destinations"].values())
