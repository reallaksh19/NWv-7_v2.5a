import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(__file__))

from content_classes import (
    KNOWN_CONTENT_CLASSES,
    content_class_family,
    is_known_content_class,
    require_content_class,
)


def test_known_content_classes_cover_required_families():
    for cls in [
        "news_story",
        "insight_cluster",
        "upahead_event",
        "weather_forecast",
        "market_snapshot",
        "buzz_story",
        "following_topic_story",
    ]:
        assert cls in KNOWN_CONTENT_CLASSES
        assert is_known_content_class(cls)


def test_unknown_content_class_fails():
    with pytest.raises(ValueError):
        require_content_class("random_new_type")


def test_content_class_family():
    assert content_class_family("news_story") == "news"
    assert content_class_family("weather_forecast") == "utility"
    assert content_class_family("planner_item") == "actionable"
