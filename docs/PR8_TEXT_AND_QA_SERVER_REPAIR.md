# PR8 compact text and QA server repair

## Changes

- Add one pixel of vertical padding inside the compact campaign coach's existing scrolling box. Native evidence on the preceding candidate showed a 16px text range starting one pixel above its 15px line box, outside the scrolling owner. The inset keeps that ascent inside the owner without changing the reserved rail, font, line height, canvas geometry or 44px action targets.
- Read static file bytes before sending a successful QA-server response. Missing `/favicon.ico` previously sent 200 headers before the failed read attempted a second 404 header, producing `ERR_HTTP_HEADERS_SENT`. Routes, methods, path checks and the loopback listener are unchanged.

## Local validation

The following source/Node checks passed, 46 tests with no failures or skips:

```sh
node --test tests/mobile-coach-text-inset.test.mjs tests/qa-server-response.test.mjs tests/campaign-teaching-integration.test.mjs tests/phone-browser-evidence.test.mjs
node --check qa/browser/server.mjs
```

The new text tests use source-derived geometry and the previously observed range metrics. They retain a zero-inset negative control and check the top ascent and three-line fit, including the 44px short-portrait rail. They do not measure native wrapping or fonts.

The server tests execute the actual request-handler source with a strict response double and real local file reads. Missing GET/HEAD requests must produce exactly one 404, then the same handler must serve the real index successfully. A deferred failing read must not emit success headers. No server listener or browser is launched by these tests.

## Remaining gate

Native browser execution on the repaired combined candidate is still required. The existing mobile character-containment assertion and its tolerances remain unchanged. These local results do not certify browser glyph containment, layout, screenshots or physical devices.
