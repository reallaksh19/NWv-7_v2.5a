# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.8`
- Average evolution roles: `1.8`
- Base report share: `0.14285714285714285`
- Multi-angle parents: `4`
- Weak parents: `6`
- Story count: `697`
- Source groups: `9`
- Content hash: `e583a36380a6ac05`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | ‘Boat flipped in three minutes,’ recounts Vietnam crash survivor upon arrival in Chennai | 2 | official_response, regional_followup | NO | 0.6943967197849983 |
| 2 | E Jean Carroll receives $5.6 million in sexual abuse case after years-long legal battle with Trump | 2 | fact_update, official_response | NO | 0.6443266666666667 |
| 3 | Revised US Russia sanctions bill lowers proposed tariffs on China, India | 2 | base_report, correction | NO | 0.6334066135483352 |
| 4 | NASA astronaut Anil Menon, two others reach International Space Station | 3 | base_report, fact_update | NO | 0.6063045986550673 |
| 5 | Share Market Live, Share Market Today: Latest Share Market News, Share Market Live Updates on The Economic Times - The Economic Times | 2 | fact_update | YES | 0.6564967197849982 |
| 6 | MEA summons Iranian deputy envoy, after Indian national killed in attack on ship | 3 | fact_update | YES | 0.6365487346782661 |
| 7 | Can’t English be considered an indigenous Indian language, asks SC | 2 | official_response | YES | 0.6365800531183317 |
| 8 | India bans the import of goods made using forced labour, even as U.S. investigation is pending | 2 | investigative_detail | YES | 0.5513433333333333 |
| 9 | Nepal court jails two former Ministers, 14 others | 2 | investigative_detail | YES | 0.5295933333333334 |
| 10 | HDFC AMC Q1 Results: Net profit rises 12% to Rs 837 crore, revenue up 14% | 1 | fact_update | YES | 0.7226911614783158 |

## Warnings

- Real snapshot still produces low Insight grade.

## Real Snapshot Ratchet Gate

- Status: **FAIL**
- Gate version: `real-insight-snapshot-ratchet-v1`
- Grade: `D`
- Score: `66`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.8`
- Average evolution roles: `1.8`
- Base report share: `0.143`
- Multi-angle parents: `4`
- Top parent angles: `2`
- Top parent children: `2`

### Failed gates

- **Real snapshot grade floor** — actual `D`, required `A/B/C`. Fix: Do not accept D/F real snapshot output. Improve child selection, parent rerank, or data intake.
- **Weak parent ratio** — actual `0.6`, required `<= 0.5`. Fix: Too many weak trees remain. Repair or demote weak trees after diversity repair.

### Passed gates

- Parent cluster count: `10` / `>= 3`
- Average visible angle count: `1.4` / `>= 1.4`
- Average temporal tier count: `1.8` / `>= 1.8`
- Average evolution role count: `1.8` / `>= 1.6`
- Base report share: `0.143` / `<= 0.55`
- Multi-angle parent count: `4` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `2` / `>= 2`
