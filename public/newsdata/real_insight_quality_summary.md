# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.2`
- Average temporal tiers: `1.6`
- Average evolution roles: `1.3`
- Base report share: `0.0625`
- Multi-angle parents: `2`
- Weak parents: `8`
- Story count: `579`
- Source groups: `9`
- Content hash: `b54c5a612fb98f2b`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | Karur Vysya Bank shares soar 11% after stellar Q1 results. What investors should know | 2 | fact_update, market_reaction | NO | 0.7266266666666668 |
| 2 | Hamas names Khalil al-Hayya as new overall leader | 2 | base_report, fact_update | NO | 0.6112599999999999 |
| 3 | Meghna Infracon Infrastructure expects Rs 300cr revenue from new commercial project | 2 | fact_update | YES | 0.760613386451665 |
| 4 | India's 'Cockroach' movement supporters clash with Delhi police - 朝日新聞 | 3 | official_response | YES | 0.5543027794427596 |
| 5 | Seafarer from Kasaragod killed in attack on cargo ship off Ukraine | 2 | fact_update | YES | 0.5712433333333332 |
| 6 | Coal India subsidiary CMPDI shares climb 7% after Q1FY27 profit surges 54% YoY | 1 | market_reaction | YES | 0.7226911614783158 |
| 7 | Mrs Bectors Food shares surge 30% in 4 days after Sunil Singhania's Abakkus acquires 1% stake. Do you own? | 1 | market_reaction | YES | 0.7226911614783158 |
| 8 | MTAR Technologies falls 5%, extends 4-day slide to 20% | 1 | market_reaction | YES | 0.7226911614783158 |
| 9 | UltraTech Cement shares gain 2% after Q1 results. Why Nuvama, other brokerages raised target? | 1 | market_reaction | YES | 0.7226911614783158 |
| 10 | Paytm shares gain 3% after Q1 results. What are Goldman Sachs, Citi and CLSA saying? | 1 | market_reaction | YES | 0.7226911614783158 |

## Warnings

- Real snapshot still produces low Insight grade.

## Real Snapshot Ratchet Gate

- Status: **FAIL**
- Gate version: `real-insight-snapshot-ratchet-v1`
- Grade: `D`
- Score: `0`
- Parents: `10`
- Average angles: `1.2`
- Average temporal tiers: `1.6`
- Average evolution roles: `1.3`
- Base report share: `0.063`
- Multi-angle parents: `2`
- Top parent angles: `2`
- Top parent children: `2`

### Failed gates

- **Real snapshot grade floor** — actual `D`, required `A/B/C`. Fix: Do not accept D/F real snapshot output. Improve child selection, parent rerank, or data intake.
- **Average visible angle count** — actual `1.2`, required `>= 1.4`. Fix: Angle-diverse child selection is not strong enough on real data.
- **Average temporal tier count** — actual `1.6`, required `>= 1.8`. Fix: C+E output should cover multiple event-time tiers, not only source buckets.
- **Average evolution role count** — actual `1.3`, required `>= 1.6`. Fix: C+E output should include distinct event evolution roles.
- **Weak parent ratio** — actual `0.8`, required `<= 0.5`. Fix: Too many weak trees remain. Repair or demote weak trees after diversity repair.

### Passed gates

- Parent cluster count: `10` / `>= 3`
- Base report share: `0.063` / `<= 0.55`
- Multi-angle parent count: `2` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `2` / `>= 2`
