/** Policy-only epoch2: the registered epoch1 factory is reused unchanged. */
import {DESIGN as ORIGINAL,createPrototype,evaluatePrototype,metadataFor,savePrototype as saveOriginal,restorePrototype as restoreOriginal} from '../give-ground/scenario.mjs';
import {deepFreeze} from '../../dist/rulesets.js';
export {createPrototype,evaluatePrototype,metadataFor};
export const DESIGN=deepFreeze({...ORIGINAL,epoch:2,status:'outcome-informed-proposal-unopened',baselineCommit:'60588dd0c5cea3f21785ae80777de4128f13feb3',baselineTree:'7ec5d6a1f10ef802121f65db6c1c3aa02c9948a2',numericStatus:'Exactly the known epoch1 opening; only the common paid policy prefix changes.'});
export function savePrototype(game){return {...saveOriginal(game),format:'give-ground-private-qa-v2',epoch:2};}
export function restorePrototype(packet){
 const keys=['format','designId','epoch','metadata','engine'];
 if(!packet||Object.getPrototypeOf(packet)!==Object.prototype||Object.keys(packet).length!==keys.length||keys.some(k=>!Object.hasOwn(packet,k))||packet.format!=='give-ground-private-qa-v2'||packet.designId!==DESIGN.id||packet.epoch!==2)throw Error('Invalid epoch2 private identity');
 return restoreOriginal({...structuredClone(packet),format:'give-ground-private-qa-v1',epoch:1});
}
