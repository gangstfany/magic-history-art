import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { discoverPlaywright, discoverBrowser, startStaticServer } from './verify-art-history-browser.mjs';

const sourceFiles = ['index.html', 'world-map.html', 'art-history-map.html'];
const hashes = async () => Promise.all(sourceFiles.map(async file => createHash('sha256')
  .update(await readFile(new URL('../' + file, import.meta.url))).digest('hex')));
const before = await hashes();
const pw = await discoverPlaywright();
const server = await startStaticServer();
const browser = await pw.chromium.launch({ executablePath: await discoverBrowser(pw.chromium), headless:true });
const typography = element => {
  const css = getComputedStyle(element);
  return [css.fontSize, css.fontWeight, css.lineHeight];
};
// Nested-frame style invalidation is painted asynchronously. Check the rendered
// condition with a fresh locator instead of reading stale metrics in that task.
async function checkTypography(locator, expected) {
  const deadline = Date.now() + 3000;
  let actual;
  do {
    actual = await locator.evaluate(typography);
    if (expected.every((value,index) => actual[index] === value)) return;
    await new Promise(resolve => setTimeout(resolve,20));
  } while (Date.now() < deadline);
  assert.deepEqual(actual.slice(0,expected.length), expected);
}
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport:{ width,height:1000 }, reducedMotion:'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const response = await page.goto(`${server.baseUrl}/prototypes/unified-map-typography.html`);
    assert.equal(response.status(), 200, 'prototype page exists');
    await page.waitForFunction(() => document.body.dataset.ready === 'true');
    const home = page.frameLocator('#preview');
    const art = home.frameLocator('#artMapFrame');
    assert.ok(await art.locator('body').evaluate(() => window.ArtHistoryMap.state.transform.scale > 1), 'selected artwork automatically focused');
    await art.locator('#resetView').click();
    await page.waitForTimeout(250);
    assert.equal(await art.locator('body').evaluate(() => window.ArtHistoryMap.state.transform.scale), 1, 'overview is not undone by automatic focus');
    const canvasHeight = width > 900 ? 500 : 300;
    assert.equal(await art.locator('.map-svg').evaluate(e => Math.round(e.getBoundingClientRect().height)), canvasHeight, 'unified Art canvas height');
    assert.ok(await art.locator('.map-svg').evaluate(e => {
      const box=e.closest('.map-panel').getBoundingClientRect(), m=e.getScreenCTM();
      return m.e >= box.left - 1 && m.e + m.a * 1600 <= box.right + 1
        && m.f >= box.top - 1 && m.f + m.d * 800 <= box.bottom + 1;
    }), 'complete Art world overview remains visible without cropping');
    assert.equal(await art.locator('.map-panel').evaluate(e => getComputedStyle(e).backgroundColor),
      await art.locator('.world-geography rect').first().evaluate(e => getComputedStyle(e).fill),
      'canvas and geography have the same background, with no contrasting band');
    for (const unit of ['1','2','6']) {
      await art.locator('#unitFilter').selectOption(unit);
      await page.waitForTimeout(250);
      assert.equal(await art.locator('html').getAttribute('data-prototype-focus'), 'range');
      const range = await art.locator('body').evaluate(() => {
        const api=window.ArtHistoryMap, t=api.state.transform;
        const points=api.filterWorks(api.ARTWORKS,api.state).map(api.toWorldCoordinates);
        return { scale:t.scale, contained:points.every(p => p.x*t.scale+t.x >= 0
          && p.x*t.scale+t.x <= 1600 && p.y*t.scale+t.y >= 0 && p.y*t.scale+t.y <= 800) };
      });
      assert.ok(range.contained, `U${unit}: all filtered geographic anchors remain visible`);
      if (unit === '2' || unit === '6') assert.ok(range.scale > 1, `U${unit}: concentrated region is enlarged`);
    }
    await art.locator('#searchInput').fill('no-matching-work-xyz');
    await page.waitForTimeout(300);
    assert.ok(await art.locator('body').evaluate(() => Object.values(window.ArtHistoryMap.state.transform).every(Number.isFinite)), 'empty search does not corrupt camera');
    await page.locator('button[data-scene="art"]').click();
    await checkTypography(art.locator('.work-title-en'), ['19px','800','24.7px']);
    await checkTypography(art.locator('.study-block p').first(), ['13.5px','600','20.925px']);
    await checkTypography(art.locator('.filter-pill').first(), ['12.5px','700','16.875px']);
    await checkTypography(art.locator('.work-title-zh'), ['12px','600','18.6px']);
    const work = await art.locator('.work-title-en').innerText();
    await page.locator('[data-mode="original"]').click();
    await checkTypography(art.locator('.filter-pill').first(), ['13px','600']);
    assert.equal(await art.locator('.work-title-en').innerText(), work, 'toggle preserves selected artwork');
    await page.locator('[data-mode="unified"]').click();
    await page.locator('[data-scene="event"]').click();
    await home.locator('#home-events .ec-trig').first().waitFor();
    assert.equal(await home.frameLocator('#worldMapFrame').locator('.map-zone').evaluate(e => Math.round(e.getBoundingClientRect().height)), canvasHeight, 'same World canvas height');
    await checkTypography(home.locator('.city-name'), ['19px','800','24.7px']);
    await checkTypography(home.locator('.ec-trig').first(), ['13.5px','600','20.925px']);
    await page.locator('[data-scene="study"]').click();
    await home.locator('.location-study-core p:not(.location-study-region)').first().waitFor();
    await checkTypography(home.locator('.location-study-title'), ['19px','800','24.7px']);
    await checkTypography(home.locator('.location-study-core p:not(.location-study-region)').first(), ['13.5px','600','20.925px']);
    await page.locator('[data-mode="original"]').click();
    await checkTypography(home.locator('.location-study-title'), ['22px','700','27.5px']);
    await page.locator('[data-mode="unified"]').click();
    await page.locator('[data-scene="art"]').click();
    await art.locator('.detail-tab').last().click();
    await checkTypography(art.locator('.comparison-card strong').first(), ['13.5px','700','20.925px']);
    for (const doc of [page.locator('html'), home.locator('html'), art.locator('html')]) {
      assert.ok(await doc.evaluate(e => e.scrollWidth - e.clientWidth) <= 1, `${width}: no horizontal overflow`);
    }
    await page.screenshot({ path:`/tmp/unified-typography-${width}.png` });
    assert.deepEqual(errors, []);
    console.log(`${width}: shared typography, original restoration, content preservation and layout passed`);
    await page.close();
  }
  assert.deepEqual(await hashes(), before, 'production files unchanged');
} finally {
  await browser.close();
  await server.close();
}
