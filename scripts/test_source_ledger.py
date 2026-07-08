import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from horizon_policy import H_MS
from source_ledger import (
    build_freshness_buckets,
    build_provider_mix,
    build_source_group_mix,
    build_source_ledger_row,
)


def test_build_source_ledger_row_shape():
    row = build_source_ledger_row(
        source_group="bbc_world",
        source="BBC World",
        provider="rss",
        tier="A",
        source_url="https://example.com/rss",
        destination="main",
        section="world",
        fetch_started_at=1000,
        fetch_ended_at=1500,
        ok=True,
        status_code=200,
        items_fetched=25,
        items_accepted=12,
    )
    assert row["sourceGroup"] == "bbc_world"
    assert row["provider"] == "rss"
    assert row["durationMs"] == 500
    assert row["itemsAccepted"] == 12
    assert row["ok"] is True


def test_provider_and_source_group_mix():
    items = [
        {"provider": "rss", "sourceGroup": "bbc"},
        {"provider": "rss", "sourceGroup": "bbc"},
        {"provider": "google_news", "sourceGroup": "google_news"},
    ]
    assert build_provider_mix(items) == {"google_news": 1, "rss": 2}
    assert build_source_group_mix(items) == {"bbc": 2, "google_news": 1}


def test_freshness_buckets():
    now = 40 * H_MS
    items = [
        {"publishedAt": now - 2 * H_MS},
        {"publishedAt": now - 8 * H_MS},
        {"publishedAt": now - 18 * H_MS},
        {"publishedAt": now - 30 * H_MS},
        {"publishedAt": now - 50 * H_MS},
        {"publishedAt": 0},
    ]
    buckets = build_freshness_buckets(items, now)
    assert buckets == {
        "0_4h": 1,
        "4_12h": 1,
        "12_24h": 1,
        "24_36h": 1,
        "over_36h": 1,
        "unknown": 1,
    }
