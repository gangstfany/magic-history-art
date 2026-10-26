import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {assertLocalMediaContract} from '../scripts/art-history-local-media-contract.mjs';
import {validateArtworks} from '../scripts/validate-art-history-data.mjs';
const manifestPath=new URL('../data/ap-art-history-unit-8-manifest.json',import.meta.url);
test('U8 anchors use the actual equirectangular SVG geography, not hand-tuned off-country positions',()=>{
 // Rounded illustrative site/regional anchors, not survey precision or invented workshops.
 // Sanchi, Longmen and Ryoan-ji have independently verified UNESCO coordinates.
 const anchors=[[192,1146,296],[193,1286,247],[194,1302,275],[195,1300,246],
  [196,1374,241],[197,1404,246],[198,1290,434],[199,1262,340],
  [200,1155,290],[201,1289,244],[202,1151,351],[203,1404,244],
  [204,1321,270],[205,1364,233],[206,1317,223],[207,1403,244],
  [208,1147,279],[209,1147,279],[210,1404,244],[211,1421,241],[212,1289,244]];
 const h=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
 const works=JSON.parse(h.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 const source=h.match(/const SITE_WORLD_COORDINATES = \{([\s\S]*?)\n    \};/)[1];
 const lookup=Function('return ({'+source+'})')();
 const staged=JSON.parse(readFileSync(new URL('../data/ap-art-history-unit-8-content.json',import.meta.url),'utf8'));
 for(const [ap,x,y]of anchors){
  const w=works.find(w=>w.apNumber===ap);
  assert.deepEqual(w.coordinates,{x,y},`AP${ap} actual SVG geographic anchor`);
  assert.deepEqual(lookup[w.siteName],{x,y},`AP${ap} direct world lookup`);
  assert.deepEqual(staged.find(w=>w.apNumber===ap).coordinates,{x,y},`AP${ap} staged source`);
 }
});
test('U8 requires reviewed ordered AP192–212 identities and specified views',()=>{
 assert.ok(existsSync(manifestPath),'reviewed U8 manifest is required');
 const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
 assert.deepEqual(Object.keys(manifest).map(Number),Array.from({length:21},(_,i)=>192+i));
 assert.equal(Object.values(manifest).flatMap(w=>w.requiredViewIds).length,50,'49 CED heading images; AP199 has two separately labeled plans');
 for(const row of Object.values(manifest)){
  assert.deepEqual(Object.keys(row),['id','titleEn','region','siteName','provenanceQualifier','traditionGroup','requiredViewIds']);
  for(const f of ['id','titleEn','region','siteName','traditionGroup'])assert.ok(typeof row[f]==='string'&&row[f].trim(),f);
  assert.ok(Array.isArray(row.requiredViewIds)&&row.requiredViewIds.length>0);
  assert.equal(new Set(row.requiredViewIds).size,row.requiredViewIds.length);
 }
});
test('U8 content contains all 21 complete bilingual study records and valid comparisons',()=>{
 const path=new URL('../data/ap-art-history-unit-8-content.json',import.meta.url);
 assert.ok(existsSync(path),'reviewed U8 bilingual content is required');
 const works=JSON.parse(readFileSync(path,'utf8')),manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
 const html=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
 const legacy=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 const ids=new Set([...legacy,...works].map(w=>w.id));
 assert.deepEqual(works.map(w=>w.apNumber),Array.from({length:21},(_,i)=>192+i));
 for(const w of works){
  assert.equal(w.unit,8);assert.equal('images' in w,false,'media is separately reviewed');
  for(const f of ['id','titleEn','region','siteName','traditionGroup'])assert.equal(w[f],manifest[w.apNumber][f]);
  for(const f of ['titleZh','artistCulture','culture','date','period','medium','workType','function','form','content','context'])assert.ok(typeof w[f]==='string'&&w[f].trim(),`${w.id}.${f}`);
  assert.match(w.titleZh,/[\u3400-\u9fff]/);
  for(const f of ['function','form','content','context'])assert.match(w[f],/[\u3400-\u9fff]/);
  assert.ok(Number.isFinite(w.coordinates.x)&&w.coordinates.x>=0&&w.coordinates.x<=1600);
  assert.ok(Number.isFinite(w.coordinates.y)&&w.coordinates.y>=0&&w.coordinates.y<=800);
  assert.ok(w.recognitionAnchors.length>=2&&w.recognitionAnchors.length<=4);
  assert.ok(w.keywords.length>=3);assert.ok(w.comparisonIds.length>=1);
  for(const id of w.comparisonIds){assert.ok(ids.has(id)&&id!==w.id,id);assert.ok(w.comparisonNotes[id]?.trim());}
  const qualifier=manifest[w.apNumber].provenanceQualifier;
  if(qualifier===null)assert.equal('provenanceQualifier' in w,false);else assert.equal(w.provenanceQualifier,qualifier);
 }
});
test('U8 has a complete ordered independent English study edition',()=>{
 const path=new URL('../docs/content/ap-art-history-unit-8-english.md',import.meta.url);
 assert.ok(existsSync(path),'complete U8 English edition is required');
 const md=readFileSync(path,'utf8');
 assert.deepEqual([...md.matchAll(/^## AP #(\d+)/gm)].map(m=>+m[1]),Array.from({length:21},(_,i)=>192+i));
 for(const section of md.split(/^## AP #/m).slice(1)){
  for(const heading of ['Identification','Function','Form','Content','Context','Recognition Anchors','Comparisons','Required Views and Sources'])assert.ok(section.includes('### '+heading),heading);
 }
});
test('U8 media has 50 ordered exact-view slots with matching public rights and credits',()=>{
 const path=new URL('../data/ap-art-history-unit-8-media.json',import.meta.url);
 assert.ok(existsSync(path),'reviewed U8 media bundle is required');
 const json=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
 const media=JSON.parse(readFileSync(path,'utf8')),manifest=json('data/ap-art-history-unit-8-manifest.json');
 const works=Object.entries(manifest).map(([ap,w])=>({id:w.id,apNumber:+ap,unit:8,images:media.images[w.id]}));
 const rights=json('data/ap-art-history-unit-8-rights.json'),authority=json('data/ap-art-history-unit-8-placeholder-authority.json');
 assert.equal(works.flatMap(w=>w.images).length,50);
 assert.deepEqual(Object.keys(media.images),works.map(w=>w.id));
 assert.deepEqual(Object.keys(media.credits),works.map(w=>w.id));
 assertLocalMediaContract({manifest,artworks:works,rights,authority,rootDir:fileURLToPath(new URL('../',import.meta.url))});
 for(const w of works){
  const rows=Array.isArray(media.credits[w.id])?media.credits[w.id]:[media.credits[w.id]];
  assert.equal(rows.length,w.images.length);
  w.images.forEach((v,i)=>{
   assert.equal(rights[w.id+'::'+v.id].sourcePageUrl,v.imageSourceUrl);
   for(const f of ['creatorOrInstitution','licenseName','licenseUrl'])assert.equal(rows[i][f],rights[w.id+'::'+v.id][f]);
   if(v.imageUrl)assert.equal('mediaStatus' in v,false);else assert.ok(v.mediaStatus?.trim());
  });
 }
});
test('U8 structural validator enforces exact manifest views and provenance',()=>{
 const json=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
 const html=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
 const legacy=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]).filter(w=>w.apNumber<=191);
 const manifests=Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,json(`data/ap-art-history-unit-${i+1}-manifest.json`)]));
 const authorities=Object.fromEntries([4,5,6,7].map(n=>[n,json(n===4?'data/ap-art-history-unit-4-public-placeholders.json':`data/ap-art-history-unit-${n}-placeholder-authority.json`)]));
 authorities[8]={};
 const fixtures=Object.entries(manifests[8]).map(([ap,row])=>{
  const work={...structuredClone(legacy.find(w=>w.unit===7)),id:row.id,apNumber:+ap,unit:8,titleEn:row.titleEn,titleZh:'测试作品',region:row.region,siteName:row.siteName,traditionGroup:row.traditionGroup,culture:'Fixture culture',comparisonIds:['ap15-seated-scribe'],comparisonNotes:{'ap15-seated-scribe':'测试比较理由'},coordinates:{x:1200,y:330}};
  delete work.provenanceQualifier;
  if(row.provenanceQualifier!==null)work.provenanceQualifier=row.provenanceQualifier;
  work.images=row.requiredViewIds.map(id=>{
   const view={id,label:id,imageUrl:null,imageAlt:`Fixture ${ap} ${id}`,imageSourceName:'Fixture authority',imageSourceUrl:`https://example.org/${ap}/${id}`,mediaStatus:'Permission verification pending'};
   authorities[8][work.id+'::'+id]={imageSourceName:view.imageSourceName,imageSourceUrl:view.imageSourceUrl,rightsNote:'Fixture evidence'};
   return view;
  });return work;
 });
 const all=[...legacy,...fixtures];assert.doesNotThrow(()=>validateArtworks(all,manifests,authorities));
 const missing=structuredClone(all);missing.find(w=>w.unit===8).images.pop();
 assert.throws(()=>validateArtworks(missing,manifests,authorities),/media view|view ids/);
 const provenance=structuredClone(all);provenance.find(w=>w.unit===8&&w.provenanceQualifier).provenanceQualifier='Invented workshop';
 assert.throws(()=>validateArtworks(provenance,manifests,authorities),/provenanceQualifier.*exactly/);
});
test('reviewed U8 canonical projection matches all live fields and image credits',()=>{
 const path=new URL('./fixtures/u8-canonical.json',import.meta.url);
 assert.ok(existsSync(path),'reviewed U8 canonical projection is required');
 const canonical=JSON.parse(readFileSync(path,'utf8'));
 const s=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
 const json=id=>JSON.parse(s.match(new RegExp(`<script id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`))[1]);
 const works=json('artwork-data'),credits=json('image-credit-data');
 assert.deepEqual(works.filter(w=>w.unit===8),canonical.artworks);
 assert.deepEqual(Object.fromEntries(canonical.artworks.map(w=>[w.id,credits[w.id]])),canonical.imageCredits);
});
test('U8 release preserves AP1–191 records and credits before adding AP192–212',()=>{
 const s=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
 const json=id=>JSON.parse(s.match(new RegExp(`<script id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`))[1]);
 const works=json('artwork-data'),credits=json('image-credit-data');
 const frozen=JSON.parse(readFileSync(new URL('./fixtures/u1-u7-pre-u8-hashes.json',import.meta.url),'utf8'));
 const old=works.filter(w=>w.apNumber<=191),ids=new Set(old.map(w=>w.id));
 const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
 assert.equal(hash(old),frozen.artworks);
 assert.equal(hash(Object.fromEntries(Object.entries(credits).filter(([id])=>ids.has(id)))),frozen.credits);
 assert.equal(works.length,250);
 assert.deepEqual(works.filter(w=>w.unit===8).map(w=>w.apNumber),Array.from({length:21},(_,i)=>192+i));
});
