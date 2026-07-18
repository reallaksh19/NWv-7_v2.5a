# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.7`
- Average evolution roles: `1.8`
- Base report share: `0.15789473684210525`
- Multi-angle parents: `4`
- Weak parents: `6`
- Story count: `629`
- Source groups: `10`
- Content hash: `3be5d5d8d5031fd7`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | PM launches India’s first hydrogen-powered train | 3 | base_report, official_response | NO | 0.6807477209716007 |
| 2 | US Senate Bill seeks 100% tariffs on India, China for buying Russian oil | 2 | fact_update, base_report | NO | 0.6976300531183317 |
| 3 | DCET results announced | 2 | official_response, fact_update | NO | 0.6697800531183317 |
| 4 | US prosecutor says Justice Department made call to drop Gautam Adani case | 2 | expert_analysis, fact_update | NO | 0.6005899468816684 |
| 5 | NEET UG 2026 results: Punjab’s Aryan Gupta, Haryana’s Panshul Bansal top; 11.21 lakh qualify | 2 | fact_update | YES | 0.7065633864516649 |
| 6 | US to revive rule of no green cards for those who use public benefits | 2 | reaction_public | YES | 0.6220800531183317 |
| 7 | Wangchuk shifted to hospital; Abhijeet Dipke under detention, says Delhi Police | 2 | official_response | YES | 0.59551 |
| 8 | A 7.3-magnitude earthquake hits Mexico-Guatemala border; no damage reported so far | 2 | official_response | YES | 0.5935232802150019 |
| 9 | Zepto IPO anchor book nears closure; Norges, Motilal Oswal may take 40-45% | 1 | fact_update | YES | 0.7226911614783158 |
| 10 | Reliance Retail Q1 results: Quick-commerce spends drag PAT 14% YoY to Rs 2,806 crore; revenue rises 7% | 1 | fact_update | YES | 0.7226911614783158 |

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
- Average evolution roles: `1.8`
- Base report share: `0.158`
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
- Average evolution role count: `1.8` / `>= 1.6`
- Base report share: `0.158` / `<= 0.55`
- Multi-angle parent count: `4` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `3` / `>= 2`
