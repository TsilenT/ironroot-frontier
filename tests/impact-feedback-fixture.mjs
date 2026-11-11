import {Game, buildSites} from '../dist/engine.js';

/** A paid, fixed-seed encounter; observations never alter commands or damage. */
export function paidImpactScene({lethal = false} = {}) {
  const game = new Game({ai:false,seed:731,rulesetId:'frontier-rootwarden-open'});
  for (const side of [0,1]) {
    const site = buildSites(game.map,side).find(site => site.lane === 1);
    if (!game.build('archery',site.x,site.y,side).ok) throw Error('Paid archery fixture failed');
  }
  for (let tick = 0; tick < 1600 && game.state.winner === null; tick++) {
    const before = game.serialize(), shots = [], fire = game._fire;
    game._fire = function(attacker,target,damage,type,...rest) {
      const hp = target.hp, at = {x:target.x,y:target.y}, count = this.state.projectiles.length;
      const result = fire.call(this,attacker,target,damage,type,...rest);
      if (type === 'archer' && this.state.projectiles.length > count)
        shots.push({target,hp,at,projectile:this.state.projectiles.at(-1),attacker:attacker.id});
      return result;
    };
    game.update(.05); game._fire = fire;
    const shot = shots.find(shot => shot.target.hp < shot.hp && (!lethal || shot.target.hp === 0));
    if (shot) return {before,after:game.serialize(),projectileIndex:game.state.projectiles.indexOf(shot.projectile),
      receipt:{time:game.state.time,attacker:shot.attacker,target:shot.target.id,hpBefore:shot.hp,hpAfter:shot.target.hp,targetAtLaunch:shot.at,lethal:shot.target.hp === 0}};
  }
  throw Error('The paid encounter did not produce the requested observed shot');
}

export const projectile = (type = 'archer', overrides = {}) => ({
  type,side:0,sx:900,sy:450,tx:1100,ty:450,x:900,y:450,life:.28,maxLife:.28,
  sourceAir:false,targetAir:false,...overrides,
});
