# Guided practice: desktop route policy

The title page links to `./training.html`, and Guided practice returns through
`./`. Previously, the desktop shell canceled every renderer navigation, so those
links could not work in a packaged app even though browser navigation worked.

## Narrow exception

`desktop/security.cjs` now exports `isGameNavigation`. It accepts only these
canonical absolute page URLs under the existing origin:

- `ironroot://game/`
- `ironroot://game/index.html`
- `ironroot://game/training.html`

Optional fragments are accepted, including an empty fragment. Query strings,
including an empty `?`, are rejected. Fragment contents do not select an asset.
Other filenames, subdirectories, encoded path spellings, raw dot-segment aliases,
credentials, ports (including an empty port marker), foreign origins and schemes,
relative URLs, and noncanonical/control-character spellings are rejected by the
helper. This checks the absolute URL Electron supplies, not the original HTML
spelling of a link, which Chromium may already have normalized.

The same guard handles `will-navigate`, `will-frame-navigate` and `will-redirect`.
The navigation event must identify a main frame with `isMainFrame === true` and
provide an allowed `url`. Subframe navigation and missing or malformed metadata
remain denied. Redirects get no broader exception; each destination must pass the
same policy. The local protocol handler still serves only GET asset responses and
does not create redirects.

The [official Electron webContents event documentation](https://www.electronjs.org/docs/latest/api/web-contents#event-will-frame-navigate)
was checked for argument shapes. All three events expose `url` and `isMainFrame`
on the first Event/details argument. `will-navigate` and `will-redirect` also expose
deprecated positional arguments, but `will-frame-navigate` does not. The guard
uses the current event fields rather than assuming a second-argument details
object. It fails closed if those fields are unavailable.

Same-document history/fragment changes do not emit these cancelable events. This
policy constrains document navigation, not a page's same-document URL changes.
The shell's sole programmatic initial load remains the fixed `ENTRY` URL.

## Boundaries left unchanged

- Existing fixed-origin request validation, asset extension checks, traversal
  containment and realpath/symlink containment.
- Sandbox, context isolation, disabled Node integration, web security, and the
  absence of a preload or general renderer-to-Node bridge.
- CSP, permission denial, download denial, new-window denial, webview denial,
  and absence of external-open handling.
- Persistent origin and storage partition, packaging configuration and assets.

`DESKTOP.md` records this explicit, top-level bundled-page exception. No arbitrary
local HTML or external navigation was enabled.

## Source-level verification and limits

Run from the repository root:

```sh
node --check desktop/security.cjs
node --check desktop/main.cjs
node --test tests/desktop-training.test.mjs tests/desktop.test.mjs
```

The new tests exercise the route helper, actual title/practice/return hrefs,
repeated forward/return transitions, both navigation listeners, redirect targets,
subframe and malformed metadata denial, adversarial origins and path spellings,
and the existing privileged-action restrictions. They execute the real
`main.cjs` with mocked Electron APIs. Existing desktop tests retain asset traversal,
symlink, CSP, export denial and package-contract coverage.

**These desktop route policy tests are not actual packaged-runtime verification.**
No Electron launch, browser run, staging, package build, server, publication,
source transfer or system/security-settings change was performed for this patch.
The tests cannot establish Chromium's actual event delivery, navigation timing,
history behavior, packaged asset presence or native-platform behavior. The full
game aggregate is run separately by the integration task.

Before release, verify in an actual authorized packaged runtime on every shipping
platform: title to practice, practice return to the title, repeated transitions,
offline asset loading, preserved campaign/profile data, fragment behavior,
blocked arbitrary/external pages, blocked subframes/new windows/redirect escapes,
and normal close/reopen. Do not claim that gate passed based on these mocks.
