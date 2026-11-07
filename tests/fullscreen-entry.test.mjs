import test from 'node:test';
import assert from 'node:assert/strict';
import {runInContext} from 'node:vm';
import {startupHarness} from './mobile-startup-fixture.mjs';

// Execute the actual app handlers against the parsed production HTML and real
// battle startup. Only native fullscreen/display-mode APIs are simulated. This
// does not claim trusted browser activation, real focus or CSS layout evidence.
function harness({api='standard', enabled=true, appView=false, ios=false}={}) {
  const h=startupHarness({width:390,height:650}), {c,$}=h;
  const events=new Map(),calls=[],statuses=()=>[$('welcomeFullscreenStatus').textContent,$('fullscreenStatus').textContent];
  c.document.documentElement=c.document.body.parentNode;
  c.document.fullscreenElement=null;c.document.webkitFullscreenElement=null;
  c.document.addEventListener=(name,fn)=>events.set(name,fn);
  c.navigator={standalone:ios};
  const media={matches:appView,addEventListener(name,fn){this.change=fn;}};
  const originalMedia=c.window.matchMedia;
  c.window.matchMedia=q=>q.includes('display-mode:')?media:originalMedia(q);
  const stateKey=api==='webkit'?'webkitFullscreenElement':'fullscreenElement';
  const eventName=api==='webkit'?'webkitfullscreenchange':'fullscreenchange';
  const change=active=>{c.document[stateKey]=active?c.document.documentElement:null;events.get(eventName)?.();};
  const request=options=>{calls.push({type:'enter',options});change(true);return Promise.resolve();};
  const exit=()=>{calls.push({type:'exit'});change(false);return Promise.resolve();};
  if(api==='standard') {
    c.document.fullscreenEnabled=enabled;c.document.documentElement.requestFullscreen=request;c.document.exitFullscreen=exit;
  } else if(api==='webkit') {
    c.document.webkitFullscreenEnabled=enabled;c.document.documentElement.webkitRequestFullscreen=request;c.document.webkitExitFullscreen=exit;
  }
  const start=h.source.indexOf('// Fullscreen is optional'),end=h.source.indexOf("$('audioEnabled').onchange",start);
  assert.ok(start>=0&&end>start);runInContext(h.source.slice(start,end),c);
  return {...h,events,calls,statuses,media,change,click:id=>$(id).clickListener()};
}
const buttons=['welcomeFullscreen','settingsFullscreen'];
function assertState(h,active) {
  for(const id of buttons){assert.equal(h.$(id).textContent,active?'Exit fullscreen':'Enter fullscreen');assert.equal(h.$(id).attributes['aria-pressed'],String(active));}
  assert.equal(h.statuses()[0],h.statuses()[1]);
}

test('real markup exposes one optional entry and one Options control with local status descriptions',()=>{
  const h=harness();assert.equal(h.c.document.querySelectorAll('[data-fullscreen]').length,2);
  for(const id of buttons){const button=h.$(id);const status=h.$(button.attributes['aria-describedby']);assert.equal(status.attributes.role,'status');assert.equal(status.attributes['data-fullscreen-status'],'');}
  assert.equal(h.$('welcome').contains(h.$('welcomeFullscreen')),true);
  assert.equal(h.$('settingsModal').contains(h.$('settingsFullscreen')),true);
  assertState(h,false);assert.match(h.statuses()[0],/Optional/);assert.match(h.statuses()[0],/may remain/);
});

test('initialization, real Start, pause and viewport changes never request fullscreen',()=>{
  const h=harness();h.c.selectedCampaign='roadside-watch';h.c.start();h.$('coachingPlan').onclick();
  h.c.pause(true);h.resize(844,390);h.resize(320,568);h.c.syncFullscreenControls();
  assert.equal(h.calls.length,0);assert.equal(h.c.document.fullscreenElement,null);assert.equal(h.c.game.state.time,0);
});

for(const api of ['standard','webkit'])test(`${api}: entry runs synchronously, shared Options exit restores both controls`,async()=>{
  const h=harness({api}),before=h.c.game.serialize();h.$('welcomeFullscreen').focus();
  const pending=h.click('welcomeFullscreen');
  assert.equal(h.calls[0].type,'enter','API is called before the handler yields');
  if(api==='standard')assert.equal(h.calls[0].options.navigationUI,'hide');
  assert.equal(h.$('welcomeFullscreen').disabled,false);assert.equal(h.c.document.activeElement,h.$('welcomeFullscreen'));
  await pending;assertState(h,true);
  await h.click('settingsFullscreen');assertState(h,false);assert.match(h.statuses()[0],/Optional/);
  assert.deepEqual(h.c.game.serialize(),before);assert.equal(h.log.interruptions,2);
});

test('an unsettled request retains focus, prevents duplicate requests from either control, and allows later exit',async()=>{
  const h=harness();let settle;
  h.c.document.documentElement.requestFullscreen=()=>{h.calls.push('pending');return new Promise(resolve=>{settle=()=>{h.change(true);resolve();};});};
  h.$('welcomeFullscreen').focus();const first=h.click('welcomeFullscreen');
  for(const id of buttons){assert.equal(h.$(id).attributes['aria-disabled'],'true');assert.equal(h.$(id).disabled,false);await h.click(id);}
  assert.equal(h.calls.length,1);assert.equal(h.c.document.activeElement,h.$('welcomeFullscreen'));
  settle();await first;assertState(h,true);
  for(const id of buttons)assert.equal(h.$(id).attributes['aria-disabled'],'false');
  await h.click('welcomeFullscreen');assertState(h,false);
});

for(const failure of ['rejection','throw','error event'])test(`${failure} is visible at entry and Options, never blocks play, and permits explicit retry`,async()=>{
  const h=harness(),native=h.c.document.documentElement.requestFullscreen;
  h.c.document.documentElement.requestFullscreen=()=>{
    if(failure==='throw')throw new Error('Denied');
    if(failure==='error event'){h.events.get('fullscreenerror')();return;}
    return Promise.reject(new Error('Denied'));
  };
  await h.click('welcomeFullscreen');assertState(h,false);assert.match(h.statuses()[0],/Could not enter fullscreen/);
  for(const id of buttons){assert.equal(h.$(id).disabled,false);assert.equal(h.$(id).attributes['aria-disabled'],'false');}
  h.c.selectedCampaign='roadside-watch';h.c.start();assert.equal(h.c.started,true);
  h.c.document.documentElement.requestFullscreen=native;await h.click('welcomeFullscreen');assertState(h,true);
});

for(const options of [{api:'absent'},{enabled:false}])test(`${JSON.stringify(options)} offers a visible windowed fallback without blocking real Start`,async()=>{
  const h=harness(options);assertState(h,false);assert.match(h.statuses()[0],/unavailable.*Keep playing/);
  for(const id of buttons){assert.equal(h.$(id).disabled,true);await h.click(id);}
  h.c.selectedCampaign='roadside-watch';h.c.start();assert.equal(h.c.started,true);assert.equal(h.calls.length,0);
});

for(const options of [{appView:true},{ios:true},{appView:true,enabled:false}])test(`${JSON.stringify(options)} recognizes existing app view without requesting fullscreen`,async()=>{
  const h=harness(options);assertState(h,false);assert.match(h.statuses()[0],/App view is already active/);assert.equal(h.calls.length,0);
  if(options.enabled!==false){await h.click('welcomeFullscreen');assertState(h,true);await h.click('welcomeFullscreen');assertState(h,false);assert.match(h.statuses()[0],/App view is already active/);}
  else assert.match(h.statuses()[0],/unavailable.*keep playing/);
});

test('display-mode and native exit events update both surfaces without new requests',async()=>{
  const h=harness();h.media.matches=true;h.media.change();assert.match(h.statuses()[0],/App view is already active/);assert.equal(h.calls.length,0);
  await h.click('welcomeFullscreen');h.change(false);assertState(h,false);assert.equal(h.calls.length,1);
  h.media.matches=false;h.media.change();assert.match(h.statuses()[0],/Optional/);assert.equal(h.calls.length,1);
});

test('denied exit keeps truthful active state and can retry even if further entry is policy-disabled',async()=>{
  const h=harness();await h.click('welcomeFullscreen');const native=h.c.document.exitFullscreen;
  h.c.document.exitFullscreen=()=>Promise.reject(new Error('Denied'));await h.click('settingsFullscreen');
  assertState(h,true);assert.match(h.statuses()[0],/Could not leave fullscreen/);
  h.c.document.fullscreenEnabled=false;h.c.document.exitFullscreen=native;await h.click('welcomeFullscreen');
  assertState(h,false);assert.equal(h.$('welcomeFullscreen').disabled,true);assert.match(h.statuses()[0],/unavailable/);
});
