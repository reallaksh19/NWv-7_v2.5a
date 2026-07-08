from __future__ import annotations

from typing import Any


def _clean_mapping(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def _clean_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def build_static_envelope(
    *,
    schema_version: int,
    collector_version: str,
    generated_at: int,
    fetched_at: int | None = None,
    content_hash: str | None = None,
    window: dict | None = None,
    horizon: dict | None = None,
    quality_gate: dict | None = None,
    provider_mix: dict | None = None,
    source_group_mix: dict | None = None,
    freshness: dict | None = None,
    source_ledger: list | None = None,
    warnings: list | None = None,
    errors: list | None = None,
) -> dict[str, Any]:
    envelope: dict[str, Any] = {
        "schemaVersion": int(schema_version),
        "collectorVersion": str(collector_version),
        "generatedAt": int(generated_at),
        "fetchedAt": int(fetched_at if fetched_at is not None else generated_at),
        "qualityGate": _clean_mapping(quality_gate) or {"status": "UNKNOWN", "errors": [], "warnings": []},
        "providerMix": _clean_mapping(provider_mix),
        "sourceGroupMix": _clean_mapping(source_group_mix),
        "freshness": _clean_mapping(freshness),
        "sourceLedger": _clean_list(source_ledger),
        "warnings": _clean_list(warnings),
        "errors": _clean_list(errors),
    }
    if content_hash is not None:
        envelope["contentHash"] = str(content_hash)
    if window is not None:
        envelope["window"] = _clean_mapping(window)
    if horizon is not None:
        envelope["horizon"] = _clean_mapping(horizon)
    return envelope


def merge_static_envelope(payload: dict[str, Any], envelope: dict[str, Any]) -> dict[str, Any]:
    merged = dict(payload or {})
    merged.update(envelope or {})
    return merged


def validate_static_envelope(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return ["payload_not_object"]
    if not isinstance(payload.get("schemaVersion"), int):
        errors.append("schemaVersion_missing_or_not_int")
    if not payload.get("collectorVersion"):
        errors.append("collectorVersion_missing")
    if not isinstance(payload.get("generatedAt"), int):
        errors.append("generatedAt_missing_or_not_int")
    if "sourceLedger" in payload and not isinstance(payload.get("sourceLedger"), list):
        errors.append("sourceLedger_not_list")
    if "providerMix" in payload and not isinstance(payload.get("providerMix"), dict):
        errors.append("providerMix_not_object")
    return errors
