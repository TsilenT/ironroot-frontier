import {readFileSync} from 'node:fs';
export const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
const rule=selector=>css.slice(css.indexOf(selector+' {')).split('}')[0];
const base=rule('.app.protected-mobile');
export const portrait=rule('.app.protected-mobile.protected-portrait');
export const ordinary=rule('.app.protected-mobile.protected-portrait.mobile-ordinary');
export const sidebar=rule('.app.protected-mobile.protected-sidebar');
export const shortPortrait=rule('.app.protected-mobile.protected-short-portrait');
export const token=(text,name)=>Number(text.match(new RegExp(`--mobile-${name}: (\\d+)px;`))[1]);
export const box=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
// Source-derived grid fixture, not a CSS engine or native-browser evidence.
// Root bounds deliberately come from inline style in the startup fixture, not
// from the safety viewport: removing the real fit must reproduce the old bug.
export function layout(width,height,{bottom=0,top=0,left=0,right=0,protect=true,root=box(0,0,width,height),viewport=root}={}){
  const isPortrait=width<=height,isSidebar=!isPortrait&&root.height<360,isShort=isPortrait&&root.height<560;
  const tokens=isSidebar?sidebar:isShort?shortPortrait:isPortrait?portrait:base;
  const header=token(tokens,'header'),dock=!protect&&(isPortrait||isSidebar)?token(isSidebar?rule('.app.protected-mobile.protected-sidebar.mobile-ordinary'):isShort?rule('.app.protected-mobile.protected-short-portrait.mobile-ordinary'):ordinary,'dock'):token(tokens,'dock');
  const nav=isShort?token(portrait,'navigation'):token(tokens,'navigation'),rail=isShort?token(portrait,'rail'):token(tokens,'rail');
  const x=root.left+left,y=root.top+top,usableWidth=root.width-left-right,usableHeight=root.height-top-bottom;
  let canvas,navigation,objective,headerBox;
  if(isSidebar){
    // The minmax dock cannot shrink below its authored minimum. At truly tiny
    // heights grid overflow is rejected, rather than pretending controls fit.
    const trackHeight=Math.max(usableHeight,header+dock+nav),worldWidth=Math.max(0,usableWidth-rail);
    canvas=box(x,y,worldWidth,trackHeight);headerBox=box(canvas.right,y,rail,header);
    objective=box(canvas.right,y+header,rail,trackHeight-header-nav);
    navigation=box(canvas.right,y+trackHeight-nav,rail,nav);
  }else{
    const worldHeight=Math.max(0,usableHeight-header-dock-nav);
    canvas=box(x,y+header,Math.max(0,usableWidth-rail),worldHeight);
    navigation=isPortrait?box(x,canvas.bottom+dock,usableWidth,nav):box(canvas.right,canvas.top,rail,worldHeight);
    objective=box(x,canvas.bottom,usableWidth,dock);headerBox=box(x,y,usableWidth,header);
  }
  const nodes={app:root,battle:canvas,topbar:headerBox,protectedDock:objective,protectedNavigation:navigation};
  if(isPortrait||isSidebar){
    const nx=navigation.left,nw=navigation.width;
    nodes.compactBuild=box(nx+6,navigation.top+2,56,44);
    for(const [i,id]of ['pause','speed','sound','settings'].entries())nodes[id]=box(nx+nw-6-188+i*48,navigation.top+2,44,44);
    nodes.home=box(nx+6,navigation.top+50,44,44);nodes.front=box(nx+nw-50,navigation.top+50,44,44);
    nodes.minimap=box(nx+54,navigation.top+50,nw-108,44);
    const targetY=objective.top+(isShort?16:36),w=(objective.width-18)/2;
    const targetHeight=isSidebar?Number(css.match(/\.protected-sidebar \.protected-target \{[^}]*min-height: (\d+)px/)[1]):44;
    nodes.target0=box(objective.left+6,targetY,w,targetHeight);nodes.target1=box(objective.left+12+w,targetY,w,targetHeight);
  }else{
    for(const[i,id]of ['pause','speed','sound','settings'].entries())nodes[id]=box(navigation.left+30+(i%2)*48,navigation.top+8+Math.floor(i/2)*48,44,44);
    const ny=navigation.bottom-100;
    nodes.home=box(navigation.left+19,ny,44,44);nodes.front=box(navigation.left+89,ny,44,44);nodes.minimap=box(navigation.left+8,ny+48,136,44);
    // CSS minmax(168px,1fr),52px,minmax(0,2fr),12px padding/12px gaps.
    const first=Math.max(168,(usableWidth-76)/3),last=usableWidth-76-first;
    nodes.compactBuild=protect?box(x+12+first,objective.top+8,52,44):box(x+usableWidth-58,objective.top+8,52,44);
    nodes.target0=box(x+70+first,objective.top+7,(last-6)/2,47);nodes.target1=box(x+76+first+(last-6)/2,objective.top+7,(last-6)/2,47);
  }
  const controls=['pause','speed','sound','settings','home','front','minimap','compactBuild',...(protect?['target0','target1']:[])].map(id=>nodes[id]);
  return {nodes,canvas,controls,regions:[headerBox,objective,navigation],viewport};
}
