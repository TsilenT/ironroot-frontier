# Reviewed writing integration on v0.16

This is the **unreleased v0.16.1 candidate**, not a deployment or a claim that its browser review has passed. It integrates the player-copy pass into released v0.16 while retaining the mobile safety and profile-reload repairs.

## Exact sources and merge

- Released main: `2094b5fb71755ddd37677ae65d5b3d1438487366`, tree `ec5bd8832d89cee83bc8c8bfbd19cb577f2692dc`.
- Incoming PR #9 branch: `codex/player-copy-rhythm-2026-11-07`, head `c359d325080fd07261f5fa92a73cac7ae2680e61`.
- Common base: `46d324b94754fe88ed9d324456f284af0aa4537d`.

All 37 incoming files match their exact Git blob SHA1s. The input metadata calls text-character counts “bytes” for Unicode files; verification uses the actual UTF-8 byte count in each Git blob header, not that metadata field.

The integration used a three-way content merge, not an overwrite of the older branch onto current main. All runtime files merged without conflicts, including `app.js`, which retains the released mobile-safety and Reload/Back protections. The current contextual-coaching browser test also merged cleanly. The only conflict was the long browser syntax-check command: all current checks were retained and the incoming `player-copy-rhythm.spec.mjs` check was appended. Root test concurrency and all existing geometry, timing, storage and flight-targeting assertions remain intact.

Original PR #9 documentation and its `qa/writing-rhythm/` evidence are byte-identical to the incoming branch. Those reports describe branch-era work and its acknowledged failures; they are not evidence that this integrated candidate has passed a browser gate. New integration results are under [`qa/writing-v016-integration/`](../qa/writing-v016-integration/).

## Two reviewed wording refinements

The coordinator accepted two small refinements after the original PR merge. They are recorded separately in [`coordinator-refinements.json`](../qa/writing-v016-integration/coordinator-refinements.json):

1. The warning now reads, for example, “Enemy gryphons are about to cross toward the north road, and your archers can hit them along the way.” This avoids implying that archers can intercept only at the destination road and completes the lowercase road name with “the”. The existing destination sorting and formatting, warning timing, announcement frequency and targeting rules are unchanged. The Node exact-copy check and browser one-time-announcement expectation use the final wording.
2. The siege-practice prompt is “Watch your siege engines fire on the marked tower until it falls.” Its success message still reports both the player's siege hit and the marked tower's defeat. The lesson's evidence requirements and completion logic are unchanged; the source copy contract now pins the final prompt as well.

No broader rewrite was needed. Short controls and alerts remain short, while longer explanations vary their structure instead of mechanically joining every pair of sentences.

## Source and data preservation

The reproducible [`audit-source.mjs`](../qa/writing-v016-integration/audit-source.mjs) compares released main, the common base, the exact PR input, and this candidate. It uses Acorn 8.18.0 bundled with Node v24.22.1 in this environment. It compares every token and every inter-token byte, permits only string/template token changes, and requires the ordered before/after text transitions to match the incoming PR exactly after reversing the two explicitly recorded refinements. It also checks fixed numeric facts in changed prose.

The final [source audit](../qa/writing-v016-integration/source-audit.json) passes:

- Exactly **142 incoming text-token changes across eight JavaScript files**, followed by the two separately verified wording refinements spanning three tokens: the flight-warning prefix and suffix, and the siege-practice prompt. The suffix and prompt refine already changed tokens; the new prefix brings the final net difference from main to **143 text tokens**.
- Exactly **five incoming HTML text-node changes**. Tags and every attribute are unchanged.
- Candidate metadata changes only from 0.16.0 to 0.16.1: one root-package version, one desktop-package version, two desktop-lock versions, one cache version, and one footer version. This distinct identity prepares a future release; it does not publish it.
- The other **39 runtime files are byte-identical** to released main. Engine, flight mechanics, objective evaluation, rendering, CSS, save codecs, profile/backup protocols and all other non-prose application bytes are preserved.
- Another **1,038 released files** outside the explicit integration/edit scope remain byte-identical, including historical evidence and current regression checks.
- Exported non-prose fields match released main across all 21 authored missions, seven chapters, five practice lessons, sixteen progression descriptors and thirteen flight descriptors. Speakers, labels, identifiers, objectives, medals, prices, deadlines, starting forces, marked sites, prerequisites, rewards and revisions are unchanged.

The two frozen descriptor hash expectations remain `3b08ea9aa1e101b3a187e2fd9c184a6cfd871f2f2fc4f4c384e5f7693baba69e` and `42f459c491b5653c42efe8eeb946d75bb11e6a04c7d74e161ea1a5cf755248d4`. The incoming explicit prose-only reversal restores the reviewed strings before the existing hashes are checked. Neither hash was replaced and no descriptor fields were omitted from the fingerprint.

To repeat the audit with materialized source trees:

```sh
node qa/writing-v016-integration/audit-source.mjs RELEASED_ROOT COMMON_BASE PR9_INPUT .
```

## Independent editorial and in-memory review

The independent reviewer found no blocking copy/mechanics regression and no need for a broad further rewrite. It independently compared exported non-prose data with released-current engine/rulesets and inspected the real shared prompt composer.

All **21 build-advice stages across ten coached mission flows** form complete grammatical prompts, including the closed-drawer “Open Build, then” prefix and the Warden-lodge, archery, mine and tower amendments. Extra gold was supplied only to expose later text during that editorial traversal; this was not a viable-build-order or balance test. The integrated paid-construction regression cases separately retain their actual costs, zero-time checks and saved-state assertions.

Fresh Roadside Watch still begins combat automatically after the first paid barracks. Manual teaching replay retains its explicit Start/Resume controls. Hide continues to remove the entire banner rather than insert hidden-hint text. These behaviors were not changed by the writing pass.

The reviewer also ran all five incoming practice lessons to natural completion in memory with normal paid construction, upgrades and engine time steps, without injecting victory or combat evidence:

- First barracks: **1.25 seconds**, with an actual produced warrior.
- Shield and arrow: **8.50 seconds**, with an enemy arrow hit on a warrior and a supported archer shot.
- Mine and upgrade: **4.00 seconds**, including two-second observations at 7.5 and 8.75 gold per second.
- Siege the tower: **31.70 seconds**, with the placed foundry's siege hit and the marked tower's defeat.
- Answer the air: **14.05 seconds**, with the placed archery range's hit on the tracked gryphon and that gryphon's defeat.

The final two wording refinements do not change this lesson logic. These source and in-memory results are not visual/browser evidence or a human balance assessment.

## Final local validation

See [`validation.json`](../qa/writing-v016-integration/validation.json) and its linked logs for the exact commands and outcomes after both wording refinements and the candidate metadata bump:

- `npm test`: **1,298 passed, zero failed, one skipped** out of 1,299 tests. The existing optional desktop-tooling contract is skipped because desktop build dependencies are not installed.
- `node scripts/check.mjs`: all game JavaScript modules parse.
- `node scripts/verify-runtime.mjs`: the complete **49-file** runtime inventory passes.
- `npm run check --prefix qa/browser`: browser source syntax and authored fixture checks pass, including **eight harness contracts** and **17 synthetic-provider contracts**. This command does not run a browser.
- The source/data audit above passes, including unchanged frozen hashes and all non-prose descriptor fields.
- Ordinary `npm run list --prefix qa/browser` initially failed because the available CLI did not recognize `test`. Discovery then passed using the existing **Playwright 1.57.0 local adapter** (`@playwright/test` reports `1.57.0-local-adapter`): **1,668 cases in 39 files**. This was discovery only, with no browser, server or installation. The temporary dependency link was removed; the project's cloud runner dependency remains unchanged.

Native visual/text inspection and exact-source browser review of changed text and affected flows remain pending; the coordinator will select the appropriate browser coverage. Historical writing-branch browser runs, the source preflight, and test discovery must not be represented as current browser execution. Physical mobile/PWA and non-Chromium certification also remain separate work. No browser run, Git action, merge, deployment, or external write was performed for this local integration.
