# First barracks starts Roadside Watch

The fresh, unfinished Roadside Watch lesson opens directly in the normal build interface. Its UI teaching hold stops the simulation, income and production until the player successfully pays for and places a barracks. The lesson does not show its previous Plan/Play choice or Start button. Hints explain the automatic start.

During this initial step, other purchases are rejected with “Build a barracks first to begin.” This prevents spending the opening treasury on archery and getting stuck without income. The normal roster becomes usable as soon as the barracks is placed. Invalid, blocked, unaffordable, out-of-territory, stale-tab, modal, viewport or paused interactions cannot trigger the start. Inspection and cancellation are safe.

Pause opens the ordinary pause menu. Resume, Options Done and supported Back navigation return to planning while the initial hold remains. A successful paid build clears only the teaching hold, never an unrelated manual pause. The transition invalidates held pointer, keyboard and controller input. Default placement remains one-shot; an explicit mouse Shift repeat preserves its selected building for a fresh subsequent gesture.

The hold is presentation state, not a new save field. Existing resumed saves continue running normally, including a checkpoint saved before the first barracks. Completed replays do not automatically hold. Explicit manual teaching and later/legacy lessons retain their existing Plan/Play behavior. Fresh restarts of unfinished Roadside repeat the first-build step without changing scenario, map, ruleset or save identities. Unavailable storage retains the existing unsaved-play behavior and warnings rather than leaving a paid barracks stuck in a permanent hold.

Focused executable coverage: tests/first-build-start.test.mjs, tests/campaign-teaching-integration.test.mjs and tests/build-completion.test.mjs. Native browser coverage is defined in qa/browser/first-build-start.spec.mjs; execution belongs to the integration pass, not this implementation note.
