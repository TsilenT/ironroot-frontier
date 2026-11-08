> Lean repository checkpoint: screenshots, raw simulation rows, terminal logs and accessibility dumps from this investigation remain in the local development workspace and are intentionally omitted from this PR. References to those artifacts below describe the reviewed local evidence, not files included in the repository. Concise findings, reproducible code, essential tests/fixtures and limitations are retained. Historical base evidence is not removed.

# Last Ascent isolated native UI pass

Date: 2026-11-08 UTC. Scope: one bounded desktop play-feel/acceptance pass, not balance certification.

## Result

- The ordinary paid run ended in **defeat at 02:37**, at 1× speed. It did not reach the 5:00 escalation.
- The player defeated 104 enemy units. The result recorded 17 player buildings placed (including the authored seven), against 23 enemy buildings. Player citadel ended at 0/6000; enemy remained 6000/6000. The report's last recorded player cash was 791.88.
- The middle lane collapsed first under siege pressure. North temporarily advanced; south later lost its forward defenses. The pressure was visually readable, but the citadel fell rapidly once the middle screen disappeared.
- This slow-input sample does **not** establish nail-biter difficulty, fairness, or balance. Native UI round trips took several seconds, and considerable gold remained unspent. It does not rebut more efficient scripted coverage.

## Scope and method

- Started the supplied `/workspace/shared/ironroot-last-ascent/preview` with `sites-preview start`; used exactly `http://127.0.0.1:4173/` in newly created native browser tab 4.
- Used supported CUA accessibility, screenshots, coordinate clicks, and keyboard input only. No custom JavaScript probes, state injection, scripted simulation, DevTools, phone emulation, production profile interactions, old QA tab 84, or uploads.
- Storage isolation and unchanged-engine claims were supplied by the preview receipt and handoff. This pass verified their visible disclosures and same-tab behavior; it did not probe browser storage or certify production persistence.
- Screenshots are synthetic game UI from the local prototype, captured at the ordinary 1180×757 desktop viewport.

## Verified UI/flow checks

1. **Opening disclosure:** Local prototype/Last Ascent heading; player 1225 invested, 1050 spendable, 3800/6000 HP, 7.5 gold/sec; enemy 2225 invested, 120 spendable, 6000/6000 HP, 12.5 gold/sec. All were visible as rendered text and in accessibility.
2. **Rules disclosure:** 5:00 production ×1.65, troop structure damage ×1.75, citadel shot reduction 32→18; explicitly no forced citadel drain or mission deadline. Local temporary storage/no campaign progress was stated. These lower paragraphs required scrolling inside the briefing.
3. **Actual enemy field:** The authored forward barracks, outer archery/towers, exposed middle mine and rear mines/archery were visible by panning through the native minimap. Enemy added more paid buildings during play. No fog concealed the starting field.
4. **Paid controls:** Two safe rear mines raised income from 7.5 to 12.5. Added one archery in each outer lane and one extra barracks per lane; later added a middle archery, upgraded three archery buildings, fired a volley, rebuilt the breached middle lane, and bought Extra Arrow for 190 gold. Placement, prices, wave roles, selection, upgrades, and feedback were understandable.
5. **Pause/Options/Back:** Paused at 00:25, opened Options, used Back to pause menu, and confirmed battle time remained 00:25 and 1×.
6. **Same-tab save/title/reload/resume:** Saved and returned to Title at 00:25; reloaded the same tab; Resume still advertised 00:25. Resume restored the paid opening buildings, 12.5 income, 3800 player HP, and approximately 169 saved cash (173 shown after play resumed). The report correctly disclosed that charts began on the resumed page at 0:25 while totals included earlier play.
7. **Fresh and restart formation:** New Skirmish after defeat restored the authored field, approximately 1050 cash, 7.5 income, 64%/100% HP, and 00:00. Then Pause → Restart battle → confirm independently restored the same authored field and 1050 cash at 00:00. This was an acceptance check, not a second balance run.
8. **Safe finish:** Paused the restarted setup at 00:11 and used Save & return to title. Final observed state is Title, with only a local 00:11 checkpoint. CUA completion summary sent. Preview server stopped via Ctrl+C, exit 130. Browser is free.

## Observations and limits

- Briefing uses nested scrolling in a tall welcome modal. Exact statistics are initially visible, but escalation and no-progress wording are below the inner fold. The disclosure exists and is reachable, yet easy to skip before Begin.
- Generic game labels remain: Pause says “Classic,” result says “Classic skirmish,” and the restart warning says campaign progress/medals are kept. The title/topbar clearly labels the local Last Ascent lab, but the generic dialogs do not repeat its temporary-storage caveat.
- Around 01:36 a selected middle barracks had 54/700 HP. An attempted upgrade then returned a missing-layout-node error; fresh observation showed the building had been destroyed and the panel removed. No blind retry was made. This is a moving-target automation limitation, not an established game defect.
- An attempted late gryphon counter was not confirmed as placed before the terminal screen. Do not count that attempt as a successful gryphon purchase.
- No 5:00 runtime escalation, long-run stall, successful win, mobile layout, campaign registration/progression, exported backup, real profile persistence, or comprehensive accessibility certification was tested.

## Evidence

- `01-briefing.jpg`: initial statistics and local prototype heading.
- `02-escalation.jpg`: scrolled escalation/no-drain/local-storage disclosure.
- `03-fresh-begin.jpg`: authored opening formation and 1050 cash.
- `04-resumed-paid-opening.jpg`: retained buildings/income after same-tab reload/resume.
- `05-visible-enemy-deployment.jpg`: visible enemy forward mine and rear formation at 00:41.
- `06-middle-pressure.jpg`: middle production destroyed at 01:48.
- `07-citadel-breach.jpg`: middle attack and 47–48% player citadel HP at 02:04.
- `08-defeat.jpg`: terminal 02:37 result.
- `09-restart-formation.jpg`: explicit restart restores authored setup at 00:00.
- `10-safe-title.jpg`: final safe Title.
- `result-accessibility.txt`: exact observed battle-report accessibility record, including totals, resumed chart coverage, and last-sample values.
