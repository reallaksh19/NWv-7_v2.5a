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
- Story count: `724`
- Source groups: `10`
- Content hash: `db8ef2cb5d54af52`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | NASA astronaut Anil Menon, two others reach International Space Station | 2 | base_report, fact_update | NO | 0.6994967197849983 |
| 2 | Kota C-section victims demand kidney transplant in 48 hours, write to President | 2 | fact_update, reaction_public | NO | 0.6934967197849984 |
| 3 | Files relating to India’s largest nuclear power plant Kudankulam exposed in data breach - Reuters | 2 | official_response, investigative_detail | NO | 0.6292600000000002 |
| 4 | Marine engineer missing following attack on ship off Oman coast is dead, says family | 2 | fact_update | YES | 0.6961467197849984 |
| 5 | Swiggy Instamart and HPCL launch q-comm cylinder delivery | 2 | base_report | YES | 0.6452600000000001 |
| 6 | Cabinet Approves Mobile Phone Manufacturing Scheme With Rs. 62,500 Crore Budget to Scale Domestic Production | 2 | fact_update | YES | 0.6002266666666667 |
| 7 | Supreme Court voices concern over CBSE’s third language policy from Class 9 | 2 | official_response | YES | 0.5965100000000001 |
| 8 | Nepal court jails two former Ministers, 14 others | 2 | investigative_detail | YES | 0.6055800531183317 |
| 9 | Issue 16% subscribed on day one so far, GMP suggests 12% listing pop | 1 | fact_update | YES | 0.7226911614783158 |
| 10 | ICICI Lombard General Insurance shares tumble 15% after Q1 profit takes a hit | 1 | market_reaction | YES | 0.7226911614783158 |

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
