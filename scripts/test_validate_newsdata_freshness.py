import os
import sys

SCRIPT_DIR = os.path.dirname(__file__)
sys.path.insert(0, SCRIPT_DIR)

from validate_newsdata_freshness import validate_newsdata_freshness

NOW = 1_800_000_000_000
ONE_HOUR = 3_600_000


def insight(fetched_at=NOW, stories=10):
    return {
        "schemaVersion": 3,
        "fetchedAt": fetched_at,
        "contentHash": "insight-hash",
        "stories": [{"id": f"i-{idx}"} for idx in range(stories)],
    }


def sections(fetched_at=NOW, stories=10):
    return {
        "schemaVersion": 2,
        "fetchedAt": fetched_at,
        "contentHash": "sections-hash",
        "sections": {
            "topStories": [{"id": f"s-{idx}"} for idx in range(stories)],
        },
    }


def test_fresh_snapshots_pass():
    report = validate_newsdata_freshness(insight(), sections(), now_ms=NOW, max_age_hours=6)
    assert report["status"] == "PASS"
    assert not report["errors"]


def test_stale_insight_fails():
    report = validate_newsdata_freshness(
        insight(fetched_at=NOW - 7 * ONE_HOUR),
        sections(),
        now_ms=NOW,
        max_age_hours=6,
    )
    assert report["status"] == "FAIL"
    assert any("insight: stale fetchedAt" in error for error in report["errors"])


def test_stale_sections_fails():
    report = validate_newsdata_freshness(
        insight(),
        sections(fetched_at=NOW - 7 * ONE_HOUR),
        now_ms=NOW,
        max_age_hours=6,
    )
    assert report["status"] == "FAIL"
    assert any("sections: stale fetchedAt" in error for error in report["errors"])


def test_missing_snapshot_fails():
    report = validate_newsdata_freshness(None, sections(), now_ms=NOW, max_age_hours=6)
    assert report["status"] == "FAIL"
    assert any("missing or not valid JSON" in error for error in report["errors"])


def test_zero_story_pool_fails():
    report = validate_newsdata_freshness(insight(stories=0), sections(), now_ms=NOW, max_age_hours=6)
    assert report["status"] == "FAIL"
    assert any("generated story pool is empty" in error for error in report["errors"])


def test_future_timestamp_beyond_skew_fails():
    report = validate_newsdata_freshness(
        insight(fetched_at=NOW + 20 * 60_000),
        sections(),
        now_ms=NOW,
        max_age_hours=6,
        max_future_skew_minutes=10,
    )
    assert report["status"] == "FAIL"
    assert any("future beyond allowed skew" in error for error in report["errors"])


def test_very_thin_nonzero_pool_warns():
    report = validate_newsdata_freshness(insight(stories=3), sections(), now_ms=NOW, max_age_hours=6)
    assert report["status"] == "WARN"
    assert any("very thin" in warning for warning in report["warnings"])
