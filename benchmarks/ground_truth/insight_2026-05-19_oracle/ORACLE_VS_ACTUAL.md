# Oracle (ideal) vs Actual (pipeline) — real snapshot insight_2026-05-19

Oracle: **claude-opus-4-8 (uncalibrated)** · NONE — single uncalibrated LLM oracle. Numbers are INDICATIVE, not certified (no human kappa).
Corpus: `public/newsdata/insight_2026-05-19.json` (sha256 ade1430dd96bb5f1); scope: top-10 clusters / 21 stories.

## Headline (real-data accuracy, INDICATIVE)
| Metric | Oracle-vs-Actual | Note |
|---|---|---|
| Clustering precision | **0.917** (11/12 merged pairs) | 1 false merge(s) |
| Angle accuracy | **0.619** (13/21) | pipeline keyword classifier vs ideal |
| Ranking: minor in top-3 | **0** → PASS | |
| Majors outside top-5 | 1 | US DOJ drops fraud case against Gautam Adani (rank 8) |

## False merges (clustering precision)
- `cluster_267_e47a6177319a3483` — US Russian-oil sanctions waiver (CONTRADICTORY: 'extends' vs 'allows to lapse')

## Angle disagreements (ideal → pipeline)
- `70d77d1e33d12bd9` (80): ideal **base_report**, pipeline **official_response**
- `9df36b44e85e925c` (480): ideal **base_report**, pipeline **official_response**
- `838be04bdb4e35fc` (268): ideal **base_report**, pipeline **investigative_detail**
- `895feaf453b52308` (491): ideal **official_response**, pipeline **market_reaction**
- `47006dc2c145b5f6` (194): ideal **investigative_detail**, pipeline **market_reaction**
- `f29fa3ed5d43e6f1` (194): ideal **investigative_detail**, pipeline **base_report**
- `df2532958fb264b9` (657): ideal **base_report**, pipeline **reaction_public**
- `e80fc13e5c11bc0b` (477): ideal **base_report**, pipeline **market_reaction**

## Reading
- Clustering precision is high — when the pipeline merges, it is usually right; the one false merge is the 'US oil waiver extends vs lapses' pair (related, not same).
- Angle is the weak stage on real data too (≈62%), echoing the synthetic benchmark (39.5%) and the audit (A2.3). Most misses over-apply official_response / market_reaction.
- No minor story reached top-3 on this snapshot; but 1 major story/ies sit outside the top-5 (a routine ministerial tour outranks them) — a ranking-quality signal, not a hard alarm.

_Caveat: single uncalibrated LLM oracle. Treat as indicative; certify with a human κ sample (plan §B2.4) before gating on these numbers._
