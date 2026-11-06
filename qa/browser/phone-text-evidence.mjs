// Read-only native DOM probe. Send this function through page/frame.evaluate.
// Every non-whitespace character, including text in nested spans, must render
// inside its owning control/dock and all clipping ancestors. Parent line boxes
// alone cannot prove that a hidden or clipped nested status string is visible.
export function inspectPhoneText({selector,ownerSelector='[data-protected-id],#protectedDock,.topbar',minimumFont=11}={}){
 const rect=r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height});
 const contains=(outer,r)=>r.left>=outer.left-.5&&r.top>=outer.top-.5&&r.right<=outer.right+.5&&r.bottom<=outer.bottom+.5;
 const visual=window.visualViewport,left=Math.max(0,visual?.offsetLeft||0),top=Math.max(0,visual?.offsetTop||0);
 const viewport={left,top,right:Math.min(innerWidth,left+(visual?.width??innerWidth)),bottom:Math.min(innerHeight,top+(visual?.height??innerHeight))};
 return [...document.querySelectorAll(selector)].map(element=>{
  const owner=element.closest(ownerSelector),ownerRect=owner?.getBoundingClientRect(),minimum=element.matches('#objectiveProgress,#objectiveTime')?10:minimumFont;
  const walker=document.createTreeWalker(element,4),characters=[],rects=[];let node;
  while((node=walker.nextNode())){
   let offset=0;
   for(const character of node.textContent){
    const start=offset;offset+=character.length;if(/\s/u.test(character))continue;
    const range=document.createRange();range.setStart(node,start);range.setEnd(node,offset);
    const boxes=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0),reasons=[];
    if(!boxes.length)reasons.push('no rendered character');
    const leafStyle=getComputedStyle(node.parentElement);
    if(leafStyle.visibility==='hidden'||leafStyle.visibility==='collapse')reasons.push('hidden');
    if(parseFloat(leafStyle.fontSize)<minimum)reasons.push('undersized');
    if(leafStyle.color==='transparent'||/rgba\([^)]*,\s*0\s*\)$/.test(leafStyle.color))reasons.push('transparent');
    for(let ancestor=node.parentElement;ancestor;ancestor=ancestor.parentElement){
     const style=getComputedStyle(ancestor);
     if(style.display==='none'||Number(style.opacity)===0)reasons.push('hidden ancestor');
     if(style.display!=='inline'&&['overflowX','overflowY'].some(axis=>['hidden','clip','auto','scroll'].includes(style[axis]))){
      const bounds=ancestor.getBoundingClientRect(),clip={left:bounds.left+ancestor.clientLeft,top:bounds.top+ancestor.clientTop};
      clip.right=clip.left+ancestor.clientWidth;clip.bottom=clip.top+ancestor.clientHeight;
      if(boxes.some(r=>(style.overflowX!=='visible'&&(r.left<clip.left-.5||r.right>clip.right+.5))||(style.overflowY!=='visible'&&(r.top<clip.top-.5||r.bottom>clip.bottom+.5))))reasons.push('clipped ancestor');
     }
    }
    if(!ownerRect||boxes.some(r=>!contains(ownerRect,r)))reasons.push('outside owner');
    if(boxes.some(r=>!contains(viewport,r)))reasons.push('outside viewport');
    const visible=reasons.length===0;characters.push({character,visible,reasons:[...new Set(reasons)]});rects.push(...boxes.map(rect));
   }
  }
  const expectedText=element.textContent.replace(/\s/gu,''),visibleText=characters.filter(c=>c.visible).map(c=>c.character).join('');
  return {text:element.textContent,expectedText,visibleText,complete:expectedText.length>0&&visibleText===expectedText,characters,rects,overflow:element.scrollWidth>element.clientWidth+1};
 });
}

// Native resize handlers/ResizeObserver need a completed rendering cycle before
// hit testing. This waits for geometry stability; it does not scroll, force
// clicks, widen containment tolerances or skip a failing control assertion.
export async function settlePhoneViewport(page){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.waitForFunction(()=>{
  const app=document.getElementById('app');if(!app?.classList.contains('protected-mobile'))return true;
  const r=app.getBoundingClientRect(),v=visualViewport,left=Math.max(0,v?.offsetLeft||0),top=Math.max(0,v?.offsetTop||0);
  return Math.abs(r.left-left)<=.5&&Math.abs(r.top-top)<=.5&&Math.abs(r.right-Math.min(innerWidth,left+(v?.width??innerWidth)))<=.5&&Math.abs(r.bottom-Math.min(innerHeight,top+(v?.height??innerHeight)))<=.5;
 },undefined,{timeout:5000});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

export function savedClockText(snapshot){
 const seconds=Math.floor(snapshot.game.state.time+1e-6);
 return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
