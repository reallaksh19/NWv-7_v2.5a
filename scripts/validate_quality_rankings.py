"""Validate public/newsdata/quality_rankings.json.

Standalone validator for the manual diagnostic artifact introduced in Ranking
Phase E. Workflow/dashboard wiring is intentionally deferred.
"""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

RANKINGS_PATH = Path("public/newsdata/quality_rankings.json")
REPORT_PATH = Path("public/newsdata/quality_rankings_validation_report.json")

EXPECTED_SCHEMA_VERSION = 1
EXPECTED_RANKING_VERSION = "tab-specific-quality-ranking-v1"

IMPLEMENTED_DESTINATIONS = ("upAhead", "buzz", "localTravel", "insight")
EXPECTED_PROFILES = {
    "upAhead": "upAhead-v2-lifecycle-location-category",
    "buzz": "buzz-v2-trend-local-travel",
    "localTravel": "localTravel-v1-location-utility-disruption",
    "insight": "insight-v2-event-angle-tree",
}
REQUIRED_BREAKDOWN_KEYS = {
    "upAhead": {
        "lifecycleScore",
        "locationScore",
        "actionabilityScore",
        "categoryPriorityScore",
        "sourceConfidenceScore",
        "urgencyOrExpiryScore",
        "plannerFitScore",
    },
    "buzz": {
        "trendVelocityScore",
        "noveltyScore",
        "sourceSpreadScore",
        "freshnessScore",
        "categoryFitScore",
        "localTravelBoost",
        "visualSocialSignal",
    },
    "localTravel": {
        "locationPrecision",
        "utilityScore",
        "recencyScore",
        "authorityScore",
        "disruptionSeverity",
        "familyRelevance",
        "sourceDiversity",
    },
    "insight": {
        "eventImportanceScore",
        "sourceAuthorityScore",
        "sourceDiversityScore",
        "angleDiversityScore",
        "temporalEvolutionScore",
        "noveltyDeltaScore",
        "freshnessScore",
    },
}
REQUIRED_DESTINATION_FIELDS = {
    "destination",
    "rankingProfile",
    "qualityScore",
    "qualityGrade",
    "qualityStatus",
    "scoreBreakdown",
    "diagnosticReasons",
    "actionableFindings",
    "gateSummary",
    "gateResults",
    "rankedItems",
}
ALLOWED_STATUSES = {"PASS", "WARN", "FAIL"}
ALLOWED_GRADES = {"A", "B", "C", "D", "F"}


def read_json(path: Path, fallback: Any = None) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False, sort_keys=True), encoding="utf-8")


def _score(value: Any) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if parsed != parsed:
        return None
    return parsed


def validate_quality_rankings_document(document: dict[str, Any], *, now_ms: int | None = None) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    ts = int(now_ms if now_ms is not None else time.time() * 1000)

    if not isinstance(document, dict):
        return {
            "status": "FAIL",
            "generatedAt": ts,
            "errors": ["quality_rankings document is not an object"],
            "warnings": [],
        }

    if document.get("schemaVersion") != EXPECTED_SCHEMA_VERSION:
        errors.append(f"schemaVersion must be {EXPECTED_SCHEMA_VERSION}")
    if document.get("rankingVersion") != EXPECTED_RANKING_VERSION:
        errors.append(f"rankingVersion must be {EXPECTED_RANKING_VERSION}")
    if not int(document.get("generatedAt") or 0):
        errors.append("generatedAt is missing or zero")

    summary = document.get("summary") if isinstance(document.get("summary"), dict) else None
    destinations = document.get("destinations") if isinstance(document.get("destinations"), dict) else None
    implemented = document.get("implementedDestinations") if isinstance(document.get("implementedDestinations"), list) else []
    pending = document.get("pendingDestinations") if isinstance(document.get("pendingDestinations"), list) else []

    if summary is None:
        errors.append("summary object is missing")
    if destinations is None:
        errors.append("destinations object is missing")
        destinations = {}

    for destination in IMPLEMENTED_DESTINATIONS:
        if destination not in implemented:
            errors.append(f"implementedDestinations missing {destination}")
        if destination not in destinations:
            errors.append(f"destinations missing implemented destination {destination}")
            continue
        _validate_destination(destination, destinations[destination], errors, warnings)

    for destination in IMPLEMENTED_DESTINATIONS:
        if destination in pending:
            errors.append(f"implemented destination {destination} must not be listed as pending")

    if summary is not None:
        _validate_summary(summary, destinations, errors, warnings)

    status = "FAIL" if errors else "WARN" if warnings else "PASS"
    return {
        "status": status,
        "generatedAt": ts,
        "schemaVersion": document.get("schemaVersion"),
        "rankingVersion": document.get("rankingVersion"),
        "destinationCount": len(destinations or {}),
        "implementedDestinations": implemented,
        "pendingDestinations": pending,
        "errors": errors,
        "warnings": warnings,
    }


def _validate_destination(destination: str, payload: Any, errors: list[str], warnings: list[str]) -> None:
    if not isinstance(payload, dict):
        errors.append(f"{destination}: destination payload must be an object")
        return

    missing = sorted(REQUIRED_DESTINATION_FIELDS - set(payload.keys()))
    if missing:
        errors.append(f"{destination}: missing destination fields {missing}")

    if payload.get("destination") != destination:
        errors.append(f"{destination}: destination field mismatch")

    expected_profile = EXPECTED_PROFILES[destination]
    if payload.get("rankingProfile") != expected_profile:
        errors.append(f"{destination}: rankingProfile must be {expected_profile}")
    if str(payload.get("rankingProfile") or "").endswith("pending-tab-specific-ranker"):
        errors.append(f"{destination}: implemented destination cannot use pending/generic ranker profile")

    quality_score = _score(payload.get("qualityScore"))
    if quality_score is None or not 0 <= quality_score <= 1:
        errors.append(f"{destination}: qualityScore must be in [0,1]")

    if payload.get("qualityStatus") not in ALLOWED_STATUSES:
        errors.append(f"{destination}: qualityStatus must be PASS/WARN/FAIL")
    if payload.get("qualityGrade") not in ALLOWED_GRADES:
        errors.append(f"{destination}: qualityGrade must be A/B/C/D/F")

    breakdown = payload.get("scoreBreakdown") if isinstance(payload.get("scoreBreakdown"), dict) else None
    if breakdown is None:
        errors.append(f"{destination}: scoreBreakdown must be an object")
    else:
        missing_keys = sorted(REQUIRED_BREAKDOWN_KEYS[destination] - set(breakdown.keys()))
        if missing_keys:
            errors.append(f"{destination}: missing tab-specific scoreBreakdown keys {missing_keys}")
        for key, value in breakdown.items():
            score = _score(value)
            if score is None or not 0 <= score <= 1:
                errors.append(f"{destination}: scoreBreakdown.{key} must be in [0,1]")

    for list_key in ("diagnosticReasons", "actionableFindings", "gateResults", "rankedItems"):
        if not isinstance(payload.get(list_key), list):
            errors.append(f"{destination}: {list_key} must be a list")

    if not isinstance(payload.get("gateSummary"), dict):
        errors.append(f"{destination}: gateSummary must be an object")

    ranked_items = payload.get("rankedItems") if isinstance(payload.get("rankedItems"), list) else []
    if payload.get("qualityStatus") == "PASS" and not ranked_items:
        errors.append(f"{destination}: PASS destination cannot have empty rankedItems")
    if not ranked_items:
        warnings.append(f"{destination}: rankedItems is empty")


def _validate_summary(summary: dict[str, Any], destinations: dict[str, Any], errors: list[str], warnings: list[str]) -> None:
    for key in ("overallScore", "overallStatus", "destinationScores", "destinationStatuses", "rankingProfiles"):
        if key not in summary:
            errors.append(f"summary missing {key}")

    overall_score = _score(summary.get("overallScore"))
    if overall_score is None or not 0 <= overall_score <= 1:
        errors.append("summary.overallScore must be in [0,1]")
    if summary.get("overallStatus") not in ALLOWED_STATUSES:
        errors.append("summary.overallStatus must be PASS/WARN/FAIL")

    destination_scores = summary.get("destinationScores") if isinstance(summary.get("destinationScores"), dict) else {}
    destination_statuses = summary.get("destinationStatuses") if isinstance(summary.get("destinationStatuses"), dict) else {}
    ranking_profiles = summary.get("rankingProfiles") if isinstance(summary.get("rankingProfiles"), dict) else {}

    for destination in IMPLEMENTED_DESTINATIONS:
        if destination not in destination_scores:
            errors.append(f"summary.destinationScores missing {destination}")
        if destination not in destination_statuses:
            errors.append(f"summary.destinationStatuses missing {destination}")
        if ranking_profiles.get(destination) != EXPECTED_PROFILES[destination]:
            errors.append(f"summary.rankingProfiles.{destination} must be {EXPECTED_PROFILES[destination]}")

    if set(destinations.keys()) != set(destination_scores.keys()):
        warnings.append("summary.destinationScores keys differ from destinations keys")


def main() -> int:
    document = read_json(RANKINGS_PATH, {})
    report = validate_quality_rankings_document(document)
    write_json(REPORT_PATH, report)
    print(json.dumps({
        "status": report["status"],
        "destinationCount": report.get("destinationCount", 0),
        "errors": report["errors"],
        "warnings": report["warnings"],
    }, indent=2))
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
