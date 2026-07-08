"""Common contracts for tab-specific ranking and quality gates.

This module intentionally does not score any NW tab by itself. It provides a
stable output shape so Up Ahead, Buzz, Insight, Main, Weather, Market, Planner,
Following, and Newspaper can keep their own ranking concepts while exposing a
shared audit contract.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

GateStatus = Literal["PASS", "WARN", "FAIL"]
QualityStatus = Literal["PASS", "WARN", "FAIL"]


@dataclass(frozen=True)
class GateResult:
    """Result for one tab-specific gate.

    Examples:
      - Up Ahead lifecycle gate
      - Buzz trend velocity gate
      - Insight event coherence gate
    """

    name: str
    status: GateStatus
    score: float
    reason: str = ""
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status,
            "score": round(clamp_score(self.score), 4),
            "reason": self.reason,
            "details": dict(self.details),
        }


@dataclass(frozen=True)
class RankedItem:
    """A ranked item/card candidate for one tab.

    The item can be a story, event, offer, alert, cluster, or local/travel item.
    """

    item_id: str
    title: str
    score: float
    category: str = "unknown"
    location_key: str = "unknown"
    ranking_reasons: tuple[str, ...] = ()
    gates: tuple[GateResult, ...] = ()
    item: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.item_id,
            "title": self.title,
            "score": round(clamp_score(self.score), 4),
            "category": self.category,
            "locationKey": self.location_key,
            "rankingReasons": list(self.ranking_reasons),
            "gates": [gate.to_dict() for gate in self.gates],
            "item": dict(self.item),
        }


@dataclass(frozen=True)
class RankingResult:
    """Shared ranking result for a tab-specific ranker."""

    destination: str
    ranking_profile: str
    ranked_items: tuple[RankedItem, ...]
    gate_results: tuple[GateResult, ...] = ()
    score_breakdown: dict[str, float] = field(default_factory=dict)
    diagnostic_reasons: tuple[str, ...] = ()
    actionable_findings: tuple[str, ...] = ()
    gate_summary: dict[str, Any] = field(default_factory=dict)

    @property
    def quality_score(self) -> float:
        if self.score_breakdown:
            values = [clamp_score(value) for value in self.score_breakdown.values()]
            return round(sum(values) / max(1, len(values)), 4)
        if self.gate_results:
            values = [gate.score for gate in self.gate_results if gate.status != "FAIL"]
            return round(sum(values) / max(1, len(values)), 4)
        if self.ranked_items:
            return round(sum(item.score for item in self.ranked_items) / len(self.ranked_items), 4)
        return 0.0

    @property
    def quality_status(self) -> QualityStatus:
        if any(gate.status == "FAIL" for gate in self.gate_results):
            return "FAIL"
        if self.quality_score < 0.55:
            return "WARN"
        if any(gate.status == "WARN" for gate in self.gate_results):
            return "WARN"
        if self.diagnostic_reasons:
            return "WARN"
        return "PASS"

    @property
    def quality_grade(self) -> str:
        return grade_from_score(self.quality_score)

    def to_dict(self) -> dict[str, Any]:
        return {
            "destination": self.destination,
            "rankingProfile": self.ranking_profile,
            "qualityScore": round(clamp_score(self.quality_score), 4),
            "qualityGrade": self.quality_grade,
            "qualityStatus": self.quality_status,
            "scoreBreakdown": {key: round(clamp_score(value), 4) for key, value in self.score_breakdown.items()},
            "diagnosticReasons": list(self.diagnostic_reasons),
            "actionableFindings": list(self.actionable_findings),
            "gateSummary": dict(self.gate_summary),
            "gateResults": [gate.to_dict() for gate in self.gate_results],
            "rankedItems": [item.to_dict() for item in self.ranked_items],
        }


def clamp_score(value: Any) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    if number != number:  # NaN
        return 0.0
    return max(0.0, min(1.0, number))


def grade_from_score(score: float) -> str:
    value = clamp_score(score)
    if value >= 0.90:
        return "A"
    if value >= 0.80:
        return "B"
    if value >= 0.70:
        return "C"
    if value >= 0.55:
        return "D"
    return "F"


def weighted_score(parts: dict[str, float], weights: dict[str, float]) -> float:
    """Return normalized weighted score for named parts.

    Unknown part names are ignored. Missing parts score 0. Negative/NaN values are
    clamped. Weight sum of 0 returns 0.
    """
    total_weight = sum(max(0.0, float(weight)) for weight in weights.values())
    if total_weight <= 0:
        return 0.0
    total = 0.0
    for key, weight in weights.items():
        total += clamp_score(parts.get(key, 0.0)) * max(0.0, float(weight))
    return round(total / total_weight, 4)


def fail_gate(name: str, reason: str, **details: Any) -> GateResult:
    return GateResult(name=name, status="FAIL", score=0.0, reason=reason, details=details)


def warn_gate(name: str, score: float, reason: str, **details: Any) -> GateResult:
    return GateResult(name=name, status="WARN", score=score, reason=reason, details=details)


def pass_gate(name: str, score: float = 1.0, reason: str = "", **details: Any) -> GateResult:
    return GateResult(name=name, status="PASS", score=score, reason=reason, details=details)
