// Read-only DOM measurements. No application state, style mutation or input.
export function measureToastGeometry() {
  const rect = node => {
    const r = node.getBoundingClientRect();
    return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
  };
  const toast = document.querySelector('#toast'), canvas = document.querySelector('#battle');
  const objective = document.querySelector('#objectiveHUD');
  if (!toast || !canvas || !objective) return null;
  const visible = node => node.getClientRects().length > 0 &&
    !['hidden','collapse'].includes(getComputedStyle(node).visibility) &&
    !node.closest('.hidden,[hidden],[inert]');
  const vv = window.visualViewport;
  const left = Math.max(0,vv?.offsetLeft || 0), top = Math.max(0,vv?.offsetTop || 0);
  const right = Math.min(innerWidth,left+(vv?.width ?? innerWidth));
  const bottom = Math.min(innerHeight,top+(vv?.height ?? innerHeight));
  let opacity = 1, ancestorsVisible = true;
  const clips = [];
  for (let node=toast;node;node=node.parentElement) {
    const style=getComputedStyle(node);
    opacity *= Number(style.opacity);
    if (style.display==='none' || ['hidden','collapse'].includes(style.visibility)) ancestorsVisible=false;
    const x=/^(auto|scroll|hidden|clip)$/.test(style.overflowX),y=/^(auto|scroll|hidden|clip)$/.test(style.overflowY);
    if(node!==toast&&(x||y)){
      // Overflow clips inside borders and scrollbars. Client sizes can round
      // upward, so also cap them by the fractional, border-adjusted DOM bounds.
      // Current clipping ancestors are untransformed; refuse an unsupported
      // transformed clipping frame rather than pretend its client pixels match.
      if(style.transform&&style.transform!=='none')ancestorsVisible=false;
      const outer=rect(node),border=side=>parseFloat(style['border'+side+'Width'])||0;
      const clientLeft=outer.left+node.clientLeft,clientTop=outer.top+node.clientTop;
      const left=Math.max(clientLeft,outer.left+border('Left')),top=Math.max(clientTop,outer.top+border('Top'));
      const right=Math.min(clientLeft+node.clientWidth,outer.right-border('Right'));
      const bottom=Math.min(clientTop+node.clientHeight,outer.bottom-border('Bottom'));
      clips.push({left,top,right,bottom,width:right-left,height:bottom-top,x,y});
    }
  }
  const controls=[...document.querySelectorAll('[data-protected-id],#protectedNavigation button,#protectedNavigation canvas')]
    .filter(visible).map(node=>({id:node.id || node.getAttribute('data-protected-id'),protectedId:node.getAttribute('data-protected-id'),...rect(node)}));
  return {toast:rect(toast),canvas:rect(canvas),objective:rect(objective),
    viewport:{left,top,right,bottom,width:right-left,height:bottom-top},controls,clips,
    shown:toast.classList.contains('show')&&visible(toast)&&ancestorsVisible,
    objectiveVisible:visible(objective),opacity};
}

// Direction-independent safety contract. Keep the old 7px objective gap while
// allowing the HUD to sit below or beside the playable field. Bounds use only
// a numerical epsilon, not a visible allowance for hidden or clipped feedback.
export function toastGeometryIsSafe(sample) {
  if (!sample || !sample.shown || !sample.objectiveVisible || !Number.isFinite(sample.opacity) || sample.opacity<.99) return false;
  const valid = r => r && ['left','top','right','bottom','width','height'].every(k=>Number.isFinite(r[k])) &&
    r.width>0 && r.height>0 && Math.abs(r.right-r.left-r.width)<1e-6 && Math.abs(r.bottom-r.top-r.height)<1e-6;
  const contains = (outer,inner,x=true,y=true) => (!x||(inner.left>=outer.left-1e-6&&inner.right<=outer.right+1e-6))&&
    (!y||(inner.top>=outer.top-1e-6&&inner.bottom<=outer.bottom+1e-6));
  const clear = (a,b) => a.right+7<=b.left || b.right+7<=a.left || a.bottom+7<=b.top || b.bottom+7<=a.top;
  const {toast,canvas,viewport,objective,controls,clips}=sample;
  if (![toast,canvas,viewport,objective].every(valid) || !Array.isArray(controls) || !Array.isArray(clips)) return false;
  if (!contains(viewport,toast) || !contains(canvas,toast) || !clear(toast,objective)) return false;
  if (!controls.every(control=>valid(control)&&clear(toast,control))) return false;
  return clips.every(clip=>valid(clip)&&typeof clip.x==='boolean'&&typeof clip.y==='boolean'&&contains(clip,toast,clip.x,clip.y));
}
