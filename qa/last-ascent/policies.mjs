/** Paid, deliberately simple synthetic policies; no combat-state mutation. */
const b=(type,x,lane)=>({type,x,lane});
const mines=[b('mint',270,0),b('mint',270,2)];
const front=(type,lane)=>b(type,1250,lane);
const rows=(types,lane,start=1250)=>types.map((type,i)=>b(type,start-140*i,lane));
const sharedSupport=[...mines,front('barracks',0),front('barracks',2),b('archery',1110,0),b('archery',1110,2)];
const configs={
  'supported-race':{label:'Concentrated supported race',description:'Central warriors, ranged and wizard support; retain rear side-road defenses. No citadel purchase.',plan:[...rows(['barracks','archery','sanctum','barracks','foundry'],1),...sharedSupport,...rows(['barracks','archery','foundry'],0,970),...rows(['barracks','archery','foundry'],2,970)],upgrade:['barracks','archery','sanctum','foundry']},
  'screened-siege':{label:'Screened siege breakthrough',description:'Two central foundries behind new warriors; side-road archers and existing towers contain pressure.',plan:[front('barracks',1),b('foundry',1110,1),b('archery',970,1),b('foundry',830,1),front('archery',0),front('archery',2),...mines,b('wardenLodge',1110,0),b('wardenLodge',1110,2),b('sanctum',970,0),b('sanctum',970,2)],upgrade:['foundry','barracks','archery'],citadel:'arrows'},
  'warden-ranged':{label:'Rootwardens with ranged support',description:'Central Rootwardens shield archers and wizards, then spread ranged-backed wardens to the side roads.',plan:[...rows(['wardenLodge','archery','sanctum','archery'],1),...mines,...rows(['wardenLodge','archery','sanctum'],0),...rows(['wardenLodge','archery','sanctum'],2),b('foundry',830,0),b('foundry',830,2)],upgrade:['archery','sanctum','wardenLodge','foundry'],citadel:'regen'},
  'distributed-cheap':{label:'Distributed low-cost coverage',description:'Warriors on every road with inexpensive archery support, then mines and ordinary upgrades. No siege, air or citadel purchase.',plan:[front('barracks',0),front('barracks',1),front('barracks',2),b('archery',1110,0),b('archery',1110,1),b('archery',1110,2),...mines,...[0,1,2].flatMap(l=>[b('barracks',970,l),b('archery',830,l)])],upgrade:['barracks','archery']},
  'economy-first':{label:'Economy first',description:'Buy both remaining mines before army expansion, then a three-road combined force. Regeneration is an optional paid investment.',plan:[...mines,...[0,1,2].map(l=>front('barracks',l)),...[0,1,2].map(l=>b('archery',1110,l)),...[0,1,2].map(l=>b('foundry',970,l)),...[0,1,2].map(l=>b('sanctum',830,l))],upgrade:['mint','barracks','archery','foundry','sanctum'],citadel:'regen'},
  'air-heavy':{label:'Air-heavy pressure',description:'Gryphon aeries on all roads. Flyers select their own targets. Later income buys more aeries and their upgrades, not manual flight commands.',plan:[front('aerie',0),front('aerie',1),front('aerie',2),...mines,...[0,1,2].flatMap(l=>[b('aerie',1110,l),b('aerie',970,l),b('archery',830,l)])],upgrade:['aerie','archery']},
  'adaptive-defense':{label:'Adaptive combined defense',description:'Existing player-side AI at the scenario difficulty, called every four seconds. The normal enemy checks every five to eight seconds. This is not a fair AI-versus-AI comparison.',ai:true},
  idle:{label:'Idle control',description:'No purchases or commands after the visible authored starting camp.',idle:true}
};
export const POLICY_IDS=Object.freeze(Object.keys(configs));
export const describePolicies=()=>POLICY_IDS.map(id=>({id,label:configs[id].label,description:configs[id].description}));
export function describePolicyPlan(id,game) {
  const c=configs[id];if(!c)throw new RangeError(`Unknown policy: ${id}`);
  return {id,label:c.label,description:c.description,decisionSeconds:c.idle?null:c.ai?4:1,batching:c.idle?'none':c.ai?'existing engine AI action budget':'all affordable consecutive unoccupied planned sites, then at most one upgrade',
    plan:(c.plan??[]).map(p=>({...p})),
    initiallyOccupiedSlots:(c.plan??[]).flatMap(p=>{const occupied=game.state.buildings.find(v=>v.side===0&&Math.hypot(v.x-p.x,v.y-game.map.lanes[p.lane])<108);return occupied?[{planned:p.type,x:p.x,lane:p.lane,occupiedBy:occupied.type,occupiedId:occupied.id}]:[];})};
}
export function createPolicy(id,{state}={}) {
  const config=configs[id];if(!config)throw new RangeError(`Unknown policy: ${id}`);
  let nextDecision=state?.nextDecision??0;
  return {id,serialize:()=>({nextDecision}),step(game){
    if(game.state.winner!==null||config.idle||game.state.time+1e-8<nextDecision)return;
    nextDecision=game.state.time+(config.ai?4:1);
    if(config.ai){game._ai(0);return;}
    const s=game.state;
    // Explicitly paid, reactive defensive volley. Fixed recipes otherwise use only
    // their own assets and public live threats. No seed/forecast/outcome access.
    if(s.spellCooldown[0]<=0&&s.gold[0]>=150){
      const threats=s.units.filter(u=>u.side===1&&u.hp>0&&u.x<600);
      let target=null,best=3;
      for(const u of threats){const n=threats.filter(v=>Math.hypot(u.x-v.x,u.y-v.y)<game.ruleset.spell.radius).length;if(n>best){target=u;best=n;}}
      if(target)game.cast(target.x,target.y,0);
    }
    for(const item of config.plan){
      const y=game.map.lanes[item.lane];
      if(s.buildings.some(v=>v.side===0&&Math.hypot(v.x-item.x,v.y-y)<108))continue;
      const result=game.build(item.type,item.x,y,0);
      if(!result.ok)return; // Save for the declared next ordinary purchase.
    }
    if(config.citadel&&s.citadelOptions.sides[0].choice===null){game.buyCitadelOption(config.citadel,0);if(s.citadelOptions.sides[0].choice===null)return;}
    const targets=s.buildings.filter(v=>v.side===0&&v.level<3&&config.upgrade.includes(v.type))
      .sort((a,b)=>a.level-b.level||config.upgrade.indexOf(a.type)-config.upgrade.indexOf(b.type)||b.x-a.x||a.lane-b.lane);
    if(targets[0])game.upgrade(targets[0].id,0);
  }};
}
