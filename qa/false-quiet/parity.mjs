import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {runFalseQuiet} from './simulate.mjs';
const records=[];
for(const variant of ['ground-heavy','air-flank'])for(const policy of ['scout-adapt-5s','screened-siege-5s','direct-rush-5s','broad-novice']){
 const qa=runFalseQuiet({variant,policy,seed:7301}),production=runFalseQuiet({variant,policy,seed:7301,production:true});
 for(const field of ['outcome','route','duration','finalHP','finalGold','spending','casualties','firstContact','firstVisibleEnemy','transactions','policyDecisions','ledgerMaxError'])assert.deepEqual(production[field],qa[field],`${variant}/${policy}/${field}`);
 records.push({variant,policy,seed:7301,productionRuleset:production.rulesetId,outcome:production.outcome,route:production.route,duration:production.duration,finalHP:production.finalHP,spending:production.spending,matched:'Outcome/time/HP/gold/spending/casualties/contact/sight/every transaction/decisions/ledger'});
 console.log(`${variant} ${policy}: exact parity ${production.outcome} ${production.duration}s`);
}
writeFileSync(new URL('./parity.json',import.meta.url),JSON.stringify(records,null,2)+'\n');
