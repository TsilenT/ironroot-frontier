# Chapter 6 closure: independent review

Reviewed the frozen closure candidate against the exact River release base in `ironroot-river-between/work`, after the implementation owner confirmed final prose. **No blocker found.** The five-encounter chapter has completed its planned arc; another mission is not needed to close it.

## Findings

- `app.js` gates the new River victory copy on the authoritative completed result. A citadel alternative reports the fallen citadel without claiming the command post or control goal. A compound victory describes destroyed original identity and banked control time, without claiming the crossings remain clear. Own-citadel loss, draw and expired-deadline failure retain evaluator failure text.
- Restart/Replay retains current reward and subtitle after restoring the historical mission descriptor. Historical objectives, briefing, hint, scenario revision and ruleset identity remain authoritative. The selected restart is already constrained to the selected mission. Fresh and restarted Shared Crossing no longer say “preview”; intermediate encounters no longer advertise premature closure.
- The updated epilogue is applied only to the current progression overview. Its display still requires all five chapter missions. Launch rewards, mission order, prerequisites, 24 main-path missions, 72 optional stars, final Skirmishes navigation and optional Replay remain intact. No future chapter is admitted, and the copy makes no future unlock promise.
- The runtime diff is bounded to these presentation changes plus release-version labels/cache version. Combat, economy, objectives, scenario identities, saved-progress schema, profile protocol, raw mission catalogs and raw chapter descriptors are unchanged.

## Independent checks

- `node --test tests/chapter-six-closure.test.mjs`: **17/17 passed**. These production-code DOM fixtures cover both River victory routes, banked time after ownership loss, failure precedence, all five fresh/Restart/Replay briefings, completion gating, and one-/three-star final navigation.
- Compared every non-function export of both campaign modules: **28 exports equal**. SHA-256 of `JSON.stringify(Object.fromEntries(sortedExportNames.map(name => [name, module[name]])))` is identical in base and candidate: `7b76b17efb9c3e8bce3816ea91ed0702335014a5f106c05e4e971e2587a59d12`.
- All five Chapter 6 initial serialized games are equal to the base. Sequential progression snapshots across the raw catalog are equal after removing only current mission subtitle and chapter epilogue presentation fields.

## Reviewed file hashes

- `dist/app.js`: `d0bf1de50e87a9765dbfa60c04133fd2e0f5e9aa5ecbb415ef0d9a9a95f54d2b`
- `dist/campaign.js`: `9dfc220515e38d27ee53f5e484aeccbd7addae63b62029c1a35fc17e2d4fa01e`
- `dist/campaign-presentation.js`: `9d8d112eeed62a54766cc9c64ffcda0195ec85fffc5645a96bdba7bcd60064c6`
- `tests/chapter-six-closure.test.mjs`: `f7245017f1b287bc04736e39c5d0ea375269dfd882f4f048a14dc2e0517f6f9a`

Limits: source review, focused synthetic tests and exact-base comparisons only. No broad aggregate, browser, physical-device, remote or release verification was performed by this reviewer. This review changed only this document.
