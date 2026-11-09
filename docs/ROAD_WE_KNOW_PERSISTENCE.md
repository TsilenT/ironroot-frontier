# The Road We Know persistence boundary (reconstructed)

This protocol19 change was reconstructed from verified v0.27.0 main commit ddb47b2 and recovered source-edit instructions. Lost workspace validation is not evidence for this rebuilt artifact.

The authored mission identity is `the-road-we-know@1`, ruleset `frontier-campaign-road-we-know@1`, map `twin-span@1`. False Quiet is its prerequisite. The mission uses the full earned roster, paid adaptive enemy and a finite 600-second deadline. The expanded main catalog totals 26 missions and 78 stars. Save, history and restart retain the exact authored identities.

## Profile fence

Current writers request protocol19. Marker `ironroot.profile.v1`, its format, epoch and phases remain unchanged. The five domains remain `ironroot.campaign.v1`, `ironroot.trials.v1`, `ironroot.settings.v1`, `ironroot.history.v1` and `ironroot.battle.v1`. Campaign format remains 1, backup format 2 and explicit battle/game envelopes 3. Ready-marker upgrades do not read or migrate earned domain bytes.

The exact protocol18 fixture is `tests/fixtures/profile-session-v0270.js`, SHA256 `0371903b4df5d8227089c4e3e38fa155152cef485f201088734767cb2b12a4bc`. It matches the independently frozen verified baseline byte for byte. Production differs only in exported version, accepted version list, corresponding error copy and explanatory comment. The barrier algorithm is unchanged. The historical False Quiet source proof compares frozen17 against frozen18.

Open and reopened protocols1–18 must reject protocol19 before accessing any domain. Future markers, unfinished imports, failed upgrades and unverifiable readback remain blocked. Successful replacement fences existing current writers until reload. Verified rollback preserves prior bytes where storage permits. This is an optimistic cross-tab barrier, not an atomic localStorage transaction; keep other tabs closed during import.

## Reconstructed verification

Run `node --test tests/*profile*.test.mjs` against the completed rebuilt runtime. The Road suite checks marker-only upgrades, actual frozen18 clients, all older admitted protocols, queued writes, failed upgrades, five-domain replacement, throw-before/throw-after/drop rollback, old backups, unchanged earned records, explicit history, exact checkpoint round-trip and same-identity restart. Historical incomplete-progress fixtures exclude descendants whose prerequisites are absent.

Fresh preliminary checks passed: source comparison against the independent baseline and standalone open/reopened stale-client fencing for protocols1–18. The first reconstructed full profile run occurred before mission integration and failed catalog/unknown-mission assertions. Fresh post-integration verification on the combined reconstruction passed all 229 tests in `node --test tests/*profile*.test.mjs`: 229 passed, 0 failed, 0 skipped (1716.918834 ms). This is profile-suite evidence only, not the overall repository aggregate. Synthetic fixtures demonstrate persistence and admission, not balance or a naturally played victory. No publication is performed by this work.
