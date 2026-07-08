"""Build diagnostic tab-specific quality rankings.

Manual/diagnostic script only in Phase E. Workflow/dashboard/commit-policy wiring
is intentionally deferred to a later phase.
"""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from quality_ranking_model import IMPLEMENTED_DESTINATIONS, results_to_document, score_all_destinations

ROOT = Path(".")
UPAHEAD_PATH = ROOT / "public/data/up_ahead.json"
INSIGHT_PATH = ROOT / "public/newsdata/insight_latest.json"
SECTIONS_PATH = ROOT / "public/newsdata/sections_latest.json"
RANKINGS_JSON_PATH = ROOT / "public/newsdata/quality_rankings.json"
RANKINGS_MD_PATH = ROOT / "public/newsdata/quality_rankings.md"
RANKINGS_HISTORY_PATH = ROOT / "public/newsdata/quality_rankings_history.json"

LOCAL_TRAVEL_SECTIONS = {"muscat", "chennai", "trichy", "travel", "local"}
BUZZ_SECTIONS = {"technology", "tech", "entertainment", "sports", "travel", "local", "buzz"}


def read_json(path: Path, fallback: Any = None) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False, sort_keys=True), encoding="utf-8")


def extract_sections_items(snapshot: dict[str, Any], section_names: set[str]) -> list[dict[str, Any]]:
    sections = snapshot.get("sections") if isinstance(snapshot.get("sections"), dict) else {}
    items: list[dict[str, Any]] = []
    for section_name, section_payload in sections.items():
        if str(section_name).lower() not in section_names:
            continue
        stories = section_payload.get("stories") if isinstance(section_payload, dict) else []
        for story in stories or []:
            if isinstance(story, dict):
                items.append({**story, "section": section_name})
    # Some snapshots may expose a flat stories array instead of nested sections.
    if not items and isinstance(snapshot.get("stories"), list):
        for story in snapshot.get("stories") or []:
            if isinstance(story, dict):
                section = str(story.get("section") or story.get("category") or "").lower()
                if section in section_names:
                    items.append(story)
    return items


def extract_insight_candidates(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    sketches = snapshot.get("eventSketches") if isinstance(snapshot.get("eventSketches"), list) else []
    if sketches:
        return [item for item in sketches if isinstance(item, dict)]
    parents = snapshot.get("parents") if isinstance(snapshot.get("parents"), list) else []
    if parents:
        return [item for item in parents if isinstance(item, dict)]
    return []


def load_payloads() -> dict[str, dict[str, Any]]:
    upahead = read_json(UPAHEAD_PATH, {}) or {}
    insight = read_json(INSIGHT_PATH, {}) or {}
    sections = read_json(SECTIONS_PATH, {}) or {}

    return {
        "upAhead": {"upAheadItems": upahead.get("items", []) if isinstance(upahead, dict) else []},
        "insight": {"insightCandidates": extract_insight_candidates(insight if isinstance(insight, dict) else {})},
        "buzz": {"buzzItems": extract_sections_items(sections if isinstance(sections, dict) else {}, BUZZ_SECTIONS)},
        "localTravel": {"localTravelItems": extract_sections_items(sections if isinstance(sections, dict) else {}, LOCAL_TRAVEL_SECTIONS)},
    }


def append_history(document: dict[str, Any]) -> list[dict[str, Any]]:
    history = read_json(RANKINGS_HISTORY_PATH, [])
    if not isinstance(history, list):
        history = []
    summary = document.get("summary", {})
    row = {
        "generatedAt": document.get("generatedAt"),
        "overallScore": summary.get("overallScore", 0),
        "overallStatus": summary.get("overallStatus", "FAIL"),
        "destinationScores": summary.get("destinationScores", {}),
        "destinationStatuses": summary.get("destinationStatuses", {}),
    }
    history.append(row)
    return history[-60:]


def markdown_summary(document: dict[str, Any]) -> str:
    summary = document.get("summary", {})
    lines = [
        "# Quality Rankings",
        "",
        f"- Ranking version: `{document.get('rankingVersion')}`",
        f"- Overall status: **{summary.get('overallStatus', 'FAIL')}**",
        f"- Overall score: `{summary.get('overallScore', 0)}`",
        "",
        "## Destination scores",
        "",
        "| Destination | Status | Score | Profile | Ranked items |",
        "|---|---|---:|---|---:|",
    ]
    destinations = document.get("destinations", {})
    for name, payload in destinations.items():
        lines.append(
            f"| {name} | {payload.get('qualityStatus')} | {payload.get('qualityScore')} | "
            f"`{payload.get('rankingProfile')}` | {len(payload.get('rankedItems', []))} |"
        )
    findings = summary.get("actionRequired") or summary.get("topFindings") or []
    if findings:
        lines += ["", "## Findings", ""]
        lines += [f"- {item}" for item in findings[:20]]
    return "\n".join(lines) + "\n"


def build_quality_rankings(*, now_ms: int | None = None) -> dict[str, Any]:
    ts = int(now_ms if now_ms is not None else time.time() * 1000)
    payloads = load_payloads()
    results = score_all_destinations(payloads, now_ms=ts, destinations=IMPLEMENTED_DESTINATIONS)
    document = results_to_document(results, generated_at=ts)
    write_json(RANKINGS_JSON_PATH, document)
    RANKINGS_MD_PATH.parent.mkdir(parents=True, exist_ok=True)
    RANKINGS_MD_PATH.write_text(markdown_summary(document), encoding="utf-8")
    write_json(RANKINGS_HISTORY_PATH, append_history(document))
    return document


def main() -> int:
    document = build_quality_rankings()
    print(json.dumps({
        "status": document.get("summary", {}).get("overallStatus", "FAIL"),
        "overallScore": document.get("summary", {}).get("overallScore", 0),
        "destinations": list(document.get("destinations", {}).keys()),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
