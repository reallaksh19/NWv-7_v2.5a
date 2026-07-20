# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.2`
- Average temporal tiers: `1.4`
- Average evolution roles: `1.4`
- Base report share: `0.0625`
- Multi-angle parents: `1`
- Weak parents: `9`
- Story count: `481`
- Source groups: `10`
- Content hash: `1766f63294dec3d0`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | Sonam Wangchuk’s wife moves Delhi HC, seeks his transfer to private hospital | 4 | base_report, official_response, investigative_detail | NO | 0.7174037530064112 |
| 2 | US launches ninth consecutive day of strikes on Iran as another American confirmed killed | 2 | official_response | YES | 0.6814967197849984 |
| 3 | IMA suspends July 20 strike after Bombay HC stays Shiv Sena corporator's bail | 2 | official_response | YES | 0.6724967197849983 |
| 4 | India's 'Cockroach' movement supporters clash with Delhi police - 朝日新聞 | 2 | official_response | YES | 0.6392300531183316 |
| 5 | Som Distilleries shares jump 14% as ace investor Prashant Jain buys 25 lakh shares in Q1. What is he seeing? | 1 | fact_update | YES | 0.7226911614783158 |
| 6 | UltraTech Cement Q1 Results: Cons profit jumps 17% YoY to Rs 2,599 crore; revenue rises 16% | 1 | fact_update | YES | 0.7226911614783158 |
| 7 | History test! What last 12 billion-dollar IPO listing gains indicate about SBI MF's Rs 9,813 crore debut | 1 | fact_update | YES | 0.7226911614783158 |
| 8 | PC Jeweller shares jump 6%: What’s driving the rally after 220% gains in 3 years? | 1 | market_reaction | YES | 0.7226911614783158 |
| 9 | Yes Bank shares drop 4% after Q1 results. What are Nuvama, other brokerages saying? | 1 | market_reaction | YES | 0.7226911614783158 |
| 10 | Axis Bank shares fall 5% after Q1 earnings fail to cheer D-Street. What brokerages say | 1 | market_reaction | YES | 0.7226911614783158 |

## Warnings

- Real snapshot still produces low Insight grade.

## Real Snapshot Ratchet Gate

- Status: **FAIL**
- Gate version: `real-insight-snapshot-ratchet-v1`
- Grade: `D`
- Score: `0`
- Parents: `10`
- Average angles: `1.2`
- Average temporal tiers: `1.4`
- Average evolution roles: `1.4`
- Base report share: `0.063`
- Multi-angle parents: `1`
- Top parent angles: `3`
- Top parent children: `4`

### Failed gates

- **Real snapshot grade floor** — actual `D`, required `A/B/C`. Fix: Do not accept D/F real snapshot output. Improve child selection, parent rerank, or data intake.
- **Average visible angle count** — actual `1.2`, required `>= 1.4`. Fix: Angle-diverse child selection is not strong enough on real data.
- **Average temporal tier count** — actual `1.4`, required `>= 1.8`. Fix: C+E output should cover multiple event-time tiers, not only source buckets.
- **Average evolution role count** — actual `1.4`, required `>= 1.6`. Fix: C+E output should include distinct event evolution roles.
- **Weak parent ratio** — actual `0.9`, required `<= 0.5`. Fix: Too many weak trees remain. Repair or demote weak trees after diversity repair.

### Passed gates

- Parent cluster count: `10` / `>= 3`
- Base report share: `0.063` / `<= 0.55`
- Multi-angle parent count: `1` / `>= 1`
- Top parent angle count: `3` / `>= 2`
- Top parent child depth: `4` / `>= 2`
