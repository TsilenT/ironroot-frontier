# Desktop packaging (0.9.0 source)

This is an optional, offline Electron shell, not a Steam-ready release. The original `dist/` remains a standalone browser build. Desktop-only sources, tools and generated files live under `desktop/`.

## Local use

Requires **Node.js 22.12.0 or newer**, npm, and a supported desktop OS with Electron's native runtime libraries. Earlier Node 22 releases do not satisfy the pinned Electron tooling's requirements. This minimum is also declared in `desktop/package.json`. Run from `desktop/`:

```sh
npm ci
npm run check
npm test
npm start
```

`stage` validates `../dist/` with the browser publication preflight, checks browser/desktop/document/cache release identities, and copies only that runtime inventory. It requires flat regular files under a conservative ASCII filename policy, rejecting links, nested folders, Windows device names and case collisions. A temporary copy is verified against the source hashes before replacing generated `desktop/game/`; validation or copy failures preserve the previous stage. It does not modify browser files or player-profile storage. Restage after browser changes. Keep `package-lock.json` committed for repeatable installs; keep `node_modules/`, `game/`, `.game-stage-*/` and `release/` out of source control.

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

Suggested private CI, not installed by this work: use a manually triggered OS matrix of Ubuntu, Windows and macOS runners, checkout the reviewed commit, configure Node >=22.12.0, run `npm ci` from `desktop/`, run desktop checks/tests plus the root game tests, then run the matching package command above. Keep resulting artifacts private with short retention only after repository-owner approval for artifact uploads. Prefer a separate manual signing/release job; never grant release tokens to an untrusted pull-request build. Lock action versions to reviewed commit hashes if implementing this workflow.

## Build dependency maintenance

Electron remains pinned to 45.2.3. Electron-builder is pinned to the maintained v26 patch 26.18.1. Desktop and browser package versions, lockfile metadata and the Node minimum are checked together by the desktop contract tests.

The original lockfile reported **six moderate development-tool findings** and zero production findings. All six were propagation of [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), a denial-of-service issue in minimatch, through the builder chain. Electron-builder 26.18.1 alone does not fix this: app-builder-lib still requests minimatch ^10.2.5, and @electron/universal 2.0.3 requests ^9.0.3.

Two narrow npm overrides select minimatch **11.0.5** only for app-builder-lib 26.18.1's minimatch 10.2.6 and @electron/universal 2.0.3's minimatch 9.0.9. Older minimatch 3.1.5 and 5.1.9 consumers are left unchanged. The lockfile fixes the resulting dependency tree. No forced audit fix, builder downgrade, universal major upgrade or prerelease is used.

These are intentional cross-major overrides, not upstream certification of every builder feature. The inspected consumers use the CommonJS `Minimatch`/`minimatch` exports, `set`, `negate`, `match(path, partial)` and `matchBase`; those contracts are retained in 11.0.5. Focused tests exercise those APIs plus the real builder file filter. A 918-case old/new comparison found no changes to the modes these consumers use. It did find a difference for a negated hidden-path partial match with `matchBase`, a combination neither consumer uses. Linux packaging and ASAR verification passed, but Windows packaging and macOS universal merging still need native platform validation. Do not assume arbitrary minimatch consumers can safely receive this override.

Both `npm audit` and `npm audit --omit=dev` reported **zero findings** after a clean `npm ci` on 2026-11-06. All overridden packages are development tooling and absent from the application ASAR. The install still warns about deprecated upstream packages (including glob 7, inflight, rimraf 2 and boolean); zero audit findings do not mean all dependencies are actively maintained. Recheck advisories and licenses before release. Remove the scoped overrides when supported upstream dependencies include the fix, then rerun the compatibility tests and native packaging checks.

## Offline security boundary

- A privileged standard `ironroot://game/` origin serves packaged assets via Electron's protocol handler. ES modules use the correct JavaScript MIME type without file-scheme compatibility workarounds, a listening server or an exposed port.
- The renderer is sandboxed with context isolation, Node integration disabled, web security enabled, and no preload or IPC bridge.
- Only the fixed local origin is allowed by the session request filter. Permissions, downloads, popups and webviews are denied. Top-level renderer navigation and redirects permit only the canonical bundled entry and Guided practice pages; arbitrary pages, subframes and external destinations remain denied. There is no shell-open-external path. See `TRAINING_DESKTOP_ROUTE.md` for the exact allowlist and source-test limits.
- Asset resolution checks extensions, path containment and real paths, rejecting traversal and symlink escape. The packaged build serves only its staged game directory.
- CSP blocks remote scripts, connections, workers, frames and objects. Inline styles remain allowed because the existing game uses dynamic style attributes. Inline scripts and eval remain blocked.
- Service-worker privilege is never granted, worker sources are blocked, and requests for `service-worker.js` are rejected. The browser build's attempted registration may log an expected rejection; no service worker can control the desktop game.
- Bundled fonts and their notices are included in the runtime inventory. External font requests remain blocked; there is no silent font download.
- Developer tools are disabled in packaged builds. There is no telemetry or auto-update integration in the wrapper.

Keep Electron and tooling patched and audit dependencies before shipping. Passing source-contract tests is not a penetration test or a guarantee of runtime isolation.

## Saves and window lifecycle

The fixed app name, origin and persistent session partition (`persist:ironroot-frontier`) preserve the game's existing localStorage data across restarts and normal upgrades. Electron stores it under its OS-specific app user-data directory, typically:

- Windows: `%APPDATA%/Ironroot Frontier/Partitions/ironroot-frontier/`
- macOS: `~/Library/Application Support/Ironroot Frontier/Partitions/ironroot-frontier/`
- Linux: `${XDG_CONFIG_HOME:-~/.config}/Ironroot Frontier/Partitions/ironroot-frontier/`

Do not rename the app, partition or origin without a save migration. Browser-site saves and desktop saves are separate. The wrapper neither adds a new game save format nor guarantees a final save after a crash or forced termination. The existing game's autosave/beforeunload behavior is used; closing the window flushes session storage. Use the game's Save & return to title before quitting when possible. Back up the whole user-data directory while the app is fully closed; Chromium's localStorage files are not standalone portable save documents.

The wrapper provides a single-instance window, restoration/focus on a second launch, native fullscreen and zoom menu actions, minimum 800×600 window size, macOS reactivation, and an explicit crash/load failure dialog. It does not invent a second pause handler; the game's visibility handling remains responsible for hidden-window pause behavior.

### Portable backup gap

**Desktop JSON export is not implemented.** Both normal backup export and retained-session export call the same application helper. When running at `ironroot:`, that helper throws the explicit message “File export is not yet enabled in the desktop shell. Use the browser edition for portable backups.” It stops before creating a Blob, clicking a download link or reporting that a download started. The wrapper separately denies every download, including a correctly named, small JSON Blob from the local game origin. There is no native Save dialog or download exception.

The browser edition can export its own profile. Opening it does **not** give it access to the desktop profile or recover desktop progress. Until a desktop export path exists, retain a copy of the complete desktop user-data directory while the app is closed, as described above. That copy is a desktop profile backup, not an importable game JSON file. The desktop import chooser, import/restore round trip and native file permissions also remain unverified on a real desktop; browser tests do not establish those capabilities in Electron.

A future implementation must change the UI and wrapper together, then validate the actual native runtime before enabling export. The narrow design to evaluate is:

1. Accept export only from the current game's top-level webContents at the exact trusted origin, for an explicit user export request. Do not treat a plausible filename or MIME type as proof of authorization or valid backup content. Reject other windows/frames, remote/data/file URLs, opaque `blob:null` URLs, redirect chains and malformed metadata.
2. Permit only the game's two generated JSON filename forms (`ironroot-backup-YYYY-MM-DD.json` and `ironroot-retained-session-backup-YYYY-MM-DD.json`), `application/json`, and a known positive size no greater than 1 MiB. Validate the actual bounded JSON payload with the game backup schema before writing. DownloadItem's URL, name, MIME and byte count alone do not prove the contents are a backup. Do not guess that a Blob URL token is a `session.getBlobData()` identifier.
3. Present a native, window-owned Save dialog for each validated export. The renderer must never choose an arbitrary destination or gain a general filesystem bridge. Handle cancellation, overwrite confirmation, write failure, navigation/renderer loss and repeated clicks explicitly, with no silent automatic save or success claim.
4. Keep sandboxing, context isolation, CSP, origin/network restrictions, the narrow bundled-page navigation allowlist, denied popups and the absence of a general IPC bridge intact. Any proposed bounded transfer/completion mechanism needs a separate security review; do not enable all Blob requests or all JSON downloads as a shortcut.
5. Exercise the actual custom-scheme Blob flow and Save dialog on every shipping OS: normal and retained-session export, 1 MiB boundary, invalid payload/metadata, cancel, overwrite, unwritable/full destination, renderer loss, duplicate clicks and export/import round trips. Report success only after completion, not after clicking a link. Remove the current UI guard only with the coordinated implementation and its runtime evidence.

This is a design and an open release gate, not a dormant implemented capability. The 0.8.0 follow-up adds executable coverage of both export guard branches and adversarial download/network denial cases. No download policy was relaxed and no native launch, package build or dependency change was attempted in this follow-up.

## Validation and release gates

`tests/desktop.test.mjs` verifies origin filtering, path traversal and symlink containment, MIME types, missing-file handling, worker rejection, CSP, required isolation settings, mocked main-process wiring and no-publish packaging commands. It also checks metadata alignment and, when desktop dependencies are installed, the scoped matcher overrides against the real builder file filter. The export guard test executes the current application helper with download/DOM side effects forbidden. The main-process wiring test exercises permission, network, navigation and download denial with mocked Electron APIs, including trusted-looking JSON exports, forged origins, traversal/double-extension names, bad sizes and missing/unreadable metadata; it does not substitute for actual Chromium execution. These tests run in the root `npm test` too, without requiring Electron installed; the tooling compatibility test explicitly skips when the optional desktop dependencies are absent.

Before a release, test the actual packaged app on Windows, macOS and Linux: first boot offline; module and asset loads; a complete skirmish; field trials; controls/audio/fullscreen; minimum-size layout; save, normal close and resume; crash recovery; upgrades preserving saves; keyboard navigation; failed network attempts; attempted navigation/popups; renderer absence of Node globals; and absence of an active service worker. Run each shipping CPU architecture. Verify bundle contents, license notices, dependency advisories, version metadata, installer behavior and signatures.

Still absent: Steamworks integration and SDK/license review, achievements and cloud save design, Steam Input/controller navigation, Steam Deck verification, store capsules/trailers/legal content, signing/notarization, accessibility certification, crash reporting, installer/update strategy and production desktop QA. The desktop shell is packaging groundwork, not evidence these gates passed.

### Validation performed in this cloud workspace

- For the 0.8.0 portability-gap follow-up, syntax checks and all eight focused tests passed. The export guard and download-denial cases are source/mocked checks only; no native export capability was added or validated.
- For the 0.7.0 metadata refresh, desktop syntax checks and all seven focused tests passed on Linux with Node 24.22.1/npm 11.9.0, including an actual symlink escape check and the installed-tooling compatibility check. Node 22.12.0 is the dependency-declared minimum, not a separately tested runtime in this workspace.
- Clean `npm ci` succeeded without changing either manifest. Both full and production-only audits reported zero findings, as detailed above.
- The Linux x64 unsigned 0.7.0 tar.gz and unpacked application were generated. The ASAR contained 20 regular files: 17 staged game assets, main/security modules and package metadata, with no development dependencies. Every non-metadata file was compared byte for byte with its staged source, and the packaged version was checked. This verifies packaging of that snapshot, not gameplay or later browser edits; restage and rebuild after further browser changes.
- Earlier real packaged-binary launch attempts were blocked by environment restrictions: one executor denied Electron's process-singleton socket with `Operation not permitted` (exit 133), and a separate cloud check stopped at sandbox-helper configuration with no graphical display available. No launch was retried during this metadata refresh, and no sandbox protection or OS security setting was changed. Desktop rendering, save round trips and OS integration remain **not validated**.
- Windows and macOS packages were not built here. Test them on their native OS as described above.

This managed workspace has a read-only home cache. Build tooling can instead use writable cache locations, for example `npm_config_cache=/tmp/ironroot-npm-cache XDG_CACHE_HOME=/tmp/ironroot-desktop-cache ELECTRON_BUILDER_CACHE=/tmp/ironroot-builder-cache npm run package:linux`. Use the same npm/cache environment for `npm ci` when needed. Writable download caches do not resolve the separate runtime sandbox, socket or display requirements.

Browser and desktop metadata must match the current root package version. The older archive checks above are historical; restage and rebuild before distributing a new package. The desktop runtime gate remains open.

### Current public-source assessment

This staging improvement starts from rewritten public main `238a22c`, with browser/desktop version 0.40.7. It changes build preparation, not game saves, renderer privileges or portable export. Ten new staging tests exercise exact inventory copying, stray JSON and missing-asset rejection, failed/interrupted copies, changed copied bytes, three release-identity mismatches and Windows filename portability. Existing export/download denial remains in place.

A Linux-hosted Windows x64 ZIP build succeeded with pinned Electron 45.2.3 and electron-builder 26.18.1. The ASAR contained exactly 74 regular files: 71 verified game assets, the main/security modules and package metadata. All non-metadata bytes matched their staged sources; the packaged version matched; development dependencies were absent. ZIP CRCs and its embedded ASAR matched, and the executable's PE header identified x86-64. These are archive/content checks, **not Windows execution evidence**. Executable resource editing and signing remain disabled by the existing configuration. The archive and all generated evidence stayed outside the repository.

An actual Linux Electron launch exited 133 before opening a game window: its SUID sandbox helper was not configured with the ownership/mode Electron requires. This host also has no configured display or Xvfb, and no Windows/Wine runtime. No sandbox setting or helper permission was changed. Windows launch, native Save/Open dialogs, native save/quit/restart/upgrade behavior and Steam-client launch remain unverified. Electron's [headless-testing guidance](https://www.electronjs.org/docs/latest/tutorial/testing-on-headless-ci) requires a display driver; a successful [cross-platform build](https://www.electron.build/docs/features/multi-platform-build/) does not establish native runtime behavior.

The most important functional gap remains desktop portable backup/export: the browser edition cannot read the desktop profile, and the existing source/mocked checks do not establish native import behavior. Complete the coordinated bounded-transfer/native-dialog implementation and the per-OS cases above before enabling export. Steam Cloud is also unconfigured: Valve requires [explicit file-path configuration or Cloud API integration](https://partner.steamgames.com/doc/features/cloud), rather than automatically discovering this Electron profile. Achievements and Cloud are optional product features; do not advertise them as implemented.

Before calling a Windows release ready, exercise the packaged app on Windows offline, verify the native save and recovery paths, then test its executable/depot configuration through the Steam client using Valve's [upload and launch guidance](https://partner.steamgames.com/doc/sdk/uploading). No Steam account, upload, paid runner, signing service or publication was used for this assessment.
