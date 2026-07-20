# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.6`
- Average evolution roles: `1.5`
- Base report share: `0.11764705882352941`
- Multi-angle parents: `3`
- Weak parents: `7`
- Story count: `444`
- Source groups: `9`
- Content hash: `37689817e498c381`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | Sonam Wangchuk’s wife moves Delhi HC, seeks his transfer to private hospital | 4 | base_report, official_response, investigative_detail | NO | 0.6714954599824133 |
| 2 | Safdarjung Hospital | 2 | base_report, reaction_public | NO | 0.6874967197849983 |
| 3 | Iran's Supreme Leader says U.S. breaches show Trump's signature is 'worthless' | 2 | market_reaction, official_response | NO | 0.6265800531183316 |
| 4 | IMA suspends July 20 strike after Bombay HC stays Shiv Sena corporator's bail | 2 | official_response | YES | 0.6724967197849983 |
| 5 | US launches ninth consecutive day of strikes on Iran as another American confirmed killed | 2 | official_response | YES | 0.60551 |
| 6 | Yes Bank shares drop 4% after Q1 results. What are Nuvama, other brokerages saying? | 1 | market_reaction | YES | 0.7226911614783158 |
| 7 | Axis Bank shares fall 5% after Q1 earnings fail to cheer D-Street. What brokerages say | 1 | market_reaction | YES | 0.7226911614783158 |
| 8 | HDFC Bank shares fall 5% after Q1 results. Should you buy, sell or hold the stock? | 1 | market_reaction | YES | 0.7226911614783158 |
| 9 | Axis Bank Standalone Profit Soars 23% in Q1 | 1 | fact_update | YES | 0.7226911614783158 |
| 10 | ICICI Bank net profit jumps 16% YoY to Rs 14,805 crore | 1 | fact_update | YES | 0.7226911614783158 |

## Warnings

- Real snapshot still produces low Insight grade.

## Real Snapshot Ratchet Gate

- Status: **FAIL**
- Gate version: `real-insight-snapshot-ratchet-v1`
- Grade: `D`
- Score: `18`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.6`
- Average evolution roles: `1.5`
- Base report share: `0.118`
- Multi-angle parents: `3`
- Top parent angles: `3`
- Top parent children: `4`

### Failed gates

- **Real snapshot grade floor** — actual `D`, required `A/B/C`. Fix: Do not accept D/F real snapshot output. Improve child selection, parent rerank, or data intake.
- **Average temporal tier count** — actual `1.6`, required `>= 1.8`. Fix: C+E output should cover multiple event-time tiers, not only source buckets.
- **Average evolution role count** — actual `1.5`, required `>= 1.6`. Fix: C+E output should include distinct event evolution roles.
- **Weak parent ratio** — actual `0.7`, required `<= 0.5`. Fix: Too many weak trees remain. Repair or demote weak trees after diversity repair.

### Passed gates

- Parent cluster count: `10` / `>= 3`
- Average visible angle count: `1.4` / `>= 1.4`
- Base report share: `0.118` / `<= 0.55`
- Multi-angle parent count: `3` / `>= 1`
- Top parent angle count: `3` / `>= 2`
- Top parent child depth: `4` / `>= 2`
