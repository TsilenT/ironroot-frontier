import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {Game,BUILDINGS,SPELL,UNITS,upgradeCost} from '../dist/engine.js';
import {ALL_CAMPAIGN_MISSIONS as CAMPAIGN_MISSIONS,ALL_CAMPAIGN_CHAPTERS as CAMPAIGN_CHAPTERS,createCampaignMission,evaluateCampaignMission,isMissionUnlocked} from '../dist/campaign.js';
import {createProtectedObjectiveMonitor,protectedLossDetails} from '../dist/protected-objectives.js';
import {createObjectiveAlertPolicy} from '../dist/objective-alerts.js';
import {createViewportPause,inspectMobileGeometry,visibleViewportRect,fitMobileViewport,insetViewportRect} from '../dist/mobile-battlefield.js';
import {campaignBuildChoices,campaignCoach,guidancePointVisible} from '../dist/campaign-flow.js';
import {createInputScopeGuard} from '../dist/input-scope.js';
import {CHALLENGES,createChallenge,evaluateChallenge} from '../dist/challenges.js';
import {campaignFixture} from '../qa/browser/campaign-fixtures.mjs';
import {layout,box} from './mobile-layout-fixture.mjs';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
// This is a narrow DOM/geometry fixture, not native browser layout evidence.
// It parses the actual HTML ancestry, makes hidden descendants unmeasurable,
// and executes the real startup, HUD, protected-control and pause functions.
export function startupHarness({width=320,height=480,source=app,insets={}}={}) {
 const section=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
 const nodes=new Map(),log={measures:[],saves:0,claims:0,resizes:0,interruptions:0};let document;
 const geometryFor=()=>{const style=nodes.get('app')?.style||{};return layout(width,height,{...insets,protect:!nodes.get('app')?.classList.contains('mobile-ordinary'),root:box(parseFloat(style.left)||0,parseFloat(style.top)||0,style.width?parseFloat(style.width):width,style.height?parseFloat(style.height):height)});};
 class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.id='';this.children=[];this.parentNode=null;this.classes=new Set();this.attributes={};this.style={};this.dataset={};this.disabled=false;this.text='';this.inert=false;this.scrollWidth=0;this.clientWidth=0;this.classList={contains:n=>this.classes.has(n),add:n=>this.classes.add(n),remove:n=>this.classes.delete(n),toggle:(n,on)=>on?this.classes.add(n):this.classes.delete(n)};}
  set className(v){this.classes=new Set(v.split(/\s+/));}get className(){return [...this.classes].join(' ');}
  set textContent(v){for(const child of this.children)child.parentNode=null;this.children=[];this.text=v;}get textContent(){return this.text+this.children.map(c=>c.textContent).join('');}
  set innerHTML(v){this.textContent=v;}get innerHTML(){return this.text;}
  setAttribute(n,v){this.attributes[n]=String(v);}
  append(...children){for(const child of children){if(child.parentNode)child.parentNode.children=child.parentNode.children.filter(c=>c!==child);child.parentNode=this;this.children.push(child);}}
  insertBefore(child,next){if(child.parentNode)child.parentNode.children=child.parentNode.children.filter(c=>c!==child);child.parentNode=this;const at=this.children.indexOf(next);this.children.splice(at<0?this.children.length:at,0,child);}
  get nextSibling(){const list=this.parentNode?.children||[];return list[list.indexOf(this)+1]||null;}
  get isConnected(){for(let e=this;e;e=e.parentNode)if(e===document.body)return true;return false;}
  contains(e){return this===e||this.children.some(c=>c.contains(e));}
  closest(selector){for(let e=this;e;e=e.parentNode){if(selector.includes('.hidden')&&e.classes.has('hidden'))return e;if(selector.includes('[inert]')&&e.inert)return e;if(selector==='[data-protected-id]'&&e.dataset.protectedId)return e;}return null;}
  getBoundingClientRect(){if(this.closest('.hidden'))return box(0,0,0,0);if(this.dataset.protectedId)return geometryFor().nodes['target'+this.parentNode.children.indexOf(this)];return geometryFor().nodes[this.id]||box(0,0,0,0);}
  getClientRects(){const r=this.getBoundingClientRect();return r.width&&r.height?[r]:[];}
  focus(){document.activeElement=this;}
  addEventListener(){}
 }
 const rootNode=new Element('root'),stack=[rootNode],voids=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
 for(const match of html.replace(/<!--[\s\S]*?-->/g,'').matchAll(/<\/?([a-z][\w-]*)\b([^>]*)>/gi)){
  const tag=match[1].toLowerCase();if(match[0].startsWith('</')){for(let i=stack.length-1;i>0;i--)if(stack[i].tagName.toLowerCase()===tag){stack.length=i;break;}continue;}
  const e=new Element(tag);e.id=match[2].match(/\bid="([^"]*)"/)?.[1]||'';e.className=match[2].match(/\bclass="([^"]*)"/)?.[1]||'';stack.at(-1).append(e);if(e.id)nodes.set(e.id,e);if(tag==='body')nodes.set('__body',e);if(!voids.has(tag)&&!match[0].endsWith('/>'))stack.push(e);
 }
 const $=id=>{assert.ok(nodes.has(id),'real HTML contains '+id);return nodes.get(id);};
 document={body:nodes.get('__body'),activeElement:null,createElement:tag=>new Element(tag),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
 const fixture=campaignFixture('protected');
 const c={$,document,window:{innerWidth:width,innerHeight:height,addEventListener(){},matchMedia:q=>({matches:q.includes('orientation: landscape')?width>height&&height<=500:width<=height&&width<=700})},
  campaignBuildChoices,campaignCoach,guidancePointVisible,expandedBuilds:false,resumedBattle:false,coachEnabled:true,
  battleSafetyReason:null,resumeProblem:null,selectedRuleset:'frontier-rootwarden-open',
  Game,BUILDINGS,SPELL,UNITS,upgradeCost,CAMPAIGN_MISSIONS,CAMPAIGN_CHAPTERS,CHALLENGES,createChallenge,evaluateChallenge,createCampaignMission,evaluateCampaignMission,isMissionUnlocked,createProtectedObjectiveMonitor,protectedLossDetails,createObjectiveAlertPolicy,
  createViewportPause,visibleViewportRect,fitMobileViewport,insetViewportRect,inspectMobileGeometry:g=>{log.measures.push(g.controls.map(r=>({...r})));return inspectMobileGeometry(g);},
  viewportPause:createViewportPause(),mobileLayout:'ordinary',protectedMonitor:null,protectedAlerts:null,protectedControls:new Map(),armedProtectedControl:null,
  game:new Game(),started:false,paused:false,mode:'campaign',selectedCampaign:'winter-stores',selectedChallenge:null,selectedMap:'classic',selectedChapter:null,difficulty:'easy',currentCampaign:null,currentChallenge:null,
  campaignProgress:fixture.progress,objectiveOutcome:null,recoveryHold:null,profileGate:null,speed:1,resultShown:false,follow:false,
  ui:{build:null,spell:false,selected:null,pointer:null},padHud:false,padPoint:null,heardEffects:null,heardProjectiles:null,
  inputScope:createInputScopeGuard('welcome'),controller:{reset(){}},resetBattleGesture(){log.interruptions++;},closeSelectionArmed:false,
  renderer:{width:width,height:height,camera:450,resize(){log.resizes++;},setMap(){},setTheme(){},clampCamera(){},vfx:{reset(){}}},
  populateFieldGuide(){},populateBuildCards(){},renderMapSelection(){},syncProfileSafety(){},showRecoverySettings(){throw Error('unexpected recovery');},beginBattleReport(){},
  battleSession:{claim(){log.claims++;},status:()=> 'current'},save(){log.saves++;return true;},initAudio(){},sound(){},toast(){},positionToast(){},
  getComputedStyle:()=>({visibility:'visible',overflowX:'visible',overflowY:'visible',...Object.fromEntries(['Top','Right','Bottom','Left'].map(side=>['padding'+side,`${insets[side.toLowerCase()]||0}px`]))}),
  iconSVG:()=>'',timeText:t=>String(t),setTimeout,requestAnimationFrame(){},pauseControl(){},
 };
 c.dialogLayers=['viewportModal','welcome','helpModal','settingsModal','resultModal','backupModal'].map($);
 c.syncDialogs=()=>c.syncInputScope();
 createContext(c);
 for(const code of [section('function controlIsVisible(','function dialogControls('),section('function canInteract()','function selectBuild('),section('function cancel()','let closeSelectionArmed ='),section('function pause(value,',"$('pause').onclick ="),section('function holdBattleSafety(','function beginBattleReport('),section('function updateHUD()','let heardEffects ='),section('function syncInputScope()','function guardInput('),section('function viewportScope()','// Portable backups')])runInContext(code,c);
 return {c,$,log,fixture,source,geometry:geometryFor,resize(w,h){width=w;height=h;c.window.innerWidth=w;c.window.innerHeight=h;c.syncProtectedLayout();c.updateHUD();c.syncViewportSafety();},start(restored=false){const g=restored?Game.restore(fixture.envelope.game):null;c.start(g,null,restored?'winter-stores':null);return g;}};
}
