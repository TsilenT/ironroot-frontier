# The Hammer Turns (v0.32)

Chapter 8's third mission follows Salt in the Stores. Exact identity: the-hammer-turns@1 / frontier-campaign-hammer-turns@1 / classic@1. Normal AI, public seed 8303, 600-second enemy-core objective, both cores 6,000 HP. Starting gold is 1,100/320; income 7.5/5. Optional medals are 180 seconds and 4,500 HP. A 1-HP victory remains valid; own loss/draw takes precedence and normal 300-second escalation remains.

The enemy pays ordinary prices for sustained supported siege concentration and ordinary defensive repairs. Actual construction and troops provide the warning; no scheduled turn, free unit, subsidy or hidden stat buff is added. The player may confront the road or attack elsewhere. A 45-second lock and distinct 20-second collapse cooldown preserve commitment without refresh on restore. AI decisions retain two construction/upgrade attempts and at most one offensive attempt.

Campaign: 30 missions / 90 stars. Chapter 7 remains three missions. Chapter 8 has three of at least five planned missions; Chapters 9 and 10 also require at least five distinct missions and are not admitted here.

## Reproducible checks

- npm test
- npm run check
- npm run check:release
- In qa/browser: npm run check (Node/static fixture preflight, not browser execution).

The retained tests generate paid public-seed fixtures in temporary directories. qa/hammer-turns/simulate.mjs writes the declared development matrix to a new explicit external output directory; audit.mjs checks its records. Generated results, logs, screenshots and reviews are not bundled in this lean repository. All previous full evidence is preserved separately. Public/native/Restart use authored 8303; other constructor seeds are QA stress openings, not randomized public starts. No new protected seeds or policy tuning are introduced by this packaging change.

Runtime and validation execution bytes match the previously validated candidate. Exact lean-tree checks and parent binding are recorded outside the source payload. Release still requires independent integrity review, exact-head CI and coordinator approval. See [persistence](HAMMER_TURNS_PERSISTENCE.md).
