# Wake the Reserve: isolated Chapter 9 hypothesis

QA only, not a campaign mission or release. Based on Shared Watch commit
65ee1438435a9e8a4cb6b8b6930ac87ca17518b7, tree
b6ee01ff93f43176a889d7fb3c226cf5ef442643. All 1,351 materialized
blobs matched the complete 2,399-file inventory. The 1,048 inventory-only
omissions remain omitted, not deleted. No original source byte was edited.

## Encounter and creative intent

Clear-view ordinary core assault, healthy 6,000 HP citadels, normal paid adaptive
AI, 10-minute deadline and normal 5-minute escalation. Both sides start with three
level-one barracks, one archery and one real mine. Player gold 900, enemy 100.
An additional ordinary northern enemy watchtower is the optional original
**North Command Post**. All numbers are unbalanced new hypotheses.

Destroying that original post gives one six-second warning, then releases four
ordinary level-one warriors and two ordinary level-one archers from the enemy
rear on north. They move, acquire targets, attack and die through the unchanged
engine. No wipe, huge footprint, boss health, universal lane reach, core clamp,
new treasury income or repeat reinforcement exists. Existing factories and paid
AI continue. The 70-unit cap defers individual arrivals; factories keep their
normal earlier position in the tick, so a reserve may wait behind normal output.

The post is optional: bypass north, strike early, or prepare support before
releasing it. Destroying the citadel first remains a win. This puts an ordinary
minor reversal under understandable player-controlled timing. A low-citadel
trigger would tend to deliver its rear troops after a local fight was already
settled and overlap the separate finale experiment. The post offers a better
first hypothesis, not proof that the contingent arrives in time to matter.

## Isolation and ordering

Only this QA folder and tests/minor-reserve-qa.test.mjs are new. No dist file,
scenario catalog, ruleset, profile version, release version or prerequisite is
changed. MinorReserveGame subclasses the existing Game only inside QA. Its
separate JSON envelope contains an unchanged engine snapshot plus the exact
original post ID, trigger tick and at most six ordinary unit release records.
The production battle codec rejects that envelope. No normal save slot is used.

After each actual fixed engine tick: resolve ordinary simultaneous damage and
citadel outcomes; stop at a terminal result/deadline; then detect original-post
destruction, warn or drain available queue slots. Arrivals first fight on the
following ordinary tick. Replacements do not reset the original ID. Restore
checks the fixed clock, exact local identity, original and released entity
identities, warning ordering, complete/due-cap consistency and strict JSON fields.
Terminal ordering deliberately does not create posthumous reserves or revive a
lost battle. One surviving player HP can win; no purchase or damage threshold
is an objective.

The subclass relies on private engine methods _step and _spawn. This is a small
reversible authoring boundary, not an approved engine extension. Production
admission would require a reviewed immutable QA/campaign ruleset and validated
engine state, exact campaign identity and codec/history/backup admission,
progression/profile fencing, truthful briefing and a real visible warning.
Simply copying this subclass into the production app would be insufficient.

## Checks and manual entry

Run node --test tests/minor-reserve-qa.test.mjs. Its synthetic fixtures cover
real troop movement/targeting/damage; exact warning, original replacement,
partial cap queue, saved continuation, paid economy, terminal precedence and
malformed envelopes. Synthetic combat fixtures are not balance evidence.

Serve the repository root with python3 -m http.server 8000 and open
/qa/minor-reserve/ in a browser. Use the camera/minimap, select a building then
click a legal site, and use ordinary upgrade/salvage/citadel/volley commands.
Start is paused. Save/restore works only through explicit QA JSON text, with no
profile, localStorage, automatic storage or network write. This thin shell has
not been browser-tested and is not the production UX.

## Smallest next experiment

No natural encounter balance case has run. PLAN.json records the proposed
baseline-first bound: one authored seed, at most three disabled-reserve cases,
ordinary paid commands on a five-second cadence. First establish a supported
credible route and retain every result/rejection. If no route wins, stop and
report rather than adding reserve difficulty or searching silently. An idle win
is a weakness to review, not an arbitrary automatic failure.

Only after review of that baseline may a separate frozen enabled-versus-disabled
north attack and bypass check run. Inspect actual release, first contact, local
losses, target/fire context, core damage, paid spending and final outcome. The
reserve should have a real opportunity to join its local fight. It need not
reverse the winner, be harmless or force a particular purchase. If it arrives
too late or never reaches any contested position, revisit its location/warning
or the encounter instead of declaring a tactical beat from spawn count alone.
No seed search, heldouts, broad matrices, release or campaign admission is
permitted by this checkpoint. Logs/results/checkpoints stay outside the repo.
