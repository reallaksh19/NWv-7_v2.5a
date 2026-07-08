import os
import sys

SCRIPT_DIR = os.path.dirname(__file__)
sys.path.insert(0, SCRIPT_DIR)

from validate_quality_rankings import validate_quality_rankings_document

NOW = 1_000_000_000_000


def destination(name, profile, breakdown, ranked=True, status="PASS"):
    return {
        "destination": name,
        "rankingProfile": profile,
        "qualityScore": 0.82,
        "qualityGrade": "B",
        "qualityStatus": status,
        "scoreBreakdown": breakdown,
        "diagnosticReasons": [],
        "actionableFindings": [],
        "gateSummary": {"rankedItemCount": 1 if ranked else 0},
        "gateResults": [],
        "rankedItems": [{"id": f"{name}-1", "score": 0.8}] if ranked else [],
    }


def valid_document():
    destinations = {
        "upAhead": destination("upAhead", "upAhead-v2-lifecycle-location-category", {
            "lifecycleScore": 0.9,
            "locationScore": 0.8,
            "actionabilityScore": 0.8,
            "categoryPriorityScore": 0.7,
            "sourceConfidenceScore": 0.8,
            "urgencyOrExpiryScore": 0.7,
            "plannerFitScore": 0.5,
        }),
        "buzz": destination("buzz", "buzz-v2-trend-local-travel", {
            "trendVelocityScore": 0.8,
            "noveltyScore": 0.8,
            "sourceSpreadScore": 0.8,
            "freshnessScore": 0.8,
            "categoryFitScore": 0.8,
            "localTravelBoost": 0.7,
            "visualSocialSignal": 0.7,
        }),
        "localTravel": destination("localTravel", "localTravel-v1-location-utility-disruption", {
            "locationPrecision": 0.9,
            "utilityScore": 0.8,
            "recencyScore": 0.8,
            "authorityScore": 0.8,
            "disruptionSeverity": 0.7,
            "familyRelevance": 0.5,
            "sourceDiversity": 0.7,
        }),
        "insight": destination("insight", "insight-v2-event-angle-tree", {
            "eventImportanceScore": 0.8,
            "sourceAuthorityScore": 0.8,
            "sourceDiversityScore": 0.8,
            "angleDiversityScore": 0.9,
            "temporalEvolutionScore": 0.7,
            "noveltyDeltaScore": 0.7,
            "freshnessScore": 0.8,
        }),
    }
    return {
        "schemaVersion": 1,
        "rankingVersion": "tab-specific-quality-ranking-v1",
        "generatedAt": NOW,
        "summary": {
            "overallScore": 0.82,
            "overallStatus": "PASS",
            "destinationScores": {key: value["qualityScore"] for key, value in destinations.items()},
            "destinationStatuses": {key: value["qualityStatus"] for key, value in destinations.items()},
            "rankingProfiles": {key: value["rankingProfile"] for key, value in destinations.items()},
        },
        "destinations": destinations,
        "implementedDestinations": ["upAhead", "buzz", "localTravel", "insight"],
        "pendingDestinations": ["main", "weather", "market", "planner", "newspaper", "following"],
    }


def test_valid_document_passes():
    report = validate_quality_rankings_document(valid_document(), now_ms=NOW)
    assert report["status"] == "PASS"
    assert not report["errors"]


def test_missing_implemented_destination_fails():
    doc = valid_document()
    doc["destinations"].pop("insight")
    report = validate_quality_rankings_document(doc, now_ms=NOW)
    assert report["status"] == "FAIL"
    assert any("destinations missing implemented destination insight" in error for error in report["errors"])


def test_wrong_profile_fails_generic_regression():
    doc = valid_document()
    doc["destinations"]["upAhead"]["rankingProfile"] = "generic-news-quality"
    doc["summary"]["rankingProfiles"]["upAhead"] = "generic-news-quality"
    report = validate_quality_rankings_document(doc, now_ms=NOW)
    assert report["status"] == "FAIL"
    assert any("upAhead: rankingProfile" in error for error in report["errors"])


def test_pending_profile_on_implemented_destination_fails():
    doc = valid_document()
    doc["destinations"]["buzz"]["rankingProfile"] = "buzz-pending-tab-specific-ranker"
    report = validate_quality_rankings_document(doc, now_ms=NOW)
    assert report["status"] == "FAIL"
    assert any("pending/generic ranker" in error for error in report["errors"])


def test_missing_tab_specific_breakdown_keys_fail():
    doc = valid_document()
    doc["destinations"]["insight"]["scoreBreakdown"].pop("angleDiversityScore")
    report = validate_quality_rankings_document(doc, now_ms=NOW)
    assert report["status"] == "FAIL"
    assert any("angleDiversityScore" in error for error in report["errors"])


def test_score_out_of_range_fails():
    doc = valid_document()
    doc["destinations"]["localTravel"]["scoreBreakdown"]["recencyScore"] = 2
    report = validate_quality_rankings_document(doc, now_ms=NOW)
    assert report["status"] == "FAIL"
    assert any("recencyScore" in error for error in report["errors"])


def test_empty_ranked_items_warn_when_not_pass():
    doc = valid_document()
    doc["destinations"]["buzz"] = destination("buzz", "buzz-v2-trend-local-travel", doc["destinations"]["buzz"]["scoreBreakdown"], ranked=False, status="WARN")
    doc["summary"]["destinationStatuses"]["buzz"] = "WARN"
    report = validate_quality_rankings_document(doc, now_ms=NOW)
    assert report["status"] == "WARN"
    assert any("buzz: rankedItems is empty" in warning for warning in report["warnings"])


def test_pass_with_empty_ranked_items_fails():
    doc = valid_document()
    doc["destinations"]["buzz"] = destination("buzz", "buzz-v2-trend-local-travel", doc["destinations"]["buzz"]["scoreBreakdown"], ranked=False, status="PASS")
    report = validate_quality_rankings_document(doc, now_ms=NOW)
    assert report["status"] == "FAIL"
    assert any("PASS destination cannot have empty rankedItems" in error for error in report["errors"])
