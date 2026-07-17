# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.1`
- Average temporal tiers: `1.6`
- Average evolution roles: `1.3`
- Base report share: `0.0625`
- Multi-angle parents: `1`
- Weak parents: `9`
- Story count: `646`
- Source groups: `10`
- Content hash: `b28304fe381788b2`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | U.S. to change visa regulations for foreign students, journalists | 2 | base_report, expert_analysis | NO | 0.6210273179616861 |
| 2 | NEET UG 2026 results: Punjab’s Aryan Gupta, Haryana’s Panshul Bansal top; 11.21 lakh qualify | 2 | fact_update | YES | 0.6425766666666668 |
| 3 | Supreme Court voices concern over CBSE’s third language policy from Class 9 | 2 | official_response | YES | 0.6604967197849982 |
| 4 | Ukraine's Parliament approves Serhii Koretskyi as new Prime Minister | 2 | official_response | YES | 0.6055800531183317 |
| 5 | US to revive rule of no green cards for those who use public benefits | 2 | reaction_public | YES | 0.5340933333333333 |
| 6 | Indian court orders Maruti to replace car in first E20 fuel damage ruling - Reuters | 2 | official_response | YES | 0.5013566135483352 |
| 7 | BHEL shares jump 4% after Maharatna PSU posts net profit of Rs 377 crore in Q1, revenue jumps 40% | 1 | fact_update | YES | 0.7235911614783158 |
| 8 | Tech Mahindra shares jump 3% after Q1 earnings beat estimates. What Nomura, Nuvama, other brokerages now expect | 1 | fact_update | YES | 0.7226911614783158 |
| 9 | Jio Financial Services shares rally 6% after stellar Q1 results. Buy, sell or hold the stock? | 1 | market_reaction | YES | 0.7226911614783158 |
| 10 | SBI Funds Management gets highest applications for any IPO this year, sees Rs 2.98 lakh crore investor rush | 1 | fact_update | YES | 0.7226911614783158 |

## Warnings

- Real snapshot still produces low Insight grade.

## Real Snapshot Ratchet Gate

- Status: **FAIL**
- Gate version: `real-insight-snapshot-ratchet-v1`
- Grade: `D`
- Score: `0`
- Parents: `10`
- Average angles: `1.1`
- Average temporal tiers: `1.6`
- Average evolution roles: `1.3`
- Base report share: `0.063`
- Multi-angle parents: `1`
- Top parent angles: `2`
- Top parent children: `2`

### Failed gates

- **Real snapshot grade floor** — actual `D`, required `A/B/C`. Fix: Do not accept D/F real snapshot output. Improve child selection, parent rerank, or data intake.
- **Average visible angle count** — actual `1.1`, required `>= 1.4`. Fix: Angle-diverse child selection is not strong enough on real data.
- **Average temporal tier count** — actual `1.6`, required `>= 1.8`. Fix: C+E output should cover multiple event-time tiers, not only source buckets.
- **Average evolution role count** — actual `1.3`, required `>= 1.6`. Fix: C+E output should include distinct event evolution roles.
- **Weak parent ratio** — actual `0.9`, required `<= 0.5`. Fix: Too many weak trees remain. Repair or demote weak trees after diversity repair.

### Passed gates

- Parent cluster count: `10` / `>= 3`
- Base report share: `0.063` / `<= 0.55`
- Multi-angle parent count: `1` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `2` / `>= 2`
