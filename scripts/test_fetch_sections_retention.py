import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from prefetch_common import H_MS
from fetch_sections_stories import (
    STORY_RETAIN_HOURS,
    filter_retained_stories,
    is_story_within_retain_window,
)


def test_sections_retention_matches_adapter_36h_window():
    assert STORY_RETAIN_HOURS == 36


def test_story_retention_includes_exact_36h_boundary():
    now_ms = 1_000_000_000
    cutoff = now_ms - 36 * H_MS
    assert is_story_within_retain_window({"publishedAt": cutoff}, cutoff)
    assert not is_story_within_retain_window({"publishedAt": cutoff - 1}, cutoff)


def test_filter_retained_stories_drops_malformed_or_stale_items():
    cutoff = 5000
    retained = filter_retained_stories([
        {"id": "fresh", "publishedAt": 5000},
        {"id": "newer", "publishedAt": 6000},
        {"id": "stale", "publishedAt": 4999},
        {"id": "missing"},
        {"id": "bad", "publishedAt": "not-a-time"},
    ], cutoff)
    assert [item["id"] for item in retained] == ["fresh", "newer"]
