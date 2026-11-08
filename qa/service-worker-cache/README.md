# Warm HTTP-cache update regression

This manual native-browser check uses ordinary loopback HTTP and the actual prior and candidate runtime files. It does not inspect browser internals, automate a browser, clear storage, or contact production.

Run from the repository root:

```
node qa/service-worker-cache/serve.mjs /absolute/path/to/verified/prior/runtime
```

Open `http://127.0.0.1:4319/` in a native browser and click **Run warm-cache comparison** once. Use a fresh test origin. Do not use DevTools Disable cache or request interception: those remove the behavior this test exercises.

The server serves immutable prior bytes, then switches only the isolated scenario to candidate bytes. It deliberately gives shell assets a one-hour HTTP-cache lifetime. The page warms that cache, registers the real prior worker, advances the server, requests an update, waits for activation, and hashes every unique shell asset in the installed cache. Only the worker cache name is made test-specific. The `default` case also restores the previous string-only `addAll` call. The `reload` case executes the candidate's real installation code.

Pass requires old-code mismatches, zero candidate mismatches, and an unchanged localStorage probe. The probe is not a paid-game checkpoint or a real-user-profile migration test. The dashboard displays server request receipts, so the candidate's fresh network requests can be distinguished from cache hits. The server is bound to loopback and does not enable a production diagnostic endpoint.

This is one Chromium cache/update test, not full browser, mobile/PWA, failed-network, or complete save-migration certification. `tests/service-worker-cache-refresh.test.mjs` separately models failed-install and offline-serving behavior.
