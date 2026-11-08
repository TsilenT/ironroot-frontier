/** Pointer admission shared by the shell and tests. A cancelled gesture never acts. */
export class PointerGuard {
  constructor() { this.active = new Set(); this.press = null; this.epoch = 0; this.blocked = false; }
  invalidate() { this.epoch++; this.press = null; this.active.clear(); this.blocked = false; }
  down(id, x, y) {
    this.active.add(id);
    if (this.active.size !== 1) { this.blocked = true; this.press = null; return; }
    if (!this.blocked) this.press = { id, x, y, lastX: x, epoch: this.epoch, dragged: false };
  }
  move(id, x, y) {
    const p = this.press;
    if (!p || p.id !== id || this.blocked) return { pan: 0, dragged: false };
    if (Math.hypot(x - p.x, y - p.y) > 8) p.dragged = true;
    const pan = p.dragged ? x - p.lastX : 0; p.lastX = x;
    return { pan, dragged: p.dragged };
  }
  up(id, x, y) {
    if (Number.isFinite(x) && Number.isFinite(y)) this.move(id, x, y);
    const p = this.press, commit = !!p && p.id === id && p.epoch === this.epoch && !p.dragged && !this.blocked && this.active.size === 1;
    this.active.delete(id); if (p?.id === id) this.press = null;
    if (!this.active.size) this.blocked = false;
    return commit;
  }
  cancel(id) { this.active.delete(id); this.press = null; this.blocked = this.active.size > 0; }
}
