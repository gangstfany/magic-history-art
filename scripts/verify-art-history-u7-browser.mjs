import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {discoverPlaywright,discoverBrowser,startStaticServer} from './verify-art-history-browser.mjs';
const manifest=JSON.parse(await readFile(new URL('../data/ap-art-history-unit-7-manifest.json',import.meta.url),'utf8'));
const pw=await discoverPlaywright(),server=await startStaticServer();
const browser=await pw.chromium.launch({executablePath:await discoverBrowser(pw.chromium),headless:true});
const settle=frame=>frame.locator('body').evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
try{
 for(const embedded of [false,true]) for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
  const errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().includes('/assets/art-history/u7/')&&r.status()>=400)failed.push(r.url());});
  await page.goto(server.baseUrl+(embedded?'/index.html':'/art-history-map.html'));
  if(embedded){await page.locator('#home-map-embed').scrollIntoViewIfNeeded();await page.locator('[data-subj="art"]').click();}
  const frame=embedded?page.frameLocator('#artMapFrame'):page;
  await frame.locator('.site-marker[data-group-kind="unit"]').nth(6).waitFor();
  await frame.locator('#unitFilter').selectOption('7');
  await settle(frame);
  assert.equal((await frame.locator('.result-count').textContent()).trim(),'当前显示 11 件作品');
  assert.equal(await frame.locator('.filter-pill').count(),5);
  assert.equal(await frame.locator('.filter-pill').first().textContent(),'All traditions');
  assert.equal(await frame.locator('.site-marker[data-group-kind="region"]').count(),6);
  assert.deepEqual(await frame.locator('.site-marker[data-group-kind="region"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),[
   'Levant · 2 pieces','Arabian Peninsula · 1 piece','Iran · 4 pieces',
   'Afghanistan & Central Asia · 1 piece','Tibet & Himalayas · 1 piece','North Africa / Near East (uncertain) · 2 pieces',
  ]);
  let viewCount=0,openCount=0;
  for(const work of Object.values(manifest)){
   await frame.locator('#unitFilter').selectOption('all');
   await frame.locator('#unitFilter').selectOption('7');
   await settle(frame);
   await frame.locator(`[data-site-token="site-unit-7-region-${work.region}"]`).press('Enter');
   await frame.locator(`.site-marker[aria-label$=" · AP ${Object.entries(manifest).find(([,v])=>v.id===work.id)[0]} · 1 piece"]`).press('Enter');
   assert.equal(await frame.locator('.work-title-en').textContent(),work.titleEn);
   const images=await frame.locator('body').evaluate((_,id)=>window.ArtHistoryMap.ARTWORKS.find(w=>w.id===id).images,work.id);
   assert.deepEqual(images.map(i=>i.id),work.requiredViewIds);
   for(const [index,image]of images.entries()){
    if(images.length>1)await frame.locator('.image-view-switcher button').nth(index).click();
    viewCount++;
    if(image.imageUrl){
     const img=frame.locator('.artwork-media-stage img');
     await img.evaluate(e=>e.decode());
     assert.ok(await img.evaluate(e=>e.naturalWidth>0&&e.naturalHeight>0&&Math.max(e.naturalWidth,e.naturalHeight)<=2000));
     assert.ok((await img.getAttribute('src')).endsWith(image.imageUrl));
     await frame.locator('.artwork-image-button').click();
     assert.equal(await frame.locator('#imageDialog').evaluate(e=>e.open),true);
     await frame.locator('#dialogClose').click();
     await settle(frame);
     assert.equal(await frame.locator('.artwork-image-button').evaluate(e=>e===document.activeElement),true);
     openCount++;
    }else{
     assert.equal(await frame.locator('.artwork-media-stage img').count(),0);
     const text=await frame.locator('.artwork-media-stage').textContent();
     assert.match(text,/Reusable image not yet verified/);
     assert.doesNotMatch(text,/由于作品版权限制|私人学习模式可显示/);
    }
   }
   for(const tab of ['quick','form','context','compare']){
    try { await frame.locator('#detail-tab-'+tab).click({timeout:5000}); }
    catch(error){
     await page.screenshot({path:'/tmp/u7-interaction-failure.png',fullPage:true});
     console.log({embedded,width,work:work.id,tab,rect:await frame.locator('#detail-tab-'+tab).boundingBox()});
     throw error;
    }
    assert.equal(await frame.locator('#detail-tab-'+tab).getAttribute('aria-selected'),'true');
    assert.ok((await frame.locator('#detail-tabpanel').textContent()).trim());
   }
   const target=await frame.locator('.comparison-card').first().getAttribute('data-comparison-id');
   await frame.locator('.comparison-card').first().click();
   assert.equal(await frame.locator('body').evaluate(()=>window.ArtHistoryMap.state.selectedId),target);
  }
  assert.equal(viewCount,20);
  for(const [index,count]of [[1,4],[2,2],[3,3],[4,2]]){
   await frame.locator('#unitFilter').selectOption('7');await settle(frame);
   await frame.locator('.filter-pill').nth(index).click();await settle(frame);
   assert.equal((await frame.locator('.result-count').textContent()).trim(),`当前显示 ${count} 件作品`);
  }
  await frame.locator('#unitFilter').selectOption('7');await settle(frame);
  for(const id of ['periodFilter','typeFilter']){
   const control=frame.locator('#'+id);
   const value=await frame.locator('body').evaluate((_,id)=>{
    const a=window.ArtHistoryMap,w=a.filterWorks(a.ARTWORKS,a.state)[0];
    return id==='periodFilter'?w.period:w.workType;
   },id);
   await control.selectOption(value);await settle(frame);
   const results=await frame.locator('body').evaluate(()=>{
    const a=window.ArtHistoryMap;return a.filterWorks(a.ARTWORKS,a.state).map(w=>({unit:w.unit,period:w.period,workType:w.workType}));
   });
   assert.ok(results.length>0);
   assert.ok(results.every(w=>w.unit===7&&w[id==='periodFilter'?'period':'workType']===value));
  }
  await frame.locator('#unitFilter').selectOption('6');await settle(frame);
  assert.equal(await frame.locator('#periodFilter').inputValue(),'');
  assert.equal(await frame.locator('#typeFilter').inputValue(),'');
  assert.equal(await frame.locator('body').evaluate(()=>window.ArtHistoryMap.state.culture),'all');
  await frame.locator('#unitFilter').selectOption('7');
  await settle(frame);
  await frame.locator('#searchInput').fill('Ardabil');
  await settle(frame);
  assert.equal((await frame.locator('.result-count').textContent()).trim(),'当前显示 1 件作品');
  await frame.locator('#searchInput').fill('');await frame.locator('#resetView').click();
  await settle(frame);
  assert.equal(await frame.locator('body').evaluate(()=>window.ArtHistoryMap.state.transform.scale),1);
  await frame.locator('#zoomIn').click();await settle(frame);
  assert.ok(await frame.locator('body').evaluate(()=>window.ArtHistoryMap.state.transform.scale>1));
  await frame.locator('.map-svg').scrollIntoViewIfNeeded();
  const box=await frame.locator('.map-svg').boundingBox();
  const beforePan=await frame.locator('body').evaluate(()=>({...window.ArtHistoryMap.state.transform}));
  await page.mouse.move(box.x+40,box.y+40);await page.mouse.down();
  await page.mouse.move(box.x+70,box.y+60,{steps:4});await page.mouse.up();
  assert.ok(await frame.locator('body').evaluate(()=>Object.values(window.ArtHistoryMap.state.transform).every(Number.isFinite)));
  const afterPan=await frame.locator('body').evaluate(()=>({...window.ArtHistoryMap.state.transform}));
  assert.ok(beforePan.x!==afterPan.x||beforePan.y!==afterPan.y,'manual pan moves the map');
  await frame.locator('#resetView').click();await settle(frame);
  if(embedded){
   await page.locator('[data-subj="world"]').click();await page.locator('[data-subj="art"]').click();
   assert.equal(await frame.locator('#unitFilter').inputValue(),'7');
  }
  assert.ok(await frame.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  assert.ok(await page.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  await page.screenshot({path:`/tmp/u7-${embedded?'embedded':'standalone'}-${width}.png`,fullPage:true});
  await page.route('**/assets/art-history/u7/ap181-treasury.webp',route=>route.abort());
  await frame.locator('body').evaluate(()=>window.ArtHistoryMap.selectComparison('ap181-petra'));
  await frame.locator('.image-view-switcher button').nth(1).click();
  await frame.locator('.artwork-media-stage .image-fallback').waitFor();
  assert.match(await frame.locator('.image-fallback').textContent(),/Petra/);
  console.log(`${embedded?'embedded':'standalone'} ${width}: 11 works, ${viewCount} views (${openCount} local images), tabs, dialogs, filters, reset passed`);
  await page.close();
 }
}finally{await browser.close();await server.close();}
