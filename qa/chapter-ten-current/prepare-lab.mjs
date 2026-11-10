/** Build a developer-only runtime outside the checkout. Exact anchor failures stop. */
import assert from 'node:assert/strict';
import {cp, mkdir, readFile, writeFile, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

function patch(source, before, after, label) {
  assert.equal(source.split(before).length - 1, 1, `Exact QA anchor: ${label}`);
  return source.replace(before, after);
}

export async function prepareLab(destination) {
  const output = path.resolve(destination);
  const parent = await realpath(path.dirname(output));
  assert.ok(parent !== root && !parent.startsWith(root + path.sep) && output !== root && !output.startsWith(root + path.sep), 'Lab output must stay outside the source checkout');
  await mkdir(output, {recursive: false});
  await cp(path.join(root, 'dist'), path.join(output, 'dist'), {recursive: true});
  await writeFile(path.join(output, 'package.json'), '{"private":true,"type":"module"}\n');
  for (const [source, target] of [['colossus.mjs', 'colossus.js'], ['scenario.mjs', 'colossus-scenario.js']]) {
    const text = (await readFile(path.join(here, source), 'utf8')).replaceAll("'./colossus.mjs'", "'./colossus.js'");
    await writeFile(path.join(output, 'dist', target), text);
  }
  let rules = await readFile(path.join(output, 'dist/rulesets.js'), 'utf8');
  rules = "import {COLOSSUS,COLOSSUS_IDS} from './colossus.js';\n" + rules;
  rules = patch(rules, 'export const RULESETS=deepFreeze({', `export const RULESETS=deepFreeze({
  ...Object.fromEntries(COLOSSUS_IDS.map(id=>[id,deepFreeze({...autonomousAirEntry(id,'QA only · The Last Engine',false,true),units:{...rootwardenUnits,colossus:COLOSSUS},citadel:CITADEL_OPTIONS,qaOnly:true})])),`, 'QA-only whole-rule identities');
  await writeFile(path.join(output, 'dist/rulesets.js'), rules);

  let engine = await readFile(path.join(output, 'dist/engine.js'), 'utf8');
  engine = "import {supportsColossus,isColossus,bodyDistance,createColossusState,advanceColossus,stepColossusUnit,settleColossusOutcome,settleColossusCommand,validateColossusState} from './colossus.js';\n" + engine;
  const edit = (before, after, label) => { engine = patch(engine, before, after, label); };
  edit("if(supportsHammer(ruleset))this.state.hammerCommitment=createHammerState();", "if(supportsHammer(ruleset))this.state.hammerCommitment=createHammerState();\n    if(supportsColossus(ruleset)){if(map.id!=='classic')throw Error('Colossus requires Classic');this.state.colossus=createColossusState();}", 'constructor phase');
  edit("if(s.units.filter(u=>u.side===b.side&&u.hp>0).length>=70)return;", "if(s.units.filter(u=>u.side===b.side&&u.hp>0).length>=(supportsColossus(this.ruleset)&&b.side===1&&s.colossus.phase==='armed'?69:70))return;", 'reserve one enemy slot');
  edit("Math.hypot(u.x-x,u.y-y)<SPELL.radius", "(supportsColossus(this.ruleset)&&isColossus(u)?bodyDistance(u,{x,y}):Math.hypot(u.x-x,u.y-y))<SPELL.radius", 'volley sees physical body');
  edit("this._effect(x,y,'volley',side,1.1,SPELL.radius);if(supportsFog(this.ruleset))refreshFog(this);return {ok:true};", "this._effect(x,y,'volley',side,1.1,SPELL.radius);if(supportsColossus(this.ruleset))settleColossusCommand(this);if(supportsFog(this.ruleset))refreshFog(this);return {ok:true};", 'Volley death settles before immediate save');
  edit("const d=this.units[u.type],dir=u.side? -1:1;u.cooldown=", "const d=this.units[u.type],dir=u.side? -1:1;if(supportsColossus(this.ruleset)&&isColossus(u)){const move=stepColossusUnit(this,u,dt);if(move)pendingMoves.push([u,move.x,move.y]);continue;}u.cooldown=", 'unstoppable boss stepping with simultaneous movement');
  edit("if(target)best=Math.hypot(target.x-u.x,target.y-u.y);", "if(target)best=isColossus(target)?bodyDistance(u,target):Math.hypot(target.x-u.x,target.y-u.y);", 'air uses body range');
  edit("const distance=Math.hypot(target.x-u.x,target.y-u.y);", "const distance=isColossus(target)?bodyDistance(u,target):Math.hypot(target.x-u.x,target.y-u.y);", 'saved air lock validates physical range');
  edit("(e.lane!==u.lane&&!(autoAir", "(e.lane!==u.lane&&!isColossus(e)&&!(autoAir", 'all roads acquire boss');
  edit("const dist=Math.hypot(e.x-u.x,e.y-u.y);if(dist<best", "const dist=isColossus(e)?bodyDistance(u,e):Math.hypot(e.x-u.x,e.y-u.y);if(dist<best", 'all roads hit physical body');
  edit("const targetY=target.type==='base'&&Math.abs(target.x-u.x)>180?this.map.lanes[u.lane]:target.y;", "const targetY=isColossus(target)||target.type==='base'&&Math.abs(target.x-u.x)>180?this.map.lanes[u.lane]:target.y;", 'ground armies retain their road');
  edit("Math.hypot(u.x-b.x,u.y-b.y)<d.range", "bodyDistance(u,b)<d.range", 'towers attack the physical body');
  edit("Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y)", "bodyDistance(a,b)-bodyDistance(c,b)", 'tower target ordering uses body');
  edit("for(const base of s.bases){\n      base.cooldown", "for(const base of s.bases){\n      if(supportsColossus(this.ruleset)&&base.hp<=0)continue;\n      base.cooldown", 'dead core cannot keep shooting');
  edit("Math.hypot(u.x-base.x,u.y-base.y)<310", "bodyDistance(u,base)<310", 'citadel attacks the physical body');
  edit("Math.hypot(a.x-base.x,a.y-base.y)-Math.hypot(b.x-base.x,b.y-base.y)", "bodyDistance(a,base)-bodyDistance(b,base)", 'citadel target ordering uses body');
  const terminal = "if(s.bases[0].hp<=0||s.bases[1].hp<=0){if(s.bases[0].hp===0&&s.bases[1].hp===0)s.winner='draw';else s.winner=s.bases[0].hp<=0?1:0;if(fog)refreshFog(this);return;}";
  edit(terminal, "if(supportsColossus(this.ruleset)){advanceColossus(this);const outcome=settleColossusOutcome(this);if(outcome!==null){s.winner=outcome;return;}}\n    else " + terminal, 'atomic deployment and explicit aftermath victory');
  edit("if(![0,1].includes(side)||this.state.winner!==null||this.limitReason)return;", "if(![0,1].includes(side)||this.state.winner!==null||this.limitReason)return;\n    if(supportsColossus(this.ruleset)&&this.state.bases[side].hp<=0)return;", 'destroyed enemy core stops new AI purchases');
  edit("...(supportsHammer(ruleset)?['hammerCommitment']:[])", "...(supportsHammer(ruleset)?['hammerCommitment']:[]),...(supportsColossus(ruleset)?['colossus']:[])", 'strict QA state admission');
  edit("if(s.winner==='draw'&&s.bases.some(b=>b.hp>0))", "if(supportsColossus(ruleset))validateColossusState({state:s,tick:data.tick,nextId:data.nextId,map,ruleset},fail);\n  else if(Object.hasOwn(s,'colossus'))fail('Colossus is outside this ruleset');\n  if(s.winner==='draw'&&s.bases.some(b=>b.hp>0))", 'strict phase/entity/terminal cross-checks');
  await writeFile(path.join(output, 'dist/engine.js'), engine);

  let air = await readFile(path.join(output, 'dist/autonomous-air.js'), 'utf8');
  air = "import {isColossus,bodyDistance} from './colossus.js';\n" + air;
  air = patch(air, 'Math.hypot(a.x - b.x, a.y - b.y)', 'isColossus(b) ? bodyDistance(a,b) : Math.hypot(a.x - b.x, a.y - b.y)', 'air perception and retention use body');
  air = patch(air, 'return Math.abs(nearestRoad', 'return isColossus(enemy) || Math.abs(nearestRoad', 'all-lane air eligibility');
  await writeFile(path.join(output, 'dist/autonomous-air.js'), air);

  let citadel = await readFile(path.join(output, 'dist/citadel-options.js'), 'utf8');
  citadel = "import {colossusAftermathAlive} from './colossus.js';\n" + citadel;
  citadel = patch(citadel, "if(game.state.winner!==null||game.state.bases.some(b=>b.hp<=0))return no('battle-ended'", "if(game.state.winner!==null||game.state.bases[side].hp<=0||!colossusAftermathAlive(game)&&game.state.bases.some(b=>b.hp<=0))return no('battle-ended'", 'living aftermath citadel can buy');
  citadel = patch(citadel, "ended=game?.state?.winner!==null||!base||game.state.bases.some(b=>b.hp<=0);", "ended=game?.state?.winner!==null||!base||base.hp<=0||!colossusAftermathAlive(game)&&game.state.bases.some(b=>b.hp<=0);", 'living aftermath citadel status');
  citadel = patch(citadel, "game.state.bases.some(b=>b.hp<=0)||(game.ruleset.endgame.forcedDecay", "!colossusAftermathAlive(game)&&game.state.bases.some(b=>b.hp<=0)||(game.ruleset.endgame.forcedDecay", 'aftermath regeneration continues');
  citadel = patch(citadel, "if(record.choice!=='regen')continue;", "if(base.hp<=0||record.choice!=='regen')continue;", 'dead citadel cannot regenerate');
  await writeFile(path.join(output, 'dist/citadel-options.js'), citadel);

  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.ok(process.argv[2], 'Pass a new external output directory');
  console.log(await prepareLab(process.argv[2]));
}
