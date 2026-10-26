import assert from 'node:assert/strict';
import {discoverPlaywright,discoverBrowser,startStaticServer} from './verify-art-history-browser.mjs';

const pw=await discoverPlaywright(),server=await startStaticServer();
const browser=await pw.chromium.launch({executablePath:await discoverBrowser(pw.chromium),headless:true});
const settle=async frame=>{await frame.locator('body').evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
const colors=frame=>frame.locator('.world-geography [data-color-region]').evaluateAll(paths=>Object.fromEntries(paths.map(p=>[p.dataset.colorRegion,{fill:getComputedStyle(p).fill,opacity:+getComputedStyle(p).fillOpacity}])));
try{
  for(const embedded of [false,true])for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(server.baseUrl+(embedded?'/index.html':'/art-history-map.html'));
    if(embedded){await page.locator('#home-map-embed').scrollIntoViewIfNeeded();await page.locator('[data-subj="art"]').click();}
    const frame=embedded?page.frameLocator('#artMapFrame'):page;
    await frame.locator('.site-marker[data-group-kind="unit"]').nth(9).waitFor();
    assert.equal(Object.keys(await colors(frame)).length,6,'six native geographic colors');
    assert.ok(Object.values(await colors(frame)).every(c=>c.opacity===.55),'All Units highlights all represented regions');
    const mapHeight=await frame.locator('.map-svg').evaluate(e=>e.getBoundingClientRect().height);
    await frame.locator('.site-marker[data-group-kind="unit"]').nth(7).press('Enter');await settle(frame);
    assert.equal((await colors(frame)).asia.opacity,.55,'Unit bubble highlights Asia');
    assert.equal((await colors(frame)).europe.opacity,.22,'Unit bubble dims Europe');
    await frame.locator('#unitFilter').selectOption('2');await settle(frame);
    let painted=await colors(frame);
    assert.deepEqual(painted.asia,{fill:'rgb(217, 164, 65)',opacity:.22});
    assert.deepEqual(painted.europe,{fill:'rgb(111, 155, 199)',opacity:.55});
    const before=await colors(frame);
    await frame.locator('#zoomIn').click();await settle(frame);
    assert.deepEqual(await colors(frame),before,'manual zoom preserves scope');
    await frame.locator('.filter-pill').filter({hasText:/^Egypt$/}).click();await settle(frame);
    assert.equal((await colors(frame)).africa.opacity,.55);
    assert.equal((await colors(frame)).europe.opacity,.22,'culture filter updates scope');
    for(const id of ['periodFilter','typeFilter']){
      await frame.locator('#unitFilter').selectOption('2');await settle(frame);
      const value=await frame.locator('#'+id+' option').nth(1).getAttribute('value');
      await frame.locator('#'+id).selectOption(value);await settle(frame);
      const expected=await frame.locator('body').evaluate(()=>{const a=window.ArtHistoryMap;return a.getRegionColorScope(a.filterWorks(a.ARTWORKS,a.state),a.state).active;});
      for(const [key,c]of Object.entries(await colors(frame)))assert.equal(c.opacity,expected.includes(key)?.55:.22,id+' '+key);
    }
    await frame.locator('#unitFilter').selectOption('9');await settle(frame);
    assert.equal((await colors(frame)).oceania.opacity,.55);
    assert.equal(await frame.locator('[data-color-region="oceania"]').count(),7,'explicit Pacific paths');
    await frame.locator('#searchInput').fill('zz-no-work-zz');await settle(frame);
    assert.ok(Object.values(await colors(frame)).every(c=>c.opacity===.22),'empty search clears highlights');
    for(const ap of [230,241]){
      await frame.locator('#unitFilter').selectOption('10');await settle(frame);
      await frame.locator('#searchInput').fill(`AP ${ap}`);await settle(frame);
      assert.equal(await frame.locator('.site-marker').count(),0);
      assert.ok(Object.values(await colors(frame)).every(c=>c.opacity===.22),'unverified site does not highlight geography');
    }
    await frame.locator('#unitFilter').selectOption('2');await settle(frame);
    assert.equal(await frame.locator('.map-svg').evaluate(e=>e.getBoundingClientRect().height),mapHeight);
    assert.equal(await frame.locator('.world-geography').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.ok(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(errors,[]);
    await page.screenshot({path:`/tmp/apah-region-colors-${embedded?'embedded':'standalone'}-${width}.png`,fullPage:true});
    console.log(`${embedded?'embedded':'standalone'} ${width}: colors, hierarchy, filters, zoom, unmapped sites, overflow and console passed`);
    await page.close();
  }
}finally{await browser.close();await server.close();}
