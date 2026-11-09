/** Revised hypotheses: all planned slots are legal in the initial formation. */
const b=(type,x,lane)=>({type,x,lane});
const row=(type,x)=>[0,1,2].map(lane=>b(type,x,lane));
const mines=[b('mint',270,0),b('mint',270,2)];
const plans={
  distributed:{label:'Distributed cheap pressure',plan:[...row('barracks',1250),...row('archery',1110),...mines,...row('barracks',970),b('archery',830,1),b('archery',550,0),b('archery',550,2)],upgrade:['barracks','archery']},
  containment:{label:'Cover every road, then central siege',plan:[...row('barracks',1250),...row('archery',1110),b('foundry',970,1),b('foundry',830,1),...mines,b('sanctum',970,0),b('sanctum',970,2),b('archery',550,0),b('archery',550,2)],upgrade:['foundry','barracks','archery','sanctum']},
  siege:{label:'Screened central siege',plan:[b('barracks',1250,1),b('archery',1110,1),b('foundry',970,1),b('foundry',830,1),b('archery',1250,0),b('archery',1250,2),...mines,b('barracks',1110,0),b('barracks',1110,2),b('sanctum',970,0),b('sanctum',970,2)],upgrade:['foundry','barracks','archery','sanctum'],citadel:'arrows'},
  economy:{label:'Mines before combined arms',plan:[...mines,...row('barracks',1250),...row('archery',1110),...row('foundry',970),b('sanctum',830,1),b('sanctum',550,0),b('sanctum',550,2)],upgrade:['mint','barracks','archery','foundry','sanctum'],citadel:'regen'},
  wardens:{label:'Rootwardens and ranged support',plan:[...row('wardenLodge',1250),...row('archery',1110),...mines,...row('sanctum',970),b('foundry',830,1)],upgrade:['archery','sanctum','wardenLodge','foundry'],citadel:'regen'},
  race:{label:'Supported center race',plan:[b('barracks',1250,1),b('archery',1110,1),b('foundry',970,1),b('sanctum',830,1),b('barracks',1250,0),b('barracks',1250,2),b('archery',1110,0),b('archery',1110,2),...mines,b('foundry',550,0),b('foundry',550,2)],upgrade:['barracks','foundry','archery','sanctum']},
  air:{label:'Autonomous air pressure',plan:[...row('aerie',1250),...mines,...row('aerie',1110),...row('archery',970),b('archery',830,1)],upgrade:['aerie','archery']},
  adaptive:{label:'Player-side existing Hard AI',ai:true},
  idle:{label:'Idle control',idle:true}
};
export const POLICY_IDS=Object.freeze(Object.keys(plans));
export function describePolicy(id){const p=plans[id];if(!p)throw new RangeError(`Unknown policy: ${id}`);return {id,...p};}
export function createPolicy(id,{decisionSeconds=2,startDelay=3,maxActions=1,state}={}){
  const config=describePolicy(id);
  if(!(decisionSeconds>=.05&&Number.isFinite(decisionSeconds))||!(startDelay>=0&&Number.isFinite(startDelay))||!(maxActions===Infinity||Number.isInteger(maxActions)&&maxActions>=1))throw new RangeError('Invalid policy timing.');
  let nextDecision=state?.nextDecision??startDelay;
  return {serialize:()=>({nextDecision}),step(game){
    const s=game.state;if(s.winner!==null||config.idle||s.time+1e-8<nextDecision)return;
    nextDecision=s.time+decisionSeconds;
    // This separate synthetic benchmark inherits the scenario difficulty and
    // ordinary AI action budget; maxActions does not describe its purchases.
    if(config.ai){game._ai(0);return;}
    let remaining=maxActions;
    if(s.spellCooldown[0]<=0&&s.gold[0]>=150){
      const threats=s.units.filter(u=>u.side===1&&u.hp>0&&u.x<600);let target=null,best=3;
      for(const u of threats){const n=threats.filter(v=>Math.hypot(u.x-v.x,u.y-v.y)<game.ruleset.spell.radius).length;if(n>best){target=u;best=n;}}
      if(target&&game.cast(target.x,target.y).ok&&--remaining<=0)return;
    }
    for(const item of config.plan){
      const y=game.map.lanes[item.lane];
      if(s.buildings.some(v=>v.side===0&&v.hp>0&&Math.hypot(v.x-item.x,v.y-y)<108))continue;
      if(!game.build(item.type,item.x,y).ok)return;
      if(--remaining<=0)return;
    }
    if(config.citadel&&s.citadelOptions.sides[0].choice===null){
      if(!game.buyCitadelOption(config.citadel).ok)return;
      if(--remaining<=0)return;
    }
    const target=s.buildings.filter(v=>v.side===0&&v.hp>0&&v.level<3&&config.upgrade.includes(v.type))
      .sort((a,b)=>a.level-b.level||config.upgrade.indexOf(a.type)-config.upgrade.indexOf(b.type)||b.x-a.x||a.lane-b.lane)[0];
    if(target)game.upgrade(target.id);
  }};
}
