import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateArtworks, validateImageCredits} from '../scripts/validate-art-history-data.mjs';
import {assertLocalMediaContract} from '../scripts/art-history-local-media-contract.mjs';
import {fileURLToPath} from 'node:url';
const json=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const manifest=json('data/ap-art-history-unit-10-manifest.json');
const html=()=>readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
const block=id=>JSON.parse(html().match(new RegExp(`<script id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`))[1]);
const media=json('data/ap-art-history-unit-10-media.json');
const staged=json('data/ap-art-history-unit-10-content.json').map(w=>({...w,images:media.images[w.id]}));
test('U10 reviewed canonical projection matches every live field and image credit',()=>{
 const canonical=json('tests/fixtures/u10-canonical.json');
 assert.deepEqual(block('artwork-data').filter(w=>w.unit===10),canonical.artworks);
 const credits=block('image-credit-data');
 assert.deepEqual(Object.fromEntries(canonical.artworks.map(w=>[w.id,credits[w.id]])),canonical.imageCredits);
});
test('U10 live integration reaches 250 and preserves all AP1–223 records and credits',()=>{
 const works=block('artwork-data'),credits=block('image-credit-data');
 const old=works.filter(w=>w.apNumber<=223),ids=new Set(old.map(w=>w.id));
 const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
 const frozen=json('tests/fixtures/u1-u9-pre-u10-hashes.json');
 assert.equal(hash(old),frozen.artworks);
 assert.equal(hash(Object.fromEntries(Object.entries(credits).filter(([id])=>ids.has(id)))),frozen.credits);
 assert.equal(works.length,250);
 assert.deepEqual(works.filter(w=>w.unit===10),staged);
});
test('U10 native validator accepts reviewed 250-work assembly and exact ordered views',()=>{
 const works=[...block('artwork-data').filter(w=>w.apNumber<=223),...staged];
 const credits={...block('image-credit-data'),...media.credits};
 const manifests=Object.fromEntries(Array.from({length:10},(_,i)=>[i+1,json(`data/ap-art-history-unit-${i+1}-manifest.json`)]));
 const rights=Object.fromEntries([3,4,5,6,7,8,9,10].map(n=>[n,json(`data/ap-art-history-unit-${n}-rights.json`)]));
 const authority=Object.fromEntries([4,5,6,7,8,9,10].map(n=>[n,json(`data/ap-art-history-unit-${n}${n===4?'-public-placeholders':'-placeholder-authority'}.json`)]));
 assert.doesNotThrow(()=>validateArtworks(works,manifests,authority));
 assert.doesNotThrow(()=>validateImageCredits(credits,works,rights,authority));
 const wrong=structuredClone(works);wrong.find(w=>w.unit===10).images.pop();
 assert.throws(()=>validateArtworks(wrong,manifests,authority),/view ids|media view/);
 const missing=works.filter(w=>w.apNumber!==250);
 assert.throws(()=>validateArtworks(missing,manifests,authority),/exactly 250 works/);
 const drift=structuredClone(works);drift.find(w=>w.unit===10).region='false-region';
 assert.throws(()=>validateArtworks(drift,manifests,authority),/region/);
 const noAuthority=structuredClone(authority);delete noAuthority[10];
 assert.throws(()=>validateArtworks(works,manifests,noAuthority),/authorities.*10/);
 const badCredits=structuredClone(credits);badCredits[staged[0].id][0].licenseName='CC BY 4.0';
 assert.throws(()=>validateImageCredits(badCredits,works,rights,authority),/credit|license|rights/);
});
test('U10 real local media contract accepts all 32 honest null views',()=>{
 assertLocalMediaContract({manifest,artworks:staged,rights:json('data/ap-art-history-unit-10-rights.json'),authority:json('data/ap-art-history-unit-10-placeholder-authority.json'),rootDir:fileURLToPath(new URL('../',import.meta.url))});
});
test('U10 AP230 and AP241 are explicitly unlocated and have reachable native buttons',()=>{
 const h=html();
 assert.match(h,/function isUnmappedWork\(work\)/);
 assert.match(h,/visibleWorks\.filter\(\(work\) => !isUnmappedWork\(work\)\)/);
 assert.match(h,/data-unmapped-work-id|dataset\.unmappedWorkId/);
 assert.match(h,/Location not verified/);
 assert.match(h,/state\.unit === 'all' && mappedUnits\.size >= 10/);
 for(const ap of [230,241])assert.deepEqual(staged.find(w=>w.apNumber===ap).coordinates,{x:0,y:0});
});
test('U10 freezes 27 AP224–250 identities and 32 ordered specified views',()=>{
 assert.deepEqual(Object.keys(manifest).map(Number),Array.from({length:27},(_,i)=>224+i));
 assert.equal(Object.values(manifest).flatMap(w=>w.requiredViewIds).length,32);
 for(const w of Object.values(manifest))assert.deepEqual(Object.keys(w),['id','titleEn','region','siteName','provenanceQualifier','traditionGroup','requiredViewIds']);
});
test('U10 contains complete bilingual content with exact provenance and loaded comparisons',()=>{
 const path=new URL('../data/ap-art-history-unit-10-content.json',import.meta.url);
 assert.ok(existsSync(path),'reviewed U10 content required');
 const works=JSON.parse(readFileSync(path,'utf8'));
 const html=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
 const legacy=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 const ids=new Set([...legacy,...works].filter(w=>w.apNumber<=250).map(w=>w.id));
 assert.deepEqual(works.map(w=>w.apNumber),Array.from({length:27},(_,i)=>224+i));
 for(const w of works){
  assert.equal(w.unit,10);assert.equal('images' in w,false);
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
test('U10 has 27 complete ordered independent English study sections',()=>{
 const path=new URL('../docs/content/ap-art-history-unit-10-english.md',import.meta.url);
 assert.ok(existsSync(path),'complete U10 English edition required');
 const md=readFileSync(path,'utf8');
 assert.deepEqual([...md.matchAll(/^## AP #(\d+)/gm)].map(m=>+m[1]),Array.from({length:27},(_,i)=>224+i));
 for(const s of md.split(/^## AP #/m).slice(1))for(const h of ['Identification','Function','Form','Content','Context','Recognition Anchors','Comparisons','Required Views and Sources'])assert.ok(s.includes('### '+h),h);
});
test('AP245 exposes the Harn origin discrepancy in both learner-facing editions',()=>{
 const w=json('data/ap-art-history-unit-10-content.json').find(w=>w.apNumber===245);
 assert.match(w.context,/Harn.*Ghana/);
 assert.match(w.context,/unresolved|unconfirmed/i);
 const md=readFileSync(new URL('../docs/content/ap-art-history-unit-10-english.md',import.meta.url),'utf8');
 const section=md.split('## AP #245')[1].split('## AP #246')[0];
 assert.match(section.split('### Context')[1].split('### Recognition Anchors')[0],/Harn.*Ghana/);
});
test('U10 stages all 32 exact component views and explicit public credits',()=>{
 const p=new URL('../data/ap-art-history-unit-10-media.json',import.meta.url);
 assert.ok(existsSync(p),'reviewed U10 media required');
 const m=JSON.parse(readFileSync(p,'utf8'));
 assert.deepEqual(Object.keys(m.images),Object.values(manifest).map(w=>w.id));
 assert.deepEqual(Object.keys(m.credits),Object.values(manifest).map(w=>w.id));
 assert.equal(Object.values(m.images).flat().length,32);
 for(const row of Object.values(manifest)){
  assert.deepEqual(m.images[row.id].map(v=>v.id),row.requiredViewIds);
  const credits=Array.isArray(m.credits[row.id])?m.credits[row.id]:[m.credits[row.id]];
  assert.equal(credits.length,row.requiredViewIds.length);
  for(const [i,v]of m.images[row.id].entries()){
   assert.match(v.imageSourceUrl,/^https:\/\//);
   if(v.imageUrl===null)assert.ok(v.mediaStatus?.trim());else assert.match(v.imageUrl,/^assets\/art-history\/u10\/ap\d{3}-[a-z0-9-]+\.webp$/);
   for(const f of ['creatorOrInstitution','licenseName','licenseUrl'])assert.ok(typeof credits[i][f]==='string'&&credits[i][f].trim());
  }
 }
});
