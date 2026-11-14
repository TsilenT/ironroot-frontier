// Read-only native geometry. The fixed shell and scrollable child rectangles
// have different contracts; offscreen content is validated in scroll space.
export async function objectiveRegionGeometry(){
 const {inspectMobileGeometry,inspectScrollableObjectives,visibleViewportRect,insetViewportRect}=await import('/mobile-battlefield.js');
 const r=e=>{const b=e.getBoundingClientRect();return{left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
 const app=document.getElementById('app'),port=document.getElementById('objectiveContent'),style=getComputedStyle(port);
 const safe=insetViewportRect(visibleViewportRect(innerWidth,innerHeight,visualViewport),getComputedStyle(app));
 const ids=['pause','speed','sound','settings','home','front','minimap','compactBuild','objectiveContent'];
 if(app.classList.contains('mobile-coaching'))for(const id of ['coachResume','toggleCoach'])if(!document.getElementById(id).classList.contains('hidden'))ids.push(id);
 const controls=ids.map(id=>{const e=document.getElementById(id),b=r(e);return{id,...b,hit:e.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2))};});
 const nodes=[...document.querySelectorAll('[data-protected-id],#focusMinorReserve')].filter(e=>e.getClientRects().length&&r(e).width&&r(e).height);
 const local={port:r(port),slot:r(document.getElementById('protectedDock')),clientWidth:port.clientWidth,clientHeight:port.clientHeight,scrollWidth:port.scrollWidth,scrollHeight:port.scrollHeight,scrollLeft:port.scrollLeft,scrollTop:port.scrollTop,controls:nodes.map(r),clipped:nodes.every(e=>port.contains(e))&&style.overflowY==='auto'&&style.overflowX==='hidden'&&/\b(paint|content|strict)\b/.test(style.contain)};
 const world=r(document.getElementById('battle')),regions=['topbar','protectedDock','protectedNavigation',...(app.classList.contains('mobile-coaching')&&!app.classList.contains('coach-collapsed')?['campaignTeaching']:[])].map(id=>({id,...r(document.getElementById(id))}));
 return{safe,world,regions,controls,port:local,local:inspectScrollableObjectives(local),shell:inspectMobileGeometry({viewport:safe,canvas:world,regions,controls}),buildParent:document.getElementById('compactBuild').parentElement.id};
}

// Tile stable rendered labels using real wheel input. Each non-whitespace
// character must be visible in at least one observed scroll position. A label
// larger than the port need not fit in a single frame.
export async function readObjectiveText(page,inspectPhoneText,selector,{limit=240,minimumFont=11}={}){
 const port=page.locator('#objectiveContent');
 const settled=async(top=null)=>port.evaluate(async(e,target)=>{
  const start=performance.now();let position=e.scrollTop,stable=start;
  while(performance.now()-start<3000){
   await new Promise(r=>setTimeout(r,16));const now=performance.now();
   if(e.scrollTop!==position){position=e.scrollTop;stable=now;}
   if(now-start>=140&&now-stable>=80&&(target===null||Math.abs(position-target)<.5))return;
  }
  throw Error('Native objective scroll did not settle at '+target);
 },top);
 await port.focus();await page.keyboard.press('Home');await settled(0);const seen=new Map(),complete=new Map();
 for(let step=0;step<limit;step++){
  const samples=await page.evaluate(inspectPhoneText,{selector,ownerSelector:'[data-protected-id],#objectiveContent',minimumFont});
  for(let i=0;i<samples.length;i++){
   const s=samples[i],key=i+':'+s.expectedText;
   if(!seen.has(key))seen.set(key,{text:s.text,expected:s.characters.length,visible:new Set()});
   const record=seen.get(key);s.characters.forEach((c,n)=>{if(c.visible)record.visible.add(n);});
   // A ticking counter may change while another label is being read. Retain
   // the exact rendered version whose characters were actually all observed.
   if(record.expected>0&&record.visible.size===record.expected&&!s.overflow&&!complete.has(i))complete.set(i,{text:s.text,characters:record.expected,complete:true,expectedText:s.expectedText,visibleText:s.characters.map(c=>c.character).join(''),overflow:s.overflow});
  }
  if(samples.length&&complete.size===samples.length)return [...complete.entries()].sort((a,b)=>a[0]-b[0]).map(([,value])=>value);
  const metrics=await port.evaluate(e=>({top:e.scrollTop,height:e.clientHeight,total:e.scrollHeight}));
  if(metrics.top>=metrics.total-metrics.height-1)throw Error('Unreachable objective text: '+JSON.stringify(samples.map((s,i)=>({text:s.text.slice(0,80),seen:seen.get(i+':'+s.expectedText)?.visible.size,total:s.characters.length}))));
  const glyphHeight=Math.max(0,...samples.flatMap(s=>s.rects.map(r=>r.height)));
  const stepSize=Math.min(metrics.height*.5,Math.max(4,metrics.height-glyphHeight-4));
  await port.hover();await page.mouse.wheel(0,stepSize);await settled();
 }
 throw Error('Objective read exceeded declared finite fixture scan budget');
}
