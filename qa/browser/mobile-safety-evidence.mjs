// Read-only DOM evidence shared by the focused mobile regressions. No runtime
// imports, geometry mocks, app-state writes, forced events or resize nudges.
export function inspectMobileBattlefield(){
 const r=e=>{const b=e.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
 const app=document.getElementById('app'),root=r(app),s=getComputedStyle(app);
 const safe={left:root.left+parseFloat(s.paddingLeft),right:root.right-parseFloat(s.paddingRight),top:root.top+parseFloat(s.paddingTop),bottom:root.bottom-parseFloat(s.paddingBottom)};
 const controls=[...document.querySelectorAll('#pause,#speed,#sound,#settings,#home,#front,#minimap,#compactBuild,[data-protected-id],#coachResume:not(.hidden),#toggleCoach:not(.hidden)')].map(e=>({id:e.id||e.dataset.protectedId,...r(e),hit:e.contains(document.elementFromPoint(r(e).left+r(e).width/2,r(e).top+r(e).height/2))}));
 const world=r(document.getElementById('battle')),regions=['topbar','protectedNavigation','protectedDock','campaignTeaching'].map(id=>({id,...r(document.getElementById(id))}));
 const overlaps=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
 return {safe,world,regions,controls,collisions:controls.flatMap((a,i)=>controls.slice(i+1).filter(b=>overlaps(a,b)).map(b=>[a.id,b.id])),covered:controls.some(c=>overlaps(c,world))};
}

export function inspectSafetyDialog(){
 const panel=document.getElementById('viewportModal'),dialog=panel.querySelector('[role="dialog"]');
 const controls=['viewportResume','viewportExit'].map(id=>{
  const element=document.getElementById(id),r=element.getBoundingClientRect();
  return {id,width:r.width,height:r.height,hit:element.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)),inert:!!element.closest('[inert]'),inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5};
 });
 return {ariaHidden:dialog.getAttribute('aria-hidden'),focusInside:panel.contains(document.activeElement),appInert:document.getElementById('app').inert,pauseInert:document.getElementById('pauseVeil').inert,controls};
}

// Retain every committed modal transition, not only the final state after a
// polling expectation. This exposes a ready/blocked flip or a re-pause between
// the ordinary HUD-cycle samples. Only the QA observation buffer is written.
export function installViewportSafetyWatch(){
 window.__qaViewportSafetyWatch?.disconnect();
 const panel=document.getElementById('viewportModal');
 const read=()=>({visible:!panel.classList.contains('hidden'),title:document.getElementById('viewportTitle').textContent,resumeDisabled:document.getElementById('viewportResume').disabled});
 window.__qaViewportSafetySamples=[read()];
 const observer=new MutationObserver(()=>window.__qaViewportSafetySamples.push(read()));
 observer.observe(panel,{attributes:true,attributeFilter:['class','disabled'],childList:true,characterData:true,subtree:true});
 window.__qaViewportSafetyWatch=observer;
}
