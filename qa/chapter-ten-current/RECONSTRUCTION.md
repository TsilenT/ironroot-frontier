# Chapter 10 reconstructed source checkpoint

This note supersedes the status statements in historical ARC.md and README.md.
The ten original boss/foothold source files are preserved byte-for-byte from
`c598930bac5a925dd6f9b082fa9af466c4cc5648`, obtained through ordinary Git checkout.
The twelve additional files are a reconstruction from retained authored
specifications. They match the supplied reconstruction packet's SHA256 values;
they are not claimed byte-identical to the unavailable original additions.
Original raw paid-run packets are unavailable, and historical success claims
have not been revalidated. RECONSTRUCTED-POLICIES.json is static design input,
not a generated result or an executed probe.

The unchanged production base is canonical v0.39 main
`d27e45c296875bc74735698a02e033e11e7ff57c`, tree
`c266840dd6528a4089145ad404709ab6b13b1cb1`. Production runtime, campaign catalog,
profile, version/cache and ending remain unchanged. Chapter 10 is private QA
source only: unmerged, unreleased and absent from the public campaign roster.

Run the synthetic suites through the normal CI entry:

    node --test tests/chapter-ten-reconstruction.test.mjs
    npm run check
    npm run check:release

The entry imports mechanics.test.mjs, foothold.test.mjs and recovery.test.mjs.
These synthetic checks generate isolated temporary runtimes outside the checkout
and remove them afterward. They do not import or run either paid probe, render
the game, launch a browser or establish mission balance/playability. Keep all
test output and any other generated artifacts outside the repository.
