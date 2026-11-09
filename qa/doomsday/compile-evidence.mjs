/** Compact durable findings; full transaction traces stay in local JSONL files. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {summarizeDoomsday,sourceHashes} from './simulate.mjs';
const [calibration,cadence,heldout,browser,output]=process.argv.slice(2);
if(!output)throw new Error('Usage: node compile-evidence.mjs calibration.jsonl cadence.jsonl heldout.jsonl browser.json output.json');
const cohorts={calibration,cadence,heldout};
const runs=Object.entries(cohorts).flatMap(([cohort,file])=>readFileSync(file,'utf8').trim().split('\n').map(line=>({...JSON.parse(line),cohort})));
assert.equal(runs.length,162);for(const r of runs)assert.deepEqual(r.ledgerMaxError,[0,0]);
const uniqueKeys=runs.map(r=>`${r.variant}/${r.policy}/${['idle','adaptive'].includes(r.policy)?'fixed':r.pace}/${r.seed}`);
assert.equal(new Set(uniqueKeys).size,150);
const unique=[...new Map(runs.map((r,i)=>[uniqueKeys[i],r])).values()];
const held=runs.filter(r=>r.cohort==='heldout');assert.equal(held.length,54);
const report={
  status:'Isolated prototype, not admitted to campaign or approved for release. Automated policy outcomes are not human win rates.',
  baseline:'6b6cf96 — v0.28 main; dist remains byte-identical. Earlier qa/last-ascent cohort and source preserved.',
  sourceHashes:sourceHashes(),
  experiment:{runLabels:162,uniqueDynamics:150,duplicateLabels:12,
    calibration:{seeds:[101,202,303],runs:54,variants:['control-normal','doomsday-hard'],pace:'paced'},
    cadence:{seeds:[101,202,303],runs:54,variants:['doomsday-hard'],paces:['burst','delayed']},
    heldout:{seeds:[404,505,606,707,808,909],runs:54,variants:['doomsday-hard'],pace:'paced',note:'All nine policies frozen before these seeds. Fixed geometry, held-out RNG only.'},
    note:'Adaptive always starts at 3 seconds and calls ordinary side-0 AI every 4 seconds, regardless of pace label; idle never acts. Their duplicated cadence rows are retained, not counted as new dynamics. Calibration was replayed against final sources.'},
  aggregate:{wins:runs.filter(r=>r.outcome==='won').length,losses:runs.filter(r=>r.outcome==='lost').length,draws:runs.filter(r=>r.outcome==='draw').length,censored:runs.filter(r=>r.censored).length,
    uniqueDynamics:{wins:unique.filter(r=>r.outcome==='won').length,losses:unique.filter(r=>r.outcome==='lost').length},
    maxLedgerError:Math.max(...runs.flatMap(r=>r.ledgerMaxError)),longestSeconds:Math.max(...runs.map(r=>r.duration)),
    winsWithoutFurtherPlayerCoreDamage:runs.filter(r=>r.outcome==='won'&&r.minHP[0]===r.startingHP[0]).length,
    earliestEnemyMineLossSeconds:Math.min(...runs.flatMap(r=>r.mineLossConsequences.filter(l=>l.side===1).map(l=>l.time)))},
  groups:summarizeDoomsday(runs),browser:JSON.parse(readFileSync(browser,'utf8')),
  columns:['cohort','variant','pace','policy','seed','outcome','seconds','minimumPlayerHP','finalPlayerHP','finalEnemyHP','playerBuildingsLost','enemyMinesLost','enemySpending','minimumMineFundedEnemySpending','firstPlayerCoreDamageSeconds'],
  rows:runs.map(r=>[r.cohort,r.variant,r.pace,r.policy,r.seed,r.outcome,r.duration,r.minHP[0],...r.finalHP,r.losses.filter(l=>l.side===0).length,r.initialMinesLost.filter(l=>l.side===1).length,r.spending[1],r.minimumMineFundedSpending[1],r.firstCoreDamage[0]])
};
// One compact row per run keeps the durable evidence reviewable without logs.
const rows=report.rows;delete report.rows;
const json=JSON.stringify(report,null,2);writeFileSync(output,json.slice(0,-2)+',\n  "rows": [\n'+rows.map(row=>'    '+JSON.stringify(row)).join(',\n')+'\n  ]\n}\n');
console.log(JSON.stringify(report.aggregate));
