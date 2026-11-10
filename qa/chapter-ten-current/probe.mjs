/** One ordinary paid encounter, stdout only. Not a human or browser playtest. */
import {mkdtemp, rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {prepareLab} from './prepare-lab.mjs';
const temp=await mkdtemp('/tmp/ch10-paid-');
try {
  const lab=await prepareLab(path.join(temp,'runtime'));
  const {createColossusScenario}=await import(pathToFileURL(path.join(lab,'dist/colossus-scenario.js')));
  const g=createColossusScenario({staged:false,seed:101}),s=g.state;
  const report={seed:101,staged:false,startingGold:[...s.gold],startingHP:s.bases.map(b=>b.hp),difficulty:g.difficulty,
    policy:'One paid command every 2 seconds; distributed screen, siege, income, support, then upgrades. Defensive Volley takes the same command slot.',
    bossAsset:'One disclosed authored 10000-HP colossus, separate from ordinary purchase accounting',
    spending:[0,0],income:[0,0],openingKills:[...s.stats.kills],actions:0,breakoutTroops:0,bossMinimumX:null,trigger:null,coreFall:null,bossFall:null,minPlayerHP:s.bases[0].hp};
  for(const method of ['build','upgrade','cast','buyCitadelOption']){
    const original=g[method];g[method]=function(...args){const side=method==='build'?(args[3]??0):method==='cast'?(args[2]??0):(args[1]??0),before=s.gold[side],kills=s.stats.kills[side];const r=original.apply(this,args);if(r.ok){report.spending[side]+=before-s.gold[side]+2*(s.stats.kills[side]-kills);if(side===0)report.actions++;}return r;};
  }
  const damage=g._damage;
  g._damage=function(target,amount,side){
    if(s.colossus.phase==='active'&&s.colossus.triggeredAt===g.tick&&target.side===0&&Object.hasOwn(g.units,target.type)&&amount===target.hp&&target.hp>0&&Math.hypot(target.x-s.bases[1].x,target.y-s.bases[1].y)<=310)report.breakoutTroops++;
    return damage.call(this,target,amount,side);
  };
  const rows=(type,x)=>[0,1,2].map(l=>[type,x,l]);
  const plan=[...rows('barracks',1250),...rows('archery',1110),...rows('foundry',970),['mint',410,0],['mint',410,2],...rows('sanctum',550),...rows('archery',270)];
  let next=0;
  while(s.time<720&&s.winner===null){
    if(s.time+1e-8>=next){next+=2;let acted=false;
      const threats=s.units.filter(u=>u.side===1&&u.hp>0&&u.x<1000);
      const target=threats.find(u=>u.type==='colossus'||threats.filter(v=>Math.hypot(v.x-u.x,v.y-u.y)<150).length>=4);
      if(target&&s.gold[0]>=150&&s.spellCooldown[0]<=0)acted=g.cast(target.x,target.y).ok;
      if(!acted){const item=plan.find(([,x,l])=>!s.buildings.some(b=>b.side===0&&b.hp>0&&Math.hypot(b.x-x,b.y-g.map.lanes[l])<108));
        if(item)g.build(item[0],item[1],g.map.lanes[item[2]]);
        else {const b=s.buildings.filter(b=>b.side===0&&b.level<3).sort((a,b)=>a.level-b.level||a.id-b.id)[0];if(b)g.upgrade(b.id);}
      }
    }
    for(const side of [0,1])report.income[side]+=.05*(5+s.buildings.filter(b=>b.side===side&&b.type==='mint'&&b.hp>0).reduce((n,b)=>n+2.5*(1+.5*(b.level-1)),0));
    g.update(.05);report.minPlayerHP=Math.min(report.minPlayerHP,s.bases[0].hp);
    if(report.trigger===null&&s.colossus.phase!=='armed')report.trigger={seconds:s.time,playerHP:s.bases[0].hp,enemyHP:s.bases[1].hp,playerUnits:s.units.filter(u=>u.side===0).length,bossHP:s.units.find(u=>u.type==='colossus')?.hp};
    const livingBoss=s.units.find(u=>u.type==='colossus');if(livingBoss)report.bossMinimumX=Math.min(report.bossMinimumX??livingBoss.x,livingBoss.x);
    if(report.coreFall===null&&s.bases[1].hp===0)report.coreFall=s.time;
    if(report.bossFall===null&&s.colossus.phase==='defeated')report.bossFall=s.time;
  }
  const round=n=>Math.round(n*1e5)/1e5;
  report.seconds=s.time;report.winner=s.winner;report.phase=s.colossus.phase;report.finalHP=s.bases.map(b=>b.hp);report.finalGold=[...s.gold];
  report.boss=s.units.find(u=>u.type==='colossus')??null;
  report.ledgerError=[0,1].map(side=>round(report.startingGold[side]+report.income[side]+2*(s.stats.kills[side]-report.openingKills[side])-report.spending[side]-s.gold[side]));
  const {Game}=await import(pathToFileURL(path.join(lab,'dist/engine.js')));Game.restore(g.serialize());report.finalStrictRestore=true;
  console.log(JSON.stringify(report,(_,v)=>typeof v==='number'?round(v):v,2));
} finally {await rm(temp,{recursive:true,force:true});}
