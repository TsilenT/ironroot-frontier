/** Preserve the literal rewritten-main renderer before the impact prototype. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const prelude = `    const c = this.c,
      strength = Math.max(0, Math.min(1, p.life / p.maxLife)),
      scale = Number.isFinite(this.scale) && this.scale > 0 ? this.scale : 1,
      targetY = p.ty - 17 - (p.targetAir ? 17 : 0),
      sourceY = p.sy - 17 - (p.sourceAir ? 17 : 0),
      dx = p.tx - p.sx, dy = targetY - sourceY,
      distance = Math.hypot(dx, dy), angle = Math.atan2(dy, dx),
      color = p.type === 'wizard' ? '#c4a4ed' : p.type === 'siege' ? '#e8ad69'
        : p.type === 'gryphon' ? '#f4dcaa' : p.citadelExtra ? '#a7e8f3' : p.side ? '#ebbc8a' : '#dae7b6',
      opacity = this.reducedMotion ? 1 : .65 + .35 * strength;
    if (strength <= 0) return;
    c.save();
    c.translate(p.tx, targetY);
    // A static source-to-contact link appears all at once, including low/reduced effects.
    if (distance > 0) {
      const width = Math.max(1.25, .9 / scale);
      c.setLineDash([3 / scale, 5 / scale]);
      c.globalAlpha = opacity * .5;
      line(c, [[-dx, -dy], [0, 0]], '#142720', width + 1 / scale);
      c.globalAlpha = opacity * .65;
      line(c, [[-dx, -dy], [0, 0]], color, width);
      c.setLineDash([]);
      c.beginPath();
      c.arc(-dx, -dy, Math.max(3, 1.75 / scale), 0, Math.PI * 2);
      c.strokeStyle = color;
      c.lineWidth = width;
      c.stroke();
    }
    c.globalAlpha = opacity;
    // Retain a legible contact glyph at the smallest battlefield scale.
    const contactScale = Math.max(1, .65 / scale);
    c.scale(contactScale, contactScale);
`;
const priorPrelude = `    const t = 1 - p.life / p.maxLife;
    const arc = p.type === 'siege' ? Math.sin(t * Math.PI) * 55 : 0;
    c.save();
    c.translate(
      p.x,
      p.y -
        arc -
        17 -
        (p.sourceAir ? 17 * (1 - t) : 0) -
        (p.targetAir ? 17 * t : 0),
    );
`;

// Literal first-draft projection, retained only for native visual comparisons.
const firstPrelude = `    const c = this.c,
      strength = Math.max(0, Math.min(1, p.life / p.maxLife)),
      targetY = p.ty - 17 - (p.targetAir ? 17 : 0),
      sourceY = p.sy - 17 - (p.sourceAir ? 17 : 0),
      dx = p.tx - p.sx, dy = targetY - sourceY,
      distance = Math.hypot(dx, dy), angle = Math.atan2(dy, dx),
      color = p.type === 'wizard' ? '#c4a4ed' : p.type === 'siege' ? '#e8ad69'
        : p.type === 'gryphon' ? '#f4dcaa' : p.citadelExtra ? '#a7e8f3' : p.side ? '#ebbc8a' : '#dae7b6';
    if (strength <= 0) return;
    c.save();
    c.translate(p.tx, targetY);
    // A short directional after-image communicates the shot without a later arrival.
    if (!this.reducedMotion && this.vfx?.quality !== 'low' && strength > .6 && distance > 0) {
      const length = Math.min(40, distance);
      c.globalAlpha = strength * .35;
      line(c, [[-dx / distance * length, -dy / distance * length], [0, 0]], color, 1.5);
    }
    c.globalAlpha = this.reducedMotion ? 1 : strength;
`;

export function rendererFirstImpact() {
  const source = readFileSync(new URL('../dist/render.js', import.meta.url), 'utf8');
  assert.equal(source.split(prelude).length - 1, 1, 'declared revision projection');
  const first = source.replace(prelude, firstPrelude);
  assert.equal(createHash('sha256').update(first).digest('hex'), 'f2101f2911ea7af745c9be9c063a1067432f575bcaa49d226b45573d7c204b6a', 'literal first-draft renderer from ed197b7');
  return first;
}

export function rendererBeforeImpact() {
  let source = readFileSync(new URL('../dist/render.js', import.meta.url), 'utf8');
  const start = source.indexOf('  /** Damage already resolved at launch; this is a fading contact mark. */\n');
  const end = source.indexOf('  drawEffect(e) {', start);
  assert.ok(start > 0 && end > start, 'exact standalone impact method');
  const method = source.slice(start, end);
  let body = method.slice(method.indexOf('    const c = this.c,\n'), method.lastIndexOf('  }\n'));
  assert.equal(body.split(prelude).length - 1, 1, 'exact impact projection and fading changes');
  body = body.replace(prelude, priorPrelude);
  const arrow = 'c.rotate(angle);\n      c.translate(-8, 0);';
  assert.equal(body.split(arrow).length - 1, 1);
  body = body.replace(arrow, 'c.rotate(Math.atan2(p.ty - p.sy, p.tx - p.sx));');
  const loop = '    for (const p of s.projectiles) {\n' + body.trimEnd().split('\n').map(line => '  ' + line).join('\n') + '\n    }\n';
  const call = '    for (const p of s.projectiles) this.drawProjectile(p);\n';
  assert.equal(source.split(call).length - 1, 1);
  source = source.replace(method, '').replace(call, loop);
  assert.equal(createHash('sha256').update(source).digest('hex'), '63ee5687943a47d28384001c9c252350492690a938fb15ae01b494bd304b1838', 'all other renderer bytes from public main 238a22c73d36d8ee0f24b3e564272fe15a96ebab');
  return source;
}

export async function loadRendererBeforeImpact() {
  // Import-only adaptation; the original whole-source hash above stays literal.
  const source = rendererBeforeImpact().replace(/(from\s*['"])(\.\/[^'"]+)(['"])/g,
    (_, prefix, path, suffix) => prefix + new URL('../dist/' + path.slice(2), import.meta.url).href + suffix);
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}
