import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
const works=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
test('every U1–U4 comparison has an authored, target-specific explanation rather than stock copy',()=>{
 for(const work of works.filter(w=>w.unit<=4))for(const id of work.comparisonIds){
  const note=work.comparisonNotes?.[id];
  assert.ok(note?.length>=35,`${work.id} -> ${id}: authored evidence missing`);
  assert.doesNotMatch(note,/比较其形式、材料与历史语境如何形成不同观看经验|两者分属不同类别/);
 }
});
test('fallback does not infer a historical category difference from unequal label strings',()=>{
 const start=html.indexOf('    function summarizeComparisonField('),end=html.indexOf('    function openImageDialog(',start);
 const context=vm.createContext({});vm.runInContext(html.slice(start,end),context);
 const work={culture:'A',period:'A',workType:'portable art',medium:'charcoal',form:'动物轮廓',function:'用途不确定',context:'史前群体'};
 const target={...work,culture:'B',period:'B',workType:'cave art',medium:'pigment'};
 const note=context.createComparisonAngle(work,target);
 assert.doesNotMatch(note,/分属不同类别/);assert.match(note,/观察|比较/);
});
