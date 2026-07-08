from __future__ import annotations

from collections import Counter
from typing import Any

from horizon_policy import H_MS


def _text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def _int(value: Any, fallback: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def build_source_ledger_row(
    *,
    source_group: str,
    source: str | None = None,
    provider: str = "unknown",
    tier: str = "C",
    source_url: str = "",
    destination: str = "",
    section: str | None = None,
    category: str | None = None,
    city: str | None = None,
    fetch_started_at: int = 0,
    fetch_ended_at: int | None = None,
    ok: bool = False,
    status_code: int | None = None,
    items_fetched: int = 0,
    items_accepted: int = 0,
    items_suppressed: int = 0,
    items_duplicate: int = 0,
    items_stale: int = 0,
    error: str | None = None,
) -> dict[str, Any]:
    ended = _int(fetch_ended_at, fetch_started_at)
    started = _int(fetch_started_at, 0)
    row: dict[str, Any] = {
        "sourceGroup": _text(source_group, "unknown_source"),
        "source": _text(source, _text(source_group, "unknown_source")),
        "provider": _text(provider, "unknown"),
        "tier": _text(tier, "C").upper(),
        "url": _text(source_url),
        "destination": _text(destination),
        "section": section,
        "category": category,
        "city": city,
        "fetchStartedAt": started,
        "fetchEndedAt": ended,
        "durationMs": max(0, ended - started),
        "ok": bool(ok),
        "httpStatus": status_code,
        "itemsFetched": _int(items_fetched),
        "itemsAccepted": _int(items_accepted),
        "itemsSuppressed": _int(items_suppressed),
        "itemsDuplicate": _int(items_duplicate),
        "itemsStale": _int(items_stale),
        "error": str(error)[:300] if error else None,
    }
    return {k: v for k, v in row.items() if v is not None}


def build_provider_mix(items: list[dict[str, Any]]) -> dict[str, int]:
    counts = Counter(_text(item.get("provider"), "unknown") for item in items or [])
    return dict(sorted(counts.items()))


def build_source_group_mix(items: list[dict[str, Any]]) -> dict[str, int]:
    counts = Counter(_text(item.get("sourceGroup") or item.get("source"), "unknown_source") for item in items or [])
    return dict(sorted(counts.items()))


def build_freshness_buckets(
    items: list[dict[str, Any]],
    now_ms: int,
    *,
    timestamp_key: str = "publishedAt",
) -> dict[str, int]:
    buckets = {"0_4h": 0, "4_12h": 0, "12_24h": 0, "24_36h": 0, "over_36h": 0, "unknown": 0}
    for item in items or []:
        ts = item.get(timestamp_key)
        try:
            value = int(ts)
        except (TypeError, ValueError):
            buckets["unknown"] += 1
            continue
        if value <= 0:
            buckets["unknown"] += 1
            continue
        age_h = max(0.0, (int(now_ms) - value) / H_MS)
        if age_h <= 4:
            buckets["0_4h"] += 1
        elif age_h <= 12:
            buckets["4_12h"] += 1
        elif age_h <= 24:
            buckets["12_24h"] += 1
        elif age_h <= 36:
            buckets["24_36h"] += 1
        else:
            buckets["over_36h"] += 1
    return buckets
