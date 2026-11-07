# Production flight tactical findings

1584 authored branches: 720 exact prototype-port cohort choices, 480 Long March cases and 384 bounded extension cases. 5904 exact restored/uninterrupted next-step comparisons. All legal-site, gold, cap and gross-cost assertions passed.

Report SHA-256: e736341ebd47fc672f1167f44d4fe048da729bc6432a20ae55d0e2924fe87604

Runtime: 195.527s; Node v24.22.1.

These unequal authored forces and fixed 110/180-second horizons are tactical evidence, not representative human win rates or campaign difficulty certification. Negative outcomes are retained.

## twin-span

No-response results versus paid destination archery, means over the original four seeds and both sides.

| Situation | Plan | Side mine HP damage / archery | Citadel HP / archery | Screen HP | Archery gross spend |
| --- | --- | ---: | ---: | ---: | ---: |
| open-supply | hold | 0 / 0 | 6000 / 6000 | 700 | 1225 |
| open-supply | shift | 380 / 0 | 6000 / 5362.5 | 700 | 350 |
| pressed-road | hold | 0 / 0 | 6000 / 0 | 117.32 | 350 |
| pressed-road | shift | 380 / 0 | 0 / 0 | 0 | 350 |
| baited-supply | hold | 0 / 0 | 5640.62 / 5619.2 | 700 | 1400 |
| baited-supply | shift | 0 / 0 | 5842.92 / 5142.69 | 700 | 175 |

## classic

No-response results versus paid destination archery, means over the original four seeds and both sides.

| Situation | Plan | Side mine HP damage / archery | Citadel HP / archery | Screen HP | Archery gross spend |
| --- | --- | ---: | ---: | ---: | ---: |
| open-supply | hold | 0 / 0 | 6000 / 6000 | 700 | 1400 |
| open-supply | north | 380 / 0 | 6000 / 5626 | 700 | 350 |
| open-supply | south | 380 / 0 | 6000 / 5630.25 | 700 | 350 |
| open-supply | alternate | 760 / 0 | 6000 / 3114.25 | 700 | 700 |
| pressed-road | hold | 0 / 0 | 6000 / 0 | 117.32 | 350 |
| pressed-road | north | 380 / 0 | 0 / 0 | 0 | 350 |
| pressed-road | south | 380 / 0 | 0 / 0 | 0 | 350 |
| pressed-road | alternate | 385.1 / 0 | 0 / 0 | 0 | 700 |
| baited-supply | hold | 0 / 0 | 5719.16 / 5714.4 | 700 | 1750 |
| baited-supply | north | 0 / 0 | 5940.5 / 5402.025 | 700 | 175 |
| baited-supply | south | 380 / 0 | 5714.4 / 4651.22 | 700 | 350 |
| baited-supply | alternate | 380 / 0 | 5852.44 / 1588.67 | 700 | 525 |

## long-march

No-response results versus paid destination archery, means over the original four seeds and both sides.

| Situation | Plan | Side mine HP damage / archery | Citadel HP / archery | Screen HP | Archery gross spend |
| --- | --- | ---: | ---: | ---: | ---: |
| open-supply | hold | 0 / 0 | 6000 / 6000 | 700 | 1400 |
| open-supply | north | 380 / 0 | 6000 / 5694 | 700 | 350 |
| open-supply | south | 380 / 0 | 6000 / 5655.75 | 700 | 350 |
| open-supply | alternate | 760 / 0 | 6000 / 3945.125 | 700 | 700 |
| pressed-road | hold | 0 / 0 | 6000 / 0 | 700 | 350 |
| pressed-road | north | 380 / 0 | 64.035 / 0 | 0 | 350 |
| pressed-road | south | 380 / 0 | 64.035 / 0 | 0 | 350 |
| pressed-road | alternate | 760 / 0 | 64.035 / 0 | 0 | 700 |
| baited-supply | hold | 0 / 0 | 5695.36 / 5695.36 | 700 | 1750 |
| baited-supply | north | 0 / 0 | 5942.88 / 5385.195 | 700 | 175 |
| baited-supply | south | 380 / 0 | 5695.36 / 4503.745 | 700 | 350 |
| baited-supply | alternate | 380 / 0 | 5885.76 / 3525.055 | 700 | 525 |

## Bounded extension: pressed-road situation

These rows compare Hold with one-road raids at 180 seconds. Rootwarden variants begin with 70 more gold of explicitly authored structures. Normal/Hard rows include that screen plus the same paid attacker policy. Citadel losses are branch counts in this situation, not balance win rates.

| Map | Variant | Plan | Mine damage | Citadel HP | Citadel losses / branches | Attacker gross spend | Defender gross spend |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| twin-span | rootwarden-screen | hold | 0 | 0 | 4/4 | 0 | 350 |
| twin-span | rootwarden-screen | shift | 0 | 0 | 4/4 | 0 | 350 |
| twin-span | paid-attacker | hold | 0 | 0 | 4/4 | 655 | 350 |
| twin-span | paid-attacker | shift | 95 | 5443.25 | 0/4 | 835.25 | 1356.25 |
| twin-span | normal-native-ai | hold | 0 | 0 | 4/4 | 655 | 1135 |
| twin-span | normal-native-ai | shift | 0 | 0 | 4/4 | 655 | 945 |
| twin-span | hard-native-ai | hold | 0 | 0 | 4/4 | 655 | 1135 |
| twin-span | hard-native-ai | shift | 0 | 0 | 4/4 | 655 | 1025 |
| classic | rootwarden-screen | hold | 0 | 0 | 4/4 | 0 | 350 |
| classic | rootwarden-screen | north | 0 | 0 | 4/4 | 0 | 350 |
| classic | rootwarden-screen | south | 0 | 0 | 4/4 | 0 | 350 |
| classic | paid-attacker | hold | 0 | 0 | 4/4 | 655 | 350 |
| classic | paid-attacker | north | 0 | 5579.25 | 0/4 | 835.25 | 1443.75 |
| classic | paid-attacker | south | 0 | 5587.75 | 0/4 | 835.25 | 1487.5 |
| classic | normal-native-ai | hold | 0 | 0 | 4/4 | 655 | 1260 |
| classic | normal-native-ai | north | 0 | 0 | 4/4 | 655 | 1207.5 |
| classic | normal-native-ai | south | 0 | 0 | 4/4 | 655 | 1207.5 |
| classic | hard-native-ai | hold | 0 | 0 | 4/4 | 691.75 | 1481.25 |
| classic | hard-native-ai | north | 0 | 0 | 4/4 | 655 | 1245 |
| classic | hard-native-ai | south | 0 | 0 | 4/4 | 655 | 1245 |
| long-march | rootwarden-screen | hold | 0 | 0 | 4/4 | 0 | 350 |
| long-march | rootwarden-screen | north | 0 | 0 | 4/4 | 0 | 350 |
| long-march | rootwarden-screen | south | 0 | 0 | 4/4 | 0 | 350 |
| long-march | paid-attacker | hold | 0 | 0 | 4/4 | 655 | 350 |
| long-march | paid-attacker | north | 0 | 5838.5 | 0/4 | 928 | 1968.75 |
| long-march | paid-attacker | south | 0 | 5838.5 | 0/4 | 928 | 1968.75 |
| long-march | normal-native-ai | hold | 0 | 0 | 4/4 | 655 | 1595 |
| long-march | normal-native-ai | north | 0 | 0 | 4/4 | 655 | 1435 |
| long-march | normal-native-ai | south | 0 | 0 | 4/4 | 655 | 1410 |
| long-march | hard-native-ai | hold | 0 | 0 | 4/4 | 889.5 | 1897.5 |
| long-march | hard-native-ai | north | 0 | 0 | 4/4 | 655 | 1516.25 |
| long-march | hard-native-ai | south | 0 | 0 | 4/4 | 655 | 1516.25 |

## Gate warning and counter timing

| Map | North/shift first warning | First landing | Paid destination-archery first action | Gross spend |
| --- | ---: | ---: | ---: | ---: |
| twin-span | 4.15 | 8.75 | 2.00 | 350 |
| classic | 4.15 | 8.40 | 2.00 | 350 |
| long-march | 8.90 | 13.15 | 2.00 | 350 |

Warning-to-transit observations differ by 1.95 seconds because the phase is first observed after the first .05-second warning tick; the full engine interval is forty ticks (2 seconds). Long March adds roughly 400/84 = 4.76 seconds of approach before combat delays. The actual shared gate positions are 1800/2200, not the old lab’s 1400/2600.

## Limits and counter interpretation

Authored starting forces are unequal; synthetic branch win/loss counts are not human balance estimates or difficulty certification. Fixed 110/180-second horizons may stop unfinished. After-step observers can miss a unit spawned and killed within the same step. First damage/death phases are observations, not complete causal attribution. Only first four wave traces are retained, with aggregate counts for all observed waves. Save checks compare first observed route phase/60-second next-step continuation, not every full replay. No human/hardware playtest.

Legal destination towers can stop raids after approach or arrival within normal physical range. The separate synthetic near-gateway tower test proves kernel targetability only, not legal direct transit placement. Air-capable units may intercept transit from either connected road within their normal attack range.

445 non-Hold comparisons have lower own-citadel or protected-screen HP than their exact Hold control. Every underlying branch and counterfactual is retained in report.json.
