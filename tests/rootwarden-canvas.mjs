import assert from 'node:assert/strict';
const styleKeys = ['fillStyle','strokeStyle','lineWidth','lineJoin','lineCap','globalAlpha','shadowBlur','shadowColor','font','textAlign'];
export class RecordingContext {
  constructor() {
    this.commands=[]; this.stack=[]; this.matrix=[1,0,0,1,0,0]; this.points=[]; this.maxDepth=0;
    this.fillStyle='#123'; this.strokeStyle='#456'; this.lineWidth=1; this.lineJoin='miter'; this.lineCap='butt';
    this.globalAlpha=.7; this.shadowBlur=0; this.shadowColor='transparent'; this.font='10px sans-serif'; this.textAlign='start';
  }
  snapshot() { return { matrix:[...this.matrix], ...Object.fromEntries(styleKeys.map(k=>[k,this[k]])) }; }
  call(name, ...args) {
    for (const n of args.filter(n=>typeof n==='number')) assert.ok(Number.isFinite(n), `${name} nonfinite ${n}`);
    this.commands.push([name,...args]);
  }
  save() { this.call('save'); this.stack.push(this.snapshot()); this.maxDepth=Math.max(this.maxDepth,this.stack.length); }
  restore() { this.call('restore'); assert.ok(this.stack.length,'restore without save'); Object.assign(this,this.stack.pop()); }
  translate(x,y) { this.call('translate',x,y); const m=this.matrix; m[4]+=m[0]*x+m[2]*y; m[5]+=m[1]*x+m[3]*y; }
  scale(x,y) { this.call('scale',x,y); const m=this.matrix; m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y; }
  rotate(a) { this.call('rotate',a); const [a0,b,c,d,e,f]=this.matrix,s=Math.sin(a),co=Math.cos(a);this.matrix=[a0*co+c*s,b*co+d*s,c*co-a0*s,d*co-b*s,e,f]; }
  setTransform(...m) { this.call('setTransform',...m);this.matrix=[...m]; }
  point(x,y) { const [a,b,c,d,e,f]=this.matrix;const point=[a*x+c*y+e,b*x+d*y+f];assert.ok(point.every(Number.isFinite),'nonfinite transformed point');this.points.push(point); }
  beginPath() { this.call('beginPath'); }
  closePath() { this.call('closePath'); }
  moveTo(x,y) { this.call('moveTo',x,y);this.point(x,y); }
  lineTo(x,y) { this.call('lineTo',x,y);this.point(x,y); }
  ellipse(x,y,rx,ry,a,s,e) { this.call('ellipse',x,y,rx,ry,a,s,e);assert.ok(rx>=0&&ry>=0);for(const dx of [-rx,rx])for(const dy of [-ry,ry])this.point(x+dx,y+dy); }
  arc(x,y,r,s,e) { this.call('arc',x,y,r,s,e);assert.ok(r>=0);this.point(x-r,y-r);this.point(x+r,y+r); }
  fillRect(x,y,w,h) { this.call('fillRect',x,y,w,h,this.fillStyle);this.point(x,y);this.point(x+w,y+h); }
  strokeRect(x,y,w,h) { this.call('strokeRect',x,y,w,h,this.strokeStyle);this.point(x,y);this.point(x+w,y+h); }
  fill() { this.call('fill',this.fillStyle,this.globalAlpha); }
  stroke() { this.call('stroke',this.strokeStyle,this.lineWidth,this.globalAlpha); }
  fillText(text,x,y) { this.call('fillText',text,x,y,this.fillStyle,this.font);this.point(x,y); }
}
