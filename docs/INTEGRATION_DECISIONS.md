# Current integration decisions

Production is v0.14.1, source merge `27e9477e4abb8188f59e71e0663486507a34603d`. This local v0.15.0 checkout is not published. The previous v0.13 decisions and measured gate remain archived in [INTEGRATION_DECISIONS_V013.md](INTEGRATION_DECISIONS_V013.md).

## Selected for this combined batch

- **Enforced campaign progression:** three new authored openings use one, two, then three roads and real 2 → 5 → 8 building rosters. Rootwardens arrive in the second battle and in new revision-two continuation attempts. Ordinary prices, alternative victories and optional stars remain. Old saved attempts are not rewritten. See CAMPAIGN_ROSTER_CONTRACT.md and CAMPAIGN_PROGRESSION_CONTENT.md.
- **Navigation PR #6**, source `38108cb9188b6c2c09d7b5543b1a65afc2b10433`: adapted to the real nineteen-mission progression and separate legacy lessons, rather than merging its older optional-intro assumptions. Briefings prioritize flavor and goals; Story → Chapter → Mission navigation and expandable rules remain available.
- **Pause/options PR #5**, amended source `704d74177186d53fddaf9cd6901e04f37fe6ecb4`: includes the reviewed ownership-race and opener-focus fixes. Local restart calls `createCampaignRestart` to preserve the active scenario and roster. The fourth startup argument separates fresh-restart semantics from scenario revision.
- **Teaching PR #7**, source `f4d4c0668360b3b89cdce75ab3e594a901b54977`: adapted locally to the actual opening. Planning freezes the simulation while retaining real paid construction, and explicit resume starts combat. Guidance must recommend legal positions, put defensive towers ahead of production when possible, and never silently unpause safety holds. Component evidence is not combined browser evidence.
- **Released phone and desktop inputs:** retain the exact visible-viewport repair, 44px controls, short-screen layouts, fullscreen support detection, middle-button panning and battlefield right-click cancellation. New menus must not regress these.

## Not included by implication

- **Cross-lane orders PR #2** (`4581245af7e23e7c3b5eb905d4a29c663006e0ea`) remains a separate gameplay proposal for the next selected integration. The first fixed-crossing experiment was ineffective; that is not a rejection of all cross-lane play. Neither crossing system is currently live.
- **Longer procedural music** remains unselected until an actual listening review. PCM/mute/clipping tests establish technical behavior, not subjective music quality.
- **Alternate AI personalities/objective variants** remain research. Keep alternatives that create clear strategic choices; do not replace the default solely to eliminate every rush or stall. Stalls caused by a player's composition can be legitimate.
- Network PvP, physical-device certification, native packaged desktop behavior, full nonvisual battlefield access and Steam/store readiness remain separate work. No store, signing or legal publishing action is authorized by this integration.

## Review and release boundary

The user authorized draft PRs and merging work judged ready. The original source PR ancestry should remain traceable through one coherent integration candidate. Review source conflicts and test actual combined behavior before merge; a component's passing suite does not certify the combined build. Do not publish automatically just because a branch exists.

The final gate must cover paid planning and explicit resume, all three opening rosters, Continue/replay/restart identities, protected objectives, phone geometry, pause/options focus, legacy saves/backups and stale-tab ownership. Record exact executed checks, failures and exclusions. No new candidate is called live until the tested runtime is deliberately deployed and production smoke verified.
