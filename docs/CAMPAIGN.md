# Ironroot campaign: The Three Roads

Twelve authored battles tell a complete four-chapter frontier story. Captain Rowan gathers a scattered valley, Scout Sera opens the mountain pass, Quartermaster Iona breaks the marshal’s supply network, and Engineer Bram brings down the Crownworks. Chapter endings and the final epilogue resolve the route from first watchfire to open roads.

The campaign reuses the ordinary `Game` simulation and the field-trial pattern: deterministic setup, objective markers, a pure outcome evaluator, and UI-owned battle termination. It does not change unit statistics, introduce undisclosed combat multipliers, remove available buildings, or alter skirmish rules. Chapter themes are presentation metadata; all missions currently use the same three-lane battlefield geometry.

## Missions and progression

| Chapter | Mission | Primary task | Opponent |
| --- | --- | --- | --- |
| Embers of the Vale | Emberwatch | Destroy the central raider barracks by 3:00 | Fixed infantry and archers |
| | Three Roads | Destroy both outer-lane barracks by 3:30 | Fixed attacks across three lanes |
| | Winter Stores | Preserve two original mines and hold 15 gold/sec at 2:30 | Fixed outer warriors and central archers |
| The High Pass | Wings of Ash | Destroy two level-3 aeries by 3:30 | Fixed veteran flyers |
| | Stonegate | Destroy three level-2 towers by 4:00 | Fixed fortified central lane |
| | The Long Vigil | Preserve the starting level-2 signal sanctum for 2:30 | Fixed three-lane infantry, archers, flyers and siege |
| The Furnace March | The Cold Forge | Destroy both outer level-2 foundries by 4:00 | Fixed siege, infantry and central archers |
| | The Black Ledger | Destroy three original enemy mines by 4:30 | Normal adaptive commander with supply income |
| | Heart of the Furnace | Destroy two central level-2 works by 4:30 while preserving 2,000 citadel HP | Fixed fortified mixed-arms formation |
| The Last Crown | A Foothold in Iron | Hold 17.5 gold/sec at 3:00 | Normal adaptive commander |
| | The Last Light | Preserve both original signal watchtowers for 3:00 | Normal adaptive commander with siege and air |
| | Ironroot | Destroy the enemy citadel by 5:00 | Hard adaptive commander |

Chapter one is sequential. Each later chapter opens two parallel missions; completing both opens that chapter’s finale. Completing a chapter finale opens the next chapter. Medals never gate story progression. Completed missions remain replayable.

Every mission has its own briefing, resources, starting health, starting formations, tactical hint, dialogue, victory text, and two optional medal goals. Starting upgrades and adaptive opponents are disclosed. There are no random campaign resource losses, grind currency, paid unlocks, or persistent combat advantages.

### Optional mastery

A victory awards one star. Each of the two optional goals awards another star in that same victory, for 36 total. Goals include quick victories, citadel preservation, high income, and retaining upgraded buildings. A later weaker result cannot erase a clear, star record or best time. Stars and best time are independent personal bests; the best time need not be from the best-star run. Two different two-star runs do not merge into a three-star result.

### Objective rules

- Losing the player citadel fails every mission, including simultaneous destruction of both citadels.
- Destroying the enemy citadel is an alternate victory in every mission, but **never waives protection or required citadel health**. Ironroot explicitly requires this victory.
- Protected starting structures must survive. Destroying or salvaging one fails immediately. A replacement at the same position is not the original structure.
- Destroy objectives track original authored buildings. Adaptive enemies may replace a destroyed mine at the same location, but this does not resurrect an already cleared target.
- Economy is checked at the deadline, not when the income first reaches the goal. Income is calculated from living mines, including recent upgrades and salvages, rather than a potentially stale HUD cache.
- Required citadel-health objectives fail as soon as the threshold is lost. The current game has no citadel healing, so that condition cannot recover.
- The UI must evaluate after updates and after relevant transactions, and stop simulation on either `completed` or `failed`. Do not encode an objective victory into `state.winner`: an engine winner requires actual destruction of the enemy citadel.

## Integration API

`dist/campaign.js` exports:

- `CAMPAIGN_VERSION` (`1`) and `CAMPAIGN_STORAGE_KEY` (`ironroot.campaign.v1`).
- `CAMPAIGN_CHAPTERS`: chapter ID, number, title, subtitle, description, theme and epilogue.
- `CAMPAIGN_MISSIONS`: full mission metadata and authored formation/objective data. Each has `chapterId`, `prerequisites`, `briefing`, `dialogue`, `victoryText`, `medals`, `markedTargets`, and `protectedTargets`.
- `createCampaignMission(id) → Game`: creates an independent normal game using the disclosed setup. Unknown IDs throw.
- `getCampaignTargets(game, id)`: returns objective descriptors with `side`, `kind` (`destroy` or `protect`), `originalId`, and current living `building` or `null`. Friendly protected markers should differ visually from enemy target markers.
- `evaluateCampaignMission(game, id)`: returns `{completed, failed, progress, label, objectives, medals, stars}`. Progress is normalized to 0–1. Each objective includes its live value and target; each medal has `earned`. This does not mutate the game or save progress.
- `currentIncome(game, side = 0)`: live income from living mines.
- `createCampaignProgress()`: returns a fresh empty progress object.
- `normalizeCampaignProgress(raw)`: validates and returns a fresh whitelisted progress object. Missing, corrupt, foreign or unsupported-version values become empty progress. Invalid records, unknown mission IDs, arbitrary fields and orphaned clears are removed. Input is not mutated.
- `isMissionUnlocked(progress, id)`: checks validated prerequisite clears.
- `recordCampaignResult(progress, id, game)`: returns new progress, adding or improving only an unlocked completed mission. Repeated calls for the same result are idempotent. Failed, unfinished or locked results cannot unlock anything.
- `getCampaignOverview(progress)`: returns `missions`, `chapters`, `cleared`, `total`, `stars`, `maxStars`, `completed` and `nextMissionId`. Mission entries add `record`, `unlocked`, and `completed`. Chapter entries add `unlocked`, `completed`, `cleared`, `total`, `stars` and `maxStars`.
- `readCampaignProgress(storage, key?)` and `writeCampaignProgress(storage, progress, key?)`: use the safe storage adapter from `persistence.js`. Writes return a boolean and never report denied/full storage as successful. Raw `localStorage` is not the adapter: its `setItem` return value does not confirm success through this contract.

### Save contract

Campaign completion history is independent of the active engine battle:

```json
{
  "format": "ironroot-campaign",
  "version": 1,
  "missions": {
    "emberwatch": {"completed": true, "stars": 3, "bestTime": 79.95}
  }
}
```

The active UI battle envelope should save an optional `campaignId` beside the existing `challengeId` and `game`, never inside `Game.serialize()`. A battle belongs to at most one of a campaign mission, a field trial, or a skirmish. Validate IDs against the appropriate catalog before restoring; retain backward compatibility with previous challenge and raw-engine saves.

The creation order of the authored placements determines original target IDs. The module derives the starting ID from the unmodified `Game` constructor and counts the player placements before enemy placements. `Game.restore()` retains these IDs; target tracking requires no extra game-state fields or external runtime references. If the engine’s formation creation behavior changes, rerun the original/replacement identity regression tests.

On campaign finish, evaluate once, call `recordCampaignResult`, write the new progress, and refresh the campaign map. Show a storage failure if the write did not succeed. Do not imply that local progress survives cleared browser data or moves between devices.

Recommended UI flow:

1. Read and normalize progress, then render the chapter and mission overview.
2. Default selection to `nextMissionId` or a cleared mission after campaign completion.
3. Show prerequisite locks, briefing, character dialogue, primary objective, and both optional stars before launch.
4. Show mission name, time remaining and objective status during battle; distinguish protected friendly structures.
5. On result, show victory/failure, live star awards, mission victory text and unlocked next choices. On a chapter clear, show its epilogue. On the final clear, show the campaign ending and total mastery.
6. Allow replay and save/resume without overwriting previous best records.
7. Include `campaign.js` in the offline shell and cache version update, and add it to static syntax checks.

## Verification

Run:

```sh
node --test tests/campaign.test.mjs
npm test
npm run check
```

`tests/campaign-policies.mjs` contains reproducible reference play, not production game AI or player restrictions. Policies use ordinary paid `build`, `upgrade`, and `cast` actions. They do not alter gold, health, enemy structures, or simulation rules after setup. The harness substitutes combat seeds only to probe variability and can serialize/restore the game every ten simulated seconds.

The campaign suite covers:

- All 12 missions beaten with the authored seed and seeds 1, 57 and 999. Seed 999 is repeatedly saved/restored during play.
- All 36 stars achievable with paid mastery routes on authored and 999 seeds, including repeated restoration.
- Idle failure in every mission.
- Independent deterministic setup and matching restored simulation, including adaptive AI.
- Enemy target replacement, protected target destruction/salvage/replacement, and dead objects awaiting engine cleanup.
- Objective/deadline precedence, simultaneous citadel loss, required health, and live income.
- Branching/converging unlocks, campaign completion, replay personal bests, immutable/idempotent progress.
- Corrupt/missing/future-version progress, unknown IDs, orphaned clears, prototype-related input, and storage denial/failure.

Initial reference completion ranges are approximately 37 seconds for Emberwatch, 94 for Three Roads, 150 for Winter Stores, 72 for Wings of Ash, 73–74 for Stonegate, 150 for The Long Vigil, 98–101 for The Cold Forge, 114–120 for The Black Ledger, 144–163 for Heart of the Furnace, 180 for A Foothold in Iron and The Last Light, and 119–160 for Ironroot. Mastery routes can take longer. These are deterministic test-policy outcomes, not human playtime estimates or a claim that all strategies are balanced. Browser interaction, visual storytelling and human difficulty testing remain separate QA responsibilities.

### Wider seed sweep

After the AI purchasing update, `node tests/campaign-balance.mjs 12` exercised 12 initial seeds per mission on both reference and mastery routes, with periodic restoration. All 288 runs cleared their mission. 143 of 144 mastery runs earned all three stars; one randomized Black Ledger route won but missed its optional speed medal. All authored-seed mastery routes earned three stars. The standalone report includes the engine hash, completion ranges, remaining citadel health, failed runs and missed medals. These broader samples support robustness, not a guarantee against different player decisions.

The recorded full sweep is in [campaign-balance.json](campaign-balance.json); rerun the script after simulation changes.
