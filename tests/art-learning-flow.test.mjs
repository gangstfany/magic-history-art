import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
const works=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const source=html.slice(html.indexOf('    function normalize(value)'),html.indexOf('    function getCultureLabel('));
const context=vm.createContext({MAP_REGIONS:{},TRADITION_LABELS:{}});vm.runInContext(source,context);
const search=q=>context.filterWorks(works,{unit:'all',search:q});
test('bare AP numbers match identity rather than substrings in dates',()=>{
 assert.deepEqual(Array.from(search('135'),w=>w.apNumber),[135]);
 assert.deepEqual(Array.from(search('60'),w=>w.apNumber),[60]);
});
test('common Chinese artist aliases locate the same canonical works as English',()=>{
 for(const [zh,en]of [['米开朗基罗','Michelangelo'],['毕加索','Picasso'],['梵高','Van Gogh']]){
  assert.ok(search(zh).length,zh);assert.deepEqual(Array.from(search(zh),w=>w.id),Array.from(search(en),w=>w.id));
 }
});

import {orderedWorks,globalSearchFilters,adjacentWorkIds} from '../art-learning-flow.mjs';
test('study order preserves source data and handles list boundaries',()=>{
 const source=[{id:'b',apNumber:20},{id:'a',apNumber:10}];
 const ordered=orderedWorks(source);
 assert.equal(source[0].id,'b');
 assert.deepEqual(adjacentWorkIds(ordered,'a'),{previous:null,next:'b',position:1,total:2});
 assert.deepEqual(adjacentWorkIds(ordered,'b'),{previous:'a',next:null,position:2,total:2});
});
test('global recovery keeps the query while removing every scope restriction',()=>{
 const state={unit:'1',culture:'europe',period:'old',periodGroupAps:[1],workType:'painting',studyCategory:'paint',studyCategoryAps:[1],favoritesOnly:true,favoriteIds:['x'],search:'Chartres'};
 const global=globalSearchFilters(state);
 assert.equal(global.search,'Chartres');assert.equal(global.unit,'all');
 assert.equal(global.favoritesOnly,false);assert.equal(global.periodGroupAps,null);
 assert.equal(global.studyCategoryAps,null);assert.equal(global.workType,'');
 assert.equal(state.unit,'1');
});

test('artwork information starts expanded and preserves a deliberate collapse',async()=>{
 const {metadataIsOpen}=await import('../art-learning-flow.mjs');
 assert.equal(metadataIsOpen(new Map(),'work-a'),true);
 assert.equal(metadataIsOpen(new Map([['work-a',false]]),'work-a'),false);
 assert.equal(metadataIsOpen(new Map([['work-a',false]]),'work-b'),true);
});

test('resume accepts only a known artwork ID and ignores broken local records',async()=>{
 const {recentArtwork}=await import('../art-learning-flow.mjs');
 const works=[{id:'known',unit:3}];
 assert.equal(recentArtwork('{"id":"known"}',works),works[0]);
 assert.equal(recentArtwork('{"id":"missing"}',works),null);
 assert.equal(recentArtwork('not json',works),null);
 assert.equal(recentArtwork(null,works),null);
});
