"""Reusable gate primitives for tab-specific ranking.

These helpers are intentionally neutral. They do not decide whether a tab is
news, Insight, Buzz, or Up Ahead. Tab rankers compose these primitives with their
own weights and hard/soft gates.
"""
from __future__ import annotations

import hashlib
import re
from typing import Any

from ranking_contracts import GateResult, clamp_score, fail_gate, pass_gate, warn_gate

H_MS = 3_600_000
DAY_MS = 86_400_000

CITY_ALIASES = {
    "chennai": {"chennai", "madras"},
    "trichy": {"trichy", "tiruchirappalli", "tiruchi"},
    "muscat": {"muscat", "masqat", "oman"},
}

ONLINE_TERMS = {"online", "web", "app", "digital", "ecommerce", "e-commerce", "website"}
GLOBAL_TERMS = {"global", "worldwide", "international"}


def text_blob(item: dict[str, Any]) -> str:
    values = [
        item.get("title"),
        item.get("summary"),
        item.get("description"),
        item.get("location"),
        item.get("city"),
        item.get("region"),
        item.get("country"),
        item.get("category"),
    ]
    return " ".join(str(value or "") for value in values).lower()


def int_ms(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed >= 0 else None


def freshness_score(timestamp_ms: Any, now_ms: int, max_age_hours: int) -> float:
    ts = int_ms(timestamp_ms)
    if ts is None:
        return 0.0
    age = max(0, int(now_ms) - ts)
    max_age = max(1, int(max_age_hours)) * H_MS
    if age >= max_age:
        return 0.0
    return round(1 - (age / max_age), 4)


def future_validity_score(
    *,
    event_start_at: Any = None,
    display_until: Any = None,
    now_ms: int,
    lookahead_days: int = 7,
    past_grace_hours: int = 24,
) -> GateResult:
    start = int_ms(event_start_at)
    until = int_ms(display_until)

    if until is not None and until < now_ms:
        return fail_gate("futureValidity", "expired display window", displayUntil=until)

    if start is None:
        if until is not None and until >= now_ms:
            return pass_gate("futureValidity", 0.65, "valid undated item with active display window", displayUntil=until)
        return fail_gate("futureValidity", "missing eventStartAt/displayUntil")

    min_start = now_ms - past_grace_hours * H_MS
    max_start = now_ms + lookahead_days * DAY_MS
    if start < min_start:
        return fail_gate("futureValidity", "event outside past grace", eventStartAt=start)
    if start > max_start:
        return fail_gate("futureValidity", "event beyond lookahead horizon", eventStartAt=start)

    hours_until = (start - now_ms) / H_MS
    if hours_until <= 24:
        score = 1.0
    elif hours_until <= 72:
        score = 0.85
    else:
        score = max(0.45, 1 - (hours_until / (lookahead_days * 24)))
    return pass_gate("futureValidity", score, "inside lifecycle horizon", eventStartAt=start)


def classify_location_scope(item: dict[str, Any], configured_locations: list[str]) -> dict[str, Any]:
    blob = text_blob(item)
    normalized_locations = [str(loc).strip().lower() for loc in configured_locations if str(loc).strip()]

    if any(term in blob for term in ONLINE_TERMS):
        return {"scope": "online", "matchedLocation": "online", "score": 0.72, "relevance": "onlineOnly"}
    if any(term in blob for term in GLOBAL_TERMS):
        return {"scope": "global", "matchedLocation": "global", "score": 0.55, "relevance": "global"}

    for loc in normalized_locations:
        aliases = CITY_ALIASES.get(loc, {loc})
        if any(re.search(rf"\b{re.escape(alias)}\b", blob) for alias in aliases):
            return {"scope": "exactCity", "matchedLocation": loc, "score": 1.0, "relevance": "primary"}

    region_terms = {"tamil nadu": "chennai", "tn": "chennai", "oman": "muscat", "gulf": "muscat", "gcc": "muscat"}
    for term, loc in region_terms.items():
        if term in blob and (not normalized_locations or loc in normalized_locations):
            return {"scope": "region", "matchedLocation": loc, "score": 0.72, "relevance": "secondary"}

    return {"scope": "unknown", "matchedLocation": "unknown", "score": 0.0, "relevance": "weak"}


def _match_details_without_score(match: dict[str, Any]) -> dict[str, Any]:
    """Return location-match diagnostics without shadowing GateResult.score.

    pass_gate/warn_gate accept score as a positional argument. classify_location_scope
    also returns a diagnostic field named score. Expanding that dict directly as
    **kwargs causes TypeError: got multiple values for argument 'score'. Preserve
    the diagnostic value under matchScore instead.
    """
    details = dict(match)
    match_score = details.pop("score", None)
    if match_score is not None:
        details["matchScore"] = match_score
    return details


def location_gate(item: dict[str, Any], configured_locations: list[str], *, allow_online: bool = True) -> GateResult:
    match = classify_location_scope(item, configured_locations)
    score = match["score"]
    details = _match_details_without_score(match)
    if match["scope"] in {"exactCity", "region"}:
        return pass_gate("location", score, "location matches configured profile", **details)
    if allow_online and match["scope"] in {"online", "global"}:
        return warn_gate("location", score, "online/global item allowed without city match", **details)
    return fail_gate("location", "offline/local item lacks configured location match", **match)


def has_actionable_fields(item: dict[str, Any]) -> bool:
    return bool(item.get("url") or item.get("actionUrl")) and bool(item.get("title"))


def actionability_gate(item: dict[str, Any], *, require_time_or_place: bool = False) -> GateResult:
    has_url_title = has_actionable_fields(item)
    has_time = any(item.get(key) for key in ("eventStartAt", "displayUntil", "expiryAt", "publishedAt"))
    has_place = bool(item.get("location") or item.get("city") or item.get("venue"))

    if not has_url_title:
        return fail_gate("actionability", "missing title or URL/action URL")
    if require_time_or_place and not (has_time or has_place):
        return fail_gate("actionability", "missing time/place for actionable item")

    score = 0.65 + (0.2 if has_time else 0) + (0.15 if has_place else 0)
    return pass_gate("actionability", score, "item has enough action fields", hasTime=has_time, hasPlace=has_place)


def category_balance_score(items: list[dict[str, Any]], category_key: str = "category") -> float:
    if not items:
        return 0.0
    counts: dict[str, int] = {}
    for item in items:
        key = str(item.get(category_key) or "unknown").lower()
        counts[key] = counts.get(key, 0) + 1
    dominant = max(counts.values()) / max(1, len(items))
    # 1.0 when no category dominates, 0.0 when one category is everything.
    return round(max(0.0, min(1.0, 1.25 - dominant)), 4)


def source_confidence_score(item: dict[str, Any]) -> float:
    tier = str(item.get("sourceTier") or item.get("tier") or "C").upper()
    role = str(item.get("sourceRole") or item.get("role") or "").lower()
    provider = str(item.get("provider") or "").lower()
    score = {"A": 0.92, "B": 0.78, "C": 0.58}.get(tier, 0.45)
    if role == "primary":
        score += 0.08
    if role == "fallback":
        score -= 0.12
    if provider == "google_news":
        score -= 0.08
    return clamp_score(score)


def dedup_key(item: dict[str, Any]) -> str:
    raw = "|".join(
        str(item.get(key) or "").strip().lower()
        for key in ("title", "eventStartAt", "url", "category", "location", "city")
    )
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def duplicate_gate(item: dict[str, Any], seen_keys: set[str]) -> GateResult:
    key = dedup_key(item)
    if key in seen_keys:
        return fail_gate("dedup", "duplicate item suppressed", dedupKey=key)
    seen_keys.add(key)
    return pass_gate("dedup", 1.0, "unique item", dedupKey=key)
