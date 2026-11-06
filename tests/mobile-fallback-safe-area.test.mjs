import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8'),html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const rule=css.match(/\.viewport-pause \{([^}]+)\}/)[1];
// Deliberately limited to this component's explicit padding declaration.
// This calculates source geometry; native safe-area/focus behavior remains a gate.
function padding(declaration,insets){
 const expressions=[...declaration.matchAll(/calc\((\d+)px \+ env\(safe-area-inset-(top|right|bottom|left), 0px\)\)/g)];
 if(expressions.length===4)return expressions.map(([,base,axis])=>+base+(insets[axis]||0));
 const fixed=declaration.match(/^\s*(\d+)px\s*$/);assert.ok(fixed,'known padding syntax');return Array(4).fill(+fixed[1]);
}
function panel(width,height,insets={},declaration=rule.match(/padding:([^;]+);/)[1]){
 const [top,right,bottom,left]=padding(declaration,insets);
 const actionHeight=Number(css.match(/\.viewport-actions button \{[^}]*min-height: (\d+)px/)[1]);
 const actionGap=Number(css.match(/\.viewport-actions \{[^}]*gap: (\d+)px/)[1]);
 const sectionGap=Number(css.match(/\.viewport-pause > section \{[^}]*gap: (\d+)px/)[1]);
 const titleBottom=height-bottom,titleTop=titleBottom-actionHeight,resumeBottom=titleTop-actionGap,resumeTop=resumeBottom-actionHeight;
 return {left,right:width-right,titleTop,titleBottom,resumeTop,resumeBottom,messageHeight:resumeTop-sectionGap-top,usableHeight:height-(insets.top||0)-(insets.bottom||0)};
}
test('fallback safe actions and readable scroll region fit the bounded 160px usable-height floor after all insets',()=>{
 for(const insets of [{},{bottom:34},{top:20,bottom:34},{left:44,right:44,bottom:21}]){
  const height=160+(insets.top||0)+(insets.bottom||0),p=panel(320,height,insets);
  assert.equal(p.usableHeight,160);assert.equal(p.messageHeight,40);
  assert.equal(p.titleBottom-p.titleTop,44);assert.equal(p.resumeBottom-p.resumeTop,44);
  assert.ok(p.resumeTop>=(insets.top||0)+8);assert.ok(p.titleBottom<=height-(insets.bottom||0)-8);
  assert.ok(p.left>=(insets.left||0)+8);assert.ok(p.right<=320-(insets.right||0)-8);
 }
 assert.equal(panel(320,194,{bottom:34}).messageHeight,40,'34px bottom inset requires 194px total for the same bounded floor');
});
test('negative padding mutation reproduces 26px of the old Save/title target falling into a 34px unsafe bottom area',()=>{
 const old=panel(320,160,{bottom:34},'8px'),fixed=panel(320,160,{bottom:34});
 assert.equal(old.titleBottom-(160-34),26);
 assert.equal(fixed.titleBottom<=160-34,true);assert.equal(fixed.titleBottom-fixed.titleTop,44);
 assert.equal(fixed.usableHeight,126);assert.equal(fixed.messageHeight,6,'below the qualified readable-dialog floor; do not call this complete usable UI');
});
test('the labelled fallback explanation is keyboard-focusable and the existing dialog trap includes it without changing safe initial focus',()=>{
 assert.match(html,/<div class="viewport-message" role="region" tabindex="0" aria-labelledby="viewportTitle">/);
 assert.match(css,/\.viewport-message:focus-visible \{[^}]*outline: 2px solid/);
 const begin=app.indexOf('function dialogControls('),end=app.indexOf('function syncDialogs()',begin);
 const region={id:'viewport-message'},resume={id:'viewportResume'},exit={id:'viewportExit'};
 const layer={querySelectorAll(selector){assert.ok(selector.includes('[tabindex="0"]'));return [region,resume,exit];},querySelector(selector){assert.equal(selector,'[data-dialog-focus]');return exit;}};
 const api=runInNewContext(app.slice(begin,end)+'\n({dialogControls,dialogDefaultFocus})',{controlIsVisible:()=>true});
 assert.deepEqual([...api.dialogControls(layer)],[region,resume,exit]);
 assert.equal(api.dialogDefaultFocus(layer),exit,'initial focus remains on safe title exit, not the scroll region');
 assert.match(app,/if \(e\.key !== 'Tab' \|\| !activeDialog\) return;/);
 assert.match(css,/\.viewport-message \{[^}]*overflow: auto;/);
});
