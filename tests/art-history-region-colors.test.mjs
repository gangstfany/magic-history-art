import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../art-history-map.html',import.meta.url),'utf8');
const baseline=JSON.parse(await readFile(new URL('./fixtures/legacy-region-palette.json',import.meta.url),'utf8'));
const works=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
function runtime(){
  const source=html.match(/\/\/ BEGIN REGION COLOR SCOPE([\s\S]*?)\/\/ END REGION COLOR SCOPE/)?.[1];
  assert.ok(source,'production region color scope exists');
  return Function(source+';return {REGION_COLOR_PALETTE,REGION_COLOR_GROUPS,REGION_COLOR_OPACITY,getRegionColorScope};')();
}
const expected={1:['africa','americas','asia','europe','mideast','oceania'],2:['africa','europe','mideast'],3:['americas','europe','mideast'],4:['americas','asia','europe','oceania'],5:['americas'],6:['africa'],7:['africa','asia','mideast'],8:['asia'],9:['oceania'],10:['africa','americas','asia','europe','oceania']};
test('palette and opacity reuse World baseline and light constants',()=>{
  const r=runtime();
  assert.equal(r.REGION_COLOR_OPACITY.active,baseline.active);
  assert.equal(r.REGION_COLOR_OPACITY.muted,baseline.muted);
  for(const [region,color]of Object.entries(r.REGION_COLOR_PALETTE)){
    if(region!=='oceania')assert.ok(baseline.colors.includes(color),`${region} World hue`);
  }
});
for(let unit=1;unit<=10;unit++)test(`U${unit} highlight scope and Unit-bubble scope`,()=>{
  const r=runtime(),filtered=works.filter(w=>w.unit===unit);
  assert.deepEqual(r.getRegionColorScope(filtered,{unit:String(unit)}).active.sort(),expected[unit]);
  assert.deepEqual(r.getRegionColorScope(works,{unit:'all',activeUnit:unit}).active.sort(),expected[unit]);
});
test('all current region labels have explicit mappings; unknown labels are reported, not guessed',()=>{
  const r=runtime();
  assert.equal(works.length,250);
  for(const w of works)assert.ok(Object.hasOwn(r.REGION_COLOR_GROUPS,w.region),w.region);
  assert.deepEqual(r.getRegionColorScope(works,{}).unknown,[]);
  assert.deepEqual(r.getRegionColorScope([{region:'new-region',unit:1}],{}),{active:[],unknown:['new-region']});
  assert.deepEqual(r.getRegionColorScope([{region:'toString',unit:1}],{}),{active:[],unknown:['toString']});
});
test('cross-region labels, empty results and unverified locations do not invent geography',()=>{
  const r=runtime();
  assert.deepEqual(r.getRegionColorScope([{region:'transatlantic'}],{}).active.sort(),['americas','europe']);
  assert.deepEqual(r.getRegionColorScope([{region:'easternMediterranean'}],{}).active.sort(),['europe','mideast']);
  assert.deepEqual(r.getRegionColorScope([],{}),{active:[],unknown:[]});
  for(const ap of [230,241])assert.deepEqual(r.getRegionColorScope(works.filter(w=>w.apNumber===ap),{}).active,[]);
  assert.equal(r.getRegionColorScope(works,{}).active.length,6);
});
