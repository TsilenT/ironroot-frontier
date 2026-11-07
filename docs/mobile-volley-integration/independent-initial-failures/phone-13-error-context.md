# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: volley-independent.spec.mjs >> independent: native history readiness >> candidate seeded-reload: Back/Forward markers, targeting, Resume and profile
- Location: qa/browser/volley-independent.spec.mjs:68:5

# Error details

```
Error: new native popstate must carry the full expected document/entry identity

new native popstate must carry the full expected document/entry identity

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=f1e1]:
  - generic [ref=f1e2]:
    - banner [ref=f1e3]:
      - generic [ref=f1e4]:
        - generic [ref=f1e5]:
          - generic [ref=f1e6]: ◆
          - generic [ref=f1e7]: "425"
          - generic [ref=f1e8]: +5 /s
        - generic [ref=f1e9]:
          - generic [ref=f1e10]: ⚑
          - generic "0 / 70 army capacity" [ref=f1e11]: "0"
        - generic [ref=f1e12]: 00:01
      - generic:
        - generic:
          - generic: YOUR CITADEL
          - generic: 100%
        - generic:
          - text: THE LONG REACH
          - generic: THREE LANES · 24 SITES
        - generic:
          - generic: ENEMY CITADEL
          - generic: 100%
    - main [ref=f1e14]:
      - 'generic "Battlefield. Choose a building, then a green build slot to place it once. Hold Shift with a mouse click to keep building. Drag or middle mouse drag to explore. Right-click or Escape cancels placement. Pan left: Left arrow. Pan right: Right arrow. Battle keyboard controls are in Options." [ref=f1e15]'
      - status [ref=f1e16]
      - status: Battle resumed.
    - generic [ref=f1e17]:
      - region "Mission objectives":
        - generic: NORMAL · SKIRMISH
        - generic: Destroy the enemy citadel.
        - generic: 3 roads
    - navigation "Battle controls" [ref=f1e18]:
      - button "Open building controls" [disabled] [ref=f1e19]: Build
      - generic [ref=f1e20]:
        - button "Resume game" [ref=f1e21] [cursor=pointer]: ▶
        - button "Change battle speed" [ref=f1e22] [cursor=pointer]: 1×
        - button "Arrow volley, 75 gold. Paused." [disabled] [ref=f1e23] [cursor=pointer]:
          - generic [ref=f1e24]: Volley
          - generic [ref=f1e25]:
            - text: ◆ 75
            - emphasis [ref=f1e26]: Paused
        - button "Open options" [ref=f1e27] [cursor=pointer]: ⚙
      - generic [ref=f1e28]:
        - button "Go to your base" [ref=f1e29] [cursor=pointer]: ⌂
        - generic "Map overview. Tap to move the camera." [ref=f1e30] [cursor=pointer]
        - button "Follow the frontline" [ref=f1e31] [cursor=pointer]: ⚔
  - dialog "Paused" [ref=f1e33]:
    - banner [ref=f1e34]:
      - generic [ref=f1e35]: BATTLE MENU
      - heading "Paused" [level=2] [ref=f1e36]
      - paragraph [ref=f1e37]: Skirmish · 00:01 · 1× speed
    - generic [ref=f1e38]:
      - heading "Classic" [level=3] [ref=f1e39]
      - paragraph [ref=f1e40]: Destroy the enemy citadel.
    - button "Resume battle" [active] [ref=f1e41] [cursor=pointer]:
      - text: Resume battle
      - generic [aria-hidden] [ref=f1e42]: →
    - generic [ref=f1e43]:
      - button "Options Audio, display & saves" [ref=f1e44] [cursor=pointer]:
        - text: Options
        - generic [ref=f1e45]: Audio, display & saves
      - button "Open field guide" [ref=f1e46] [cursor=pointer]:
        - text: Field guide
        - generic [ref=f1e47]: Units, controls & economy
    - status [ref=f1e48]: Checkpoint saved on this device. You can return to this battle from the title screen.
    - generic [ref=f1e49]:
      - button "Save & return to title" [ref=f1e50] [cursor=pointer]
      - button "Restart battle…" [ref=f1e51] [cursor=pointer]
```

# Test source

```ts
  24  |   await context.route('http://127.0.0.1:4187/**', async route => {
  25  |     const path = new URL(route.request().url()).pathname.replace(/\/$/, '/index.html');
  26  |     const asset = baseAssets.get(path);
  27  |     if (!asset) return route.continue();
  28  |     await route.fulfill({status:200,body:asset.body,contentType:mime[extname(path)] || 'application/octet-stream',headers:{'Cache-Control':'no-store'}});
  29  |   });
  30  |   return Object.fromEntries([...baseAssets].map(([path, value]) => [path, value.sha256]));
  31  | }
  32  | 
  33  | export async function observeVolleyHistory(page) {
  34  |   const records = [], checks = [], entries = [];
  35  |   let index = -1;
  36  |   function accept(record) {
  37  |     records.push(record);
  38  |     // This passive ledger retains full opaque identities, including the prior
  39  |     // document's entries across a fixture reload. It is not written to the app.
  40  |     if (record.kind === 'document-start' || record.kind === 'popstate' || record.kind === 'pageshow') {
  41  |       const found = entries.findIndex(entry => entry && (marker(record.state)
  42  |         ? equal(entry.state, record.state) : !marker(entry.state) && entry.url === record.url));
  43  |       if (found >= 0) index = found;
  44  |       else if (record.kind === 'document-start') {
  45  |         index = record.length - 1;
  46  |         entries.length = record.length;
  47  |         entries[index] = {state:record.state,url:record.url};
  48  |       }
  49  |     }
  50  |     if (record.kind === 'after pushState') {
  51  |       entries.splice(index + 1);
  52  |       entries.push({state:record.state,url:record.url});
  53  |       index++;
  54  |     }
  55  |     if (record.kind === 'after replaceState') entries[index] = {state:record.state,url:record.url};
  56  |   }
  57  |   await page.exposeBinding('__volleyHistorySink', (_source, record) => accept(record));
  58  |   await page.addInitScript(() => {
  59  |     const documentId = crypto.randomUUID(), pending = [];
  60  |     let sequence = 0, pops = 0;
  61  |     const copy = value => value == null ? null : structuredClone(value);
  62  |     const snapshot = () => ({documentId, sequence:++sequence, timeOrigin:performance.timeOrigin,
  63  |       at:performance.now(), wallTime:Date.now(), url:location.href, length:history.length,
  64  |       state:copy(history.state), pops, armed:document.querySelector('#rally')?.classList.contains('active') ?? false,
  65  |       paused:document.querySelector('#pauseVeil')?.classList.contains('hidden') === false});
  66  |     const record = (kind, detail = {}) => {
  67  |       const value = {...snapshot(),kind,...detail};
  68  |       pending.push(window.__volleyHistorySink(value));
  69  |       return value;
  70  |     };
  71  |     window.__volleyHistoryProbe = {record,snapshot,flush:() => Promise.all(pending)};
  72  |     record('document-start', {navigationType:performance.getEntriesByType('navigation')[0]?.type});
  73  |     for (const name of ['pushState','replaceState','go','back','forward']) {
  74  |       const original = history[name];
  75  |       history[name] = function(...args) {
  76  |         record('before ' + name, {args:copy(args)});
  77  |         try {const result = original.apply(this,args);record('after ' + name);return result;}
  78  |         catch (error) {record('throw ' + name, {error:String(error)});throw error;}
  79  |       };
  80  |     }
  81  |     addEventListener('popstate', event => {
  82  |       pops++;record('popstate', {eventState:copy(event.state)});
  83  |       queueMicrotask(() => record('after popstate microtask'));
  84  |     });
  85  |     for (const name of ['pageshow','pagehide']) addEventListener(name, event => record(name, {persisted:event.persisted}));
  86  |     document.addEventListener('click', event => record('click', {target:event.target.closest('button')?.id ?? event.target.id}), true);
  87  |     document.addEventListener('keyup', event => record('keyup', {code:event.code}), true);
  88  |   });
  89  |   const flush = () => page.evaluate(() => window.__volleyHistoryProbe?.flush());
  90  |   const snapshot = () => page.evaluate(() => window.__volleyHistoryProbe.snapshot());
  91  |   async function ready() {
  92  |     // Let native UI handlers, mutation observers and queued history reconciliation
  93  |     // complete; if go() is pending, require its actual new popstate as well.
  94  |     await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  95  |     await flush();
  96  |     const lastGo = records.findLast(record => ['before go','before back','before forward'].includes(record.kind));
  97  |     if (lastGo) await expect.poll(async () => {
  98  |       await flush();
  99  |       return records.some(record => record.documentId === lastGo.documentId && record.kind === 'popstate' && record.sequence > lastGo.sequence)
  100 |         || (await snapshot()).documentId !== lastGo.documentId;
  101 |     }, {message:'pending native traversal must finish before the next action'}).toBe(true);
  102 |     await flush();
  103 |     const current = await snapshot();
  104 |     expect(entries[index]?.state, 'passive ledger agrees with the full native marker').toEqual(current.state);
  105 |     expect(entries.length).toBe(current.length);
  106 |     return current;
  107 |   }
  108 |   async function mark(label, detail = {}) {
  109 |     const current = await page.evaluate(label => window.__volleyHistoryProbe.record(label), label);
  110 |     await flush();checks.push({label,...detail,...current});return current;
  111 |   }
  112 |   async function traverse(direction) {
  113 |     const before = await ready(), destination = entries[index + (direction === 'back' ? -1 : 1)];
  114 |     expect(destination, 'observed native history destination exists').toBeTruthy();
  115 |     const expected = structuredClone(destination);
  116 |     const count = records.filter(record => record.kind === 'popstate').length;
  117 |     checks.push({label:'expected ' + direction,from:before.state,to:expected.state,documentId:before.documentId,popCountBefore:count});
  118 |     await page.evaluate(direction => history[direction](), direction);
  119 |     if (marker(expected.state)) {
  120 |       await expect.poll(async () => {
  121 |         await flush();
  122 |         return records.filter(record => record.kind === 'popstate').slice(count).some(record =>
  123 |           record.documentId === before.documentId && equal(record.eventState, expected.state) && equal(record.state, expected.state));
> 124 |       }, {message:'new native popstate must carry the full expected document/entry identity'}).toBe(true);
      |                                                                                                ^ Error: new native popstate must carry the full expected document/entry identity
  125 |       await expect.poll(async () => (await snapshot()).state, {message:'native current marker reaches the expected destination'}).toEqual(expected.state);
  126 |       return ready();
  127 |     }
  128 |     await expect(page).toHaveURL(expected.url);
  129 |     await expect.poll(async () => (await snapshot()).documentId).not.toBe(before.documentId);
  130 |     await flush();return snapshot();
  131 |   }
  132 |   async function attach(info, detail) {
  133 |     // Always called in finally, including a failed readiness or UI assertion.
  134 |     try {await flush();} catch (error) {records.push({kind:'final flush error',error:String(error)});}
  135 |     await info.attach('complete-native-history-trace', {body:JSON.stringify({...detail,checks,records}),contentType:'application/json'});
  136 |   }
  137 |   function assertOpaqueStates() {
  138 |     for (const record of records) for (const state of [record.state,record.eventState]) {
  139 |       if (state == null) continue;
  140 |       expect(Object.keys(state)).toEqual(['ironrootNavigation']);
  141 |       expect(Object.keys(state.ironrootNavigation).sort()).toEqual(['document','entry','version']);
  142 |     }
  143 |   }
  144 |   return {ready,mark,traverse,attach,assertOpaqueStates};
  145 | }
  146 | 
```