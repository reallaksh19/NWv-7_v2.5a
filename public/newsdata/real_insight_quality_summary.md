# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.7`
- Average evolution roles: `1.6`
- Base report share: `0.2222222222222222`
- Multi-angle parents: `4`
- Weak parents: `6`
- Story count: `698`
- Source groups: `9`
- Content hash: `bca824ce10b8668b`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | PM launches India’s first hydrogen-powered train | 3 | base_report, official_response | NO | 0.6167906546249833 |
| 2 | DCET results announced | 2 | official_response, fact_update | NO | 0.6697800531183317 |
| 3 | US Senate Bill seeks 100% tariffs on India, China for buying Russian oil | 2 | fact_update, base_report | NO | 0.6296433333333333 |
| 4 | U.S. to change visa regulations for foreign students, journalists | 2 | base_report, expert_analysis | NO | 0.6010239879583166 |
| 5 | NEET UG 2026 results: Punjab’s Aryan Gupta, Haryana’s Panshul Bansal top; 11.21 lakh qualify | 2 | fact_update | YES | 0.7065633864516649 |
| 6 | US to revive rule of no green cards for those who use public benefits | 2 | reaction_public | YES | 0.6220800531183317 |
| 7 | Indian court orders Maruti to replace car in first E20 fuel damage ruling - Reuters | 2 | official_response | YES | 0.5693433333333333 |
| 8 | Zepto IPO anchor book nears closure; Norges, Motilal Oswal may take 40-45% | 1 | fact_update | YES | 0.7226911614783158 |
| 9 | Reliance Retail Q1 results: Quick-commerce spends drag PAT 14% YoY to Rs 2,806 crore; revenue rises 7% | 1 | fact_update | YES | 0.7226911614783158 |
| 10 | RIL Q1 Results: Revenue rises 25% YoY; profit falls 22% YoY to Rs 20,946 crore due to one-time effect | 1 | fact_update | YES | 0.7226911614783158 |

## Warnings

- Real snapshot still produces low Insight grade.

## Real Snapshot Ratchet Gate

- Status: **FAIL**
- Gate version: `real-insight-snapshot-ratchet-v1`
- Grade: `D`
- Score: `42`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.7`
- Average evolution roles: `1.6`
- Base report share: `0.222`
- Multi-angle parents: `4`
- Top parent angles: `2`
- Top parent children: `3`

### Failed gates

- **Real snapshot grade floor** — actual `D`, required `A/B/C`. Fix: Do not accept D/F real snapshot output. Improve child selection, parent rerank, or data intake.
- **Average temporal tier count** — actual `1.7`, required `>= 1.8`. Fix: C+E output should cover multiple event-time tiers, not only source buckets.
- **Weak parent ratio** — actual `0.6`, required `<= 0.5`. Fix: Too many weak trees remain. Repair or demote weak trees after diversity repair.

### Passed gates

- Parent cluster count: `10` / `>= 3`
- Average visible angle count: `1.4` / `>= 1.4`
- Average evolution role count: `1.6` / `>= 1.6`
- Base report share: `0.222` / `<= 0.55`
- Multi-angle parent count: `4` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `3` / `>= 2`
