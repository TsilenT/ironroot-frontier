# Paid bridge-income comparison

The fixed preregistration completed **36/36 games** once per measured source: three maps, three paid policies, mirrored player sides, enabled/disabled, seed 61001, normal native AI, open-ended. The bound was 600 simulated seconds. Every game ended naturally before the bound; no winner was forced and no reward or policy was tuned. This is synthetic engine evidence, not human win rates.

Results: [study-results.json](study-results.json); preregistration: [study-plan.json](study-plan.json); reproducible runner: [paid-study.mjs](paid-study.mjs). Plan SHA-256: `46745fdac69dd219ff2da2d17489b3fad6e3435db84d85dc81b08c6db1e8345c`. Result SHA-256: `5dfb67ac7c5ff866148fded5782af0ae5f25de77ad5cab5567936a0bf127edd0`. Source hashes are recorded in both result and summary JSON. The summary was generated with current-source match **false**.

| Policy | Mode | Player wins | AI wins | Ongoing | Median duration | Range |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| concentrated-rush | disabled | 6/6 | 0/6 | 0 | 103.325s | 94.55–151.9s |
| concentrated-rush | enabled | 5/6 | 1/6 | 0 | 98.7s | 94.2–216.55s |
| screened-mixed-mine | disabled | 0/6 | 6/6 | 0 | 97.85s | 96.2–138.7s |
| screened-mixed-mine | enabled | 0/6 | 6/6 | 0 | 98.25s | 96.2–123.55s |
| air-and-rootwarden | disabled | 0/6 | 6/6 | 0 | 113.65s | 112.45–149.2s |
| air-and-rootwarden | enabled | 0/6 | 6/6 | 0 | 107.475s | 105.85–136.85s |

## Actual income feedback and honest costs

457 accepted paid actions and 13040 rejected calls were audited. Both sides paid the engine prices; rejected calls changed no gold. Initial gold + base + living mines + kill bounty + actual bridge receipts − spending + refunds matched both sides at every step, with maximum residual 1.046e-11 gold. The observed map-wide bridge rate reached, and never exceeded, 0.5 gold/s. 121 strict restore and live-versus-restored next-step comparisons passed.

Enabled player bridge receipts ranged 0–19.441667 gold (median 0); AI receipts ranged 0–42.65 (median 33.304167). At 90 seconds the medians were 0 player and 19.091667 AI. The largest bridge share of gold earned after the starting allocation was 7.30%.

The bonus changed actual purchasing times: Classic rush bought its later barracks at 48.5s enabled versus 49.5s disabled; against the air/Rootwarden policy the AI bought its first archery at 34.1s versus 39.45s. There were 16 player and 32 AI commands that current gold minus cumulative bridge receipts could not have funded, holding all other recorded transactions fixed. That last check is a ledger diagnostic, not a full causal counterfactual; divergent spawning, combat and RNG consumption also affect later decisions.

## Ownership and participation

171.645833 of 532.066667 total bridge gold (32.26%) arrived while an owned bridge was empty. The longest uninterrupted empty period was 5.7s, and 1 enemy ground recapture occurred. Owners were never cleared without recapture. This does not prove indefinite absence; that belongs to the pure contracts.

All 12 air/Rootwarden cases produced real paid units: 5–7 gryphons and 6–11 Rootwardens on the scripted side, with 109–190 gryphon attacks and 44–62 Rootwarden attacks. No isolated air-only denial occurred naturally; the unit contract tests must cover it.

## Adverse result and snowball limits

One paired outcome changed adversely for the scripted player: Long March rush on side 1 won at 151.9s disabled and lost at 216.55s enabled. Its first changed purchase was a barracks 0.5s earlier. It captured road 2 at 28.8s, retained it until enemy ground recapture at 141.8s, and ultimately received 17.2 bridge gold versus the winning AI’s 14.941667. At 90s the player led army count and bridge receipts while citadels were tied. This is a real sensitivity result, retained rather than tuned away; it is not a reward runaway in favor of the early bonus leader.

At 90s, 12 games had a citadel-health leader and 6 were tied. All 12 non-tied leaders won; the early payout leader won 17/18, as did the final payout leader. The extra income therefore largely went to already stronger field positions in this sample. Early capture and paid timing feedback can amplify advantage; this bounded run neither proves balance nor excludes longer-run snowball. The fixed reward remained small relative to base income and no mechanical cap/ledger/save failure appeared.

| Map | Policy | Player side | Disabled outcome / seconds | Enabled outcome / seconds | Duration change | Player / AI bonus |
| --- | --- | ---: | --- | --- | ---: | ---: |
| classic | concentrated-rush | 0 | player-win / 94.55 | player-win / 94.2 | -0.35s | 11.441667 / 0 |
| classic | concentrated-rush | 1 | player-win / 103.1 | player-win / 98.15 | -4.95s | 12.1 / 0 |
| classic | screened-mixed-mine | 0 | ai-win / 97.2 | ai-win / 96.55 | -0.65s | 0 / 33.391667 |
| classic | screened-mixed-mine | 1 | ai-win / 96.2 | ai-win / 96.2 | 0s | 0 / 33.216667 |
| classic | air-and-rootwarden | 0 | ai-win / 112.45 | ai-win / 107.05 | -5.4s | 0 / 26.483333 |
| classic | air-and-rootwarden | 1 | ai-win / 112.55 | ai-win / 105.85 | -6.7s | 0 / 25.883333 |
| long-march | concentrated-rush | 0 | player-win / 136.75 | player-win / 145.45 | +8.7s | 19.441667 / 0 |
| long-march | concentrated-rush | 1 | player-win / 151.9 | ai-win / 216.55 | +64.65s | 17.2 / 14.941667 |
| long-march | screened-mixed-mine | 0 | ai-win / 138.7 | ai-win / 122.7 | -16s | 0 / 37.108333 |
| long-march | screened-mixed-mine | 1 | ai-win / 124.95 | ai-win / 123.55 | -1.4s | 0 / 37.533333 |
| long-march | air-and-rootwarden | 0 | ai-win / 143.4 | ai-win / 134.7 | -8.7s | 0 / 33.541667 |
| long-march | air-and-rootwarden | 1 | ai-win / 149.2 | ai-win / 136.85 | -12.35s | 0 / 34.283333 |
| twin-span | concentrated-rush | 0 | player-win / 95.05 | player-win / 95.65 | +0.6s | 17.525 / 0 |
| twin-span | concentrated-rush | 1 | player-win / 103.55 | player-win / 99.25 | -4.3s | 18.425 / 0 |
| twin-span | screened-mixed-mine | 0 | ai-win / 97.95 | ai-win / 98.75 | +0.8s | 0 / 42.65 |
| twin-span | screened-mixed-mine | 1 | ai-win / 97.75 | ai-win / 97.75 | 0s | 0 / 42.15 |
| twin-span | air-and-rootwarden | 0 | ai-win / 113.95 | ai-win / 107.7 | -6.25s | 0 / 37.4875 |
| twin-span | air-and-rootwarden | 1 | ai-win / 113.35 | ai-win / 107.25 | -6.1s | 0 / 37.2625 |

No native browser, physical device, hard/easy difficulty, multiple-seed balance, extended stalemate, or timed-decay claim follows from this comparison. The pure contracts and focused native UI tests are separate evidence. The earlier presence/lease shadow study was not used as balance evidence.
