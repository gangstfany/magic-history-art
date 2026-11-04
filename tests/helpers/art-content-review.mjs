/** Reverse only the explicitly reviewed fields so historical freezes remain useful. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const contentReview=JSON.parse(readFileSync(new URL('../fixtures/art-content-refinement-2026-11-04.json',import.meta.url),'utf8'));
const byId=new Map(contentReview.works.map(entry=>[entry.id,entry]));
export function restoreReviewedWorks(works){
 return works.map(work=>{
  const entry=byId.get(work.id);if(!entry)return work;
  const copy=structuredClone(work);
  for(const [field,change]of Object.entries(entry.changes)){
   assert.deepEqual(copy[field],change.after,`${work.id}.${field}: must match reviewed revision exactly`);
   if(change.beforePresent)copy[field]=change.before;else delete copy[field];
  }
  return copy;
 });
}
export function restoreReviewedHtml(html){
 const match=html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/);assert.ok(match);
 const data=match[1];let quoted=false,escaped=false,depth=0,start=-1;const replacements=[];
 for(let i=0;i<data.length;i++){
  const c=data[i];
  if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"'){quoted=true;continue;}
  if(c==='{'){if(depth===0)start=i;depth++;}
  else if(c==='}'&&--depth===0){
   const raw=data.slice(start,i+1),work=JSON.parse(raw),entry=byId.get(work.id);if(!entry)continue;
   assert.equal(createHash('sha256').update(raw).digest('hex'),entry.afterSha256,`${work.id}: exact reviewed bytes`);
   replacements.push([start,i+1,entry.beforeRaw]);
  }
 }
 assert.equal(replacements.length,contentReview.works.length);
 let restored=data;for(const [start,end,before]of replacements.reverse())restored=restored.slice(0,start)+before+restored.slice(end);
 assert.equal(html.split(contentReview.fallback.after).length-1,1);
 return html.replace(data,restored).replace(contentReview.fallback.after,contentReview.fallback.before);
}
