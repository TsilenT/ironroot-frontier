// Deterministic History API lifecycle, including asynchronous traversal. This
// tests routing code, not browser/Android/PWA rendering or OS behavior.
export function historyWindow(initialState = null) {
  const entries = [{state: {external: true}, url: '/prior'}, {state: initialState, url: '/game'}];
  let index = 1, listener = null;
  const tasks = [], writes = [], events = [];
  const history = {
    get state() { return structuredClone(entries[index].state); },
    get length() { return entries.length; },
    replaceState(state, title, url) {
      writes.push({method: 'replace', index, state: structuredClone(state), url});
      entries[index] = {state: structuredClone(state), url: url || entries[index].url};
    },
    pushState(state, title, url) {
      writes.push({method: 'push', index: index + 1, state: structuredClone(state), url});
      entries.splice(++index, Infinity, {state: structuredClone(state), url: url || entries[index - 1].url});
    },
    go(delta) { tasks.push(() => {
      const target = Math.min(entries.length - 1, Math.max(0, index + delta));
      if (target === index) return;
      index = target;
      if (entries[index].url === '/game') { const event = {state: history.state}; events.push(event); listener?.(event); }
    }); },
  };
  return {history, entries, writes, events, get index() {return index;},
    listen(handler) { listener = handler; return () => { listener = null; }; },
    defer(handler) { tasks.push(handler); },
    flush() { let count = 0; while (tasks.length) { if (++count > 100) throw Error('navigation loop'); tasks.shift()(); } },
    back() {history.go(-1); this.flush();}, forward() {history.go(1); this.flush();},
    dispatch(state) {listener?.({state});},
  };
}
