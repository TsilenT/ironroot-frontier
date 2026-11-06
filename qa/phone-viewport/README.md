# Native phone viewport QA fixture

Developer-only fixture, never part of the shipped `dist` bundle. It contains no captured profile strings, credentials, or user-uploaded screenshots.

To use with the repository's supported managed preview, copy `native-fixture.html` temporarily to `dist/__qa_phone.html`, then open `/__qa_phone.html` on the exact URL returned by the managed preview through the native browser. The reviewed run returned `http://127.0.0.1:4173/`. Do not start an alternate server. Remove the dist copy and close the QA tab afterward.

The fixture fetches the actual app HTML and loads its CSS/modules in a sized iframe. Before app startup it substitutes in-memory localStorage/sessionStorage. The optional unlocked campaign profile is synthetic and exists only in that iframe's memory. The outer fixture reads the shared profile only to compare exact strings and a hash; it never writes it. No browser profile replacement is required.

Use real game controls inside the iframe. The preset selector changes its CSS viewport size; Measure exports actual DOM rectangles and the game's geometry checker result. The insets and visualViewport controls are synthetic tests, not physical-device emulation. Static label mode clones the currently rendered game document, removes app scripts, and renders deliberately synthetic critical/lost text states against the current stylesheet. It does not simulate damage or write saves. Its storage identity flag is false because this script-free static document does not need the gameplay storage shim.

The current API does not emulate Android/iOS hardware, touchscreen, physical browser chrome or installed-PWA display mode. Do not claim those are verified.
