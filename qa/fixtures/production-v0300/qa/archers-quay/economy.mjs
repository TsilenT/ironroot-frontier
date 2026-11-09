/** Read-only economic instrumentation: receipts never fund or steer either side. */
export function actualIncome(game,side){return 5+game.state.buildings.filter(b=>b.side===side&&b.type==='mint'&&b.hp>0).reduce((n,b)=>n+game.buildings.mint.income*(1+.5*(b.level-1)),0);}
export function verifyPlayerCadence(transactions){const paid=transactions.filter(t=>t.side===0&&t.cost>0);for(let i=1;i<paid.length;i++)if(paid[i].time-paid[i-1].time<5-1e-7)throw Error('More than one paid player action in five seconds');return paid.length;}
export function instrumentEconomy(game){
 const s=game.state,initialKills=[...s.stats.kills];
 const ledger={startingGold:[...s.gold],startingCachedIncome:[...s.income],startingActualIncome:[0,1].map(side=>actualIncome(game,side)),grossIncome:[0,0],killGold:[0,0],refunds:[0,0],spending:[0,0],maxError:[0,0],ticks:0,transactions:[]};
 if(ledger.startingCachedIncome.some((n,i)=>n!==ledger.startingActualIncome[i]))throw Error('Tick-zero cached income does not match actual mines');
 function reconcile(){for(const side of [0,1]){ledger.killGold[side]=2*(s.stats.kills[side]-initialKills[side]);const expected=ledger.startingGold[side]+ledger.grossIncome[side]+ledger.killGold[side]+ledger.refunds[side]-ledger.spending[side];ledger.maxError[side]=Math.max(ledger.maxError[side],Math.abs(expected-s.gold[side]));if(ledger.maxError[side]>1e-6)throw Error('Paid economy ledger mismatch: '+side+' '+ledger.maxError[side]);}}
 for(const method of ['build','upgrade','cast','sell','buyCitadelOption']){
  const original=game[method];game[method]=function(...args){
   const side=method==='build'?(args[3]??0):method==='cast'?(args[2]??0):(args[1]??0),prior=['upgrade','sell'].includes(method)?s.buildings.find(b=>b.id===args[0]):null;
   const before=structuredClone({gold:s.gold[side],kills:s.stats.kills[side],building:prior??null}),output=original.apply(this,args);
   if(output.ok){const cost=before.gold-s.gold[side]+2*(s.stats.kills[side]-before.kills);if(cost>=0)ledger.spending[side]+=cost;else ledger.refunds[side]-=cost;
    ledger.transactions.push(structuredClone({time:s.time,tick:game.tick,side,method,args,cost,type:output.building?.type??before.building?.type??(method==='cast'?'volley':args[0]),id:output.building?.id??before.building?.id??null,x:output.building?.x??before.building?.x??null,lane:output.building?.lane??before.building?.lane??null,before,after:{gold:s.gold[side],kills:s.stats.kills[side]},result:output}));
   }return output;
  };
 }
 const step=game._step;game._step=function(dt){const tick=this.tick;const paid=[0,1].map(side=>dt*actualIncome(this,side));const output=step.call(this,dt);if(this.tick!==tick){for(const side of [0,1])ledger.grossIncome[side]+=paid[side];ledger.ticks++;reconcile();}return output;};
 return {ledger,reconcile,snapshot:()=>structuredClone(ledger)};
}
