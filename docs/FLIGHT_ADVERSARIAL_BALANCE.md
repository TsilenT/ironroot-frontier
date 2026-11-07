# Independent flight balance review

Reviewed source: `598925cbfea60acc734513d05dc14eeafe80a57d`. The review used 966 paid skirmish simulations, 192 authored tactical branches and three defensive-stalemate controls. Policies waited five seconds at the opening and issued at most one purchase, volley or free flight order every five seconds. These are deterministic policy comparisons, not human win rates or a claim of complete balance.

## What the comparisons support

- Infantry first, then Rootwarden and ranged support won 34/36 sampled Normal/Hard games with volley, and 28/36 without. Building a lodge on every road before support won only 10/54 across the initial difficulty sample. These are different opening policies; they do not isolate unit strength. A global Rootwarden buff would be premature.
- Screened one-mine openings won 34/36 with volley and 27/36 without. All 72 follow-up economic runs purchased a mine, and 57 repaid its cost before the match ended. No-mine approaches stayed competitive.
- Against a paid anti-air composition, Hold won 5/24 and raids won 6/24; both lost all eight Twin Span cases. In 120 paired authored raid comparisons, 29 increased off-road supply damage, while 78 left the attacker's citadel worse off. The categories overlap. Flight is a situational choice with a real defensive cost, not an automatic upgrade.
- Warning plus crossing takes roughly 4.26 seconds on three-road maps and 4.62 seconds on Twin Span, before approach time. Crossing units cannot attack and remain vulnerable to anti-air.
- Paid tower-versus-tower controls remained unresolved at 900 seconds on all three maps while damage continued. Both citadels retained 6,000 HP. This is allowed strategic stalemate, not evidence of a frozen simulation or an infinite deadlock.

## Unresolved opponent limitation

Concentrated barracks won all 54 initial volley-enabled comparisons. Other infantry-first strategies also won consistently, so this does not establish barracks as the uniquely dominant player choice. The native AI currently neither buys Warden lodges nor issues flight orders; it only reacts to committed launched destinations. Difficulty labels should not be treated as opponents using the entire new toolkit.

The next gameplay iteration should investigate honest, paid AI use of these tools and concentration response, then rerun preserved comparisons. Keep Hold useful, preserve anti-air counterplay and viable economy, and retain open-ended strategic stalls. Do not change global unit stats merely to make expensive opening mistakes safe or to force a single preferred army.

## Verification boundary

Twenty-three selected engine/parity/evaluator tests passed. Two browser paid-flight cases reached repeated order-state checks but failed a later Space/focus assertion, leaving subsequent checks unexecuted. The full exact browser gate is tracked separately in FLIGHT_FULL_GATE_RECONCILIATION.md. None of these results certifies later gameplay changes or physical-device feel.

The review's evidence was retained as `ironroot-flight-balance-598925c.zip` with paid action histories, results and source hashes. This next local repair changes presentation and test oracles, not the reviewed engine, rules, campaign formations or AI. Further balance work must identify its own exact source and test policies.
