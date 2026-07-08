from __future__ import annotations

NEWS_CLASSES = {
    "news_story",
    "weather_news_story",
    "travel_news_story",
    "market_news_story",
}
INSIGHT_CLASSES = {"insight_cluster"}
ACTIONABLE_CLASSES = {
    "upahead_event",
    "upahead_offer",
    "planner_item",
    "weather_alert",
    "travel_alert",
    "travel_deal",
    "travel_event",
    "market_event",
}
UTILITY_CLASSES = {"weather_forecast", "market_snapshot"}
DERIVED_CLASSES = {
    "section_digest",
    "buzz_story",
    "tech_social_trend",
    "entertainment_trend",
    "newspaper_edition",
    "following_topic_story",
    "data_health_record",
    "refresh_status",
}
KNOWN_CONTENT_CLASSES = frozenset(NEWS_CLASSES | INSIGHT_CLASSES | ACTIONABLE_CLASSES | UTILITY_CLASSES | DERIVED_CLASSES)

def is_known_content_class(value: str | None) -> bool:
    return str(value or "").strip() in KNOWN_CONTENT_CLASSES

def require_content_class(value: str | None) -> str:
    content_class = str(value or "").strip()
    if not is_known_content_class(content_class):
        raise ValueError("unknown contentClass")
    return content_class

def content_class_family(value: str | None) -> str:
    content_class = require_content_class(value)
    if content_class in NEWS_CLASSES:
        return "news"
    if content_class in INSIGHT_CLASSES:
        return "insight"
    if content_class in ACTIONABLE_CLASSES:
        return "actionable"
    if content_class in UTILITY_CLASSES:
        return "utility"
    return "derived"
