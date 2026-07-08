import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from static_json_contract import (
    build_static_envelope,
    merge_static_envelope,
    validate_static_envelope,
)


def test_build_static_envelope_defaults_are_additive():
    env = build_static_envelope(
        schema_version=2,
        collector_version="sections-collector-v2.1",
        generated_at=123,
    )
    assert env["schemaVersion"] == 2
    assert env["collectorVersion"] == "sections-collector-v2.1"
    assert env["generatedAt"] == 123
    assert env["fetchedAt"] == 123
    assert env["providerMix"] == {}
    assert env["sourceLedger"] == []
    assert env["qualityGate"]["status"] == "UNKNOWN"


def test_merge_static_envelope_preserves_destination_payload():
    payload = {"schemaVersion": 2, "sections": {"world": []}}
    env = build_static_envelope(
        schema_version=2,
        collector_version="sections-collector-v2.1",
        generated_at=123,
        window={"retainHours": 36},
    )
    merged = merge_static_envelope(payload, env)
    assert merged["sections"] == {"world": []}
    assert merged["window"]["retainHours"] == 36
    assert merged["schemaVersion"] == 2


def test_validate_static_envelope():
    assert validate_static_envelope({"schemaVersion": "2"}) == [
        "schemaVersion_missing_or_not_int",
        "collectorVersion_missing",
        "generatedAt_missing_or_not_int",
    ]
