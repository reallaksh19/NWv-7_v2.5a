# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.6`
- Average evolution roles: `1.6`
- Base report share: `0.17647058823529413`
- Multi-angle parents: `4`
- Weak parents: `6`
- Story count: `579`
- Source groups: `9`
- Content hash: `c903b4b1575f3b61`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | PM launches India’s first hydrogen-powered train | 3 | base_report, official_response | NO | 0.6807477209716007 |
| 2 | US Senate Bill seeks 100% tariffs on India, China for buying Russian oil | 2 | fact_update, base_report | NO | 0.6976300531183317 |
| 3 | DCET results announced | 2 | official_response, fact_update | NO | 0.6697800531183317 |
| 4 | US prosecutor says Justice Department made call to drop Gautam Adani case | 2 | expert_analysis, fact_update | NO | 0.6005899468816684 |
| 5 | CJP’s Abhijeet Dipke begins indefinite hunger strike, as police shifts Wangchuk to hospital | 2 | official_response | YES | 0.60551 |
| 6 | A 7.3-magnitude earthquake hits Mexico-Guatemala border; no damage reported so far | 2 | official_response | YES | 0.5935232802150019 |
| 7 | Zepto IPO anchor book nears closure; Norges, Motilal Oswal may take 40-45% | 1 | fact_update | YES | 0.7226911614783158 |
| 8 | Reliance Retail Q1 results: Quick-commerce spends drag PAT 14% YoY to Rs 2,806 crore; revenue rises 7% | 1 | fact_update | YES | 0.7226911614783158 |
| 9 | RIL Q1 Results: Revenue rises 25% YoY; profit falls 22% YoY to Rs 20,946 crore due to one-time effect | 1 | fact_update | YES | 0.7226911614783158 |
| 10 | J&K Bank sells 0.5% stake in PNB MetLife for Rs 120 crore | 1 | fact_update | YES | 0.7226911614783158 |

## Warnings

- Real snapshot still produces low Insight grade.

## Real Snapshot Ratchet Gate

- Status: **FAIL**
- Gate version: `real-insight-snapshot-ratchet-v1`
- Grade: `D`
- Score: `42`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.6`
- Average evolution roles: `1.6`
- Base report share: `0.176`
- Multi-angle parents: `4`
- Top parent angles: `2`
- Top parent children: `3`

### Failed gates

- **Real snapshot grade floor** — actual `D`, required `A/B/C`. Fix: Do not accept D/F real snapshot output. Improve child selection, parent rerank, or data intake.
- **Average temporal tier count** — actual `1.6`, required `>= 1.8`. Fix: C+E output should cover multiple event-time tiers, not only source buckets.
- **Weak parent ratio** — actual `0.6`, required `<= 0.5`. Fix: Too many weak trees remain. Repair or demote weak trees after diversity repair.

### Passed gates

- Parent cluster count: `10` / `>= 3`
- Average visible angle count: `1.4` / `>= 1.4`
- Average evolution role count: `1.6` / `>= 1.6`
- Base report share: `0.176` / `<= 0.55`
- Multi-angle parent count: `4` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `3` / `>= 2`
