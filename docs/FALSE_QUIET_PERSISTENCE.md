# False Quiet persistence boundary

False Quiet is campaign scenario `false-quiet@1` on `classic@1`. Its two authored paid-fog rulesets are `frontier-campaign-false-quiet-a@1` and `frontier-campaign-false-quiet-b@1`. The canonical mission preview is A. Both rulesets identify the same earned mission record; neither is an additional campaign progress key. A checkpoint and explicit history identity retain the actual ruleset. Restart reconstructs that variant instead of selecting a new one.

## Additive profile fence

Current profile writers request protocol **18**. The marker remains `ironroot.profile.v1`; its format, epoch and phases are unchanged. The five existing data keys remain campaign, trials, settings, history and battle under `ironroot.*.v1`. Campaign progress remains format 1; backups remain format 2 and explicit battle/game envelopes remain format 3. No normalization or migration runs as part of upgrading a ready profile marker.

`tests/fixtures/profile-session-v0261.js` is the exact protocol17 source captured before this change. SHA-256:

`7bd923eea5a7305454f84cb4f953ec8c5ddc458c2591406e229c421b53d665f5`

The production source differs only in the exported current version, accepted version list and error copy, and the explanatory protocol18 comment. The cross-tab barrier implementation is otherwise byte-identical. The source-comparison test enforces that constraint. The historical River Between source comparison now uses this frozen protocol17 fixture, preserving its original protocol16-to17 proof.

Already-open and reopened writers requesting protocols 1–17 reject the protocol18 marker before reading or writing any earned domain. This includes queued preferences, history, battle saves, campaign writes and backup imports. Future protocol markers, unfinished imports and unverified marker upgrades remain blocked. An absent or ready supported marker upgrades only after verified write/readback; earned bytes and unrelated storage are untouched.

The barrier is optimistic, not a localStorage transaction. Keep other tabs closed during import. A successful replacement fences current writers until reload; rollback restores exact prior bytes where storage permits. Failed or uncertain marker upgrades require reload.

## Tests and evidence

Run:

`node --test tests/false-quiet-profile.test.mjs tests/river-between-profile.test.mjs`

The new suite pins the historical source hash, verifies marker-only upgrades through protocol18, blocks every supported stale protocol before domain access, exercises actual open/reopened protocol17 writers and staged writes, and verifies failed/uncertain upgrades. It also covers exact five-domain backup replacement, every-domain throw-before/throw-after/drop rollback, and v0.7/v0.9 backup preservation.

Variant coverage independently checks A and B fog checkpoints, exact map/ruleset/scenario identity, explicit history, backup/import/re-export, same-variant restart and a single `false-quiet` earned record without changing older records or settings. These synthetic fixtures demonstrate persistence and admission, not gameplay balance or a naturally played victory.

Validation: the profile pair passed **19/19 tests** after campaign integration, including both False Quiet variants. The River incomplete-progress fixture omits False Quiet when its River prerequisite is absent and now expects False Quiet as the next mission after River completion.
