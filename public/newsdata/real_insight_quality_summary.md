# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.9`
- Average evolution roles: `1.4`
- Base report share: `0.05`
- Multi-angle parents: `4`
- Weak parents: `6`
- Story count: `701`
- Source groups: `9`
- Content hash: `d5ac0e714650cc5c`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | Karur Vysya Bank shares soar 11% after stellar Q1 results. What investors should know | 2 | fact_update, market_reaction | NO | 0.7666133864516651 |
| 2 | India's Rahul, Priyanka Gandhi protest outside Modi's house - Reuters | 3 | regional_followup, reaction_public | NO | 0.5758462101805386 |
| 3 | Hamas names Khalil al-Hayya as new overall leader | 2 | base_report, fact_update | NO | 0.6112599999999999 |
| 4 | India's 'cockroach' protest continues a day after police crackdown | 2 | reaction_public, official_response | NO | 0.5962599999999999 |
| 5 | Meghna Infracon Infrastructure expects Rs 300cr revenue from new commercial project | 2 | fact_update | YES | 0.760613386451665 |
| 6 | London Stock Exchange to roll out overnight trading exchange LSE 24 in 2027 | 2 | market_reaction | YES | 0.6694266666666667 |
| 7 | Seafarer from Kasaragod killed in attack on cargo ship off Ukraine | 2 | fact_update | YES | 0.6392300531183316 |
| 8 | India’s youth-led 'cockroach movement' clashes with police in New Delhi - Reuters | 2 | official_response | YES | 0.5723433333333332 |
| 9 | Delhi High Court allows Sonam Wangchuk to shift to private hospital | 2 | official_response | YES | 0.5513433333333333 |
| 10 | Bandhan Bank Q1 profit jumps 35% as provisions decline sharply | 1 | fact_update | YES | 0.7226911614783158 |

## Warnings

- Real snapshot still produces low Insight grade.

## Real Snapshot Ratchet Gate

- Status: **FAIL**
- Gate version: `real-insight-snapshot-ratchet-v1`
- Grade: `D`
- Score: `42`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.9`
- Average evolution roles: `1.4`
- Base report share: `0.05`
- Multi-angle parents: `4`
- Top parent angles: `2`
- Top parent children: `2`

### Failed gates

- **Real snapshot grade floor** — actual `D`, required `A/B/C`. Fix: Do not accept D/F real snapshot output. Improve child selection, parent rerank, or data intake.
- **Average evolution role count** — actual `1.4`, required `>= 1.6`. Fix: C+E output should include distinct event evolution roles.
- **Weak parent ratio** — actual `0.6`, required `<= 0.5`. Fix: Too many weak trees remain. Repair or demote weak trees after diversity repair.

### Passed gates

- Parent cluster count: `10` / `>= 3`
- Average visible angle count: `1.4` / `>= 1.4`
- Average temporal tier count: `1.9` / `>= 1.8`
- Base report share: `0.05` / `<= 0.55`
- Multi-angle parent count: `4` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `2` / `>= 2`
