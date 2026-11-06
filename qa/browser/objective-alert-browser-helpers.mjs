// Pass-through browser observations only. No GameAudio replacement, mocked
// AudioContext, intercepted app module, app hook, fake timer or engine writes.
export function installObjectiveAudioObservation() {
  const probe = {contexts: new Set(), tones: []};
  window.__qaObjectiveAudio = probe;
  if (!globalThis.BaseAudioContext || !globalThis.AudioParam) return;
  const values = new WeakMap();
  const setValue = AudioParam.prototype.setValueAtTime;
  AudioParam.prototype.setValueAtTime = function (value, at) {
    const result = Reflect.apply(setValue, this, [value, at]);
    values.set(this, value);
    return result;
  };
  const createGain = BaseAudioContext.prototype.createGain;
  BaseAudioContext.prototype.createGain = function (...args) {
    const node = Reflect.apply(createGain, this, args);
    probe.contexts.add(this);
    return node;
  };
  const createOscillator = BaseAudioContext.prototype.createOscillator;
  BaseAudioContext.prototype.createOscillator = function (...args) {
    const source = Reflect.apply(createOscillator, this, args);
    const start = source.start;
    source.start = function (...startArgs) {
      const result = Reflect.apply(start, this, startArgs);
      probe.tones.push({type: this.type, frequency: values.get(this.frequency), at: startArgs[0],
        running: this.context.state === 'running',
        resultVisible: !document.getElementById('resultModal')?.classList.contains('hidden')});
      return result;
    };
    return source;
  };
}

export async function observeObjectiveStatus(page) {
  await page.evaluate(() => {
    const element = document.getElementById('protectedAlert');
    const probe = {writes: [], frames: 0};
    window.__qaObjectiveStatus = probe;
    const observer = new MutationObserver(records => {
      for (const record of records) {
        // Count actual DOM writes, including repeated assignment of equal text.
        // Empty setup writes are retained, but are not danger announcements.
        probe.writes.push({text: record.target.textContent,
          resultVisible: !document.getElementById('resultModal').classList.contains('hidden')});
      }
    });
    observer.observe(element, {childList: true, characterData: true, subtree: true});
    const countFrame = () => {probe.frames++; requestAnimationFrame(countFrame);};
    requestAnimationFrame(countFrame);
  });
}

export async function statusWrites(page) {
  return page.evaluate(() => window.__qaObjectiveStatus.writes.filter(write => write.text));
}
export async function warningTones(page) {
  // The existing warning is three 392 Hz triangle voices. Music is disabled
  // through real preferences so this signature cannot be a score note.
  return page.evaluate(() => window.__qaObjectiveAudio.tones.filter(tone => tone.type === 'triangle' && tone.frequency === 392));
}
export async function waitForObservedFrames(page, count = 30) {
  const initial = await page.evaluate(() => window.__qaObjectiveStatus.frames);
  await page.waitForFunction(({initial, count}) => window.__qaObjectiveStatus.frames >= initial + count,
    {initial, count});
}
