import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { discoverPlaywright, discoverBrowser, startStaticServer, runManagedVerification, withBrowserContext, U6_SMOKE_VIEWPORTS } from './verify-art-history-browser.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export function assertRealMediaCoverage(report, expected) {
  assert.equal(report.cases.length, 3, 'three real-media modes');
  for (const [index, entry] of report.cases.entries()) {
    assert.deepEqual(entry.viewport, U6_SMOKE_VIEWPORTS[index]);
    assert.deepEqual(entry.rows.map(row => row.key), expected.map(row => row.key), 'exact ordered 50 views');
    assert.equal(entry.rows.length, 50);
    assert.deepEqual(entry.issues, [], 'no console/page/network errors');
    assert.ok(entry.checkpoints.length >= 50);
    for (const point of entry.checkpoints) {
      assert.ok(point.frame <= 1 && point.host <= 1, 'no horizontal overflow');
    }
    for (const [i, row] of entry.rows.entries()) {
      const target = expected[i];
      assert.equal(row.src, target.src, `${row.key} audited path`);
      if (target.src) {
        assert.ok(row.width > 0 && row.height > 0 && Math.max(row.width, row.height) <= 2000, `${row.key} real decoded dimensions`);
        assert.ok(row.bytes > 0 && row.bytes <= 1572864, `${row.key} file bytes`);
        assert.equal(row.objectFit, 'contain', `${row.key} uncropped image`);
        assert.equal(row.status, 200, `${row.key} actual HTTP response`);
      } else {
        assert.equal(row.imageCount, 0, `${row.key} placeholder has no image`);
        assert.equal(row.newImageRequests, 0, `${row.key} placeholder makes no image requests`);
      }
    }
    assert.equal(entry.dialogFocusRestored, true);
    assert.equal(entry.comparisonReturned, true);
    assert.equal(entry.tabsVisited, 112);
  }
}

async function selectWork(page, frame, work) {
  await frame.locator('#searchInput').fill('');
  await frame.locator('#unitFilter').selectOption(String(work.unit));
  await frame.locator('#resetView').click();
  await frame.locator('#searchInput').fill(`AP ${work.apNumber}`);
  await frame.locator('.site-marker[data-group-kind="region"]').focus();
  await page.keyboard.press('Enter');
  await frame.locator('.site-marker[data-group-kind="site"]').focus();
  await page.keyboard.press('Space');
  await frame.locator('[data-selected-artwork-title]').waitFor();
  assert.equal((await frame.locator('[data-selected-artwork-title]').textContent()).trim(), work.titleEn);
}

export async function runRealMediaVerification() {
  const html = await readFile(join(ROOT, 'art-history-map.html'), 'utf8');
  const works = JSON.parse(html.match(/<script id="artwork-data" type="application\/json">([\s\S]*?)<\/script>/)[1])
    .filter(work => [5, 6].includes(work.unit)).sort((a, b) => a.apNumber - b.apNumber);
  const rights = Object.assign({}, ...await Promise.all([5, 6].map(async unit => JSON.parse(await readFile(join(ROOT, `data/ap-art-history-unit-${unit}-rights.json`), 'utf8')))));
  const expected = works.flatMap(work => work.images.map(view => ({ key: `${work.id}::${view.id}`, src: rights[`${work.id}::${view.id}`].localAssetPath })));
  assert.deepEqual(Object.keys(rights), expected.map(row => row.key));
  assert.equal(expected.filter(row => row.src).length, 26);
  const playwright = await discoverPlaywright();
  const executablePath = await discoverBrowser(playwright.chromium);
  return runManagedVerification({
    startServer: () => startStaticServer(ROOT),
    launchBrowser: () => playwright.chromium.launch({ executablePath, headless: true, args: ['--disable-gpu', '--no-sandbox'] }),
    verify: async ({ server, browser }) => {
      const report = { cases: [] };
      for (const viewport of U6_SMOKE_VIEWPORTS) {
        report.cases.push(await withBrowserContext(browser, { viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' }, async context => {
          const page = await context.newPage();
          const issues = [], imageRequests = [], responses = new Map(), checkpoints = [], rows = [];
          page.on('pageerror', error => issues.push(error.message));
          page.on('console', message => { if (message.type() === 'error') issues.push(message.text()); });
          page.on('request', request => { if (request.resourceType() === 'image') imageRequests.push(request.url()); });
          page.on('requestfailed', request => issues.push(`failed ${request.url()}`));
          page.on('response', response => {
            if (response.url().includes('/assets/art-history/u')) responses.set(new URL(response.url()).pathname.slice(1), response.status());
            if (response.status() >= 400) issues.push(`${response.status()} ${response.url()}`);
          });
          // No routing or mocking: the browser decodes files served from this checkout.
          await page.goto(`${server.baseUrl}/${viewport.mode === 'embedded' ? 'index.html' : 'art-history-map.html'}`);
          let frame = page;
          if (viewport.mode === 'embedded') {
            await page.locator('#home-map-embed').scrollIntoViewIfNeeded();
            await page.locator('.subj-pill[data-subj="art"]').focus();
            await page.keyboard.press('Enter');
            await page.locator('#artMapFrame').waitFor({ state: 'visible' });
            await page.waitForFunction(() => document.querySelector('#artMapFrame')?.contentDocument?.querySelector('#markerLayer .site-marker'));
            frame = page.frames().find(candidate => candidate.url().includes('art-history-map.html'));
          }
          await frame.locator('#markerLayer .site-marker').first().waitFor();
          const checkpoint = async () => {
            await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            const measure = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;
            const point = { frame: await frame.evaluate(measure), host: await page.evaluate(measure) };
            assert.ok(point.frame <= 1 && point.host <= 1, `overflow ${JSON.stringify(point)}`);
            checkpoints.push(point);
          };
          let dialogFocusRestored = false, comparisonReturned = false, tabsVisited = 0;
          for (const work of works) {
            await selectWork(page, frame, work);
            const summary = frame.locator('.selected-summary');
            for (const [index, view] of work.images.entries()) {
              const before = imageRequests.length;
              if (work.images.length > 1) await summary.locator('.image-view-switcher button').nth(index).click();
              const key = `${work.id}::${view.id}`;
              const src = rights[key].localAssetPath;
              assert.equal(view.imageUrl, src);
              if (src) {
                const image = summary.locator('.artwork-image-button img');
                await image.waitFor();
                await image.evaluate(element => element.decode());
                const evidence = await image.evaluate(element => ({ src: element.getAttribute('src'), width: element.naturalWidth, height: element.naturalHeight, objectFit: getComputedStyle(element).objectFit }));
                rows.push({ key, ...evidence, bytes: (await stat(join(ROOT, src))).size, status: responses.get(src) });
                if (!dialogFocusRestored) {
                  const trigger = summary.locator('.artwork-image-button');
                  await trigger.focus();
                  await trigger.click();
                  await frame.locator('#imageDialog').waitFor({ state: 'visible' });
                  await frame.locator('#dialogImage').evaluate(element => element.decode());
                  assert.equal(await frame.locator('#dialogImage').getAttribute('src'), src);
                  await checkpoint();
                  await frame.locator('#dialogClose').click();
                  dialogFocusRestored = await trigger.evaluate(element => document.activeElement === element);
                }
              } else {
                await summary.locator('.rights-placeholder').waitFor();
                assert.equal(await summary.locator('.rights-placeholder-source').getAttribute('href'), view.imageSourceUrl);
                await checkpoint();
                rows.push({ key, src: null, imageCount: await summary.locator('img').count(), newImageRequests: imageRequests.length - before });
              }
              await checkpoint();
            }
            for (const tab of ['quick', 'form', 'context', 'compare']) {
              await frame.locator(`#detail-tab-${tab}`).click();
              assert.equal(await frame.locator(`#detail-tab-${tab}`).getAttribute('aria-selected'), 'true');
              tabsVisited++;
              await checkpoint();
            }
            if (!comparisonReturned) {
              const card = frame.locator('.comparison-card').first();
              const target = Number((await card.locator('span').first().textContent()).match(/AP #(\d+)/)[1]);
              await card.click();
              assert.match(await frame.locator('.work-meta').textContent(), new RegExp(`AP #${target}\\b`));
              await selectWork(page, frame, work);
              comparisonReturned = true;
            }
          }
          return { viewport, rows, issues, checkpoints, tabsVisited, dialogFocusRestored, comparisonReturned };
        }));
      }
      assertRealMediaCoverage(report, expected);
      return report;
    },
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runRealMediaVerification().then(report => console.log(JSON.stringify(report, null, 2))).catch(error => { console.error(error); process.exitCode = 1; });
}
