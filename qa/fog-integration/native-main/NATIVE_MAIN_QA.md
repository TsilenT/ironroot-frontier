# Local 0.21.0 candidate: bounded native desktop QA

## Scope and outcome

Actual main app, genuine paid UI play, no fixture injection. This was a bounded desktop pass, not release acceptance. Current live release remains 0.20.2. No runtime source was changed during the pass.

The documented managed static preview served the exact 56 production files at the returned URL, `http://127.0.0.1:4173/`. New tab 91 loaded `Ironroot Frontier · RTS` and displayed v0.21.0. Final byte verification confirms every source and staged file remains identical to the pre-QA manifest, with no extra or missing staged files. This is source/stage identity, not an offline-cache/update certification.

Viewport evidence is 1180 × 757 only. No mobile or responsive emulation was attempted. Preview was stopped and the CUA session completed after leaving the app at the title screen with a fresh Fog checkpoint. The browser slot is free.

## Observed checks

- New Skirmish Fog checkbox was off initially and again after reload. Resume retained its Fog identity independently of the unchecked setup control.
- Timed endgame, Long March, and bridge income each made Fog unavailable without silently changing the chosen setting. After returning explicitly to Classic/open/bridge off, checking Fog disabled incompatible controls and displayed its requirements. Bridge preference ended false, its starting value.
- A genuine Outrider/Classic/open Fog battle started. Own citadel purchase remained available with enemy health unknown. Paused Regeneration purchase charged exactly 190 gold, 420 → 230. Its dialog showed 6000/6000 HP, an eight-second wait and zero restored HP; the enemy section stayed unknown and did not expose timers/counters.
- Paid Barracks cost 140 and a later Archery range cost 175. The native match reached 00:50 at normal UI-selected 2× speed, with real allied/enemy troops and visible enemy buildings. No debug state, fixture state, game globals or raw profile data were read or injected.
- A hidden Volley aim was rejected with `Volley needs a currently visible aim point.` Gold moved 104 → 105 across 00:02 → 00:03, consistent with income and no 75-gold spend. The ready 25-second cooldown description remained unchanged.
- A later visible Volley produced `Arrow volley fired.`, a 75-gold charge net of elapsed income, and `25s Recharging`. The before observation was 277 gold at 00:36; after firing and pausing it was 213 at 00:38. This is UI evidence, not an exact fixed-step accounting assertion.
- Unknown enemy health appeared as `?`, a hatched track, and `Enemy citadel health unknown.` aria text. Current visible troops/buildings appeared inside the lit area and on the observation-derived minimap. The minimap description counted only current contacts and reported zero last-seen buildings during this run.
- Save → title → reload → Resume kept Fog identity, paid Regeneration and the forward Barracks. Front used the own-front label. The save was made at 00:07; resumed play later reached 00:50. Nonempty remembered-building restore was not exercised because no stale memory transition occurred.
- Restart confirmation replaced only the unfinished battle. The new Fog battle reset to 00:00, 420 gold, no purchased citadel choice, no troops and zero last-seen buildings; enemy health remained unknown.
- Fog → ordinary → Fog worked through normal New Skirmish actions. Ordinary mode restored bright terrain, enemy 100%/`Enemy citadel health 100 percent.`, ordinary minimap description and frontline label. Returning to Fog restored shading, unknown enemy HP, own-front label and an empty fresh knowledge state. No previous placement preview or paid choice was carried over.
- Low effects and Reduced motion temporarily survived save/reload and mode switching. They were then restored through Options to their initial values. All six inspected options matched before/after and after a final reload: audio on, music on, SFX on, master 50%, Reduced motion off, effects High.
- Campaign chapter text was byte-for-byte equal through normal rendered UI before/after: Chapter 1 remained 9/9 stars and 3/3 missions; all other displayed chapter totals remained zero. Wings of Ash remained unlocked and selected. This verifies displayed progress, not every underlying profile domain.
- Final title showed `RESUME BATTLE · OPEN-ENDED · CITADEL CHOICES · FOG · 00:00`. Session Fog was unchecked after reload. Settings and displayed progress were preserved.

## Concrete copy issues, queued without source edits

1. **Open endgame field guide promises timed decay.** Route: running open Fog battle → Pause → Field guide. Exact paragraph: `A war of attrition. Towers can be worn down by continuous waves. After 5 minutes, production accelerates. After 7, both citadels begin to crumble.` The open setup correctly says citadels never decay with time. Source: `dist/index.html` lines 469–471, shared static guide copy. Screenshot `12-open-mode-guide-copy.jpg`.
2. **Full-health Regeneration transition toast implies healing occurred.** Route: pause at starting 6000/6000 HP → Citadel choices → buy Regeneration → Resume. Toast: `Citadel fully repaired.` Own dialog had shown `Regeneration waiting · 8s remaining. 0 HP restored.` No repair occurred. Source: `dist/app.js` `updateCitadelUI`, phase prioritizes `own.fullHealth` before `own.regenWait`, then transition toast at line 2858. The toast was observed in live tool output; it was transient and no dedicated screenshot of the toast was saved. Screenshot `07-citadel-paid.jpg` records the full-health/waiting/zero-restored purchase state. Do not present that screenshot as containing the toast.

## Explicitly unverified / blocked

- Genuine Help/Options background interruption remains unverified. Creating then closing temporary blank tabs did not prove a native blur or hidden event; the app's read-only DOM `visibilityState` remained `visible`. Help opened from an already-paused menu closed back to Pause. Options opened from live play closed back to live play, which is expected absent an actual interruption. These outcomes are not a pass or failure of interruption handling. No background-event tooling retries or other tab/window interactions were pursued.
- Full paid match, terminal result/history, enemy citadel becoming visible, actual seen → lost → remembered building transition, dense neighboring stale badges, and restore of nonempty memories were not reached. The earlier synthetic scene evidence remains separate and does not substitute for these native gates.
- Mobile/short-landscape coverage is blocked/unrun. The earlier denied action was opening Chromium DevTools/responsive tooling on the QA page; observed UI said `DevTools not allowed on this page` and `Your organization has blocked the use of DevTools on this page.` No retry or alternate emulation, iframe or browser-protocol route was used in this pass.
- Audio controls were enabled through normal UI, but there is no listening, audible mix, or audio-reset quality claim. Console inspection was not performed through DevTools or an alternate route. No native CPU/FPS/timing, offline install/update, controller hardware, or cross-browser claim.
- Production tabs, old unresolved tab 84, profile backup/upload/restore, storage clearing and service-worker management were untouched. No raw profile reads were used. The pre-existing in-progress QA checkpoint was intentionally replaced under the authorized scope; displayed earned progress and settings were preserved.

## Desktop geometry

Read-only rendered DOM geometry in the final Fog battle: field x0/y78/w1180/h466; command deck x0/y544/w1180/h213; Volley x1010/y586/w145/h151; Pause x1118/y186/w36/h36; minimap x450/y493/w280/h35. Controls fit the observed desktop viewport; the deck retains its existing horizontal scroll. This says nothing about phone layouts.

## Evidence

- `stage-source-hashes.json`: pre-QA exact 56-file manifest.
- `final-stage-source-verification.json`: unchanged source/stage recheck after native pass.
- `native/normal-ui-before-after.json`: normal rendered UI snapshots for preferences and chapter progress, not raw profile storage.
- `native/01-baseline-title.jpg` through `native/18-final-title-checkpoint.jpg`: desktop captures. Key images: 05 valid setup, 06/07 own citadel with unknown enemy, 10 resumed live contacts, 11 current enemy buildings, 12 guide copy, 13 fresh restart, 14 ordinary reset, 16 Fog reset, 17 preserved campaign, 18 final title.
- `08-guide-interruption-paused.jpg` is only an already-paused guide-close outcome; its filename must not be treated as proof of a genuine interruption.
- App source SHA256: `07e2b793bac55d8c3a8e564c493904d525871ffcf53f1457d8486143d56280a7`.
- Fog view SHA256: `7113a4c118585d7472f914ef5ca1a98b369ee61a8945230bf51ce5e6b634b723`.
- Parent's preceding aggregate: 1617 passed, zero failed, one optional skip of 1618; syntax and runtime closure passed. Those are automated source checks, separate from the bounded native observations above.
