// A standard Gamepad API double, installed before application startup. This
// function is self-contained so addInitScript and the Node contracts run the
// same provider. It never reads or writes application state.
export function installSyntheticGamepad() {
  const pad = window.__qaPad = {
    connected: true,
    axes: [0, 0, 0, 0],
    buttons: Array(17).fill(false),
  };
  window.__qaPadPolls = 0;

  function validateButton(index) {
    if (!Number.isInteger(index) || index < 0 || index >= pad.buttons.length) {
      throw new RangeError('Synthetic gamepad button index is invalid');
    }
  }

  const input = window.__qaGamepad = {
    tapIndex: null,
    steering: null,
    neutral() {
      pad.buttons.fill(false);
      pad.axes = [0, 0, 0, 0];
      this.tapIndex = null;
      this.steering = null;
      return window.__qaPadPolls;
    },
    tap(index) {
      validateButton(index);
      this.neutral();
      pad.buttons[index] = true;
      this.tapIndex = index;
      return window.__qaPadPolls;
    },
    hold(index) {
      validateButton(index);
      this.neutral();
      pad.buttons[index] = true;
      return window.__qaPadPolls;
    },
    steerTo(target) {
      if (!Number.isFinite(target?.x) || !Number.isFinite(target?.y)) {
        throw new TypeError('Synthetic gamepad target requires finite coordinates');
      }
      this.neutral();
      this.steering = { target: { x: target.x, y: target.y }, status: 'moving' };
    },
  };

  Object.defineProperty(navigator, 'getGamepads', {
    configurable: true,
    value: () => {
      window.__qaPadPolls++;
      if (!pad.connected) {
        input.neutral();
        return [];
      }

      if (input.steering?.status === 'moving') {
        // Observe the rendered cursor at the same sampling boundary that
        // supplies the next stick input. No Playwright round trip can keep
        // an obsolete direction held after this sample reaches the target.
        const cursor = document.getElementById('controllerCursor');
        const box = cursor?.getBoundingClientRect();
        if (!box || box.width <= 0 || box.height <= 0) {
          input.steering.status = 'cursor unavailable';
          pad.axes = [0, 0, 0, 0];
          pad.buttons[6] = false;
        } else {
          const dx = input.steering.target.x - box.x - box.width / 2;
          const dy = input.steering.target.y - box.y - box.height / 2;
          const distance = Math.hypot(dx, dy);
          if (distance < 8) {
            input.steering.status = 'arrived';
            pad.axes = [0, 0, 0, 0];
            pad.buttons[6] = false;
          } else {
            const magnitude = distance > 25 ? 1 : 0.5;
            pad.axes = [dx / distance * magnitude, dy / distance * magnitude, 0, 0];
            pad.buttons[6] = true;
          }
        }
      }

      // Copy both arrays: releasing our synthetic hardware must not change
      // the pressed snapshot the application is about to consume.
      const sample = {
        id: 'QA Standard Controller', index: 0, mapping: 'standard',
        connected: true, timestamp: performance.now(), axes: [...pad.axes],
        buttons: pad.buttons.map(pressed => ({ pressed, touched: pressed, value: pressed ? 1 : 0 })),
      };
      if (input.tapIndex !== null) {
        // A tap is one sampled edge, regardless of runner or frame delays.
        // Explicit holds have no tapIndex and remain held until neutral().
        pad.buttons[input.tapIndex] = false;
        input.tapIndex = null;
      }
      return [sample];
    },
  });
}
