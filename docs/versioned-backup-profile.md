# Versioned backup and profile boundary

Backup exports remain version 1 when all domains fit the historical schemas. Version 2 is selected for explicit history identities, engine/envelope v3 battles, or progress for the two new introductory mission IDs. Parsing accepts both schemas; v1 rejects those new domain forms rather than erasing their identities. Both versions preserve the five existing storage domains, 1 MiB cap, complete-replacement semantics, verified readbacks, and best-effort rollback reporting.

All playable battle admission is delegated to `battle-codec.js`. No second mission/engine validator lives in backup. `history-codec.js` exports `validateHistory` and `validateHistoryRow` for backup and pre-write callers. New history records carry a validated `identity` and cannot also carry legacy `mapId`, `campaignId`, or `challengeId`. Their time/counter bounds come from the pinned ruleset, with authored scenario deadline and difficulty checks. Legacy rows use the unchanged 10,000-second and 1-billion counter ceilings.

`createProfileSession` accepts required protocol 3. Construction upgrades only ready older markers and grants access only after exact readback. Domain bytes are untouched by an upgrade. Protocol-2 clients fail closed upon observing protocol 3. Explicit recovery can repair corrupt markers but cannot overwrite a recognizable marker from an unknown newer protocol. Failed, restoring, unverified, or future markers never grant normal write access.

Focused coverage: `tests/versioned-backup-profile.test.mjs`. Existing backup/import recovery suites remain important regression gates. Historical assertions rejecting backup v2 or permitting recovery to downgrade a version-99 profile are intentionally superseded, not compatibility requirements.
