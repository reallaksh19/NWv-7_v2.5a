# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.3`
- Average temporal tiers: `1.7`
- Average evolution roles: `1.5`
- Base report share: `0.16666666666666666`
- Multi-angle parents: `3`
- Weak parents: `7`
- Story count: `789`
- Source groups: `9`
- Content hash: `1f5ef3fb9fe75ddc`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | What is testosterone screening, and why is the U.S. military introducing it? / Explained | 2 | official_response, base_report | NO | 0.6052599999999999 |
| 2 | U.S. to change visa regulations for foreign students, journalists | 2 | base_report, expert_analysis | NO | 0.6010239879583166 |
| 3 | US Senate Bill seeks 100% tariffs on India, China for buying Russian oil | 2 | fact_update, base_report | NO | 0.5976566135483352 |
| 4 | NEET UG 2026 results: Punjab’s Aryan Gupta, Haryana’s Panshul Bansal top; 11.21 lakh qualify | 2 | fact_update | YES | 0.7065633864516649 |
| 5 | Supreme Court voices concern over CBSE’s third language policy from Class 9 | 2 | official_response | YES | 0.6604967197849982 |
| 6 | US to revive rule of no green cards for those who use public benefits | 2 | reaction_public | YES | 0.6220800531183317 |
| 7 | Ukraine's Parliament approves Serhii Koretskyi as new Prime Minister | 2 | official_response | YES | 0.6055800531183317 |
| 8 | Indian court orders Maruti to replace car in first E20 fuel damage ruling - Reuters | 2 | official_response | YES | 0.5013566135483352 |
| 9 | BHEL shares jump 4% after Maharatna PSU posts net profit of Rs 377 crore in Q1, revenue jumps 40% | 1 | fact_update | YES | 0.7235911614783158 |
| 10 | RIL Q1 Results: Revenue rises 25% YoY; profit falls 22% YoY to Rs 20,946 crore due to one-time effect | 1 | fact_update | YES | 0.7226911614783158 |

## Warnings

- Real snapshot still produces low Insight grade.

## Real Snapshot Ratchet Gate

- Status: **FAIL**
- Gate version: `real-insight-snapshot-ratchet-v1`
- Grade: `D`
- Score: `0`
- Parents: `10`
- Average angles: `1.3`
- Average temporal tiers: `1.7`
- Average evolution roles: `1.5`
- Base report share: `0.167`
- Multi-angle parents: `3`
- Top parent angles: `2`
- Top parent children: `2`

### Failed gates

- **Real snapshot grade floor** — actual `D`, required `A/B/C`. Fix: Do not accept D/F real snapshot output. Improve child selection, parent rerank, or data intake.
- **Average visible angle count** — actual `1.3`, required `>= 1.4`. Fix: Angle-diverse child selection is not strong enough on real data.
- **Average temporal tier count** — actual `1.7`, required `>= 1.8`. Fix: C+E output should cover multiple event-time tiers, not only source buckets.
- **Average evolution role count** — actual `1.5`, required `>= 1.6`. Fix: C+E output should include distinct event evolution roles.
- **Weak parent ratio** — actual `0.7`, required `<= 0.5`. Fix: Too many weak trees remain. Repair or demote weak trees after diversity repair.

### Passed gates

- Parent cluster count: `10` / `>= 3`
- Base report share: `0.167` / `<= 0.55`
- Multi-angle parent count: `3` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `2` / `>= 2`
