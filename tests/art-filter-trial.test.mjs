import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATEGORIES, categoryIncludes, categoryCounts, exactTypeOptions,setFilterOptions,categoriesForWorks,broadPeriodOptions} from '../art-category-filters.mjs';
const h=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
const allWorks=JSON.parse(h.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const works=allWorks.filter(w=>w.unit===10);
test('seven browsing categories cover all 27 works without changing their exact type',()=>{
 assert.equal(categoriesForWorks(works).length,7);
 for(const w of works)assert.ok(CATEGORIES.some(c=>categoryIncludes(w,c.id)),w.titleEn);
 assert.equal(works.length,27);
 assert.equal(categoryIncludes(works[0],'missing'),false);
 const book=works.find(w=>w.apNumber===229);
 assert.equal(categoryIncludes(book,'books'),true);
 assert.equal(categoryIncludes(book,'installation'),true);
 assert.equal(categoryIncludes(book,''),true);
});
test('counts reflect the supplied search context and allow overlapping categories',()=>{
 const counts=categoryCounts(works);
 assert.equal(counts.find(c=>c.id==='books').count,1);
 assert.equal(counts.find(c=>c.id==='installation').count,9);
 assert.equal(counts.reduce((n,c)=>n+c.count,0),29);
 const one=categoryCounts(works.filter(w=>w.apNumber===250));
 assert.equal(one.find(c=>c.id==='installation').count,1);
 assert.equal(one.find(c=>c.id==='painting').count,0);
});
test('exact types stay intact, are restricted to the chosen category and retain zero-count choices',()=>{
 const painting=works.filter(w=>categoryIncludes(w,'painting'));
 const options=exactTypeOptions(works,'painting',painting.filter(w=>w.apNumber===226));
 assert.equal(options.length,7);
 assert.equal(options.find(o=>o.value==='Triptych painting').count,1);
 assert.equal(options.find(o=>o.value==='Large figurative drawing').count,0);
 assert.ok(!options.some(o=>o.value==='Porcelain figurative sculpture'));
 assert.deepEqual(exactTypeOptions(works,'missing',works),[]);
});

function selectFixture(){
 return {dataset:{},options:[],ownerDocument:{createElement:()=>({value:'',textContent:''})},
  replaceChildren(...options){this.options=options;},value:''};
}
const countedOptions=(category)=>[
 {value:'',label:'全部具体类型 · '+works.filter(w=>categoryIncludes(w,category)).length},
 ...exactTypeOptions(works,category).map(o=>({value:o.value,label:o.value+' · '+o.count}))
];
const nativeOptions=()=>[{value:'',textContent:'全部类型'},...works.map(w=>({value:w.workType,textContent:w.workType}))];
test('opening an unlocated work cannot replace a category-restricted counted select',()=>{
 const select=selectFixture(),expected=countedOptions('sculpture');
 setFilterOptions(select,expected,'');
 // Native selectComparison -> renderDependentFilterOptions rebuilds the DOM.
 select.replaceChildren(...nativeOptions());
 setFilterOptions(select,expected,'');
 assert.deepEqual(select.options.map(o=>[o.value,o.textContent]),expected.map(o=>[o.value,o.label]));
 assert.equal(select.options.length,6);
});
test('clear after choosing only an exact type restores all counted options',()=>{
 const select=selectFixture(),expected=countedOptions('');
 setFilterOptions(select,expected,'Triptych painting');
 // Native selectUnit clears the exact type and restores its original options.
 select.replaceChildren(...nativeOptions());
 setFilterOptions(select,expected,'');
 assert.equal(select.value,'');
 assert.deepEqual(select.options.map(o=>o.textContent),expected.map(o=>o.label));
});


test('all 250 works have explicit browsing membership and each unit exposes only relevant categories',()=>{
 assert.equal(CATEGORIES.length,8);
 for(const w of allWorks)assert.ok(CATEGORIES.some(c=>categoryIncludes(w,c.id)),`AP ${w.apNumber} ${w.titleEn}`);
 for(let unit=1;unit<=10;unit++){
  const scope=allWorks.filter(w=>w.unit===unit);
  const categories=categoriesForWorks(scope);
  assert.ok(categories.length>=3,`Unit ${unit}`);
  for(const c of categories)assert.ok(scope.some(w=>categoryIncludes(w,c.id)));
 }
 assert.equal(new Set(CATEGORIES.flatMap(c=>c.aps)).size,250);
 assert.equal(categoriesForWorks(allWorks).length,8);
});
test('historical ensembles, manuscripts and ceremonial textiles support deliberate cross-category browsing',()=>{
 const byAp=ap=>allWorks.find(w=>w.apNumber===ap);
 for(const [ap,ids] of [[17,['architecture','sculpture']],[50,['books','painting']],[58,['architecture','objects']],[59,['textiles','painting']],[157,['architecture','sculpture']],[175,['sculpture','objects','textiles']],[194,['painting','textiles']],[223,['photography','textiles']]]){
  for(const id of ids)assert.ok(categoryIncludes(byAp(ap),id),`AP ${ap}: ${id}`);
 }
 assert.equal(categoryIncludes(byAp(191),'textiles'),true);
 assert.equal(categoryIncludes(byAp(188),'objects'),true);
 assert.equal(categoryIncludes(byAp(110),'photography'),true);
 assert.equal(categoryIncludes(byAp(151),'installation'),true);
 assert.equal(categoryIncludes(byAp(245),'textiles'),false,'metal hanging retains approved sculptural category');
});
test('unit-specific exact types and counts never include works from another unit',()=>{
 for(let unit=1;unit<=10;unit++){
  const scope=allWorks.filter(w=>w.unit===unit);
  for(const c of categoriesForWorks(scope)){
   const matching=scope.filter(w=>categoryIncludes(w,c.id));
   assert.equal(exactTypeOptions(scope,c.id).reduce((n,o)=>n+o.count,0),matching.length);
   assert.deepEqual(exactTypeOptions(scope,c.id,[]).map(o=>o.count),exactTypeOptions(scope,c.id).map(()=>0));
  }
 }
});


test('AP232 story quilt remains discoverable through painting and textiles in Unit10 and All Units',()=>{
 const quilt=allWorks.find(w=>w.apNumber===232);
 assert.equal(quilt.workType,'Painted story quilt');
 assert.equal(categoryIncludes(quilt,'painting'),true);
 assert.equal(categoryIncludes(quilt,'textiles'),true);
 assert.equal(categoryCounts(works).find(c=>c.id==='textiles').count,1);
 assert.equal(categoryCounts(allWorks).find(c=>c.id==='textiles').count,13);
 assert.deepEqual(exactTypeOptions(works,'textiles'),[{value:'Painted story quilt',count:1}]);
 const searchResult=allWorks.filter(w=>w.titleEn.includes('Dancing at the Louvre'));
 assert.equal(categoryCounts(searchResult).find(c=>c.id==='textiles').count,1);
});


test('broad periods cover every authored work once with at most six options per Unit',()=>{
 for(let unit=1;unit<=10;unit++){
  const works=allWorks.filter(w=>w.unit===unit),options=broadPeriodOptions(works,unit);
  assert.ok(options.length>=1&&options.length<=6,`Unit ${unit}`);
  assert.equal(options.reduce((sum,o)=>sum+o.count,0),works.length);
  for(const work of works)assert.equal(options.filter(o=>o.aps.includes(work.apNumber)).length,1,`AP ${work.apNumber}`);
  for(const option of options){assert.ok(option.value.startsWith(`broad:${unit}:`));assert.ok(!/[\u3400-\u9fff]/u.test(option.label));}
 }
 assert.deepEqual(broadPeriodOptions(allWorks,'all'),[]);
 const u3=broadPeriodOptions(allWorks.filter(w=>w.unit===3),3);
 assert.equal(u3.length,5);
 assert.ok(u3.find(o=>o.label==='Medieval Europe').aps.includes(60));
 assert.equal(allWorks.find(w=>w.apNumber===60).period,'High Gothic');
});


test('U1 separates stone-age study families while retaining regional and authored periods',()=>{
 const options=broadPeriodOptions(allWorks.filter(w=>w.unit===1),1);
 assert.deepEqual(options.map(o=>[o.label,o.count]),[['Palaeolithic',3],['Neolithic',5],['Regional Prehistoric Traditions',3]]);
 assert.ok(options[0].aps.includes(2));assert.ok(options[1].aps.includes(8));
 assert.ok(options[2].aps.includes(10));
 assert.equal(allWorks.find(w=>w.apNumber===10).period,'Tlatilco');
 assert.ok(broadPeriodOptions(allWorks.filter(w=>w.unit===6),6).length>1);
 assert.ok(broadPeriodOptions(allWorks.filter(w=>w.unit===9),9).length>1);
});
