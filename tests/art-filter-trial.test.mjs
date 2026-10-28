import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATEGORIES, categoryIncludes, categoryCounts, exactTypeOptions,setFilterOptions,categoriesForWorks} from '../art-category-filters.mjs';
const h=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
const allWorks=JSON.parse(h.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const works=allWorks.filter(w=>w.unit===10);
test('six browsing categories cover all 27 works without changing their exact type',()=>{
 assert.equal(categoriesForWorks(works).length,6);
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
 assert.equal(counts.reduce((n,c)=>n+c.count,0),28);
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
