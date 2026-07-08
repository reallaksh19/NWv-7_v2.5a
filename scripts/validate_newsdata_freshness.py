"""Validate generated newsdata freshness after prefetch.

This is a hard workflow gate: if fetchers silently preserve stale JSON, the
workflow should fail before ranking/dashboard/commit so the app does not serve
old news as if the run succeeded.
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

NEWS_DIR = Path("public/newsdata")
INSIGHT_PATH = NEWS_DIR / "insight_latest.json"
SECTIONS_PATH = NEWS_DIR / "sections_latest.json"
REPORT_PATH = NEWS_DIR / "newsdata_freshness_report.json"
SUMMARY_PATH = NEWS_DIR / "newsdata_freshness_summary.md"

DEFAULT_MAX_AGE_HOURS = 6
DEFAULT_MAX_FUTURE_SKEW_MINUTES = 10


def read_json(path: Path, fallback: Any = None) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False, sort_keys=True), encoding="utf-8")


def to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def story_count_for_snapshot(name: str, snapshot: dict[str, Any]) -> int:
    if name == "insight":
        stories = snapshot.get("stories")
        return len(stories) if isinstance(stories, list) else 0

    sections = snapshot.get("sections")
    if isinstance(sections, dict):
        return sum(len(items) for items in sections.values() if isinstance(items, list))
    if isinstance(sections, list):
        return len(sections)
    stories = snapshot.get("stories")
    return len(stories) if isinstance(stories, list) else 0


def validate_snapshot_freshness(
    *,
    name: str,
    path: Path,
    snapshot: Any,
    now_ms: int,
    max_age_ms: int,
    max_future_skew_ms: int,
) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    if not isinstance(snapshot, dict):
        return {
            "name": name,
            "path": str(path),
            "status": "FAIL",
            "fetchedAt": 0,
            "ageMs": None,
            "ageHours": None,
            "storyCount": 0,
            "contentHash": "",
            "errors": [f"{path} is missing or not valid JSON"],
            "warnings": [],
        }

    fetched_at = to_int(snapshot.get("fetchedAt"), 0)
    story_count = story_count_for_snapshot(name, snapshot)
    age_ms = now_ms - fetched_at if fetched_at else None
    age_hours = round(age_ms / 3_600_000, 2) if age_ms is not None else None

    if fetched_at <= 0:
        errors.append(f"{name}: fetchedAt is missing or zero")
    elif fetched_at > now_ms + max_future_skew_ms:
        errors.append(f"{name}: fetchedAt is in the future beyond allowed skew")
    elif age_ms is not None and age_ms > max_age_ms:
        errors.append(
            f"{name}: stale fetchedAt age {age_hours}h exceeds max {round(max_age_ms / 3_600_000, 2)}h"
        )

    if story_count <= 0:
        errors.append(f"{name}: generated story pool is empty")
    elif story_count < 5:
        warnings.append(f"{name}: generated story pool is very thin: {story_count}")

    status = "FAIL" if errors else "WARN" if warnings else "PASS"
    return {
        "name": name,
        "path": str(path),
        "status": status,
        "fetchedAt": fetched_at,
        "ageMs": age_ms,
        "ageHours": age_hours,
        "storyCount": story_count,
        "contentHash": snapshot.get("contentHash", ""),
        "errors": errors,
        "warnings": warnings,
    }


def validate_newsdata_freshness(
    insight_snapshot: Any,
    sections_snapshot: Any,
    *,
    now_ms: int | None = None,
    max_age_hours: float = DEFAULT_MAX_AGE_HOURS,
    max_future_skew_minutes: float = DEFAULT_MAX_FUTURE_SKEW_MINUTES,
) -> dict[str, Any]:
    now = int(now_ms if now_ms is not None else time.time() * 1000)
    max_age_ms = int(max_age_hours * 3_600_000)
    max_future_skew_ms = int(max_future_skew_minutes * 60_000)

    checks = [
        validate_snapshot_freshness(
            name="insight",
            path=INSIGHT_PATH,
            snapshot=insight_snapshot,
            now_ms=now,
            max_age_ms=max_age_ms,
            max_future_skew_ms=max_future_skew_ms,
        ),
        validate_snapshot_freshness(
            name="sections",
            path=SECTIONS_PATH,
            snapshot=sections_snapshot,
            now_ms=now,
            max_age_ms=max_age_ms,
            max_future_skew_ms=max_future_skew_ms,
        ),
    ]

    errors = [error for check in checks for error in check["errors"]]
    warnings = [warning for check in checks for warning in check["warnings"]]
    status = "FAIL" if errors else "WARN" if warnings else "PASS"

    return {
        "schemaVersion": 1,
        "status": status,
        "generatedAt": now,
        "thresholds": {
            "maxAgeHours": max_age_hours,
            "maxFutureSkewMinutes": max_future_skew_minutes,
        },
        "checks": checks,
        "errors": errors,
        "warnings": warnings,
    }


def write_summary(report: dict[str, Any]) -> None:
    lines = [
        "# Newsdata Freshness Report",
        "",
        f"- Status: **{report['status']}**",
        f"- Max age hours: `{report['thresholds']['maxAgeHours']}`",
        f"- Max future skew minutes: `{report['thresholds']['maxFutureSkewMinutes']}`",
        "",
        "| Snapshot | Status | Age h | Stories | fetchedAt |",
        "|---|---|---:|---:|---:|",
    ]
    for check in report["checks"]:
        lines.append(
            f"| {check['name']} | {check['status']} | {check.get('ageHours')} | "
            f"{check.get('storyCount', 0)} | {check.get('fetchedAt', 0)} |"
        )
    if report["errors"]:
        lines += ["", "## Errors", ""] + [f"- {item}" for item in report["errors"]]
    if report["warnings"]:
        lines += ["", "## Warnings", ""] + [f"- {item}" for item in report["warnings"]]
    SUMMARY_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    max_age_hours = float(os.environ.get("NEWS_FRESHNESS_MAX_AGE_HOURS", DEFAULT_MAX_AGE_HOURS))
    max_future_skew_minutes = float(
        os.environ.get("NEWS_FRESHNESS_MAX_FUTURE_SKEW_MINUTES", DEFAULT_MAX_FUTURE_SKEW_MINUTES)
    )
    report = validate_newsdata_freshness(
        read_json(INSIGHT_PATH, None),
        read_json(SECTIONS_PATH, None),
        max_age_hours=max_age_hours,
        max_future_skew_minutes=max_future_skew_minutes,
    )
    write_json(REPORT_PATH, report)
    write_summary(report)
    print(json.dumps({
        "status": report["status"],
        "errors": report["errors"],
        "warnings": report["warnings"],
    }, indent=2))
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
