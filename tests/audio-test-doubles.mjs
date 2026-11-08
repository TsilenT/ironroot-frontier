import assert from 'node:assert/strict';
class Param {
  constructor(value=0){this.value=value;this.events=[];}
  _event(type,value,time){assert.ok(Number.isFinite(value));assert.ok(Number.isFinite(time));this.events.push([type,value,time]);this.value=value;}
  setValueAtTime(value,time){this._event('set',value,time);}
  linearRampToValueAtTime(value,time){this._event('linear',value,time);}
  exponentialRampToValueAtTime(value,time){assert.ok(value>0);this._event('exponential',value,time);}
  cancelScheduledValues(time){assert.ok(Number.isFinite(time));}
}
class Node {
  constructor(context){this.context=context;this.gain=new Param(1);this.frequency=new Param(440);this.Q=new Param(1);this.pan=new Param(0);this.delayTime=new Param(0);this.connections=[];}
  connect(node){this.connections.push(node);return node;}
  disconnect(){this.connections=[];}
  start(at){assert.ok(Number.isFinite(at));this.started=at;}
  stop(at){assert.ok(Number.isFinite(at));this.stopped=at;}
}
class Context {
  constructor(state='suspended'){this.state=state;this.currentTime=0;this.sampleRate=24000;this.nodes=[];this.destination=new Node(this);}
  node(){const node=new Node(this);this.nodes.push(node);return node;}
  createGain(){return this.node();}
  createOscillator(){return this.node();}
  createStereoPanner(){return this.node();}
  createBiquadFilter(){return this.node();}
  createBufferSource(){return this.node();}
  createDelay(){return this.node();}
  createDynamicsCompressor(){const node=this.node();for(const p of ['threshold','knee','ratio','attack','release'])node[p]=new Param();return node;}
  createBuffer(channels,length){const data=Array.from({length:channels},()=>new Float32Array(length));return {getChannelData:i=>data[i]};}
  async resume(){this.state='running';}
  async close(){this.state='closed';}
  advance(seconds){this.currentTime+=seconds;for(const node of this.nodes)if(node.stopped<=this.currentTime&&!node.ended){node.ended=true;node.onended?.();}}
}

export { Param, Node, Context };
