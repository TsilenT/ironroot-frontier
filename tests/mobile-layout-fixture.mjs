import {readFileSync} from 'node:fs';
export const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
const base=css.slice(css.indexOf('.app.protected-mobile {'),css.indexOf('.protected-mobile .brand'));
export const portrait=css.slice(css.indexOf('.app.protected-mobile.protected-portrait {'),css.indexOf('.protected-portrait .topbar'));
export const ordinary=css.slice(css.indexOf('.app.protected-mobile.protected-portrait.mobile-ordinary {'),css.indexOf('.protected-mobile.mobile-ordinary .protected-dock'));
export const token=(text,name)=>Number(text.match(new RegExp(`--mobile-${name}: (\\d+)px;`))[1]);
export const box=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
export function layout(width,height,{bottom=0,top=0,left=0,right=0,protect=true}={}){
  const isPortrait=width<=height,tokens=isPortrait?portrait:base;
  const header=token(tokens,'header'),dock=isPortrait&&!protect?token(ordinary,'dock'):token(tokens,'dock'),nav=token(tokens,'navigation'),rail=token(tokens,'rail');
  const usableWidth=width-left-right,worldHeight=height-top-bottom-header-dock-nav;
  const canvas=box(left,top+header,usableWidth-rail,worldHeight);
  const navigation=isPortrait?box(left,canvas.bottom+dock,usableWidth,nav):box(canvas.right,canvas.top,rail,worldHeight);
  const objective=box(left,canvas.bottom,usableWidth,dock),headerBox=box(left,top,usableWidth,header);
  const nodes={battle:canvas,topbar:headerBox,protectedDock:objective,protectedNavigation:navigation};
  if(isPortrait){
    nodes.compactBuild=box(left+6,navigation.top+2,56,44);
    for(const [i,id]of ['pause','speed','sound','settings'].entries())nodes[id]=box(left+usableWidth-6-188+i*48,navigation.top+2,44,44);
    nodes.home=box(left+6,navigation.top+50,44,44);nodes.front=box(left+usableWidth-50,navigation.top+50,44,44);
    nodes.minimap=box(left+54,navigation.top+50,usableWidth-108,44);
    const w=(usableWidth-18)/2;
    nodes.target0=box(left+6,objective.top+36,w,44);nodes.target1=box(left+12+w,objective.top+36,w,44);
  }else{
    for(const[i,id]of ['pause','speed','sound','settings'].entries())nodes[id]=box(navigation.left+30+(i%2)*48,navigation.top+8+Math.floor(i/2)*48,44,44);
    const y=navigation.bottom-100;
    nodes.home=box(navigation.left+19,y,44,44);nodes.front=box(navigation.left+89,y,44,44);nodes.minimap=box(navigation.left+8,y+48,136,44);
    // CSS minmax(168px,1fr),52px,minmax(0,2fr) with 12px padding/12px gaps.
    const first=Math.max(168,(usableWidth-76)/3),last=usableWidth-76-first;
    nodes.compactBuild=protect?box(left+12+first,objective.top+8,52,44):box(left+usableWidth-58,objective.top+8,52,44);
    nodes.target0=box(left+70+first,objective.top+7,(last-6)/2,47);nodes.target1=box(left+76+first+(last-6)/2,objective.top+7,(last-6)/2,47);
  }
  const controls=['pause','speed','sound','settings','home','front','minimap','compactBuild',...(protect?['target0','target1']:[])].map(id=>nodes[id]);
  return {nodes,canvas,controls,regions:[headerBox,objective,navigation],viewport:box(0,0,width,height)};
}

