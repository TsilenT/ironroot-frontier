# Battle keyboard controls candidate

This is an unmerged, undeployed v0.17.1 candidate based on main
`3548031a3e8d8e04c7b81784d6c0fe174b1522fe`. The preceding PR changed tests only.

Options has a native disclosure for twelve physical-key bindings: eight roster
slots, Arrow volley, pause/resume and left/right pan. Missing bindings inherit
defaults; explicit null unbinds. Duplicate effective bindings are rejected without
changing another action. Escape stays the layered cancel/menu action. Guided
practice keeps its defaults and has no profile/storage access.

Dispatch uses the existing paid build, volley, pause and pan handlers. Keyboard
events already handled elsewhere, IME composition, modifier combinations and
text entry and native activation/control-editing keys do not trigger battle actions. Only pan repeats.
Capture retires held keys using the existing input-scope guard. Leaving focus,
Tab, Escape, Back, closure, blur, visibility loss and recovery cancel capture.

The optional version-1 map lives in the existing verified preferences. Backup
validation covers the map; quota/readback/retry, retained exports, rollback and
old backups use the existing persistence path. Protocol 7 prevents older clients
that reconstruct only six preferences from discarding keyboard settings. A pinned
actual v0.17 protocol-six client verifies both already-open and later-opened
clients, including destructive recovery refusal. No battle identity or campaign
progress schema changed.

The review follow-up admits non-activation shortcut keys only on the active
battle HUD and on Resume in the pause menu. Clicking build, Home, Front or
volley keeps its native focus, and both defaults and remapped keys still work.
Input/select/range, links, disclosures, coach scrolling and inherited editing
remain protected. Resume supports P → P without forced focus, while held P
cannot double-toggle and native Enter/Space still activate the button. A
confirmed preference retry also clears the keyboard-specific page-only status.
Options explains key positions without exposing a JavaScript property name;
the implementation uses KeyboardEvent.code.

## Validation

The final runtime and browser spec are at source head
`a55d85fa2035b808aa332fbd1e7c54f8c9c0bc04`; the final evidence-only commit
also adds the new spec to the browser syntax preflight. No engine, AI, campaign
identity, touch gesture or gamepad mapping changed.

- `npm test`: **1,378 passed, zero failed, one optional desktop-tooling skip**
  (1,379 total checks). Final source syntax and 51-file offline/runtime inventory
  checks pass. Browser syntax/fixture preflight passes too.
- New real-browser gate: **20 passed, zero failed, 48 intentional profile
  exclusions**, Chromium 155.0.8059.79 / Playwright 1.65.0 / Node 24.22.1,
  two workers and ordinary real time. The exclusions avoid running desktop-only
  cases on touch profiles and duplicate regular-phone layout cases.
- Pertinent existing desktop regression gate: **103 passed, zero failed** on
  the final runtime. Its seven suites cover mouse, pause, Back, practice history,
  backup/controller, storage recovery and practice. Together the final browser
  gates cover **123 applicable cases**. Source-head GitHub validation also passed
  ([run 42392999372](https://github.com/TsilenT/ironroot-frontier/actions/runs/42392999372)).
- Persistence/profile focused checks separately passed 149 checks. Final
  real-handler/persistence/protected-controls review checks passed 76.

The new gate checks actual remap/clear/default/reload, native disclosure/select/
range behavior, actual fullscreen entry/exit through Enter and Space, trusted
modifier delivery, capture opening and release, native document blur, pending
preferences/export/retry, two-/five-/eight-building roster semantics, first paid
build automatic start and genuine mouse/touch costs. It also checks P → P and
click → shortcut without forced canvas focus, plus Right arrow and Numpad 9
badge bounds against the card, icon and name at desktop, 320×568 and 844×390.
All assertions after an initially failed stage remain in the final tests.

## Retained failure stages

The first new-browser pass had 9 passes and 6 failures. It exposed one runtime
defect: moving focus out of capture advanced the pointer scope, swallowing the
click that should close a native disclosure. Capture now retires keys only;
ordinary focus-changing pointer clicks proceed. Other failures were a copy
expectation repeated in three cases, a screen-pixel versus world-coordinate pan
assertion, and a headless window-focus probe that never emitted blur. The final
blur check uses trusted focus transfer into another document and does not claim
OS window switching. Downstream assertions remain in the tests.

The first full Node pass recorded 1,350 passes, 26 failures and one optional
desktop-tooling skip. Those failures were added helper dependencies in extracted
app harnesses, dynamic shortcut-copy expectations and candidate version/protocol
expectations. Their full logs are retained alongside follow-up results. The second full pass
had one remaining extracted-harness dependency failure (keyboardLoadWarning);
that harness was initialized explicitly, then the final 1,379-check run passed
with only the pre-existing optional desktop-tooling skip.

Evidence is under `qa/keyboard-controls/`. First-run browser traces/screenshots
remain in the task workspace at `/tmp/ironroot-keyboard-first-failure-artifacts/`; compact JSON and logs
are committed. No virtual-time harness, forced clicks or free-resource placement
was used for the new browser gate. Chromium automation and emulated touch do not
establish physical-device, non-Chromium or Steam certification.

Independent-review negative controls run the strengthened tests against exact
original draft `0707617638aba7352119d74df1437647465f518f` in a separate checkout.
All three fail at the reported boundaries: P cannot resume, an ordinary build
click suppresses the next R, and retry leaves the keyboard page-only status.
The original runtime is unchanged; only the new regression spec is copied into
that checkout. Logs and JSON are retained as `browser-original-negative.*`.

Long-label screenshots: [desktop](../qa/keyboard-controls/long-key-labels-desktop.png),
[short portrait](../qa/keyboard-controls/long-key-labels-narrow-phone.png), and
[landscape](../qa/keyboard-controls/long-key-labels-landscape.png). The bounded
three-case screenshot repeat passed and does not add cases to the 123 unique
checks reported above.
