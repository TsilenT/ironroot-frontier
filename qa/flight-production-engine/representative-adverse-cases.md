# Representative adverse production cases

All 445 adverse HP comparisons are preserved in outcome-ledger.json. The ledger includes parameters, absolute Hold/raid outcomes, paid costs and first warning/landing/counter timings, without full trajectories. The complete 15 MB report is retained locally as report.json, not intended for the runtime/source-upload manifest. Tests import the small evaluator modules and do not read that report.

Full report SHA-256: e736341ebd47fc672f1167f44d4fe048da729bc6432a20ae55d0e2924fe87604

Reproduce the full evidence and compact ledger:

```
node qa/flight-production-engine/evaluation.mjs --output qa/flight-production-engine/report.json && node qa/flight-production-engine/summarize.mjs
```

The report hash identifies this retained run. A reproduced run has a different elapsed-time field and may therefore have a different full-file hash; compare source hashes and deterministic case content. No tuning is implied by these authored losses.

| Cohort / variant | Map / situation / response | Seed / side / plan | Citadel HP raid / Hold | Screen HP raid / Hold | Side mine damage raid / Hold | Gross attacker spend raid / Hold | Gross defender spend raid / Hold | First warning / landing / counter (raid sec) |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| prototype-port | classic / pressed-road / none | 51001 / 0 / north | 0 / 6000 | 0 / 0 | 380 / 0 | 0 / 0 | 0 / 0 | 4.15 / 8.4 / none |
| long-march | long-march / pressed-road / none | 4010181097 / 1 / north | 512.28 / 6000 | 0 / 700 | 380 / 0 | 0 / 0 | 0 / 0 | 8.9 / 13.15 / none |
| prototype-port | classic / open-supply / destination-archery | 51001 / 0 / alternate | 3212 / 6000 | 700 / 700 | 0 / 0 | 0 / 0 | 700 / 1400 | 4.15 / 8.4 / 2 |
| normal-native-ai | twin-span / open-supply / native-ai | 51001 / 0 / shift | 5150 / 6000 | 0 / 910 | 306 / 0 | 977 / 977 | 1820 / 1510 | 4.15 / 8.75 / 0.05 |
| hard-native-ai | twin-span / open-supply / native-ai | 51001 / 0 / shift | 0 / 6000 | 0 / 910 | 204 / 0 | 655 / 977 | 1450 / 1465 | 4.15 / 8.75 / 0.05 |

In the no-response Long March north-raid cohort, seven of eight cases lose outright; the remaining seed 4010181097 / side 1 case is unfinished at 110 seconds with 512.28 citadel HP. Its cohort mean 64.035 HP is not the HP of a representative survivor and does not imply a victory. Native AI can act before a launch; a negative delay or an early first counter does not mean it read a future plan. These are unequal authored starting forces, with fixed horizons and a simple paid attacker script. The full report preserves negative and positive cases; no human-balance or difficulty claim follows from these rows.
