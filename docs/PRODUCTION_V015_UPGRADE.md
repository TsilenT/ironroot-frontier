# Released 0.15 to flight 0.16 upgrade gate

Status: focused Node checks PASS; browser takeover cases UNRUN. No publishing or runtime changes are part of this evidence.

## Provenance

The fixture is the 46 runtime files (907,887 bytes) from the actual released public tree `3728e479b747cd360c01f154b1af94ab93fa421f`, not a generic protocol fixture or candidate rebuild. Released source merge: `f26b88106bed3d4932f5bf086cf21d5da18b5923`; tested source tree: `8e41d9b03a4cabbaa1768b1ba4d25257df5bf268`.

`qa/fixtures/production-v015/historical-manifest.json` is an unchanged copy of the release runtime manifest. SHA-256: `9011e995f6e8562afc994cb3dc270d209e91a9568c7a9a11955d2f8eda9c4d8f`. The helper pins that hash, exact file names, individual binary SHA-256s, and total byte count. All five WOFF2 files are copied as original bytes. Public repository README and CNAME are not runtime files and are not served as fixture assets.

Frozen paid-action policies are copied from that release's source, independently pinned:
- campaign-policies.mjs: `62ec228967ac6d3582379eaa01b76785e0aa6f7e0b3d2a18f0e918c9f1c2873b`
- onboarding-campaign-policies.mjs: `57ab268177cc6f695215df554a9c3608580ae0e6333929d5e1c54935c7138ed3`

## Four seeded profiles

These are deterministic automated persistence checkpoints, not human play or balance evidence. They are generated entirely with frozen v0.15 campaign/engine/codec modules. Progress is awarded by recordCampaignResult after genuine objective completion. Policies issue normal paid build/upgrade/cast commands; objective-aware 0.05-second ticks advance play. No resource, damage, winner, unit, or progress edits manufacture a victory. Settings are intentionally selected fixture preferences, not simulated user behavior. Nonempty history rows are derived from each completed run's actual identity, duration, kills, and builds; their timestamp is explicitly synthetic.

- fresh-opening: zero victories, stage 1 roster, Roadside Watch checkpoint.
- earned-ranged: Roadside Watch earned (43.85 seconds, 3 stars), stage 2 roster, Shield at the Fork checkpoint.
- earned-full: both opening victories earned (second 92.55 seconds, 3 stars), stage 3 roster, Open Three Roads checkpoint.
- saved-wings: six victories earned, 18 stars, stage 3 roster, revision-2 Wings of Ash checkpoint with a paid aerie. Additional completed durations: Open Three Roads 103.10, Emberwatch 37.20, Three Roads 93.95, Winter Stores 150.00 seconds. All earn three stars.

Each saved battle advances two seconds through the frozen engine after one normal paid building command. Serialized profile domains retain deliberate whitespace to catch unintended rewrites.

## Gates

Focused Node validator verifies exact historical bytes, distinct newer worker identity, current protocol 5, all five domains byte-for-byte during marker migration, unchanged save decode/backup/roster, and protocol-4 reads, writes, removes, imports and explicitly acknowledged recovery blocked both in a retained session and a newly opened old session. Saved Wings stays revision 2; a deliberate current launch becomes revision 3 with frontier-campaign-flight.

Four browser cases run in each existing phone, narrow-phone, landscape and desktop project: 16 cases total. Each creates an isolated unguessable v0.15 update session; checks actual worker/runtime hashes; advances the real worker; preserves an unrelated cache; loads the new app offline; verifies marker-only migration and old-client fences; resumes/reloads the old battle with exact bounded simulation replay; exports all domains; loads fonts; deliberately starts current flight gameplay; and reloads that new save. Wings explicitly accepts the new launch's teaching prompt. Attached evidence includes fixture pin, complete old/new shell hashes, earned results, roster, worker timing, fence outcomes and saves.

Commands:

- `node --test tests/production-v015-upgrade.test.mjs`
- `node qa/browser/validate-production-v015-upgrade.mjs`
- In qa/browser after dependencies are available: `npx playwright test production-v015-upgrade.spec.mjs --list`
- Cloud execution, still required: `npx playwright test production-v015-upgrade.spec.mjs`

Existing v0.12 fixtures and browser assertions are unchanged. The server validates both historical manifests before serving. The new v0.15 runtime is reachable only through the explicit update-build allowlist; there is no arbitrary filesystem route or mutable shared version switch.
