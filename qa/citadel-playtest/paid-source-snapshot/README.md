# Exact retained paid-sample source

This snapshot reproduces the eight fixed games run before the applicability correction. `manifest.json` verifies the original engine/rulesets/citadel files against the hashes recorded in `../paid-results.json`; the remaining imported engine dependencies are unchanged from base main `5ec1f967a1c8c8f9861f68b8fef3cf99c4fa460d`. The engine author reconstructed the three edited files from known edits; all three matched the original hashes exactly. No outcome replay was used to recover them.

From the repository root, write a new replay output rather than replacing the retained result:

```sh
node qa/citadel-playtest/paid-source-snapshot/qa/citadel-playtest/paid-sample.mjs /tmp/ironroot-citadel-paid-replay.json
```

The top-level current harness follows current engine modules. This snapshot is the exact pre-applicability source of the retained sample. Neither run should be interpreted as human play or as evidence of upgrade usefulness: every fixed opening ended before the purchase gate.
