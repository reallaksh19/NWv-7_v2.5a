# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.2`
- Average temporal tiers: `1.5`
- Average evolution roles: `1.3`
- Base report share: `0.13333333333333333`
- Multi-angle parents: `2`
- Weak parents: `8`
- Story count: `610`
- Source groups: `9`
- Content hash: `1315d457541102bf`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | Hamas names Khalil al-Hayya as new overall leader | 2 | base_report, fact_update | NO | 0.6112599999999999 |
| 2 | Samsung's 'Back to School' Sale Brings Discounts on Galaxy S26 Series, Galaxy Book 6 Pro, Galaxy Tab S11 Ultra and More | 2 | base_report, fact_update | NO | 0.5580933333333333 |
| 3 | Meghna Infracon Infrastructure expects Rs 300cr revenue from new commercial project | 2 | fact_update | YES | 0.760613386451665 |
| 4 | IMA suspends July 20 strike after Bombay HC stays Shiv Sena corporator's bail | 2 | official_response | YES | 0.6724967197849983 |
| 5 | India's 'Cockroach' movement supporters clash with Delhi police - 朝日新聞 | 2 | official_response | YES | 0.5712433333333332 |
| 6 | Som Distilleries shares jump 14% as ace investor Prashant Jain buys 25 lakh shares in Q1. What is he seeing? | 1 | fact_update | YES | 0.7226911614783158 |
| 7 | UltraTech Cement Q1 Results: Cons profit jumps 17% YoY to Rs 2,599 crore; revenue rises 16% | 1 | fact_update | YES | 0.7226911614783158 |
| 8 | History test! What last 12 billion-dollar IPO listing gains indicate about SBI MF's Rs 9,813 crore debut | 1 | fact_update | YES | 0.7226911614783158 |
| 9 | PC Jeweller shares jump 6%: What’s driving the rally after 220% gains in 3 years? | 1 | market_reaction | YES | 0.7226911614783158 |
| 10 | Oberoi Realty Q1 Results: Profit rises 29% to ₹544.71 crore | 1 | fact_update | YES | 0.7226911614783158 |

## Warnings

- Real snapshot still produces low Insight grade.

## Real Snapshot Ratchet Gate

- Status: **FAIL**
- Gate version: `real-insight-snapshot-ratchet-v1`
- Grade: `D`
- Score: `0`
- Parents: `10`
- Average angles: `1.2`
- Average temporal tiers: `1.5`
- Average evolution roles: `1.3`
- Base report share: `0.133`
- Multi-angle parents: `2`
- Top parent angles: `2`
- Top parent children: `2`

### Failed gates

- **Real snapshot grade floor** — actual `D`, required `A/B/C`. Fix: Do not accept D/F real snapshot output. Improve child selection, parent rerank, or data intake.
- **Average visible angle count** — actual `1.2`, required `>= 1.4`. Fix: Angle-diverse child selection is not strong enough on real data.
- **Average temporal tier count** — actual `1.5`, required `>= 1.8`. Fix: C+E output should cover multiple event-time tiers, not only source buckets.
- **Average evolution role count** — actual `1.3`, required `>= 1.6`. Fix: C+E output should include distinct event evolution roles.
- **Weak parent ratio** — actual `0.8`, required `<= 0.5`. Fix: Too many weak trees remain. Repair or demote weak trees after diversity repair.

### Passed gates

- Parent cluster count: `10` / `>= 3`
- Base report share: `0.133` / `<= 0.55`
- Multi-angle parent count: `2` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `2` / `>= 2`
