// Restore only the explicitly reviewed prose before existing historical hashes.
// This never strips fields or changes identifiers, numbers, layouts or rules.
import {readFileSync} from 'node:fs';
const approved=JSON.parse(readFileSync(new URL('./fixtures/campaign-copy-approved.json',import.meta.url),'utf8'));
const edits=approved.rhythmEdits;
export function beforeRhythmCopy(value) {
  if(typeof value==='string'){
    for(const edit of [...edits].reverse())if(value===edit.after)value=edit.before;
    return value;
  }
  if(Array.isArray(value))return value.map(beforeRhythmCopy);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,beforeRhythmCopy(item)]));
  return value;
}
