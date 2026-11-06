/** Independent normal-AI integration diagnostics, not a player difficulty certificate.
 * node tests/ai-rush-audit.mjs MODE [seed count] [first seed] BASELINE_ENGINE OUTPUT_DIR
 * Modes: guard, screen, isolation, economy, order, campaign.
 * BASELINE_ENGINE must be an explicit local engine snapshot, not a git ref.
 * Outputs preserve map side, first decision order, both actors' actual purchases,
 * and full mine investment/income. Results are correlated deterministic probes.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Game,BUILDINGS,LANES,SPELL,upgradeCost} from '../dist/engine.js';
import {CAMPAIGN_MISSIONS,createCampaignMission,evaluateCampaignMission} from '../dist/campaign.js';
import {playCampaign} from './campaign-policies.mjs';
let Baseline;
const workingSource=readFileSync(new URL('../dist/engine.js',import.meta.url));
const hash=x=>createHash('sha256').update(x).digest('hex');
// Preserve the flawed economy-screen policy only as a negative control: its
// upgrade fallback spends mine savings. Use screen-save for an actual mine probe.
const policies=['rush','rush-burst','rush-center','rush-outer','economy-screen','economy','rush-upper','rush-lower','screen-fast','center-spells','rush-delayed'];
function scripted(g,side,policy){
  const own=g.state.buildings.filter(b=>b.side===side),count=t=>own.filter(b=>b.type===t).length,prod=own.filter(b=>BUILDINGS[b.type].unit).length;
  if(policy.startsWith('mine-after')||policy==='mine-first'){
    const screen=policy==='mine-first'?0:Number(policy.slice(-1));
    g.auditPlan??={};const i=g.auditPlan[side]??0,plan=[...Array.from({length:screen},(_,k)=>['barracks',1250,[0,2,1][k]]),['mint',270,1]];
    if(i<plan.length){const [type,x,lane]=plan[i];if(g.build(type,side?3200-x:x,LANES[lane],side).ok)g.auditPlan[side]=i+1;return;}
    return scripted(g,side,'rush');
  }
  let type=(policy.startsWith('rush')||policy==='center-spells')?'barracks':['barracks','archery','foundry','sanctum'][prod%4];
  if((['economy-screen','screen-fast','screen-save'].includes(policy))&&prod<4)type='barracks';
  if((['economy','economy-save'].includes(policy)||(['economy-screen','screen-fast','screen-save'].includes(policy)&&prod>=4))&&count('mint')<(policy==='screen-fast'?1:3))type='mint';
  if(policy.endsWith('-save')&&g.state.gold[side]<BUILDINGS[type].cost)return;
  const lanes=(['rush-center','center-spells'].includes(policy)?[1]:policy==='rush-outer'?[0,2]:policy==='rush-upper'?[0]:policy==='rush-lower'?[2]:[0,1,2]).sort((a,b)=>own.filter(x=>x.lane===a).length-own.filter(x=>x.lane===b).length||a-b);
  for(const lane of lanes)for(const x of type==='mint'?[270,410,550]:[1250,1110,970,830,690,550,410,270])if(g.build(type,side?3200-x:x,LANES[lane],side).ok)return;
  for(const b of own.filter(b=>b.level<3).sort((a,b)=>a.level-b.level))if(g.upgrade(b.id,side).ok)return;
}
function spell(g,side){
  const foes=g.state.units.filter(u=>u.side!==side&&(side?u.x:3200-u.x)>1500);let target=null,best=3;
  for(const u of foes){const n=foes.filter(v=>Math.hypot(v.x-u.x,v.y-u.y)<SPELL.radius).length;if(n>best){target=u;best=n;}}
  if(target)g.cast(target.x,target.y,side);
}
function match({version='candidate',difficulty='normal',policy='rush',seed=31001,side=0,order='alternating0',trace=false}){
  const g=new Game({ai:false,difficulty,seed}),timers=[0,0],ai=version==='current'?Baseline.prototype._ai:Game.prototype._ai;
  timers[side]=difficulty==='easy'?7:0;if(policy==='rush-delayed')timers[1-side]=2.5;
  const actions=[],income=[0,0],spent=[0,0],refund=[0,0],mineLedger=new Map();let maxLedgerError=0,openingActor=null;
  for(const name of ['build','upgrade','cast','sell']){
    const orig=g[name].bind(g);g[name]=(...args)=>{
      const s=args[name==='build'?3:name==='cast'?2:1]??0,old=g.state.gold[s],before=name==='upgrade'?g.state.buildings.find(b=>b.id===args[0]):null;
      const cost=name==='build'?BUILDINGS[args[0]].cost:name==='cast'?SPELL.cost:name==='upgrade'&&before?upgradeCost(before):0;
      const oldKills=g.state.stats.kills[s],result=orig(...args),delta=old-g.state.gold[s]+2*(g.state.stats.kills[s]-oldKills);
      if(result.ok){assert.ok(name==='sell'||Math.abs(delta-cost)<1e-7);assert.ok(g.state.gold[s]>=0);if(name==='sell')refund[s]-=delta;else spent[s]+=delta;
        const b=result.building,record={t:+g.state.time.toFixed(2),side:s,name,cost:delta,type:name==='build'?args[0]:name==='upgrade'?before?.type:null,lane:b?.lane,x:b?.x};actions.push(record);
        if(name==='build'&&args[0]==='mint')mineLedger.set(b.id,{...record,id:b.id,invested:delta,income:0,baseIncome:0});
        if(name==='upgrade'&&before?.type==='mint'){const m=mineLedger.get(before.id);if(m)m.invested+=delta;}
      }else assert.equal(g.state.gold[s],old);
      return result;
    };
  }
  for(let frame=0;frame<12000&&g.state.winner===null;frame++){
    for(let s=0;s<2;s++)income[s]+=.05*(5+g.state.buildings.filter(b=>b.side===s&&b.type==='mint'&&b.hp>0).reduce((n,b)=>n+2.5*(1+.5*(b.level-1)),0));
    for(const b of g.state.buildings.filter(b=>b.type==='mint'&&b.hp>0)){const rec=mineLedger.get(b.id);if(rec){rec.income+=.05*2.5*(1+.5*(b.level-1));rec.baseIncome+=.05*2.5;}}
    g.update(.05);
    for(const [id,rec] of mineLedger)if(rec.destroyedAt===undefined&&!g.state.buildings.some(b=>b.id===id))rec.destroyedAt=+g.state.time.toFixed(2);
    if(g.state.winner!==null)break;
    const orderSides=order==='ai-first'?[side,1-side]:order==='script-first'?[1-side,side]:((frame+(order==='alternating1'||order==='opening-flip'&&frame===0?1:0))%2?[1,0]:[0,1]);
    for(const s of orderSides){timers[s]-=.05;if(timers[s]>0)continue;
      if(openingActor===null)openingActor=s===side?'ai':'opponent';
      if(s===side){ai.call(g,s);timers[s]=(difficulty==='easy'?14:difficulty==='hard'?3:5)+g.random()*3;}
      else{if(['center-spells','screen-fast'].includes(policy))spell(g,s);for(let a=0;a<(['rush-burst','screen-fast'].includes(policy)?3:1);a++)scripted(g,s,policy);timers[s]=policy==='screen-fast'?1:5;}
    }
    for(let s=0;s<2;s++){const error=Math.abs(g.state.gold[s]-(420+income[s]+g.state.stats.kills[s]*2+refund[s]-spent[s]));assert.ok(error<1e-6);maxLedgerError=Math.max(maxLedgerError,error);}
  }
  for(let s=0;s<2;s++){const error=Math.abs(g.state.gold[s]-(420+income[s]+g.state.stats.kills[s]*2+refund[s]-spent[s]));assert.ok(error<1e-6);maxLedgerError=Math.max(maxLedgerError,error);}
  Game.restore(g.serialize());
  return {version,difficulty,policy,seed,side,order,openingActor,winner:g.state.winner,seconds:+g.state.time.toFixed(2),gold:g.state.gold,income,spent,refund,kills:g.state.stats.kills,maxLedgerError,mines:[...mineLedger.values()].map(r=>({...r,income:+r.income.toFixed(2),survivedSeconds:+((r.destroyedAt??g.state.time)-r.t).toFixed(2),fullInvestmentRepaid:r.income+1e-7>=r.invested,baseCostRepaid:r.baseIncome+1e-7>=r.cost})),builds:[0,1].map(s=>Object.fromEntries(Object.keys(BUILDINGS).map(t=>[t,actions.filter(a=>a.side===s&&a.name==='build'&&a.type===t).length]))),spells:[0,1].map(s=>actions.filter(a=>a.side===s&&a.name==='cast').length),stateHash:hash(JSON.stringify(g.serialize())),...(trace?{actions}: {})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const mode=process.argv[2]||'guard',seeds=Number(process.argv[3]||3),firstSeed=Number(process.argv[4]||37001);let specs=[];
  assert.ok(['guard','screen','isolation','economy','order','campaign'].includes(mode),'Unknown diagnostic mode');
  assert.ok(Number.isInteger(seeds)&&seeds>0&&Number.isInteger(firstSeed)&&firstSeed>=0,'Invalid seed range');
  assert.ok(process.argv[5]&&process.argv[6],'Pass an explicit baseline engine path and output directory');
  const baselinePath=resolve(process.argv[5]),outDir=resolve(process.argv[6]),baselineSource=readFileSync(baselinePath,'utf8');
  ({Game:Baseline}=await import('data:text/javascript;base64,'+Buffer.from(baselineSource).toString('base64')));
  mkdirSync(outDir,{recursive:true});
  const metadata={mode,node:process.version,seedCount:seeds,firstSeed,step:.05,maxSeconds:600,versionMeaning:{current:'supplied baseline AI',candidate:'working engine AI'},baselinePath,currentEngineHash:hash(baselineSource),candidateEngineHash:hash(workingSource)};
  if(mode==='campaign'){
    const games=[];
    for(const version of ['current','candidate'])for(const mission of CAMPAIGN_MISSIONS)for(const mastery of [false,true])for(let seed=firstSeed;seed<firstSeed+seeds;seed++){
      const ai=version==='current'?Baseline.prototype._ai:Game.prototype._ai,select=g=>{g._ai=ai;return g;};
      const {game,outcome}=playCampaign(id=>select(createCampaignMission(id)),evaluateCampaignMission,mission,{seed,mastery,restore:seed%4===0?data=>select(Game.restore(data)):null});
      Game.restore(game.serialize());
      games.push({version,mission:mission.id,mastery,seed,completed:outcome.completed,stars:outcome.stars,seconds:+game.state.time.toFixed(2),label:outcome.label,hash:hash(JSON.stringify(game.serialize()))});
    }
    const rows=['current','candidate'].map(version=>({version,games:games.filter(g=>g.version===version).length,clears:games.filter(g=>g.version===version&&g.completed).length,masteryThreeStars:games.filter(g=>g.version===version&&g.mastery&&g.stars===3).length,failures:games.filter(g=>g.version===version&&!g.completed)}));
    for(const g of games.filter(g=>g.version==='candidate')){const old=games.find(o=>o.version==='current'&&o.mission===g.mission&&o.mastery===g.mastery&&o.seed===g.seed);assert.equal(g.completed,old.completed,`Campaign completion changed: ${g.mission}/${g.seed}/${g.mastery}`);assert.equal(g.stars,old.stars,`Campaign stars changed: ${g.mission}/${g.seed}/${g.mastery}`);}
    writeFileSync(resolve(outDir,'campaign-results.json'),JSON.stringify({...metadata,rows,games},null,2));
    console.log(JSON.stringify({...metadata,rows},null,2));
    process.exit(0);
  }
  if(mode==='guard'){
    for(const version of ['current','candidate'])for(const difficulty of ['easy','hard'])for(const policy of ['rush-burst','rush-center','screen-fast'])for(let seed=firstSeed;seed<firstSeed+seeds;seed++)for(const side of [0,1])specs.push({version,difficulty,policy,seed,side});
    for(const version of ['current','candidate'])for(const policy of ['economy-screen','screen-save','mine-first','mine-after2','mine-after3'])for(const order of ['alternating0','opening-flip'])for(let seed=firstSeed;seed<firstSeed+seeds;seed++)for(const side of [0,1])specs.push({version,policy,order,seed,side});
    for(const version of ['current','candidate'])for(const policy of ['rush-burst','rush-center'])for(const order of ['alternating0','opening-flip'])for(let seed=firstSeed;seed<firstSeed+seeds;seed++)for(const side of [0,1])specs.push({version,policy,order,seed,side,trace:seed===firstSeed});
  }
  if(mode==='screen')for(const version of ['current','candidate'])for(const policy of policies)for(const order of ['alternating0','alternating1'])for(let seed=firstSeed;seed<firstSeed+seeds;seed++)for(const side of [0,1])specs.push({version,policy,order,seed,side});
  if(mode==='isolation')for(const version of ['current','candidate'])for(const difficulty of ['easy','hard'])for(const policy of ['rush-burst','rush-center','screen-fast'])for(let seed=firstSeed;seed<firstSeed+seeds;seed++)for(const side of [0,1])specs.push({version,difficulty,policy,seed,side});
  if(mode==='economy')for(const version of ['current','candidate'])for(const policy of ['economy-save','screen-save','mine-first','mine-after2','mine-after3'])for(let seed=firstSeed;seed<firstSeed+seeds;seed++)for(const side of [0,1])specs.push({version,policy,seed,side});
  if(mode==='order')for(const policy of ['rush-burst','rush-center'])for(const order of ['alternating0','opening-flip'])for(let seed=firstSeed;seed<firstSeed+seeds;seed++)for(const side of [0,1])specs.push({policy,order,seed,side,trace:seed===firstSeed});
  const games=[];for(const spec of specs){games.push(match(spec));if(games.length%50===0)process.stderr.write(`${games.length}/${specs.length}\n`);}
  let identicalDifficultyPairs=0;
  for(const g of games.filter(g=>g.version==='candidate'&&g.difficulty!=='normal')){const old=games.find(o=>o.version==='current'&&o.difficulty===g.difficulty&&o.policy===g.policy&&o.seed===g.seed&&o.side===g.side&&o.order===g.order);assert.ok(old);assert.equal(g.stateHash,old.stateHash,'Easy/hard state changed');identicalDifficultyPairs++;}
  const groups=new Map();for(const g of games){const key=[g.version,g.difficulty,g.policy,g.order].join('/');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(g);}
  const rows=[...groups].map(([key,gs])=>({key,games:gs.length,wins:gs.filter(g=>g.winner===g.side).length,winsBySide:[0,1].map(s=>gs.filter(g=>g.side===s&&g.winner===s).length),draws:gs.filter(g=>g.winner==='draw').length,timeouts:gs.filter(g=>g.winner===null).length,meanSeconds:+(gs.reduce((n,g)=>n+g.seconds,0)/gs.length).toFixed(2),opponentMines:gs.reduce((n,g)=>n+g.mines.filter(m=>m.side!==g.side).length,0),opponentMinesRepaid:gs.reduce((n,g)=>n+g.mines.filter(m=>m.side!==g.side&&m.fullInvestmentRepaid).length,0),opponentMinesBaseRepaid:gs.reduce((n,g)=>n+g.mines.filter(m=>m.side!==g.side&&m.baseCostRepaid).length,0),aiMines:gs.reduce((n,g)=>n+g.mines.filter(m=>m.side===g.side).length,0),maxLedgerError:Math.max(...gs.map(g=>g.maxLedgerError)),winsByOpeningActor:Object.fromEntries(['ai','opponent'].map(actor=>[actor,{games:gs.filter(g=>g.openingActor===actor).length,wins:gs.filter(g=>g.openingActor===actor&&g.winner===g.side).length}]))}));
  const result={...metadata,identicalDifficultyPairs,rows,games};
  writeFileSync(resolve(outDir,`${mode}-results.json`),JSON.stringify(result,null,2));
  console.log(JSON.stringify({...metadata,identicalDifficultyPairs,rows},null,2));
}
