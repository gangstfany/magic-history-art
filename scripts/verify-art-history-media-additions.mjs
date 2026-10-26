import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {discoverPlaywright,discoverBrowser,startStaticServer} from './verify-art-history-browser.mjs';
const additions=JSON.parse(readFileSync(new URL('../data/ap-art-history-media-additions-2026-10-20.json',import.meta.url))).filter(v=>!process.env.ART_MEDIA_WORK_ID||v.workId===process.env.ART_MEDIA_WORK_ID);
const pw=await discoverPlaywright(),server=await startStaticServer();
const browser=await pw.chromium.launch({executablePath:await discoverBrowser(pw.chromium),headless:true});
const settle=f=>f.locator('body').evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
try{
 for(const embedded of [false,true])for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
  let step='loading';page.on('pageerror',async e=>{errors.push(e.message);console.log('Page error',embedded,width,step,e.stack);console.log(await (embedded?page.frameLocator('#artMapFrame'):page).locator('body').evaluate(()=>({state:window.ArtHistoryMap.state,map:(()=>{const r=document.querySelector('.map-svg').getBoundingClientRect();return{width:r.width,height:r.height,x:r.x,y:r.y}})(),viewport:[innerWidth,innerHeight],dialog:document.querySelector('#imageDialog').open})));});
  await page.goto(server.baseUrl+(embedded?'/index.html':'/art-history-map.html'));
  if(embedded){await page.locator('#home-map-embed').scrollIntoViewIfNeeded();await page.locator('[data-subj="art"]').click();}
  const f=embedded?page.frameLocator('#artMapFrame'):page;
  await f.locator('.site-marker').first().waitFor();
  for(const id of new Set(additions.map(v=>v.workId))){
   step=id;
   const w=await f.locator('body').evaluate((_,id)=>window.ArtHistoryMap.ARTWORKS.find(w=>w.id===id),id);
   await f.locator('#unitFilter').selectOption(String(w.unit));await settle(f);
   await f.locator(`[data-site-token="site-unit-${w.unit}-region-${w.region}"]`).press('Enter');await settle(f);
   const site=await f.locator('body').evaluate((_,id)=>{
    const a=window.ArtHistoryMap,g=a.groupBySite(a.filterWorks(a.ARTWORKS,a.state)).find(g=>g.works.some(w=>w.id===id));
    return {token:g.siteToken,count:g.works.length};
   },id);
   await f.locator(`.site-marker[data-site-token="${site.token}"]`).press('Enter');await settle(f);
   if(site.count>1){const pin=f.locator(`.expanded-work-pin[data-work-id="${id}"]`);if(await pin.count())await pin.press('Enter');else await f.locator(`.expanded-pin-list-button[data-work-id="${id}"]`).press('Enter');}
   assert.equal(await f.locator('.work-title-en').textContent(),w.titleEn);
   for(const a of additions.filter(v=>v.workId===id)){
    step=id+'::'+a.viewId;
    const index=w.images.findIndex(v=>v.id===a.viewId);if(w.images.length>1)await f.locator('.image-view-switcher button').nth(index).click();
    const img=f.locator('.artwork-media-stage img');await img.evaluate(e=>e.decode());
    assert.equal(await img.getAttribute('src'),a.imageUrl);
    assert.ok(await img.evaluate(e=>e.naturalWidth>0&&e.naturalHeight>0));
    assert.equal(await img.evaluate(e=>getComputedStyle(e).objectFit),'contain');
    await f.locator('.artwork-image-button').click();await f.locator('#dialogImage').evaluate(e=>e.decode());
    assert.equal(await f.locator('#imageDialog').evaluate(e=>e.open),true);
    await f.locator('#dialogClose').click();
    assert.equal(await f.locator('.artwork-image-button').evaluate(e=>e===document.activeElement),true);
   }
  }
  await page.screenshot({path:`/tmp/apah-media-oct20-${embedded?'embedded':'standalone'}-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);console.log(`${embedded?'embedded':'standalone'} ${width}: all ${additions.length} new views decode, contain, switch, enlarge and restore focus`);
  await page.close();
 }
}finally{await browser.close();await server.close();}
