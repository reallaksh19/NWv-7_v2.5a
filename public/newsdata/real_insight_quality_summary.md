# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.5`
- Average evolution roles: `1.6`
- Base report share: `0.2222222222222222`
- Multi-angle parents: `4`
- Weak parents: `6`
- Story count: `499`
- Source groups: `9`
- Content hash: `8023534936ba592c`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | Why US, EU and 13 nations are backing 2016 South China Sea ruling against Beijing's claims | 3 | fact_update, official_response | NO | 0.6212906546249832 |
| 2 | Toll up at 9 as last body recovered; official dubs incident 'act of God' - The Hindu | 2 | fact_update, official_response | NO | 0.6504967197849982 |
| 3 | Ex-MP H. Hanumanthappa passes away | 2 | base_report, official_response | NO | 0.6274820680115993 |
| 4 | Yastika century, seamers put India on the brink of historic win at Lord's | 2 | fact_update, base_report | NO | 0.5530933333333333 |
| 5 | US Senator and close Trump ally Lindsey Graham dies after 'brief and sudden illness' | 2 | base_report | YES | 0.6721766666666669 |
| 6 | At least two killed in Toronto street festival shooting | 2 | fact_update | YES | 0.6292600000000002 |
| 7 | US strikes Iran after Strait of Hormuz ship attack; Tehran hits Gulf states | 2 | regional_followup | YES | 0.60551 |
| 8 | FIIs pour over $1 billion into Indian stocks, biggest weekly buying since June 2025 | 1 | fact_update | YES | 0.7226911614783158 |
| 9 | Just Dial shares rocket 14% as profit rises to Rs 166 crore; revenue grows 10% YoY | 1 | fact_update | YES | 0.7226911614783158 |
| 10 | DMart shares fall 4% after Q1 results. What are Motilal Oswal, other brokerages saying? | 1 | market_reaction | YES | 0.7226911614783158 |

## Warnings

- Real snapshot still produces low Insight grade.

## Real Snapshot Ratchet Gate

- Status: **FAIL**
- Gate version: `real-insight-snapshot-ratchet-v1`
- Grade: `D`
- Score: `42`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.5`
- Average evolution roles: `1.6`
- Base report share: `0.222`
- Multi-angle parents: `4`
- Top parent angles: `2`
- Top parent children: `3`

### Failed gates

- **Real snapshot grade floor** — actual `D`, required `A/B/C`. Fix: Do not accept D/F real snapshot output. Improve child selection, parent rerank, or data intake.
- **Average temporal tier count** — actual `1.5`, required `>= 1.8`. Fix: C+E output should cover multiple event-time tiers, not only source buckets.
- **Weak parent ratio** — actual `0.6`, required `<= 0.5`. Fix: Too many weak trees remain. Repair or demote weak trees after diversity repair.

### Passed gates

- Parent cluster count: `10` / `>= 3`
- Average visible angle count: `1.4` / `>= 1.4`
- Average evolution role count: `1.6` / `>= 1.6`
- Base report share: `0.222` / `<= 0.55`
- Multi-angle parent count: `4` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `3` / `>= 2`
