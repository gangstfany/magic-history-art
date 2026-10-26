import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {discoverPlaywright,discoverBrowser} from './verify-art-history-browser.mjs';
const base=process.env.ART_HISTORY_STUDY_URL||'http://127.0.0.1:4174';
const manifest=[...JSON.parse(readFileSync(new URL('../.private-media/complete/manifest.json',import.meta.url))),...JSON.parse(readFileSync(new URL('../.private-media/complete/remote-fallbacks/manifest.json',import.meta.url)))];
const pw=await discoverPlaywright(),browser=await pw.chromium.launch({executablePath:await discoverBrowser(pw.chromium),headless:true});
try{
 for(const embedded of [false,true])for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+(embedded?'/index.html':'/art-history-map.html'));
  if(embedded){await page.locator('#home-map-embed').scrollIntoViewIfNeeded();await page.locator('[data-subj="art"]').click();}
  const f=embedded?page.frameLocator('#artMapFrame'):page;
  await f.locator('.site-marker').first().waitFor();
  const coverage=await f.locator('body').evaluate(()=>{
   const w=window.ArtHistoryMap.ARTWORKS,views=w.flatMap(w=>w.images||[{imageUrl:w.imageUrl}]);
   return {works:w.length,views:views.length,missing:views.filter(v=>!v.imageUrl).length};
  });
  assert.deepEqual(coverage,{works:250,views:381,missing:0});
  for(const id of new Set(manifest.map(v=>v.workId))){
   await f.locator('body').evaluate((_,id)=>window.ArtHistoryMap.selectComparison(id),id);
   for(const row of manifest.filter(v=>v.workId===id)){
    const info=await f.locator('body').evaluate((_,row)=>{const w=window.ArtHistoryMap.ARTWORKS.find(w=>w.id===row.workId);return{index:w.images?w.images.findIndex(v=>v.id===row.viewId):0,count:w.images?.length||1};},row);
    if(info.count>1)await f.locator('.image-view-switcher button').nth(info.index).click();
    const img=f.locator('.artwork-media-stage img');await img.evaluate(e=>e.decode());
    await f.locator('body').evaluate((_,path)=>new Promise((resolve,reject)=>{
     const deadline=performance.now()+5000;
     const check=()=>{const e=document.querySelector('.artwork-media-stage img');
      if(e?.isConnected&&e.getAttribute('src')===path&&e.naturalWidth>0&&getComputedStyle(e).objectFit==='contain')return resolve();
      if(performance.now()>deadline)return reject(new Error('Image never stabilizes after iframe layout: '+path));
      requestAnimationFrame(check);
     };check();
    }),row.filePath);
    assert.equal(await img.getAttribute('src'),row.filePath);
    assert.ok(await img.evaluate(e=>e.naturalWidth>0&&e.naturalHeight>0));
    assert.equal(await img.evaluate(e=>getComputedStyle(e).objectFit),'contain');
    await f.locator('.artwork-image-button').click();await f.locator('#dialogImage').evaluate(e=>e.decode());
    await f.locator('#dialogClose').click();
    assert.equal(await f.locator('.artwork-image-button').evaluate(e=>e===document.activeElement),true);
   }
  }
  await page.screenshot({path:`/tmp/art-study-${embedded?'embedded':'standalone'}-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);
  console.log(`${embedded?'embedded':'standalone'} ${width}:250works/381views/0missing; all${manifest.length} restored local views decode, contain, switch, enlarge and restore focus`);
  await page.close();
 }
}finally{await browser.close();}
