# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `C`
- Parents: `10`
- Average angles: `1.6`
- Average temporal tiers: `1.7`
- Average evolution roles: `1.7`
- Base report share: `0.19047619047619047`
- Multi-angle parents: `6`
- Weak parents: `4`
- Story count: `612`
- Source groups: `10`
- Content hash: `244f59f5da760c63`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | Bodies of 15 Indian tourists killed in Vietnam boat accident flown home | 3 | fact_update, regional_followup | NO | 0.636325001664982 |
| 2 | Why US, EU and 13 nations are backing 2016 South China Sea ruling against Beijing's claims | 2 | fact_update, official_response | NO | 0.6752467197849983 |
| 3 | BJP serves Omar ₹100-crore defamation notice; CM vows counter legal action | 2 | base_report, fact_update | NO | 0.61151 |
| 4 | Senator Lindsey Graham died of aortic tear, examiner says | 2 | base_report, official_response | NO | 0.6112599999999999 |
| 5 | Yastika century, seamers put India on the brink of historic win at Lord's | 2 | fact_update, base_report | NO | 0.5530933333333333 |
| 6 | Vietnam boat capsize survivors recount harrowing moments | 2 | base_report, background_context | NO | 0.5512261598133341 |
| 7 | Puravankara Q1 sales bookings up 28% to Rs 1,439 cr on higher volumes, price growth | 2 | fact_update | YES | 0.7566133864516651 |
| 8 | US strikes Iran after Strait of Hormuz ship attack; Tehran hits Gulf states | 2 | regional_followup | YES | 0.6814967197849984 |
| 9 | Assam Rifles Jawan Killed In Action, 4 Injured In Suspected IED Blast In Nagaland | 2 | fact_update | YES | 0.6482467197849984 |
| 10 | Supreme Court stays Madras High Court order banning cow slaughter in Tamil Nadu | 2 | official_response | YES | 0.58541 |

## Real Snapshot Ratchet Gate

- Status: **FAIL**
- Gate version: `real-insight-snapshot-ratchet-v1`
- Grade: `C`
- Score: `76`
- Parents: `10`
- Average angles: `1.6`
- Average temporal tiers: `1.7`
- Average evolution roles: `1.7`
- Base report share: `0.19`
- Multi-angle parents: `6`
- Top parent angles: `2`
- Top parent children: `3`

### Failed gates

- **Average temporal tier count** — actual `1.7`, required `>= 1.8`. Fix: C+E output should cover multiple event-time tiers, not only source buckets.

### Passed gates

- Real snapshot grade floor: `C` / `A/B/C`
- Parent cluster count: `10` / `>= 3`
- Average visible angle count: `1.6` / `>= 1.4`
- Average evolution role count: `1.7` / `>= 1.6`
- Base report share: `0.19` / `<= 0.55`
- Multi-angle parent count: `6` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `3` / `>= 2`
- Weak parent ratio: `0.4` / `<= 0.5`
