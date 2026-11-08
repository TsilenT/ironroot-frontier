# Lanterns on the Water

## Frozen encounter

Additive Chapter 6 mission `lanterns-on-the-water@1`, after One Signal Is Enough, bound only to `frontier-campaign-lanterns@1`. Classic geometry, normal adaptive AI, full earned roster, autonomous flyers, ordinary prices and income. No bridge income, free reinforcements, health floor or required unit.

Destroy both **original** North Customs House (north x2090) and River Customs House (south x2090), or destroy the enemy citadel, by the disclosed **10:00** deadline. The own citadel must survive; 1 HP is valid. Dispatch confirms original-house destruction even outside sight. Later construction at the same site cannot reset credit. Both optional medals, a <=3:00 clear and 4,500 surviving citadel HP, are independent of progression.

The briefing charts terrain and original-house locations. It does not reveal defenders, enemy HP, upgrades or replacements outside current sight. Unvisited houses are charted landmarks, not fabricated “last seen” records. Stale structure memory is not current intelligence. Both sides use ordinary fog observation. The existing 5:00 escalation is explicitly disclosed: production ×1.65, troop structure damage ×1.75, citadel shots 32→18, no forced drain.

Authoring setup A is frozen without a second formation:

- Player: barracks M1110, archery M970, watchtowers N830/S830, mine M410. Opening cash 1,050; 945 gold of initial buildings; 6,000 citadel HP.
- Enemy: target watchtowers N2090/S2090, barracks M1950/N2230/S2230, archery M2370, mine M2790. Opening cash 80; 1,225 gold of initial buildings; 6,000 citadel HP.
- Each starts at 7.5 gold/sec, including its real mine. Existing factories do not pay unit wages. Every later purchase uses the ordinary engine economy.

The initial camp introduces contact while leaving time to act: first visible enemies appeared at 3.45–4.55 seconds and first damage at 5.75–6.8 seconds in these probes. This is a gentle first fog encounter, not a finale difficulty claim.

## Bounded paid evidence

Initial search: **one formation, three policies × three seeds** (6301, 719, 51017), plus one idle control. Policies read only the detached player observation and issue paid build/upgrade/Volley commands. The independent observer records both gold ledgers; no hidden measurement feeds decisions. Initial probes used the existing QA-only fog ruleset, never a profile-admitted identity.

- **Scout then commit:** 3/3 original-house clears, 99.7–116.55 seconds; player spent 2,010–2,420 gold; 6,000 own HP. Outer warrior/archer probes precede siege and wizard investment. The policy committed north at six seconds in all three seeds because visible patrol counts tied. These runs demonstrate a paid probing approach, **not information-sensitive lane selection**.
- **Forceful broad pressure:** 3/3 original-house clears, 72.65–79.35 seconds; player spent 1,920 gold; 6,000 own HP. Immediate three-road warrior/archer production succeeds without siege, wizards, flyers, Rootwardens or a citadel option. A strong direct solution is accepted rather than weakened to force tension.
- **Central double-siege race:** 1/3 enemy-citadel clear at 175.45 seconds, 918 own HP and 2,285 spent. Two losses at 177.55–183.15 seconds, 2,360 spent, with enemy core HP 2,087–2,765. Exposed side support dies early. This is a fragile alternative, not a reliable recommended route.
- **Idle:** own citadel lost at 113.05 seconds; no player spending. Enemy spent 775 gold in four ordinary purchases.

Across all ten cases the adaptive enemy made 4–11 successful purchases and spent 640–1,295 gold. Both complete ledgers, including mine income and kill bounties, reconciled within 1e-6 gold. No successful result was forced near death and no losing case was discarded.

After integration, exactly three targeted production-identity runs replayed the authored-seed scout/broad routes and the successful central seed. Each matched its QA duration, outcome, HP, income, spending, first sight/contact and **every transaction**. Two additional production runs exercised actual encode/decode restoration every 15 seconds on scout/post and central/core routes and retained their QA result/time/HP. These are identity and restoration checks, not a second tuning matrix.

## Reproduction and limits

- `node qa/lanterns/simulate.mjs` reruns the nine initial QA cases. Add `--policies=idle --seeds=6301` for idle. `--production=true` selects the actual campaign identity; it is not an admission override. Optional `--out=...` retains full local observations.
- `node --test tests/lanterns-mission.test.mjs`: **7 passed**, covering exact identity/earned roster, additive 22-mission/66-star progression, formation parity, empty initial fog memories, public briefing, original upgrades/replacements, either victory route, 1-HP and own-loss precedence, exact deadline, active restore/restart, one-star completion and paid restored post/core clears.
- Focused campaign regression: **54 passed**, zero failures across campaign, expansion, historical roster, restart identity, One Signal and Lanterns tests. This is not an aggregate-suite claim.
- Initial failed and successful raw runs, production parity rows and test output remain outside the repository in the local development evidence directory. The repository retains reproducible code, focused tests and this summary, not screenshots or raw logs.
- Sources: `dist/campaign.js`, `dist/rulesets.js`, `dist/fog.js`, `dist/engine.js`, `dist/objectives.js`; `qa/lanterns/{scenario,paid-policies,simulate}.mjs`.

Three combat seeds and scripted fast purchasing do not establish a human win rate, a novice success threshold or broad strategy coverage. In particular, a synthetic “70%-efficient” policy would not prove human accessibility. No requirement to use every unit is implied. The symmetric opening does not establish that varied defenders make scouting change the chosen road. Later encounters can explore that decision without retuning this introduction into a mandatory composition. UI disclosure, mobile/physical-device/PWA, long-battle performance and real-player pacing require their own evidence; these engine runs certify none of them.
