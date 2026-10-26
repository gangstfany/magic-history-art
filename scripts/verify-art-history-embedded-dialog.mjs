import assert from 'node:assert/strict';
import {discoverPlaywright,discoverBrowser,startStaticServer} from './verify-art-history-browser.mjs';
const pw=await discoverPlaywright(),server=await startStaticServer();
const browser=await pw.chromium.launch({executablePath:await discoverBrowser(pw.chromium),headless:true});
try {
 for (const width of [390,1440]) {
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
  await page.goto(server.baseUrl+'/index.html');
  await page.locator('#home-map-embed').scrollIntoViewIfNeeded();
  await page.locator('[data-subj="art"]').click();
  const frame=page.frameLocator('#artMapFrame');
  await frame.locator('.site-marker').first().waitFor();
  await frame.locator('body').evaluate(()=>window.ArtHistoryMap.selectComparison('ap181-petra'));
  await frame.locator('.image-view-switcher button').nth(1).click();
  await frame.locator('.artwork-media-stage img').evaluate(e=>e.decode());
  await frame.locator('.artwork-image-button').click();
  await frame.locator('#dialogImage').evaluate(e=>e.decode());
  await frame.locator('body').evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const bounds=await frame.locator('#dialogClose').boundingBox();
  const frameBounds=await page.locator('#artMapFrame').boundingBox();
  console.log({width,bounds,frameBounds});
  assert.ok(bounds.y>=0&&bounds.y+bounds.height<=1000,'dialog close must fit the parent viewport');
  const imageBounds=await frame.locator('#dialogImage').boundingBox();
  assert.ok(imageBounds.y>=0&&imageBounds.y+imageBounds.height<=1000,'full image fits the parent viewport');
  await page.screenshot({path:`/tmp/art-dialog-${width}.png`});
  await page.evaluate(()=>window.scrollBy(0,80));
  await frame.locator('body').evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const moved=await frame.locator('#dialogClose').boundingBox();
  console.log({width,afterHostScroll:moved});
  assert.ok(moved.y>=0&&moved.y+moved.height<=1000,'dialog close follows host scroll');
  await page.setViewportSize({width,height:900});
  await frame.locator('body').evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const resized=await frame.locator('#dialogClose').boundingBox();
  assert.ok(resized.y>=0&&resized.y+resized.height<=900,'dialog close follows host resize');
  await page.keyboard.press('Tab');
  assert.equal(await frame.locator('#imageDialog').evaluate(e=>e.contains(document.activeElement)),true);
  await frame.locator('#dialogClose').click({timeout:3000});
  assert.equal(await frame.locator('#imageDialog').evaluate(e=>e.open),false);
  assert.equal(await frame.locator('.artwork-image-button').evaluate(e=>e===document.activeElement),true);
  await frame.locator('.artwork-image-button').click();
  await page.keyboard.press('Escape');
  assert.equal(await frame.locator('#imageDialog').evaluate(e=>e.open),false);
  await page.close();
 }
} finally {await browser.close();await server.close();}
