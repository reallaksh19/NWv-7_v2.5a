import validate_sections_prefetch_output as gate

FETCHED_AT = 1767282000000
CUTOFF_AT = FETCHED_AT - gate.EXPECTED_RETAIN_HOURS * 60 * 60 * 1000


def make_story(index, section, source_group):
    return {
        "id": f"{section}-{index}",
        "title": f"{section} story {index}",
        "summary": "Summary",
        "url": f"https://example.com/{section}/{index}",
        "publishedAt": 1767278400000,
        "source": source_group,
        "sourceGroup": source_group,
    }


def make_base_snapshot(sections):
    return {
        "schemaVersion": 2,
        "contentHash": "abc",
        "fetchedAt": FETCHED_AT,
        "window": {
            "retainHours": gate.EXPECTED_RETAIN_HOURS,
            "cutoffAt": CUTOFF_AT,
        },
        "sectionQuality": {
            section: {
                "storyCount": len(items),
                "sourceGroupCount": len({item["sourceGroup"] for item in items}),
            }
            for section, items in sections.items()
        },
        "sections": sections,
    }


def make_required_sections(story_count=0, source_count=1):
    sections = {}
    for section in gate.REQUIRED_SECTIONS:
        sections[section] = [
            make_story(i, section, f"source_{i % source_count}")
            for i in range(story_count)
        ]
    return sections


def test_required_sections_include_muscat_and_ten_tabs():
    assert "muscat" in gate.REQUIRED_SECTIONS
    assert len(gate.REQUIRED_SECTIONS) == 10


def test_validate_sections_snapshot_warns_not_fails_for_thin_pool():
    sections = make_required_sections(story_count=0)
    sections["topStories"] = [
        make_story(1, "topStories", "a"),
        make_story(2, "topStories", "b"),
    ]
    report = gate.validate_sections_snapshot(make_base_snapshot(sections))
    assert report["status"] == "WARN"
    assert report["storyCount"] == 2
    assert report["sectionHealth"]["topStories"]["sourceGroupCount"] == 2
    assert not report["errors"]


def test_validate_sections_snapshot_fails_structural_errors():
    report = gate.validate_sections_snapshot({
        "schemaVersion": 99,
        "contentHash": "",
        "fetchedAt": 0,
        "sections": {},
    })

    assert report["status"] == "FAIL"
    assert report["errors"]


def test_validate_sections_snapshot_fails_missing_muscat():
    sections = make_required_sections(story_count=4, source_count=2)
    sections.pop("muscat")
    report = gate.validate_sections_snapshot(make_base_snapshot(sections))
    assert report["status"] == "FAIL"
    assert any("Missing required sections" in error and "muscat" in error for error in report["errors"])


def test_validate_sections_snapshot_fails_wrong_window():
    snapshot = make_base_snapshot(make_required_sections(story_count=4, source_count=2))
    snapshot["window"]["retainHours"] = 24
    report = gate.validate_sections_snapshot(snapshot)
    assert report["status"] == "FAIL"
    assert any("window.retainHours must be 36" in error for error in report["errors"])


def test_validate_sections_snapshot_passes_healthy_shape():
    sections = make_required_sections(story_count=6, source_count=3)
    report = gate.validate_sections_snapshot(make_base_snapshot(sections))
    assert report["status"] in ("PASS", "WARN")
    assert report["sectionCount"] == len(gate.REQUIRED_SECTIONS)
    assert report["storyCount"] >= 45
    assert report["sourceGroupCount"] >= 3
    assert not report["errors"]
    assert report["thresholds"]["expectedRetainHours"] == 36


def test_write_summary_creates_markdown(tmp_path, monkeypatch):
    report_path = tmp_path / "sections_quality_report.json"
    summary_path = tmp_path / "sections_quality_summary.md"

    monkeypatch.setattr(gate, "REPORT_PATH", report_path)
    monkeypatch.setattr(gate, "SUMMARY_PATH", summary_path)

    sections = make_required_sections(story_count=0)
    sections["topStories"] = [make_story(1, "topStories", "a")]
    report = gate.validate_sections_snapshot(make_base_snapshot(sections))

    gate.write_json(report_path, report)
    gate.write_summary(report)

    assert report_path.exists()
    assert summary_path.exists()
    text = summary_path.read_text()
    assert "Sections Prefetch Quality Report" in text
    assert "Retain hours" in text
    assert "muscat" in text
