from __future__ import annotations

from typing import Any

from horizon_policy import (
    ALERT_FALLBACK_HOURS,
    DAY_MS,
    H_MS,
    NEWS_RETAIN_HOURS,
    OFFER_FALLBACK_HOURS,
    PLANNER_PAST_GRACE_HOURS,
    UPAHEAD_EVENT_PAST_GRACE_HOURS,
    UPAHEAD_LOOKAHEAD_DAYS,
)


def _ms(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed >= 0 else None


def _required_ms(value: Any, fallback: int = 0) -> int:
    parsed = _ms(value)
    return parsed if parsed is not None else int(fallback)


def _archive_until(display_until: int, now_ms: int, extra_days: int = 7) -> int:
    return max(int(display_until), int(now_ms)) + extra_days * DAY_MS


def _base_lifecycle(
    *,
    content_class: str,
    fresh_until: int | None,
    display_until: int,
    archive_until: int,
    retention_reason: str,
    now_ms: int,
    is_action_valid: bool = False,
    within_seven_day_horizon: bool | None = None,
) -> dict[str, Any]:
    is_visible = int(display_until) >= int(now_ms)
    if within_seven_day_horizon is not None:
        is_visible = is_visible and bool(within_seven_day_horizon)
    return {
        "contentClass": content_class,
        "freshUntil": fresh_until,
        "displayUntil": int(display_until),
        "archiveUntil": int(archive_until),
        "retentionReason": retention_reason,
        "isVisible": bool(is_visible),
        "isNewsFresh": bool(fresh_until is not None and int(fresh_until) >= int(now_ms)),
        "isActionValid": bool(is_action_valid and int(display_until) >= int(now_ms)),
        "withinSevenDayHorizon": within_seven_day_horizon,
    }


def lifecycle_for_news_story(
    *,
    published_at: int | None,
    now_ms: int,
    retain_hours: int = NEWS_RETAIN_HOURS,
    content_class: str = "news_story",
) -> dict[str, Any]:
    published = _required_ms(published_at, fallback=now_ms)
    fresh_until = published + int(retain_hours) * H_MS
    return _base_lifecycle(
        content_class=content_class,
        fresh_until=fresh_until,
        display_until=fresh_until,
        archive_until=published + 7 * DAY_MS,
        retention_reason=f"news_{retain_hours}h_freshness",
        now_ms=now_ms,
    )


def _event_display_until(*, event_start_at: int | None, event_end_at: int | None, expiry_at: int | None) -> tuple[int, str]:
    expiry = _ms(expiry_at)
    event_end = _ms(event_end_at)
    event_start = _ms(event_start_at)
    if expiry is not None:
        return expiry, "expiryAt"
    if event_end is not None:
        return event_end, "eventEndAt"
    if event_start is not None:
        return event_start + DAY_MS, "eventStartAt_end_of_day"
    return 0, "missing_event_time"


def _within_horizon(
    *,
    event_start_at: int | None,
    display_until: int,
    now_ms: int,
    lookahead_days: int,
    past_grace_hours: int,
) -> bool:
    event_start = _ms(event_start_at)
    if event_start is None:
        return int(display_until) >= int(now_ms)
    horizon_start = int(now_ms) - int(past_grace_hours) * H_MS
    horizon_end = int(now_ms) + int(lookahead_days) * DAY_MS
    return horizon_start <= event_start <= horizon_end


def lifecycle_for_event(
    *,
    event_start_at: int | None,
    event_end_at: int | None,
    expiry_at: int | None,
    now_ms: int,
    lookahead_days: int = UPAHEAD_LOOKAHEAD_DAYS,
    past_grace_hours: int = UPAHEAD_EVENT_PAST_GRACE_HOURS,
    content_class: str = "upahead_event",
) -> dict[str, Any]:
    display_until, reason = _event_display_until(
        event_start_at=event_start_at,
        event_end_at=event_end_at,
        expiry_at=expiry_at,
    )
    if display_until <= 0:
        display_until = int(now_ms) - 1
    within = _within_horizon(
        event_start_at=event_start_at,
        display_until=display_until,
        now_ms=now_ms,
        lookahead_days=lookahead_days,
        past_grace_hours=past_grace_hours,
    )
    return _base_lifecycle(
        content_class=content_class,
        fresh_until=None,
        display_until=display_until,
        archive_until=_archive_until(display_until, now_ms),
        retention_reason=reason,
        now_ms=now_ms,
        is_action_valid=True,
        within_seven_day_horizon=within,
    )


def lifecycle_for_planner_item(
    *,
    event_start_at: int | None,
    expiry_at: int | None,
    now_ms: int,
    lookahead_days: int = UPAHEAD_LOOKAHEAD_DAYS,
    past_grace_hours: int = PLANNER_PAST_GRACE_HOURS,
) -> dict[str, Any]:
    return lifecycle_for_event(
        event_start_at=event_start_at,
        event_end_at=None,
        expiry_at=expiry_at,
        now_ms=now_ms,
        lookahead_days=lookahead_days,
        past_grace_hours=past_grace_hours,
        content_class="planner_item",
    )


def lifecycle_for_alert(
    *,
    published_at: int | None,
    expiry_at: int | None,
    now_ms: int,
    fallback_hours: int = ALERT_FALLBACK_HOURS,
    content_class: str = "weather_alert",
) -> dict[str, Any]:
    published = _required_ms(published_at, fallback=now_ms)
    expiry = _ms(expiry_at)
    display_until = expiry if expiry is not None else published + int(fallback_hours) * H_MS
    reason = "expiryAt" if expiry is not None else f"alert_{fallback_hours}h_fallback"
    return _base_lifecycle(
        content_class=content_class,
        fresh_until=None,
        display_until=display_until,
        archive_until=_archive_until(display_until, now_ms),
        retention_reason=reason,
        now_ms=now_ms,
        is_action_valid=True,
    )


def lifecycle_for_offer(
    *,
    published_at: int | None,
    sale_end_at: int | None,
    expiry_at: int | None,
    now_ms: int,
    fallback_hours: int = OFFER_FALLBACK_HOURS,
    content_class: str = "upahead_offer",
) -> dict[str, Any]:
    published = _required_ms(published_at, fallback=now_ms)
    sale_end = _ms(sale_end_at)
    expiry = _ms(expiry_at)
    if sale_end is not None:
        display_until, reason = sale_end, "saleEndAt"
    elif expiry is not None:
        display_until, reason = expiry, "expiryAt"
    else:
        display_until, reason = published + int(fallback_hours) * H_MS, f"offer_{fallback_hours}h_fallback"
    return _base_lifecycle(
        content_class=content_class,
        fresh_until=None,
        display_until=display_until,
        archive_until=_archive_until(display_until, now_ms),
        retention_reason=reason,
        now_ms=now_ms,
        is_action_valid=True,
    )


def lifecycle_for_weather_forecast(*, issued_at: int | None, valid_until: int | None, now_ms: int) -> dict[str, Any]:
    issued = _required_ms(issued_at, fallback=now_ms)
    valid = _required_ms(valid_until, fallback=issued)
    return _base_lifecycle(
        content_class="weather_forecast",
        fresh_until=valid,
        display_until=valid,
        archive_until=_archive_until(valid, now_ms, extra_days=2),
        retention_reason="forecast_validity_window",
        now_ms=now_ms,
    )


def lifecycle_for_market_snapshot(*, market_timestamp: int | None, valid_until: int | None, now_ms: int) -> dict[str, Any]:
    timestamp = _required_ms(market_timestamp, fallback=now_ms)
    valid = _required_ms(valid_until, fallback=timestamp)
    return _base_lifecycle(
        content_class="market_snapshot",
        fresh_until=valid,
        display_until=valid,
        archive_until=_archive_until(valid, now_ms, extra_days=7),
        retention_reason="market_validity_window",
        now_ms=now_ms,
    )
