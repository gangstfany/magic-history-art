import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const json=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
test('October20 verified media additions are present with exact view-level rights and attribution',()=>{
  const h=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
  const extract=id=>JSON.parse(h.match(new RegExp(`<script id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`))[1]);
  const works=extract('artwork-data'),credits=extract('image-credit-data');
  const additions=json('data/ap-art-history-media-additions-2026-10-20.json');
  assert.equal(additions.length,16);
  assert.equal(new Set(additions.map(v=>v.workId+'::'+v.viewId)).size,16);
  for(const added of additions){
    const work=works.find(w=>w.id===added.workId),index=work.images.findIndex(v=>v.id===added.viewId);
    assert.ok(index>=0,'required view already exists');
    const view=work.images[index],key=work.id+'::'+view.id;
    assert.equal(view.imageUrl,added.imageUrl,key+' renders approved local asset');
    assert.equal(view.mediaStatus,undefined);
    assert.ok(existsSync(new URL('../'+view.imageUrl,import.meta.url)));
    const rights=json(`data/ap-art-history-unit-${work.unit}-rights.json`)[key];
    assert.equal(rights.releaseClass,'open');
    assert.equal(rights.localAssetPath,view.imageUrl);
    assert.equal(rights.sourcePageUrl,added.imageSourceUrl);
    assert.equal(rights.identityNote,added.identityNote);
    assert.equal(json(`data/ap-art-history-unit-${work.unit}-placeholder-authority.json`)[key],undefined);
    const credit=Array.isArray(credits[work.id])?credits[work.id][index]:credits[work.id];
    assert.equal(credit.creatorOrInstitution,added.creatorOrInstitution);
    assert.equal(credit.licenseName,added.licenseName);
    if(work.unit>=7)assert.deepEqual(json(`data/ap-art-history-unit-${work.unit}-media.json`).images[work.id],work.images);
  }
});
test('AP209 has two verified local views with image-level reuse evidence and no unavailable status',()=>{
  const h=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
  const works=JSON.parse(h.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
  const work=works.find(w=>w.apNumber===209);
  const media=json('data/ap-art-history-unit-8-media.json');
  const rights=json('data/ap-art-history-unit-8-rights.json');
  const placeholders=json('data/ap-art-history-unit-8-placeholder-authority.json');
  assert.deepEqual(work.images.map(v=>v.id),['mausoleum-and-garden','cenotaph-interior']);
  for(const view of work.images){
    assert.ok(view.imageUrl?.startsWith('assets/art-history/u8/'),'local AP209 image added');
    assert.ok(existsSync(new URL('../'+view.imageUrl,import.meta.url)));
    assert.equal('mediaStatus' in view,false);
    const row=rights[work.id+'::'+view.id];
    assert.equal(row.releaseClass,'open');assert.equal(row.accessedOn,'2026-10-19');
    assert.equal(row.localAssetPath,view.imageUrl);
    assert.ok(row.identityNote.includes('Mumtaz')||row.identityNote.includes('reflection pool'));
    assert.equal(placeholders[work.id+'::'+view.id],undefined);
  }
  assert.deepEqual(media.images[work.id],work.images);
});
test('the supplementation preserves every nonmedia field of all 250 works',async()=>{
 const {createHash}=await import('node:crypto');
 const html=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
 const works=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 const nonmedia=works.map(({images,...work})=>work);
 const expected=json('tests/fixtures/pre-supplementation-nonmedia.json');
 assert.equal(createHash('sha256').update(JSON.stringify(nonmedia)).digest('hex'),expected.nonmediaSha256);
});
