import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from ranking_gates import location_gate


def test_location_gate_keeps_match_score_in_details_without_duplicate_score_kwarg():
    gate = location_gate(
        {
            "title": "Chennai weekend food festival",
            "location": "Chennai",
            "category": "events",
        },
        ["chennai", "muscat"],
    )

    assert gate.status == "PASS"
    assert gate.score == 1.0
    assert gate.details["matchScore"] == 1.0
    assert "score" not in gate.details


def test_location_gate_online_warning_keeps_match_score():
    gate = location_gate(
        {
            "title": "Online travel app sale",
            "category": "shopping",
        },
        ["chennai", "muscat"],
    )

    assert gate.status == "WARN"
    assert gate.score == 0.72
    assert gate.details["matchScore"] == 0.72
    assert "score" not in gate.details
