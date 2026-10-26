import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateArtworks, validateImageCredits} from '../scripts/validate-art-history-data.mjs';
const json=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const manifest=json('data/ap-art-history-unit-9-manifest.json');
test('U9 freezes 11 AP213–223 identities and 15 ordered specified views',()=>{
 assert.deepEqual(Object.keys(manifest).map(Number),Array.from({length:11},(_,i)=>213+i));
 assert.equal(Object.values(manifest).flatMap(w=>w.requiredViewIds).length,15);
 for(const w of Object.values(manifest))assert.deepEqual(Object.keys(w),['id','titleEn','region','siteName','provenanceQualifier','traditionGroup','requiredViewIds']);
});
test('U9 contains complete bilingual content with exact provenance and loaded comparisons',()=>{
 const path=new URL('../data/ap-art-history-unit-9-content.json',import.meta.url);
 assert.ok(existsSync(path),'reviewed U9 content required');
 const works=JSON.parse(readFileSync(path,'utf8'));
 const html=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
 const legacy=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 const ids=new Set([...legacy,...works].filter(w=>w.apNumber<=223).map(w=>w.id));
 assert.deepEqual(works.map(w=>w.apNumber),Array.from({length:11},(_,i)=>213+i));
 for(const w of works){
  assert.equal(w.unit,9);assert.equal('images' in w,false);
  for(const f of ['id','titleEn','region','siteName','traditionGroup'])assert.equal(w[f],manifest[w.apNumber][f]);
  assert.equal(w.provenanceQualifier??null,manifest[w.apNumber].provenanceQualifier);
  for(const f of ['titleZh','culture','date','period','artistCulture','medium','workType','function','form','content','context'])assert.ok(typeof w[f]==='string'&&w[f].trim(),`${w.id}.${f}`);
  for(const f of ['titleZh','function','form','content','context'])assert.match(w[f],/[\u3400-\u9fff]/);
  assert.ok(w.coordinates.x>=0&&w.coordinates.x<=1600&&w.coordinates.y>=0&&w.coordinates.y<=800);
  assert.ok(w.recognitionAnchors.length>=2&&w.recognitionAnchors.length<=4);
  assert.ok(w.keywords.length>=3&&w.comparisonIds.length>=1);
  for(const id of w.comparisonIds){assert.ok(ids.has(id)&&id!==w.id,id);assert.ok(w.comparisonNotes[id]?.trim());}
 }
});
test('U9 has 11 complete ordered independent English study sections',()=>{
 const path=new URL('../docs/content/ap-art-history-unit-9-english.md',import.meta.url);
 assert.ok(existsSync(path),'complete U9 English edition required');
 const md=readFileSync(path,'utf8');
 assert.deepEqual([...md.matchAll(/^## AP #(\d+)/gm)].map(m=>+m[1]),Array.from({length:11},(_,i)=>213+i));
 for(const s of md.split(/^## AP #/m).slice(1))for(const h of ['Identification','Function','Form','Content','Context','Recognition Anchors','Comparisons','Required Views and Sources'])assert.ok(s.includes('### '+h),h);
});
test('U9 stages each of the 15 specified media views with ordered credits',()=>{
 const path=new URL('../data/ap-art-history-unit-9-media.json',import.meta.url);
 assert.ok(existsSync(path),'reviewed U9 media required');
 const m=JSON.parse(readFileSync(path,'utf8'));
 assert.deepEqual(Object.keys(m.images),Object.values(manifest).map(w=>w.id));
 assert.deepEqual(Object.keys(m.credits),Object.values(manifest).map(w=>w.id));
 for(const row of Object.values(manifest)){
  assert.deepEqual(m.images[row.id].map(v=>v.id),row.requiredViewIds);
  const c=Array.isArray(m.credits[row.id])?m.credits[row.id]:[m.credits[row.id]];
  assert.equal(c.length,row.requiredViewIds.length);
  for(const [i,v]of m.images[row.id].entries()){
   assert.match(v.imageSourceUrl,/^https:\/\//);
   if(v.imageUrl===null)assert.ok(v.mediaStatus?.trim());else assert.match(v.imageUrl,/^assets\/art-history\/u9\/ap\d{3}-[a-z0-9-]+\.webp$/);
   for(const f of ['creatorOrInstitution','licenseName','licenseUrl'])assert.ok(typeof c[i][f]==='string'&&c[i][f].trim());
  }
 }
});
test('U9 native validator accepts the reviewed staged 250-work assembly and enforces exact views',()=>{
 const h=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
 const block=id=>JSON.parse(h.match(new RegExp(`<script id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`))[1]);
 const media=json('data/ap-art-history-unit-9-media.json');
 const staged=json('data/ap-art-history-unit-9-content.json').map(w=>({...w,images:media.images[w.id]}));
 const works=[...block('artwork-data').filter(w=>w.apNumber<=212),...staged];
 const credits={...Object.fromEntries(Object.entries(block('image-credit-data')).filter(([id])=>works.some(w=>w.apNumber<=212&&w.id===id))),...media.credits};
 const manifests=Object.fromEntries(Array.from({length:9},(_,i)=>[i+1,json(`data/ap-art-history-unit-${i+1}-manifest.json`)]));
 const rights=Object.fromEntries([3,4,5,6,7,8,9].map(n=>[n,json(`data/ap-art-history-unit-${n}-rights.json`)]));
 const authority=Object.fromEntries([4,5,6,7,8,9].map(n=>[n,json(`data/ap-art-history-unit-${n}${n===4?'-public-placeholders':'-placeholder-authority'}.json`)]));
 assert.doesNotThrow(()=>validateArtworks(works,manifests,authority));
 assert.doesNotThrow(()=>validateImageCredits(credits,works,rights,authority));
 const wrong=structuredClone(works);wrong.find(w=>w.unit===9).images.pop();
 assert.throws(()=>validateArtworks(wrong,manifests,authority),/view ids|media view/);
});
test('U9 live integration reaches 223 while preserving AP1–212 records and credits',()=>{
 const h=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
 const block=id=>JSON.parse(h.match(new RegExp(`<script id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`))[1]);
 const works=block('artwork-data'),credits=block('image-credit-data');
 const frozen=JSON.parse(readFileSync(new URL('./fixtures/u1-u8-pre-u9-hashes.json',import.meta.url),'utf8'));
 const old=works.filter(w=>w.apNumber<=212),ids=new Set(old.map(w=>w.id));
 const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
 assert.equal(hash(old),frozen.artworks);
 assert.equal(hash(Object.fromEntries(Object.entries(credits).filter(([id])=>ids.has(id)))),frozen.credits);
 assert.equal(works.length,250);
 assert.deepEqual(works.filter(w=>w.unit===9).map(w=>w.apNumber),Array.from({length:11},(_,i)=>213+i));
});
test('reviewed U9 canonical projection matches all live fields and image credits',()=>{
 const p=new URL('./fixtures/u9-canonical.json',import.meta.url);
 assert.ok(existsSync(p),'reviewed U9 canonical projection required');
 const canonical=JSON.parse(readFileSync(p,'utf8'));
 const h=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
 const block=id=>JSON.parse(h.match(new RegExp(`<script id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`))[1]);
 assert.deepEqual(block('artwork-data').filter(w=>w.unit===9),canonical.artworks);
 const credits=block('image-credit-data');
 assert.deepEqual(Object.fromEntries(canonical.artworks.map(w=>[w.id,credits[w.id]])),canonical.imageCredits);
});
