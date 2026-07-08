"""Tests for the destination contract audit.

These double as standing guardrails for the NWv-7 reconciliation decisions:
they fail if anyone forks an existing snapshot into a parallel *_latest.json,
drops a bottom-nav destination from the contract registry, or breaks the
staged-output matcher used by the G3 staging gate.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from audit_destination_contracts import (
    DESTINATION_REGISTRY,
    audit,
    detect_nav,
    detect_routes,
    render_markdown,
    staged_match,
)


def test_staged_match_exact_path():
    assert staged_match("public/data/up_ahead.json", ["public/data/up_ahead.json"])


def test_staged_match_directory_prefix():
    assert staged_match("public/data/planner_latest.json", ["public/data/"])


def test_staged_match_glob():
    assert staged_match("public/data/travel-local-muscat.json", ["public/data/travel-local-*.json"])


def test_staged_match_negative():
    assert not staged_match(
        "public/newsdata/quality_dashboard.json",
        ["public/newsdata/sections_latest.json", "public/newsdata/insight_latest.json"],
    )


def test_routes_and_nav_detected():
    routes = detect_routes()
    nav = detect_nav()
    assert "/" in routes and "/insight" in routes and "/tech-social" in routes
    assert len(nav) >= 10
    assert any(n["label"] == "Buzz" and n["path"] == "/tech-social" for n in nav)


def test_every_nav_destination_has_a_contract():
    nav_paths = {n["path"] for n in detect_nav()}
    contract_routes = {d["route"] for d in DESTINATION_REGISTRY}
    missing = nav_paths - contract_routes
    assert not missing, f"bottom-nav destinations with no contract: {missing}"


FORK_BLOCKLIST = {
    "weather_latest.json",
    "market_latest.json",
    "newspaper_latest.json",
    "data_health_dashboard.json",
    "buzz_latest.json",
}


def test_no_forked_latest_siblings():
    for d in DESTINATION_REGISTRY:
        for j in d["expectedStaticJson"]:
            leaf = j.split("/")[-1]
            assert leaf not in FORK_BLOCKLIST, (
                f"{d['destination']} forks {leaf} — enrich the existing snapshot instead"
            )


def test_migrated_destinations_have_static_json():
    for d in DESTINATION_REGISTRY:
        if d["migrationStatus"] == "MIGRATED":
            assert d["expectedStaticJson"], f"{d['destination']} MIGRATED but has no static JSON"


def test_no_greenfield_destinations():
    not_migrated = [d["destination"] for d in DESTINATION_REGISTRY if d["migrationStatus"] == "NOT_MIGRATED"]
    assert not_migrated == [], f"expected zero greenfield destinations, got {not_migrated}"


def test_buzz_is_derived_from_sections_without_new_json():
    buzz = next(d for d in DESTINATION_REGISTRY if d["destination"] == "Buzz")
    assert buzz["migrationStatus"] == "DERIVED"
    assert buzz["expectedStaticJson"] == ["public/newsdata/sections_latest.json"]
    assert buzz["producers"] == ["scripts/fetch_sections_stories.py"]
    assert buzz["workflows"] == ["news_prefetch.yml"]
    assert buzz["validators"] == ["scripts/validate_sections_prefetch_output.py"]
    assert not any(path.endswith("buzz_latest.json") for path in buzz["expectedStaticJson"])


def test_audit_shape_and_invariants():
    data = audit()
    assert data["schemaVersion"] == 1
    assert data["summary"]["contractsDefined"] == len(DESTINATION_REGISTRY)
    assert data["errors"] == []
    weather = next(d for d in data["destinations"] if d["destination"] == "Weather")
    assert weather["migrationStatus"] == "MIGRATED"
    assert any(p["path"].endswith("weather_snapshot.json") for p in weather["staticPresent"])
    assert weather["staticMissing"] == []
    buzz = next(d for d in data["destinations"] if d["destination"] == "Buzz")
    assert buzz["migrationStatus"] == "DERIVED"
    assert any(p["path"].endswith("sections_latest.json") for p in buzz["staticPresent"])


def test_audit_reports_sections_retain_gap_mechanism():
    gap = audit()["summary"]["sectionsRetainGap"]
    assert gap is not None
    assert set(gap) >= {"collectorRetainHours", "adapterMaxAgeHours", "gap"}
    if gap["adapterMaxAgeHours"] > gap["collectorRetainHours"]:
        assert gap["gap"] is True


def test_markdown_renders_matrix():
    md = render_markdown(audit())
    assert "# NWv-7 — Destination Contract Baseline" in md
    assert "## Destination matrix" in md
    assert "Buzz" in md and "DERIVED" in md
    assert "sections_latest.json" in md
