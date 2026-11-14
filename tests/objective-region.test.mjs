import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectMobileGeometry,inspectScrollableObjectives,MIN_PROTECTED_WORLD_HEIGHT} from '../dist/mobile-battlefield.js';
const box=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
function fixture(){return{viewport:box(0,0,320,430),world:box(0,48,320,226),slot:box(0,274,320,60),port:box(0,274,320,60),navigation:box(0,334,320,96),clientWidth:320,clientHeight:60,scrollWidth:320,scrollHeight:1000,scrollTop:0,scrollLeft:0,clipped:true,controls:[box(6,290,308,58),box(6,354,308,58)]};}
function inspect(x){const shell=inspectMobileGeometry({viewport:x.viewport,canvas:x.world,regions:[x.slot,x.navigation],controls:[x.port]});return shell.safe?inspectScrollableObjectives(x):shell;}
for(const offset of [0,80,500])test(`objective scroll offset ${offset}: offscreen rectangles remain locally reachable`,()=>{
 const x=fixture();x.scrollTop=offset;for(const r of x.controls){r.top-=offset;r.bottom-=offset;}
 const before=structuredClone(x);assert.deepEqual(inspect(x),{safe:true,reason:''});assert.deepEqual(x,before);assert.equal(MIN_PROTECTED_WORLD_HEIGHT,212);
});
test('a long card can be read through the port without requiring a larger battlefield or slot',()=>{const x=fixture();x.controls=[box(6,274,308,800)];assert.equal(inspect(x).safe,true);});
for(const [name,change]of[
 ['missing paint/scroll containment',x=>x.clipped=false],
 ['port over the world',x=>{x.port.top-=10;x.port.bottom-=10;}],
 ['port over navigation',x=>{x.port.top+=10;x.port.bottom+=10;}],
 ['undersized button',x=>x.controls[0]=box(6,290,308,40)],
 ['overlap below the visible port',x=>x.controls[1]=box(6,330,308,58)],
 ['unreachable content above scroll origin',x=>x.controls[0]=box(6,250,308,44)],
 ['horizontal overflow in a vertical region',x=>{x.scrollWidth=512;x.controls[0]=box(6,290,500,58);}],
 ['insufficient world',x=>{x.world.height=211;x.world.bottom=x.world.top+211;}],
 ['nonfinite geometry',x=>x.controls[0].width=NaN],
])test(`objective region rejects ${name}`,()=>{const x=fixture();change(x);assert.equal(inspect(x).safe,false);});
test('native scrollbar space belongs to the port rather than unreachable content',()=>{const x=fixture();x.clientWidth=305;x.scrollWidth=305;x.controls=[box(6,290,293,58)];assert.equal(inspect(x).safe,true);});
