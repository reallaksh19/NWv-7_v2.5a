# Insight ground-truth judge prompt — version `gtp-v1.0`

Part of the benchmark's reproducibility surface (plan §B2.3). Pin this version + the judge
model ID in every record's `provenance.judge`. Changing the prompt → bump the version.

Settings: **temperature 0**, batched. The judge sees **full title + summary + source + timestamp**
for the unit — strictly MORE context than the pipeline's TF-IDF gets (ground truth must be
stronger than the system under test). **Anti-leakage:** the judge is NEVER shown the pipeline's
own cluster/angle/score for the judged item. Every task requires **confidence ∈ [0,1]** and may
**abstain**; abstentions + confidence < 0.6 + a 5% audit sample → human adjudication.

## Task 1 — Same-event judgment (unit: pair)
> Given two news items (title, summary, source, timestamp), decide their relationship:
> - `same_event`: the same discrete real-world event/report (different wording allowed).
> - `related_not_same`: same topic/macro-event family but a distinct development, follow-up, or timepoint.
> - `unrelated`: no shared event.
> - `abstain`: insufficient text to decide.
> Output: `{label, confidence, reasoning}`. Base the decision on shared named entities + the
> specific action/development, not topical keyword overlap. Treat a >12h gap with a changed verb
> as evidence of `related_not_same`.

## Task 2 — Angle classification (unit: story within cluster context)
> Assign exactly one of the 12 angles: base_report, official_response, market_reaction,
> fact_update, expert_analysis, regional_followup, correction, background_context, reaction_public,
> investigative_detail, opinion_editorial, unknown. Label from the full text by identifying the
> story's PRIMARY function (who is the actor / what is the lead). `unknown` only when no angle fits.
> Output: `{angle, confidence, reasoning}`.

## Task 3 — Editorial importance (unit: cluster digest)
> Given a parent headline + child digest, assign a coarse bucket: `major` / `notable` / `minor`.
> Judge editorial significance to a national reader, NOT amplification (syndication count, virality,
> or freshness are NOT importance). Output: `{importance, confidence, reasoning}`.

## Reasoning requirement (all tasks)
`reasoning` must let a future engineer re-verify the label from the texts alone — cite the specific
entities/verbs/timestamps that drove it. A label without re-verifiable reasoning is not done.
