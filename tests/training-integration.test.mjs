import { assertHistoricalEngineOracle, readHistoricalProduction } from './engine-validation-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const sw=read('dist/service-worker.js');
function worker({scope='https://game.example/play/',cached=true}={}){
  const state={matched:[],fetched:[],response:null,handlers:{}};
  const context={URL,self:{location:{origin:new URL(scope).origin},registration:{scope},addEventListener:(name,handler)=>state.handlers[name]=handler,clients:{claim(){}}},
    caches:{open:async()=>({match:async key=>{state.matched.push(key);return cached?{cached:key}:undefined;}})},
    fetch:async request=>{state.fetched.push(request);return {network:request.url};}};
  runInNewContext(sw,context);
  state.request=async(url,{method='GET',mode='navigate'}={})=>{
    state.response=null;const request={url,method,mode};state.handlers.fetch({request,respondWith:response=>{state.response=response;}});
    return state.response?await state.response:null;
  };
  return state;
}
test('offline navigation serves training only for its exact deployment-relative route',async()=>{
  for(const scope of ['https://game.example/','https://game.example/nested/game/']){
    const w=worker({scope});const url=new URL('./training.html',scope);
    assert.equal((await w.request(url.href)).cached,'./training.html');
    assert.equal((await w.request(url.href+'?lesson=archers#watch')).cached,'./training.html');
    assert.equal((await w.request(new URL('./',scope).href)).cached,'./index.html');
    assert.equal((await w.request(new URL('./index.html',scope).href)).cached,'./index.html');
    assert.equal((await w.request(new URL('./other/training.html',scope).href)).cached,'./index.html');
    assert.equal(w.fetched.length,0);
  }
});
test('offline route selection retains network fallback, asset requests and cross-origin/method limits',async()=>{
  const w=worker({cached:false});const response=await w.request('https://game.example/play/training.html');
  assert.equal(response.network,'https://game.example/play/training.html');assert.equal(w.fetched.length,1);
  const a=worker();const path='https://game.example/play/training.js';const result=await a.request(path,{mode:'cors'});
  assert.equal(result.cached.url,path);
  assert.equal(await a.request('https://foreign.example/play/training.html'),null);
  assert.equal(await a.request('https://game.example/play/training.html',{method:'POST'}),null);
});
test('practice entry is an explicit title link rather than an automatic forced redirect',()=>{
  const html=read('dist/index.html'),start=html.indexOf('id="welcomeTraining"');
  assert.ok(start>0);assert.match(html.slice(start,start+250),/href="\.\/training\.html"/);
  assert.match(html.slice(start,start+250),/without changing your saved battle/);
  for(const file of ['training.html','training-app.js','training.css','training.js'])assert.ok(sw.includes(`'./${file}'`));
});
test('historical clarity sources retain frozen rule/report/profile/backup pins; current behavior uses executable compatibility tests',()=>{
  const baseline=JSON.parse(read('BASELINE_0_11.json'));
  // Do not repin old baselines to the new implementation. Historical sources stay exact;
  // accepted-copy-parity and legacy-runtime-parity compare current executable behavior.
  assertHistoricalEngineOracle();
  for(const file of ['dist/backup.js','dist/profile-session.js','dist/objectives.js','dist/campaign.js','dist/challenges.js','dist/battle-report.js','dist/report-view.js','dist/report-view.css','dist/input-scope.js']){
    assert.equal(createHash('sha256').update(readHistoricalProduction(file.replace('dist/',''))).digest('hex'),baseline.files[file],file);
  }
});
