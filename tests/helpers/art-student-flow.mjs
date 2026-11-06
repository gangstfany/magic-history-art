import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export function restoreStudentFlowRuntime(html){
 const edits=JSON.parse(readFileSync(new URL('../fixtures/art-student-flow-runtime-patch.json',import.meta.url),'utf8'));
 for(const {before,after}of edits){assert.equal(html.split(after).length-1,1,'exact student flow runtime change');html=html.replace(after,before);}
 return html;
}
