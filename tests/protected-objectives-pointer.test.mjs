import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
// A deliberately narrow source model for display and inherited pointer-events.
// The companion browser spec verifies native elementFromPoint and trusted input.
function tree(width,height){
  const root={tag:'root',classes:[],children:[]},stack=[root],ids=new Map();
  const voids=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  for(const match of html.replace(/<!--[\s\S]*?-->/g,'').matchAll(/<\/?([a-z][\w-]*)\b([^>]*)>/gi)){
    const tag=match[1].toLowerCase();
    if(match[0].startsWith('</')){for(let i=stack.length-1;i>0;i--)if(stack[i].tag===tag){stack.length=i;break;}continue;}
    const node={tag,id:match[2].match(/\bid="([^"]*)"/)?.[1],classes:(match[2].match(/\bclass="([^"]*)"/)?.[1]||'').split(/\s+/),parent:stack.at(-1),children:[]};
    node.parent.children.push(node);if(node.id)ids.set(node.id,node);
    if(!voids.has(tag)&&!match[0].endsWith('/>'))stack.push(node);
  }
  const hud=ids.get('objectiveHUD'),dock=ids.get('protectedDock'),targets=ids.get('protectedTargets');
  hud.parent.children=hud.parent.children.filter(n=>n!==hud);hud.parent=dock;dock.children.push(hud);
  for(const node of [hud,dock,targets])node.classes=node.classes.filter(name=>name!=='hidden');
  const isLandscape=width>height&&height<=500;
  if(isLandscape)ids.get('app').classes.push('protected-landscape');
  const isPortrait=width<=height&&width<=700;
  if(isLandscape||isPortrait){ids.get('app').classes.push('protected-mobile','protected-compact');ids.get('protectedNavigation').classes=[];}
  if(isLandscape&&height<360)ids.get('app').classes.push('protected-sidebar');
  if(isPortrait)ids.get('app').classes.push('protected-portrait');
  if(isPortrait||isLandscape&&height<360){const button=ids.get('compactBuild');button.parent.children=button.parent.children.filter(n=>n!==button);button.parent=ids.get('protectedNavigation');button.parent.children.push(button);}
  const targetClass=app.slice(app.indexOf('function beginProtectedObjectives()')).match(/button\.className = '([^']+)'/)[1];
  for(let i=0;i<2;i++)targets.children.push({tag:'button',id:'original'+i,classes:[targetClass],parent:targets,children:[]});
  return {ids,targets:targets.children};
}
function active(query,width,height){
  return [...query.matchAll(/\((max|min)-(width|height):\s*(\d+)px\)/g)].every(([,bound,axis,value])=>bound==='max'?({width,height}[axis]<=+value):({width,height}[axis]>=+value))&&
    (!query.includes('orientation: landscape')||width>height)&&(!query.includes('orientation: portrait')||width<=height);
}
function rules(source,width,height){
  const result=[];source=source.replace(/\/\*[\s\S]*?\*\//g,'');
  function walk(text){
    let cursor=0;
    while(cursor<text.length){
      const open=text.indexOf('{',cursor);if(open<0)break;
      let close=open+1,depth=1;for(;close<text.length&&depth;close++){if(text[close]==='{')depth++;else if(text[close]==='}')depth--;}
      const selector=text.slice(cursor,open).trim(),body=text.slice(open+1,close-1);cursor=close;
      if(selector.startsWith('@media')){if(active(selector,width,height))walk(body);continue;}
      if(selector.startsWith('@'))continue;
      for(const declaration of body.matchAll(/(?:^|;)\s*(pointer-events|display)\s*:\s*([^;]+)(?=;|$)/g))
        for(const part of selector.split(','))result.push({selector:part.trim(),property:declaration[1],value:declaration[2].trim()});
    }
  }
  walk(source);return result;
}
function compound(node,selector){
  if(!/^(?:[a-z][\w-]*|\*)?(?:[.#][\w-]+)*$/i.test(selector))return false;
  const tag=selector.match(/^[a-z][\w-]*/i)?.[0];if(tag&&node.tag!==tag)return false;
  return [...selector.matchAll(/([.#])([\w-]+)/g)].every(([,kind,value])=>kind==='#'?node.id===value:node.classes.includes(value));
}
function matches(node,selector){
  const parts=selector.split(/\s+/);if(!compound(node,parts.pop()))return false;
  for(let i=parts.length-1;i>=0;i--){node=node.parent;while(node&&!compound(node,parts[i]))node=node.parent;if(!node)return false;}
  return true;
}
function property(node,name,styles){
  const rank=selector=>(selector.match(/#/g)||[]).length*100+(selector.match(/\./g)||[]).length*10+(selector.match(/(?:^|\s)[a-z]/gi)||[]).length;
  let selected=null;
  for(const rule of styles)if(rule.property===name&&matches(node,rule.selector)&&(!selected||rank(rule.selector)>=rank(selected.selector)))selected=rule;
  if(selected)return selected.value;
  return name==='pointer-events'&&node.parent?property(node.parent,name,styles):name==='pointer-events'?'auto':'inline';
}
function hitEligible(node,styles){
  if(node.disabled)return false;
  for(let ancestor=node;ancestor;ancestor=ancestor.parent)if(ancestor.inert||property(ancestor,'display',styles)==='none')return false;
  return property(node,'pointer-events',styles)!=='none';
}

test('actual HTML ancestry and CSS inheritance expose Build Close Cancel and both originals, but not HUD labels',()=>{
  for(const [width,height] of [[568,320],[640,360],[320,480],[390,500]]){
    const {ids,targets}=tree(width,height),styles=rules(css,width,height),button=ids.get('compactBuild');
    assert.equal(button.parent.id,width>height&&height>=360?'objectiveHUD':'protectedNavigation');assert.equal(property(ids.get('objectiveHUD'),'pointer-events',styles),'none');
    for(const label of ['Build','Close','Cancel']){button.textContent=label;assert.equal(property(button,'pointer-events',styles),'auto');assert.equal(hitEligible(button,styles),true,label);}
    for(const target of targets){assert.equal(property(target,'pointer-events',styles),'auto');assert.equal(hitEligible(target,styles),true);}
    assert.equal(hitEligible(ids.get('objectiveProgress'),styles),false);
    button.disabled=true;assert.equal(hitEligible(button,styles),false);button.disabled=false;
    ids.get('app').inert=true;assert.equal(hitEligible(button,styles),false);
  }
});
test('removing the pointer override reproduces the native failure despite a visible enabled button',()=>{
  const before=css.replace(/(\.compact-build\s*\{[^}]*?)pointer-events: auto;/g,'$1');
  assert.notEqual(before,css);
  const {ids}=tree(640,360),styles=rules(before,640,360),button=ids.get('compactBuild');
  assert.equal(property(button,'display',styles),'block');
  assert.equal(property(button,'pointer-events',styles),'none');
  assert.equal(hitEligible(button,styles),false);
});
test('Build remains outside hit testing in ordinary desktop layouts',()=>{
  for(const [width,height] of [[1280,900],[900,700]]){
    const {ids}=tree(width,height),styles=rules(css,width,height);
    assert.equal(property(ids.get('compactBuild'),'display',styles),'none');
    assert.equal(hitEligible(ids.get('compactBuild'),styles),false);
  }
});
