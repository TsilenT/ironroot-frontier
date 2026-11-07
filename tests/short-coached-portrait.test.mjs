import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {layout} from './mobile-layout-fixture.mjs';
import {inspectMobileGeometry,MIN_PROTECTED_WORLD_HEIGHT,createViewportPause} from '../dist/mobile-battlefield.js';

const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
const prefix='.protected-mobile.protected-short-portrait.mobile-coaching';
const rules=selector=>[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m=>m[1].trim()===selector).map(m=>m[2]).join('\n');
const root=rules('.app'+prefix);
const value=(text,name)=>Number(text.match(new RegExp(`--mobile-${name}: (\\d+)px`))[1]);
const box=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
// Explicit source-derived arithmetic, not browser layout evidence. The browser
// companion asserts actual CSS geometry and all hit targets without mocking it.
function geometry({height=430,bottom=0,width=320}={}){
 const header=value(rules('.app.protected-mobile.protected-short-portrait'),'header');
 const dock=value(rules('.app.protected-mobile.protected-short-portrait'),'dock');
 const teaching=value(root,'teaching'),rail=value(root,'rail');
 const fieldHeight=height-bottom-header-dock-teaching,fieldWidth=width-rail;
 const canvas=box(0,header,fieldWidth,fieldHeight),navigation=box(fieldWidth,header,rail,fieldHeight);
 const teachingBox=box(0,canvas.bottom,width,teaching),objective=box(0,teachingBox.bottom,width,dock);
 const x=fieldWidth+6,y=header+6;
 const controls=[box(x,y,92,44),...[0,1,2,3].map(i=>box(x+i%2*48,y+48+Math.floor(i/2)*48,44,44))];
 const mapTop=Math.max(y+144,navigation.bottom-98);
 controls.push(box(x,mapTop,44,44),box(x+48,mapTop,44,44),box(x,mapTop+48,92,44));
 controls.push(box(6,objective.top+16,(width-18)/2,44),box(width/2+3,objective.top+16,(width-18)/2,44));
 controls.push(box(width-110,teachingBox.top,56,44),box(width-50,teachingBox.top,44,44));
 return {viewport:box(0,0,width,height-bottom),canvas,regions:[box(0,0,width,header),navigation,teachingBox,objective],controls};
}

test('short coached portrait replaces the bottom navigation tracks with a real side rail',()=>{
 assert.equal(value(root,'rail'),104);assert.equal(value(root,'navigation'),0);assert.equal(value(root,'teaching'),44);
 assert.match(root,/grid-template-columns: minmax\(0, 1fr\) var\(--mobile-rail\)/);
 assert.match(root,/grid-template-rows: var\(--mobile-header\) minmax\(0, 1fr\) var\(--mobile-teaching\) var\(--mobile-dock\);/);
 assert.match(rules(prefix+' .protected-navigation'),/grid-column: 2; grid-row: 2/);
 assert.match(rules(prefix+' .protected-navigation'),/grid-template-rows: 44px 92px minmax\(92px, 1fr\)/);
 for(const region of ['.campaign-teaching','.protected-dock'])assert.match(rules(prefix+' '+region),/grid-column: 1 \/ -1/);
 for(const region of ['.compact-build','.toolbelt','.bottom-map'])assert.doesNotMatch(rules(prefix+' .protected-navigation '+region),/display:\s*none|visibility:\s*hidden|scale\(/);
 assert.match(rules('.protected-mobile.mobile-coaching .campaign-coach'),/padding: 1px 4px/,'retain font-ink inset');
});

test('320x430 resumed protected coaching fits the unchanged safety contract without a screen-pause latch',()=>{
 const shared=layout(320,430,{teaching:true});
 assert.equal(shared.canvas.width,216);assert.equal(shared.canvas.height,278);
 assert.deepEqual(inspectMobileGeometry(shared),{safe:true,reason:''});
 const g=geometry();assert.equal(g.canvas.width,216);assert.equal(g.canvas.height,278);assert.equal(MIN_PROTECTED_WORLD_HEIGHT,212);
 assert.deepEqual(inspectMobileGeometry(g),{safe:true,reason:''});
 const latch=createViewportPause();latch.measure(!inspectMobileGeometry(g).safe);assert.equal(latch.active,false);
 // Negative old layout: adding 96px bottom navigation reproduces 182px field.
 const old={...g,canvas:{...g.canvas,height:g.canvas.height-96,bottom:g.canvas.bottom-96}};
 assert.equal(old.canvas.height,182);assert.equal(inspectMobileGeometry(old).safe,false);
});

test('short coached rail respects bottom safe areas and still rejects genuinely tiny geometry',()=>{
 assert.equal(inspectMobileGeometry(geometry({bottom:21})).safe,true);
 for(const options of [{bottom:67},{width:200,height:300},{height:370}])assert.equal(inspectMobileGeometry(geometry(options)).safe,false);
 const latch=createViewportPause();latch.measure(true);latch.measure(!inspectMobileGeometry(geometry()).safe);
 assert.equal(latch.blocked,false);assert.equal(latch.active,true,'safe recovery still requires explicit Resume');
});

test('shared short-coached fixture exposes teaching controls and rejects the 370px rail overlap',()=>{
 const unsafe=layout(320,370,{teaching:true});
 assert.equal(unsafe.canvas.height,218,'world itself remains above the unchanged 212px floor');
 assert.ok(unsafe.controls.includes(unsafe.nodes.coachResume));
 assert.ok(unsafe.controls.includes(unsafe.nodes.toggleCoach));
 assert.ok(unsafe.regions.includes(unsafe.nodes.campaignTeaching));
 assert.deepEqual(inspectMobileGeometry(unsafe),{safe:false,reason:'The controls need more space.'});
 // 400px fits the full 248px rail. At 393px, overflow exceeds the
 // 6px bottom padding and the minimap overlaps the teaching control.
 assert.equal(inspectMobileGeometry(layout(320,400,{teaching:true})).safe,true);
 assert.equal(inspectMobileGeometry(layout(320,394,{teaching:true})).safe,true);
 assert.equal(inspectMobileGeometry(layout(320,393,{teaching:true})).safe,false);
});
