# Flight command tactical evaluation

720 authored branches; four spread seeds; both sides; two and three roads; five defender responses; 2640 restored/uninterrupted next-step comparisons. Horizon 110 seconds, fixed step .05 seconds.

Commands apply before the next simulation step, and defenders decide every one simulated second before that step. The browser uses the same cadence. Each branch starts from the same authored setup, seed and side as its hold control. These authored free forces are unequal and are not a skirmish or campaign difficulty sample. Player initial investment is 955 gold; both remaining treasuries are exactly 420 gold. Live flight orders cost zero; defender purchases and rallies pay normal prices/cooldowns. Gross paid costs are recorded separately from net gold changes, which can include immediate kill bounties.

Seeds: 51001, 3052302604, 4010181097, 2367780941. Runtime: 37.103s.
Report SHA-256: ff91f61e92ceab0de3e9f8cbd889b127fde9155d5b8e9ca525e474d589e62f41

Engine SHA-256: 52f5475ff3506ecc991797390a893b5bf4fceef6fdc486fb104f8eb5c6598d42

## command-two-roads

Mean off-road marked-mine HP damage and original-road costs. “AA” means destination-archery response; the other value means no response.

| Situation | Plan | Side-mine damage / AA | Citadel HP / AA | Screen HP | Original-road threat unit-seconds | AA spend |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| open-supply | hold | 0 / 0 | 6000 / 6000 | 700 | 0 | 1225 |
| open-supply | shift | 380 / 0 | 6000 / 5396.5 | 700 | 0 | 350 |
| pressed-road | hold | 0 / 0 | 6000 / 0 | 117.32 | 104.912 | 350 |
| pressed-road | shift | 380 / 0 | 0 / 0 | 0 | 875.325 | 350 |
| baited-supply | hold | 0 / 0 | 5640.62 / 5619.2 | 700 | 0 | 1400 |
| baited-supply | shift | 0 / 0 | 5842.92 / 5150.68 | 700 | 0 | 175 |

## command-three-roads

Mean off-road marked-mine HP damage and original-road costs. “AA” means destination-archery response; the other value means no response.

| Situation | Plan | Side-mine damage / AA | Citadel HP / AA | Screen HP | Original-road threat unit-seconds | AA spend |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| open-supply | hold | 0 / 0 | 6000 / 6000 | 700 | 0 | 1400 |
| open-supply | north | 380 / 0 | 6000 / 5630.25 | 700 | 0 | 350 |
| open-supply | south | 380 / 0 | 6000 / 5626 | 700 | 0 | 350 |
| open-supply | alternate | 760 / 0 | 6000 / 3090.875 | 700 | 0 | 700 |
| pressed-road | hold | 0 / 0 | 6000 / 0 | 117.32 | 104.912 | 350 |
| pressed-road | north | 380 / 0 | 0 / 0 | 0 | 854.675 | 350 |
| pressed-road | south | 380 / 0 | 0 / 0 | 0 | 854.675 | 350 |
| pressed-road | alternate | 385.1 / 0 | 0 / 0 | 0 | 854.675 | 700 |
| baited-supply | hold | 0 / 0 | 5719.16 / 5714.4 | 700 | 0 | 1750 |
| baited-supply | north | 0 / 0 | 5959.54 / 5416.56 | 700 | 0 | 175 |
| baited-supply | south | 380 / 0 | 5714.4 / 4638.725 | 700 | 0 | 350 |
| baited-supply | alternate | 380 / 0 | 5859.58 / 1776.69 | 700 | 0 | 525 |

## Counter choice example

Three roads, open-supply, north raid: all five defender policies; means across seeds and sides.

| Defender response | Side-mine damage | Defender spend | Landings | Flying survivors | Response from launch, sec |
| --- | ---: | ---: | ---: | ---: | ---: |
| none | 380 | 0 | 14 | 7.75 | — |
| destination-archery | 0 | 350 | 10 | 2 | 0.75 |
| destination-tower | 0 | 220 | 14 | 3 | 0.75 |
| origin-archery | 380 | 1356.25 | 14 | 4 | 0.75 |
| rally | 380 | 365.625 | 14 | 4.625 | 0.75 |

## Reading the evidence

Side-road raids take exposed supply targets; staying can preserve flying support for the original ground road. In the pressed-road situation, the hold branch preserves the citadel without a defender response, while shifting trades that defense for one supply mine and loses the citadel. Visible prepared anti-air makes the northern baited target a poor raid; the southern road is exposed. Destination archers stop the exposed-mine raids but cost gold and create their own ground pressure. Alternating raids reach two exposed mines in the no-response situation and induce counters on two roads.

Counts of launches, casualties, first-damage phases and death phases are **observed**, not a complete casualty ledger. The observer samples after each fixed step and can miss a unit born and killed inside that step. Immediate rally deaths observed before the next filter are counted at their actual observed phase. First four wave traces are retained per branch; all observed waves contribute to counts. Negative response-from-warning means the defender acted on the publicly committed launch route before the gateway warning.

The report retains all branches and negative counterfactuals. The 110-second horizon, fixed authored armies, simple paid defender bots and absence of paid attacker reinforcements limit the result. This is tactical evidence, not human playtest or balance certification.
