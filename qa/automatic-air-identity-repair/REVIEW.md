# Current campaign identity assertion repair

Base: exact PR9 head `9ee50921cd4e865852c8a52ed1ead085642e75f2`. No runtime change.

The fresh launcher `createProgressionCampaignMission` deliberately selects `frontier-campaign-air-local`, scenario revision 4, for every full-roster attempt. Reduced Roadside Watch and Shield at the Fork attempts retain their original identities. Existing paid terminal fixtures still restore their original snapshots.

Five browser cases retained pre-automatic-flight expectations:

1. The earned 2 → 5 → 8 sequence: fresh Shield remains revision 1, Open Three Roads and Emberwatch are revision 4.
2. A saved two-building Roadside Watch remains two buildings; its deliberate full-roster replay is revision 4 with automatic air. An explicit scenario assertion is added.
3. A fresh paid Emberwatch lodge battle is revision 4; all subsequent reload and backup roundtrip checks remain.
4. A returning profile launches fresh Three Roads revision 4 without changing earned records.
5. The full paid third-mission run replays Open Three Roads revision 4 with automatic air; its stars, paid actions, result and progress assertions remain.

The failed cloud run passed all 52 automatic-flight browser instances and 334 shared instances, with 20 failures at these five identity checks across four profiles and six intentional skips. This repair does not turn blocked downstream assertions into passes: the corrected browser cases must run to completion.

Local focused campaign/progression/restart checks: 49 passed, zero failures/skips. Paid-fixture validation, both changed-file syntax checks and runtime inventory passed. Independent read-only review passed the actual launch factory/fixture checks and found no weakened assertions. Its two suggested explicit ruleset checks were added to the progressive sequence and returning Three Roads case. No redundant full root or browser rerun was performed locally; this environment cannot launch the browser safely.
