# Fixed paid regression routes

The six cases in plan.json preserve the freshly exercised local runner and
static plan. They are new validation of reconstructed source, not recovered
historical evidence or a human-difficulty estimate. Foothold, No Fires, Crossing
and Finale exercise their primary goals. The original granary case remains a
core-alternative route; the separately added granary-primary case uses the
approved no-siege queue and must destroy both original mines with both cores
alive. The original five cases are unchanged.

The port changes only source lookup and provenance. The repository root is
resolved from this folder; no local recovery HASHES.json or generated inventory
is required. The reviewed factory base remains c5ff97670e86ad244af9a0ee2165096f1e6454c6
(tree b12ff4f61b3eb40c2fde444595407377fa65b007). RUN.json, result.json and
COMPLETE.json separately record the actual current Git commit/tree and dirty
status, plus plan/runner hashes. A dirty run is identified honestly; Git metadata
is read with ordinary read-only commands and no credential inspection.

The imported runner is inert. To execute exactly one fixed case, provide a new
directory under an existing external parent:

    node qa/chapter-ten-current/revalidation/run.mjs --run foothold /tmp/NEW-foothold-evidence

Other fixed case IDs: granary, no-fires, crossing-control, finale-splash,
granary-primary. The runner refuses repository-local output and existing destinations. Evidence stays
external; an interrupted/failed case keeps its packets and error record. The
generated Crossing/Finale runtime is isolated in an owned temporary folder.

    node --test tests/chapter-ten-paid-regression.test.mjs

The regression entry executes each of the six cases once, checks semantic goals,
two-second native paid-command cadence, both ledgers and full-precision packet
hashes. Successful tests remove only their own temporary evidence directories;
failed tests retain theirs and report the location. No exact victory time or
ending HP is required beyond the own-citadel survival goal. The policy, seeds,
factories, upgrades, goals and analysis horizons are unchanged. No old standalone
probe, replacement loop, tuning, rendering or production integration is involved.
