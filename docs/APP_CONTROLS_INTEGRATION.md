# Phone and app controls integration candidate

Unreleased v0.14.1. Public deployment is still v0.13. This candidate does not include the separate campaign roster progression or cross-lane experiment.

## Reviewed inputs

- Private main b8b2e6d1b200b9550803f5cb16b8d96ccc28f222: tested PR #1 combat feedback, protected warnings, intro Resume label; exact merged tree1c99c860cd0e7cdf532afba9e2eff595d3384682.
- Focused phone snapshot: PHONE_VIEWPORT_PR_VALIDATION.json, manifestSHA b28bb3a022996cb1bc55ab289215b6cbb048985026619b71470c443b99ccf035. Three runtime files,889Node passes and1optional skip. Native desktop/iframe paid play and layout checks passed; see its detailed limits.
- Draft PR #3,141df5da11c3b7b82bca43c30d3c771c2d2ab3ed: canvas-only middle pan/right cancel, Preferences fullscreen, four unchanged toolbar buttons. Actual GitHub patch reviewed and applied cleanly. Component cloud results:118browser passes,30documented skips;882Node passes,1optional skip. Evidence retained under qa/desktop-input-evidence/.

## Combined differences

The phone-layout and mouse/fullscreen edits affect separate app sections and applied without conflict. This candidate additionally updates root/desktop version metadata, the title footer and service-worker cache to0.14.1, and includes both new browser suites in static preflight. The code does not require fullscreen for mobile play, does not change battle/save/profile rules, and preserves native browser context menus outside the game canvas.

The 0.14.1 service-worker namespace is deliberately new. Component source hashes remain historical evidence; they must not be presented as proof of the combined candidate. Final exact combined hashes/tests belong in APP_CONTROLS_INTEGRATION_VALIDATION.json.

## Required combined gate

- Root Node and runtime/browser syntax, immutable fixtures and runtime inventory.
- phone-viewport.spec.mjs, desktop-input.spec.mjs, protected-objectives-pointer.spec.mjs and the existing regression suite across configured profiles.
- Offline/update and profile-migration smoke for the new cache, followed by live smoke only after authorized publication.
- Verify old saves, ordinary and short mobile geometry, trusted pointer release across fitting/fullscreen changes, keyboard focus, unsupported fullscreen fallback and native fullscreen entry/exit.

Physical Android/iOS, installed PWA, Safari/Firefox, packaged desktop, and subjective music quality remain unverified. The user's private screenshot stays outside the repository. The optional standalone guided-practice page still uses its prior mouse input; the new campaign-first battle UI receives these controls. Track practice consistency separately without delaying a verified phone repair.
