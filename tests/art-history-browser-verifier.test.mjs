import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERIFIER_URL = new URL('../scripts/verify-art-history-browser.mjs', import.meta.url);
const RELEASE_VERIFIER_URL = new URL('../scripts/verify-art-history-release.mjs', import.meta.url);
const PRIVATE_LEAK_VERIFIER_URL = new URL('../scripts/verify-art-history-private-leaks.mjs', import.meta.url);
const RELEASE_STAGE_URL = new URL('../scripts/art-history-release-stage.mjs', import.meta.url);
const HOMEPAGE_URL = new URL('../index.html', import.meta.url);
const ART_MAP_URL = new URL('../art-history-map.html', import.meta.url);
const NINE_WORKS_URL = new URL('./fixtures/u2-imported-browser.json', import.meta.url);
const SOURCE_FIXTURE_URL = new URL('./fixtures/u2-corrected-and-imported.json', import.meta.url);
const U1_BROWSER_FIXTURE = new URL('./fixtures/u1-browser.json', import.meta.url);
const U1_CANONICAL_FIXTURE = new URL('./fixtures/u1-canonical.json', import.meta.url);
const U3_BROWSER_FIXTURE = new URL('./fixtures/u3-browser.json', import.meta.url);
const U3_CANONICAL_FIXTURE = new URL('./fixtures/u3-canonical.json', import.meta.url);
const U4_BROWSER_FIXTURE = new URL('./fixtures/u4-browser.json', import.meta.url);
const U4_CANONICAL_FIXTURE = new URL('./fixtures/u4-canonical.json', import.meta.url);
const U5_BROWSER_FIXTURE = new URL('./fixtures/u5-browser.json', import.meta.url);
const U5_CANONICAL_FIXTURE = new URL('./fixtures/u5-canonical.json', import.meta.url);
const U5_PLACEHOLDER_AUTHORITY = new URL('../data/ap-art-history-unit-5-placeholder-authority.json', import.meta.url);
const PROJECT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const U6_EXPECTED_VIEW_IDS = [
  ['conical-tower', 'circular-wall'], ['mosque', 'monday-market'],
  ['wall-plaque', 'oba-context'], ['golden-stool', 'stool-context'],
  ['ndop', 'ruler-context'], ['primary'], ['primary'],
  ['mask', 'performance-context'], ['mask', 'performance-context'], ['primary'],
  ['memory-board', 'contextual'], ['mask', 'performance-context'], ['primary'], ['primary'],
];

test('U6 smoke exports the exact immutable standalone desktop/mobile and embedded matrix', async () => {
  const verifier = await import(VERIFIER_URL.href);
  assert.deepEqual(verifier.U6_SMOKE_VIEWPORTS, [
    { width: 1365, height: 768, mode: 'standalone' },
    { width: 390, height: 844, mode: 'standalone' },
    { width: 1024, height: 768, mode: 'embedded' },
  ]);
  assert.ok(Object.isFrozen(verifier.U6_SMOKE_VIEWPORTS));
  assert.ok(verifier.U6_SMOKE_VIEWPORTS.every(Object.isFrozen));
  assert.equal(typeof verifier.runFocusedU6Verification, 'function');
});

test('U6 smoke evidence requires three cases, numeric AP 167-180, 23 views, every tab and UI round trips', async () => {
  const verifier = await import(VERIFIER_URL.href);
  assert.equal(typeof verifier.assertU6SmokeCoverage, 'function');
  const report = {
    kind: 'u6-fourteen-works',
    cases: verifier.U6_SMOKE_VIEWPORTS.map((viewport) => ({
      viewport,
      regions: ['Southern Africa · 1 piece', 'West Africa · 7 pieces', 'Central Africa · 6 pieces'],
      works: U6_EXPECTED_VIEW_IDS.map((viewIds, index) => ({
        apNumber: 167 + index,
        selected: true,
        viewIds,
        tabIds: ['quick', 'form', 'context', 'compare'],
      })),
      workCount: 14, viewCount: 23, tabCount: 56,
      viewButtonActivations: 18, singleViewSelections: 5,
      comparison: { fromApNumber: 167, targetId: 'ap11-shaman', followed: true, returned: true },
      dialog: { apNumber: 167, viewId: 'conical-tower', focusRestored: true },
      horizontalOverflow: 0, hostHorizontalOverflow: 0,
      overflowHistory: [{ checkpoint: 'initial', horizontalOverflow: 0, hostHorizontalOverflow: 0 }],
      issues: [],
    })),
  };
  assert.doesNotThrow(() => verifier.assertU6SmokeCoverage(report));
  const mutations = [
    ['missing case', (copy) => copy.cases.pop()],
    ['missing work', (copy) => copy.cases[0].works.pop()],
    ['wrong AP order', (copy) => copy.cases[0].works.reverse()],
    ['unselected work', (copy) => { copy.cases[0].works[0].selected = false; }],
    ['wrong view', (copy) => { copy.cases[0].works[0].viewIds[0] = 'wrong'; }],
    ['missing tab', (copy) => copy.cases[0].works[0].tabIds.pop()],
    ['unclicked view button', (copy) => { copy.cases[0].viewButtonActivations = 17; }],
    ['unselected sole primary view', (copy) => { copy.cases[0].singleViewSelections = 4; }],
    ['wrong region', (copy) => { copy.cases[0].regions[1] = 'West Africa · 6 pieces'; }],
    ['comparison not returned', (copy) => { copy.cases[0].comparison.returned = false; }],
    ['lost dialog focus', (copy) => { copy.cases[0].dialog.focusRestored = false; }],
    ['overflow', (copy) => { copy.cases[0].horizontalOverflow = 1; }],
    ['transient overflow', (copy) => { copy.cases[0].overflowHistory[0].horizontalOverflow = 1; }],
    ['host overflow', (copy) => { copy.cases[2].hostHorizontalOverflow = 1; }],
    ['page error', (copy) => copy.cases[0].issues.push('pageerror: U6 failure')],
    ['console error', (copy) => copy.cases[0].issues.push('console error: U6 failure')],
  ];
  for (const [label, mutate] of mutations) {
    const copy = structuredClone(report);
    mutate(copy);
    assert.throws(() => verifier.assertU6SmokeCoverage(copy), undefined, label);
  }
});

test('focused U6 runner uses real hierarchy, tabs, views, comparison and dialog controls without changing default CLI routing', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');
  assert.match(source, /export async function runFocusedU6Verification\(/);
  const focused = source.slice(source.indexOf('export async function runFocusedU6Verification'), source.indexOf('export async function runFocusedU3FaultVerification'));
  for (const helper of ['discoverPlaywright', 'discoverBrowser', 'startStaticServer', 'runManagedVerification']) {
    assert.ok(focused.includes(helper), `focused lifecycle reuses ${helper}`);
  }
  const smoke = source.slice(source.indexOf('async function selectU6Work'), source.indexOf('export async function runFocusedImportedVerification'));
  for (const control of ['#unitFilter', '#searchInput', 'data-group-kind="region"', 'data-group-kind="site"', '.detail-tab', '.image-view-switcher button', '.comparison-card', '#dialogClose']) {
    assert.ok(smoke.includes(control), `U6 interacts with ${control}`);
  }
  assert.match(smoke, /for \(const work of works\)/);
  assert.match(smoke, /for \(const \[imageIndex, expected\] of work\.images\.entries\(\)\)/);
  assert.match(smoke, /for \(const id of U6_TAB_IDS\)/);
  assert.match(smoke, /aria-pressed/);
  assert.match(smoke, /assertDialogFocusRestored/);
  assert.match(smoke, /document\.activeElement === element/);
  assert.match(smoke, /assertNoHorizontalOverflow/);
  assert.match(smoke, /installErrorCollection/);
  assert.match(smoke, /assertNoCollectedIssues/);
  assert.match(source, /if \(process\.argv\.includes\('--u6-only'\)\) return runFocusedU6Verification\(\);/);
  assert.match(source, /if \(process\.argv\.includes\('--u5-only'\)\) return runFocusedU5Verification\(\);\s*return runVerification\(\);/);
});

function projectBrowserFixture(canonical) {
  return canonical.artworks.map((work) => {
    const media = Array.isArray(work.images)
      ? work.images
      : [{
          label: 'Primary view',
          imageUrl: work.imageUrl,
          imageAlt: work.imageAlt,
          imageSourceName: work.imageSourceName,
          imageSourceUrl: work.imageSourceUrl,
        }];
    const credits = Array.isArray(canonical.credits[work.id])
      ? canonical.credits[work.id]
      : [canonical.credits[work.id]];
    return {
      apNumber: work.apNumber,
      id: work.id,
      titleEn: work.titleEn,
      titleZh: work.titleZh,
      images: media.map((image, index) => ({
        ...image,
        ...credits[index],
      })),
    };
  });
}

function projectU3BrowserFixture(canonical) {
  return canonical.artworks.map((work) => ({
    id: work.id,
    apNumber: work.apNumber,
    titleEn: work.titleEn,
    titleZh: work.titleZh,
    unit: work.unit,
    region: work.region,
    siteName: work.siteName,
    provenanceQualifier: work.provenanceQualifier ?? null,
    images: work.images.map(({
      id,
      label,
      imageUrl,
      imageAlt,
      imageSourceUrl,
    }) => ({
      id,
      label,
      imageUrl,
      imageAlt,
      imageSourceUrl,
    })),
  }));
}

function projectU4BrowserFixture(canonical) {
  return canonical.artworks.map((work) => ({
    id: work.id,
    apNumber: work.apNumber,
    titleEn: work.titleEn,
    titleZh: work.titleZh,
    unit: work.unit,
    region: work.region,
    siteName: work.siteName,
    provenanceQualifier: work.provenanceQualifier ?? null,
    images: work.images.map(({
      id,
      label,
      imageUrl,
      imageAlt,
      imageSourceUrl,
      ...image
    }) => ({
      id,
      label,
      imageUrl,
      imageAlt,
      imageSourceUrl,
      ...(image.mediaStatus ? { mediaStatus: image.mediaStatus } : {}),
    })),
  }));
}

function projectU5BrowserFixture(canonical) {
  return canonical.artworks.map((work) => ({
    id: work.id,
    apNumber: work.apNumber,
    unit: work.unit,
    region: work.region,
    siteName: work.siteName,
    traditionGroup: work.traditionGroup,
    viewIds: work.images.map(({ id }) => id),
    images: work.images.map(({ id, imageUrl, mediaStatus }) => ({
      id, imageUrl, mediaStatus: mediaStatus ?? 'local',
    })),
  }));
}

function createFakeImageLocator(element, waitFor = async () => {}) {
  return {
    waitFor,
    evaluate: async (callback, argument) => callback(element, argument),
  };
}

function elementAttributes(html, tagName, id) {
  const markup = html.match(
    new RegExp(`<${tagName}\\b[^>]*\\bid=(?:"${id}"|'${id}')[^>]*>`, 'i'),
  )?.[0];
  assert.ok(markup, `missing ${tagName}#${id}`);
  const attributes = {};
  const source = markup.slice(markup.indexOf(' ') + 1, -1);
  for (const match of source.matchAll(
    /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g,
  )) {
    attributes[match[1]] = match[2] ?? match[3] ?? match[4] ?? true;
  }
  return attributes;
}

function cssDeclarations(html, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const body = html.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))?.[1];
  assert.ok(body, `missing CSS rule ${selector}`);
  return Object.fromEntries(body
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separator = declaration.indexOf(':');
      return [
        declaration.slice(0, separator).trim(),
        declaration.slice(separator + 1).trim(),
      ];
    }));
}

test('bounded image readiness rejects already-failed and never-settling images', async () => {
  const verifier = await import(VERIFIER_URL.href);
  const alreadyFailed = {
    complete: true,
    naturalWidth: 0,
    addEventListener() {
      assert.fail('already-failed image must not attach listeners');
    },
    removeEventListener() {
      assert.fail('already-failed image must not remove unattached listeners');
    },
  };
  await assert.rejects(
    verifier.waitForVerifierImage(
      createFakeImageLocator(alreadyFailed),
      'standalone AP 48 primary https://example.invalid/already-failed.jpg',
      25,
    ),
    /standalone AP 48 primary.*already-failed\.jpg.*already failed/,
  );

  const listeners = new Map();
  const removals = [];
  const neverSettles = {
    complete: false,
    naturalWidth: 0,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
      removals.push(type);
    },
  };
  const startedAt = Date.now();
  await assert.rejects(
    verifier.waitForVerifierImage(
      createFakeImageLocator(neverSettles),
      'embedded AP 60 stained-glass https://example.invalid/never-settles.jpg',
      25,
    ),
    /embedded AP 60 stained-glass.*never-settles\.jpg.*timed out after 25 ms/,
  );
  assert.ok(Date.now() - startedAt < 500, 'image timeout should stay test-bounded');
  assert.deepEqual(removals.sort(), ['error', 'load']);
  assert.equal(listeners.size, 0, 'timeout must remove both image listeners');
});

test('bounded image readiness covers attachment, load, error, and competing events', async () => {
  const verifier = await import(VERIFIER_URL.href);
  let attachmentOptions;
  await assert.rejects(
    verifier.waitForVerifierImage(
      createFakeImageLocator({}, async (options) => {
        attachmentOptions = options;
        throw new Error('locator did not attach');
      }),
      'standalone AP 48 missing image',
      25,
    ),
    /standalone AP 48 missing image.*not attached.*25 ms/,
  );
  assert.deepEqual(attachmentOptions, { state: 'attached', timeout: 25 });

  for (const [event, expectation] of [
    ['load', 'resolves'],
    ['error', 'rejects'],
  ]) {
    const listeners = new Map();
    const removed = [];
    const image = {
      complete: false,
      naturalWidth: 0,
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      removeEventListener(type, listener) {
        removed.push(type);
      },
    };
    const readiness = verifier.waitForVerifierImage(
      createFakeImageLocator(image),
      `embedded AP 60 ${event} event`,
      100,
    );
    await new Promise((resolve) => setImmediate(resolve));
    const loadListener = listeners.get('load');
    const errorListener = listeners.get('error');
    if (event === 'load') image.naturalWidth = 100;
    listeners.get(event)();
    if (expectation === 'resolves') {
      await readiness;
    } else {
      await assert.rejects(readiness, /embedded AP 60 error event.*emitted an error event/);
    }
    assert.deepEqual(removed.sort(), ['error', 'load']);
    const competingListener = event === 'load' ? errorListener : loadListener;
    competingListener();
  }
});

test('release child stage has a bounded timeout and waits for child termination', async () => {
  const {
    RELEASE_STAGE_TIMEOUT_MS,
    runReleaseStage,
  } = await import(RELEASE_STAGE_URL.href);
  assert.equal(RELEASE_STAGE_TIMEOUT_MS, 12 * 60 * 1000);

  const startedAt = Date.now();
  await assert.rejects(
    runReleaseStage({
      label: 'test TERM-resistant child',
      command: process.execPath,
      args: [
        '-e',
        "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)",
      ],
      timeoutMs: 250,
      forceKillMs: 30,
      stdio: 'ignore',
    }),
    /Release stage timed out during test TERM-resistant child after 250 ms/,
  );
  assert.ok(Date.now() - startedAt >= 265, 'runner must await the SIGKILL fallback');
  assert.ok(Date.now() - startedAt < 1000, 'release timeout test must not wait minutes');
});

test('private leak guards reject tracked U4/U5 bundles, local paths, and restricted URL hashes', async () => {
  const verifier = await import(PRIVATE_LEAK_VERIFIER_URL.href);

  assert.doesNotThrow(() => verifier.assertNoTrackedPrivatePaths([
    '.gitignore',
    'art-history-map.html',
  ]));
  assert.throws(
    () => verifier.assertNoTrackedPrivatePaths([
      'art-history-map.html',
      '.private-media/u4/ap140-two-fridas-primary.jpg',
    ]),
    /tracked private-media path.*ap140-two-fridas-primary\.jpg/,
  );
  assert.throws(
    () => verifier.assertNoTrackedPrivatePaths([
      'art-history-map.html',
      '.private-media/u5/ap153-chavin-huantar-relief-sculpture.jpg',
    ]),
    /tracked private-media path.*u5.*ap153-chavin-huantar-relief-sculpture\.jpg/,
  );

  assert.doesNotThrow(() => verifier.assertNoAbsolutePrivatePaths([
    { path: 'index.html', text: 'art-history-map.html?embed=1' },
  ]));
  for (const [path, text, expected] of [
    ['index.html', ['', 'Users', 'student', 'private.jpg'].join('/'), /index\.html.*\/Users\//],
    ['art-history-map.html', ['file', ':///tmp/private.jpg'].join(''), /art-history-map\.html.*file:\/\//],
    ['data/leak.json', ['', 'home', 'student', 'private.jpg'].join('/'), /data\/leak\.json.*\/home\//],
    ['docs/data-sources/leak.md', ['C', ':\\private\\u5.jpg'].join(''), /docs\/data-sources\/leak\.md.*Windows drive path/],
    ['index.html', '%2FUsers%2Fstudent%2Fprivate.jpg', /index\.html.*\/Users\//],
    ['art-history-map.html', 'file%3A%2F%2F%2Ftmp%2Fprivate.jpg', /art-history-map\.html.*file:\/\//],
    ['data/leak.json', 'C%3A%5CUsers%5Cstudent%5Cprivate.jpg', /data\/leak\.json.*Windows drive path/],
    ['scripts/leak.mjs', '%252FUsers%252Fstudent%252Fprivate.jpg', /scripts\/leak\.mjs.*\/Users\//],
    ['world-map.html', '&#x2F;home&#x2F;student&#x2F;private.jpg', /world-map\.html.*\/home\//],
  ]) {
    assert.throws(
      () => verifier.assertNoAbsolutePrivatePaths([{ path, text }]),
      expected,
    );
  }

  const restrictedUrl = 'https://example.invalid/restricted-study-image.jpg';
  const restrictedHash = verifier.hashAssetUrl(restrictedUrl);
  assert.equal(
    verifier.hashAssetUrl('HTTPS://EXAMPLE.INVALID:443/restricted-study-image.jpg#preview'),
    restrictedHash,
    'restricted URL identity must ignore HTTPS/host casing, default port, and fragment',
  );
  for (const browserEquivalentUrl of [
    String.raw`https:\\example.invalid\restricted-study-image.jpg`,
    String.raw`https:/\example.invalid/restricted-study-image.jpg`,
    String.raw`HTTPS:\\EXAMPLE.INVALID:443\restricted-study-image.jpg#preview`,
  ]) {
    assert.equal(
      verifier.hashAssetUrl(browserEquivalentUrl),
      restrictedHash,
      'WHATWG HTTPS backslash equivalents must share the restricted URL identity',
    );
  }
  assert.equal(
    verifier.hashAssetUrl('https://example.invalid/a%2fb?q=%7e'),
    verifier.hashAssetUrl('https://example.invalid/a%2Fb?q=%7E'),
    'percent-triplet hexadecimal casing must not create a distinct URL identity',
  );
  assert.notEqual(
    verifier.hashAssetUrl('https://example.invalid/a%2Fb?q=%7E'),
    verifier.hashAssetUrl('https://example.invalid/a/b?q=~'),
    'canonicalization must not decode path or query octets that a server may distinguish',
  );
  assert.notEqual(
    verifier.hashAssetUrl('https://example.invalid/path?a=1&b=2'),
    verifier.hashAssetUrl('https://example.invalid/path?b=2&a=1'),
    'canonicalization must preserve query ordering semantics',
  );
  assert.doesNotThrow(() => verifier.assertNoRestrictedAssetUrls(
    [{
      path: 'data/distinct-url.json',
      text: 'https://example.invalid/a%2Fb?q=%7E',
    }],
    new Set([verifier.hashAssetUrl('https://example.invalid/a/b?q=~')]),
  ), 'text normalization must not decode path/query octets inside an already-visible URL');
  assert.doesNotThrow(() => verifier.assertNoRestrictedAssetUrls(
    [{
      path: 'data/distinct-backslash-url.json',
      text: String.raw`https:\\example.invalid\a%2Fb?q=%7E`,
    }],
    new Set([verifier.hashAssetUrl('https://example.invalid/a/b?q=~')]),
  ), 'backslash-equivalent URLs must retain distinct path and query octets');
  assert.doesNotThrow(() => verifier.assertNoRestrictedAssetUrls(
    [{
      path: 'scripts/url-template.mjs',
      text: String.raw`const assetUrl = ` + '`https://${host}/asset.jpg`;' + String.raw` const urlPattern = /https:\/\/[^\s]+/;`,
    }],
    new Set([restrictedHash]),
  ), 'non-URL source templates must not abort the tracked-text scan');
  assert.doesNotThrow(() => verifier.assertNoRestrictedAssetUrls(
    [{ path: 'art-history-map.html', text: 'https://example.org/public-source-page' }],
    new Set([restrictedHash]),
  ));
  assert.throws(
    () => verifier.assertNoRestrictedAssetUrls(
      [{ path: 'tests/fixtures/leak.json', text: `{"imageUrl":"${restrictedUrl}"}` }],
      new Set([restrictedHash]),
    ),
    /tests\/fixtures\/leak\.json.*restricted asset URL hash/,
  );
  for (const encodedUrl of [
    String.raw`https:\/\/example.invalid\/restricted-study-image.jpg`,
    'https%3A%2F%2Fexample.invalid%2Frestricted-study-image.jpg',
    'https%253A%252F%252Fexample.invalid%252Frestricted-study-image.jpg',
    'https&colon;&sol;&sol;example.invalid&sol;restricted-study-image.jpg',
    'HTTPS://example.invalid/restricted-study-image.jpg',
    'https://EXAMPLE.INVALID/restricted-study-image.jpg',
    'https://example.invalid:443/restricted-study-image.jpg',
    'https://example.invalid/restricted-study-image.jpg#preview',
    'HTTPS://EXAMPLE.INVALID:443/restricted-study-image.jpg#preview',
    String.raw`HTTPS:\/\/EXAMPLE.INVALID:443\/restricted-study-image.jpg#preview`,
    'HTTPS%3A%2F%2FEXAMPLE.INVALID%3A443%2Frestricted-study-image.jpg%23preview',
    'HTTPS%253A%252F%252FEXAMPLE.INVALID%253A443%252Frestricted-study-image.jpg%2523preview',
    'HTTPS&colon;&sol;&sol;EXAMPLE.INVALID&colon;443&sol;restricted-study-image.jpg&#35;preview',
    String.raw`https:\\example.invalid\restricted-study-image.jpg`,
    String.raw`https:/\example.invalid/restricted-study-image.jpg`,
    String.raw`HTTPS:\\EXAMPLE.INVALID:443\restricted-study-image.jpg#preview`,
    String.raw`HTTPS:\\\\EXAMPLE.INVALID:443\\restricted-study-image.jpg#preview`,
    'HTTPS%3A%5C%5CEXAMPLE.INVALID%3A443%5Crestricted-study-image.jpg%23preview',
    'https%3A%2F%5Cexample.invalid%2Frestricted-study-image.jpg',
    'HTTPS%253A%255C%255CEXAMPLE.INVALID%253A443%255Crestricted-study-image.jpg%2523preview',
    'HTTPS&colon;&bsol;&bsol;EXAMPLE.INVALID&colon;443&bsol;restricted-study-image.jpg&#35;preview',
  ]) {
    assert.throws(
      () => verifier.assertNoRestrictedAssetUrls(
        [{
          path: 'scripts/encoded-leak.mjs',
          text: `https://example.org/public-source ${encodedUrl}`,
        }],
        new Set([restrictedHash]),
      ),
      /scripts\/encoded-leak\.mjs.*restricted asset URL hash/,
    );
  }

  assert.ok(
    verifier.RESTRICTED_ASSET_URL_HASHES.has(
      '3ddd0a813d02389521bd5b64a97068b3455a8800f556a8a846a7940a89953c5a',
    ),
    'U5 audited restricted direct URL digest must remain guarded',
  );
  assert.equal(verifier.RESTRICTED_ASSET_URL_HASHES.size, 8);
});

test('tracked release text fails closed on NUL bytes and enforces a per-file size limit', async () => {
  const verifier = await import(PRIVATE_LEAK_VERIFIER_URL.href);
  for (const path of [
    'index.html',
    'art-history-map.html',
    'data/leak.json',
    'scripts/leak.mjs',
  ]) {
    const content = Buffer.concat([
      Buffer.from('safe-prefix\0'),
      Buffer.from('%2FUsers%2Fstudent%2Fprivate.jpg'),
    ]);
    assert.throws(
      () => verifier.decodeTrackedTextContent(path, content),
      new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*NUL`),
    );
  }

  assert.equal(
    verifier.decodeTrackedTextContent('assets/reference.png', Buffer.from([0, 1, 2])),
    null,
    'known binary extensions are classified before text decoding',
  );
  assert.throws(
    () => verifier.decodeTrackedTextContent(
      'scripts/oversized.mjs',
      Buffer.alloc(verifier.MAX_TRACKED_TEXT_BYTES + 1, 0x61),
    ),
    /scripts\/oversized\.mjs.*exceeds.*text scan limit/,
  );
});

test('production release filtering includes world-map.html in every local-path mutation', async () => {
  const verifier = await import(PRIVATE_LEAK_VERIFIER_URL.href);
  const forbiddenCases = [
    [['', 'Users', 'student', 'private.jpg'].join('/'), /world-map\.html.*\/Users\//],
    [['', 'home', 'student', 'private.jpg'].join('/'), /world-map\.html.*\/home\//],
    [['file', ':///tmp/private.jpg'].join(''), /world-map\.html.*file:\/\//],
    [['D', ':\\private\\map.jpg'].join(''), /world-map\.html.*Windows drive path/],
  ];

  for (const [text, expected] of forbiddenCases) {
    const releaseEntries = verifier.selectTrackedReleaseTextEntries([
      { path: 'world-map.html', text },
      { path: 'README.md', text: 'not a release file' },
    ]);
    assert.deepEqual(releaseEntries.map(({ path }) => path), ['world-map.html']);
    assert.throws(
      () => verifier.assertNoAbsolutePrivatePaths(releaseEntries),
      expected,
    );
  }
});

test('runtime private-key resources bound stalled work and detach CDP before closing page, context, and browser', async () => {
  const verifier = await import(PRIVATE_LEAK_VERIFIER_URL.href);
  const events = [];
  const startedAt = Date.now();

  await assert.rejects(
    Promise.race([
      verifier.runBoundedRuntimeSession(async (session) => {
        const browser = await session.acquire('browser', async () => ({
          close: async () => {
            events.push('browser.close');
            return new Promise(() => {});
          },
        }));
        const context = await session.acquire('context', async () => ({
          browser,
          close: async () => events.push('context.close'),
        }));
        const page = await session.acquire('page', async () => ({
          context,
          close: async () => {
            events.push('page.close');
            return new Promise(() => {});
          },
        }));
        await session.acquire(
          'CDP session',
          async () => ({
            page,
            detach: async () => {
              events.push('cdp.detach');
              return new Promise(() => {});
            },
          }),
          (cdp) => cdp.detach(),
        );
        return session.run('inspection', async () => new Promise(() => {}));
      }, {
        label: 'test runtime',
        timeoutMs: 20,
        cleanupTimeoutMs: 25,
      }),
      new Promise((_, reject) => setTimeout(
        () => reject(new Error('test guard expired before runtime cleanup timeout')),
        250,
      )),
    ]),
    /test runtime timed out after 20 ms during inspection/,
  );
  assert.deepEqual(events, ['cdp.detach', 'page.close', 'context.close', 'browser.close']);
  assert.ok(Date.now() - startedAt < 250, 'runtime resource cleanup must stay bounded');
});

test('U5 restricted authority matches runtime and verifier allowlists and requires null public URLs', async () => {
  const verifier = await import(PRIVATE_LEAK_VERIFIER_URL.href);
  const browserVerifier = await import(VERIFIER_URL.href);
  const [authority, canonical, runtimeSource] = await Promise.all([
    readFile(U5_PLACEHOLDER_AUTHORITY, 'utf8').then(JSON.parse),
    readFile(U5_CANONICAL_FIXTURE, 'utf8').then(JSON.parse),
    readFile(ART_MAP_URL, 'utf8'),
  ]);
  await verifier.withRuntimePrivateKeyBrowser(async (browser, session) => {
    const runtimeKeys = await verifier.readRuntimePrivateMediaKeysInBrowser({
      browser,
      session,
      html: runtimeSource,
      label: 'canonical runtime',
    });
    const contract = {
      authority,
      canonical,
      runtimeKeys,
      verifierKeys: browserVerifier.U5_PRIVATE_MEDIA_KEYS,
    };
    assert.doesNotThrow(() => verifier.assertU5RestrictedMediaContract(contract));

    const spoofingHtml = (realKeys, spoofKeys, { frozen = true } = {}) => [
      '<!doctype html><meta charset="utf-8"><script>',
      `const U5_PRIVATE_MEDIA_KEYS = ${frozen ? 'Object.freeze(' : ''}${JSON.stringify(realKeys)}${frozen ? ')' : ''};`,
      `window.eval = () => ${JSON.stringify(spoofKeys)};`,
      `Array.from = () => ${JSON.stringify(spoofKeys)};`,
      'Array.isArray = () => true;',
      'Object.isFrozen = () => true;',
      `JSON.stringify = () => '${JSON.stringify(spoofKeys).replaceAll("'", "\\'")}';`,
      "const globalThis = { eval: () => ['shadow-spoof'] };",
      '</script>',
    ].join('\n');
    const wrongRealKeys = ['actual-runtime-key-is-wrong'];
    const spoofedExpectedKeys = await verifier.readRuntimePrivateMediaKeysInBrowser({
      browser,
      session,
      html: spoofingHtml(wrongRealKeys, runtimeKeys),
      label: 'window eval spoof cannot hide wrong runtime keys',
    });
    assert.deepEqual(spoofedExpectedKeys, wrongRealKeys);
    assert.throws(
      () => verifier.assertU5RestrictedMediaContract({
        ...contract,
        runtimeKeys: spoofedExpectedKeys,
      }),
      /runtime U5 private media keys/,
    );

    const pageBuiltinSpoofs = await verifier.readRuntimePrivateMediaKeysInBrowser({
      browser,
      session,
      html: spoofingHtml(runtimeKeys, ['spoofed-page-builtin-key']),
      label: 'page builtins cannot spoof CDP serialization',
    });
    assert.deepEqual(pageBuiltinSpoofs, runtimeKeys);

    await assert.rejects(
      verifier.readRuntimePrivateMediaKeysInBrowser({
        browser,
        session,
        html: spoofingHtml(runtimeKeys, runtimeKeys, { frozen: false }),
        label: 'unfrozen runtime keys cannot spoof primordial checker',
      }),
      /runtime U5 private media keys must be frozen/,
    );

    const alternatingBindingHtml = [
      '<!doctype html><meta charset="utf-8"><script>',
      'let runtimeBindingReads = 0;',
      "Object.defineProperty(this, 'U5_PRIVATE_MEDIA_KEYS', {",
      '  configurable: false,',
      '  get() {',
      '    runtimeBindingReads += 1;',
      `    return Object.freeze(runtimeBindingReads === 1 ? ${JSON.stringify(wrongRealKeys)} : ${JSON.stringify(runtimeKeys)});`,
      '  },',
      '});',
      '</script>',
    ].join('\n');
    const alternatingBindingKeys = await verifier.readRuntimePrivateMediaKeysInBrowser({
      browser,
      session,
      html: alternatingBindingHtml,
      label: 'alternating runtime binding getter',
    });
    assert.deepEqual(alternatingBindingKeys, wrongRealKeys);
    assert.throws(
      () => verifier.assertU5RestrictedMediaContract({
        ...contract,
        runtimeKeys: alternatingBindingKeys,
      }),
      /runtime U5 private media keys/,
    );

    const rejectedRuntimeShapes = [
      {
        label: 'accessor-backed runtime array',
        expression: "(() => { const keys = []; Object.defineProperty(keys, '0', { enumerable: true, get: () => 'accessor-key' }); return Object.freeze(keys); })()",
      },
      {
        label: 'sparse runtime array',
        expression: "Object.freeze(['first-key', , 'third-key'])",
      },
      {
        label: 'proxied runtime array',
        expression: "Object.freeze(new Proxy(['proxy-key'], {}))",
      },
      {
        label: 'runtime array with an unexpected own property',
        expression: "(() => { const keys = ['key']; keys.extra = 'unexpected'; return Object.freeze(keys); })()",
      },
      {
        label: 'runtime array with a non-string key',
        expression: "Object.freeze(['key', 2])",
      },
    ];
    for (const { label, expression } of rejectedRuntimeShapes) {
      await assert.rejects(
        verifier.readRuntimePrivateMediaKeysInBrowser({
          browser,
          session,
          html: `<!doctype html><meta charset="utf-8"><script>const U5_PRIVATE_MEDIA_KEYS = ${expression};</script>`,
          label,
        }),
        /runtime U5 private media/,
      );
    }

    const wrongAuthority = structuredClone(authority);
    delete wrongAuthority['ap153-chavin-huantar::relief-sculpture'];
    assert.throws(
      () => verifier.assertU5RestrictedMediaContract({ ...contract, authority: wrongAuthority }),
      /U5 placeholder authority keys/,
    );

    const leakedCanonical = structuredClone(canonical);
    leakedCanonical.artworks
      .find(({ apNumber }) => apNumber === 153)
      .images
      .find(({ id }) => id === 'relief-sculpture')
      .imageUrl = 'https://example.invalid/restricted-public-image.jpg';
    assert.throws(
      () => verifier.assertU5RestrictedMediaContract({ ...contract, canonical: leakedCanonical }),
      /ap153-chavin-huantar::relief-sculpture.*null public imageUrl/,
    );

    assert.throws(
      () => verifier.assertU5RestrictedMediaContract({
        ...contract,
        runtimeKeys: runtimeKeys.slice(1),
      }),
      /runtime U5 private media keys/,
    );

    assert.throws(
      () => verifier.assertU5RestrictedMediaContract({
        ...contract,
        verifierKeys: browserVerifier.U5_PRIVATE_MEDIA_KEYS.slice(0, -1),
      }),
      /browser verifier U5 private media keys/,
    );

    const fakeDeclaration = "const U5_PRIVATE_MEDIA_KEYS = Object.freeze(['decoy']);";
    const runtimeScript = '  <script>\n    const ARTWORKS';
    const injectScript = (script) => {
      const mutation = runtimeSource.replace(runtimeScript, `${script}\n${runtimeScript}`);
      assert.notEqual(mutation, runtimeSource, 'browser runtime mutation fixture');
      return mutation;
    };
    for (const [label, html] of [
      [
        'src inline body is ignored',
        injectScript(`<script src="data:text/javascript,void%200">${fakeDeclaration}</script>`),
      ],
      [
        'classic HTML comment is a same-line JavaScript comment',
        injectScript(`<script><!-- ${fakeDeclaration}\n</script>`),
      ],
      [
        'template text and nested templates do not create an active duplicate',
        injectScript([
          '<script>',
          `const templateTextDecoy = \`${fakeDeclaration}\`;`,
          'const nestedTemplateTextDecoy = `outer ${`inner text`} tail`;',
          '</script>',
        ].join('\n')),
      ],
      [
        'template interpolation keeps string and comment decoys inert',
        injectScript([
          '<script>',
          'const interpolationTextDecoys = `value ${(() => {',
          `  const stringDecoy = "${fakeDeclaration}";`,
          `  // ${fakeDeclaration}`,
          `  /* ${fakeDeclaration} */`,
          '  return { stringDecoy };',
          '})()}`;',
          '</script>',
        ].join('\n')),
      ],
      [
        'template interpolation may declare a scoped local key without replacing the runtime key',
        injectScript([
          '<script>',
          'const interpolationDecoy = `value ${(() => {',
          "  const U5_PRIVATE_MEDIA_KEYS = Object.freeze(['scoped-decoy']);",
          "  return U5_PRIVATE_MEDIA_KEYS.join('');",
          '})()}`;',
          'const nestedInterpolationDecoy = `outer ${`inner ${(() => {',
          "  const U5_PRIVATE_MEDIA_KEYS = Object.freeze(['nested-scoped-decoy']);",
          "  return U5_PRIVATE_MEDIA_KEYS.join('');",
          '})()}`}`;',
          '</script>',
        ].join('\n')),
      ],
    ]) {
      assert.deepEqual(
        await verifier.readRuntimePrivateMediaKeysInBrowser({
          browser,
          session,
          html,
          label,
        }),
        runtimeKeys,
      );
    }

    for (const [label, html] of [
      [
        'HTML-entity JavaScript type executes',
        injectScript(`<script type="text&#x2f;javascript">${fakeDeclaration}</script>`),
      ],
      [
        'regex literals before an active duplicate remain executable',
        injectScript(
          `<script>${String.raw`const scheme = /https?:\/\//; const brace = /}/;`} ${fakeDeclaration}</script>`,
        ),
      ],
      [
        'nested template boundaries do not hide a following active duplicate',
        injectScript(
          `<script>const boundary = \`outer \${\`inner\`} tail\`; ${fakeDeclaration}</script>`,
        ),
      ],
    ]) {
      await assert.rejects(
        verifier.readRuntimePrivateMediaKeysInBrowser({
          browser,
          session,
          html,
          label,
        }),
        /(?:runtime U5 private media|pageerror:.*Identifier 'U5_PRIVATE_MEDIA_KEYS')/i,
      );
    }
  });
});

test('release verifier keeps exact immutable Units 1-10 stage descriptors', async () => {
  const verifier = await import(RELEASE_VERIFIER_URL.href);
  const expectedStages = [
    'Node test suite',
    'strict 250-work Units 1-10 validator',
    'private-media leak guard',
    'rendered browser matrix',
  ];
  const productionLabels = verifier.RELEASE_STEPS.map(({ label }) => label);
  const expectedTestArgs = readdirSync(join(PROJECT_ROOT, 'tests'))
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => join('tests', name));
  const expectedDescriptors = [
    { label: expectedStages[0], args: ['--test', ...expectedTestArgs] },
    {
      label: expectedStages[1],
      args: ['scripts/validate-art-history-data.mjs', 'art-history-map.html'],
    },
    { label: expectedStages[2], args: ['scripts/verify-art-history-private-leaks.mjs'] },
    { label: expectedStages[3], args: ['scripts/verify-art-history-browser.mjs'] },
  ].map(({ label, args }) => ({
    label,
    command: process.execPath,
    args,
    cwd: PROJECT_ROOT,
    timeoutMs: 12 * 60 * 1000,
    forceKillMs: 5_000,
    stdio: 'inherit',
  }));

  assert.deepEqual(productionLabels, expectedStages);
  assert.deepEqual(verifier.RELEASE_STEPS, expectedDescriptors);
  for (const stage of verifier.RELEASE_STEPS) {
    assert.deepEqual(Object.keys(stage), [
      'label',
      'command',
      'args',
      'cwd',
      'timeoutMs',
      'forceKillMs',
      'stdio',
    ]);
    assert.equal(Object.isFrozen(stage), true);
    assert.equal(Object.isFrozen(stage.args), true);
  }
  assert.doesNotThrow(() => verifier.assertExactReleaseStages(verifier.RELEASE_STEPS));

  const clone = () => verifier.RELEASE_STEPS.map((stage) => ({
    ...stage,
    args: [...stage.args],
  }));
  const commandReplacement = clone();
  commandReplacement[0].command = 'node-from-untrusted-path';
  const deletedArgument = clone();
  deletedArgument[1].args.pop();
  const reorderedArguments = clone();
  [reorderedArguments[0].args[0], reorderedArguments[0].args[1]] = [
    reorderedArguments[0].args[1],
    reorderedArguments[0].args[0],
  ];
  const extraArgument = clone();
  extraArgument[2].args.push('--skip-scan');
  const changedCwd = clone();
  changedCwd[3].cwd = '/tmp';
  const changedTimeout = clone();
  changedTimeout[3].timeoutMs -= 1;
  const changedForceKill = clone();
  changedForceKill[3].forceKillMs -= 1;
  const changedStdio = clone();
  changedStdio[3].stdio = 'ignore';
  const changedLabel = clone();
  changedLabel[2].label = 'optional leak guard';
  const extraField = clone();
  extraField[1].skipValidation = true;
  const duplicateStage = clone();
  duplicateStage.splice(1, 0, { ...duplicateStage[0], args: [...duplicateStage[0].args] });
  for (const mutation of [
    commandReplacement,
    deletedArgument,
    reorderedArguments,
    extraArgument,
    changedCwd,
    changedTimeout,
    changedForceKill,
    changedStdio,
    changedLabel,
    extraField,
    duplicateStage,
  ]) {
    assert.throws(
      () => verifier.assertExactReleaseStages(mutation),
      /release stage descriptors/,
    );
  }
});

test('U3 assembled fault modes use an explicit allowlist', async () => {
  const verifier = await import(VERIFIER_URL.href);
  assert.deepEqual(verifier.U3_FAULT_MODES, [
    'wrong-rendered-url',
    'broken-focus-restoration',
    'duplicate-network-request',
  ]);
  assert.equal(
    verifier.parseU3FaultMode(['--u3-fault=wrong-rendered-url']),
    'wrong-rendered-url',
  );
  assert.throws(
    () => verifier.parseU3FaultMode(['--u3-fault=unknown']),
    /Unknown U3 verifier fault mode "unknown"/,
  );
  assert.throws(
    () => verifier.parseU3FaultMode([
      '--u3-fault=wrong-rendered-url',
      '--u3-fault=broken-focus-restoration',
    ]),
    /exactly one --u3-fault/,
  );
  assert.throws(
    () => verifier.parseU3FaultMode(['--u3-fault']),
    /Malformed --u3-fault argument/,
  );
});

test('duplicate-request fault observes an attempted exact reload before coalesced fallback', async () => {
  const verifier = await import(VERIFIER_URL.href);
  const imageUrl = 'https://example.invalid/exact-reload.jpg';
  const coalescedRequests = new Map();
  const coalescedObserver = verifier.createImageRequestObserver(coalescedRequests);
  coalescedObserver.observe(imageUrl);
  const coalescedAttempt = coalescedObserver.beginExactReload(imageUrl);
  const coalescedResult = coalescedObserver.completeExactReload(
    imageUrl,
    coalescedAttempt,
  );
  assert.deepEqual(coalescedResult, {
    attempted: true,
    routeObserved: false,
    fallbackObservationAdded: true,
  });
  assert.equal(coalescedRequests.get(imageUrl), 2);

  const routedRequests = new Map();
  const routedObserver = verifier.createImageRequestObserver(routedRequests);
  routedObserver.observe(imageUrl);
  const routedAttempt = routedObserver.beginExactReload(imageUrl);
  routedObserver.observe(imageUrl);
  assert.deepEqual(routedObserver.completeExactReload(imageUrl, routedAttempt), {
    attempted: true,
    routeObserved: true,
    fallbackObservationAdded: false,
  });
  assert.equal(routedRequests.get(imageUrl), 2);

  const source = await readFile(VERIFIER_URL, 'utf8');
  const traversal = source.slice(
    source.indexOf('async function verifyU3Works'),
    source.indexOf('async function verifyU3StudyTabsAndComparison'),
  );
  assert.match(
    traversal,
    /beginExactReload[\s\S]*new Image\(\)[\s\S]*completeExactReload/,
  );
  assert.doesNotMatch(traversal, /imageRequests\.set/);
});

test('request windows exclude prior reset traffic while retaining current-work requests', async () => {
  const verifier = await import(VERIFIER_URL.href);
  const requests = new Map([
    ['https://example.invalid/previous-work.jpg', 1],
  ]);

  // A request from the preceding selection can arrive while filters are being
  // reset. It belongs before the new work's stable activation boundary.
  requests.set('https://example.invalid/previous-work.jpg', 2);
  requests.set('https://example.invalid/reset-render.jpg', 1);
  const boundary = verifier.snapshotRequestCounts(requests);

  // Requests emitted after that boundary belong to the current work.
  requests.set('https://example.invalid/current-work.jpg', 1);
  requests.set('https://example.invalid/current-detail.jpg', 1);

  assert.deepEqual(
    verifier.requestCountsSince(requests, boundary),
    new Map([
      ['https://example.invalid/current-work.jpg', 1],
      ['https://example.invalid/current-detail.jpg', 1],
    ]),
  );

  const source = await readFile(VERIFIER_URL, 'utf8');
  const u4Traversal = source.slice(
    source.indexOf('async function verifyU4Works'),
    source.indexOf('async function verifyU4PrivateFallbacks'),
  );
  assert.match(
    u4Traversal,
    /resetAndActivateWork\([\s\S]*snapshotRequestCounts\(remoteImageRequests\)[\s\S]*requestCountsSince\(\s*remoteImageRequests/,
  );
  assert.doesNotMatch(
    u4Traversal,
    /remoteImageRequests\.clear\(\)|privateImageRequests\.clear\(\)/,
  );
});

test('U5 local request accounting normalizes browser URLs and preserves window and duplicate guards', async () => {
  const verifier = await import(VERIFIER_URL.href);
  assert.equal(typeof verifier.recordU5LocalImageRequest, 'function', 'U5 local image observer');
  const requests = new Map();
  const baseUrl = 'http://127.0.0.1:4321';
  const path = 'assets/art-history/u5/ap153-plan.webp';
  verifier.recordU5LocalImageRequest(requests, baseUrl + '/' + path, baseUrl);
  const boundary = verifier.snapshotRequestCounts(requests);
  verifier.recordU5LocalImageRequest(requests, baseUrl + '/' + path, baseUrl);
  assert.deepEqual(verifier.requestCountsSince(requests, boundary), new Map([[path, 1]]));
  verifier.recordU5LocalImageRequest(requests, baseUrl + '/' + path + '?reload=1', baseUrl);
  assert.deepEqual(verifier.requestCountsSince(requests, boundary), new Map([[path, 2]]),
    'cache-busting reload cannot evade duplicate accounting');
  for (const url of [
    'https://external.example/' + path,
    baseUrl + '/.private-media/u5/ap153-plan.webp',
    baseUrl + '/assets/art-history/u6/ap167-primary.webp',
  ]) verifier.recordU5LocalImageRequest(requests, url, baseUrl);
  assert.deepEqual(requests, new Map([[path, 3]]), 'local observer excludes remote, private and other units');
  const source = await readFile(VERIFIER_URL, 'utf8');
  const traversal = source.slice(source.indexOf('async function verifyU5Works'),
    source.indexOf('async function verifyU5Page'));
  assert.match(traversal, /mode === 'embedded'[\s\S]*artMapFrame[\s\S]*scrollIntoView[\s\S]*dialogClose/,
    'embedded modal close aligns the parent iframe before the normal pointer action');
});

test('U5 private request aggregation excludes comparison races and counts the current work once', async () => {
  const verifier = await import(VERIFIER_URL.href);
  const ap163Path = '.private-media/u5/ap163-bandolier-bag-primary.jpg';
  const lifetimeRequests = new Map([[ap163Path, 1]]); // AP 162 comparison target.
  const boundary = verifier.snapshotRequestCounts(lifetimeRequests);

  lifetimeRequests.set(ap163Path, 2); // AP 163's own activation.
  const aggregate = new Map();
  verifier.mergeRequestCounts(
    aggregate,
    verifier.requestCountsSince(lifetimeRequests, boundary),
  );
  lifetimeRequests.set(ap163Path, 3); // Later reset/comparison traffic.

  assert.deepEqual(aggregate, new Map([[ap163Path, 1]]));

  const source = await readFile(VERIFIER_URL, 'utf8');
  const u5Traversal = source.slice(
    source.indexOf('async function verifyU5Works'),
    source.indexOf('async function verifyU5Page'),
  );
  assert.match(u5Traversal, /privateRequestBoundary\s*=\s*snapshotRequestCounts/);
  assert.match(u5Traversal, /requestCountsSince\(\s*privateImageRequests/);
  assert.match(u5Traversal, /mergeRequestCounts\(\s*observedPrivateImageRequests/);
  assert.doesNotMatch(
    u5Traversal,
    /privateImageRequests\.get\(path\)[\s\S]*private request count/,
  );
});

test('public request guard rejects every private-media path, not only expected U5 JPEGs', async () => {
  const verifier = await import(VERIFIER_URL.href);
  for (const request of [
    'http://127.0.0.1:4173/.private-media/u5/overrides.js',
    'http://127.0.0.1:4173/.private-media/u5/unexpected-name.webp',
    'http://127.0.0.1:4173/.private-media/u5/ap164-transformation-mask-open.png',
    'http://127.0.0.1:4173/.private-media/u4/ap140-two-fridas-primary.jpg',
  ]) {
    assert.throws(
      () => verifier.assertNoU5RestrictedPublicRequests([request], 'public leak mutation'),
      /public leak mutation.*private-media/,
    );
  }
  assert.doesNotThrow(() => verifier.assertNoU5RestrictedPublicRequests(
    ['https://commons.wikimedia.org/example.jpg'],
    'public safe request',
  ));
});

test('U5 overflow history retains a transient failure after layout later recovers', async () => {
  const verifier = await import(VERIFIER_URL.href);
  const recoveredHistory = [
    { checkpoint: 'AP 164 closed view', horizontalOverflow: 0 },
    { checkpoint: 'AP 164 open view', horizontalOverflow: 18 },
    { checkpoint: 'AP 164 after comparison', horizontalOverflow: 0 },
  ];
  assert.throws(
    () => verifier.assertU5HorizontalOverflowHistory(recoveredHistory, '390px U5'),
    /390px U5.*AP 164 open view.*18px/,
  );
  assert.doesNotThrow(() => verifier.assertU5HorizontalOverflowHistory(
    recoveredHistory.map((entry) => ({ ...entry, horizontalOverflow: 0 })),
    '390px U5 clear',
  ));
});

for (const [faultMode, expectedFailure] of [
  ['wrong-rendered-url', /standalone AP 48 greek-chapel image URL/],
  ['broken-focus-restoration', /standalone AP 48 greek-chapel dialog focus restoration/],
  ['duplicate-network-request', /standalone AP 48 greek-chapel request count/],
]) {
  test(`assembled U3 verifier rejects ${faultMode}`, () => {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(VERIFIER_URL), `--u3-fault=${faultMode}`],
      {
        cwd: fileURLToPath(new URL('..', import.meta.url)),
        encoding: 'utf8',
        timeout: 120_000,
      },
    );
    assert.equal(result.error, undefined, `${faultMode} subprocess error`);
    assert.notEqual(
      result.status,
      0,
      `${faultMode} assembled verifier unexpectedly succeeded:\n${result.stdout}`,
    );
    assert.match(result.stderr, /Art History browser verification failed/);
    assert.match(result.stderr, expectedFailure);
  });
}

test('U3 browser fixture is the exact 51-work, 103-view canonical projection', async () => {
  const [browserFixture, canonical] = await Promise.all([
    readFile(U3_BROWSER_FIXTURE, 'utf8').then(JSON.parse),
    readFile(U3_CANONICAL_FIXTURE, 'utf8').then(JSON.parse),
  ]);

  assert.deepEqual(browserFixture, projectU3BrowserFixture(canonical));
  assert.deepEqual(
    browserFixture.map(({ apNumber }) => apNumber),
    Array.from({ length: 51 }, (_, index) => index + 48),
  );
  assert.equal(
    browserFixture.reduce((total, work) => total + work.images.length, 0),
    103,
  );
  for (const key of ['id', 'imageUrl', 'imageAlt', 'imageSourceUrl']) {
    const values = browserFixture.flatMap((work) => (
      key === 'id'
        ? [work.id, ...work.images.map((image) => `${work.id}/${image.id}`)]
        : work.images.map((image) => image[key])
    ));
    assert.equal(new Set(values).size, values.length, `distinct U3 ${key} values`);
  }
});

test('U4 browser fixture is the exact 54-work, 63-view rights-safe canonical projection', async () => {
  const [browserFixture, canonical] = await Promise.all([
    readFile(U4_BROWSER_FIXTURE, 'utf8').then(JSON.parse),
    readFile(U4_CANONICAL_FIXTURE, 'utf8').then(JSON.parse),
  ]);

  assert.deepEqual(browserFixture, projectU4BrowserFixture(canonical));
  assert.deepEqual(
    browserFixture.map(({ apNumber }) => apNumber),
    Array.from({ length: 54 }, (_, index) => index + 99),
  );
  const views = browserFixture.flatMap((work) => (
    work.images.map((image) => ({ work, image, key: `${work.id}::${image.id}` }))
  ));
  assert.equal(views.length, 63);
  assert.equal(views.filter(({ image }) => image.imageUrl !== null).length, 55);
  assert.deepEqual(
    views.filter(({ image }) => image.imageUrl === null).map(({ key, image }) => ({
      key,
      mediaStatus: image.mediaStatus,
    })),
    [
      'ap140-two-fridas::primary',
      'ap143-dream-alameda-central::primary',
      'ap146-marilyn-diptych::primary',
      'ap148-narcissus-garden::primary',
      'ap149-bay::primary',
      'ap150-lipstick-caterpillar-tracks::primary',
      'ap152-house-new-castle-county::exterior',
      'ap152-house-new-castle-county::interior',
    ].map((key) => ({ key, mediaStatus: 'rightsRestricted' })),
  );
});

test('U4 fixture validation freezes all levels and rejects every reviewed mutation class', async () => {
  const verifier = await import(VERIFIER_URL.href);
  const fixture = JSON.parse(await readFile(U4_BROWSER_FIXTURE, 'utf8'));
  const frozen = verifier.validateAndFreezeU4Works(structuredClone(fixture));

  assert.equal(frozen.length, 54);
  assert.equal(frozen.reduce((total, work) => total + work.images.length, 0), 63);
  assert.ok(Object.isFrozen(frozen));
  assert.ok(frozen.every(Object.isFrozen));
  assert.ok(frozen.every((work) => Object.isFrozen(work.images)));
  assert.ok(frozen.every((work) => work.images.every(Object.isFrozen)));

  const wrongTitle = structuredClone(fixture);
  wrongTitle[0].titleEn = 'Wrong U4 title';
  assert.throws(
    () => verifier.validateAndFreezeU4Works(wrongTitle),
    /U4 canonical projection\.AP99\.titleEn/,
  );

  const missingFinalView = structuredClone(fixture);
  missingFinalView.at(-1).images.pop();
  assert.throws(
    () => verifier.validateAndFreezeU4Works(missingFinalView),
    /63 U4 views|AP 152/,
  );

  const wrongPlaceholder = structuredClone(fixture);
  wrongPlaceholder.find(({ apNumber }) => apNumber === 140).images[0].id = 'wrong-placeholder-key';
  assert.throws(
    () => verifier.validateAndFreezeU4Works(wrongPlaceholder),
    /U4 canonical projection\.AP140\.images\[0\]\.id|private media keys/,
  );

  const leakedRestrictedUrl = structuredClone(fixture);
  leakedRestrictedUrl.find(({ apNumber }) => apNumber === 140).images[0].imageUrl =
    'https://example.invalid/restricted-public-image.jpg';
  assert.throws(
    () => verifier.validateAndFreezeU4Works(leakedRestrictedUrl),
    /rightsRestricted.*null image URL|U4 canonical projection/,
  );

  assert.throws(
    () => verifier.assertU4RegionTraversalCoverage(
      [...verifier.U4_REGION_LABELS, 'Ninth mutation region · 1 piece'],
      'ninth region mutation',
    ),
    /ninth region mutation/,
  );
  assert.throws(
    () => verifier.assertU4MarkerLayoutPreserved(false, 'marker rollback mutation'),
    /marker rollback mutation/,
  );
  assert.throws(
    () => verifier.assertExactImageRequests(
      new Map([[fixture[0].images[0].imageUrl, 2]]),
      fixture[0],
      'U4 duplicate request mutation',
    ),
    /request count/,
  );
  assert.throws(
    () => verifier.assertNoCollectedIssues(['console warning: U4 mutation'], 'U4 warning mutation'),
    /console warning: U4 mutation/,
  );
  assert.throws(
    () => verifier.assertDialogFocusRestored(false, 'U4 focus mutation'),
    /U4 focus mutation/,
  );
});

test('U5 browser fixture is the exact 14-work, 27-view canonical projection', async () => {
  const [browserFixture, canonical] = await Promise.all([
    readFile(U5_BROWSER_FIXTURE, 'utf8').then(JSON.parse),
    readFile(U5_CANONICAL_FIXTURE, 'utf8').then(JSON.parse),
  ]);

  assert.deepEqual(browserFixture, projectU5BrowserFixture(canonical));
  assert.deepEqual(
    browserFixture.map(({ apNumber }) => apNumber),
    Array.from({ length: 14 }, (_, index) => index + 153),
  );
  assert.equal(
    browserFixture.reduce((total, work) => total + work.viewIds.length, 0),
    27,
  );
});

test('U5 fixture validation freezes canonical hierarchy and rejects work, view, and key mutations', async () => {
  const verifier = await import(VERIFIER_URL.href);
  const fixture = JSON.parse(await readFile(U5_BROWSER_FIXTURE, 'utf8'));
  const frozen = verifier.validateAndFreezeU5Works(structuredClone(fixture));

  assert.equal(frozen.length, 14);
  assert.equal(frozen.reduce((total, work) => total + work.viewIds.length, 0), 27);
  assert.ok(Object.isFrozen(frozen));
  assert.ok(frozen.every(Object.isFrozen));
  assert.ok(frozen.every((work) => Object.isFrozen(work.viewIds)));
  assert.ok(frozen.every((work) => Object.isFrozen(work.images)));
  const malformedImages = structuredClone(fixture);
  malformedImages[0].images = {};
  assert.throws(() => verifier.validateAndFreezeU5Works(malformedImages), /images must be an array/);
  const unexpectedImageField = structuredClone(fixture);
  unexpectedImageField[0].images[0].unexpected = true;
  assert.throws(() => verifier.validateAndFreezeU5Works(unexpectedImageField), /image 0 exact keyset/);
  const remoteImage = structuredClone(fixture);
  remoteImage[0].images[0].imageUrl = 'https://example.org/remote.jpg';
  assert.throws(() => verifier.validateAndFreezeU5Works(remoteImage), /canonical projection/);

  const missingWork = structuredClone(fixture);
  missingWork.pop();
  assert.throws(
    () => verifier.validateAndFreezeU5Works(missingWork),
    /14 U5 works|AP 166/,
  );

  const missingView = structuredClone(fixture);
  missingView[0].viewIds.pop();
  assert.throws(
    () => verifier.validateAndFreezeU5Works(missingView),
    /27 U5 views|AP 153|canonical projection/,
  );

  const duplicateKeySource = await readFile(U5_BROWSER_FIXTURE, 'utf8');
  const duplicateKey = duplicateKeySource.replace(
    '"id": "ap153-chavin-huantar",',
    '"id": "ap153-chavin-huantar",\n    "id": "duplicate",',
  );
  assert.throws(
    () => verifier.parseVerifierJson(duplicateKey, 'U5 mutation fixture'),
    /duplicate object key "id".*\$\[0\]/,
  );
});

test('U5 verifier guards region traversal, restricted requests, private bundle isolation, issues, overflow, and focus', async () => {
  const verifier = await import(VERIFIER_URL.href);
  const fixture = JSON.parse(await readFile(U5_BROWSER_FIXTURE, 'utf8'));
  const exactRegions = [
    'Mesoamerica · 3 pieces',
    'Central Andes · 5 pieces',
    'Ancestral Pueblo · 2 pieces',
    'Eastern Woodlands · 2 pieces',
    'Northwest Coast · 1 piece',
    'Plains & Great Basin · 1 piece',
  ];
  assert.throws(
    () => verifier.assertU5RegionTraversalCoverage(exactRegions.slice(0, -1), 'invalid region branch'),
    /invalid region branch.*Plains & Great Basin/,
  );

  const publicRequests = fixture.flatMap((work) => work.viewIds.map((viewId) => (
    `.private-media/u5/${work.id}-${viewId}.jpg`
  )));
  assert.throws(
    () => verifier.assertNoU5RestrictedPublicRequests(publicRequests, 'public restricted request'),
    /public restricted request.*private-media.*ap153-chavin-huantar-plan/,
  );

  const overrides = verifier.createU5PrivateOverrides();
  assert.deepEqual(Object.keys(overrides), verifier.U5_PRIVATE_MEDIA_KEYS);
  assert.doesNotThrow(() => verifier.validateU5PrivateOverrides(overrides));
  const crossUnit = structuredClone(overrides);
  crossUnit[verifier.U5_PRIVATE_MEDIA_KEYS[0]].filePath =
    '.private-media/u4/ap140-two-fridas-primary.jpg';
  assert.throws(
    () => verifier.validateU5PrivateOverrides(crossUnit),
    /cross-unit|U5 private path/,
  );

  assert.throws(
    () => verifier.assertNoCollectedIssues(['console error: U5 mutation'], 'console mutation'),
    /console mutation.*console error/,
  );
  assert.throws(
    () => verifier.assertNoHorizontalOverflow(1, 'overflow mutation'),
    /overflow mutation.*horizontal overflow/,
  );
  assert.throws(
    () => verifier.assertDialogFocusRestored(false, 'lost focus mutation'),
    /lost focus mutation/,
  );
  assert.doesNotThrow(() => verifier.assertU5HierarchySelection(
    'Central Andes · 1 piece',
    'Chavín de Huántar, Ancash, Peru · AP 153 · 1 piece',
    fixture[0],
  ));
  assert.throws(
    () => verifier.assertU5HierarchySelection(
      'Central Andes · 1 piece',
      'Wrong site · AP 153 · 1 piece',
      fixture[0],
    ),
    /AP 153 site branch/,
  );

  const makeLeaf = (viewport, mode, privateMode) => ({
    viewport,
    mode,
    privateMode,
    regions: exactRegions,
    horizontalOverflow: 0,
    works: fixture.map((work) => ({
      apNumber: work.apNumber,
      mode,
      privateMode,
      views: work.viewIds.length,
      tabs: 4,
      comparisonFollowed: true,
      overflowCheckpoints: work.viewIds.length + 8,
    })),
    restrictedPrivateViews: privateMode ? verifier.U5_PRIVATE_MEDIA_KEYS.length : 0,
    restrictedPublicRequests: 0,
  });
  const matrix = verifier.U5_MATRIX_VIEWPORTS.map((viewport) => ({
    viewport,
    public: {
      standalone: makeLeaf(viewport, 'standalone', false),
      embedded: makeLeaf(viewport, 'embedded', false),
    },
    private: {
      standalone: makeLeaf(viewport, 'standalone', true),
      embedded: makeLeaf(viewport, 'embedded', true),
    },
  }));
  assert.doesNotThrow(() => verifier.assertU5RenderedMatrixCoverage(matrix));
  const missingRenderedWork = structuredClone(matrix);
  missingRenderedWork[0].public.standalone.works.pop();
  assert.throws(
    () => verifier.assertU5RenderedMatrixCoverage(missingRenderedWork),
    /desktop public standalone.*14 works/,
  );
});

test('browser verifier traverses all U5 public and private views in standalone and embedded desktop/touch modes', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');

  assert.match(source, /u5-browser\.json/);
  assert.match(source, /const U5_WORKS = validateAndFreezeU5Works/);
  assert.match(source, /async function verifyU5Works\(/);
  assert.match(source, /for \(const work of U5_RENDER_WORKS\)/);
  assert.match(source, /async function verifyU5Standalone\(/);
  assert.match(source, /async function verifyU5Embedded\(/);
  assert.match(source, /U5_MATRIX_VIEWPORTS/);
  assert.match(source, /\.private-media\/u5\/overrides\.js/);
  assert.match(source, /installU4PrivateRoutes/);
  assert.match(source, /Overview|速览/);
  assert.match(source, /\{ id: 'form', label: '形式' \}/);
  assert.match(source, /\{ id: 'context', label: '语境' \}/);
  assert.match(source, /\{ id: 'compare', label: '比较' \}/);
  assert.match(source, /kind:\s*'u5-fourteen-works'/);
});

test('U3 browser fixture loader validates the exact schema and freezes every level', async () => {
  const verifier = await import(VERIFIER_URL.href);
  const fixture = JSON.parse(await readFile(U3_BROWSER_FIXTURE, 'utf8'));
  const frozen = verifier.validateAndFreezeU3Works(structuredClone(fixture));

  assert.equal(frozen.length, 51);
  assert.equal(frozen.reduce((total, work) => total + work.images.length, 0), 103);
  assert.ok(Object.isFrozen(frozen));
  assert.ok(frozen.every((work) => Object.isFrozen(work)));
  assert.ok(frozen.every((work) => Object.isFrozen(work.images)));
  assert.ok(frozen.every((work) => work.images.every(Object.isFrozen)));
});

test('runtime U3 fixture validation rejects balanced canonical work and view substitutions', async () => {
  const verifier = await import(VERIFIER_URL.href);
  const fixture = JSON.parse(await readFile(U3_BROWSER_FIXTURE, 'utf8'));

  const imposterWork = structuredClone(fixture);
  imposterWork.find(({ apNumber }) => apNumber === 58).id = 'ap58-unique-imposter';
  assert.throws(
    () => verifier.validateAndFreezeU3Works(imposterWork),
    /U3 canonical projection\.AP58\.id/,
  );

  const balancedViewSwap = structuredClone(fixture);
  balancedViewSwap.find(({ apNumber }) => apNumber === 48).images.push({
    id: 'unique-fake-view',
    label: 'Unique Fake View',
    imageUrl: 'https://example.invalid/u3-unique-fake-view.jpg',
    imageAlt: 'Unique fake view used only by the negative control',
    imageSourceUrl: 'https://example.invalid/u3-unique-fake-view-source',
  });
  const chartres = balancedViewSwap.find(({ apNumber }) => apNumber === 60);
  chartres.images = chartres.images.filter(({ id }) => id !== 'stained-glass');
  assert.equal(
    balancedViewSwap.reduce((total, work) => total + work.images.length, 0),
    103,
  );
  assert.throws(
    () => verifier.validateAndFreezeU3Works(balancedViewSwap),
    /U3 canonical projection\.AP48\.images\[3\]/,
  );
});

test('runtime U3 fixture parsing rejects duplicate object keys with their JSON path', async () => {
  const verifier = await import(VERIFIER_URL.href);

  assert.throws(
    () => verifier.parseVerifierJson(
      '{"artworks":[{"id":"first","id":"imposter"}]}',
      'mutated U3 canonical',
    ),
    /mutated U3 canonical.*duplicate object key "id".*\$\.artworks\[0\]/,
  );
});

test('canonical U3 projection freezes exact metadata and all 103 rendered credits', async () => {
  const verifier = await import(VERIFIER_URL.href);
  const canonical = JSON.parse(await readFile(U3_CANONICAL_FIXTURE, 'utf8'));
  const expected = verifier.projectAndFreezeU3Canonical(structuredClone(canonical));

  assert.equal(expected.length, 51);
  assert.equal(expected.reduce((total, work) => total + work.images.length, 0), 103);
  assert.ok(Object.isFrozen(expected));
  assert.ok(expected.every(Object.isFrozen));
  assert.ok(expected.every((work) => Object.isFrozen(work.images)));
  assert.ok(expected.every((work) => work.images.every(Object.isFrozen)));
  assert.deepEqual(expected[0].metadata, {
    titleZh: '普里西拉地下墓穴',
    siteName: 'Rome, Italy',
    provenanceQualifier: null,
    culture: 'earlyChristianRome',
    cultureLabelZh: '早期基督教罗马',
    period: 'Late Antique Early Christian',
    date: 'c. 200–400 C.E.',
    artistCulture: 'Early Christian Roman workshop',
    medium: 'Excavated tufa and fresco',
    workType: 'Catacomb and wall painting',
  });
  assert.deepEqual(expected[0].images[0].credit, {
    creatorOrInstitution:
      'Early Christian painter; photograph André Held/akg / Catacomb of Priscilla / Wikimedia Commons',
    licenseName: 'Public Domain Mark 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    imageSourceName: 'Wikimedia Commons',
    imageSourceUrl:
      'https://commons.wikimedia.org/wiki/File:Catacombe%20di%20Priscilla%2C%20Rome%20-%20Fresco%20of%20a%20Christian%20Agape%20feast%20-%20Fractio%20panis%20-%20Greek%20chapel%20-%202nd%20-%204th%20century.jpg',
  });
});

test('exact U3 rendered metadata and credit assertions reject every reviewed mutation class', async () => {
  const verifier = await import(VERIFIER_URL.href);
  const canonical = JSON.parse(await readFile(U3_CANONICAL_FIXTURE, 'utf8'));
  const [expectedWork] = verifier.projectAndFreezeU3Canonical(structuredClone(canonical));
  const metadata = expectedWork.metadata;
  const credit = expectedWork.images[0].credit;

  for (const [field, value] of [
    ['titleZh', '错误标题'],
    ['siteName', 'wrong site'],
    ['provenanceQualifier', 'wrong provenance qualifier'],
    ['date', 'wrong date'],
    ['cultureLabelZh', '错误文化'],
    ['period', 'wrong period'],
    ['artistCulture', 'wrong artist or culture'],
    ['medium', 'wrong medium'],
    ['workType', 'wrong work type'],
  ]) {
    assert.throws(
      () => verifier.assertU3MetadataMatches({ ...metadata, [field]: value }, metadata, 'metadata'),
      new RegExp(field),
    );
  }
  for (const [field, value] of [
    ['creatorOrInstitution', 'wrong creator'],
    ['licenseName', 'wrong license'],
    ['licenseUrl', 'https://example.invalid/wrong-license'],
    ['imageSourceName', 'wrong source'],
    ['imageSourceUrl', 'https://example.invalid/wrong-source'],
  ]) {
    assert.throws(
      () => verifier.assertU3CreditMatches({ ...credit, [field]: value }, credit, 'credit'),
      new RegExp(field),
    );
  }
});

test('U3 verifier rejects fixture and rendered-view mutations with meaningful assertions', async () => {
  const verifier = await import(VERIFIER_URL.href);
  const fixture = JSON.parse(await readFile(U3_BROWSER_FIXTURE, 'utf8'));
  const clone = () => structuredClone(fixture);

  const missingWork = clone();
  missingWork.splice(10, 1);
  assert.throws(
    () => verifier.validateAndFreezeU3Works(missingWork),
    /51 U3 works|AP 58/,
  );

  const duplicateWork = clone();
  duplicateWork[10] = structuredClone(duplicateWork[9]);
  assert.throws(
    () => verifier.validateAndFreezeU3Works(duplicateWork),
    /AP 58|duplicate U3 work id/,
  );

  const missingChartresView = clone();
  const chartres = missingChartresView.find(({ apNumber }) => apNumber === 60);
  chartres.images.pop();
  assert.throws(
    () => verifier.validateAndFreezeU3Works(missingChartresView),
    /103 U3 views|AP 60/,
  );

  const duplicateView = clone();
  const chartresWithDuplicate = duplicateView.find(({ apNumber }) => apNumber === 60);
  chartresWithDuplicate.images.push(structuredClone(chartresWithDuplicate.images[0]));
  assert.throws(
    () => verifier.validateAndFreezeU3Works(duplicateView),
    /103 U3 views|duplicate U3 view id|duplicate U3 image URL/,
  );

  const expected = fixture[0].images[0];
  assert.throws(
    () => verifier.assertU3ViewMatches(
      { ...expected, imageUrl: 'https://example.invalid/wrong-required-view.jpg' },
      expected,
      'mutated required image',
    ),
    /image URL/,
  );
  assert.throws(
    () => verifier.assertExactImageRequests(
      new Map(fixture[0].images.map((image, index) => [
        image.imageUrl,
        index === 0 ? 2 : 1,
      ])),
      fixture[0],
      'duplicate request mutation',
    ),
    /request count/,
  );
  assert.throws(
    () => verifier.assertNoCollectedIssues(['console warning: mutation'], 'warning mutation'),
    /console warning: mutation/,
  );
  assert.throws(
    () => verifier.assertNoCollectedIssues(['console error: mutation'], 'error mutation'),
    /console error: mutation/,
  );
  assert.throws(
    () => verifier.assertDialogFocusRestored(false, 'focus mutation'),
    /focus mutation/,
  );
});

test('U1 browser fixture covers AP 1-11 and exactly 12 audited views', async () => {
  const works = JSON.parse(await readFile(U1_BROWSER_FIXTURE, 'utf8'));

  assert.deepEqual(
    works.map(({ apNumber }) => apNumber),
    Array.from({ length: 11 }, (_, index) => index + 1),
  );
  assert.equal(
    works.reduce((total, work) => total + work.images.length, 0),
    12,
  );
  assert.equal(works.find(({ apNumber }) => apNumber === 8).images.length, 2);
  assert.ok(
    works
      .filter(({ apNumber }) => apNumber !== 8)
      .every(({ images }) => images.length === 1),
  );
});

test('U1 browser fixture is projected exactly from the canonical data', async () => {
  const [browserFixture, canonical] = await Promise.all([
    readFile(U1_BROWSER_FIXTURE, 'utf8').then(JSON.parse),
    readFile(U1_CANONICAL_FIXTURE, 'utf8').then(JSON.parse),
  ]);

  assert.deepEqual(browserFixture, projectBrowserFixture(canonical));
});

test('browser verifier exposes required and responsive-boundary viewport matrices', async () => {
  const verifier = await import(VERIFIER_URL.href);

  assert.deepEqual(
    verifier.REQUIRED_VIEWPORTS.map(({ width, height }) => [width, height]),
    [
      [1365, 768],
      [375, 812],
      [390, 844],
      [667, 375],
      [665, 700],
    ],
  );
  assert.deepEqual(
    verifier.BOUNDARY_VIEWPORTS.map(({ width, height }) => [width, height]),
    [
      [519, 700],
      [520, 700],
      [521, 700],
      [519, 519],
      [519, 520],
      [519, 521],
      [520, 519],
      [520, 520],
      [520, 521],
      [521, 519],
      [521, 520],
      [521, 521],
      [639, 700],
      [640, 700],
      [641, 700],
      [664, 700],
      [665, 700],
      [639, 519],
      [639, 520],
      [639, 521],
      [640, 519],
      [640, 520],
      [640, 521],
      [641, 519],
      [641, 520],
      [641, 521],
      [663, 519],
      [663, 520],
      [663, 521],
      [664, 519],
      [664, 520],
      [664, 521],
      [665, 519],
      [665, 520],
      [665, 521],
      [667, 519],
      [667, 520],
      [667, 521],
    ],
  );
});

test('browser verifier discovers its runtime and browser without machine-specific paths', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');

  assert.match(source, /ART_HISTORY_PLAYWRIGHT_PATH/);
  assert.match(source, /ART_HISTORY_BROWSER_PATH/);
  assert.match(source, /Library', 'Caches', 'ms-playwright-go'/);
  assert.match(source, /node_modules', 'playwright'/);
  assert.match(source, /createServer/);
  assert.match(source, /listen\(0,\s*'127\.0\.0\.1'/);
  assert.match(source, /No supported Playwright runtime found/);
  assert.match(source, /No supported Chromium or Chrome executable found/);
  assert.doesNotMatch(source, /\/Users\/|tiffanyxu/);
});

test('nine-work browser fixture is canonical and independently matches source fixtures', async () => {
  const [browserFixture, sourceFixture, verifierSource] = await Promise.all([
    readFile(NINE_WORKS_URL, 'utf8').then(JSON.parse),
    readFile(SOURCE_FIXTURE_URL, 'utf8').then(JSON.parse),
    readFile(VERIFIER_URL, 'utf8'),
  ]);
  const apNumbers = [12, 14, 16, 19, 25, 29, 30, 31, 32];
  const expected = sourceFixture.artworks
    .filter(({ apNumber }) => apNumbers.includes(apNumber))
    .map((work) => ({
      id: work.id,
      apNumber: work.apNumber,
      titleEn: work.titleEn,
      titleZh: work.titleZh,
      imageUrl: work.imageUrl,
      imageAlt: work.imageAlt,
      imageSourceName: work.imageSourceName,
      imageSourceUrl: work.imageSourceUrl,
      credit: sourceFixture.credits[work.id],
    }));

  assert.deepEqual(browserFixture, expected);
  assert.deepEqual(browserFixture.map(({ apNumber }) => apNumber), apNumbers);
  assert.match(verifierSource, /u2-imported-browser\.json/);
  assert.match(verifierSource, /verifyNineImportedWorks/);
});

test('browser verifier loads the frozen U1 projection and traverses all eleven works', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');

  assert.match(source, /const U1_WORKS = Object\.freeze\(JSON\.parse\(/);
  assert.match(source, /u1-browser\.json/);
  assert.match(source, /async function resetAndActivateWork\(/);
  assert.match(source, /async function verifyU1Works\(/);
  assert.match(source, /for \(const work of U1_WORKS\)/);
  assert.doesNotMatch(source, /resetAndActivateImportedWork/);
  assert.match(source, /kind:\s*'u1-eleven-works'/);
  assert.match(source, /verifyU1Standalone/);
  assert.match(source, /verifyU1Embedded/);
});

test('browser verifier locks the four-Unit hierarchy and exact U1/U3 region contracts', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');

  assert.match(source, /U1 · Global Prehistory · 11 pieces/);
  assert.match(source, /U2 · Ancient Mediterranean · 36 pieces/);
  assert.match(source, /U3 · Early Europe and Colonial Americas · 51 pieces/);
  assert.match(source, /U4 · Later Europe and Americas · 54 pieces/);
  assert.match(source, /selectOption\('1'\)/);
  assert.match(source, /cultureFilters.*isHidden/s);
  assert.match(source, /Africa · 2 pieces/);
  assert.match(source, /Europe · 2 pieces/);
  assert.match(source, /Americas · 2 pieces/);
  assert.match(source, /Middle East · 2 pieces/);
  assert.match(source, /East Asia · 1 piece/);
  assert.match(source, /Oceania · 2 pieces/);
  assert.match(source, /selectOption\('2'\)/);
  assert.match(source, /selectOption\('3'\)/);
  assert.match(source, /Italy & Vatican · 18 pieces/);
  assert.match(source, /France · 5 pieces/);
  assert.match(source, /Iberian Peninsula · 5 pieces/);
  assert.match(source, /British Isles · 3 pieces/);
  assert.match(source, /Low Countries · 7 pieces/);
  assert.match(source, /Central Europe · 4 pieces/);
  assert.match(source, /Eastern Mediterranean · 4 pieces/);
  assert.match(source, /Colonial Americas · 5 pieces/);
});

test('browser fit oracle accounts for the approved responsive screen margin', async()=>{
 const verifier=await import(VERIFIER_URL.href);
 const fit=verifier.calculateExpectedU3FitTransform([{x:1000,y:300},{x:1200,y:400}],{width:1000,height:500});
 assert.ok(Math.abs(fit.scale-800/356)<1e-10);
});

test('embedded geometry waits for the existing host ResizeObserver before exact height assertions',async()=>{
 const source=await readFile(VERIFIER_URL,'utf8');
 const start=source.indexOf('async function verifyEmbedded(');
 const embedded=source.slice(start,source.indexOf('async function ',start+1));
 assert.match(embedded,/content-fitted host ResizeObserver settlement/);
 assert.match(embedded,/Math\.abs\(host\.wrapHeight - approved\.hostHeight\) <= 1/);
});

test('initial hierarchy asserts the exact ordered seven markers and 250-work result count', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');
  const hierarchy = source.slice(
    source.indexOf('async function assertInitialHierarchy'),
    source.indexOf('async function assertHierarchyAndDialog'),
  );

  assert.match(hierarchy, /assert\.deepEqual\(\s*initial,\s*\[/s);
  assert.match(
    hierarchy,
    /'U1 · Global Prehistory · 11 pieces',[\s\S]*'U2 · Ancient Mediterranean · 36 pieces',[\s\S]*'U3 · Early Europe and Colonial Americas · 51 pieces',[\s\S]*'U4 · Later Europe and Americas · 54 pieces',[\s\S]*'U5 · Indigenous Americas · 14 pieces'/,
  );
  assert.match(hierarchy, /'U5 · Indigenous Americas · 14 pieces',[\s\S]*'U6 · Africa · 14 pieces'/);
  assert.match(hierarchy, /当前显示 250 件作品/);
});

test('U3 responsive traversal rejects an omitted region branch and loops all eight branches', async () => {
  const verifier = await import(VERIFIER_URL.href);
  const canonical = JSON.parse(await readFile(U3_CANONICAL_FIXTURE, 'utf8'));
  const exactRegions = [
    'Italy & Vatican · 18 pieces',
    'France · 5 pieces',
    'Iberian Peninsula · 5 pieces',
    'British Isles · 3 pieces',
    'Low Countries · 7 pieces',
    'Central Europe · 4 pieces',
    'Eastern Mediterranean · 4 pieces',
    'Colonial Americas · 5 pieces',
  ];
  assert.throws(
    () => verifier.assertU3RegionTraversalCoverage(exactRegions.slice(0, -1), 'omitted branch'),
    /omitted branch.*Colonial Americas/,
  );

  const italyWorks = canonical.artworks.filter(({ region }) => region === 'italyVatican');
  const italySiteLabels = [
    'Florence, Italy · AP 67, 69–72, 78 · 6 pieces',
    'Milan, Italy · AP 73 · 1 piece',
    'Padua, Italy · AP 63 · 1 piece',
    'Ravenna, Italy · AP 51 · 1 piece',
    'Rome, Italy · AP 48–49, 82, 85, 88–89 · 6 pieces',
    'Vatican City · AP 75–76 · 2 pieces',
    'Venice, Italy · AP 80 · 1 piece',
  ];
  assert.throws(
    () => verifier.assertU3SiteTraversalCoverage(
      italySiteLabels.slice(0, -1),
      italySiteLabels,
      'omitted child site',
    ),
    /omitted child site/,
  );

  const expectedUnitTransform = verifier.calculateExpectedU3FitTransform(
    canonical.artworks.map(({ coordinates }) => coordinates),
  );
  const expectedItalyTransform = verifier.calculateExpectedU3ZoomTransform(
    expectedUnitTransform,
    Math.max(2.5, expectedUnitTransform.scale),
    { x: 854, y: 260 },
  );
  assert.notDeepEqual(expectedItalyTransform, { x: 0, y: 0, scale: 1 });
  assert.throws(
    () => verifier.assertU3TransformMatches(
      { x: 0, y: 0, scale: 1 },
      expectedItalyTransform,
      'no-op region fit',
    ),
    /no-op region fit/,
  );

  const source = await readFile(VERIFIER_URL, 'utf8');
  const traversal = source.slice(
    source.indexOf('async function verifyU3ResponsiveRegionBranches'),
    source.indexOf('async function assertU3ResponsiveLayout'),
  );
  assert.match(traversal, /for \(const region of U3_REGION_BRANCHES\)/);
  assert.match(traversal, /site-marker\[data-group-kind="site"\]/);
  assert.match(traversal, /captureMarkerGeometry\(frame, 'site'\)/);
  assert.match(traversal, /assertMarkerGeometrySet/);
  assert.match(traversal, /activeRegion/);
  assert.match(traversal, /horizontalOverflow/);
  assert.match(traversal, /assertU3SiteTraversalCoverage/);
  assert.match(traversal, /assertU3TransformMatches/);
});

test('shared marker geometry rejects clipped hit targets and capsules with in-bounds text', async () => {
  const verifier = await import(VERIFIER_URL.href);
  const inside = { left: 20, right: 80, top: 20, bottom: 80 };
  const text = { left: 35, right: 65, top: 40, bottom: 60 };
  const baseMarker = {
    label: 'Mutation region · 1 piece',
    client: {
      group: { ...inside },
      hit: { left: 28, right: 72, top: 28, bottom: 72 },
      capsule: { ...inside },
      text: { ...text },
    },
    world: {
      group: { ...inside },
      hit: { left: 28, right: 72, top: 28, bottom: 72 },
      capsule: { ...inside },
      text: { ...text },
    },
    hitSize: { width: 44, height: 44 },
  };
  const baseGeometry = {
    map: { left: 0, right: 100, top: 0, bottom: 100 },
    visibleWorldBounds: { left: 0, right: 100, top: 0, bottom: 100 },
    markers: [baseMarker],
  };

  for (const kind of ['hit', 'capsule']) {
    const mutated = structuredClone(baseGeometry);
    mutated.markers[0].client[kind].left = -5;
    mutated.markers[0].world[kind].left = -5;
    assert.deepEqual(mutated.markers[0].client.text, text);
    assert.throws(
      () => verifier.assertMarkerGeometrySet(mutated, `${kind} clipping mutation`),
      new RegExp(`${kind} clipping mutation.*${kind} client.*clipped`),
    );
  }
  const undersized = structuredClone(baseGeometry);
  undersized.markers[0].hitSize.width = 43.5;
  assert.throws(
    () => verifier.assertMarkerGeometrySet(undersized, 'undersized hit mutation'),
    /undersized hit mutation.*44px hit target/,
  );

  const outsideSvgInsidePanel = structuredClone(baseGeometry);
  outsideSvgInsidePanel.panel = {
    left: 0,
    right: 100,
    top: 0,
    bottom: 100,
  };
  outsideSvgInsidePanel.map = {
    left: 10,
    right: 90,
    top: 10,
    bottom: 90,
  };
  outsideSvgInsidePanel.markers[0].client.group = {
    left: 5,
    right: 80,
    top: 20,
    bottom: 80,
  };
  assert.ok(
    outsideSvgInsidePanel.markers[0].client.group.left
      >= outsideSvgInsidePanel.panel.left,
    'mutation remains inside the broader map panel',
  );
  assert.throws(
    () => verifier.assertMarkerGeometrySet(
      outsideSvgInsidePanel,
      'outside SVG inside panel mutation',
    ),
    /outside SVG inside panel mutation.*group client.*clipped/,
  );

  const worldOnlyClipping = structuredClone(baseGeometry);
  worldOnlyClipping.markers[0].world.capsule.left = -5;
  assert.throws(
    () => verifier.assertMarkerGeometrySet(
      worldOnlyClipping,
      'visible world mutation',
    ),
    /visible world mutation.*capsule world.*clipped/,
  );

  const source = await readFile(VERIFIER_URL, 'utf8');
  const capture = source.slice(
    source.indexOf('async function captureMarkerGeometry'),
    source.indexOf('async function resetToU3Regions'),
  );
  assert.match(capture, /querySelector\('\.map-svg'\)/);
  assert.doesNotMatch(capture, /querySelector\('\.map-panel'\)/);
  assert.doesNotMatch(capture, /querySelector\('#panSurface'\)/);
});

test('browser verifier loads and traverses every frozen U3 work in standalone and embedded modes', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');

  assert.match(source, /u3-browser\.json/);
  assert.match(source, /const U3_WORKS = validateAndFreezeU3Works/);
  assert.match(source, /async function verifyU3Works\(/);
  assert.match(source, /for \(const work of U3_WORKS\)/);
  assert.match(source, /async function verifyU3Standalone\(/);
  assert.match(source, /async function verifyU3Embedded\(/);
  assert.equal(
    source.match(/await verifyU3Works\(page,\s*(?:page|frame),\s*imageRequests,\s*'[^']+'\)/g)?.length,
    2,
  );
  assert.match(source, /kind:\s*'u3-fifty-one-works'/);
});

test('browser verifier traverses all U4 public and private views in standalone and embedded modes', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');
  const u4Traversal = source.slice(
    source.indexOf('async function verifyU4Standalone'),
    source.indexOf('async function verifyU4PrivateNegativePaths'),
  );

  assert.match(source, /u4-browser\.json/);
  assert.match(source, /const U4_WORKS = validateAndFreezeU4Works/);
  assert.match(source, /async function verifyU4Works\(/);
  assert.match(source, /for \(const work of U4_WORKS\)/);
  assert.match(source, /async function verifyU4Standalone\(/);
  assert.match(source, /async function verifyU4Embedded\(/);
  assert.match(source, /privateMedia=1/);
  assert.match(source, /\.private-media\/u4\/overrides\.js/);
  assert.match(source, /Private image not installed/);
  assert.match(source, /kind:\s*'u4-fifty-four-works'/);
  assert.equal(
    u4Traversal.match(/installU5PrivateRoutes/g)?.length || 0,
    2,
    'U4 private standalone and embedded pages must also serve the isolated U5 bundle',
  );
});

test('U3 traversal covers all study tabs and AP 89 comparison navigation to AP 46', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');

  assert.match(source, /async function verifyU3StudyTabsAndComparison\(/);
  assert.equal(
    source.match(/await verifyU3StudyTabsAndComparison\(page,\s*(?:page|frame),\s*'[^']+'\)/g)?.length,
    2,
  );
  assert.match(source, /ap52-hagia-sophia|ap60-chartres-cathedral/);
  assert.match(source, /ap89-ecstasy-saint-teresa/);
  assert.match(source, /ap46-pantheon/);
  assert.match(source, /当前显示 36 件作品/);
  assert.match(source, /Pantheon/);
});

test('Unit changes apply the fitted SVG transform before scheduling one render frame', async () => {
  const artMap = await readFile(ART_MAP_URL, 'utf8');
  const selectUnitStart = artMap.indexOf('function selectUnit(unit)');
  const unitSelection = artMap.slice(
    selectUnitStart,
    artMap.indexOf('populateUnitOptions()', selectUnitStart),
  );
  const fitIndex = unitSelection.indexOf('fitMapToWorks(getWorksForUnit(unit))');
  const applyIndex = unitSelection.indexOf('applyTransform()');
  const scheduleIndex = unitSelection.indexOf('scheduleMarkerLayout()');

  assert.ok(fitIndex >= 0, 'Unit change should fit the selected Unit');
  assert.ok(applyIndex > fitIndex, 'Unit change should apply the fitted transform');
  assert.ok(
    scheduleIndex > applyIndex,
    'Unit change should schedule rendering after the transform reaches the next frame',
  );
  assert.equal(
    unitSelection.match(/\brender\(\)/g)?.length || 0,
    0,
    'Unit change should not render early',
  );
});

test('mobile standalone filter labels and selects may shrink around the complete U3 Unit option', async () => {
  const artMap = await readFile(ART_MAP_URL, 'utf8');
  const mobileCss = artMap.slice(
    artMap.indexOf('@media (max-width:520px)'),
    artMap.indexOf('@media (max-width:664px)'),
  );

  assert.match(
    mobileCss,
    /\.filter-toolbar\s*>\s*\.filter-label\s*\{[^}]*min-width:\s*0/,
  );
  assert.match(
    mobileCss,
    /\.filter-toolbar\s+select\s*\{[^}]*min-width:\s*0/,
  );
});

test('U3 responsive control hit testing first restores the embedded map controls to the viewport', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');
  const responsive = source.slice(
    source.indexOf('async function assertU3ResponsiveLayout'),
    source.indexOf('async function selectBoundaryFilters'),
  );
  const scrollIndex = responsive.indexOf("locator('.map-controls').scrollIntoViewIfNeeded()");
  const hitIndex = responsive.indexOf('document.elementFromPoint');

  assert.ok(scrollIndex >= 0, 'responsive verification should restore scrolled controls');
  assert.ok(hitIndex > scrollIndex, 'controls should be visible before pointer hit testing');
});

test('U3 request accounting begins immediately before final work activation', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');
  const traversal = source.slice(
    source.indexOf('async function verifyU3Works'),
    source.indexOf('async function verifyU3StudyTabsAndComparison'),
  );

  assert.match(
    traversal,
    /resetAndActivateWork\(page,\s*frame,\s*work,\s*\(\)\s*=>\s*imageRequests\.clear\(\)\)/,
  );
  assert.doesNotMatch(
    traversal,
    /imageRequests\.clear\(\);\s*await resetAndActivateWork/,
  );
});

test('U1 traversal verifies both Stonehenge views, request exactness, and focus restoration', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');

  assert.match(source, /const imageRequests = new Map\(\)/);
  assert.match(source, /imageRequests\.clear\(\)/);
  assert.match(source, /work\.images\.length === 2 \? 2 : 0/);
  assert.match(source, /viewButtons\.nth\(imageIndex\)\.click\(\)/);
  assert.match(source, /imageRequests\.get\(expected\.imageUrl\),\s*1/);
  assert.match(source, /#dialogSource/);
  assert.match(source, /document\.activeElement\?\.classList\.contains\('artwork-image-button'\)/);
});

test('U1 traversal verifies exact inline, dialog, metadata, and view-button semantics', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');
  const traversal = source.slice(
    source.indexOf('async function verifyU1Works'),
    source.indexOf('async function verifyU1Standalone'),
  );

  assert.match(traversal, /\.work-meta/);
  assert.match(traversal, /`AP #\$\{work\.apNumber\}`/);
  assert.match(traversal, /work\.images\.map\(\(\{ label \}\) => label\)/);
  assert.match(traversal, /getAttribute\('aria-pressed'\)/);
  assert.match(traversal, /expected\.creatorOrInstitution/);
  assert.match(traversal, /expected\.licenseName/);
  assert.match(traversal, /expected\.licenseUrl/);
  assert.match(traversal, /expected\.imageSourceName/);
  assert.match(traversal, /expected\.imageSourceUrl/);
  assert.match(traversal, /#dialogTitle/);
  assert.match(traversal, /#dialogCaption/);
  assert.match(traversal, /#dialogCredit/);
});

test('U1 standalone and embedded traversals exercise all study tabs and cross-Unit comparison', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');

  assert.match(source, /async function verifyU1StudyTabsAndComparison\(/);
  assert.equal(
    source.match(/await verifyU1StudyTabsAndComparison\(page,\s*(?:page|frame),\s*'[^']+'\)/g)?.length,
    2,
  );
  assert.match(source, /\{ id: 'quick', label: '速览'/);
  assert.match(source, /\{ id: 'form', label: '形式'/);
  assert.match(source, /\{ id: 'context', label: '语境'/);
  assert.match(source, /\{ id: 'compare', label: '比较'/);
  assert.match(source, /ap2-great-hall-bulls/);
  assert.match(source, /ap24-last-judgment-of-hunefer/);
  assert.match(source, /当前显示 36 件作品/);
  assert.match(source, /Last judgment of Hunefer, from his tomb/);
  assert.match(
    source,
    /document\.activeElement === document\.querySelector\('\[data-selected-artwork-title\]'\)/,
  );
});

test('integration copy targets the complete 250-work Units 1-10 map', async () => {
  const [artMap] = await Promise.all([
    readFile(ART_MAP_URL, 'utf8'),
  ]);

  assert.match(artMap, /AP 艺术史互动地图 · Units 1-10/);
  assert.match(
    artMap,
    /aria-label="完整世界地图；展示 AP 艺术史 Units 1-10 全部 250 件作品在非洲、欧洲、亚洲、大洋洲与美洲的全球分布，包含 U6 Africa（非洲）、U7 West and Central Asia（西亚与中亚）与 U8 South, East, and Southeast Asia（南亚、东亚与东南亚）"/,
  );
  assert.match(
    artMap,
    /aria-label="AP 艺术史 Units 1-10 完整世界地图，标记全部 250 件作品在非洲、欧洲、亚洲、大洋洲与美洲的全球分布，包含 U6 Africa（非洲）、U7 West and Central Asia（西亚与中亚）与 U8 South, East, and Southeast Asia（南亚、东亚与东南亚）"/,
  );
  assert.match(artMap, /count\.textContent = `当前显示 \$\{visibleWorks\.length\} 件作品`/);
});

test('full and focused legacy browser paths all use the 250-work Units 1-10 release copy', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');
  assert.equal(source.includes('Units 1-5'), false, 'no stale title/caption assertions in legacy paths');
  assert.equal(source.includes('当前显示 166 件作品'), false, 'no stale reset counts in legacy paths');
  for (const [start, end] of [
    ['async function verifyStandalone(', 'async function selectArtAndFrame('],
    ['async function verifyImportedWorksStandalone(', 'async function verifyImportedWorksEmbedded('],
  ]) {
    assert.ok(source.slice(source.indexOf(start), source.indexOf(end))
      .includes('AP 艺术史互动地图 · Units 1-10'), `${start} updated title assertion`);
  }
});



test('responsive browser modes reject console warnings by default', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');

  assert.match(source, /function installErrorCollection\(page, label\)/);
  assert.match(
    source,
    /message\.type\(\) === 'error'\s*\|\|\s*message\.type\(\) === 'warning'/,
  );
  assert.doesNotMatch(source, /includeWarnings/);
  assert.match(source, /verifyResponsiveWarningRegression/);
  assert.match(source, /console\.warn\('responsive warning regression'\)/);
  assert.match(source, /assert\.rejects/);
});

test('nine-work traversal rejects duplicate requests and forces a real trigger-replacing rerender', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');

  assert.match(source, /assert\.equal\(imageRequests\.length,\s*1/);
  assert.match(source, /assert\.equal\(imageRequests\[0\],\s*work\.imageUrl/);
  assert.doesNotMatch(source, /new Set\(imageRequests\)/);
  assert.match(source, /const originalImageButton = await imageButton\.elementHandle\(\)/);
  assert.match(source, /page\.setViewportSize\(/);
  assert.match(source, /!element\.isConnected/);
  assert.match(source, /document\.querySelector\('\.artwork-image-button'\) !== element/);
});

test('nine-work traversal verifies the inline media source added by the view-aware UI', async () => {
  const source = await readFile(VERIFIER_URL, 'utf8');
  const traversal = source.slice(
    source.indexOf('async function verifyNineImportedWorks'),
    source.indexOf('async function verifyU1Works'),
  );

  assert.match(traversal, /inlineSource/);
  assert.match(traversal, /work\.imageSourceUrl/);
  assert.match(traversal, /work\.imageSourceName/);
  assert.doesNotMatch(traversal, /`许可：\$\{work\.credit\.licenseName\}`/);
  assert.doesNotMatch(traversal, /`来源页：\$\{work\.imageSourceName\}/);
});

test('verification lifecycle closes the server when browser launch rejects', async () => {
  const { runManagedVerification } = await import(VERIFIER_URL.href);
  const events = [];
  const launchError = new Error('launcher rejected');

  await assert.rejects(
    runManagedVerification({
      startServer: async () => ({
        close: async () => events.push('server.close'),
      }),
      launchBrowser: async () => {
        events.push('browser.launch');
        throw launchError;
      },
      verify: async () => events.push('verify'),
    }),
    launchError,
  );
  assert.deepEqual(events, ['browser.launch', 'server.close']);
});

test('verification lifecycle still closes the server when browser close rejects', async () => {
  const { runManagedVerification } = await import(VERIFIER_URL.href);
  const events = [];
  const closeError = new Error('browser close rejected');

  await assert.rejects(
    runManagedVerification({
      startServer: async () => ({
        close: async () => events.push('server.close'),
      }),
      launchBrowser: async () => ({
        close: async () => {
          events.push('browser.close');
          throw closeError;
        },
      }),
      verify: async () => {
        events.push('verify');
        return ['report'];
      },
    }),
    closeError,
  );
  assert.deepEqual(events, ['verify', 'browser.close', 'server.close']);
});

test('verification lifecycle timeout closes browser and server before release timeout', async () => {
  const {
    BROWSER_VERIFICATION_TIMEOUT_MS,
    runManagedVerification,
  } = await import(VERIFIER_URL.href);
  assert.equal(BROWSER_VERIFICATION_TIMEOUT_MS, 10 * 60 * 1000);
  const events = [];

  await assert.rejects(
    Promise.race([
      runManagedVerification({
        timeoutMs: 25,
        startServer: async () => ({
          close: async () => events.push('server.close'),
        }),
        launchBrowser: async () => ({
          close: async () => events.push('browser.close'),
        }),
        verify: async () => new Promise(() => {}),
      }),
      new Promise((_, reject) => setTimeout(
        () => reject(new Error('test guard expired before browser verification timeout')),
        250,
      )),
    ]),
    /Browser verification timed out after 25 ms/,
  );
  assert.deepEqual(events, ['browser.close', 'server.close']);
});

test('verification lifecycle timeout starts before server startup', async () => {
  const { runManagedVerification } = await import(VERIFIER_URL.href);
  const startedAt = Date.now();

  await assert.rejects(
    Promise.race([
      runManagedVerification({
        timeoutMs: 25,
        startServer: async () => new Promise(() => {}),
        launchBrowser: async () => assert.fail('browser must not launch'),
        verify: async () => assert.fail('verification must not start'),
      }),
      new Promise((_, reject) => setTimeout(
        () => reject(new Error('test guard expired before server startup timeout')),
        250,
      )),
    ]),
    /Browser verification timed out after 25 ms/,
  );
  assert.ok(Date.now() - startedAt < 250);
});

test('verification lifecycle deadline catches synchronous blocking server startup', async () => {
  const { runManagedVerification } = await import(VERIFIER_URL.href);
  const events = [];

  await assert.rejects(
    runManagedVerification({
      timeoutMs: 20,
      startServer: () => {
        events.push('server.start');
        const unblockAt = Date.now() + 60;
        while (Date.now() < unblockAt) {
          // Deliberately block to prove the absolute deadline does not depend on timers firing.
        }
        return {
          close: async () => events.push('server.close'),
        };
      },
      launchBrowser: async () => events.push('browser.launch'),
      verify: async () => events.push('verify'),
    }),
    /Browser verification timed out after 20 ms during server startup/,
  );
  assert.deepEqual(events, ['server.start', 'server.close']);
});

test('verification lifecycle deadline catches synchronous blocking browser launch', async () => {
  const { runManagedVerification } = await import(VERIFIER_URL.href);
  const events = [];

  await assert.rejects(
    runManagedVerification({
      timeoutMs: 20,
      startServer: async () => ({
        close: async () => events.push('server.close'),
      }),
      launchBrowser: () => {
        events.push('browser.launch');
        const unblockAt = Date.now() + 60;
        while (Date.now() < unblockAt) {
          // Deliberately block past the watchdog deadline.
        }
        return {
          close: async () => events.push('browser.close'),
        };
      },
      verify: async () => events.push('verify'),
    }),
    /Browser verification timed out after 20 ms during browser launch/,
  );
  assert.deepEqual(events, ['browser.launch', 'browser.close', 'server.close']);
});

test('verification lifecycle deadline catches synchronous blocking verification', async () => {
  const { runManagedVerification } = await import(VERIFIER_URL.href);
  const events = [];

  await assert.rejects(
    runManagedVerification({
      timeoutMs: 20,
      startServer: async () => ({
        close: async () => events.push('server.close'),
      }),
      launchBrowser: async () => ({
        close: async () => events.push('browser.close'),
      }),
      verify: () => {
        events.push('verify');
        const unblockAt = Date.now() + 60;
        while (Date.now() < unblockAt) {
          // Deliberately block past the watchdog deadline.
        }
        return ['late report'];
      },
    }),
    /Browser verification timed out after 20 ms during verification/,
  );
  assert.deepEqual(events, ['verify', 'browser.close', 'server.close']);
});

test('verification lifecycle timeout covers browser launch and cleans the started server', async () => {
  const { runManagedVerification } = await import(VERIFIER_URL.href);
  const events = [];

  await assert.rejects(
    runManagedVerification({
      timeoutMs: 25,
      startServer: async () => ({
        close: async () => events.push('server.close'),
      }),
      launchBrowser: async () => new Promise(() => {}),
      verify: async () => assert.fail('verification must not start'),
    }),
    /Browser verification timed out after 25 ms/,
  );
  assert.deepEqual(events, ['server.close']);
});

test('verification lifecycle disposes a server that resolves after timeout', async () => {
  const { runManagedVerification } = await import(VERIFIER_URL.href);
  const events = [];

  await assert.rejects(
    runManagedVerification({
      timeoutMs: 20,
      cleanupTimeoutMs: 25,
      startServer: async () => new Promise((resolve) => setTimeout(
        () => resolve({
          close: async () => events.push('late server.close'),
        }),
        45,
      )),
      launchBrowser: async () => events.push('browser.launch'),
      verify: async () => events.push('verify'),
    }),
    /Browser verification timed out after 20 ms/,
  );
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.deepEqual(events, ['late server.close']);
});

test('verification lifecycle disposes a browser that resolves after timeout', async () => {
  const { runManagedVerification } = await import(VERIFIER_URL.href);
  const events = [];

  await assert.rejects(
    runManagedVerification({
      timeoutMs: 20,
      cleanupTimeoutMs: 25,
      startServer: async () => ({
        close: async () => events.push('server.close'),
      }),
      launchBrowser: async () => new Promise((resolve) => setTimeout(
        () => resolve({
          close: async () => events.push('late browser.close'),
        }),
        45,
      )),
      verify: async () => events.push('verify'),
    }),
    /Browser verification timed out after 20 ms/,
  );
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.deepEqual(events, ['server.close', 'late browser.close']);
});

test('verification lifecycle bounds teardown after an operation timeout', async () => {
  const {
    BROWSER_CLEANUP_TIMEOUT_MS,
    runManagedVerification,
  } = await import(VERIFIER_URL.href);
  assert.equal(BROWSER_CLEANUP_TIMEOUT_MS, 30_000);
  const startedAt = Date.now();

  await assert.rejects(
    Promise.race([
      runManagedVerification({
        timeoutMs: 20,
        cleanupTimeoutMs: 25,
        startServer: async () => ({
          close: async () => new Promise(() => {}),
        }),
        launchBrowser: async () => ({
          close: async () => new Promise(() => {}),
        }),
        verify: async () => new Promise(() => {}),
      }),
      new Promise((_, reject) => setTimeout(
        () => reject(new Error('test guard expired before teardown timeout')),
        250,
      )),
    ]),
    /Browser verification timed out after 20 ms/,
  );
  assert.ok(Date.now() - startedAt < 250);
});

test('release verifier explicitly runs tests, strict data validation, and browser verification', async () => {
  const source = await readFile(RELEASE_VERIFIER_URL, 'utf8');

  assert.match(source, /--test/);
  assert.match(source, /validate-art-history-data\.mjs/);
  assert.match(source, /verify-art-history-browser\.mjs/);
  assert.match(source, /Release verification failed/);
});
