import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {discoverPlaywright,discoverBrowser,startStaticServer} from './verify-art-history-browser.mjs';

const manifest=JSON.parse(await readFile(new URL('../data/ap-art-history-unit-10-manifest.json',import.meta.url),'utf8'));
const pw=await discoverPlaywright(),server=await startStaticServer();
const browser=await pw.chromium.launch({executablePath:await discoverBrowser(pw.chromium),headless:true});
const settle=frame=>frame.locator('body').evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
try {
 for(const embedded of [false,true])for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
  const errors=[],unexpectedImages=[];
  let checkingNullViews=false;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(checkingNullViews&&r.resourceType()==='image'&&r.frame().url().includes('art-history-map.html')&&!new URL(r.url()).pathname.endsWith('/assets/art-history/u10/ap240-riverside-exterior.webp'))unexpectedImages.push(r.url());});
  await page.goto(server.baseUrl+(embedded?'/index.html':'/art-history-map.html'));
  if(embedded){await page.locator('#home-map-embed').scrollIntoViewIfNeeded();await page.locator('[data-subj="art"]').click();}
  const frame=embedded?page.frameLocator('#artMapFrame'):page;
  await frame.locator('.site-marker[data-group-kind="unit"]').nth(9).waitFor();
  assert.match(await frame.locator('.site-marker[data-group-kind="unit"]').nth(9).getAttribute('aria-label'),/27 pieces/);
  await frame.locator('#unitFilter').selectOption('10');await settle(frame);
  assert.equal((await frame.locator('.result-count').textContent()).trim(),'当前显示 27 件作品');
  assert.equal(await frame.locator('.filter-pill').count(),7);
  assert.equal(await frame.locator('.filter-pill').first().textContent(),'All traditions');
  assert.equal(await frame.locator('.site-marker[data-group-kind="region"]').count(),11);
  assert.equal(await frame.locator('[data-unmapped-work-id]').count(),0);
  let viewCount=0;
  for(const [ap,work]of Object.entries(manifest)){
   await frame.locator('#unitFilter').selectOption('all');await frame.locator('#unitFilter').selectOption('10');await settle(frame);
   checkingNullViews=true;
    await frame.locator(`[data-site-token="site-unit-10-region-${work.region}"]`).press('Enter');await settle(frame);
    const site=await frame.locator('body').evaluate((_,id)=>{
     const a=window.ArtHistoryMap,works=a.filterWorks(a.ARTWORKS,a.state);
     const group=a.groupBySite(works).find(g=>g.works.some(w=>w.id===id));
     return {token:group.siteToken,count:group.works.length};
    },work.id);
    await frame.locator(`.site-marker[data-site-token="${site.token}"]`).press('Enter');await settle(frame);
    if(site.count>1){
     const pin=frame.locator(`.expanded-work-pin[data-work-id="${work.id}"]`);
     if(await pin.count())await pin.press('Enter');
     else await frame.locator(`.expanded-pin-list-button[data-work-id="${work.id}"]`).press('Enter');
    }
   assert.equal(await frame.locator('.work-title-en').textContent(),work.titleEn);
   const views=await frame.locator('body').evaluate((_,id)=>window.ArtHistoryMap.ARTWORKS.find(w=>w.id===id).images,work.id);
   assert.deepEqual(views.map(v=>v.id),work.requiredViewIds);
   for(const [index,view]of views.entries()){
    if(views.length>1)await frame.locator('.image-view-switcher button').nth(index).click();
    viewCount++;
    if(view.imageUrl){
     assert.equal(view.imageUrl,'assets/art-history/u10/ap240-riverside-exterior.webp');
     const img=frame.locator('.artwork-media-stage img');await img.evaluate(e=>e.decode());
     assert.ok(await img.evaluate(e=>e.naturalWidth>0));
     assert.equal(await img.evaluate(e=>getComputedStyle(e).objectFit),'contain');
     await frame.locator('.artwork-image-button').click();await frame.locator('#dialogImage').evaluate(e=>e.decode());
     await frame.locator('#dialogClose').click();
     assert.equal(await frame.locator('.artwork-image-button').evaluate(e=>e===document.activeElement),true);
     continue;
    }
    assert.equal(await frame.locator('.artwork-media-stage img').count(),0);
    assert.equal(await frame.locator('.artwork-image-button').count(),0,'dialog trigger N/A with null image');
    assert.equal(await frame.locator('#imageDialog').evaluate(e=>e.open),false);
    assert.match(await frame.locator('.artwork-media-stage').textContent(),/Reusable image not yet verified/);
    assert.equal(await frame.locator('.rights-placeholder-source').getAttribute('href'),view.imageSourceUrl);
   }
   for(const tab of ['quick','form','context','compare']){
    await frame.locator('#detail-tab-'+tab).click();
    assert.equal(await frame.locator('#detail-tab-'+tab).getAttribute('aria-selected'),'true');
   }
   const target=await frame.locator('.comparison-card').first().getAttribute('data-comparison-id');
   checkingNullViews=false;
   await frame.locator('.comparison-card').first().click();
   assert.equal(await frame.locator('body').evaluate(()=>window.ArtHistoryMap.state.selectedId),target);
  }
  assert.equal(viewCount,32);
  for(const [index,count]of [[1,5],[2,7],[3,3],[4,5],[5,2],[6,5]]){
   await frame.locator('#unitFilter').selectOption('10');await settle(frame);
   await frame.locator('.filter-pill').nth(index).click();await settle(frame);
   assert.equal((await frame.locator('.result-count').textContent()).trim(),`当前显示 ${count} 件作品`);
   const expected=await frame.locator('body').evaluate(()=>{
    const a=window.ArtHistoryMap;return a.filterWorks(a.ARTWORKS,a.state).filter(w=>w.coordinates.x===0&&w.coordinates.y===0).map(w=>w.id);
   });
   assert.deepEqual(await frame.locator('[data-unmapped-work-id]').evaluateAll(ns=>ns.map(n=>n.dataset.unmappedWorkId)),expected);
  }
  for(const ap of [230,241]){
   await frame.locator('#unitFilter').selectOption('all');await frame.locator('#unitFilter').selectOption('10');
   await frame.locator('#searchInput').fill(`AP ${ap}`);await settle(frame);
   assert.equal((await frame.locator('.result-count').textContent()).trim(),'当前显示 1 件作品');
   assert.ok(await frame.locator('.site-marker').count()>0,'course anchor has geographic navigation');
   await frame.locator(`[data-site-token="site-unit-10-region-${manifest[ap].region}"]`).press('Enter');await settle(frame);
   await frame.locator('.site-marker[data-group-kind="site"]').press('Enter');await settle(frame);
   assert.equal(await frame.locator('.work-title-en').textContent(),manifest[ap].titleEn);
  }
  await frame.locator('#unitFilter').selectOption('all');await frame.locator('#unitFilter').selectOption('10');await settle(frame);
  for(const id of ['periodFilter','typeFilter']){
   const value=await frame.locator('body').evaluate((_,id)=>{
    const a=window.ArtHistoryMap,w=a.filterWorks(a.ARTWORKS,a.state)[0];return id==='periodFilter'?w.period:w.workType;
   },id);
   await frame.locator('#'+id).selectOption(value);await settle(frame);
   assert.ok(await frame.locator('body').evaluate(()=>window.ArtHistoryMap.filterWorks(window.ArtHistoryMap.ARTWORKS,window.ArtHistoryMap.state).length>0));
  }
  await frame.locator('#unitFilter').selectOption('6');await settle(frame);
  assert.equal(await frame.locator('#periodFilter').inputValue(),'');assert.equal(await frame.locator('#typeFilter').inputValue(),'');
  await frame.locator('#unitFilter').selectOption('10');await frame.locator('#resetView').click();await settle(frame);
  assert.equal(await frame.locator('body').evaluate(()=>window.ArtHistoryMap.state.transform.scale),1);
  await frame.locator('#zoomIn').click();await settle(frame);
  assert.ok(await frame.locator('body').evaluate(()=>window.ArtHistoryMap.state.transform.scale>1));
  await frame.locator('.map-svg').scrollIntoViewIfNeeded();
  const box=await frame.locator('.map-svg').boundingBox();
  const before=await frame.locator('body').evaluate(()=>({...window.ArtHistoryMap.state.transform}));
  await page.mouse.move(box.x+40,box.y+40);await page.mouse.down();await page.mouse.move(box.x+70,box.y+60,{steps:4});await page.mouse.up();
  const after=await frame.locator('body').evaluate(()=>({...window.ArtHistoryMap.state.transform}));
  assert.ok(before.x!==after.x||before.y!==after.y,'manual pan moves the map');assert.ok(Object.values(after).every(Number.isFinite));
  await frame.locator('#resetView').click();await settle(frame);
  if(embedded){await page.locator('[data-subj="world"]').click();await page.locator('[data-subj="art"]').click();assert.equal(await frame.locator('#unitFilter').inputValue(),'10');}
  assert.ok(await frame.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert.ok(await page.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  assert.deepEqual(errors,[]);assert.deepEqual(unexpectedImages,[]);
  await page.screenshot({path:`/tmp/u10-${embedded?'embedded':'standalone'}-${width}.png`,fullPage:true});
  console.log(`${embedded?'embedded':'standalone'} ${width}: 27 works, ${viewCount} views (31 unresolved + 1 decoded local image); dialog/focus, unlocated keyboard paths, tabs, comparisons, six filters, search, reset, zoom, pan passed`);
  await page.close();
 }
}finally{await browser.close();await server.close();}
