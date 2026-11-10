import assert from 'node:assert/strict';
import {engineBeforeFinalChapter} from './final-chapter-engine-source.mjs';

// The historical literal hash must still cover every old engine byte. Remove
// only these exact, ruleset-gated reserve additions, never arbitrary matching lines.
export function engineBeforeReserve() {
  let source = engineBeforeFinalChapter();
  const remove = (addition, count = 1) => {
    assert.equal(source.split(addition).length - 1, count, 'Exact reserve addition: ' + addition);
    source = source.split(addition).join('');
  };
  remove("import {supportsMinorReserve,createMinorReserve,advanceMinorReserve,validateMinorReserve,minorReserveEnded,minorReserveUnbound} from './minor-reserve.js';\n");
  remove("    if(supportsMinorReserve(ruleset)&&(map.id!=='classic'||map.revision!==1))throw Error('Wake the Reserve requires Classic.');\n");
  remove("    if(supportsMinorReserve(ruleset))this.state.minorReserve=createMinorReserve();\n");
  remove("    if(minorReserveEnded(this))return {ok:false,reason:'The battle has ended.'};\n");
  remove("if(minorReserveEnded(this))return {ok:false,reason:'The battle has ended.'};", 5);
  remove("if(minorReserveEnded(this)||minorReserveUnbound(this))return;");
  remove("||minorReserveEnded(this)", 2);
  remove("||minorReserveUnbound(this)");
  remove("    advanceMinorReserve(this);\n");
  remove("  if(supportsMinorReserve(ruleset))validateMinorReserve(s.minorReserve,{map,tick:data.tick,nextId:data.nextId,state:s},fail);\n");
  remove("  else if(Object.hasOwn(s,'minorReserve'))fail('reserve state is outside this ruleset');\n");
  remove(",...(supportsMinorReserve(ruleset)?['minorReserve']:[])");
  return source;
}
