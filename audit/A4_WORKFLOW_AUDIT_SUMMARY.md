# Phase A4 (partial) — Workflow & Deploy Audit: Main-tab Hybrid emptiness

Date: 2026-06-22
Auditor role: Quality & Verification (no-fix). Scope this pass: the GitHub workflow
chain feeding BOTH Insight and Main/Sections (same RSS source), per the explicit
directive to investigate "Main tab not fetching any stories in Hybrid mode."

## Verdict: FAIL — root cause identified and reproduced by execution.

The reported symptom is **not** an Insight/Sections pipeline bug. The pipeline,
the prefetch fetcher, and the hybrid snapshot-selection code are all correct on
fresh data (control runs pass). The defect is in the **publish/deploy chain**, and
it degrades every snapshot-backed tab on the live site, not just Main.

## Causal chain (each link verified)

1. `news_prefetch.yml` fetches Insight + Sections data and commits it to `main`
   ~hourly, as `github-actions[bot]` using the built-in `GITHUB_TOKEN`
   (workflow lines 198–222). Run history: 337 runs, latest data commit
   `2026-06-22T13:13Z`. ✔ verified (Actions API + git log).
2. GitHub does not raise push/workflow-trigger events for commits pushed with
   `GITHUB_TOKEN` (recursion guard). So `deploy.yml` (`on: push` to main) never
   fires for those data commits. ✔ documented GitHub behavior, consistent with (3).
3. `deploy.yml` last ran **2026-06-12T10:31Z** and not since; no human (non-bot)
   commit to `main` since 2026-06-12. ✔ verified (Actions API + git log).
4. The live GitHub Pages artifact is therefore frozen at 2026-06-12. Live fetch of
   `…/newsdata/sections_latest.json` returns `fetchedAt 2026-06-12T06:12Z`,
   `contentHash 92bee8cd0344` — a different, 10.4-day-old file than repo HEAD
   (`5a6820ccd64f`, `2026-06-22T13:11Z`). ✔ verified (WebFetch).
5. In Hybrid mode (the default) on a static host, the 12h snapshot-staleness and
   36h item-freshness gates reject every row, and `allowWideFeedFetch=false` blocks
   live RSS fallback → 0 items/section. Reproduced by aging the snapshot to the
   deployed condition: world/india/chennai/trichy/local all return **0** items
   (control on fresh snapshot: **15** each). ✔ verified (headless run).
6. `sectionsDataset` then emits `ok=false / freshness=EMPTY`; Main renders
   `DataStateBoundary`'s empty state → "No updates available." ✔ traced in code.

The header comment in `news_prefetch.yml` (lines 16–18) — *"Publishing to GitHub
Pages is handled by deploy.yml, which fires automatically when the data commit
lands on main"* — is the false assumption that masks this; it does not fire.

## Scope of impact (why "all use the same source" matters)

Insight, Market, Weather, Up Ahead, Newspaper and Breaking are all published the
same way (bot commit → no deploy trigger). All are frozen at 2026-06-12 on the live
site. Main is simply where the user noticed first. Insight's gate is stricter (8h),
so it empties even sooner.

## Findings logged
- **I001 (Critical)** — deploy pipeline never triggered by prefetch commits. Evidence: `audit/evidence/A4.1-DEPLOY-01.yaml`.
- **I002 (High)** — Hybrid/static Main empties silently on stale snapshot (no live fallback). Evidence: `audit/evidence/A4.2-SECTIONS-02.yaml`.
- **I003 (Low, OBSERVATION)** — scheduled prefetch cadence appears well below the cron target; needs the full 14-day reliability table before ticketing.

## Remediation directions (NOT applied — auditor role)
Any one of: push data commits with a PAT/deploy key (so the push triggers
workflows); add a `workflow_run` trigger to `deploy.yml` keyed on `news_prefetch`
completion; or have `news_prefetch.yml` dispatch deploy via
`repository_dispatch` / `gh workflow run`. Plus a post-deploy live-freshness probe
cert so this regression is caught automatically (B4 cannot see the deployed artifact).

## Gate status
This is Phase A4 territory, whose entry gate is "A0 done." A0 has not been formally
executed, so this pass is scoped to the user-directed symptom and is **not** a
complete A4. The remaining A4 items (14-day reliability table, smart-TTL merge
correctness, 36h pruning boundary, dead-feed detection, validator strictness)
remain open.
