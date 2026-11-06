# Desktop packaging (0.4.0)

This is an optional, offline Electron shell, not a Steam-ready release. The original `dist/` remains a standalone browser build. Desktop-only sources, tools and generated files live under `desktop/`.

## Local use

Requires Node.js 22 or newer, npm, and a supported desktop OS with Electron's native runtime libraries. Run from `desktop/`:

```sh
npm ci
npm run check
npm test
npm start
```

`stage` copies the current `../dist/` into ignored `desktop/game/`. It does not modify the browser files. Restage after browser changes. Keep `package-lock.json` committed for repeatable installs; keep `node_modules/`, `game/` and `release/` out of source control. Staging currently requires a flat dist containing regular files, rejecting links or nested folders until deliberately supported.

## Private build artifacts

Build each target on its corresponding OS. Cross-compilation is not a tested release workflow.

```sh
npm run pack           # unpacked app for this OS
npm run package:win    # Windows ZIP
npm run package:mac    # macOS ZIP
npm run package:linux  # Linux tar.gz
```

Outputs go to `desktop/release/`. Every command explicitly disables publication. The default build uses the host architecture. For another native architecture, use the appropriate runner and/or an explicit electron-builder `--arm64` or `--x64` flag after staging. Apple Silicon, Intel macOS, Windows ARM and Linux ARM require separate device checks.

These are unsigned development archives with default Electron icons, not installers. Windows executable signing/resource editing is disabled; macOS signing is explicitly disabled. Gatekeeper/SmartScreen may reject unsigned apps. Do not instruct players to bypass warnings as a release strategy. Obtain signing identities and notarize/sign through an authorized release process before public distribution. No credentials, storefronts, auto-updaters, external publishing or uploads are configured.

Suggested private CI, not installed by this work: use a manually triggered OS matrix of Ubuntu, Windows and macOS runners, checkout the reviewed commit, configure Node 22+, run `npm ci` from `desktop/`, run desktop checks/tests plus the root game tests, then run the matching package command above. Keep resulting artifacts private with short retention only after repository-owner approval for artifact uploads. Prefer a separate manual signing/release job; never grant release tokens to an untrusted pull-request build. Lock action versions to reviewed commit hashes if implementing this workflow.

## Offline security boundary

- A privileged standard `ironroot://game/` origin serves packaged assets via Electron's protocol handler. ES modules use the correct JavaScript MIME type without file-scheme compatibility workarounds, a listening server or an exposed port.
- The renderer is sandboxed with context isolation, Node integration disabled, web security enabled, and no preload or IPC bridge.
- Only the fixed local origin is allowed by the session request filter. All permissions, downloads, popups, renderer navigation and webviews are denied. There is no shell-open-external path.
- Asset resolution checks extensions, path containment and real paths, rejecting traversal and symlink escape. The packaged build serves only its staged game directory.
- CSP blocks remote scripts, connections, workers, frames and objects. Inline styles remain allowed because the existing game uses dynamic style attributes. Inline scripts and eval remain blocked.
- Service-worker privilege is never granted, worker sources are blocked, and requests for `service-worker.js` are rejected. The browser build's attempted registration may log an expected rejection; no service worker can control the desktop game.
- External Google Fonts are intentionally blocked. The game's existing local system-font fallbacks are used; there is no silent font download.
- Developer tools are disabled in packaged builds. There is no telemetry or auto-update integration in the wrapper.

Keep Electron and tooling patched and audit dependencies before shipping. Passing source-contract tests is not a penetration test or a guarantee of runtime isolation.

## Saves and window lifecycle

The fixed app name, origin and persistent session partition (`persist:ironroot-frontier`) preserve the game's existing localStorage data across restarts and normal upgrades. Electron stores it under its OS-specific app user-data directory, typically:

- Windows: `%APPDATA%/Ironroot Frontier/Partitions/ironroot-frontier/`
- macOS: `~/Library/Application Support/Ironroot Frontier/Partitions/ironroot-frontier/`
- Linux: `${XDG_CONFIG_HOME:-~/.config}/Ironroot Frontier/Partitions/ironroot-frontier/`

Do not rename the app, partition or origin without a save migration. Browser-site saves and desktop saves are separate. The wrapper neither adds a new game save format nor guarantees a final save after a crash or forced termination. The existing game's autosave/beforeunload behavior is used; closing the window flushes session storage. Use the game's Save & return to title before quitting when possible. Back up the whole user-data directory while the app is fully closed; Chromium's localStorage files are not standalone portable save documents.

The wrapper provides a single-instance window, restoration/focus on a second launch, native fullscreen and zoom menu actions, minimum 800×600 window size, macOS reactivation, and an explicit crash/load failure dialog. It does not invent a second pause handler; the game's visibility handling remains responsible for hidden-window pause behavior.

## Validation and release gates

`tests/desktop.test.mjs` verifies origin filtering, path traversal and symlink containment, MIME types, missing-file handling, worker rejection, CSP, required isolation settings, mocked main-process wiring and no-publish packaging commands. The main-process wiring test exercises permission, network, navigation and download denial with mocked Electron APIs; it does not substitute for actual Chromium execution. These tests run in the root `npm test` too, without requiring Electron installed.

Before a release, test the actual packaged app on Windows, macOS and Linux: first boot offline; module and asset loads; a complete skirmish; field trials; controls/audio/fullscreen; minimum-size layout; save, normal close and resume; crash recovery; upgrades preserving saves; keyboard navigation; failed network attempts; attempted navigation/popups; renderer absence of Node globals; and absence of an active service worker. Run each shipping CPU architecture. Verify bundle contents, license notices, dependency advisories, version metadata, installer behavior and signatures.

Still absent: Steamworks integration and SDK/license review, achievements and cloud save design, Steam Input/controller navigation, Steam Deck verification, store capsules/trailers/legal content, signing/notarization, accessibility certification, crash reporting, installer/update strategy and production desktop QA. The desktop shell is packaging groundwork, not evidence these gates passed.

### Validation performed in this cloud workspace

- Desktop syntax checks and all six focused tests passed, including an actual symlink escape check on Linux.
- Dependencies installed with an included lockfile. `npm audit --omit=dev` reported zero findings. The full development-tool audit reported six moderate findings from vulnerable transitive minimatch versions in electron-builder's dependency chain (GHSA-g3hv-75wg-m249). These build tools are not included in the application ASAR. Do not mistake the production-only audit for a clean toolchain audit; review an upstream patch before release rather than applying npm's suggested breaking downgrade blindly.
- The Linux x64 unsigned tar.gz and unpacked application were generated, and the ASAR inspected: only game files, main/security modules and package metadata were bundled, with no development dependencies.
- A real packaged-binary launch was attempted. The executor denied Electron's process-singleton socket with `Operation not permitted`, causing exit 133. Desktop rendering, save round trips and OS integration were therefore **not validated**. No sandbox protection was disabled to work around this limitation.
- Windows and macOS packages were not built here. Test them on their native OS as described above.

This managed workspace has a read-only home cache. Build tooling can instead use writable cache locations, for example `XDG_CACHE_HOME=/tmp/ironroot-desktop-cache electron_cache=/tmp/ironroot-electron-cache ELECTRON_BUILDER_CACHE=/tmp/ironroot-builder-cache npm run package:linux`. This does not resolve the separate OS socket restriction on running the game.
