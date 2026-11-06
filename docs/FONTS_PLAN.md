# Offline font integration plan

Status: **integrated in local 0.9 source; browser and packaged rendering still pending**. Prepared 2026-11-06 for the Ironroot Frontier full-game project. The current runtime, desktop sources/staging, and QA files were not edited by this work. No browser, web server, font-service request, font installation, or software installation was used.

## Ready bundle and footprint

Prepared bundle: `/workspace/shared/ironroot-font-bundle`. Only its `assets/` contents are intended as new distributed assets. Its root README, scripts, upstream inputs and reports are private development material.

The exact existing families are retained. There is no substitute typeface:

- **Barlow Condensed 1.408**: four normal static WOFF2 faces, weights 500, 600, 700 and 800. Each has 339 glyphs and 224 mapped Unicode characters.
- **DM Sans 4.004**: one normal WOFF2 variable face, weight axis 400–700. Upstream optical size is pinned to its default 9 to avoid introducing automatic optical-size changes when replacing the current weight-only font request. It has 304 glyphs and 220 mapped Unicode characters. Preferred family is DM Sans; legacy family metadata is DM Sans 9pt.
- Fonts: **128,336 bytes**. Complete combined attribution/OFL notice: **10,269 bytes**. Six new shipped files: **138,605 bytes (135.36 KiB)**, excluding the small CSS edit and any in-game copy of the notice.
- Original hinting and all available layout features are retained, including Barlow tabular numerals and both families' kerning. This favors small-text rendering over stripping every possible byte. No italics were requested by the current import; existing synthesized italic behavior is unchanged.

### Exact publishing/staging allowlist additions

The public publishing allowlist is coordinated outside this checkout. Add these six **flat, case-sensitive basenames**, not an entire directory or wildcard:

| Basename | Bytes | SHA-256 |
| --- | ---: | --- |
| `FONTS-NOTICES.txt` | 10,269 | `1b111a7ccee992a329acf679d4aade1efdc98f211fb13ef6a605269ace484b30` |
| `barlow-condensed-latin-500.woff2` | 24,624 | `53c40631e0897eb39d3656b39229d442d33670535b14e99163c665f060ea1df4` |
| `barlow-condensed-latin-600.woff2` | 25,604 | `f79c0c3947f96fa437532d7d258d8518705da2da5b468e2b652606e02ef1b10c` |
| `barlow-condensed-latin-700.woff2` | 25,704 | `ddf5f170879b356f67210800b9b41c0b1782fec0cb013ab454170c2392fafc25` |
| `barlow-condensed-latin-800.woff2` | 25,844 | `57b803d5d5711059bfb76610a2f980ae6cacd9cb30aa9f7b6783b552fbac7ccb` |
| `dm-sans-latin-400-700.woff2` | 26,560 | `ae151a07d098c4ace6d0bdef6e93dacc0f3addb796b8fcd222cf44092f9f1f40` |

Machine-readable versions: `asset-manifest.json` and `SHA256SUMS` in the prepared bundle. Do not publish upstream TTFs, scripts, reports, private docs, or `.openai` metadata. Existing runtime files `styles.css`, `index.html` if notices are embedded, and `service-worker.js` will change only in a later authorized integration.

## Source and license verification

All inputs came through the connected GitHub plugin from the **official Google Fonts repository**, pinned to commit [`24ddc1f324cac5d9f5aedca126d298f56e3f1640`](https://github.com/google/fonts/commit/24ddc1f324cac5d9f5aedca126d298f56e3f1640). No third-party font mirror or repackaging was used. Returned Git blob SHA-1 and byte length were checked against every downloaded file before conversion. Input SHA-256 hashes and exact immutable URLs are in `upstream/provenance.json` and `reports/source-validation.json`.

- [Barlow Condensed source directory](https://github.com/google/fonts/tree/24ddc1f324cac5d9f5aedca126d298f56e3f1640/ofl/barlowcondensed), designer Jeremy Tribby. Upstream source recorded by Google: `jpt/barlow` at `b4726ddf91525818e85e5fce111c285b9273d764`.
- [DM Sans source directory](https://github.com/google/fonts/tree/24ddc1f324cac5d9f5aedca126d298f56e3f1640/ofl/dmsans), designer Colophon Foundry. Upstream source recorded by Google: `googlefonts/dm-fonts` at `d0520ba03bd780f5dccb3024854463d44f699b78`.
- [Barlow license](https://github.com/google/fonts/blob/24ddc1f324cac5d9f5aedca126d298f56e3f1640/ofl/barlowcondensed/OFL.txt): Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow).
- [DM Sans license](https://github.com/google/fonts/blob/24ddc1f324cac5d9f5aedca126d298f56e3f1640/ofl/dmsans/OFL.txt): Copyright 2014 The DM Sans Project Authors (https://github.com/googlefonts/dm-fonts).

Both are **SIL Open Font License 1.1**. Bundling, embedding, modification and redistribution with the game are permitted subject to the included license terms. Do not sell the font software by itself, remove copyright/license notices, relicense the fonts, or imply author endorsement. Neither included license specifies a Reserved Font Name. The fonts retain their family names and OFL licensing after subsetting/conversion. The font license does not impose OFL licensing on the game code or original art.

The **full, unabridged upstream license bytes**, not just links or summaries, are preserved in `licenses/BarlowCondensed-OFL.txt` and `licenses/DMSans-OFL.txt`. `assets/FONTS-NOTICES.txt` includes both complete originals plus provenance/modification notices. DM Sans's upstream CRLF line endings are intentionally preserved inside the combined file. The original embedded name-table copyright and OFL notices are retained in every WOFF2.

## CSS replacement plan

Remove the remote Google Fonts `@import` at line 1 of `dist/styles.css`. Insert the following rules in its place. Keep the existing `--font` and `--display` variables and fallback chains. Copy the five WOFF2 files from bundle `assets/` directly into `dist/` beside the stylesheet. Do not use root-absolute URLs, `local()` sources, Google URLs, or a new nested assets directory.

```css
/* Offline Ironroot font plan. Replace the remote @import with these rules.
   Font files and complete OFL notices must be deployed together.
   Derived from pinned Google Fonts sources; see FONTS-NOTICES.txt. */

@font-face {
  font-family: 'Barlow Condensed';
  src: url('./barlow-condensed-latin-500.woff2') format('woff2');
  font-style: normal;
  font-weight: 500;
  font-display: swap;
}

@font-face {
  font-family: 'Barlow Condensed';
  src: url('./barlow-condensed-latin-600.woff2') format('woff2');
  font-style: normal;
  font-weight: 600;
  font-display: swap;
}

@font-face {
  font-family: 'Barlow Condensed';
  src: url('./barlow-condensed-latin-700.woff2') format('woff2');
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}

@font-face {
  font-family: 'Barlow Condensed';
  src: url('./barlow-condensed-latin-800.woff2') format('woff2');
  font-style: normal;
  font-weight: 800;
  font-display: swap;
}

@font-face {
  font-family: 'DM Sans';
  src: url('./dm-sans-latin-400-700.woff2') format('woff2');
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
}
```

`font-face.css` in the prepared bundle is this insertion snippet, not a new required runtime stylesheet. No `unicode-range` restriction is needed: the actual subset cmap controls fallback. Do not describe the DM file as a static face or declare weights outside 400–700.

## Desktop: exact required changes and non-changes

1. Place the six allowlisted assets directly in `dist/`, then later run the normal staging/build flow. `desktop/scripts/stage.mjs` already copies flat regular files; **no staging recursion, symlink support or path exception is needed**. Existing `game/**/*` packaging already includes them after staging.
2. `desktop/security.cjs` already has **`.woff2: 'font/woff2'`** and `font-src 'self'`. Existing `assetPath` and `readAsset` accept all five flat font filenames. This was exercised against the prepared bundle with the unchanged production security module. **Required font MIME additions: none. Required font asset-path additions: none.** Do not widen network origins, CSP, permissions, Node access or navigation rules.
3. Standalone `.txt` files are currently rejected by the protocol MIME whitelist. That does **not** prevent staging or packaging the notice. The recommended in-game notice approach below embeds text in existing HTML and needs no `.txt` MIME change. If a later reviewed native license screen explicitly serves the standalone notice through the protocol, add only **`.txt: 'text/plain; charset=utf-8'`**. That alone does not make links work: renderer navigation and `connect-src` remain blocked.
4. For an easily viewable desktop sidecar outside ASAR, add this exact item to `desktop/package.json`'s `build.extraResources` during integration, preserving other entries:

```json
{ "from": "game/FONTS-NOTICES.txt", "to": "FONTS-NOTICES.txt" }
```

This puts the complete notice at the packaged resources root, in addition to `game/FONTS-NOTICES.txt`. It does not require a permission/CSP change. Confirm it exists in the built artifact. macOS resources are inside the app bundle.

## Human-readable notices without weakening offline/security behavior

Recommended: put the full HTML-escaped content of `FONTS-NOTICES.txt` in an accessible, collapsible **Font licenses** section within the existing in-game help/settings HTML. A native `details`/`summary` plus wrapped `pre` is enough; do not create another modal. This keeps the text accessible in both browser and desktop without fetching, opening windows or navigating. Retain the standalone notice asset for redistribution and the desktop sidecar described above.

Do not rely on a bare link to `FONTS-NOTICES.txt`: the current web service worker redirects every navigation to cached `index.html`, and desktop blocks navigation, windows, frames and fetch connections. If a future web-only link is chosen instead of embedded text, the exact notice path must be excluded from the app-shell navigation fallback and served via normal same-origin cache lookup. No such change was made here.

## Service worker and publishing

Append these six entries to the existing `FILES` list in `dist/service-worker.js`:

```js
'./barlow-condensed-latin-500.woff2',
'./barlow-condensed-latin-600.woff2',
'./barlow-condensed-latin-700.woff2',
'./barlow-condensed-latin-800.woff2',
'./dm-sans-latin-400-700.woff2',
'./FONTS-NOTICES.txt',
```

Keep the existing atomic `cache.addAll(FILES)` behavior. A missing font or notice must fail the new cache install rather than leave a partial offline release. Bump the release/cache version together according to the project's existing version-alignment test; do not change the currently frozen candidate. No cross-origin font caching or runtime font-service allowlist is needed after removing the import.

The hosting configuration already serves `dist` as its static root. No configuration-file or origin change is needed. Extend only the external explicit publishing allowlist with the six basenames above. Verify web font responses are `font/woff2`, are real WOFF2 bytes rather than fallback HTML, and come from the game's own origin. Serve standalone notice responses as `text/plain; charset=utf-8` if directly exposed.

## Coverage and limits

The subset includes common Western Latin, general punctuation, required combining marks and every currently present UI symbol that each upstream font actually supports. All ASCII printable characters are present. Exact requested/mapped ranges and retained feature tags are in `reports/verification.json`.

Several existing UI icons are **system font fallbacks**, not supplied by these families: `◆ ♜ ⚑ ★ ✓ ♪ ☆ Ⅱ ⚙ ⌂ ⚔ ✦ ♫ ♥ ▶ ↻ ○`. DM Sans includes `→` and `↑`; Barlow does not. These icons already lack glyphs in the pinned full upstream sources. Offline text is self-contained, but identical icon appearance across operating systems is **not** promised. Replacing those icons with owned SVG/canvas assets is a separate polish task.

This is not a complete Latin-extended, Vietnamese, Greek or Cyrillic localization bundle. Rebuild with a reviewed broader charset before adding languages. FontTools did not execute downloaded font hint programs or repository code. Browser/font-sanitizer acceptance and visual matching to the live Google-hosted revision are still pending integration QA.

## Completed verification

- All five source TTFs have TrueType magic `00 01 00 00`; upstream byte counts and Git blob IDs match.
- Every output has `wOF2` magic, TrueType flavor, a declared header length equal to its actual byte length, and complete table decompilation without checksum errors.
- Declared families, weights, DM variable axis range, normal style, embedding flags and copyright/license metadata were inspected. Independent preinstalled `fc-scan` recognizes all five faces.
- Existing desktop `readAsset` returns each prepared font with `font/woff2`; the `.txt` limitation was confirmed without changing security code.
- Every retained mapped glyph's outline and advance were compared with its upstream source. Barlow matches exactly. DM Sans matches at 400; maximum coordinate/advance deviations at 500/600/700 are 0.303/0.682/0.965 font units after variable range reparameterization. At 1,000 units/em this is below 0.062 CSS pixels even at 64px. No metric/outline error exceeded one font unit.
- Rebuilding with preinstalled **FontTools 4.57.0** and **Brotli 1.1.0** produced identical asset hashes. No package was installed.
- Full required license bytes survive intact inside the combined notice. Individual upstream notices remain separately available in the bundle.
- No download was denied, no access restriction was bypassed, and no browser/server was started.

Reports: `reports/verification.json`, `reports/validation-results.json`, `reports/source-validation.json`, and per-file `fc-scan` text. Reproduce with `/usr/bin/python3 build_bundle.py`, `/usr/bin/python3 verify_bundle.py`, and `sha256sum --check SHA256SUMS` from the bundle directory. Different tool versions may produce different compressed bytes; preserve the pinned inputs and review updated hashes.

## Integration acceptance gate

These checks are **not yet run**, because integration is intentionally deferred:

- Run existing complete tests/syntax checks; add static assertions that Google font URLs are absent, all five CSS URLs/weights match real assets, all six files are precached, licenses remain included, and publishing/staging retains exact hashes.
- Verify the Font Loading API after `document.fonts.ready` actually resolves Barlow at 500/600/700/800 and DM Sans at 400/500/600/700, including real painted text and Canvas2D labels. A truthy `document.fonts.check` alone is not proof of the intended face.
- At desktop and mobile sizes, inspect title/menu widths, HUD numerals, field guide statistics, dense tooltips, italic body copy, settings and campaign text for clipping or unexpected wrapping.
- Browser: install the new version online once, then reload/reopen offline. Fonts and full notices must remain available, with no requests to Google Fonts. A first-ever offline web visit is not promised.
- Packaged desktop: disconnect networking **before first launch**, verify real font rendering and the readable notice sidecar, and ensure all existing network/navigation denials and saved-profile behavior remain intact.
- Confirm no private docs, upstream source archive, `.openai` metadata, test data or preparation scripts entered the public browser artifact.


## Local 0.9 integration

The six distribution assets are now in dist, with local CSS faces replacing the external import. Full notices are included both as the byte-exact standalone file and an escaped, scrollable Credits & font licenses section in Preferences. The versioned offline cache lists all six files. No security or navigation permissions changed. Source hashes, WOFF2 headers, CSS/cache references and the full in-game notice text have automated tests. Actual browser and native packaged rendering remain unverified until the 0.9 review.
