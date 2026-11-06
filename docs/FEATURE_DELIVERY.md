# Feature delivery, not branch count

As of 6 November 2026. A branch, test fixture or passing simulation is not a shipped feature.

## Live v0.14.1

The public game is built from source merge `27e9477e4abb8188f59e71e0663486507a34603d`.

- Campaign opens first. Shared building controls carry hints. Partial-star wins offer Replay.
- There are sixteen main missions with destruction, protection, economy and survival objectives, plus two **optional** one-/two-road introductions.
- The small introduction build bars are **recommendations**, not earned technology. All buildings restores the old full roster immediately.
- Rootwarden and its lodge are available in **fresh skirmishes only**. Authored campaign missions still use their legacy roster.
- Gryphons fly but **do not change roads**.
- Original canvas/vector art, the existing short procedural score, AI difficulties, three skirmish maps, protected-building HP controls and save/backup/offline safety are present.

## Also shipped in v0.14.1

The release includes PR #1’s restrained combat poses, grouped objective-danger warnings and the intro Resume-label correction. It also corrects stale release documentation. It does not add campaign tanks, earned unlocks or lane changes.

The release also repairs the visible-viewport phone pause, short-screen control/text layout, and adds middle-mouse pan, battlefield right-click cancellation and browser-supported fullscreen. Its exact source passed 898 Node tests plus one optional skip and 222 selected Chromium checks with 30 intentional exclusions. Physical-phone/PWA and listening certification remain outstanding.

## Current gameplay implementation

One coordinated v0.15.0 campaign integration is local and awaiting its exact cloud gate:

1. New-player campaign starts with a real one-road, two-building mission.
2. A two-road mission introduces the Rootwarden screen, mines and towers: five usable buildings, with the usual costs.
3. A three-road mission opens the eight-building roster. Later new campaign battles retain the earned tank, rather than dropping it again.
4. Engine construction and saved-battle admission enforce the roster. A UI toggle cannot bypass it. Replays may use a higher earned tier; a resumed battle retains the roster it saved.
5. Existing campaign progress and ongoing legacy battles keep their identities and rules. New rules/scenario revisions and protocol-4 profile fencing are implemented with exact legacy preservation checks.

The same candidate includes adapted PR #6 campaign navigation, amended PR #5 pause/options/restart, and adapted PR #7 paid teaching pauses. Two opening missions were won through ordinary native UI, with genuine 2→5 progression; third completion/replay still needs cloud verification after a native-browser error 9. All 973 Node tests pass, with one optional dependency skip. This is one selected change set for one integration PR, not a deployment claim.

## Still experimental or deferred

- **Flying road changes:** the first fixed-crossing prototype was not selected. Draft PR #2 now provides player-directed crossings and anti-air counterplay; it remains under separate gameplay review. This is not considered finished or permanently rejected.
- **Longer music:** the 64-bar branch has technical checks but no actual listening approval. Not merged.
- **Specialist AI:** experimental personalities are not shipped. Improving a single rush benchmark did not establish good overall difficulty.
- **Optional two-of-three objective routes:** prototype only. Existing mission variety should not be confused with this unshipped mechanic.
- **Native desktop export/package and Steam integration:** unverified or incomplete. Browser/controller tests are not packaged-game certification.
- **Network PvP:** not implemented.

The campaign and cross-lane gaps take priority over another polish-only batch. Experiments will be chosen, revised or rejected for gameplay reasons, not merged merely to close branches.
