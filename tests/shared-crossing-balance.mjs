import {ROUTES,playSharedCrossing} from './shared-crossing-policies.mjs';
const seeds=[6101,123,719,51017];
const rows=[];
for(const route of Object.keys(ROUTES))for(const seed of seeds){
  const {summary}=playSharedCrossing({route,seed,restore:seed===719});rows.push(summary);
  console.log(JSON.stringify(summary));
}
console.log(JSON.stringify({totals:{runs:rows.length,wins:rows.filter(r=>r.won).length,losses:rows.filter(r=>!r.won).length,controlWins:rows.filter(r=>r.winKind==='control').length,coreWins:rows.filter(r=>r.winKind==='core').length},prototype:true}));
