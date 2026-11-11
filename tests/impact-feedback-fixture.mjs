import {Game, buildSites} from '../dist/engine.js';
import {createCombatScene} from '../qa/combat-feedback/scenes.js';

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

/** Synthetic, frozen readability fixtures. They are not earned combat outcomes. */
export function impactReadabilityScene(dense = false) {
  if (dense) {
    const {game} = createCombatScene(Game,{mode:'dense',event:'mixed'});
    for (const side of [0,1]) {
      const sources = game.state.units.filter(u => u.side === side && ['archer','wizard','siege','gryphon'].includes(u.type)).slice(0,16);
      for (const source of sources) {
        const role = game.units[source.type];
        const targets = game.state.units.filter(u => u.side !== side && u.lane === source.lane
          && (!u.flying || role.canAttackAir) && Math.hypot(u.x-source.x,u.y-source.y) <= role.range);
        const target = targets.sort((a,b) => Math.hypot(b.x-source.x,b.y-source.y)-Math.hypot(a.x-source.x,a.y-source.y))[0];
        if (!target) throw Error('Stress shot has no legal same-road target');
        game.state.projectiles.push(projectile(source.type,{side,sx:source.x,sy:source.y,tx:target.x,ty:target.y,
          sourceAir:source.flying,targetAir:target.flying}));
      }
    }
    return game.serialize();
  }
  const game = new Game({ai:false,seed:731,rulesetId:'frontier-rootwarden-open'});
  game.state.buildings = []; game.state.units = []; game.state.effects = []; game.state.time = 18;
  const spawn = (type,side,x,lane) => {
    game._spawn({type,side,x:x-(side?-48:48),y:game.map.lanes[lane],lane,level:1});
    const unit = game.state.units.at(-1); unit.x=x; unit.y=game.map.lanes[lane]; unit.cooldown=1;
    return unit;
  };
  const rows = [['archery',0,1410,0,1600],['sanctum',0,1430,1,1600],['foundry',0,1390,2,1600],['aerie',1,1790,0,1690]];
  for (const [producer,side,x,lane,tx] of rows) {
    const source = spawn(producer,side,x,lane), target = spawn('barracks',1-side,tx,lane);
    source.attack=.2; target.hit=.16; target.hp*=.7;
    game.state.projectiles.push(projectile(source.type,{side,sx:x,sy:source.y,tx,ty:target.y,sourceAir:source.flying}));
  }
  const tower = game._place('watchtower',1950,640,1), target = spawn('barracks',0,1720,2);
  target.hit=.16; target.hp*=.7;
  game.state.projectiles.push(projectile('tower',{side:1,sx:tower.x,sy:tower.y,tx:target.x,ty:target.y}));
  game.state.effects=[];
  return game.serialize();
}
