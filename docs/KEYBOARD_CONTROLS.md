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

A review follow-up narrows the native button guard to Enter/Space activation,
so a remapped pause key can resume while Resume has focus. Input/select/range
and inherited contenteditable remain fully protected. The real-handler and
browser tests now assert both remapped resume and native Enter.

## Validation in progress

- Before the initial draft PR: 40 focused Node checks passed, including actual
  handler/capture, persistence and scope-guard tests. The persistence subset plus
  existing profile/backup suites separately passed 149 checks.
- The second new Chromium gate passed 15 applicable checks with 41 intentional
  profile exclusions. A sixteenth persistence/export check is being added.
- Full Node, browser fixture preflight and pertinent existing browser regressions
  are pending final results. Final evidence will be recorded on the review head.

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
expectations. Their full logs are retained alongside follow-up results.

Evidence is under `qa/keyboard-controls/`. First-run browser traces/screenshots
remain in the task workspace's `first-failure-artifacts/`; compact JSON and logs
are committed. No virtual-time harness, forced clicks or free-resource placement
was used for the new browser gate. Chromium automation and emulated touch do not
establish physical-device, non-Chromium or Steam certification.
