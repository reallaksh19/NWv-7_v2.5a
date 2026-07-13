# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.6`
- Average evolution roles: `1.7`
- Base report share: `0.2631578947368421`
- Multi-angle parents: `4`
- Weak parents: `6`
- Story count: `497`
- Source groups: `9`
- Content hash: `98fae320cac9ce30`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | Toll up at 9 as last body recovered; official dubs incident 'act of God' - The Hindu | 2 | fact_update, official_response | NO | 0.6504967197849982 |
| 2 | Ex-MP H. Hanumanthappa passes away | 2 | base_report, official_response | NO | 0.6274820680115993 |
| 3 | US Democrat Ro Khanna says he was detained by armed Israeli settlers | 2 | base_report, official_response | NO | 0.6072599999999999 |
| 4 | Yastika century, seamers put India on the brink of historic win at Lord's | 2 | fact_update, base_report | NO | 0.5530933333333333 |
| 5 | US Senator and close Trump ally Lindsey Graham dies after 'brief and sudden illness' | 2 | base_report | YES | 0.6721766666666669 |
| 6 | China evacuates nearly two million people as powerful typhoon makes landfall | 2 | fact_update | YES | 0.6303266666666667 |
| 7 | At least two killed in Toronto street festival shooting | 2 | fact_update | YES | 0.6292600000000002 |
| 8 | 14 nations, EU reaffirm 2016 ruling invalidating China's claims in South China Sea | 2 | official_response | YES | 0.5957600000000001 |
| 9 | US strikes Iran after Strait of Hormuz ship attack; Tehran hits Gulf states | 2 | regional_followup | YES | 0.5815232802150019 |
| 10 | Just Dial shares rocket 14% as profit rises to Rs 166 crore; revenue grows 10% YoY | 1 | fact_update | YES | 0.7226911614783158 |

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
- Average evolution roles: `1.7`
- Base report share: `0.263`
- Multi-angle parents: `4`
- Top parent angles: `2`
- Top parent children: `2`

### Failed gates

- **Real snapshot grade floor** — actual `D`, required `A/B/C`. Fix: Do not accept D/F real snapshot output. Improve child selection, parent rerank, or data intake.
- **Average temporal tier count** — actual `1.6`, required `>= 1.8`. Fix: C+E output should cover multiple event-time tiers, not only source buckets.
- **Weak parent ratio** — actual `0.6`, required `<= 0.5`. Fix: Too many weak trees remain. Repair or demote weak trees after diversity repair.

### Passed gates

- Parent cluster count: `10` / `>= 3`
- Average visible angle count: `1.4` / `>= 1.4`
- Average evolution role count: `1.7` / `>= 1.6`
- Base report share: `0.263` / `<= 0.55`
- Multi-angle parent count: `4` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `2` / `>= 2`
