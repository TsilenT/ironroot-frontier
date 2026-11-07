# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: restart-briefing.spec.mjs >> current finale offers Skirmish setup and optional three-star Replay via keyboard
- Location: restart-briefing.spec.mjs:151:51

# Error details

```
BattleCodecError: Saved battle does not match its scenario rules.
```

# Test source

```ts
  1   | /** One pure admission boundary for Resume, backup and candidate saves. */
  2   | import { Game, MAPS, getMap, getRuleset, LEGACY_RULESET_ID, validateEngineFields } from './engine.js';
  3   | import { deepFreeze } from './rulesets.js';
  4   | import * as campaign from './campaign.js';
  5   | import { getChallenge, challengeScenarioForGame, evaluateChallenge } from './challenges.js';
  6   | import { TRAINING_LESSONS } from './training.js';
  7   |
  8   | export const MAX_BATTLE_BYTES=1024*1024;
  9   | const own=(value,key)=>Object.hasOwn(value,key);
  10  | export class BattleCodecError extends Error {constructor(message,code='invalid-battle'){super(message);this.name='BattleCodecError';this.code=code;}}
> 11  | const fail=(message,code)=>{throw new BattleCodecError(message,code);};
      |                                   ^ BattleCodecError: Saved battle does not match its scenario rules.
  12  | function fields(value,allowed,required=allowed){
  13  |   if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('Saved battle must contain plain objects.');
  14  |   const descriptors=Object.getOwnPropertyDescriptors(value);
  15  |   if(Reflect.ownKeys(descriptors).some(key=>typeof key!=='string'||!allowed.includes(key)||!own(descriptors[key],'value')||!descriptors[key].enumerable)||required.some(key=>!own(value,key)))fail('Saved battle contains an unknown field or is missing a required field.');
  16  | }
  17  | function bounded(value){
  18  |   let nodes=0;const ancestors=new Set();
  19  |   const visit=(v,depth)=>{
  20  |     if(++nodes>30000||depth>12)fail('Saved battle is too large or deeply nested.','too-large');
  21  |     if(v===null||typeof v==='boolean')return;
  22  |     if(typeof v==='number'){if(!Number.isFinite(v))fail('Saved battle numbers must be finite.');return;}
  23  |     if(typeof v==='string'){if(v.length>100)fail('Saved battle contains an overlong value.');return;}
  24  |     if(typeof v!=='object'||ancestors.has(v))fail('Saved battle must contain acyclic JSON data.');
  25  |     if(!Array.isArray(v)&&![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail('Saved battle must contain plain objects.');
  26  |     const ds=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(ds).filter(k=>!(Array.isArray(v)&&k==='length'));
  27  |     if(keys.length>256||(Array.isArray(v)&&(v.length>256||keys.length!==v.length||keys.some((k,i)=>k!==String(i)))))fail('Saved battle collection is too large or malformed.');
  28  |     ancestors.add(v);
  29  |     for(const key of keys){if(typeof key!=='string'||key.length>100||['__proto__','constructor','prototype'].includes(key)||!own(ds[key],'value')||!ds[key].enumerable)fail('Saved battle contains an unsafe or non-JSON property.');visit(ds[key].value,depth+1);}
  30  |     ancestors.delete(v);
  31  |   };visit(value,0);
  32  | }
  33  | export function battleByteLength(text){
  34  |   if(typeof text!=='string'||text.length>MAX_BATTLE_BYTES)fail('Saved battle exceeds the 1 MiB limit.','too-large');
  35  |   let bytes=0;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);if(c<128)bytes++;else if(c<2048)bytes+=2;else if(c>=0xd800&&c<=0xdbff&&i+1<text.length&&text.charCodeAt(i+1)>=0xdc00&&text.charCodeAt(i+1)<=0xdfff){bytes+=4;i++;}else bytes+=3;if(bytes>MAX_BATTLE_BYTES)fail('Saved battle exceeds the 1 MiB limit.','too-large');}return bytes;
  36  | }
  37  | export function scenarioForBattle(challengeId=null,campaignId=null,game=null){
  38  |   if(challengeId!==null&&campaignId!==null)fail('A battle cannot be both a trial and a campaign mission.');
  39  |   const ref=campaignId!==null?(game?campaign.campaignScenarioForGame(game,campaignId):{kind:'campaign',id:campaignId,revision:1}):challengeId!==null?(game?challengeScenarioForGame(game,challengeId):{kind:'trial',id:challengeId,revision:1}):{kind:'skirmish',id:'standard',revision:1};
  40  |   resolveScenario(ref);return ref;
  41  | }
  42  | const scenarioCache=new Map();
  43  | export function resolveScenario(ref){
  44  |   fields(ref,['kind','id','revision']);
  45  |   if(typeof ref.kind!=='string'||!['skirmish','campaign','trial','lesson'].includes(ref.kind)||typeof ref.id!=='string'||!Number.isSafeInteger(ref.revision)||ref.revision<1||(!['campaign','trial'].includes(ref.kind)&&ref.revision!==1))fail('This save needs a compatible scenario version.','unsupported-identity');
  46  |   const key=`${ref.kind}/${ref.id}@${ref.revision}`;
  47  |   if(scenarioCache.has(key))return scenarioCache.get(key);
  48  |   let mission;
  49  |   if(ref.kind==='skirmish'){if(ref.id!=='standard')fail('Unknown skirmish scenario.','unsupported-identity');}
  50  |   else {
  51  |     if(ref.kind==='campaign'){
  52  |       try{mission=campaign.getCampaignMission(ref.id,ref.revision);}catch{fail('This save needs a compatible scenario version.','unsupported-identity');}
  53  |     }else if(ref.kind==='trial'){
  54  |       try{mission=getChallenge(ref.id,ref.revision);}catch{fail('This save needs a compatible scenario version.','unsupported-identity');}
  55  |     }else mission=TRAINING_LESSONS.find(item=>item.id===ref.id);
  56  |     if(!mission||(mission.scenarioRevision??1)!==ref.revision)fail('This save needs a compatible scenario version.','unsupported-identity');
  57  |   }
  58  |   const descriptor=deepFreeze({...ref,...(mission?{mapId:mission.mapId??'classic',mapRevision:mission.mapRevision??1,rulesetId:mission.rulesetId??LEGACY_RULESET_ID,rulesetRevision:mission.rulesetRevision??1,mission:JSON.parse(JSON.stringify(mission))}:{})});
  59  |   scenarioCache.set(key,descriptor);return descriptor;
  60  | }
  61  | function identityRef(ref,label){fields(ref,['id','revision']);if(typeof ref.id!=='string'||!Number.isSafeInteger(ref.revision)||ref.revision<1)fail(`Invalid ${label} identity.`);}
  62  | export function validateBattleIdentity(identity){
  63  |   fields(identity,['ruleset','map','scenario']);identityRef(identity.ruleset,'ruleset');identityRef(identity.map,'battlefield');
  64  |   let rules,map;try{rules=getRuleset(identity.ruleset.id,identity.ruleset.revision);map=getMap(identity.map.id,identity.map.revision);}catch{fail('This save needs a compatible ruleset or battlefield version.','unsupported-identity');}
  65  |   const scenario=resolveScenario(identity.scenario);
  66  |   if(scenario.kind==='skirmish'){if(rules.campaignOnly||rules.authoredOnly)fail('This roster is only available in its authored scenario.');if(!own(MAPS,map.id))fail('This battlefield is only available in its authored scenario.');}
  67  |   else {if(map.id!==scenario.mapId||map.revision!==scenario.mapRevision)fail(`Authored missions require the ${getMap(scenario.mapId,scenario.mapRevision).name} battlefield.`);if(rules.revision!==scenario.rulesetRevision||(scenario.kind==='campaign'?!campaign.campaignRulesetAllowed(scenario.id,scenario.revision,rules.id):rules.id!==scenario.rulesetId))fail('Saved battle does not match its scenario rules.');}
  68  |   return deepFreeze({ruleset:{id:rules.id,revision:rules.revision},map:{id:map.id,revision:map.revision},scenario:{kind:scenario.kind,id:scenario.id,revision:scenario.revision}});
  69  | }
  70  | export function identityOf(game,scenario=scenarioForBattle()){
  71  |   return validateBattleIdentity({ruleset:{id:game.ruleset.id,revision:game.ruleset.revision},map:{id:game.map.id,revision:game.map.revision},scenario:{kind:scenario.kind,id:scenario.id,revision:scenario.revision}});
  72  | }
  73  | export function decodeBattle(value,{campaignProgress=campaign.createCampaignProgress()}={}){
  74  |   if(typeof value==='string'){battleByteLength(value);try{value=JSON.parse(value);}catch{fail('Saved battle is not valid JSON.');}}
  75  |   bounded(value);battleByteLength(JSON.stringify(value));
  76  |   let data=value,scenario=scenarioForBattle();
  77  |   if(value&&typeof value==='object'&&own(value,'format')){
  78  |     if(value.format!=='ironroot-save')fail('Saved battle has an invalid format.');
  79  |     if(![1,2,3].includes(value.version))fail('This save needs a compatible game version.','unsupported-version');
  80  |     if(value.version===3){fields(value,['format','version','scenario','game']);scenario=value.scenario;if(value.game?.version!==3)fail('Version-3 battles require an explicit engine identity.');}
  81  |     else {fields(value,['format','version','challengeId','campaignId','game'],['format','version','game']);try{scenario=scenarioForBattle(own(value,'challengeId')?value.challengeId:null,own(value,'campaignId')?value.campaignId:null);}catch(error){fail(error.message);}if(value.version===1&&scenario.kind==='campaign')fail('Version-1 saves cannot contain campaign missions.');if(![1,2].includes(value.game?.version))fail('Legacy envelopes cannot contain new-format engine data.');}
  82  |     data=value.game;
  83  |   }else if(![1,2].includes(value?.version))fail('New-format engine data requires a scenario envelope.');
  84  |   let game;try{validateEngineFields(data);game=Game.restore(data);}catch(error){fail('Saved battle contains invalid or incompatible engine data: '+error.message);}
  85  |   const identity=identityOf(game,scenario),resolved=resolveScenario(identity.scenario);
  86  |   if(resolved.kind==='lesson')fail('Practice lessons are not resumable saves.');
  87  |   if(game.state.winner!==null||game.state.bases.some(base=>base.hp<=0))fail('Saved battle has already ended.','ended-battle');
  88  |   if(resolved.mission){
  89  |     const mission=resolved.mission;
  90  |     if(game.difficulty!==mission.difficulty||game.ai!==(mission.ai===true))fail('Saved battle does not match its mission rules.');
  91  |     if(resolved.kind==='campaign'){
  92  |       if(!campaign.isMissionUnlocked(campaignProgress,resolved.id,resolved.revision))fail('Saved campaign battle is locked by campaign progress.','locked-mission');
  93  |       if(!campaign.canUseCampaignRuleset(campaignProgress,resolved.id,resolved.revision,game.ruleset.id))fail('Saved campaign roster has not been earned by this profile.','locked-roster');
  94  |     }
  95  |     const result=resolved.kind==='campaign'?campaign.evaluateCampaignMission(game,resolved.id,resolved.revision):evaluateChallenge(game,resolved.id);
  96  |     if(result.completed||result.failed)fail('Saved mission has already ended.','ended-battle');
  97  |   }
  98  |   return {game,scenario:identity.scenario,identity,challengeId:resolved.kind==='trial'?resolved.id:null,campaignId:resolved.kind==='campaign'?resolved.id:null};
  99  | }
  100 | export function encodeBattle(game,scenario=scenarioForBattle(),options={}){
  101 |   const data=game.serialize(),ref={kind:scenario.kind,id:scenario.id,revision:scenario.revision};
  102 |   const value=data.version===3?{format:'ironroot-save',version:3,scenario:ref,game:data}:{format:'ironroot-save',version:2,challengeId:ref.kind==='trial'?ref.id:null,campaignId:ref.kind==='campaign'?ref.id:null,game:data};
  103 |   // Validate scenario first even when an old envelope could not represent it.
  104 |   identityOf(game,ref);if(ref.kind==='lesson')fail('Practice lessons are not saved.');
  105 |   decodeBattle(value,options);return value;
  106 | }
  107 |
```
