# Post-outcome measurement clarification

Initial run source is 92ce6cc1015349b2bbd220f1e093c2b892ef503c; its
results.json remains unchanged. All 108 assigned cases completed.

Several bridge games ended before the first 120-second post-decision checkpoint.
To execute the preregistered earlier-common-terminal comparison, study.mjs now
exports its paired runner and accepts observation-only checkpoint ticks.
bridge-replay.mjs repeats exactly the original 24 bridge cases and observes each
triplet at its earliest terminal tick. Assertions require identical actions,
ledgers and final engine hashes to the first run. There are 108 distinct games
and 24 measurement replays, no additional strategies or parameter settings.

Summary reporting was corrected to separate unsuccessful attempts from purchased
but unused HP: a rejected purchase cannot be counted as an unused 600-HP purchase.
No cost, timing, policy, combat, opening, support, or selection rule changed.
