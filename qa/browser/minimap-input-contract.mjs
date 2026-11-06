// QA-only native-input oracle. Never adjusts input or reads application state.
import assert from 'node:assert/strict';

export function minimapActivationTarget({requested,rect,events,mapWidth}){
  assert.ok(Number.isFinite(mapWidth)&&mapWidth>0,'map width must be finite and positive');
  for(const value of [requested?.x,requested?.y,rect?.left,rect?.width])
    assert.ok(Number.isFinite(value),'requested point and minimap geometry must be finite');
  assert.ok(rect.width>0,'minimap width must be positive');
  assert.ok(requested.x>=rect.left&&requested.x<=rect.left+rect.width,'requested x belongs to the minimap');
  assert.deepEqual(events.map(({type,target,trusted})=>({type,target,trusted})),[
    {type:'pointerdown',target:'minimap',trusted:true},
    {type:'pointerup',target:'minimap',trusted:true},
    {type:'click',target:'minimap',trusted:true},
  ],'one native press/release/click must target the minimap');
  for(const event of events){
    assert.ok(Number.isFinite(event.clientX)&&Number.isFinite(event.clientY),'native event coordinates must be finite');
    const distance=Math.hypot(event.clientX-requested.x,event.clientY-requested.y);
    // Pointer events retain subpixel input (allow only floating-point noise).
    // Chromium's native compatibility click may quantize to a CSS pixel.
    // Do not assume a rounding algorithm or change the requested tap.
    const maximum=event.type==='click'?1:.01;
    assert.ok(distance<=maximum,`${event.type} differs from requested input by ${distance} CSS px (maximum ${maximum})`);
  }
  const activation=events[2];
  return (activation.clientX-rect.left)/rect.width*mapWidth;
}
