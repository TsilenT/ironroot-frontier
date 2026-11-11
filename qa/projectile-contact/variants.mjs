/** QA-only alternatives. Never imported or precached by the shipped game. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const contact=`function immediateRangedContact(renderer,p) {
  if (p.life <= 0) return;
  const age=1-p.life/p.maxLife, reduced=renderer.reducedMotion;
  if (!reduced && age >= .5) return;
  const c=renderer.c, scale=Number.isFinite(renderer.scale)&&renderer.scale>0?renderer.scale:1;
  c.save(); c.translate(p.tx,p.ty-17-(p.targetAir?17:0));
  const size=Math.max(1,.65/scale); c.scale(size,size);
  c.globalAlpha=reduced?1:Math.min(1,(.5-age)/.3);
  // Primary immediate contact, above actor artwork; no delayed arrival event.
  for (const [x,y] of [[-1,-1],[1,-1],[-1,1],[1,1]])
    line(c,[[x*3,y*3],[x*7,y*7]],'#f5d99b',2);
  ellipse(c,0,0,1.5,1.5,'#fff1ce');
  c.restore();
}
`;

export function flightContactVariant(baseline,{fadeFlight=false}={}) {
  assert.equal(createHash('sha256').update(baseline).digest('hex'),
    '63ee5687943a47d28384001c9c252350492690a938fb15ae01b494bd304b1838',
    'experiments require literal public-main renderer from 238a22c');
  const start=baseline.indexOf('    for (const p of s.projectiles) {\n');
  const end=baseline.indexOf('    // Paths stay below actors;',start);
  assert.ok(start>=0 && end>start,'literal projectile loop');
  const loop=baseline.slice(start,end);
  let changed=loop.replace('      const t = 1 - p.life / p.maxLife;',
    '      if (p.life <= 0) continue;\n      if (this.reducedMotion) { immediateRangedContact(this,p); continue; }\n      const t = 1 - p.life / p.maxLife;');
  if (fadeFlight) changed=changed.replace('      c.save();\n',
    '      c.save();\n      c.globalAlpha = Math.max(0,1-t/.85);\n');
  changed=changed.replace('      c.restore();\n',
    '      c.restore();\n      immediateRangedContact(this,p);\n');
  return baseline.slice(0,start)+changed+baseline.slice(end)+'\n'+contact;
}
