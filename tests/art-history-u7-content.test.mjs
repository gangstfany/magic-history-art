import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {assertLocalMediaContract} from '../scripts/art-history-local-media-contract.mjs';
import {fileURLToPath} from 'node:url';
const views=new Map([
 [181,['petra-context','treasury','great-temple']], [182,['buddha-front','buddha-context']],
 [183,['circumambulation','exterior','gathering-context']], [184,['primary']],
 [185,['exterior','interior']], [186,['iwan','iwan-detail','courtyard','mihrab']],
 [187,['primary']], [188,['primary']], [189,['primary']], [190,['primary']], [191,['primary']],
]);
test('U7 manifest freezes exact AP181–191 and 20 ordered views',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../data/ap-art-history-unit-7-manifest.json',import.meta.url),'utf8'));
 assert.deepEqual(Object.keys(manifest).map(Number),[...views.keys()]);
 assert.equal(Object.values(manifest).flatMap(w=>w.requiredViewIds).length,20);
 for(const [ap,v] of views) assert.deepEqual(manifest[ap].requiredViewIds,v,`AP${ap}`);
});
test('U7 content and English edition cover every study field and valid comparison', async()=>{
 const content=JSON.parse(await readFile(new URL('../data/ap-art-history-unit-7-content.json',import.meta.url),'utf8'));
 const manifest=JSON.parse(await readFile(new URL('../data/ap-art-history-unit-7-manifest.json',import.meta.url),'utf8'));
 const english=await readFile(new URL('../docs/content/ap-art-history-unit-7-english.md',import.meta.url),'utf8');
 assert.deepEqual(content.map(w=>w.apNumber),[...views.keys()]);
 const html=await readFile(new URL('../art-history-map.html',import.meta.url),'utf8');
 const live=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 const ids=new Set([...live,...content].map(w=>w.id));
 for(const work of content){
  for(const field of ['titleEn','titleZh','culture','period','date','artistCulture','medium','workType','function','form','content','context']) assert.ok(typeof work[field]==='string'&&work[field].trim(),`${work.id}.${field}`);
  for(const field of ['id','titleEn','region','siteName','traditionGroup']) assert.equal(work[field],manifest[work.apNumber][field]);
  assert.ok(work.coordinates.x>=0&&work.coordinates.x<=1600&&work.coordinates.y>=0&&work.coordinates.y<=800);
  assert.ok(work.recognitionAnchors.length>=2&&work.recognitionAnchors.length<=4);
  for(const id of work.comparisonIds){assert.ok(ids.has(id)&&id!==work.id,id);assert.ok(work.comparisonNotes[id]?.trim());}
 }
 assert.deepEqual([...english.matchAll(/^## AP #(\d+)/gm)].map(m=>+m[1]),[...views.keys()]);
});
test('U7 local media ledger aligns all 20 views and rejects remote paths',async()=>{
 const json=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
 const content=await json('data/ap-art-history-unit-7-content.json');
 const media=await json('data/ap-art-history-unit-7-media.json');
 const fixture={manifest:await json('data/ap-art-history-unit-7-manifest.json'), artworks:content.map(w=>({...w,images:media.images[w.id]})),rights:await json('data/ap-art-history-unit-7-rights.json'),authority:await json('data/ap-art-history-unit-7-placeholder-authority.json'),rootDir:fileURLToPath(new URL('../',import.meta.url))};
 assert.doesNotThrow(()=>assertLocalMediaContract(fixture));
 const bad=structuredClone(fixture); const work=bad.artworks.find(w=>w.images.some(i=>i.imageUrl));
 assert.ok(work,'at least one verified open view'); work.images.find(i=>i.imageUrl).imageUrl='https://example.org/wrong.jpg';
 assert.throws(()=>assertLocalMediaContract(bad),/repository-local/);
});
test('reviewed U7 canonical projection matches every live field and image credit',async()=>{
 const canonical=JSON.parse(await readFile(new URL('./fixtures/u7-canonical.json',import.meta.url),'utf8'));
 const html=await readFile(new URL('../art-history-map.html',import.meta.url),'utf8');
 const works=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 const credits=JSON.parse(html.match(/<script id="image-credit-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 assert.deepEqual(works.filter(w=>w.unit===7),canonical.artworks);
 assert.deepEqual(Object.fromEntries(canonical.artworks.map(w=>[w.id,credits[w.id]])),canonical.imageCredits);
});
test('release adds exactly 11 U7 records while preserving all legacy data and credits',async()=>{
 const html=await readFile(new URL('../art-history-map.html',import.meta.url),'utf8');
 const works=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 const credits=JSON.parse(html.match(/<script id="image-credit-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 const frozen=JSON.parse(await readFile(new URL('./fixtures/u1-u6-pre-u7-hashes.json',import.meta.url),'utf8'));
 const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 assert.equal(hash(works.filter(w=>w.apNumber<=180)),frozen.artworks);
 const oldIds=new Set(works.filter(w=>w.apNumber<=180).map(w=>w.id));
 assert.equal(hash(Object.fromEntries(Object.entries(credits).filter(([id])=>oldIds.has(id)))),frozen.credits);
 assert.equal(works.length,250);
 assert.deepEqual(works.filter(w=>w.unit===7).map(w=>w.apNumber),[...views.keys()]);
 assert.equal(works.filter(w=>w.unit===7).flatMap(w=>w.images).length,20);
});
