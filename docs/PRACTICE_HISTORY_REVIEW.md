# Practice return history review

## Verdict

No blocking finding in the scoped history change. The fix is appropriate for the existing same-tab practice and return links. Browser execution remains a separate release gate; this review used source inspection and Node only.

## Scope and evidence

- Compared `dist/menu-history.js` and `dist/app.js` with `ironroot-pr8-browser-repair`. Runtime changes add a read-only referrer classifier and a constructor option controlling only initial synthetic ancestry.
- No repository `AGENTS.md` was found in the workspace parent tree.
- Independently ran `node --test tests/menu-history.test.mjs tests/menu-navigation-app.test.mjs tests/practice-history-boundary.test.mjs`: **47 passed, 0 failed** (40 existing and 7 new).
- `node --check qa/browser/practice-history.spec.mjs` passed.
- Existing Node tests and browser specs are unchanged versus the comparison tree. Added practice tests do not loosen assertions or replace an existing regression. The browser package additionally syntax-checks the new spec.
- Full `npm test` independently completed successfully: **1,068 tests, 1,067 passed, 0 failed, 1 skipped**, exit code 0.

## Correctness and safety

The classifier matches the current origin and exact sibling `training.html` pathname, supports subdirectory hosting, tolerates query/hash suffixes, and defaults to normal seeding on malformed or missing input. It does not interpret the referrer as a saved route or profile authority.

On a recognized return, the initial entry stores the full live trail rather than manufacturing Story and Chapter entries. An ordinary browser Back can therefore cross the real document boundary. Subsequent Options and battle entries still use the existing append and traversal machinery. Visible campaign Back can shorten the current trail without inserting an artificial boundary.

The change does not alter opaque history-state validation, foreign-state handling, save/profile code, battle pause rendering, asynchronous Close reconciliation, or pagehide/pageshow safety logic. Reload still recognizes an existing marker and avoids reseeding independently of the referrer hint. Existing battle/save, stale-state, lifecycle and navigation tests pass.

## Test integrity and limitations

The new browser spec asserts a real return increases history length by exactly one. It exercises Options Back/Forward/Close, Back to practice, Forward to the game, reload then Back, and unchanged storage bytes. The Node fixture correctly excludes a game popstate when crossing to the separate practice document; it is a deterministic model, not browser evidence.

Nonblocking limitations:

1. A deployment or browser policy that suppresses or trims same-origin referrers will fall back to synthetic ancestry, so the return-boundary fix is conditional on the normal referrer being available. Current markup has ordinary same-tab links without `noreferrer`.
2. A referrer is not proof that a previous history entry exists. Opening Return to game in a new tab may suppress ancestry even though that tab has no practice entry to return to. This is outside the tested ordinary same-tab flow and does not expose stored data or create a loop.
3. Back/Forward browser assertions exercise the user-visible lifecycle outcome but do not assert that `pageshow.persisted` was true. They should not be described as proving browser bfcache retention specifically.
4. Storage-operation instrumentation is scoped to the training document. Equality checks also protect the observed game-return storage snapshots, but do not independently rule out transient game-page write-and-restore operations. The scoped runtime diff itself introduces no storage access.

Recommendation: retain all original repeated-return and Back-navigation browser cases and require the authorized browser gate to pass before claiming the original four browser failures resolved.
