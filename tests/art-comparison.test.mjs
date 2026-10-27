import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getComparisonPair, getComparisonNote } from '../art-comparison.mjs';
const html=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
const works=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
test('all ten Units open every authored comparison, including cross-unit targets',()=>{
 const units=new Set();let links=0;
 for(const source of works){
  units.add(source.unit);
  for(const id of source.comparisonIds){
   const target=works.find(w=>w.id===id);
   assert.deepEqual(getComparisonPair(works,source.id,id),[source,target],source.id+' -> '+id);
   links++;
  }
  assert.equal(getComparisonPair(works,source.id,source.id),null);
  assert.equal(getComparisonPair(works,source.id,'missing'),null);
 }
 assert.equal(units.size,10);assert.ok(links>300);
 assert.equal(getComparisonPair(works,'missing',works[0].id),null);
});
test('comparison note uses exact authored target note, falls back only when missing',()=>{
 const source=works.find(w=>w.apNumber===230),target=works.find(w=>w.apNumber===250);
 assert.equal(getComparisonNote(source,target,()=> 'fallback'),source.comparisonNotes[target.id]);
 assert.equal(getComparisonNote({...source,comparisonNotes:{}},target,()=> 'fallback'),'fallback');
 assert.equal(getComparisonNote({...source,comparisonNotes:{[target.id]:'  '}},target,()=> 'fallback'),'fallback');
});

test('embedded floating dialog fits the visible host intersection after scroll and resize',async()=>{
 const {comparisonViewport}=await import('../art-comparison.mjs');
 assert.equal(typeof comparisonViewport,'function');
 const desktop=comparisonViewport({frameTop:174.5,frameHeight:1024,hostTop:0,hostHeight:720});
 assert.ok(desktop.top>=0);
 assert.ok(174.5+desktop.top+desktop.height<=708);
 const mobile=comparisonViewport({frameTop:-43,frameHeight:1024,hostTop:0,hostHeight:844});
 assert.equal(mobile.top,55);
 assert.equal(mobile.height,810);
 const scrolled=comparisonViewport({frameTop:-400,frameHeight:1024,hostTop:0,hostHeight:700});
 assert.equal(scrolled.top,412);
 assert.equal(scrolled.height,600);
 const keyboard=comparisonViewport({frameTop:-43,frameHeight:1024,hostTop:160,hostHeight:400});
 assert.equal(keyboard.top,215);assert.equal(keyboard.height,376);
 assert.equal(comparisonViewport({frameTop:900,frameHeight:1024,hostTop:0,hostHeight:844}),null);
});
