// Historical manual-flight tests of the browser harness's routing/readiness sequence. These do not
// execute a browser or establish runtime visibility, input or focus behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../qa/historical/manual-flight/flight-orders.spec.mjs.txt',import.meta.url),'utf8');
const helper=source.match(/async function readyFlightOrder\([^]*?\n\}/)?.[0];
assert.ok(helper,'the flight readiness helper must remain inspectable');

function harness({visible=true,enabled=true,staysDisabled=false}={}) {
  const calls=[],envelope={fixture:'unchanged planning checkpoint'};
  const control={selector:'#flightSouth'},panel={isVisible:async()=>{calls.push('inspector visibility');return visible;}};
  const page={locator(selector){
    if(selector==='#selectionPanel')return panel;
    assert.equal(selector,'#flightSouth');return control;
  }};
  const ready=runInNewContext(`(${helper})`,{
    inspect:async(receivedPage,receivedEnvelope,id)=>{
      assert.equal(receivedPage,page);assert.equal(receivedEnvelope,envelope);assert.equal(id,17);
      calls.push('native aerie inspection');visible=true;
    },
    expect:target=>{
      assert.equal(target,control);
      return {
        toBeVisible:async()=>{calls.push('visible control');assert.equal(visible,true);},
        toBeEnabled:async()=>{
          calls.push('await enabled');
          await Promise.resolve();
          if(staysDisabled)throw Error('flight control remains disabled');
          enabled=true;calls.push('enabled control');
        },
      };
    },
    expectReachable:async(receivedPage,selector)=>{
      assert.equal(receivedPage,page);assert.equal(selector,'#flightSouth');
      assert.equal(visible,true);assert.equal(enabled,true,'focus/geometry must follow enabled readiness');
      calls.push('ordinary focus and full reachability');
    },
  });
  return {calls,control,run:()=>ready(page,envelope,17,'South')};
}

test('collapsed mobile flight inspector reopens through the real aerie before readiness/focus',async()=>{
  const h=harness({visible:false,enabled:false});assert.equal(await h.run(),h.control);
  assert.deepEqual(h.calls,['inspector visibility','native aerie inspection','visible control','await enabled','enabled control','ordinary focus and full reachability']);
});

test('visible desktop flight inspector waits for enabled without reopening or premature focus',async()=>{
  const h=harness({enabled:false});assert.equal(await h.run(),h.control);
  assert.deepEqual(h.calls,['inspector visibility','visible control','await enabled','enabled control','ordinary focus and full reachability']);
});

test('a permanently disabled flight control blocks before focus, rather than bypassing the UI',async()=>{
  const h=harness({staysDisabled:true});await assert.rejects(h.run,/flight control remains disabled/);
  assert.deepEqual(h.calls,['inspector visibility','visible control','await enabled']);
});

test('paid-flight repetitions and native Space retain their exact downstream oracles',()=>{
  const start=source.indexOf("for(const id of ['wings-of-ash','stonegate'])test(");
  const end=source.indexOf('\nfor(const lane of [0,2])',start),body=source.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(body,/readyFlightOrder\(page,purchase,aerie.id,key\);await press\(page,'#flight'\+key\)/);
  assert.match(body,/const south=await readyFlightOrder\(page,purchase,aerie.id,'South'\)/);
  assert.match(body,/south\.focus\(\);await expect\(south\)\.toBeFocused\(\);await page\.keyboard\.press\('Space'\)/);
  assert.match(body,/await expect\(south\)\.toHaveAttribute\('aria-pressed','true'\)/);
  assert.match(body,/MutationObserver\(\(\)=>\{observer\.disconnect\(\);resolve\(\);\}\)/);
  assert.match(body,/observer\.observe\(element,\{childList:true\}\)/);
  assert.match(body,/handle\.evaluate\(e=>e\.isConnected&&e===document\.activeElement\)/);
  assert.match(body,/expect\(after\)\.toEqual\(expected\)/);
  assert.match(body,/expect\(final\.game\.state\.time\)\.toBe\(0\)/);
  assert.match(body,/expect\(final\.game\.state\.gold\[0\]\)\.toBe\(mission\.startingGold-250\)/);
  assert.match(body,/K\.campaign\)\)\.toEqual\(progress\)/);
  assert.match(body,/assertPassiveContinuation\(running\.game,resumed\.game\)/);
  assert.doesNotMatch(body+helper,/waitForTimeout|force\s*:|dispatchEvent|setFlightPlan|setCompactBuildOpen/);
});

test('short-screen flight reachability remains a full-visibility assertion',()=>{
  const reachability=readFileSync(new URL('../qa/browser/training-browser-helpers.mjs',import.meta.url),'utf8');
  assert.match(source,/for\(const viewport of \[\{width:320,height:430\},\{width:667,height:300\}\]\)/);
  assert.match(source,/for\(const selector of \['#flightNorth','#flightHold','#flightSouth','#upgrade','#sell','#closeSelection'\]\) \{\s*await expectReachable\(page,selector\)/);
  assert.match(reachability,/toBeInViewport\(\{ratio:1\}\)/);
});
