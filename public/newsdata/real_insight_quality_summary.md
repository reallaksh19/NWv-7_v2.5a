# Real Insight Snapshot Quality

- Status: **PASS**
- Reason: -
- Grade: `D`
- Parents: `10`
- Average angles: `1.4`
- Average temporal tiers: `1.8`
- Average evolution roles: `1.8`
- Base report share: `0.09523809523809523`
- Multi-angle parents: `4`
- Weak parents: `6`
- Story count: `695`
- Source groups: `9`
- Content hash: `1b133bf38f3d86f9`

## Top parents

| # | Headline | Children | Angles | Weak | Score |
|---:|---|---:|---|---|---:|
| 1 | Tehran targets Bahrain, Kuwait after US strikes and limits Iran's oil sales over ship attacks | 2 | fact_update, base_report | NO | 0.6934967197849984 |
| 2 | New U.S. attacks on Iran were absolutely necessary, NATO chief says | 2 | market_reaction, official_response | NO | 0.6052599999999999 |
| 3 | 'Lust for murder': German doctor who killed 15 patients gets life term; suspected in 76 more deaths | 2 | base_report, fact_update | NO | 0.59211 |
| 4 | BREAKING / Lawrence Bishnoi, Goldy Brar Charged In US Over Killing Of Hardeep Singh Nijjar / News18 - News18 | 2 | official_response, fact_update | NO | 0.5765933333333333 |
| 5 | Nuvama, Cushman & Wakefield-backed realty fund raises Rs 4,000 cr | 2 | fact_update | YES | 0.7666133864516651 |
| 6 | Woman suspected of Monaco bomb attack found dead in Ukraine | 2 | fact_update | YES | 0.6741467197849984 |
| 7 | Share Market Live, Share Market Today: Latest Share Market News, Share Market Live Updates on The Economic Times - The Economic Times | 3 | fact_update | YES | 0.6438820680115994 |
| 8 | Baruipur rape-murder case: One key accused killed in police encounter | 2 | fact_update | YES | 0.6325800531183317 |
| 9 | Trump says ceasefire is 'over' after US and Iran trade strikes | 2 | official_response | YES | 0.5492732802150018 |
| 10 | Trump's Board of Peace planning pilot humanitarian zone in Gaza, official says | 2 | official_response | YES | 0.5195933333333334 |

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
- Base report share: `0.095`
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
- Base report share: `0.095` / `<= 0.55`
- Multi-angle parent count: `4` / `>= 1`
- Top parent angle count: `2` / `>= 2`
- Top parent child depth: `2` / `>= 2`
