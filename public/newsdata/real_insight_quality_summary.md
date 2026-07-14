# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.5`
- Average temporal tiers: `1.6`
- Average evolution roles: `1.6`
- Base report share: `0.15789473684210525`
- Multi-angle parents: `5`
- Weak parents: `5`
- Story count: `764`
- Source groups: `10`
- Content hash: `aebf0eeee3ac14c3`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | TCS among 5 stocks showing bullish RSI upswing | 2 | base_report, market_reaction | NO | 0.712563386451665 |
| 2 | ‘Boat flipped in three minutes,’ recounts Vietnam crash survivor upon arrival in Chennai | 2 | official_response, regional_followup | NO | 0.6943967197849983 |
| 3 | Senator Lindsey Graham died of aortic tear, examiner says | 2 | base_report, official_response | NO | 0.6792467197849983 |
| 4 | Bodies of 15 Indian tourists killed in Vietnam boat accident flown home | 2 | fact_update, regional_followup | NO | 0.6252128795983323 |
| 5 | India beat England in historic first women's test at Lord's - Reuters | 2 | regional_followup, base_report | NO | 0.5323566135483351 |
| 6 | Puravankara Q1 sales bookings up 28% to Rs 1,439 cr on higher volumes, price growth | 2 | fact_update | YES | 0.7566133864516651 |
| 7 | Supreme Court stays Madras High Court order banning cow slaughter in Tamil Nadu | 2 | official_response | YES | 0.6613967197849984 |
| 8 | Assam Rifles Jawan Killed In Action, 4 Injured In Suspected IED Blast In Nagaland | 2 | fact_update | YES | 0.6482467197849984 |
| 9 | MEA summons Iranian deputy envoy, after Indian national killed in attack on ship | 2 | fact_update | YES | 0.5765933333333333 |
| 10 | Anand Rathi Share Q1 results: Profit rises 71% to Rs 39 crore before one-time charge | 1 | fact_update | YES | 0.7226911614783158 |

## Warnings

- Real snapshot still produces low Insight grade.

## Real Snapshot Ratchet Gate

- Status: **FAIL**
- Gate version: `real-insight-snapshot-ratchet-v1`
- Grade: `D`
- Score: `52`
- Parents: `10`
- Average angles: `1.5`
- Average temporal tiers: `1.6`
- Average evolution roles: `1.6`
- Base report share: `0.158`
- Multi-angle parents: `5`
- Top parent angles: `2`
- Top parent children: `2`

### Failed gates

- **Real snapshot grade floor** — actual `D`, required `A/B/C`. Fix: Do not accept D/F real snapshot output. Improve child selection, parent rerank, or data intake.
- **Average temporal tier count** — actual `1.6`, required `>= 1.8`. Fix: C+E output should cover multiple event-time tiers, not only source buckets.

### Passed gates

- Parent cluster count: `10` / `>= 3`
- Average visible angle count: `1.5` / `>= 1.4`
- Average evolution role count: `1.6` / `>= 1.6`
- Base report share: `0.158` / `<= 0.55`
- Multi-angle parent count: `5` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `2` / `>= 2`
- Weak parent ratio: `0.5` / `<= 0.5`
