# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `C`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.7`
- Average evolution roles: `1.7`
- Base report share: `0.14285714285714285`
- Multi-angle parents: `4`
- Weak parents: `6`
- Story count: `804`
- Source groups: `9`
- Content hash: `e59c7e67d7e736ba`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | Revised US Russia sanctions bill lowers proposed tariffs on China, India | 2 | base_report, correction | NO | 0.6893933333333335 |
| 2 | NASA astronaut Anil Menon, two others reach International Space Station | 3 | base_report, fact_update | NO | 0.6542583349983153 |
| 3 | E Jean Carroll receives $5.6 million in sexual abuse case after years-long legal battle with Trump | 2 | fact_update, official_response | NO | 0.6443266666666667 |
| 4 | Files relating to India’s largest nuclear power plant Kudankulam exposed in data breach - Reuters | 2 | official_response, investigative_detail | NO | 0.6292600000000002 |
| 5 | Marine engineer missing following attack on ship off Oman coast is dead, says family | 2 | fact_update | YES | 0.62816 |
| 6 | Can’t English be considered an indigenous Indian language, asks SC | 2 | official_response | YES | 0.6365800531183317 |
| 7 | MEA summons Iranian deputy envoy, after Indian national killed in attack on ship | 2 | fact_update | YES | 0.6225800531183316 |
| 8 | Cabinet Approves Mobile Phone Manufacturing Scheme With Rs. 62,500 Crore Budget to Scale Domestic Production | 2 | fact_update | YES | 0.6002266666666667 |
| 9 | India bans the import of goods made using forced labour, even as U.S. investigation is pending - The Hindu | 2 | investigative_detail | YES | 0.5513433333333333 |
| 10 | Nepal court jails two former Ministers, 14 others | 2 | investigative_detail | YES | 0.5495933333333334 |

## Real Snapshot Ratchet Gate

- Status: **FAIL**
- Gate version: `real-insight-snapshot-ratchet-v1`
- Grade: `C`
- Score: `66`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.7`
- Average evolution roles: `1.7`
- Base report share: `0.143`
- Multi-angle parents: `4`
- Top parent angles: `2`
- Top parent children: `2`

### Failed gates

- **Average temporal tier count** — actual `1.7`, required `>= 1.8`. Fix: C+E output should cover multiple event-time tiers, not only source buckets.
- **Weak parent ratio** — actual `0.6`, required `<= 0.5`. Fix: Too many weak trees remain. Repair or demote weak trees after diversity repair.

### Passed gates

- Real snapshot grade floor: `C` / `A/B/C`
- Parent cluster count: `10` / `>= 3`
- Average visible angle count: `1.4` / `>= 1.4`
- Average evolution role count: `1.7` / `>= 1.6`
- Base report share: `0.143` / `<= 0.55`
- Multi-angle parent count: `4` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `2` / `>= 2`
