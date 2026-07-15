# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.3`
- Average temporal tiers: `1.6`
- Average evolution roles: `1.7`
- Base report share: `0.15789473684210525`
- Multi-angle parents: `3`
- Weak parents: `7`
- Story count: `630`
- Source groups: `9`
- Content hash: `edb0c0850cb9e657`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | ‘Boat flipped in three minutes,’ recounts Vietnam crash survivor upon arrival in Chennai | 2 | official_response, regional_followup | NO | 0.6943967197849983 |
| 2 | Revised US Russia sanctions bill lowers proposed tariffs on China, India | 2 | base_report, correction | NO | 0.6334066135483352 |
| 3 | E Jean Carroll receives $5.6 million in sexual abuse case after years-long legal battle with Trump | 2 | fact_update, official_response | NO | 0.6243266666666667 |
| 4 | Share Market Live, Share Market Today: Latest Share Market News, Share Market Live Updates on The Economic Times - The Economic Times | 2 | fact_update | YES | 0.6564967197849982 |
| 5 | Can’t English be considered an indigenous Indian language, asks SC | 2 | official_response | YES | 0.6365800531183317 |
| 6 | MEA summons Iranian deputy envoy, after Indian national killed in attack on ship | 3 | fact_update | YES | 0.5805916683316485 |
| 7 | NASA astronaut Anil Menon and two Russian cosmonauts reach International Space Station | 2 | base_report | YES | 0.5815232802150019 |
| 8 | India bans the import of goods made using forced labour, even as U.S. investigation is pending | 2 | investigative_detail | YES | 0.5513433333333333 |
| 9 | Tata Elxsi shares slide 6% after weak Q1 results. Why Motilal Oswal sees 16% downside from current levels? | 1 | market_reaction | YES | 0.7226911614783158 |
| 10 | Alpine Texworld IPO Day 2: GMP at 10%; check subscription, valuation and other key details | 1 | market_reaction | YES | 0.7226911614783158 |

## Warnings

- Real snapshot still produces low Insight grade.

## Real Snapshot Ratchet Gate

- Status: **FAIL**
- Gate version: `real-insight-snapshot-ratchet-v1`
- Grade: `D`
- Score: `18`
- Parents: `10`
- Average angles: `1.3`
- Average temporal tiers: `1.6`
- Average evolution roles: `1.7`
- Base report share: `0.158`
- Multi-angle parents: `3`
- Top parent angles: `2`
- Top parent children: `2`

### Failed gates

- **Real snapshot grade floor** — actual `D`, required `A/B/C`. Fix: Do not accept D/F real snapshot output. Improve child selection, parent rerank, or data intake.
- **Average visible angle count** — actual `1.3`, required `>= 1.4`. Fix: Angle-diverse child selection is not strong enough on real data.
- **Average temporal tier count** — actual `1.6`, required `>= 1.8`. Fix: C+E output should cover multiple event-time tiers, not only source buckets.
- **Weak parent ratio** — actual `0.7`, required `<= 0.5`. Fix: Too many weak trees remain. Repair or demote weak trees after diversity repair.

### Passed gates

- Parent cluster count: `10` / `>= 3`
- Average evolution role count: `1.7` / `>= 1.6`
- Base report share: `0.158` / `<= 0.55`
- Multi-angle parent count: `3` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `2` / `>= 2`
