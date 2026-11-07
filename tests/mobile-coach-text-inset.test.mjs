import test from 'node:test';
import assert from 'node:assert/strict';
import {css,layout} from './mobile-layout-fixture.mjs';

const rule=selector=>{
  const start=css.indexOf(selector+' {');
  assert.notEqual(start,-1,selector);
  return css.slice(start).split('}')[0];
};
const coach=rule('.protected-mobile.mobile-coaching .campaign-coach');
const inset=Number(coach.match(/padding: (\d+)px 4px;/)[1]);
const normalLine=Number(rule('.protected-mobile.mobile-coaching .coach-next').match(/line-height: (\d+)px;/)[1]);
const shortLine=Number(rule('.protected-mobile.protected-short-portrait.mobile-coaching .coach-next').match(/line-height: (\d+)px;/)[1]);

// Source-derived geometry using the observed 16px DM Sans range, starting 1px
// above its line box. This reproduces the clipping defect, but is not native
// typography or wrapping evidence. The existing browser character gate remains.
for(const [width,height,insets] of [[390,650,{bottom:34}],[320,568,{}],[844,390,{}],[740,320,{left:21,right:21,bottom:21}],[320,480,{bottom:34}]]){
  test(`compact coaching contains the observed text ascent inside its unchanged rail at ${width}x${height}`,()=>{
    const {nodes}=layout(width,height,{...insets,teaching:true,protect:false});
    const owner=nodes.campaignCoach,isShort=width<=height&&height<560;
    const lineHeight=isShort?shortLine:normalLine;
    const rangeAt=(line,padding)=>({top:owner.top+padding+line*lineHeight-1,bottom:owner.top+padding+line*lineHeight+15});
    assert.ok(rangeAt(0,0).top<owner.top-.5,'negative control retains the original one-pixel clip');
    for(let line=0;line<3;line++){
      const range=rangeAt(line,inset);
      assert.ok(range.top>=owner.top,`line ${line} ascent is inside the scroller`);
      assert.ok(range.bottom<=owner.bottom,`line ${line} descent is inside the scroller`);
    }
    assert.equal(nodes.campaignTeaching.height,isShort?44:width<=height?88:64);
    assert.ok(nodes.battle.height>=212);
    assert.equal(nodes.coachResume.height,44);
    assert.equal(nodes.toggleCoach.height,44);
  });
}
test('coach text inset retains border-box sizing, scrolling and compact typography',()=>{
  assert.match(css,/\*\s*\{\s*box-sizing: border-box;/);
  assert.match(coach,/height: 100%/);
  assert.match(coach,/overflow-y: auto/);
  assert.match(coach,/overscroll-behavior: contain/);
  assert.equal(inset,1);
  assert.equal(normalLine,15);
  assert.equal(shortLine,14);
});
