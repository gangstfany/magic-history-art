import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const HTML_PATH = new URL('../art-history-map.html', import.meta.url);
const loadHtml = () => readFile(HTML_PATH, 'utf8');

test('standalone document copy introduces the complete 250-work Units 1-10 map', async () => {
  const html = await loadHtml();

  assert.match(html, /<title>AP 艺术史互动地图 · Units 1-10<\/title>/);
  assert.match(html, /<h1>AP 艺术史互动地图 · Units 1-10<\/h1>/);

  assert.doesNotMatch(html, /Units 1-2/);
  assert.doesNotMatch(html, /AP 艺术史 · Unit 2 古代地中海/);
});

test('Chinese subtitle connects all 250 works across Units 1-10 including U6 Africa', async () => {
  const html = await loadHtml();

  assert.match(
    html,
    /<p class="subtitle">Units 1-10：从全球史前艺术、古代地中海到 U5 Indigenous Americas 、U6 Africa（非洲）、U7 West and Central Asia（西亚与中亚）与 U8 South, East, and Southeast Asia（南亚、东亚与东南亚），以地点连接全部 250 件作品、传统与历史语境。<\/p>/,
  );
});

function getFunctionSource(html, functionName) {
  const signature = `function ${functionName}(`;
  const start = html.indexOf(signature);
  assert.notEqual(start, -1, `missing ${functionName}()`);
  const openParenthesis = html.indexOf('(', start);
  let parenthesisDepth = 0;
  let openBrace = -1;
  for (let index = openParenthesis; index < html.length; index += 1) {
    if (html[index] === '(') parenthesisDepth += 1;
    if (html[index] === ')') parenthesisDepth -= 1;
    if (parenthesisDepth === 0) {
      openBrace = html.indexOf('{', index);
      break;
    }
  }
  assert.notEqual(openBrace, -1, `missing ${functionName}() body`);
  let depth = 0;
  let end = -1;
  for (let index = openBrace; index < html.length; index += 1) {
    if (html[index] === '{') depth += 1;
    if (html[index] === '}') depth -= 1;
    if (depth === 0) {
      end = index + 1;
      break;
    }
  }
  assert.notEqual(end, -1, `unterminated ${functionName}()`);
  return html.slice(start, end);
}

function getObjectDeclarationSource(html, declaration) {
  const start = html.indexOf(declaration);
  assert.notEqual(start, -1, `missing ${declaration}`);
  const openBrace = html.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let index = openBrace; index < html.length; index += 1) {
    if (html[index] === '{') depth += 1;
    if (html[index] === '}') depth -= 1;
    if (depth === 0) {
      end = html.indexOf(';', index) + 1;
      break;
    }
  }
  assert.notEqual(end, -1, `unterminated ${declaration}`);
  return html.slice(start, end);
}

function loadPureFunctions(html, functionNames, declarations = []) {
  functionNames = [...new Set(['isUnmappedWork', ...functionNames])];
  const sources = [
    ...declarations.map((declaration) => getObjectDeclarationSource(html, declaration)),
    ...functionNames.map((name) => getFunctionSource(html, name)),
  ].join('\n');
  const exports = functionNames.join(', ');
  return Function(`"use strict"; ${sources}; return { ${exports} };`)();
}

function loadMapFitFunctions(html) {
  const sources = [
    getFunctionSource(html, 'isUnmappedWork'),
    getObjectDeclarationSource(html, 'const SITE_WORLD_COORDINATES ='),
    getObjectDeclarationSource(html, 'const state ='),
    getFunctionSource(html, 'toWorldCoordinates'),
    getFunctionSource(html, 'clampTransform'),
    getFunctionSource(html, 'getVisibleWorldBounds'),
    getFunctionSource(html, 'getMapScreenScale'),
    getFunctionSource(html, 'zoomAroundPoint'),
    getFunctionSource(html, 'fitMapToWorks'),
  ].join('\n');
  return Function(
    `"use strict"; ${sources}; return {
      state,
      toWorldCoordinates,
      fitMapToWorks,
      getVisibleWorldBounds,
      getMapScreenScale,
      zoomAroundPoint
    };`,
  )();
}

function parseArtworkData(html) {
  const match = html.match(
    /<script id="artwork-data" type="application\/json">([\s\S]*?)<\/script>/,
  );
  assert.ok(match, 'missing artwork data');
  return JSON.parse(match[1]);
}

function loadStartupAssertions(html) {
  const functionNames = [
    'toWorldCoordinates',
    'normalize',
    'filterWorks',
    'compactApNumbers',
    'formatApGroupLabel',
    'createSiteToken',
    'getApUnitNumber',
    'groupBySite',
    'getMapHierarchyLevel',
    'groupByRegionGrid',
    'buildMapGroups',
    'buildMapGroupCandidates',
    'getMapScreenScale',
    'getMarkerMetrics',
    'getMarkerBounds',
    'markerBoundsOverlap',
    'expandMarkerBounds',
    'createSpatialHash',
    'findNearestAvailableMarkerSlot',
    'layoutSiteMarkers',
    'layoutMapGroups',
    'assert',
    'clampTransform',
    'cycleIndex',
    'zoomAroundPoint',
    'clientDeltaToViewBox',
    'getDensePackingBounds',
    'isUnmappedWork',
    'runDevelopmentAssertions',
  ];
  const sources = [
    `const ARTWORKS = ${JSON.stringify(parseArtworkData(html))};`,
    getObjectDeclarationSource(html, 'const AP_UNITS ='),
    getObjectDeclarationSource(html, 'const state ='),
    getObjectDeclarationSource(html, 'const SITE_WORLD_COORDINATES ='),
    ...functionNames.map((name) => getFunctionSource(html, name)),
  ].join('\n');
  return Function(
    'document',
    'getComputedStyle',
    `"use strict"; ${sources}; return runDevelopmentAssertions;`,
  );
}

function getCssDeclarations(html, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(
    new RegExp(`(?:^|\\n)\\s*${escapedSelector}\\s*\\{([^}]*)\\}`, 's'),
  );
  assert.ok(match, `missing CSS rule for ${selector}`);
  return match[1];
}

function getMediaQuerySource(html, query) {
  const start = html.indexOf(`@media ${query}`);
  assert.notEqual(start, -1, `missing @media ${query}`);
  const end = html.indexOf('@media ', start + query.length + 7);
  return html.slice(start, end === -1 ? html.length : end);
}

test('art map exposes a query-driven embedded presentation mode', async () => {
  const html = await loadHtml();

  assert.match(
    html,
    /<body>\s*<script>\s*const isEmbedded = new URLSearchParams\(window\.location\.search\)\.get\('embed'\) === '1';\s*document\.body\.classList\.toggle\('is-embedded', isEmbedded\);\s*<\/script>/,
  );
  assert.match(
    html,
    /new URLSearchParams\(window\.location\.search\)\.get\('embed'\) === '1'/,
  );
  assert.match(html, /document\.body\.classList\.toggle\('is-embedded', isEmbedded\)/);
  const embeddedBodyCss = getCssDeclarations(html, 'body.is-embedded');
  assert.match(embeddedBodyCss, /display:\s*flex/);
  assert.match(embeddedBodyCss, /flex-direction:\s*column/);
  assert.match(embeddedBodyCss, /height:\s*100vh/);
  assert.match(embeddedBodyCss, /overflow:\s*hidden/);
  assert.match(getCssDeclarations(html, 'body.is-embedded .page-header'), /display:\s*none/);
  const toolbarCss = getCssDeclarations(html, 'body.is-embedded .filter-toolbar');
  assert.match(toolbarCss, /flex:\s*0 0 auto/);
  assert.match(toolbarCss, /width:\s*100%/);
  assert.match(toolbarCss, /max-width:\s*none/);
  assert.match(toolbarCss, /margin:\s*0/);
  assert.match(toolbarCss, /padding:\s*8px 12px/);
  assert.match(toolbarCss, /border-bottom:\s*1px solid var\(--line\)/);
  assert.match(toolbarCss, /background:\s*var\(--card\)/);
  const workspaceCss = getCssDeclarations(html, 'body.is-embedded .art-workspace');
  assert.match(workspaceCss, /flex:\s*1 1 auto/);
  assert.match(workspaceCss, /width:\s*100%/);
  assert.match(workspaceCss, /max-width:\s*none/);
  assert.match(workspaceCss, /height:\s*auto/);
  assert.match(workspaceCss, /min-height:\s*0/);
  assert.match(workspaceCss, /margin:\s*0/);
  assert.match(workspaceCss, /border:\s*0/);
  assert.match(workspaceCss, /border-radius:\s*0/);
  assert.match(workspaceCss, /box-shadow:\s*none/);
  assert.ok(
    html.indexOf('body.is-embedded {') < html.indexOf('@media (max-width:520px)'),
    'embedded rules must precede the responsive media query',
  );
  const narrowEmbeddedCss = getMediaQuerySource(html, '(max-width:520px)');
  const stackedEmbeddedCss = getMediaQuerySource(html, '(max-width:664px)');
  const narrowBodyCss = getCssDeclarations(stackedEmbeddedCss, 'body.is-embedded');
  assert.match(narrowBodyCss, /height:\s*auto/);
  assert.match(narrowBodyCss, /min-height:\s*100vh/);
  assert.match(narrowBodyCss, /overflow:\s*auto/);
  const narrowWorkspaceCss = getCssDeclarations(html, 'body.is-embedded .art-workspace');
  assert.match(narrowWorkspaceCss, /width:\s*100%/);
  assert.match(narrowWorkspaceCss, /max-width:\s*none/);
  assert.match(narrowWorkspaceCss, /height:\s*auto/);
  assert.match(narrowWorkspaceCss, /min-height:\s*0/);
  assert.match(narrowWorkspaceCss, /margin:\s*0/);
  assert.match(narrowWorkspaceCss, /border:\s*0/);
  assert.match(narrowWorkspaceCss, /border-radius:\s*0/);
});

test('compact desktop controls recover 44px touch targets on narrow screens', async () => {
  const html = await loadHtml();
  const narrowCss = getMediaQuerySource(html, '(max-width:520px)');
  const stackedCss = getMediaQuerySource(html, '(max-width:664px)');
  const stackedEmbeddedBody = getCssDeclarations(stackedCss, 'body.is-embedded');

  const narrowControls = getCssDeclarations(narrowCss, '.map-controls button');
  assert.match(narrowControls, /width:\s*44px/);
  assert.match(narrowControls, /height:\s*44px/);
  assert.match(narrowControls, /min-width:\s*44px/);
  assert.match(narrowControls, /min-height:\s*44px/);

  const narrowFilters = getCssDeclarations(
    narrowCss,
    '.filter-pill, .clear-button, select, input[type="search"]',
  );
  assert.match(narrowFilters, /min-height:\s*44px/);
  assert.match(getCssDeclarations(narrowCss, '.culture-filters'), /gap:\s*8px/);
  assert.match(getCssDeclarations(narrowCss, '#unitFilter, .culture-filters .filter-pill'), /min-height:\s*44px/);

  const desktopCultureFilters = getCssDeclarations(html, '.culture-filters');
  assert.match(desktopCultureFilters, /gap:\s*6px/);
  const desktopUnitFilter = getCssDeclarations(html, '#unitFilter');
  assert.match(desktopUnitFilter, /font-size:\s*13px/);
  assert.match(desktopUnitFilter, /font-weight:\s*600/);
  assert.match(desktopUnitFilter, /min-height:\s*34px/);

  assert.match(stackedEmbeddedBody, /height:\s*auto/);
  assert.match(stackedEmbeddedBody, /min-height:\s*100vh/);
  assert.match(stackedEmbeddedBody, /overflow:\s*auto/);
  assert.match(
    getCssDeclarations(narrowCss, 'body.is-embedded .filter-toolbar'),
    /padding:\s*8px 12px/,
  );

  const narrowWorkspace = getCssDeclarations(html, 'body.is-embedded .art-workspace');
  assert.match(narrowWorkspace, /width:\s*100%/);
  assert.match(narrowWorkspace, /max-width:\s*none/);
  assert.match(narrowWorkspace, /height:\s*auto/);
  assert.match(narrowWorkspace, /min-height:\s*0/);
  assert.match(narrowWorkspace, /margin:\s*0/);
  assert.match(narrowWorkspace, /border:\s*0/);
  assert.match(narrowWorkspace, /border-radius:\s*0/);
  assert.match(
    getCssDeclarations(stackedCss, '.art-workspace'),
    /grid-template-columns:\s*1fr/,
  );
});

test('responsive toolbar and workspace rules cannot force horizontal overflow at 375px', async () => {
  const html = await loadHtml();
  const narrowCss = getMediaQuerySource(html, '(max-width:520px)');
  const stackedCss = getMediaQuerySource(html, '(max-width:664px)');

  assert.match(getCssDeclarations(html, 'body'), /min-width:\s*0/);
  assert.match(getCssDeclarations(html, '.filter-toolbar'), /flex-wrap:\s*wrap/);
  assert.match(
    getCssDeclarations(html, 'select, input[type="search"]'),
    /max-width:\s*100%/,
  );
  assert.match(getCssDeclarations(html, '.art-workspace'), /width:\s*calc\(100% - 40px\)/);
  assert.match(
    getCssDeclarations(html, '.art-workspace'),
    /grid-template-columns:\s*minmax\(0,2fr\) minmax\(275px,1fr\)/,
  );
  assert.match(getCssDeclarations(html, '.map-panel'), /min-width:\s*0/);
  assert.match(getCssDeclarations(html, '.detail-panel'), /min-width:\s*0/);

  assert.match(getCssDeclarations(narrowCss, '.filter-toolbar > *'), /max-width:\s*100%/);
  assert.match(
    getCssDeclarations(narrowCss, '.filter-label:has(#searchInput)'),
    /width:\s*100%/,
  );
  assert.match(getCssDeclarations(narrowCss, '#searchInput'), /width:\s*100%/);
  const narrowWorkspace = getCssDeclarations(stackedCss, '.art-workspace');
  assert.match(narrowWorkspace, /width:\s*calc\(100% - 24px\)/);
  assert.match(narrowWorkspace, /grid-template-columns:\s*1fr/);
  assert.doesNotMatch(narrowCss, /min-width:\s*(?:[4-9]\d\d|\d{4,})px/);
});

test('workspace stays stacked through 664px and opens a usable two-column map at 665px', async () => {
  const html = await loadHtml();
  const stackedCss = getMediaQuerySource(html, '(max-width:664px)');
  const stackedWorkspace = getCssDeclarations(stackedCss, '.art-workspace');
  const stackedMap = getCssDeclarations(stackedCss, '.map-panel');

  assert.match(stackedWorkspace, /grid-template-columns:\s*1fr/);
  assert.match(stackedWorkspace, /grid-template-rows:\s*auto auto/);
  assert.match(stackedMap, /grid-template-rows:\s*minmax\(330px,55vh\) auto/);
  assert.match(getCssDeclarations(stackedCss, '.map-svg'), /min-height:\s*330px/);

  const standaloneWorkspaceAt665 = 665 - 40;
  const detailColumn = 275;
  assert.equal(standaloneWorkspaceAt665 - detailColumn, 350);
  assert.doesNotMatch(html, /@media \(max-width:52[1-9]px\)[\s\S]*grid-template-columns:\s*1fr/);
});

test('expanded short-host iframe keeps its stacked embedded child non-scrolling', async () => {
  const html = await loadHtml();
  const expandedHostCss = getMediaQuerySource(
    html,
    '(max-width:664px) and (min-height:900px)',
  );
  const embeddedBody = getCssDeclarations(expandedHostCss, 'body.is-embedded');

  assert.match(embeddedBody, /height:\s*100vh/);
  assert.match(embeddedBody, /min-height:\s*0/);
  assert.match(embeddedBody, /overflow:\s*hidden/);
});

test('embedded 520px structure reserves a safe map and meaningful detail height', async () => {
  const html = await loadHtml();
  const narrowCss = getMediaQuerySource(html, '(max-width:520px)');
  const workspace = getCssDeclarations(narrowCss, 'body.is-embedded .art-workspace');
  const mapPanel = getCssDeclarations(narrowCss, 'body.is-embedded .map-panel');
  const detailPanel = getCssDeclarations(narrowCss, 'body.is-embedded .detail-panel');

  assert.match(workspace, /flex:\s*0 0 auto/);
  assert.match(workspace, /min-height:\s*550px/);
  assert.match(mapPanel, /grid-template-rows:\s*330px auto/);
  assert.match(detailPanel, /min-height:\s*220px/);
});

test('art map reuses World History typography and compact detail hierarchy', async () => {
  const html = await loadHtml();
  assert.match(
    html,
    /font-family:\s*"PingFang SC",\s*"Hiragino Sans GB",\s*-apple-system,\s*"Helvetica Neue",\s*sans-serif/,
  );
  assert.match(html, /heading\.className = 'work-title-en'/);
  assert.match(html, /heading\.textContent = work\.titleEn/);
  assert.match(html, /chineseTitle\.className = 'work-title-zh'/);
  assert.match(html, /chineseTitle\.textContent = work\.titleZh/);
  assert.match(
    html,
    /summary\.append\(heading,\s*chineseTitle,\s*meta,\s*imageStage\)/,
    'detail summary must append English heading before the Chinese subtitle and metadata',
  );
  assert.match(html, /summary\.append\(creditHost,\s*identity\)/);
  const englishTitleCss = getCssDeclarations(html, '.work-title-en');
  assert.match(englishTitleCss, /font-size:\s*19px/);
  assert.match(englishTitleCss, /font-weight:\s*800/);
  const chineseTitleCss = getCssDeclarations(html, '.work-title-zh');
  assert.match(chineseTitleCss, /font-size:\s*13px/);
  assert.match(chineseTitleCss, /font-weight:\s*600/);
  assert.match(getCssDeclarations(html, '.work-meta'), /font-size:\s*12px/);
  const detailPanelCss = getCssDeclarations(html, '.detail-panel');
  assert.match(detailPanelCss, /font-size:\s*13\.5px/);
  assert.match(detailPanelCss, /font-weight:\s*600/);
  assert.match(detailPanelCss, /line-height:\s*1\.55/);
  assert.match(detailPanelCss, /padding:\s*18px/);
  const detailTabCss = getCssDeclarations(html, '.detail-tab');
  assert.match(detailTabCss, /font-size:\s*13px/);
  assert.match(detailTabCss, /font-weight:\s*600/);
  const compactFilterCss = getCssDeclarations(html, '.filter-pill, .clear-button');
  assert.match(compactFilterCss, /font-size:\s*13px/);
  assert.match(compactFilterCss, /font-weight:\s*600/);
  assert.match(compactFilterCss, /min-height:\s*34px/);
  assert.match(
    getCssDeclarations(html, '.instruction p, .empty-state p'),
    /line-height:\s*1\.55/,
  );
  assert.match(html, /meta\.textContent = formatArtworkMeta\(work\)/);
  assert.match(
    html,
    /`Open \$\{work\.titleEn\}（\$\{work\.titleZh\}）· \$\{media\.label\} 大图`/,
  );
  assert.match(html, /<dialog id="imageDialog"[^>]*aria-labelledby="dialogTitle"/);
  assert.match(
    html,
    /document\.getElementById\('dialogTitle'\)\.textContent = `\$\{work\.titleEn\} · \$\{work\.titleZh\}`/,
  );
});

test('all art map text inherits the World History font stack', async () => {
  const html = await loadHtml();
  assert.equal(
    (html.match(/font-family\s*:/g) || []).length,
    1,
    'only the page-level World History font stack may declare a font family',
  );
  assert.doesNotMatch(
    html,
    /font:\s*[^;}]*(?:ui-sans-serif|system-ui)/,
    'font shorthands must not override the page font family',
  );
  const markerLabelCss = getCssDeclarations(html, '.site-marker .marker-ap-label');
  assert.match(markerLabelCss, /font-weight:\s*700/);
  const imageCreditCss = getCssDeclarations(html, '.image-credit');
  assert.match(imageCreditCss, /font-size:\s*\.78rem/);
  assert.match(imageCreditCss, /line-height:\s*1\.5/);
  assert.match(getCssDeclarations(html, '.legend'), /font-size:\s*12px/);
});

test('compact AP number helpers preserve gaps and merge consecutive ranges', async () => {
  const html = await loadHtml();
  const { compactApNumbers, formatApGroupLabel } = loadPureFunctions(
    html,
    ['compactApNumbers', 'formatApGroupLabel'],
  );

  assert.equal(compactApNumbers([35, 39, 40]), '35, 39–40');
  assert.equal(compactApNumbers([41, 42, 43, 44, 45, 46, 47]), '41–47');
  assert.equal(
    formatApGroupLabel([{ apNumber: 40 }, { apNumber: 39 }, { apNumber: 35 }]),
    'AP 35, 39–40',
  );
});

test('the real development startup assertions use collision fallback at narrow scales', async () => {
  const html = await loadHtml();
  const createStartupAssertions = loadStartupAssertions(html);
  const geography = { classList: { contains: (name) => name === 'world-geography' } };
  const worldSvg = {
    getAttribute: (name) => (name === 'viewBox' ? '0 0 1600 800' : null),
    querySelectorAll: () => Array.from({ length: 100 }),
  };
  const document = {
    querySelector(selector) {
      if (selector === '.map-svg') return worldSvg;
      if (selector === '.world-geography') return geography;
      return null;
    },
    getElementById(id) {
      return id === 'panSurface' ? { nextElementSibling: geography } : null;
    },
  };
  const runDevelopmentAssertions = createStartupAssertions(
    document,
    () => ({ pointerEvents: 'none' }),
  );

  assert.doesNotThrow(
    () => runDevelopmentAssertions(),
    'startup assertions must exercise the same hierarchical collision fallback as render()',
  );
});

test('official AP unit helpers use every published unit boundary', async () => {
  const html = await loadHtml();
  const configSource = [
    getObjectDeclarationSource(html, 'const AP_UNITS ='),
    getObjectDeclarationSource(html, 'const TRADITION_LABELS ='),
    getObjectDeclarationSource(html, 'const UNIT_FILTER_CONFIG ='),
    getObjectDeclarationSource(html, 'const MAP_REGIONS ='),
  ].join('\n');
  const { AP_UNITS, TRADITION_LABELS, UNIT_FILTER_CONFIG, MAP_REGIONS } = Function(
    `"use strict"; ${configSource}; return { AP_UNITS, TRADITION_LABELS, UNIT_FILTER_CONFIG, MAP_REGIONS };`,
  )();
  const { getUnitById, getApUnitNumber } = loadPureFunctions(
    html,
    ['getUnitById', 'getApUnitNumber'],
    ['const AP_UNITS ='],
  );
  const boundaries = [
    [1, 1], [11, 1], [12, 2], [47, 2], [48, 3], [98, 3], [99, 4], [152, 4],
    [153, 5], [166, 5], [167, 6], [180, 6], [181, 7], [191, 7], [192, 8],
    [212, 8], [213, 9], [223, 9], [224, 10], [250, 10],
  ];

  assert.deepEqual(AP_UNITS, [
    { id: 1, nameEn: 'Global Prehistory', start: 1, end: 11, requiredCount: 11 },
    { id: 2, nameEn: 'Ancient Mediterranean', start: 12, end: 47, requiredCount: 36 },
    { id: 3, nameEn: 'Early Europe and Colonial Americas', start: 48, end: 98, requiredCount: 51 },
    { id: 4, nameEn: 'Later Europe and Americas', start: 99, end: 152, requiredCount: 54 },
    { id: 5, nameEn: 'Indigenous Americas', start: 153, end: 166, requiredCount: 14 },
    { id: 6, nameEn: 'Africa', start: 167, end: 180, requiredCount: 14 },
    { id: 7, nameEn: 'West and Central Asia', start: 181, end: 191, requiredCount: 11 },
    { id: 8, nameEn: 'South, East, and Southeast Asia', start: 192, end: 212, requiredCount: 21 },
    { id: 9, nameEn: 'The Pacific', start: 213, end: 223, requiredCount: 11 },
    { id: 10, nameEn: 'Global Contemporary', start: 224, end: 250, requiredCount: 27 },
  ]);
  assert.equal(Object.isFrozen(AP_UNITS), true);
  assert.ok(AP_UNITS.every(Object.isFrozen));
  assert.equal(Object.isFrozen(TRADITION_LABELS), true);
  assert.ok(Object.values(TRADITION_LABELS).every(Object.isFrozen));
  assert.equal(Object.isFrozen(UNIT_FILTER_CONFIG), true);
  assert.ok(Object.values(UNIT_FILTER_CONFIG).every(Object.isFrozen));
  assert.ok(Object.values(UNIT_FILTER_CONFIG).every(({ cultureIds }) => Object.isFrozen(cultureIds)));
  assert.equal(Object.isFrozen(MAP_REGIONS), true);
  assert.ok(Object.values(MAP_REGIONS).every(Object.isFrozen));
  assert.ok(Object.values(MAP_REGIONS).every(({ unitIds }) => Object.isFrozen(unitIds)));

  for (const [apNumber, unitId] of boundaries) {
    assert.equal(getApUnitNumber(apNumber), unitId, `AP #${apNumber}`);
  }
  assert.equal(getApUnitNumber(0), null);
  assert.equal(getApUnitNumber(251), null);
  assert.equal(getUnitById(2).nameEn, 'Ancient Mediterranean');
  assert.equal(getUnitById(2).requiredCount, 36);
  assert.equal(getUnitById(12), null);
  assert.equal(getUnitById('2'), null);
});

test('Unit 8 registers five English traditions and six creation-context regions',async()=>{
 const html=await loadHtml();
 const source=[getObjectDeclarationSource(html,'const UNIT_FILTER_CONFIG ='),getObjectDeclarationSource(html,'const MAP_REGIONS =')].join('\n');
 const {UNIT_FILTER_CONFIG,MAP_REGIONS}=Function(`${source};return{UNIT_FILTER_CONFIG,MAP_REGIONS}`)();
 assert.deepEqual(UNIT_FILTER_CONFIG[8],{showCultureFilters:true,cultureIds:['Buddhist Sacred Sites','Hindu Sacred Art','Court & Imperial Power','Landscape & Nature','Ceramics & Exchange']});
 for(const [id,name]of Object.entries({india:'India',china:'China',korea:'Korea',japan:'Japan',indonesia:'Indonesia',cambodia:'Cambodia'})){
  assert.equal(MAP_REGIONS[id]?.nameEn,name);assert.ok(MAP_REGIONS[id]?.unitIds.includes(8));
 }
});

test('Unit filter configuration, tradition labels, and map regions cover Units 1 through 8', async () => {
  const html = await loadHtml();
  const configSource = [
    getObjectDeclarationSource(html, 'const TRADITION_LABELS ='),
    getObjectDeclarationSource(html, 'const UNIT_FILTER_CONFIG ='),
    getObjectDeclarationSource(html, 'const MAP_REGIONS ='),
  ].join('\n');
  const { TRADITION_LABELS, UNIT_FILTER_CONFIG, MAP_REGIONS } = Function(
    `"use strict"; ${configSource}; return { TRADITION_LABELS, UNIT_FILTER_CONFIG, MAP_REGIONS };`,
  )();

  assert.deepEqual(
    UNIT_FILTER_CONFIG,
    {
      1: { showCultureFilters: false, cultureIds: [] },
      2: {
        showCultureFilters: true,
        cultureIds: ['ancientNearEast', 'egypt', 'greece', 'etruscan', 'rome'],
      },
      3: {
        showCultureFilters: true,
        cultureIds: [
          'lateAntiqueByzantine',
          'medievalIslamic',
          'renaissanceMannerism',
          'baroqueColonial',
        ],
      },
      4: {
        showCultureFilters: true,
        cultureIds: [
          'enlightenmentRevolution',
          'realismIndustryPhotography',
          'postImpressionismEarlyModernism',
          'avantGardeArchitecturePostwar',
        ],
      },
      5: {
        showCultureFilters: true,
        cultureIds: [
          'Ancient Mesoamerica',
          'Ancient Central Andes',
          'Ancient North America',
          'Native North America',
        ],
      },
      6: {
        showCultureFilters: true,
        cultureIds: [
          'African Architecture',
          'Royal & Court Arts',
          'Performance & Masquerade',
          'Power, Memory & Ancestors',
        ],
      },
      7: {
        showCultureFilters: true,
        cultureIds: ['Architecture & Sacred Sites', 'Buddhist Devotion', 'Manuscripts & Calligraphy', 'Metalwork & Textiles'],
      },
      8: {
        showCultureFilters: true,
        cultureIds: ['Buddhist Sacred Sites', 'Hindu Sacred Art', 'Court & Imperial Power', 'Landscape & Nature', 'Ceramics & Exchange'],
      },
      9: {
        showCultureFilters: true,
        cultureIds: ['Monuments & Ancestors','Rank & Sacred Regalia','Ritual & Performance','Cloth & Exchange','Navigation & Knowledge'],
      },
      10: {
        showCultureFilters: true,
        cultureIds: ['Public Space & Memory','Identity & Representation','Abstraction & Landscape','Body & Spirituality','Language & Media','Materials & Global Exchange'],
      },
    },
  );
  assert.deepEqual(TRADITION_LABELS.prehistoricNamibia, {
    labelEn: 'Prehistoric Namibia',
    labelZh: '史前纳米比亚',
  });
  assert.deepEqual(TRADITION_LABELS.lapita, {
    labelEn: 'Lapita',
    labelZh: '拉皮塔',
  });
  assert.deepEqual(TRADITION_LABELS.ancientNearEast, {
    labelEn: 'Ancient Near East',
    labelZh: '古代近东',
  });
  assert.deepEqual(TRADITION_LABELS.rome, {
    labelEn: 'Rome',
    labelZh: '罗马',
  });
  assert.deepEqual(MAP_REGIONS.africa, { nameEn: 'Africa', unitIds: [1] });
  assert.deepEqual(MAP_REGIONS.europe, { nameEn: 'Europe', unitIds: [1, 10] });
  assert.deepEqual(MAP_REGIONS.americas, { nameEn: 'Americas', unitIds: [1] });
  assert.deepEqual(MAP_REGIONS.middleEast, { nameEn: 'Middle East', unitIds: [1, 2] });
  assert.deepEqual(MAP_REGIONS.eastAsia, { nameEn: 'East Asia', unitIds: [1] });
  assert.deepEqual(MAP_REGIONS.oceania, { nameEn: 'Oceania', unitIds: [1] });
  assert.equal(MAP_REGIONS.middleEast?.nameEn, 'Middle East');
  assert.deepEqual(MAP_REGIONS.northAfrica, { nameEn: 'North Africa', unitIds: [2] });
  assert.deepEqual(MAP_REGIONS.southernEurope, { nameEn: 'Southern Europe', unitIds: [2, 4] });
  assert.deepEqual(MAP_REGIONS.italyVatican, { nameEn: 'Italy & Vatican', unitIds: [3] });
  assert.deepEqual(MAP_REGIONS.france, { nameEn: 'France', unitIds: [3, 4] });
  assert.deepEqual(MAP_REGIONS.iberianPeninsula, { nameEn: 'Iberian Peninsula', unitIds: [3] });
  assert.deepEqual(MAP_REGIONS.britishIsles, { nameEn: 'British Isles', unitIds: [3, 4] });
  assert.deepEqual(MAP_REGIONS.lowCountries, { nameEn: 'Low Countries', unitIds: [3] });
  assert.deepEqual(MAP_REGIONS.centralEurope, { nameEn: 'Central Europe', unitIds: [3] });
  assert.deepEqual(MAP_REGIONS.easternMediterranean, {
    nameEn: 'Eastern Mediterranean',
    unitIds: [3],
  });
  assert.deepEqual(MAP_REGIONS.colonialAmericas, {
    nameEn: 'Colonial Americas',
    unitIds: [3],
  });
  assert.deepEqual(MAP_REGIONS.france, { nameEn: 'France', unitIds: [3, 4] });
  assert.deepEqual(MAP_REGIONS.britishIsles, { nameEn: 'British Isles', unitIds: [3, 4] });
  assert.deepEqual(MAP_REGIONS.southernEurope, { nameEn: 'Southern Europe', unitIds: [2, 4] });
  assert.deepEqual(MAP_REGIONS.centralNorthernEurope, {
    nameEn: 'Central & Northern Europe', unitIds: [4],
  });
  assert.deepEqual(MAP_REGIONS.russiaSoviet, { nameEn: 'Russia & Soviet Union', unitIds: [4] });
  assert.deepEqual(MAP_REGIONS.unitedStates, { nameEn: 'United States', unitIds: [4] });
  assert.deepEqual(MAP_REGIONS.mexicoCaribbean, { nameEn: 'Mexico & Caribbean', unitIds: [4] });
  assert.deepEqual(MAP_REGIONS.pacific, { nameEn: 'Pacific', unitIds: [4] });
  assert.deepEqual(MAP_REGIONS.transatlantic, { nameEn: 'Transatlantic', unitIds: [4] });
  assert.deepEqual(
    Object.fromEntries(
      [
        'mesoamerica',
        'centralAndes',
        'ancestralPueblo',
        'easternWoodlands',
        'northwestCoast',
        'plainsGreatBasin',
      ].map((regionId) => [regionId, MAP_REGIONS[regionId]]),
    ),
    {
      mesoamerica: { nameEn: 'Mesoamerica', unitIds: [5] },
      centralAndes: { nameEn: 'Central Andes', unitIds: [5] },
      ancestralPueblo: { nameEn: 'Ancestral Pueblo', unitIds: [5] },
      easternWoodlands: { nameEn: 'Eastern Woodlands', unitIds: [5] },
      northwestCoast: { nameEn: 'Northwest Coast', unitIds: [5] },
      plainsGreatBasin: { nameEn: 'Plains & Great Basin', unitIds: [5] },
    },
  );
});

test('Unit 5 freezes four broad traditions and labels every precise culture', async () => {
  const html = await loadHtml();
  const configSource = [
    getObjectDeclarationSource(html, 'const TRADITION_LABELS ='),
    getObjectDeclarationSource(html, 'const UNIT_FILTER_CONFIG ='),
  ].join('\n');
  const { TRADITION_LABELS, UNIT_FILTER_CONFIG } = Function(
    `"use strict"; ${configSource}; return { TRADITION_LABELS, UNIT_FILTER_CONFIG };`,
  )();
  const unit5 = parseArtworkData(html).filter(({ unit }) => unit === 5);
  const preciseCultures = [...new Set(unit5.map(({ culture }) => culture))];

  assert.deepEqual(
    UNIT_FILTER_CONFIG[5].cultureIds.map((id) => TRADITION_LABELS[id].labelEn),
    [
      'Ancient Mesoamerica',
      'Ancient Central Andes',
      'Ancient North America',
      'Native North America',
    ],
  );
  assert.deepEqual(
    UNIT_FILTER_CONFIG[5].cultureIds.map((id) => TRADITION_LABELS[id].labelZh),
    ['古代中美洲', '古代中安第斯', '古代北美洲', '北美原住民艺术'],
  );
  assert.equal(preciseCultures.length, 14);
  for (const culture of preciseCultures) {
    assert.ok(TRADITION_LABELS[culture], `missing precise U5 label: ${culture}`);
    assert.ok(TRADITION_LABELS[culture].labelEn);
    assert.ok(TRADITION_LABELS[culture].labelZh);
  }
});

test('Unit 3 broad and precise tradition labels are exact and bilingual', async () => {
  const html = await loadHtml();
  const configSource = [
    getObjectDeclarationSource(html, 'const TRADITION_LABELS ='),
    getObjectDeclarationSource(html, 'const UNIT_FILTER_CONFIG ='),
  ].join('\n');
  const { TRADITION_LABELS, UNIT_FILTER_CONFIG } = Function(
    `"use strict"; ${configSource}; return { TRADITION_LABELS, UNIT_FILTER_CONFIG };`,
  )();
  const expected = {
    lateAntiqueByzantine: {
      labelEn: 'Late Antique & Byzantine',
      labelZh: '晚期古代与拜占庭',
    },
    medievalIslamic: {
      labelEn: 'Medieval & Islamic',
      labelZh: '中世纪与伊斯兰',
    },
    renaissanceMannerism: {
      labelEn: 'Renaissance & Mannerism',
      labelZh: '文艺复兴与矫饰主义',
    },
    baroqueColonial: {
      labelEn: 'Baroque & Colonial',
      labelZh: '巴洛克与殖民艺术',
    },
    earlyChristianRome: { labelEn: 'Early Christian Rome', labelZh: '早期基督教罗马' },
    earlyByzantineManuscript: {
      labelEn: 'Early Byzantine Manuscript',
      labelZh: '早期拜占庭手抄本',
    },
    byzantineRavenna: { labelEn: 'Byzantine Ravenna', labelZh: '拜占庭拉文纳' },
    byzantineConstantinople: {
      labelEn: 'Byzantine Constantinople',
      labelZh: '拜占庭君士坦丁堡',
    },
    merovingianMetalwork: { labelEn: 'Merovingian Metalwork', labelZh: '墨洛温金属工艺' },
    byzantineSinai: { labelEn: 'Byzantine Sinai', labelZh: '拜占庭西奈' },
    insularHibernoSaxon: {
      labelEn: 'Insular Hiberno-Saxon',
      labelZh: '不列颠群岛希伯诺-撒克逊',
    },
    umayyadIberia: { labelEn: 'Umayyad Iberia', labelZh: '伊比利亚倭马亚' },
    romanesquePilgrimage: {
      labelEn: 'Romanesque Pilgrimage Art',
      labelZh: '罗马式朝圣艺术',
    },
    normanRomanesque: { labelEn: 'Norman Romanesque', labelZh: '诺曼罗马式' },
    frenchGothic: { labelEn: 'French Gothic', labelZh: '法国哥特式' },
    frenchGothicManuscript: {
      labelEn: 'French Gothic Manuscript',
      labelZh: '法国哥特式手抄本',
    },
    germanGothicDevotional: {
      labelEn: 'German Gothic Devotional Art',
      labelZh: '德国哥特式虔敬艺术',
    },
    protoRenaissanceItaly: {
      labelEn: 'Italian Proto-Renaissance',
      labelZh: '意大利原文艺复兴',
    },
    sephardicJewishManuscript: {
      labelEn: 'Sephardic Jewish Manuscript',
      labelZh: '塞法迪犹太手抄本',
    },
    nasridAndalusia: { labelEn: 'Nasrid Andalusia', labelZh: '纳斯里德安达卢西亚' },
    earlyNetherlandish: { labelEn: 'Early Netherlandish', labelZh: '早期尼德兰' },
    florentineEarlyRenaissance: {
      labelEn: 'Florentine Early Renaissance',
      labelZh: '佛罗伦萨早期文艺复兴',
    },
    florentineRenaissance: {
      labelEn: 'Florentine Renaissance',
      labelZh: '佛罗伦萨文艺复兴',
    },
    highRenaissanceItaly: {
      labelEn: 'Italian High Renaissance',
      labelZh: '意大利文艺复兴盛期',
    },
    northernRenaissanceGermany: {
      labelEn: 'German Northern Renaissance',
      labelZh: '德国北方文艺复兴',
    },
    italianMannerism: { labelEn: 'Italian Mannerism', labelZh: '意大利矫饰主义' },
    protestantReformationGermany: {
      labelEn: 'German Protestant Reformation',
      labelZh: '德国宗教改革',
    },
    venetianRenaissance: { labelEn: 'Venetian Renaissance', labelZh: '威尼斯文艺复兴' },
    colonialMexicaManuscript: {
      labelEn: 'Colonial Mexica Manuscript',
      labelZh: '新西班牙墨西加殖民手抄本',
    },
    romanBaroqueJesuit: {
      labelEn: 'Roman Jesuit Baroque',
      labelZh: '罗马耶稣会巴洛克',
    },
    northernRenaissanceFlemish: {
      labelEn: 'Flemish Northern Renaissance',
      labelZh: '佛兰德斯北方文艺复兴',
    },
    ottomanIslamic: { labelEn: 'Ottoman Islamic', labelZh: '奥斯曼伊斯兰' },
    italianBaroque: { labelEn: 'Italian Baroque', labelZh: '意大利巴洛克' },
    flemishBaroque: { labelEn: 'Flemish Baroque', labelZh: '佛兰德斯巴洛克' },
    dutchBaroque: { labelEn: 'Dutch Baroque', labelZh: '荷兰巴洛克' },
    andeanColonialBaroque: {
      labelEn: 'Andean Colonial Baroque',
      labelZh: '安第斯殖民巴洛克',
    },
    spanishBaroque: { labelEn: 'Spanish Baroque', labelZh: '西班牙巴洛克' },
    frenchBaroqueAbsolutism: {
      labelEn: 'French Absolutist Baroque',
      labelZh: '法国绝对主义巴洛克',
    },
    newSpainEnconchado: {
      labelEn: 'New Spain Enconchado',
      labelZh: '新西班牙螺钿画',
    },
    newSpainGuadalupe: {
      labelEn: 'New Spain Guadalupe Art',
      labelZh: '新西班牙瓜达卢佩圣母艺术',
    },
    dutchBaroqueStillLife: {
      labelEn: 'Dutch Baroque Still Life',
      labelZh: '荷兰巴洛克静物画',
    },
    newSpainCasta: { labelEn: 'New Spain Casta Painting', labelZh: '新西班牙种姓画' },
    britishRococoSatire: {
      labelEn: 'British Rococo Satire',
      labelZh: '英国洛可可讽刺画',
    },
  };

  assert.deepEqual(
    Object.fromEntries(Object.keys(expected).map((key) => [key, TRADITION_LABELS[key]])),
    expected,
  );
  const unit3Cultures = new Set(
    parseArtworkData(html).filter(({ unit }) => unit === 3).map(({ culture }) => culture),
  );
  assert.deepEqual(
    [...unit3Cultures].filter((culture) => !TRADITION_LABELS[culture]),
    [],
  );
  const expectedKeyset = [...new Set([
    ...parseArtworkData(html).map(({ culture }) => culture),
    ...Object.values(UNIT_FILTER_CONFIG).flatMap(({ cultureIds }) => cultureIds),
  ])].sort();
  assert.deepEqual(Object.keys(TRADITION_LABELS).sort(), expectedKeyset);
});

test('detail metadata resolves every supported culture without undefined labels', async () => {
  const html = await loadHtml();
  const { getCultureLabel, formatArtworkMeta } = loadPureFunctions(
    html,
    ['getCultureLabel', 'formatArtworkMeta'],
    ['const TRADITION_LABELS ='],
  );
  const expected = {
    prehistoricNamibia: '史前纳米比亚',
    paleolithicEurope: '旧石器时代欧洲',
    prehistoricCentralMexico: '史前墨西哥中部',
    saharanPrehistory: '史前撒哈拉',
    prehistoricSusa: '史前苏萨',
    arabianPrehistory: '史前阿拉伯半岛',
    liangzhu: '良渚',
    neolithicEurope: '新石器时代欧洲',
    papuaNewGuineaHighlands: '巴布亚新几内亚高地',
    tlatilco: '特拉特尔科',
    lapita: '拉皮塔',
    ancientNearEast: '古代近东',
    egypt: '埃及',
    greece: '希腊',
    etruscan: '伊特鲁里亚',
    rome: '罗马',
  };

  for (const [culture, label] of Object.entries(expected)) {
    assert.equal(getCultureLabel(culture, 'zh'), label);
    const metadata = formatArtworkMeta({
      apNumber: 12,
      culture,
      period: 'Test period',
      date: 'Test date',
    });
    assert.match(metadata, new RegExp(`· ${label} ·`));
    assert.doesNotMatch(metadata, /undefined/);
  }
  assert.equal(getCultureLabel('unknownTradition', 'zh'), 'unknownTradition');
  assert.equal(getCultureLabel('unknownTradition', 'en'), 'unknownTradition');
});

test('culture filter visibility follows the selected Unit configuration', async () => {
  const html = await loadHtml();
  const source = getFunctionSource(html, 'renderCultureFilters');

  assert.match(source, /state\.unit === 'all' \? null : Number\(state\.unit\)/);
  assert.match(source, /UNIT_FILTER_CONFIG\[unitId\]/);
  assert.match(source, /container\.hidden = !unitConfig\?\.showCultureFilters/);
  assert.match(source, /container\.replaceChildren\(\)/);
  assert.match(source, /\['all',\s*\.\.\.unitConfig\.cultureIds\]/);
  assert.match(
    source,
    /unitId === 3[\s\S]*'All traditions'[\s\S]*unitId === 4[\s\S]*'All movements'[\s\S]*'All cultures'[\s\S]*getCultureLabel\(cultureId, 'en'\)/,
  );
  assert.match(source, /updateCultureFilterSelection\(container, state\.culture\)/);
});

test('Units 3 and 5 render broad tradition pills while Units 2 and 4 keep their wording', async () => {
  const html = await loadHtml();
  const sources = [
    getObjectDeclarationSource(html, 'const TRADITION_LABELS ='),
    getObjectDeclarationSource(html, 'const UNIT_FILTER_CONFIG ='),
    getObjectDeclarationSource(html, 'const state ='),
    getFunctionSource(html, 'getCultureLabel'),
    getFunctionSource(html, 'updateCultureFilterSelection'),
    getFunctionSource(html, 'renderCultureFilters'),
  ].join('\n');
  const container = {
    hidden: false,
    children: [],
    replaceChildren() { this.children = []; },
    append(child) { this.children.push(child); },
    querySelectorAll() { return this.children; },
  };
  const document = {
    getElementById(id) {
      assert.equal(id, 'cultureFilters');
      return container;
    },
    createElement(tagName) {
      assert.equal(tagName, 'button');
      return {
        dataset: {},
        attributes: new Map(),
        setAttribute(name, value) { this.attributes.set(name, value); },
        addEventListener() {},
      };
    },
  };
  const harness = Function(
    'document',
    'clearHierarchyBranch',
    'render',
    `"use strict"; ${sources}; return { state, renderCultureFilters };`,
  )(document, () => {}, () => {});

  harness.state.unit = '3';
  harness.state.culture = 'all';
  harness.renderCultureFilters();
  assert.equal(container.hidden, false);
  assert.deepEqual(
    container.children.map(({ dataset, textContent }) => [dataset.culture, textContent]),
    [
      ['all', 'All traditions'],
      ['lateAntiqueByzantine', 'Late Antique & Byzantine'],
      ['medievalIslamic', 'Medieval & Islamic'],
      ['renaissanceMannerism', 'Renaissance & Mannerism'],
      ['baroqueColonial', 'Baroque & Colonial'],
    ],
  );

  harness.state.unit = '2';
  harness.renderCultureFilters();
  assert.equal(container.children[0].textContent, 'All cultures');

  harness.state.unit = '4';
  harness.renderCultureFilters();
  assert.deepEqual(
    container.children.map(({ dataset, textContent }) => [dataset.culture, textContent]),
    [
      ['all', 'All movements'],
      ['enlightenmentRevolution', 'Enlightenment & Revolution'],
      ['realismIndustryPhotography', 'Realism, Industry & Photography'],
      ['postImpressionismEarlyModernism', 'Post-Impressionism & Early Modernism'],
      ['avantGardeArchitecturePostwar', 'Avant-Garde, Architecture & Postwar'],
    ],
  );

  harness.state.unit = '5';
  harness.renderCultureFilters();
  assert.deepEqual(
    container.children.map(({ dataset, textContent }) => [dataset.culture, textContent]),
    [
      ['all', 'All traditions'],
      ['Ancient Mesoamerica', 'Ancient Mesoamerica'],
      ['Ancient Central Andes', 'Ancient Central Andes'],
      ['Ancient North America', 'Ancient North America'],
      ['Native North America', 'Native North America'],
    ],
  );
});

test('Unit toolbar uses one accessible Unit select and an English culture group', async () => {
  const html = await loadHtml();

  assert.equal((html.match(/<select id="unitFilter"/g) || []).length, 1);
  assert.match(html, /<div id="cultureFilters" class="culture-filters" role="group" aria-label="Culture"><\/div>/);
  assert.match(getCssDeclarations(html, '.culture-filters[hidden]'), /display:\s*none/);
  for (const label of ['All cultures', 'Ancient Near East', 'Egypt', 'Greece', 'Etruscan', 'Rome']) {
    assert.match(html, new RegExp(label));
  }
  assert.doesNotMatch(html, /aria-label="文明"/);
  assert.doesNotMatch(html, /Dataset progress · U2 36\/36/);
  assert.match(html, /<label class="filter-label">Unit<select id="unitFilter" aria-label="Unit"><option value="all">All Units<\/option><\/select><\/label>/);
  assert.match(html, /<label class="filter-label">时期<select id="periodFilter"><option value="">全部时期<\/option><\/select><\/label>/);
  assert.match(html, /<label class="filter-label">作品类型<select id="typeFilter"><option value="">全部类型<\/option><\/select><\/label>/);
  assert.match(html, /<label class="filter-label">搜索<input id="searchInput" type="search" placeholder="标题、地点或关键词"><\/label>/);
});

test('detail instruction explains the English hierarchy without a culture color legend', async () => {
  const html = await loadHtml();
  const renderSource = getFunctionSource(html, 'render');

  assert.match(renderSource, /Select a Unit, then a region, then a site/);
  assert.doesNotMatch(renderSource, /\['埃及','#[0-9a-f]+'\]/i);
  assert.doesNotMatch(renderSource, /\['希腊','#[0-9a-f]+'\]/i);
  assert.doesNotMatch(renderSource, /\['罗马','#[0-9a-f]+'\]/i);
});

test('filterWorks combines Unit, culture, exact filters, and bilingual free search', async () => {
  const html = await loadHtml();
  const { normalize, filterWorks } = loadPureFunctions(
    html,
    ['normalize', 'filterWorks'],
    ['const TRADITION_LABELS =', 'const MAP_REGIONS ='],
  );
  const u1Works = parseArtworkData(html).filter(({ unit }) => unit === 1);
  const u2Works = parseArtworkData(html).filter(({ unit }) => unit === 2);
  const u3Works = parseArtworkData(html).filter(({ unit }) => unit === 3);
  const u4Works = parseArtworkData(html).filter(({ unit }) => unit === 4);
  const u5Works = parseArtworkData(html).filter(({ unit }) => unit === 5);
  const works = [
    {
      id: 'white-temple', unit: 2, culture: 'ancientNearEast',
      titleEn: 'White Temple and its ziggurat', titleZh: '白神庙与金字塔台',
      siteName: 'Uruk', artistCulture: 'Sumerian', period: 'Sumerian',
      workType: 'temple complex', keywords: ['ziggurat', 'Uruk'],
    },
    {
      id: 'etruscan-tomb', unit: 2, culture: 'etruscan',
      titleEn: 'Tomb of the Triclinium', titleZh: '三榻墓',
      siteName: 'Tarquinia', artistCulture: 'Etruscan', period: 'Etruscan',
      workType: 'tomb painting', keywords: ['banquet'],
    },
    {
      id: 'other-unit', unit: 3, culture: 'rome',
      titleEn: 'Later Roman Work', titleZh: '后期罗马作品',
      siteName: 'Rome', artistCulture: 'Roman', period: 'Imperial Roman',
      workType: 'sculpture', keywords: ['portrait'],
    },
  ];

  assert.equal(normalize('  Ｓumerian  '), 'sumerian');
  assert.deepEqual(
    filterWorks(works, { unit: '2', culture: 'ancientNearEast', period: '', workType: '', search: '' })
      .map((work) => work.id),
    ['white-temple'],
  );
  assert.deepEqual(
    filterWorks(works, { unit: 'all', culture: 'etruscan', period: '', workType: '', search: '三榻墓' })
      .map((work) => work.id),
    ['etruscan-tomb'],
  );
  assert.deepEqual(
    filterWorks(works, { unit: '2', culture: 'all', period: 'Sumerian', workType: 'temple complex', search: 'Sumerian' })
      .map((work) => work.id),
    ['white-temple'],
  );
  assert.deepEqual(
    filterWorks(u1Works, { unit: '1', culture: 'all', period: '', workType: '', search: 'East Asia' })
      .map(({ apNumber }) => apNumber),
    [7],
  );
  assert.deepEqual(
    filterWorks(u1Works, { unit: '1', culture: 'all', period: '', workType: '', search: '4200' })
      .map(({ apNumber }) => apNumber),
    [5],
  );
  assert.deepEqual(
    filterWorks(u1Works, { unit: '1', culture: 'all', period: '', workType: '', search: '200' })
      .map(({ apNumber }) => apNumber),
    [5, 7, 10],
  );
  assert.deepEqual(
    filterWorks(u2Works, { unit: '2', culture: 'all', period: '', workType: '', search: '100' })
      .map(({ apNumber }) => apNumber),
    [40, 41],
  );
  assert.deepEqual(
    filterWorks(u1Works, { unit: '1', culture: 'all', period: '', workType: '', search: '12' })
      .map(({ apNumber }) => apNumber),
    [10],
  );
  assert.deepEqual(
    filterWorks(u1Works, { unit: '1', culture: 'all', period: '', workType: '', search: 'Sandstone' })
      .map(({ apNumber }) => apNumber),
    [6, 8],
  );
  assert.deepEqual(
    filterWorks(u1Works, { unit: '1', culture: 'all', period: '', workType: '', search: 'megalithic monument' })
      .map(({ apNumber }) => apNumber),
    [8],
  );
  assert.deepEqual(
    filterWorks(u1Works, { unit: '1', culture: 'all', period: '', workType: '', search: 'Liangzhu' })
      .map(({ apNumber }) => apNumber),
    [7],
  );
  assert.deepEqual(
    filterWorks(u1Works, { unit: '1', culture: 'all', period: '', workType: '', search: '良渚' })
      .map(({ apNumber }) => apNumber),
    [7],
  );
  assert.deepEqual(
    filterWorks(u3Works, {
      unit: '3',
      culture: 'lateAntiqueByzantine',
      period: '',
      workType: '',
      search: '',
    }).map(({ apNumber }) => apNumber),
    [48, 49, 50, 51, 52],
  );
  assert.deepEqual(
    filterWorks([
      {
        id: 'legacy-culture-fallback',
        unit: 2,
        culture: 'greece',
        titleEn: 'Legacy Greek work',
      },
    ], {
      unit: '2',
      culture: 'greece',
      period: '',
      workType: '',
      search: '',
    }).map(({ id }) => id),
    ['legacy-culture-fallback'],
  );
  const numericSemanticsWorks = [
    { id: 'ap-4', apNumber: 4, unit: 1, culture: 'prehistoricNamibia', date: 'undated' },
    { id: 'ap-14', apNumber: 14, unit: 2, culture: 'ancientNearEast', date: 'undated' },
    { id: 'date-4200', apNumber: 5, unit: 1, culture: 'prehistoricSusa', date: '4200 B.C.E.' },
  ];
  assert.deepEqual(
    filterWorks(numericSemanticsWorks, {
      unit: 'all',
      culture: 'all',
      period: '',
      workType: '',
      search: '4',
    }).map(({ id }) => id),
    ['ap-4', 'ap-14', 'date-4200'],
  );
  assert.deepEqual(
    filterWorks(numericSemanticsWorks, {
      unit: 'all',
      culture: 'all',
      period: '',
      workType: '',
      search: 'AP 4',
    }).map(({ id }) => id),
    ['ap-4'],
  );

  const searchU3 = (search) => filterWorks(u3Works, {
    unit: '3',
    culture: 'all',
    period: '',
    workType: '',
    search,
  }).map(({ apNumber }) => apNumber);
  assert.deepEqual(searchU3('Gothic'), [60, 61, 62]);
  assert.deepEqual(searchU3('哥特式'), [60, 61, 62]);
  assert.deepEqual(searchU3('New Spain'), [81, 94, 95, 97]);
  assert.deepEqual(searchU3('新西班牙'), [81, 94, 95, 97]);
  assert.deepEqual(searchU3('48'), [48, 72]);
  assert.deepEqual(searchU3('AP 48'), [48]);
  assert.deepEqual(searchU3('Late Antique & Byzantine'), [48, 49, 50, 51, 52]);
  assert.deepEqual(searchU3('晚期古代与拜占庭'), [48, 49, 50, 51, 52]);
  assert.deepEqual(searchU3('italyVatican'), [
    48, 49, 51, 63, 67, 69, 70, 71, 72, 73, 75, 76, 78, 80, 82, 85, 88, 89,
  ]);
  assert.deepEqual(searchU3('Italy & Vatican'), [
    48, 49, 51, 63, 67, 69, 70, 71, 72, 73, 75, 76, 78, 80, 82, 85, 88, 89,
  ]);

  const searchU4 = (search) => filterWorks(u4Works, {
    unit:'4', culture:'all', period:'', workType:'', search,
  }).map(({ apNumber }) => apNumber);
  assert.deepEqual(searchU4('Cubism'), [126, 130]);
  assert.deepEqual(searchU4('立体主义'), [126, 130]);
  assert.deepEqual(searchU4('Land Art'), [151]);
  assert.deepEqual(searchU4('大地艺术'), [151]);
  assert.deepEqual(searchU4('AP 106'), [106]);

  const searchU5 = (search) => filterWorks(u5Works, {
    unit:'5', culture:'all', period:'', workType:'', search,
  }).map(({ apNumber }) => apNumber);
  assert.ok(searchU5('153').includes(153));
  assert.deepEqual(searchU5('Lanzón'), [153]);
  assert.deepEqual(searchU5('Coyolxauhqui'), [157]);
  assert.deepEqual(searchU5('Saqsa Waman'), [159]);
  assert.deepEqual(searchU5("T'oqapu"), [162]);
  assert.deepEqual(searchU5("Kwakwaka'wakw"), [164]);
  assert.deepEqual(searchU5('Cotsiogo'), [165]);
  assert.deepEqual(searchU5('Maria and Julian Martinez'), [166]);
  assert.deepEqual(searchU5('下沉广场'), [153]);
  assert.deepEqual(searchU5('大神庙'), [157]);
  assert.deepEqual(searchU5('萨克萨瓦曼'), [159]);
  assert.deepEqual(searchU5('变形面具'), [164]);
  assert.deepEqual(searchU5('还原焰烧'), [166]);
});

test('Unit 4 exposes nine exact regions, four movement groups, and every canonical site', async () => {
  const html = await loadHtml();
  const artworks = parseArtworkData(html).filter(({ unit }) => unit === 4);
  const configSource = [
    getObjectDeclarationSource(html, 'const UNIT_FILTER_CONFIG ='),
    getObjectDeclarationSource(html, 'const MAP_REGIONS ='),
    getObjectDeclarationSource(html, 'const SITE_WORLD_COORDINATES ='),
  ].join('\n');
  const { UNIT_FILTER_CONFIG, MAP_REGIONS, SITE_WORLD_COORDINATES } = Function(
    `"use strict"; ${configSource}; return { UNIT_FILTER_CONFIG, MAP_REGIONS, SITE_WORLD_COORDINATES };`,
  )();
  const counts = artworks.reduce((result, work) => {
    result[work.region] = (result[work.region] ?? 0) + 1;
    return result;
  }, {});

  assert.deepEqual(UNIT_FILTER_CONFIG[4].cultureIds, [
    'enlightenmentRevolution',
    'realismIndustryPhotography',
    'postImpressionismEarlyModernism',
    'avantGardeArchitecturePostwar',
  ]);
  assert.deepEqual(counts, {
    mexicoCaribbean:5,
    britishIsles:3,
    france:20,
    unitedStates:14,
    southernEurope:4,
    centralNorthernEurope:5,
    pacific:1,
    transatlantic:1,
    russiaSoviet:1,
  });
  assert.deepEqual(
    Object.keys(MAP_REGIONS).filter((regionId) => MAP_REGIONS[regionId].unitIds.includes(4)),
    [
      'southernEurope', 'france', 'britishIsles', 'centralNorthernEurope',
      'russiaSoviet', 'unitedStates', 'mexicoCaribbean', 'pacific', 'transatlantic',
    ],
  );
  const canonicalSites = new Map();
  artworks.forEach(({ siteName, coordinates }) => canonicalSites.set(siteName, coordinates));
  assert.equal(canonicalSites.size, 28);
  for (const siteName of canonicalSites.keys()) {
    assert.ok(SITE_WORLD_COORDINATES[siteName], siteName);
  }
  assert.deepEqual(
    SITE_WORLD_COORDINATES['North Atlantic Ocean, aboard SS Kaiser Wilhelm II'],
    { x:560, y:250 },
  );
});

test('Unit 6 freezes four bilingual classifications and labels every exact culture and tradition', async () => {
  const html = await loadHtml();
  const works = parseArtworkData(html).filter(({ unit }) => unit === 6);
  const source = [
    getObjectDeclarationSource(html, 'const TRADITION_LABELS ='),
    getObjectDeclarationSource(html, 'const UNIT_FILTER_CONFIG ='),
    getObjectDeclarationSource(html, 'const MAP_REGIONS ='),
  ].join('\n');
  const { TRADITION_LABELS, UNIT_FILTER_CONFIG, MAP_REGIONS } = Function(
    `${source}; return { TRADITION_LABELS, UNIT_FILTER_CONFIG, MAP_REGIONS };`,
  )();
  const expectedLabels = {
    'African Architecture': { labelEn:'African Architecture', labelZh:'非洲建筑' },
    'Royal & Court Arts': { labelEn:'Royal & Court Arts', labelZh:'王权与宫廷艺术' },
    'Performance & Masquerade': { labelEn:'Performance & Masquerade', labelZh:'表演与假面传统' },
    'Power, Memory & Ancestors': { labelEn:'Power, Memory & Ancestors', labelZh:'力量、记忆与祖先' },
  };
  assert.ok(UNIT_FILTER_CONFIG[6], 'missing U6 filter configuration');
  assert.equal(UNIT_FILTER_CONFIG[6].showCultureFilters, true);
  assert.deepEqual(UNIT_FILTER_CONFIG[6].cultureIds, Object.keys(expectedLabels));
  assert.deepEqual(Object.fromEntries(Object.keys(expectedLabels).map((key) => (
    [key, TRADITION_LABELS[key]]
  ))), expectedLabels);
  assert.deepEqual(Object.keys(MAP_REGIONS).filter((key) => MAP_REGIONS[key].unitIds.includes(6)),
    ['southernAfrica', 'westAfrica', 'centralAfrica']);
  assert.equal(new Set(works.map(({ culture }) => culture)).size, 14);
  for (const key of new Set(works.flatMap(({ culture, traditionGroup }) => [culture, traditionGroup]))) {
    assert.ok(TRADITION_LABELS[key]?.labelEn?.trim(), `missing English label: ${key}`);
    assert.ok(TRADITION_LABELS[key]?.labelZh?.trim(), `missing Chinese label: ${key}`);
    assert.ok(Object.isFrozen(TRADITION_LABELS[key]));
  }
  const { filterWorks } = loadPureFunctions(html, ['normalize', 'filterWorks'],
    ['const TRADITION_LABELS =', 'const MAP_REGIONS =']);
  for (const [culture, { labelZh }] of Object.entries(expectedLabels)) {
    const expected = works.filter((work) => work.traditionGroup === culture);
    assert.deepEqual(filterWorks(works, { unit:'6', culture, search:'' }), expected);
    assert.deepEqual(filterWorks(works, { unit:'6', culture:'all', search:labelZh }), expected);
  }
});

function loadUnit6MapHelpers(html) {
  return loadPureFunctions(html, [
    'compactApNumbers', 'formatApGroupLabel', 'formatPieceCount', 'createSiteToken',
    'getUnitById', 'getApUnitNumber', 'getMapGroupText', 'toWorldCoordinates',
    'groupBySite', 'groupByConfiguredRegion', 'getMapHierarchyLevel', 'groupByRegionGrid',
    'buildMapGroups', 'buildMapGroupCandidates', 'getMarkerMetrics', 'getMarkerBounds',
    'markerBoundsOverlap', 'expandMarkerBounds', 'createSpatialHash',
    'findNearestAvailableMarkerSlot', 'layoutSiteMarkers', 'layoutMapGroups',
  ], ['const AP_UNITS =', 'const MAP_REGIONS =', 'const SITE_WORLD_COORDINATES =']);
}

test('Unit 6 hierarchy is three counted regions then exact creation-context sites and AP pins', async () => {
  const html = await loadHtml();
  const works = parseArtworkData(html).filter(({ unit }) => unit === 6);
  const manifest = JSON.parse(await readFile(new URL('../data/ap-art-history-unit-6-manifest.json', import.meta.url), 'utf8'));
  const helpers = loadUnit6MapHelpers(html);
  const overview = helpers.buildMapGroups(works, 1, { selectedUnit:'all' });
  assert.equal(overview.length, 1);
  assert.deepEqual(helpers.getMapGroupText(overview[0]), { title:'U6', subtitle:'Africa · 14 pieces' });
  const regions = helpers.buildMapGroups(works, 1, { selectedUnit:'6', activeUnit:6 });
  assert.deepEqual(regions.map(({ regionId, works }) => [regionId, works.length]), [
    ['southernAfrica', 1], ['westAfrica', 7], ['centralAfrica', 6],
  ]);
  assert.deepEqual(regions.map(helpers.getMapGroupText), [
    { title:'Southern Africa', subtitle:'1 piece' },
    { title:'West Africa', subtitle:'7 pieces' },
    { title:'Central Africa', subtitle:'6 pieces' },
  ]);
  const pins = [];
  for (const region of regions) {
    const sites = helpers.buildMapGroups(works, 2.5, {
      selectedUnit:'6', activeUnit:6, activeRegion:region.key,
    });
    assert.deepEqual(sites.map(({ siteName }) => siteName).sort(),
      Object.values(manifest).filter((row) => row.region === region.regionId).map(({ siteName }) => siteName).sort());
    for (const site of sites) {
      assert.equal(site.kind, 'site');
      assert.equal(site.parentKey, region.key);
      assert.equal(site.works.length, 1);
      const work = site.works[0];
      assert.equal(site.apLabel, String(work.apNumber));
      assert.equal(site.apGroupLabel, `AP ${work.apNumber}`);
      assert.equal(site.siteName, manifest[work.apNumber].siteName);
      const metrics = helpers.getMarkerMetrics(site.apLabel, true, 0.5);
      assert.equal(metrics.visualWidth, metrics.visualHeight, 'single AP pins retain circular metrics');
      pins.push(work.apNumber);
    }
  }
  assert.deepEqual(pins.sort((a, b) => a - b), Array.from({ length:14 }, (_, index) => 167 + index));
});

test('all 14 Unit 6 sites have stable distinct reviewed Africa projections', async () => {
  const html = await loadHtml();
  const works = parseArtworkData(html).filter(({ unit }) => unit === 6);
  const source = getObjectDeclarationSource(html, 'const SITE_WORLD_COORDINATES =');
  const { SITE_WORLD_COORDINATES } = Function(`${source}; return { SITE_WORLD_COORDINATES };`)();
  const { toWorldCoordinates } = loadMapFitFunctions(html);
  const points = [];
  for (const work of works) {
    const point = SITE_WORLD_COORDINATES[work.siteName];
    assert.ok(point, `missing reviewed U6 projection: ${work.siteName}`);
    assert.deepEqual(point, work.coordinates, `${work.siteName} frozen creation-context projection`);
    assert.deepEqual(toWorldCoordinates(work), point);
    assert.ok(point.x >= 0 && point.x <= 1600 && point.y >= 0 && point.y <= 800);
    assert.ok(point.x >= 750 && point.x <= 950 && point.y >= 330 && point.y <= 500,
      `${work.siteName} must remain inside its African geographic envelope`);
    points.push(`${point.x},${point.y}`);
  }
  assert.equal(new Set(points).size, 14, 'different creation-context anchors must not be identical');
});

test('Unit 6 region and site layouts retain every marker without overlap across mobile and desktop scales', async () => {
  const html = await loadHtml();
  const works = parseArtworkData(html).filter(({ unit }) => unit === 6);
  const helpers = loadUnit6MapHelpers(html);
  const branch = { selectedUnit:'6', activeUnit:6 };
  const regions = helpers.buildMapGroups(works, 1, branch);
  assert.equal(regions.length, 3, 'all U6 configured region capsules must exist');
  const fit = loadMapFitFunctions(html);
  fit.fitMapToWorks(works);
  const transform = fit.state.transform;
  const bounds = fit.getVisibleWorldBounds(transform);
  for (const [width, height] of [[349, 446.59375], [350, 478], [451, 618], [900, 600]]) {
    const screenScale = fit.getMapScreenScale(width, height, transform.scale);
    const regionGroups = helpers.layoutMapGroups(works, transform.scale, screenScale, branch, bounds);
    const layouts = [
      { groups:regionGroups, expected:regions },
      ...regionGroups.map((region) => {
        const regionBranch = { ...branch, activeRegion:region.key };
        const regionTransform = fit.zoomAroundPoint(
          transform,
          Math.max(2.5, transform.scale),
          { x:region.displayX, y:region.displayY },
        );
        const siteScreenScale = fit.getMapScreenScale(width, height, regionTransform.scale);
        const regionBounds = fit.getVisibleWorldBounds(regionTransform);
        return {
          groups:helpers.layoutMapGroups(works, regionTransform.scale, siteScreenScale, regionBranch, regionBounds),
          expected:helpers.buildMapGroups(works, regionTransform.scale, regionBranch),
        };
      }),
    ];
    for (const { groups, expected } of layouts) {
      assert.deepEqual(groups.map(({ key }) => key).sort(), expected.map(({ key }) => key).sort(), `${width}px retains markers`);
      assert.equal(new Set(groups.map(({ displayX, displayY }) => `${displayX},${displayY}`)).size, groups.length);
      for (let index = 0; index < groups.length; index += 1) {
        for (let other = index + 1; other < groups.length; other += 1) {
          assert.equal(helpers.markerBoundsOverlap(groups[index].bounds, groups[other].bounds), false,
            `${width}px ${groups[index].siteName} overlaps ${groups[other].siteName}`);
        }
      }
    }
  }
});

test('Unit 5 hierarchy is six regions then creation-context sites and official AP pins', async () => {
  const html = await loadHtml();
  const unit5 = parseArtworkData(html).filter(({ unit }) => unit === 5);
  const helpers = loadPureFunctions(
    html,
    [
      'compactApNumbers',
      'formatApGroupLabel',
      'formatPieceCount',
      'createSiteToken',
      'getUnitById',
      'getApUnitNumber',
      'getMapGroupText',
      'toWorldCoordinates',
      'groupBySite',
      'groupByConfiguredRegion',
      'getMapHierarchyLevel',
      'groupByRegionGrid',
      'buildMapGroups',
    ],
    ['const AP_UNITS =', 'const MAP_REGIONS =', 'const SITE_WORLD_COORDINATES ='],
  );
  const regions = helpers.buildMapGroups(unit5, 1, {
    selectedUnit:'5', activeUnit:5, activeRegion:null,
  });

  assert.deepEqual(
    regions.map(({ regionId, works }) => [regionId, works.length]),
    [
      ['mesoamerica', 3],
      ['centralAndes', 5],
      ['ancestralPueblo', 2],
      ['easternWoodlands', 2],
      ['northwestCoast', 1],
      ['plainsGreatBasin', 1],
    ],
  );
  assert.deepEqual(
    regions.map(helpers.getMapGroupText),
    [
      { title:'Mesoamerica', subtitle:'3 pieces' },
      { title:'Central Andes', subtitle:'5 pieces' },
      { title:'Ancestral Pueblo', subtitle:'2 pieces' },
      { title:'Eastern Woodlands', subtitle:'2 pieces' },
      { title:'Northwest Coast', subtitle:'1 piece' },
      { title:'Plains & Great Basin', subtitle:'1 piece' },
    ],
  );
  assert.equal(
    regions.find(({ regionId }) => regionId === 'mesoamerica').apGroupLabel,
    'AP 155, 157–158',
  );

  const expectedSites = new Set(unit5.map(({ siteName }) => siteName));
  const renderedSites = [];
  for (const region of regions) {
    const sites = helpers.buildMapGroups(unit5, 2.5, {
      selectedUnit:'5', activeUnit:5, activeRegion:region.key,
    });
    assert.ok(sites.every(({ kind }) => kind === 'site'));
    assert.ok(sites.every(({ parentKey }) => parentKey === region.key));
    sites.forEach((site) => {
      renderedSites.push(site.siteName);
      assert.equal(site.apGroupLabel, helpers.formatApGroupLabel(site.works));
      assert.deepEqual(
        site.works.map(({ apNumber }) => apNumber),
        [...site.works].map(({ apNumber }) => apNumber).sort((a, b) => a - b),
      );
      if (site.works.length === 1) {
        assert.equal(site.apLabel, String(site.works[0].apNumber));
      }
    });
  }
  assert.deepEqual(new Set(renderedSites), expectedSites);
  assert.equal(renderedSites.length, expectedSites.size);
  assert.equal(renderedSites.some((site) => /museum|collection/i.test(site)), false);
  const inkaRealm = helpers.groupBySite(unit5).find(
    ({ siteName }) => siteName === 'Inka realm, Central Andes',
  );
  assert.equal(inkaRealm.apGroupLabel, 'AP 160, 162');
  assert.deepEqual(helpers.getMapGroupText(inkaRealm), {
    title:'Inka realm, Central Andes',
    subtitle:'AP 160, 162 · 2 pieces',
  });
});

test('selecting Unit 5 resets incompatible filters, regenerates options, and fits its works', async () => {
  const html = await loadHtml();
  const artworks = parseArtworkData(html);
  const unit5 = artworks.filter(({ unit }) => unit === 5);
  const stateSource = getObjectDeclarationSource(html, 'const state =');
  const dependentSources = [
    stateSource,
    `const ARTWORKS = ${JSON.stringify(artworks)};`,
    getFunctionSource(html, 'appendOption'),
    getFunctionSource(html, 'populateSelect'),
    getFunctionSource(html, 'getWorksForUnit'),
    getFunctionSource(html, 'renderDependentFilterOptions'),
  ].join('\n');
  const elements = {
    periodFilter: {
      children:[], value:'',
      replaceChildren() { this.children = []; },
      append(child) { this.children.push(child); },
    },
    typeFilter: {
      children:[], value:'',
      replaceChildren() { this.children = []; },
      append(child) { this.children.push(child); },
    },
  };
  const document = {
    getElementById(id) { return elements[id]; },
    createElement(tagName) {
      assert.equal(tagName, 'option');
      return { value:'', textContent:'' };
    },
  };
  const filters = Function(
    'document',
    `"use strict"; ${dependentSources}; return { state, renderDependentFilterOptions };`,
  )(document);
  Object.assign(filters.state, {
    unit:'5',
    period:'Imperial Roman',
    workType:'oil painting',
  });
  filters.renderDependentFilterOptions();
  assert.equal(filters.state.period, '');
  assert.equal(filters.state.workType, '');
  assert.deepEqual(
    elements.periodFilter.children.slice(1).map(({ value }) => value),
    [...new Set(unit5.map(({ period }) => period))].sort((a, b) => a.localeCompare(b)),
  );
  assert.deepEqual(
    elements.typeFilter.children.slice(1).map(({ value }) => value),
    [...new Set(unit5.map(({ workType }) => workType))].sort((a, b) => a.localeCompare(b)),
  );

  const state = {
    unit:'4', culture:'Land Art', period:'Postwar', workType:'earthwork', search:'Spiral',
    selectedId:'ap151-spiral-jetty', selectedSiteIndex:2, expandedSiteToken:'old-site',
    activeUnit:4, activeRegion:'unit-4-region-unitedStates', pendingFocusParentKey:'old',
    activeDetailTab:'compare', transform:{ x:-200, y:-100, scale:2 },
  };
  const calls = [];
  const selectUnit = Function(
    'state',
    'cancelFilteredFocus',
    'syncFilterControls',
    'getWorksForUnit',
    'fitMapToWorks',
    'applyTransform',
    'scheduleMarkerLayout',
    `"use strict"; ${getFunctionSource(html, 'selectUnit')}; return selectUnit;`,
  )(
    state,
    () => {},
    () => calls.push('sync'),
    (unit) => {
      assert.equal(unit, '5');
      return unit5;
    },
    (works) => {
      assert.strictEqual(works, unit5);
      calls.push('fit');
    },
    () => calls.push('apply'),
    () => calls.push('layout'),
  );
  selectUnit('5');
  assert.deepEqual(state, {
    unit:'5', culture:'all', period:'', workType:'', search:'',
    selectedId:null, selectedSiteIndex:0, expandedSiteToken:null,
    activeUnit:5, activeRegion:null, pendingFocusParentKey:null,
    activeDetailTab:'quick', transform:{ x:0, y:0, scale:1 },
  });
  assert.deepEqual(calls, ['sync', 'fit', 'apply', 'layout']);
});

test('culture selection updates existing buttons without replacing the focused button', async () => {
  const html = await loadHtml();
  const { updateCultureFilterSelection } = loadPureFunctions(
    html,
    ['updateCultureFilterSelection'],
  );
  const makeButton = (culture) => {
    const attributes = new Map();
    return {
      dataset: { culture },
      setAttribute(name, value) { attributes.set(name, value); },
      getAttribute(name) { return attributes.get(name) ?? null; },
    };
  };
  const egypt = makeButton('egypt');
  const greece = makeButton('greece');
  const container = {
    querySelectorAll(selector) {
      assert.equal(selector, '[data-culture]');
      return [egypt, greece];
    },
  };

  const selected = updateCultureFilterSelection(container, 'greece');
  assert.equal(selected, greece);
  assert.equal(container.querySelectorAll('[data-culture]')[1], greece);
  assert.equal(egypt.getAttribute('aria-pressed'), 'false');
  assert.equal(greece.getAttribute('aria-pressed'), 'true');
});

test('map fitting uses nested coordinates for an unmapped future site', async () => {
  const html = await loadHtml();
  const { state, toWorldCoordinates, fitMapToWorks } = loadMapFitFunctions(html);
  const unmappedWork = {
    siteName: 'Future Unmapped Site',
    coordinates: { x: 120, y: 240 },
  };

  assert.deepEqual(toWorldCoordinates(unmappedWork), { x: 840.6, y: 302 });
  fitMapToWorks([unmappedWork]);
  assert.ok(Number.isFinite(state.transform.x));
  assert.ok(Number.isFinite(state.transform.y));
  assert.ok(Number.isFinite(state.transform.scale));
});

test('site works sort by numeric AP number before id', async () => {
  const html = await loadHtml();
  const { compactApNumbers, formatApGroupLabel, createSiteToken, groupBySite } =
    loadPureFunctions(
      html,
      ['compactApNumbers', 'formatApGroupLabel', 'createSiteToken', 'groupBySite'],
    );
  const shared = {
    siteName: 'Synthetic Shared Site',
    coordinates: { x: 10, y: 20 },
    culture: 'greece',
  };
  const group = groupBySite([
    { ...shared, id: 'alphabetically-first', apNumber: 10 },
    { ...shared, id: 'alphabetically-last', apNumber: 2 },
  ])[0];

  assert.deepEqual(group.works.map((work) => work.apNumber), [2, 10]);
});

test('English map hierarchy labels describe units, regions, and sites', async () => {
  const html = await loadHtml();
  const {
    compactApNumbers,
    formatApGroupLabel,
    formatPieceCount,
    getUnitById,
    getMapGroupText,
  } = loadPureFunctions(
    html,
    [
      'compactApNumbers',
      'formatApGroupLabel',
      'formatPieceCount',
      'getUnitById',
      'getMapGroupText',
    ],
    ['const AP_UNITS =', 'const MAP_REGIONS ='],
  );

  assert.equal(formatPieceCount(1), '1 piece');
  assert.equal(formatPieceCount(0), '0 pieces');
  assert.equal(formatPieceCount(36), '36 pieces');
  assert.deepEqual(
    getMapGroupText({
      kind: 'unit',
      apUnits: [2],
      works: Array.from({ length: 36 }),
    }),
    { title: 'U2', subtitle: 'Ancient Mediterranean · 36 pieces' },
  );
  assert.deepEqual(
    getMapGroupText({
      kind: 'region',
      regionId: 'middleEast',
      works: Array.from({ length: 6 }),
    }),
    { title: 'Middle East', subtitle: '6 pieces' },
  );
  assert.deepEqual(
    getMapGroupText({
      kind: 'site',
      siteName: 'Rome',
      works: Array.from({ length: 7 }, (_, index) => ({ apNumber: 41 + index })),
    }),
    { title: 'Rome', subtitle: 'AP 41–47 · 7 pieces' },
  );
});

test('Unit 1 site projections use the approved exact world coordinates', async () => {
  const html = await loadHtml();
  const source = getObjectDeclarationSource(html, 'const SITE_WORLD_COORDINATES =');
  const { SITE_WORLD_COORDINATES } = Function(
    `"use strict"; ${source}; return { SITE_WORLD_COORDINATES };`,
  )();

  assert.deepEqual(
    Object.fromEntries([
      'Apollo 11 Cave, Namibia',
      'Lascaux, France',
      'Tequixquiac, central Mexico',
      "Tassili n'Ajjer, Algeria",
      'Susa, Iran',
      'Arabian Peninsula',
      'Liangzhu, China',
      'Wiltshire, UK',
      'Ambum Valley, Papua New Guinea',
      'Tlatilco, central Mexico',
      'Reef Islands, Solomon Islands',
    ].map((siteName) => [siteName, SITE_WORLD_COORDINATES[siteName]])),
    {
      'Apollo 11 Cave, Namibia': { x: 875, y: 500 },
      'Lascaux, France': { x: 829, y: 246 },
      'Tequixquiac, central Mexico': { x: 405, y: 380 },
      "Tassili n'Ajjer, Algeria": { x: 850, y: 360 },
      'Susa, Iran': { x: 1018, y: 333 },
      'Arabian Peninsula': { x: 1010, y: 410 },
      'Liangzhu, China': { x: 1250, y: 345 },
      'Wiltshire, UK': { x: 812, y: 218 },
      'Ambum Valley, Papua New Guinea': { x: 1410, y: 515 },
      'Tlatilco, central Mexico': { x: 405, y: 382 },
      'Reef Islands, Solomon Islands': { x: 1510, y: 560 },
    },
  );
});

test('every canonical Unit 3 creation site uses its reviewed exact world coordinates', async () => {
  const html = await loadHtml();
  const artworks = parseArtworkData(html).filter(({ unit }) => unit === 3);
  const source = getObjectDeclarationSource(html, 'const SITE_WORLD_COORDINATES =');
  const { SITE_WORLD_COORDINATES } = Function(
    `"use strict"; ${source}; return { SITE_WORLD_COORDINATES };`,
  )();
  const canonicalSites = new Map();

  artworks.forEach(({ siteName, coordinates }) => {
    if (canonicalSites.has(siteName)) {
      assert.deepEqual(
        coordinates,
        canonicalSites.get(siteName),
        `${siteName} has conflicting canonical coordinates`,
      );
    } else {
      canonicalSites.set(siteName, coordinates);
    }
  });

  assert.equal(canonicalSites.size, 37);
  for (const [siteName, coordinates] of canonicalSites) {
    assert.deepEqual(
      SITE_WORLD_COORDINATES[siteName],
      coordinates,
      `${siteName} must use the creation-context coordinates from its canonical record`,
    );
  }
});

test('every Unit 5 creation site uses its reviewed Americas projection and map fitting points', async () => {
  const html = await loadHtml();
  const unit5 = parseArtworkData(html).filter(({ unit }) => unit === 5);
  const reviewedSites = {
    'Chavín de Huántar, Ancash, Peru': { x:470, y:500 },
    'Mesa Verde, Colorado, U.S.': { x:300, y:300 },
    'Yaxchilán, Chiapas, Mexico': { x:355, y:410 },
    'Adams County, Ohio, U.S.': { x:430, y:270 },
    'Tenochtitlan (Mexico City), Mexico': { x:360, y:390 },
    'Mexica realm, Central Mexico': { x:355, y:385 },
    'Cusco, Peru': { x:480, y:505 },
    'Inka realm, Central Andes': { x:480, y:505 },
    'Machu Picchu, Cusco Region, Peru': { x:485, y:510 },
    'Lenape homelands, northeastern North America': { x:420, y:280 },
    "Kwakwaka'wakw territories, British Columbia, Canada": { x:255, y:220 },
    'Wind River Reservation, Wyoming, U.S.': { x:330, y:285 },
    'San Ildefonso Pueblo, New Mexico, U.S.': { x:335, y:320 },
  };
  const {
    state,
    toWorldCoordinates,
    fitMapToWorks,
    getVisibleWorldBounds,
  } = loadMapFitFunctions(html);
  const source = getObjectDeclarationSource(html, 'const SITE_WORLD_COORDINATES =');
  const { SITE_WORLD_COORDINATES } = Function(
    `"use strict"; ${source}; return { SITE_WORLD_COORDINATES };`,
  )();

  assert.equal(Object.keys(reviewedSites).length, 13);
  assert.deepEqual(
    Object.fromEntries(Object.keys(reviewedSites).map((siteName) => (
      [siteName, SITE_WORLD_COORDINATES[siteName]]
    ))),
    reviewedSites,
  );
  for (const work of unit5) {
    assert.deepEqual(work.coordinates, reviewedSites[work.siteName], `${work.id} canonical point`);
    assert.deepEqual(toWorldCoordinates(work), reviewedSites[work.siteName], `${work.id} projection`);
  }

  const byRegion = Object.groupBy(unit5, ({ region }) => region);
  const regionRanges = {
    mesoamerica: { left:355, right:360, top:385, bottom:410 },
    centralAndes: { left:470, right:485, top:500, bottom:510 },
    ancestralPueblo: { left:300, right:335, top:300, bottom:320 },
    easternWoodlands: { left:420, right:430, top:270, bottom:280 },
    northwestCoast: { left:255, right:255, top:220, bottom:220 },
    plainsGreatBasin: { left:330, right:330, top:285, bottom:285 },
  };
  for (const [region, works] of Object.entries(byRegion)) {
    const points = works.map(toWorldCoordinates);
    assert.deepEqual(
      {
        left:Math.min(...points.map(({ x }) => x)),
        right:Math.max(...points.map(({ x }) => x)),
        top:Math.min(...points.map(({ y }) => y)),
        bottom:Math.max(...points.map(({ y }) => y)),
      },
      regionRanges[region],
      `${region} reviewed geography`,
    );
  }

  fitMapToWorks(unit5);
  const expectedScale = Math.min(3, Math.max(1, Math.min(
    1600 / (485 - 255 + 320),
    800 / (510 - 220 + 320),
  )));
  assert.deepEqual(state.transform, {
    x:0,
    y:400 - ((220 + 510) / 2) * expectedScale,
    scale:expectedScale,
  });
  const visible = getVisibleWorldBounds(state.transform);
  for (const point of Object.values(reviewedSites)) {
    assert.ok(point.x >= visible.left && point.x <= visible.right);
    assert.ok(point.y >= visible.top && point.y <= visible.bottom);
  }

  const mutationHarness = Function(
    `"use strict"; ${source}\n${getFunctionSource(html, 'toWorldCoordinates')};`
      + ' return { SITE_WORLD_COORDINATES, toWorldCoordinates };',
  )();
  const missingSite = unit5[0].siteName;
  delete mutationHarness.SITE_WORLD_COORDINATES[missingSite];
  assert.throws(
    () => mutationHarness.toWorldCoordinates(unit5[0]),
    /Missing reviewed Unit 5 map projection/,
    'a missing reviewed U5 site must fail rather than use the legacy pixel transform',
  );
});

test('configured Unit 1 hierarchy exposes only its six regions with exact counts', async () => {
  const html = await loadHtml();
  const artworks = parseArtworkData(html);
  const helpers = loadPureFunctions(
    html,
    [
      'toWorldCoordinates',
      'compactApNumbers',
      'formatApGroupLabel',
      'createSiteToken',
      'groupByConfiguredRegion',
    ],
    ['const MAP_REGIONS =', 'const SITE_WORLD_COORDINATES ='],
  );
  const groups = helpers.groupByConfiguredRegion(artworks, 1);

  assert.deepEqual(
    Object.fromEntries(groups.map(({ regionId, works }) => [regionId, works.length])),
    { africa: 2, europe: 2, americas: 2, middleEast: 2, eastAsia: 1, oceania: 2 },
  );
  assert.deepEqual(
    groups.map(({ regionId }) => regionId),
    ['africa', 'europe', 'americas', 'middleEast', 'eastAsia', 'oceania'],
  );
  assert.ok(groups.every(({ works }) => works.every(({ unit }) => unit === 1)));
  assert.ok(groups.every(({ regionId }) => !['northAfrica', 'southernEurope'].includes(regionId)));

  const crossUnitRows = [
    ...artworks,
    {
      ...artworks.find(({ unit }) => unit === 2),
      id: 'wrong-unit-africa',
      region: 'africa',
    },
    {
      ...artworks.find(({ unit }) => unit === 1),
      id: 'wrong-region-for-unit',
      region: 'northAfrica',
    },
  ];
  assert.deepEqual(
    Object.fromEntries(
      helpers.groupByConfiguredRegion(crossUnitRows, 1)
        .map(({ regionId, works }) => [regionId, works.length]),
    ),
    { africa: 2, europe: 2, americas: 2, middleEast: 2, eastAsia: 1, oceania: 2 },
  );
});

test('configured Unit 2 hierarchy follows real region and site metadata', async () => {
  const html = await loadHtml();
  const artworks = parseArtworkData(html);
  const unit2Artworks = artworks.filter(({ unit }) => unit === 2);
  const helpers = loadPureFunctions(
    html,
    [
      'compactApNumbers',
      'formatApGroupLabel',
      'formatPieceCount',
      'createSiteToken',
      'getUnitById',
      'getApUnitNumber',
      'toWorldCoordinates',
      'groupBySite',
      'groupByConfiguredRegion',
      'getMapHierarchyLevel',
      'groupByRegionGrid',
      'buildMapGroups',
      'buildMapGroupCandidates',
    ],
    ['const AP_UNITS =', 'const MAP_REGIONS =', 'const SITE_WORLD_COORDINATES ='],
  );

  const overview = helpers.buildMapGroups(artworks, 1, {
    selectedUnit: 'all',
    activeUnit: null,
    activeRegion: null,
  });
  assert.deepEqual(
    overview.map(({ key, kind, works }) => ({ key, kind, count: works.length })),
    [
      { key: 'unit-1', kind: 'unit', count: 11 },
      { key: 'unit-2', kind: 'unit', count: 36 },
      { key: 'unit-3', kind: 'unit', count: 51 },
      { key: 'unit-4', kind: 'unit', count: 54 },
      { key: 'unit-5', kind: 'unit', count: 14 },
      { key: 'unit-6', kind: 'unit', count: 14 },
      { key: 'unit-7', kind: 'unit', count: 11 },
      { key: 'unit-8', kind: 'unit', count: 21 },
      { key: 'unit-9', kind: 'unit', count: 11 },
      { key: 'unit-10', kind: 'unit', count: 27 },
    ],
  );

  const regions = helpers.buildMapGroups(unit2Artworks, 1, {
    selectedUnit: '2',
    activeUnit: 2,
    activeRegion: null,
  });
  assert.deepEqual(
    regions.map(({ key, regionId, parentKey, works }) => ({
      key,
      regionId,
      parentKey,
      count: works.length,
    })),
    [
      { key: 'unit-2-region-middleEast', regionId: 'middleEast', parentKey: 'unit-2', count: 6 },
      { key: 'unit-2-region-northAfrica', regionId: 'northAfrica', parentKey: 'unit-2', count: 9 },
      { key: 'unit-2-region-southernEurope', regionId: 'southernEurope', parentKey: 'unit-2', count: 21 },
    ],
  );
  for (const region of regions) {
    const expectedPoint = region.works
      .map(helpers.toWorldCoordinates)
      .reduce(
        (total, point) => ({ x: total.x + point.x, y: total.y + point.y }),
        { x: 0, y: 0 },
      );
    assert.equal(region.worldX, expectedPoint.x / region.works.length);
    assert.equal(region.worldY, expectedPoint.y / region.works.length);
    assert.equal(region.unitId, 2);
    assert.equal(region.apGroupLabel, helpers.formatApGroupLabel(region.works));
  }

  const southernEurope = regions.find(({ regionId }) => regionId === 'southernEurope');
  const sites = helpers.buildMapGroups(unit2Artworks, 1, {
    selectedUnit: '2',
    activeUnit: 2,
    activeRegion: southernEurope.key,
  });
  assert.equal(sites.length, 10);
  assert.ok(sites.every(({ kind }) => kind === 'site'));
  assert.ok(sites.every(({ parentKey }) => parentKey === southernEurope.key));
  assert.equal(sites.find(({ siteName }) => siteName === 'Rome').works.length, 7);
  assert.equal(sites.find(({ siteName }) => siteName === 'Athens').works.length, 4);
  assert.equal(sites.find(({ siteName }) => siteName === 'Pompeii').works.length, 3);
  assert.ok(
    sites
      .filter(({ works }) => works.length === 1)
      .every(({ apLabel, works }) => apLabel === String(works[0].apNumber)),
  );
});

test('configured Unit 3 hierarchy exposes eight counted regions then creation sites', async () => {
  const html = await loadHtml();
  const unit3Artworks = parseArtworkData(html).filter(({ unit }) => unit === 3);
  const helpers = loadPureFunctions(
    html,
    [
      'compactApNumbers',
      'formatApGroupLabel',
      'formatPieceCount',
      'createSiteToken',
      'getUnitById',
      'getApUnitNumber',
      'getMapGroupText',
      'toWorldCoordinates',
      'groupBySite',
      'groupByConfiguredRegion',
      'getMapHierarchyLevel',
      'groupByRegionGrid',
      'buildMapGroups',
      'buildMapGroupCandidates',
      'getMarkerMetrics',
      'getMarkerBounds',
      'markerBoundsOverlap',
      'expandMarkerBounds',
      'createSpatialHash',
      'findNearestAvailableMarkerSlot',
      'layoutSiteMarkers',
      'layoutMapGroups',
    ],
    ['const AP_UNITS =', 'const MAP_REGIONS =', 'const SITE_WORLD_COORDINATES ='],
  );
  const branches = { selectedUnit: '3', activeUnit: 3, activeRegion: null };
  const regions = helpers.buildMapGroups(unit3Artworks, 1, branches);

  assert.deepEqual(
    regions.map(({ regionId, works }) => [regionId, works.length]),
    [
      ['italyVatican', 18],
      ['france', 5],
      ['iberianPeninsula', 5],
      ['britishIsles', 3],
      ['lowCountries', 7],
      ['centralEurope', 4],
      ['easternMediterranean', 4],
      ['colonialAmericas', 5],
    ],
  );
  assert.deepEqual(
    regions.map(helpers.getMapGroupText),
    [
      { title: 'Italy & Vatican', subtitle: '18 pieces' },
      { title: 'France', subtitle: '5 pieces' },
      { title: 'Iberian Peninsula', subtitle: '5 pieces' },
      { title: 'British Isles', subtitle: '3 pieces' },
      { title: 'Low Countries', subtitle: '7 pieces' },
      { title: 'Central Europe', subtitle: '4 pieces' },
      { title: 'Eastern Mediterranean', subtitle: '4 pieces' },
      { title: 'Colonial Americas', subtitle: '5 pieces' },
    ],
  );

  const italy = regions.find(({ regionId }) => regionId === 'italyVatican');
  const sites = helpers.buildMapGroups(unit3Artworks, 2.5, {
    selectedUnit: '3',
    activeUnit: 3,
    activeRegion: italy.key,
  });
  assert.deepEqual(
    sites.map(({ siteName }) => siteName),
    [
      'Florence, Italy',
      'Milan, Italy',
      'Padua, Italy',
      'Ravenna, Italy',
      'Rome, Italy',
      'Vatican City',
      'Venice, Italy',
    ],
  );
  assert.ok(sites.every(({ kind, parentKey }) => kind === 'site' && parentKey === italy.key));
  assert.equal(sites.find(({ siteName }) => siteName === 'Rome, Italy').works.length, 6);

  const renderedMaps = [
    { viewport: '375x812', width: 349, height: 446.59375 },
    { viewport: '667x375', width: 350, height: 478 },
    { viewport: '768x900', width: 451, height: 618 },
  ];
  const {
    state: fittedState,
    fitMapToWorks,
    getVisibleWorldBounds,
  } = loadMapFitFunctions(html);
  fitMapToWorks(unit3Artworks);
  const fittedTransform = fittedState.transform;
  const visibleWorldBounds = getVisibleWorldBounds(fittedTransform);
  for (const { viewport, width, height } of renderedMaps) {
    const baseScreenScale = Math.min(width / 1600, height / 800);
    const screenScale = baseScreenScale * fittedTransform.scale;
    const laidOut = helpers.layoutMapGroups(
      unit3Artworks,
      fittedTransform.scale,
      screenScale,
      branches,
      visibleWorldBounds,
    );
    assert.equal(laidOut.length, 8, viewport);
    assert.ok(laidOut.every(({ kind }) => kind === 'region'));
    assert.ok(
      laidOut.every(({ isGridFallback }) => isGridFallback !== true),
      `${viewport} must retain English region capsules`,
    );
    const contentTop = (height - 800 * baseScreenScale) / 2;
    laidOut.forEach(({ bounds, regionId }) => {
      const clientBounds = {
        left: (bounds.left * fittedTransform.scale + fittedTransform.x) * baseScreenScale,
        right: (bounds.right * fittedTransform.scale + fittedTransform.x) * baseScreenScale,
        top: contentTop
          + (bounds.top * fittedTransform.scale + fittedTransform.y) * baseScreenScale,
        bottom: contentTop
          + (bounds.bottom * fittedTransform.scale + fittedTransform.y) * baseScreenScale,
      };
      assert.ok(clientBounds.left >= 0, `${viewport} ${regionId} clips left`);
      assert.ok(clientBounds.right <= width, `${viewport} ${regionId} clips right`);
      assert.ok(clientBounds.top >= 0, `${viewport} ${regionId} clips top`);
      assert.ok(clientBounds.bottom <= height, `${viewport} ${regionId} clips bottom`);
    });
    for (let index = 0; index < laidOut.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < laidOut.length; otherIndex += 1) {
        assert.equal(
          helpers.markerBoundsOverlap(laidOut[index].bounds, laidOut[otherIndex].bounds),
          false,
          `${laidOut[index].key} overlaps ${laidOut[otherIndex].key}`,
        );
      }
    }
    for (const region of regions) {
      const regionSites = helpers.layoutMapGroups(
        unit3Artworks,
        2.5,
        screenScale * 2.5,
        {
          selectedUnit: '3',
          activeUnit: 3,
          activeRegion: region.key,
        },
      );
      assert.ok(regionSites.length > 0, `${viewport} ${region.regionId}`);
      assert.ok(regionSites.every(({ kind }) => kind === 'site'));
      assert.ok(regionSites.every(({ parentKey }) => parentKey === region.key));
      for (let index = 0; index < regionSites.length; index += 1) {
        for (let otherIndex = index + 1; otherIndex < regionSites.length; otherIndex += 1) {
          assert.equal(
            helpers.markerBoundsOverlap(
              regionSites[index].bounds,
              regionSites[otherIndex].bounds,
            ),
            false,
            `${viewport} ${region.regionId} site collision`,
          );
        }
      }
    }
  }
});

test('map markers use circular AP pins and two-line English hierarchy capsules', async () => {
  const html = await loadHtml();

  assert.match(html, /works\.map\(\(work\) => work\.apNumber\)/);
  assert.match(html, /classList\.add\('marker-label-bg'\)/);
  assert.match(html, /classList\.add\('marker-ap-label'\)/);
  assert.match(html, /classList\.add\('marker-title-label'\)/);
  assert.match(html, /classList\.add\('marker-subtitle-label'\)/);
  assert.match(
    html,
    /createElementNS\([^;]*isSingleWorkSiteGroup\(group\) \? 'circle' : 'rect'\s*\)/,
  );
  assert.match(html, /titleLabel\.textContent = groupText\.title/);
  assert.match(html, /subtitleLabel\.textContent = groupText\.subtitle/);
  assert.match(
    html,
    /marker\.setAttribute\('aria-label', `\$\{groupText\.title\} · \$\{groupText\.subtitle\}`\)/,
  );
  assert.doesNotMatch(html, /count\.textContent = (?:String\()?group\.works\.length/);
  assert.match(getCssDeclarations(html, '.site-marker .marker-label-bg'), /filter:\s*drop-shadow/);
  assert.match(
    getCssDeclarations(html, '.site-marker .marker-ap-label'),
    /dominant-baseline:\s*central/,
  );
  assert.match(getCssDeclarations(html, '.site-marker .marker-title-label'), /fill:\s*#fff/);
  assert.match(getCssDeclarations(html, '.site-marker .marker-title-label'), /font-weight:\s*700/);
  assert.match(getCssDeclarations(html, '.site-marker .marker-subtitle-label'), /fill:\s*#fff/);
  assert.match(getCssDeclarations(html, '.site-marker .marker-subtitle-label'), /font-weight:\s*600/);
  assert.doesNotMatch(
    getCssDeclarations(html, '.site-marker .marker-label-bg'),
    /transition:[^;]*\br\b/,
  );
  assert.match(
    getCssDeclarations(html, '.site-marker .marker-visual'),
    /transition:\s*transform/,
  );
  assert.match(
    getCssDeclarations(html, '.site-marker.is-active .marker-visual'),
    /transform:\s*scale\((?:1\.0[5-9]|1\.1)\)/,
  );
});

test('one-work Unit and configured region groups stay two-line hierarchy capsules', async () => {
  const html = await loadHtml();
  const helpers = loadPureFunctions(
    html,
    [
      'compactApNumbers',
      'formatApGroupLabel',
      'formatPieceCount',
      'getUnitById',
      'getMapGroupText',
      'toWorldCoordinates',
      'getMarkerMetrics',
      'getMarkerBounds',
      'markerBoundsOverlap',
      'expandMarkerBounds',
      'createSpatialHash',
      'findNearestAvailableMarkerSlot',
      'layoutSiteMarkers',
    ],
    ['const AP_UNITS =', 'const MAP_REGIONS =', 'const SITE_WORLD_COORDINATES ='],
  );
  const work = {
    id: 'filtered-ap-12',
    apNumber: 12,
    unit: 2,
    region: 'middleEast',
    siteName: 'Uruk, Iraq',
    coordinates: { x: 905, y: 365 },
  };
  const groups = [
    {
      key: 'unit-2',
      kind: 'unit',
      siteName: 'AP Unit 2',
      apUnits: [2],
      apLabel: '12',
      apGroupLabel: 'AP 12',
      siteToken: 'site-unit-2',
      worldX: 700,
      worldY: 300,
      works: [work],
    },
    {
      key: 'unit-2-region-middleEast',
      kind: 'region',
      regionId: 'middleEast',
      siteName: 'Middle East',
      apUnits: [2],
      apLabel: '12',
      apGroupLabel: 'AP 12',
      siteToken: 'site-region-middleEast',
      worldX: 1000,
      worldY: 350,
      works: [work],
    },
  ];

  const laidOut = helpers.layoutSiteMarkers(groups, 1);
  assert.deepEqual(
    laidOut.map(({ markerText }) => markerText),
    [
      { title: 'U2', subtitle: 'Ancient Mediterranean · 1 piece' },
      { title: 'Middle East', subtitle: '1 piece' },
    ],
  );
  assert.ok(laidOut.every(({ markerMetrics }) => markerMetrics.visualHeight === 38));
  assert.ok(laidOut.every(({ markerMetrics }) => markerMetrics.titleFontSize === 11));
  assert.ok(laidOut.every(({ markerMetrics }) => markerMetrics.subtitleFontSize === 10));

  const renderSource = getFunctionSource(html, 'render');
  assert.match(
    renderSource,
    /isSingleWorkSiteGroup\(group\) \? 'circle' : 'rect'/,
  );
  assert.match(
    renderSource,
    /if \(isSingleWorkSiteGroup\(group\) \|\| group\.isGridFallback\)/,
  );
  assert.match(
    renderSource,
    /marker\.setAttribute\('aria-label', `\$\{groupText\.title\} · \$\{groupText\.subtitle\}`\)/,
  );
});

test('marker visuals match World pins while hit targets stay touchable', async () => {
  const html = await loadHtml();
  const { getMarkerMetrics, getExpandedPinMetrics } = loadPureFunctions(
    html,
    ['getMarkerMetrics', 'getExpandedPinMetrics'],
  );
  const single = getMarkerMetrics('1', true, 1);
  const child = getExpandedPinMetrics(1);

  assert.equal(single.fontSize, 10);
  assert.equal(single.visualWidth, 22);
  assert.equal(single.visualHeight, 22);
  assert.equal(single.hitWidth, 44);
  assert.equal(single.hitHeight, 44);
  assert.equal(child.fontSize, 10);
  assert.equal(child.visualDiameter, 22);
  assert.equal(child.hitWidth, 44);
  assert.equal(child.hitHeight, 44);
  const capsule = getMarkerMetrics(
    { title: 'Ancient Mediterranean', subtitle: '36 pieces' },
    false,
    1,
  );
  assert.equal(capsule.titleFontSize, 11);
  assert.equal(capsule.subtitleFontSize, 10);
  assert.ok(capsule.visualHeight > single.visualHeight);
  assert.ok(capsule.visualWidth > 120);
  assert.ok(capsule.hitHeight >= 44);
  assert.match(getCssDeclarations(html, '.site-marker .marker-label-bg'), /stroke-width:\s*2/);
  assert.match(getCssDeclarations(html, '.expanded-work-pin .expanded-pin-bg'), /stroke-width:\s*2/);
  assert.doesNotMatch(html, /data-civilization/);
});

test('desktop map controls use the World History 30px vertical stack', async () => {
  const html = await loadHtml();
  const controls = getCssDeclarations(html, '.map-controls');
  const buttons = getCssDeclarations(html, '.map-controls button');

  assert.match(controls, /flex-direction:\s*column/);
  assert.match(buttons, /width:\s*30px/);
  assert.match(buttons, /height:\s*30px/);
  assert.match(buttons, /border-radius:\s*6px/);
  assert.match(
    html,
    /<button id="resetView" class="overview-button" type="button" aria-label="还原地图">1:1<\/button>/,
  );
});

test('marker metrics stay readable and touchable on a 390px viewport', async () => {
  const html = await loadHtml();
  const { getMapScreenScale, getMarkerMetrics } = loadPureFunctions(
    html,
    ['getMapScreenScale', 'getMarkerMetrics'],
  );
  const renderedScale = getMapScreenScale(362, 330);
  const metrics = getMarkerMetrics('35, 39–40', false, renderedScale);

  assert.equal(renderedScale, 362 / 1600);
  assert.equal(getMapScreenScale(0, 0), 0.23);
  assert.ok(metrics.fontSize * renderedScale >= 9.5);
  assert.ok(metrics.hitHeight * renderedScale >= 44);
  assert.ok(metrics.hitWidth * renderedScale >= 44);
  assert.ok(metrics.visualWidth < metrics.hitWidth);
});

test('all ten U9 regions fit the actual mobile canvas without overlaps or zoom-control obstruction',async()=>{
 const html=await loadHtml(),works=parseArtworkData(html).filter(w=>w.unit===9);
 const h=loadPureFunctions(html,[
  'compactApNumbers','formatApGroupLabel','formatPieceCount','createSiteToken','getUnitById','getMapGroupText','getApUnitNumber','toWorldCoordinates',
  'groupBySite','groupByConfiguredRegion','getMapHierarchyLevel','groupByRegionGrid','buildMapGroups','buildMapGroupCandidates',
  'getMarkerMetrics','getMarkerBounds','markerBoundsOverlap','expandMarkerBounds','createSpatialHash','findNearestAvailableMarkerSlot',
  'layoutSiteMarkers','layoutMapGroups','getDensePackingBounds',
 ],['const AP_UNITS =','const MAP_REGIONS =','const SITE_WORLD_COORDINATES =']);
 const transform={scale:1,x:0,y:0},canvas={width:362,height:300},base=362/1600;
 const bounds=h.getDensePackingBounds(transform,canvas);
 const groups=h.layoutMapGroups(works,1,base,{selectedUnit:'9',activeUnit:9,activeRegion:null},{left:0,right:1600,top:0,bottom:800},bounds);
 assert.equal(groups.length,10);
 for(const [i,g]of groups.entries()){
  assert.equal(g.kind,'region');assert.ok(g.markerMetrics.hitHeight*base>=44);
  const b=g.bounds,offsetY=(300-800*base)/2;
  assert.ok(b.left*base>=8-0.01&&b.right*base<=362-48+0.01);
  assert.ok(b.top*base+offsetY>=8-0.01&&b.bottom*base+offsetY<=292+0.01);
  for(const other of groups.slice(i+1))assert.equal(h.markerBoundsOverlap(b,other.bounds),false);
 }
});

test('unconfigured candidate fallback never resurrects U10 neutral coordinates as geographic pins',async()=>{
 const html=await loadHtml(),works=parseArtworkData(html).filter(w=>w.unit===10);
 const h=loadPureFunctions(html,[
  'compactApNumbers','formatApGroupLabel','createSiteToken','getApUnitNumber','toWorldCoordinates',
  'groupBySite','getMapHierarchyLevel','groupByRegionGrid','buildMapGroups','buildMapGroupCandidates'
 ],['const AP_UNITS =','const SITE_WORLD_COORDINATES =']);
 for(const candidate of h.buildMapGroupCandidates(works,3,{selectedUnit:'all'})){
  assert.equal(candidate.flatMap(g=>g.works).some(w=>[230,241].includes(w.apNumber)),false);
 }
});

test('ten-unit overview uses actual mobile canvas bounds while counting all 27 U10 study works',async()=>{
 const html=await loadHtml(),works=parseArtworkData(html),h=loadUnit6MapHelpers(html);
 const {getDensePackingBounds}=loadPureFunctions(html,['getDensePackingBounds']);
 for(const canvas of [{width:356,height:300},{width:362,height:330},{width:390,height:300}]){
  const base=Math.min(canvas.width/1600,canvas.height/800),transform={scale:1,x:0,y:0};
  const bounds=getDensePackingBounds(transform,canvas);
  const groups=h.layoutMapGroups(works,1,base,{selectedUnit:'all',activeUnit:null,activeRegion:null},{left:0,right:1600,top:0,bottom:800},bounds);
  assert.equal(groups.length,10);
  assert.equal(groups.find(g=>g.apUnits[0]===10).works.length,27);
  for(const [i,g]of groups.entries())for(const other of groups.slice(i+1))assert.equal(h.markerBoundsOverlap(g.bounds,other.bounds),false);
  const dense=h.buildMapGroupCandidates(works,1,{selectedUnit:'all',activeUnit:null,activeRegion:null}).at(-1);
  assert.ok(dense.every(g=>g.isDenseFallback===true));
  const fallback=h.layoutSiteMarkers(dense,base,h.toWorldCoordinates,bounds);
  for(const [i,g]of fallback.entries()){
   for(const other of fallback.slice(i+1))assert.equal(h.markerBoundsOverlap(g.bounds,other.bounds),false);
   const offsetY=(canvas.height-800*base)/2;
   assert.ok(g.bounds.left*base>=8-0.01&&g.bounds.right*base<=canvas.width-48+0.01);
   assert.ok(g.bounds.top*base+offsetY>=8-0.01&&g.bounds.bottom*base+offsetY<=canvas.height-8+0.01);
  }
 }
 const regions=h.buildMapGroups(works.filter(w=>w.unit===10),1,{selectedUnit:'10',activeUnit:10});
 assert.equal(regions.length,10);
 assert.equal(regions.flatMap(g=>g.works).length,25);
 assert.equal(regions.flatMap(g=>g.works).some(w=>[230,241].includes(w.apNumber)),false);
});

test('Unit 2 region hierarchy remains collision-safe in a 667x375 embedded landscape map', async () => {
  const html = await loadHtml();
  const artworks = parseArtworkData(html);
  const shortLandscapeCss = getMediaQuerySource(
    html,
    '(min-width:665px) and (max-height:520px)',
  );
  const helpers = loadPureFunctions(
    html,
    [
      'compactApNumbers',
      'formatApGroupLabel',
      'formatPieceCount',
      'createSiteToken',
      'getUnitById',
      'getMapGroupText',
      'getApUnitNumber',
      'toWorldCoordinates',
      'groupBySite',
      'groupByConfiguredRegion',
      'getMapHierarchyLevel',
      'groupByRegionGrid',
      'buildMapGroups',
      'buildMapGroupCandidates',
      'getMapScreenScale',
      'getMarkerMetrics',
      'getMarkerBounds',
      'markerBoundsOverlap',
      'expandMarkerBounds',
      'createSpatialHash',
      'findNearestAvailableMarkerSlot',
      'layoutSiteMarkers',
      'layoutMapGroups',
    ],
    ['const AP_UNITS =', 'const MAP_REGIONS =', 'const SITE_WORLD_COORDINATES ='],
  );
  const shortEmbeddedBody = getCssDeclarations(shortLandscapeCss, 'body.is-embedded');
  assert.match(shortEmbeddedBody, /height:\s*100vh/);
  assert.match(shortEmbeddedBody, /min-height:\s*0/);
  assert.match(shortEmbeddedBody, /overflow:\s*hidden/);

  const landscapeScale = helpers.getMapScreenScale(390, 430, 1);
  const branch = { selectedUnit: '2', activeUnit: null, activeRegion: null };

  assert.equal(landscapeScale, 0.24375);
  assert.doesNotThrow(
    () => helpers.layoutMapGroups(artworks, 1, landscapeScale, branch),
    'all three English Unit 2 region capsules must fit without leaving a stale marker layer',
  );
});

test('complete Unit 2 keeps the configured hierarchy below the legacy site threshold', async () => {
  const html = await loadHtml();
  const artworks = parseArtworkData(html).filter(({ unit }) => unit === 2);
  const helpers = loadPureFunctions(
    html,
    [
      'compactApNumbers',
      'formatApGroupLabel',
      'formatPieceCount',
      'createSiteToken',
      'getUnitById',
      'getApUnitNumber',
      'toWorldCoordinates',
      'groupBySite',
      'groupByConfiguredRegion',
      'getMapHierarchyLevel',
      'groupByRegionGrid',
      'buildMapGroups',
      'buildMapGroupCandidates',
      'getMarkerMetrics',
      'getMarkerBounds',
      'markerBoundsOverlap',
      'expandMarkerBounds',
      'createSpatialHash',
      'findNearestAvailableMarkerSlot',
      'layoutSiteMarkers',
      'layoutMapGroups',
    ],
    ['const AP_UNITS =', 'const MAP_REGIONS =', 'const SITE_WORLD_COORDINATES ='],
  );
  const screenScale = 362 / 1600;
  const siteGroups = helpers.groupBySite(artworks);

  assert.equal(artworks.length, 36);
  assert.equal(siteGroups.length, 24);
  const overview = helpers.layoutMapGroups(artworks, 1, screenScale, {
    selectedUnit: 'all',
    activeUnit: null,
    activeRegion: null,
  });
  assert.equal(overview.length, 1);
  assert.equal(overview[0].kind, 'unit');

  const laidOut = helpers.layoutMapGroups(artworks, 1, screenScale, {
    selectedUnit: '2',
    activeUnit: 2,
    activeRegion: null,
  });
  assert.equal(laidOut.length, 3);
  assert.ok(laidOut.every((group) => group.kind === 'region'));
  const selectedRegion = laidOut.find(({ regionId }) => regionId === 'southernEurope');
  const regionSites = helpers.layoutMapGroups(
    artworks,
    1,
    screenScale,
    {
      selectedUnit: '2',
      activeUnit: selectedRegion.apUnits[0],
      activeRegion: selectedRegion.key,
    },
  );
  assert.ok(regionSites.length > 0);
  assert.ok(regionSites.every((group) => group.kind === 'site'));
  assert.ok(regionSites.every((group) => group.parentKey === selectedRegion.key));
  assert.deepEqual(
    regionSites.flatMap((group) => group.works.map(({ id }) => id)).sort(),
    selectedRegion.works.map(({ id }) => id).sort(),
  );
});

test('bounds-aware spatial layout prevents all marker overlaps at mobile scale', async () => {
  const html = await loadHtml();
  const artworks = parseArtworkData(html);
  const {
    compactApNumbers,
    formatApGroupLabel,
    createSiteToken,
    getApUnitNumber,
    groupBySite,
    toWorldCoordinates,
    getMapHierarchyLevel,
    groupByRegionGrid,
    buildMapGroups,
    buildMapGroupCandidates,
    getMarkerMetrics,
    getMarkerBounds,
    markerBoundsOverlap,
    expandMarkerBounds,
    createSpatialHash,
    findNearestAvailableMarkerSlot,
    layoutSiteMarkers,
    layoutMapGroups,
  } = loadPureFunctions(
    html,
    [
      'compactApNumbers',
      'formatApGroupLabel',
      'createSiteToken',
      'getApUnitNumber',
      'groupBySite',
      'toWorldCoordinates',
      'getMapHierarchyLevel',
      'groupByRegionGrid',
      'buildMapGroups',
      'buildMapGroupCandidates',
      'getMarkerMetrics',
      'getMarkerBounds',
      'markerBoundsOverlap',
      'expandMarkerBounds',
      'createSpatialHash',
      'findNearestAvailableMarkerSlot',
      'layoutSiteMarkers',
      'layoutMapGroups',
    ],
    ['const AP_UNITS =', 'const SITE_WORLD_COORDINATES ='],
  );
  const renderedScale = 362 / 1600;
  const siteGroups = groupBySite(artworks);
  const laidOut = layoutMapGroups(artworks, 1, renderedScale, {});

  assert.ok(laidOut.length < siteGroups.length);
  for (let index = 0; index < laidOut.length; index += 1) {
    assert.ok(laidOut[index].bounds.left >= 0, `${laidOut[index].siteName} crosses left edge`);
    assert.ok(laidOut[index].bounds.right <= 1600, `${laidOut[index].siteName} crosses right edge`);
    assert.ok(laidOut[index].bounds.top >= 0, `${laidOut[index].siteName} crosses top edge`);
    assert.ok(laidOut[index].bounds.bottom <= 800, `${laidOut[index].siteName} crosses bottom edge`);
    for (let otherIndex = index + 1; otherIndex < laidOut.length; otherIndex += 1) {
      assert.equal(
        markerBoundsOverlap(laidOut[index].bounds, laidOut[otherIndex].bounds),
        false,
        `${laidOut[index].siteName} overlaps ${laidOut[otherIndex].siteName}`,
      );
    }
  }
  const layoutSource = getFunctionSource(html, 'layoutSiteMarkers');
  assert.match(layoutSource, /createSpatialHash\(/);
  assert.match(layoutSource, /findNearestAvailableMarkerSlot\(/);
  assert.doesNotMatch(layoutSource, /positioned\.every\(/);
});

test('250-work map falls back to a collision-safe hierarchy at every mobile zoom', async () => {
  const html = await loadHtml();
  const {
    compactApNumbers,
    formatApGroupLabel,
    createSiteToken,
    getApUnitNumber,
    toWorldCoordinates,
    groupBySite,
    getMapHierarchyLevel,
    groupByRegionGrid,
    buildMapGroups,
    buildMapGroupCandidates,
    getMarkerMetrics,
    getMarkerBounds,
    markerBoundsOverlap,
    expandMarkerBounds,
    createSpatialHash,
    findNearestAvailableMarkerSlot,
    layoutSiteMarkers,
    layoutMapGroups,
  } = loadPureFunctions(
    html,
    [
      'compactApNumbers',
      'formatApGroupLabel',
      'formatPieceCount',
      'createSiteToken',
      'getUnitById',
      'getApUnitNumber',
      'toWorldCoordinates',
      'groupBySite',
      'groupByConfiguredRegion',
      'getMapHierarchyLevel',
      'groupByRegionGrid',
      'buildMapGroups',
      'buildMapGroupCandidates',
      'getMarkerMetrics',
      'getMarkerBounds',
      'markerBoundsOverlap',
      'expandMarkerBounds',
      'createSpatialHash',
      'findNearestAvailableMarkerSlot',
      'layoutSiteMarkers',
      'layoutMapGroups',
    ],
    ['const AP_UNITS =', 'const MAP_REGIONS =', 'const SITE_WORLD_COORDINATES ='],
  );
  const artworks = Array.from({ length: 250 }, (_, index) => {
    const apNumber = index + 1;
    return {
      id: `synthetic-ap-${apNumber}`,
      apNumber,
      siteName: `Synthetic Site ${apNumber}`,
      coordinates: {
        x: -1200 + (index % 25) * 100,
        y: -500 + Math.floor(index / 25) * 100,
      },
      culture: ['egypt', 'greece', 'rome'][index % 3],
      titleEn: `Synthetic Work ${apNumber}`,
    };
  });

  for (const zoomScale of [1, 1.5, 1.75, 2.5, 3]) {
    const screenScale = (362 / 1600) * zoomScale;
    const laidOut = layoutMapGroups(artworks, zoomScale, screenScale, {});
    assert.ok(laidOut.length <= 40, `${zoomScale}x rendered too many top-level groups`);
    assert.doesNotThrow(
      () => layoutSiteMarkers(laidOut, screenScale),
      `${zoomScale}x hierarchy result must remain layout-safe`,
    );
    assert.deepEqual(
      layoutMapGroups(artworks, zoomScale, screenScale, {}).map((group) => group.key),
      laidOut.map((group) => group.key),
      `${zoomScale}x fallback must be deterministic`,
    );
  }

  const candidates = buildMapGroupCandidates(artworks, 3, {});
  assert.deepEqual(
    candidates.map((groups) => groups[0].kind),
    ['site', 'region', 'unit'],
  );
  assert.equal(buildMapGroups(artworks, 3).length, 250);
  assert.equal(getMapHierarchyLevel(250, 3), 'site');
});

test('250 configured works keep deterministic collision-safe hierarchy fallbacks on mobile', async () => {
  const html = await loadHtml();
  const helpers = loadPureFunctions(
    html,
    [
      'compactApNumbers',
      'formatApGroupLabel',
      'formatPieceCount',
      'createSiteToken',
      'getUnitById',
      'getMapGroupText',
      'getApUnitNumber',
      'toWorldCoordinates',
      'groupBySite',
      'groupByConfiguredRegion',
      'getMapHierarchyLevel',
      'groupByRegionGrid',
      'buildMapGroups',
      'buildMapGroupCandidates',
      'getMarkerMetrics',
      'getMarkerBounds',
      'markerBoundsOverlap',
      'expandMarkerBounds',
      'createSpatialHash',
      'findNearestAvailableMarkerSlot',
      'layoutSiteMarkers',
      'layoutMapGroups',
    ],
    ['const AP_UNITS =', 'const MAP_REGIONS =', 'const SITE_WORLD_COORDINATES ='],
  );
  const regionIds = ['middleEast', 'northAfrica', 'southernEurope'];
  const artworks = Array.from({ length: 250 }, (_, index) => {
    const apNumber = index + 1;
    return {
      id: `configured-ap-${apNumber}`,
      apNumber,
      unit: helpers.getApUnitNumber(apNumber),
      region: regionIds[index % regionIds.length],
      siteName: `Configured Site ${apNumber}`,
      coordinates: { x: 0, y: 0 },
      culture: ['egypt', 'greece', 'rome'][index % 3],
      titleEn: `Configured Work ${apNumber}`,
    };
  });
  const branches = [
    { selectedUnit: 'all', activeUnit: null, activeRegion: null },
    { selectedUnit: '2', activeUnit: 2, activeRegion: null },
    {
      selectedUnit: '2',
      activeUnit: 2,
      activeRegion: 'unit-2-region-middleEast',
    },
  ];

  for (const zoomScale of [1, 1.5]) {
    const screenScale = (362 / 1600) * zoomScale;
    for (const branch of branches) {
      const candidates = helpers.buildMapGroupCandidates(artworks, zoomScale, branch);
      assert.ok(candidates.length > 1, `${zoomScale}x configured branch needs a fallback`);
      assert.ok(
        candidates[0].every((group) => !group.isGridFallback),
        'approved configured hierarchy must remain the first candidate',
      );
      const isRegionBranch = candidates[0].every((group) => group.kind === 'region');
      if (isRegionBranch) {
        assert.ok(
          candidates[1].every((group) => group.isDenseFallback && !group.isGridFallback),
          'configured regions need a dense English-label fallback',
        );
      } else {
        assert.ok(
          candidates.slice(1).some((groups) => groups.every((group) => group.isGridFallback)),
          'configured hierarchy needs an explicitly compact fallback',
        );
      }
      assert.deepEqual(
        helpers.buildMapGroupCandidates(artworks, zoomScale, branch)
          .map((groups) => groups.map((group) => group.key)),
        candidates.map((groups) => groups.map((group) => group.key)),
        `${zoomScale}x configured candidate order must be deterministic`,
      );
      assert.doesNotThrow(
        () => helpers.layoutSiteMarkers(candidates[1], screenScale),
        `${zoomScale}x compact configured candidate must be independently layout-safe`,
      );
      const laidOut = helpers.layoutMapGroups(artworks, zoomScale, screenScale, branch);
      assert.doesNotThrow(() => helpers.layoutSiteMarkers(laidOut, screenScale));
      assert.deepEqual(
        helpers.layoutMapGroups(artworks, zoomScale, screenScale, branch)
          .map((group) => group.key),
        laidOut.map((group) => group.key),
        `${zoomScale}x configured fallback must be deterministic`,
      );
      for (let index = 0; index < laidOut.length; index += 1) {
        const group = laidOut[index];
        assert.ok(group.bounds.left >= 0 && group.bounds.right <= 1600);
        assert.ok(group.bounds.top >= 0 && group.bounds.bottom <= 800);
        for (let otherIndex = index + 1; otherIndex < laidOut.length; otherIndex += 1) {
          assert.equal(
            helpers.markerBoundsOverlap(group.bounds, laidOut[otherIndex].bounds),
            false,
            `${group.key} overlaps ${laidOut[otherIndex].key}`,
          );
        }
      }
    }
  }

  const compactOverview = helpers.buildMapGroupCandidates(artworks, 1, branches[0])[1];
  assert.equal(compactOverview[0].kind, 'unit');
  assert.match(helpers.getMapGroupText(compactOverview[0]).subtitle, / · \d+ pieces$/);
});

test('unit to region to site branch refinement stays stable and layout-safe on mobile', async () => {
  const html = await loadHtml();
  const helpers = loadPureFunctions(
    html,
    [
      'compactApNumbers',
      'formatApGroupLabel',
      'formatPieceCount',
      'createSiteToken',
      'getUnitById',
      'getApUnitNumber',
      'toWorldCoordinates',
      'groupBySite',
      'groupByConfiguredRegion',
      'getMapHierarchyLevel',
      'groupByRegionGrid',
      'buildMapGroups',
      'buildMapGroupCandidates',
      'getMarkerMetrics',
      'getMarkerBounds',
      'markerBoundsOverlap',
      'expandMarkerBounds',
      'createSpatialHash',
      'findNearestAvailableMarkerSlot',
      'layoutSiteMarkers',
      'layoutMapGroups',
    ],
    ['const AP_UNITS =', 'const MAP_REGIONS =', 'const SITE_WORLD_COORDINATES ='],
  );
  const artworks = Array.from({ length: 250 }, (_, index) => {
    const apNumber = index + 1;
    return {
      id: `synthetic-ap-${apNumber}`,
      apNumber,
      siteName: `Synthetic Site ${apNumber}`,
      coordinates: {
        x: -1200 + (index % 25) * 100,
        y: -500 + Math.floor(index / 25) * 100,
      },
      culture: ['egypt', 'greece', 'rome'][index % 3],
      titleEn: `Synthetic Work ${apNumber}`,
    };
  });
  const mobileScale = (zoomScale) => (362 / 1600) * zoomScale;
  const approvedWorks = parseArtworkData(html).filter(({ unit }) => unit === 2);
  assert.equal(helpers.groupBySite(approvedWorks).length, 24);
  for (const zoomScale of [1, 1.5, 1.75, 2.5, 3]) {
    const approvedOverview = helpers.layoutMapGroups(
      approvedWorks,
      zoomScale,
      mobileScale(zoomScale),
      { selectedUnit:'all', activeUnit:null, activeRegion:null },
    );
    assert.equal(approvedOverview.length, 1);
    assert.equal(approvedOverview[0].kind, 'unit');
    const approvedRegions = helpers.layoutMapGroups(
      approvedWorks,
      zoomScale,
      mobileScale(zoomScale),
      { selectedUnit:'2', activeUnit:2, activeRegion:null },
    );
    assert.equal(approvedRegions.length, 3);
    assert.ok(approvedRegions.every((group) => group.kind === 'region'));
  }
  const overview = helpers.layoutMapGroups(artworks, 1, mobileScale(1), {});
  assert.ok(overview.every((group) => group.kind === 'unit'));
  for (const unit of overview) {
    const unitBranch = { activeUnit: unit.apUnits[0], activeRegion: null };
    const regions = helpers.layoutMapGroups(
      artworks,
      1.5,
      mobileScale(1.5),
      unitBranch,
    );
    assert.ok(regions.every((group) => group.kind === 'region'));
    assert.ok(regions.every((group) => group.parentKey === unit.key));
    assert.doesNotThrow(() => helpers.layoutSiteMarkers(regions, mobileScale(1.5)));
    assert.deepEqual(
      helpers.layoutMapGroups(artworks, 1.5, mobileScale(1.5), unitBranch)
        .map((group) => group.key),
      regions.map((group) => group.key),
    );
    for (const region of regions) {
      const regionBranch = {
        activeUnit: unit.apUnits[0],
        activeRegion: region.key,
      };
      const sites = helpers.layoutMapGroups(
        artworks,
        2.5,
        mobileScale(2.5),
        regionBranch,
      );
      assert.ok(sites.every((group) => group.kind === 'site'));
      assert.ok(sites.every((group) => group.parentKey === region.key));
      assert.ok(sites.every((group) => group.works.length === 1));
      assert.doesNotThrow(() => helpers.layoutSiteMarkers(sites, mobileScale(2.5)));
      assert.deepEqual(
        helpers.layoutMapGroups(artworks, 2.5, mobileScale(2.5), regionBranch)
          .map((group) => group.key),
        sites.map((group) => group.key),
      );
    }
  }
});

test('hierarchy keyboard activation focuses a stable child after rerender', async () => {
  const html = await loadHtml();
  const stateSource = getObjectDeclarationSource(html, 'const state =');
  const expandSource = getFunctionSource(html, 'expandSiteGroup');
  const renderSource = getFunctionSource(html, 'render');
  const focusSource = getFunctionSource(html, 'focusHierarchyChild');
  const zoomSyncSource = getFunctionSource(html, 'syncHierarchyBranchForZoom');
  const { getHierarchyChildFocusToken } = loadPureFunctions(
    html,
    ['getHierarchyChildFocusToken'],
  );
  const groups = [
    { key: 'region-b', parentKey: 'unit-4', siteToken: 'region-b-token' },
    { key: 'region-a', parentKey: 'unit-4', siteToken: 'region-a-token' },
    { key: 'region-c', parentKey: 'unit-5', siteToken: 'region-c-token' },
  ];

  assert.equal(
    getHierarchyChildFocusToken(groups, 'unit-4'),
    'region-b-token',
  );
  assert.equal(getHierarchyChildFocusToken(groups, 'unit-9'), null);
  assert.match(stateSource, /activeUnit:\s*null/);
  assert.match(stateSource, /activeRegion:\s*null/);
  assert.match(stateSource, /pendingFocusParentKey:\s*null/);
  assert.match(expandSource, /group\.kind === 'unit'/);
  assert.match(expandSource, /state\.activeUnit = group\.apUnits\[0\]/);
  assert.match(expandSource, /group\.kind === 'region'/);
  assert.match(expandSource, /state\.activeRegion = group\.key/);
  assert.match(
    expandSource,
    /group\.kind === 'unit'[\s\S]*state\.pendingFocusParentKey = group\.key[\s\S]*group\.kind === 'region'[\s\S]*state\.pendingFocusParentKey = group\.key/,
  );
  assert.doesNotMatch(
    expandSource,
    /if \(restoreFocus\) state\.pendingFocusParentKey = group\.key/,
  );
  assert.match(focusSource, /focusSiteMarker\(childToken\)/);
  assert.match(
    renderSource,
    /markerLayer\.replaceChildren\([\s\S]*state\.pendingFocusParentKey[\s\S]*focusHierarchyChild\([\s\S]*state\.pendingFocusParentKey = null/,
  );
  assert.match(
    getFunctionSource(html, 'clearFilters'),
    /activeUnit:\s*null[\s\S]*activeRegion:\s*null[\s\S]*pendingFocusParentKey:\s*null/,
  );
  assert.match(zoomSyncSource, /state\.transform\.scale < 2\.5[\s\S]*state\.activeRegion = null/);
  assert.match(zoomSyncSource, /state\.transform\.scale < 1\.5[\s\S]*state\.activeUnit = null/);
  assert.match(html, /filter-pill[\s\S]*clearHierarchyBranch\(\)/);
  assert.match(
    html,
    /getElementById\('resetView'\)[\s\S]*clearHierarchyBranch\(\)[\s\S]*transform = \{ x:0, y:0, scale:1 \}/,
  );
});

test('expanded AP pins use deterministic, bounded, non-overlapping spider positions', async () => {
  const html = await loadHtml();
  const {
    getMarkerBounds,
    markerBoundsOverlap,
    getExpandedPinMetrics,
    expandedPinPositions,
  } = loadPureFunctions(
    html,
    [
      'getMarkerBounds',
      'markerBoundsOverlap',
      'getExpandedPinMetrics',
      'expandedPinPositions',
    ],
  );
  const screenScale = 362 / 1600;
  const group = {
    works: Array.from({ length: 7 }, (_, index) => ({
      id: `ap-${index + 41}`,
      apNumber: index + 41,
    })),
  };
  const center = { x: 875, y: 296 };
  const first = expandedPinPositions(group, center, screenScale);
  const second = expandedPinPositions(group, center, screenScale);
  const metrics = getExpandedPinMetrics(screenScale);

  assert.deepEqual(first, second, 'spider positions must not change across renders');
  assert.equal(first.length, group.works.length);
  assert.ok(metrics.hitWidth * screenScale >= 44);
  assert.ok(metrics.hitHeight * screenScale >= 44);
  first.forEach((pin, index) => {
    assert.equal(pin.work.id, group.works[index].id);
    assert.ok(pin.bounds.left >= 0, `${pin.work.id} crosses left edge`);
    assert.ok(pin.bounds.right <= 1600, `${pin.work.id} crosses right edge`);
    assert.ok(pin.bounds.top >= 0, `${pin.work.id} crosses top edge`);
    assert.ok(pin.bounds.bottom <= 800, `${pin.work.id} crosses bottom edge`);
    first.slice(index + 1).forEach((other) => {
      assert.equal(
        markerBoundsOverlap(pin.bounds, other.bounds),
        false,
        `${pin.work.id} overlaps ${other.work.id}`,
      );
    });
  });
});

test('zoomed spider positions stay inside the currently visible world bounds', async () => {
  const html = await loadHtml();
  const {
    getMarkerBounds,
    markerBoundsOverlap,
    getExpandedPinMetrics,
    getVisibleWorldBounds,
    expandedPinPositions,
    shouldUseCompactExpandedList,
  } = loadPureFunctions(
    html,
    [
      'getMarkerBounds',
      'markerBoundsOverlap',
      'getExpandedPinMetrics',
      'getVisibleWorldBounds',
      'expandedPinPositions',
      'shouldUseCompactExpandedList',
    ],
  );
  const visibleBounds = getVisibleWorldBounds({ x: -1600, y: -800, scale: 2 });
  assert.deepEqual(visibleBounds, {
    left: 800,
    right: 1600,
    top: 400,
    bottom: 800,
  });
  const screenScale = 1;
  const center = { x: 850, y: 450 };
  const group = {
    works: Array.from({ length: 7 }, (_, index) => ({
      id: `edge-ap-${index + 41}`,
      apNumber: index + 41,
    })),
  };
  const parentBounds = getMarkerBounds(center, getExpandedPinMetrics(screenScale));
  const pins = expandedPinPositions(
    group,
    center,
    screenScale,
    [parentBounds],
    visibleBounds,
  );

  pins.forEach((pin) => {
    assert.ok(pin.bounds.left >= visibleBounds.left);
    assert.ok(pin.bounds.right <= visibleBounds.right);
    assert.ok(pin.bounds.top >= visibleBounds.top);
    assert.ok(pin.bounds.bottom <= visibleBounds.bottom);
  });
  assert.equal(
    shouldUseCompactExpandedList(
      group,
      center,
      screenScale,
      [parentBounds],
      { left: 800, right: 900, top: 400, bottom: 500 },
    ),
    true,
  );
});

test('Units 1-2 expanded pins fit every collision-safe site center at mobile scale', async () => {
  const html = await loadHtml();
  const artworks = parseArtworkData(html).filter(({ unit }) => unit <= 2);
  const {
    compactApNumbers,
    formatApGroupLabel,
    createSiteToken,
    groupBySite,
    toWorldCoordinates,
    getMarkerMetrics,
    getExpandedPinMetrics,
    getMarkerBounds,
    markerBoundsOverlap,
    expandMarkerBounds,
    createSpatialHash,
    findNearestAvailableMarkerSlot,
    layoutSiteMarkers,
    expandedPinPositions,
  } = loadPureFunctions(
    html,
    [
      'compactApNumbers',
      'formatApGroupLabel',
      'createSiteToken',
      'groupBySite',
      'toWorldCoordinates',
      'getMarkerMetrics',
      'getExpandedPinMetrics',
      'getMarkerBounds',
      'markerBoundsOverlap',
      'expandMarkerBounds',
      'createSpatialHash',
      'findNearestAvailableMarkerSlot',
      'layoutSiteMarkers',
      'expandedPinPositions',
    ],
    ['const SITE_WORLD_COORDINATES ='],
  );
  const screenScale = 362 / 1600;
  const groupedSites = groupBySite(artworks).filter((group) => group.works.length > 1);
  const groups = layoutSiteMarkers(groupedSites, screenScale);

  groups.forEach((group) => {
    assert.doesNotThrow(
      () => expandedPinPositions(
        group,
        { x: group.displayX, y: group.displayY },
        screenScale,
      ),
      `${group.siteName} must expand around its collision-safe display center`,
    );
  });
});

test('desktop expanded pins avoid their parent target and every other site marker', async () => {
  const html = await loadHtml();
  const artworks = parseArtworkData(html).filter(({ unit }) => unit === 2);
  const {
    compactApNumbers,
    formatApGroupLabel,
    createSiteToken,
    groupBySite,
    toWorldCoordinates,
    getMarkerMetrics,
    getExpandedPinMetrics,
    getMarkerBounds,
    markerBoundsOverlap,
    expandMarkerBounds,
    createSpatialHash,
    findNearestAvailableMarkerSlot,
    layoutSiteMarkers,
    expandedPinPositions,
  } = loadPureFunctions(
    html,
    [
      'compactApNumbers',
      'formatApGroupLabel',
      'createSiteToken',
      'groupBySite',
      'toWorldCoordinates',
      'getMarkerMetrics',
      'getExpandedPinMetrics',
      'getMarkerBounds',
      'markerBoundsOverlap',
      'expandMarkerBounds',
      'createSpatialHash',
      'findNearestAvailableMarkerSlot',
      'layoutSiteMarkers',
      'expandedPinPositions',
    ],
    ['const SITE_WORLD_COORDINATES ='],
  );
  const screenScale = 0.5;
  const groups = layoutSiteMarkers(groupBySite(artworks), screenScale);
  const obstacles = groups.map((group) => group.bounds);

  groups.filter((group) => group.works.length > 1).forEach((group) => {
    const pins = expandedPinPositions(
      group,
      { x: group.displayX, y: group.displayY },
      screenScale,
      obstacles,
    );
    pins.forEach((pin) => {
      obstacles.forEach((bounds) => {
        assert.equal(
          markerBoundsOverlap(pin.bounds, bounds),
          false,
          `${group.siteName} ${pin.work.id} overlaps a site marker`,
        );
      });
    });
  });
});

test('Units 1-2 compact mode follows actual spider capacity at embedded map scales', async () => {
  const html = await loadHtml();
  const artworks = parseArtworkData(html).filter(({ unit }) => unit <= 2);
  const functionNames = [
    'compactApNumbers',
    'formatApGroupLabel',
    'createSiteToken',
    'groupBySite',
    'toWorldCoordinates',
    'getMarkerMetrics',
    'getExpandedPinMetrics',
    'getMarkerBounds',
    'markerBoundsOverlap',
    'expandMarkerBounds',
    'createSpatialHash',
    'findNearestAvailableMarkerSlot',
    'layoutSiteMarkers',
    'expandedPinPositions',
    'shouldUseCompactExpandedList',
  ];
  const helpers = loadPureFunctions(
    html,
    functionNames,
    ['const SITE_WORLD_COORDINATES ='],
  );

  for (const screenScale of [0.22625, 0.253, 0.27, 0.5]) {
    const groupedSites = helpers.groupBySite(artworks)
      .filter((group) => group.works.length > 1);
    const groups = helpers.layoutSiteMarkers(groupedSites, screenScale);
    const obstacles = groups.map((group) => group.bounds);
    groups.forEach((group) => {
      assert.equal(
        helpers.shouldUseCompactExpandedList(
          group,
          { x: group.displayX, y: group.displayY },
          screenScale,
          obstacles,
        ),
        screenScale <= 0.27,
        `${group.siteName} should use ${screenScale <= 0.27 ? 'compact' : 'spider'} mode`,
      );
    });
  }
});

test('mobile expansion uses a bounded compact list with exact AP work buttons', async () => {
  const html = await loadHtml();
  const compactSource = getFunctionSource(html, 'renderCompactExpandedList');
  const renderSource = getFunctionSource(html, 'render');

  assert.match(html, /<div id="expandedPinList" class="expanded-pin-list" hidden>/);
  assert.match(
    renderSource,
    /shouldUseCompactExpandedList\(\s*expandedGroup,\s*expandedCenter,\s*renderedMarkerScale,\s*obstacleBounds/,
  );
  assert.match(compactSource, /button\.dataset\.workId = work\.id/);
  assert.match(compactSource, /expandedPinList\.classList\.add\('is-visible'\)/);
  assert.match(compactSource, /mapPanel\.classList\.add\('has-compact-list'\)/);
  assert.match(renderSource, /expandedPinList\.classList\.remove\('is-visible'\)/);
  assert.match(renderSource, /mapPanel\.classList\.remove\('has-compact-list'\)/);
  assert.match(compactSource, /button\.setAttribute\('role',\s*'button'\)/);
  assert.match(compactSource, /button\.setAttribute\('tabindex',\s*'0'\)/);
  assert.match(
    compactSource,
    /button\.setAttribute\('aria-pressed',\s*String\(state\.selectedId === work\.id\)\)/,
  );
  assert.match(
    compactSource,
    /`AP \$\{work\.apNumber\} · \$\{work\.titleEn\} · \$\{group\.siteName\}`/,
  );
  assert.match(compactSource, /selectArtwork\(work\.id,\s*group\.siteToken/);
  assert.match(getCssDeclarations(html, '.expanded-pin-list'), /width:\s*100%/);
  assert.match(
    getCssDeclarations(html, '.expanded-pin-list.is-visible'),
    /display:\s*grid/,
  );
  assert.ok(
    html.indexOf('.expanded-pin-list.is-visible') < html.indexOf('@media (max-width:520px)'),
    'compact visibility must not depend on the 520px media query',
  );
  assert.match(
    getCssDeclarations(html, '.map-panel.has-compact-list'),
    /display:\s*grid/,
  );
  assert.match(
    getCssDeclarations(html, '.map-panel.has-compact-list'),
    /overflow:\s*(?:auto|visible)/,
  );
  assert.match(
    getCssDeclarations(html, '.expanded-pin-list-button'),
    /min-height:\s*44px/,
  );
  assert.match(
    getCssDeclarations(html, '.expanded-pin-list-button'),
    /overflow-wrap:\s*anywhere/,
  );
});

test('site expansion identity remains stable for compatible filtered subsets', async () => {
  const html = await loadHtml();
  const artworks = parseArtworkData(html);
  const { compactApNumbers, formatApGroupLabel, createSiteToken, groupBySite } =
    loadPureFunctions(
      html,
      ['compactApNumbers', 'formatApGroupLabel', 'createSiteToken', 'groupBySite'],
    );
  const rome = artworks.filter((work) => work.siteName === 'Rome');
  const fullToken = groupBySite(rome)[0].siteToken;
  const subsetToken = groupBySite(rome.slice(0, 2))[0].siteToken;

  assert.equal(fullToken, subsetToken);
  assert.match(
    getFunctionSource(html, 'render'),
    /group\.siteToken === state\.expandedSiteToken && group\.works\.length > 1/,
  );
});

test('multi-work groups expand while single groups and child pins select exact works', async () => {
  const html = await loadHtml();
  const stateSource = getObjectDeclarationSource(html, 'const state =');
  const expandSource = getFunctionSource(html, 'expandSiteGroup');
  const selectSource = getFunctionSource(html, 'selectArtwork');
  const expandedRenderSource = getFunctionSource(html, 'renderExpandedWorkPins');
  const renderSource = getFunctionSource(html, 'render');

  assert.match(stateSource, /expandedSiteToken:\s*null/);
  assert.match(expandSource, /isSingleWorkSiteGroup\(group\)/);
  assert.match(expandSource, /selectArtwork\(group\.works\[0\]\.id,\s*group\.siteToken/);
  assert.match(
    expandSource,
    /state\.expandedSiteToken === group\.siteToken \? null : group\.siteToken/,
  );
  assert.match(selectSource, /state\.selectedId = workId/);
  assert.match(selectSource, /state\.expandedSiteToken = siteToken/);
  assert.match(selectSource, /state\.activeDetailTab = 'quick'/);
  assert.match(renderSource, /expandSiteGroup\(group/);
  assert.doesNotMatch(renderSource, /selectSite\(group/);

  assert.match(expandedRenderSource, /expandedPinPositions\(\s*group,\s*center/);
  assert.match(expandedRenderSource, /classList\.add\('expanded-work-pin'\)/);
  assert.match(expandedRenderSource, /pin\.setAttribute\('role',\s*'button'\)/);
  assert.match(expandedRenderSource, /pin\.setAttribute\('tabindex',\s*'0'\)/);
  assert.match(
    expandedRenderSource,
    /`AP \$\{work\.apNumber\} · \$\{work\.titleEn\} · \$\{group\.siteName\}`/,
  );
  assert.match(expandedRenderSource, /label\.textContent = String\(work\.apNumber\)/);
  assert.match(expandedRenderSource, /selectArtwork\(work\.id,\s*group\.siteToken/);
  assert.match(expandedRenderSource, /event\.key !== 'Enter' && event\.key !== ' '/);
});

test('expansion closes only when incompatible and focus survives marker rerenders', async () => {
  const html = await loadHtml();
  const renderSource = getFunctionSource(html, 'render');
  const clearSource = getFunctionSource(html, 'clearFilters');

  assert.match(
    renderSource,
    /visibleGroups\.some\(\(group\) => \(\s*group\.siteToken === state\.expandedSiteToken && group\.works\.length > 1/,
  );
  assert.match(renderSource, /state\.expandedSiteToken = null/);
  assert.match(clearSource, /expandedSiteToken:\s*null/);
  assert.match(html, /function focusExpandedWorkPin\(workId\)/);
  assert.match(html, /\[data-work-id="\$\{workId\}"\]/);
  assert.match(renderSource, /focusedWorkId/);
  assert.match(renderSource, /focusExpandedWorkPin\(focusedWorkId\)/);
  assert.doesNotMatch(
    renderSource,
    /state\.transform\.scale\s*>=\s*2[\s\S]*expandedSiteToken/,
    'zoom level must not automatically expand all groups',
  );
});

test('site focus tokens are stable, selector-safe, and used after marker rerenders', async () => {
  const html = await loadHtml();
  const { createSiteToken } = loadPureFunctions(html, ['createSiteToken']);
  const token = createSiteToken([{ id: 'rome\u0000forty one' }, { id: 'ap-42' }]);

  assert.doesNotMatch(token, /\u0000/);
  assert.match(token, /^[a-zA-Z0-9_-]+$/);
  assert.equal(
    token,
    createSiteToken([{ id: 'ap-42' }, { id: 'rome\u0000forty one' }]),
  );
  assert.match(html, /marker\.dataset\.siteToken = group\.siteToken/);
  assert.match(html, /function focusSiteMarker\(siteToken\)/);
  assert.match(html, /\[data-site-token="\$\{siteToken\}"\]/);
  assert.doesNotMatch(html, /data-site-key/);
});

test('marker layout recomputes when the rendered map size changes', async () => {
  const html = await loadHtml();

  assert.match(html, /function getRenderedMarkerScale\(/);
  assert.match(
    getFunctionSource(html, 'getRenderedMarkerScale'),
    /getMapScreenScale\(bounds\.width, bounds\.height, state\.transform\.scale\)/,
  );
  assert.match(html, /window\.addEventListener\('resize', scheduleMarkerLayout\)/);
  assert.match(html, /new ResizeObserver\(scheduleMarkerLayout\)/);
  assert.match(html, /requestAnimationFrame\(\(\) => render\(\)\)/);
});

test('render keeps the previous marker layer until a complete layout succeeds', async () => {
  const html = await loadHtml();
  const renderSource = getFunctionSource(html, 'render');
  const layoutIndex = renderSource.indexOf('layoutMapGroups(');
  const replaceIndex = renderSource.indexOf('markerLayer.replaceChildren(');

  assert.ok(layoutIndex >= 0, 'render must calculate a marker layout');
  assert.ok(replaceIndex > layoutIndex, 'render must replace markers only after layout succeeds');
});

test('detail images show the complete artwork without cover cropping', async () => {
  const html = await loadHtml();
  const detailImageCss = getCssDeclarations(html, '.artwork-image-button img');
  assert.match(detailImageCss, /object-fit:\s*contain/);
  assert.doesNotMatch(detailImageCss, /object-fit:\s*cover/);
  assert.match(
    detailImageCss,
    /(?:^|;)\s*height:\s*278px/,
    'image box height must equal the 300px border-box button minus 20px padding and 2px border',
  );
  assert.match(detailImageCss, /(?:^|;)\s*max-height:\s*278px/);
  assert.match(detailImageCss, /(?:^|;)\s*width:\s*100%/);
  assert.match(detailImageCss, /(?:^|;)\s*max-width:\s*100%/);
  assert.doesNotMatch(detailImageCss, /(?:^|;)\s*(?:height|max-height):\s*100%/);

  const imageButtonCss = getCssDeclarations(html, '.artwork-image-button');
  assert.match(imageButtonCss, /background:\s*var\(--surface-sunken\)/);
  assert.match(imageButtonCss, /box-sizing:\s*border-box/);
  assert.match(imageButtonCss, /(?:^|;)\s*height:\s*300px/);
  assert.match(imageButtonCss, /(?:^|;)\s*max-height:\s*300px/);
  assert.match(imageButtonCss, /(?:^|;)\s*padding:\s*10px/);
  assert.match(imageButtonCss, /(?:^|;)\s*border:\s*1px\s+solid/);
});

test('marker, tab, dialog, and comparison interactions retain visible keyboard focus', async () => {
  const html = await loadHtml();
  const focusCss = getCssDeclarations(html, ':focus-visible');

  assert.match(focusCss, /outline:\s*3px solid #28708a/);
  assert.match(focusCss, /outline-offset:\s*3px/);
  for (const selector of [
    '.filter-pill',
    '.clear-button',
    '.map-controls button',
    '.site-marker',
    '.expanded-work-pin',
    '.detail-tab',
    '.dialog-close',
    '.comparison-card',
  ]) {
    assert.ok(html.includes(selector), `missing focusable ${selector} control`);
  }
  assert.match(getFunctionSource(html, 'render'), /marker\.setAttribute\('tabindex', '0'\)/);
  assert.match(
    getFunctionSource(html, 'renderExpandedWorkPins'),
    /pin\.setAttribute\('tabindex', '0'\)/,
  );
});

test('all custom map markers expose button semantics, descriptive names, and keyboard activation', async () => {
  const html = await loadHtml();
  const renderSource = getFunctionSource(html, 'render');
  const expandedSource = getFunctionSource(html, 'renderExpandedWorkPins');
  const compactSource = getFunctionSource(html, 'renderCompactExpandedList');

  assert.match(renderSource, /marker\.setAttribute\('role', 'button'\)/);
  assert.match(renderSource, /marker\.setAttribute\('tabindex', '0'\)/);
  assert.match(
    renderSource,
    /marker\.setAttribute\('aria-label', `\$\{groupText\.title\} · \$\{groupText\.subtitle\}`\)/,
  );
  assert.match(renderSource, /event\.key !== 'Enter' && event\.key !== ' '/);
  assert.match(renderSource, /event\.preventDefault\(\);\s*expandSiteGroup\(group, true\)/);

  for (const source of [expandedSource, compactSource]) {
    assert.match(source, /`AP \$\{work\.apNumber\} · \$\{work\.titleEn\} · \$\{group\.siteName\}`/);
    assert.match(source, /selectArtwork\(work\.id,\s*group\.siteToken/);
  }
  assert.match(expandedSource, /pin\.setAttribute\('role', 'button'\)/);
  assert.match(expandedSource, /event\.key !== 'Enter' && event\.key !== ' '/);
  assert.match(compactSource, /button\.type = 'button'/);
});

test('artwork images and modal preserve labels, complete-image space, fallback, and trigger focus', async () => {
  const html = await loadHtml();
  const renderDetailsSource = getFunctionSource(html, 'renderArtworkDetails');
  const openDialogSource = getFunctionSource(html, 'openImageDialog');
  const fallbackSource = getFunctionSource(html, 'installImageFallback');
  const dialogImageCss = getCssDeclarations(html, '.dialog-media img');
  const dialogMediaCss = getCssDeclarations(html, '.dialog-media');

  assert.match(renderDetailsSource, /image\.alt = media\.imageAlt/);
  assert.match(renderDetailsSource, /installImageFallback\(\s*image,\s*work,/);
  assert.match(openDialogSource, /image\.alt = media\.imageAlt/);
  assert.match(openDialogSource, /installImageFallback\(image, work\)/);
  assert.match(fallbackSource, /image\.addEventListener\('error'/);
  assert.match(fallbackSource, /image\.replaceWith\(fallback\)/);
  assert.match(dialogMediaCss, /min-height:\s*200px/);
  assert.match(dialogImageCss, /object-fit:\s*contain/);
  assert.match(html, /<dialog id="imageDialog" aria-labelledby="dialogTitle">/);
  assert.match(openDialogSource, /imageDialogTrigger = trigger/);
  assert.match(openDialogSource, /imageDialog\.showModal\(\)/);
  assert.match(openDialogSource, /getElementById\('dialogClose'\)\.focus\(\{\s*preventScroll:\s*true\s*\}\)/);
  assert.match(
    html,
    /imageDialog\.addEventListener\('close', \(\) => \{\s*clearImageDialogViewport\?\.\(\);\s*clearImageDialogViewport = null;[\s\S]*?const focusTarget = imageDialogTrigger\?\.isConnected/,
  );
  assert.match(html, /detailPanel\.querySelector\('\.artwork-image-button'\)/);
  assert.match(html, /focusTarget\?\.focus\(\)/);
  assert.match(
    html,
    /const focusedDetailImageButton = document\.activeElement\?\.classList\?\.contains\('artwork-image-button'\)/,
  );
  assert.match(
    html,
    /if \(focusedDetailImageButton\) detailPanel\.querySelector\('\.artwork-image-button'\)\?\.focus\(\{ preventScroll:true \}\)/,
  );
  assert.doesNotMatch(html, /class=["'][^"']*gallery|createGallery|renderGallery/i);
});

test('required image view switcher wraps six controls and stays touch accessible', async () => {
  const html = await loadHtml();
  const switcherCss = getCssDeclarations(html, '.image-view-switcher');
  const buttonCss = getCssDeclarations(html, '.image-view-switcher button');
  const pressedCss = getCssDeclarations(html, '.image-view-switcher button[aria-pressed="true"]');

  assert.match(switcherCss, /display:\s*flex/);
  assert.match(switcherCss, /flex-wrap:\s*wrap/);
  assert.match(switcherCss, /gap:\s*6px/);
  assert.match(switcherCss, /margin:\s*8px 0 0/);
  assert.match(buttonCss, /min-height:\s*30px/);
  assert.match(buttonCss, /padding:\s*5px 10px/);
  assert.match(buttonCss, /border:\s*1px solid var\(--line\)/);
  assert.match(buttonCss, /border-radius:\s*999px/);
  assert.match(buttonCss, /background:\s*var\(--paper\)/);
  assert.match(buttonCss, /color:\s*var\(--ink-soft\)/);
  assert.match(buttonCss, /font:\s*inherit/);
  assert.match(buttonCss, /font-size:\s*12px/);
  assert.match(buttonCss, /font-weight:\s*600/);
  assert.match(pressedCss, /background:\s*var\(--ink\)/);
  assert.match(pressedCss, /border-color:\s*var\(--ink\)/);
  assert.match(pressedCss, /color:\s*#fff/);

  const narrowCss = getMediaQuerySource(html, '(max-width:666px)');
  const narrowButtonCss = getCssDeclarations(narrowCss, '.image-view-switcher button');
  assert.match(narrowButtonCss, /min-height:\s*44px/);
});

test('motion preferences and map gesture alternatives remain accessible', async () => {
  const html = await loadHtml();
  const reducedMotionCss = getMediaQuerySource(html, '(prefers-reduced-motion:reduce)');
  const panCss = getCssDeclarations(html, '#panSurface');

  assert.match(reducedMotionCss, /transition-duration:\s*\.01ms!important/);
  assert.match(reducedMotionCss, /animation-duration:\s*\.01ms!important/);
  assert.match(reducedMotionCss, /animation-iteration-count:\s*1!important/);
  assert.match(panCss, /touch-action:\s*none/);
  assert.match(html, /panSurface\.addEventListener\('pointerdown'/);
  assert.match(html, /panSurface\.addEventListener\('pointermove'/);
  assert.doesNotMatch(html, /(?:mapPanel|mapSvg|document)\.addEventListener\('pointer(?:down|move)'/);
  assert.match(html, /<button id="zoomIn"[^>]+aria-label="放大地图"/);
  assert.match(html, /<button id="zoomOut"[^>]+aria-label="缩小地图"/);
  assert.match(html, /<button id="resetView"[^>]+aria-label="还原地图"/);
});

test('hierarchy keeps textual accessible cues plus an individual-versus-group shape cue', async () => {
  const html = await loadHtml();
  const renderSource = getFunctionSource(html, 'render');
  const groupTextSource = getFunctionSource(html, 'getMapGroupText');

  assert.match(renderSource, /marker\.dataset\.groupKind = group\.kind/);
  assert.match(renderSource, /titleLabel\.textContent = groupText\.title/);
  assert.match(renderSource, /subtitleLabel\.textContent = groupText\.subtitle/);
  assert.match(
    renderSource,
    /marker\.setAttribute\('aria-label', `\$\{groupText\.title\} · \$\{groupText\.subtitle\}`\)/,
  );
  assert.match(
    renderSource,
    /isSingleWorkSiteGroup\(group\) \? 'circle' : 'rect'/,
  );
  assert.match(getCssDeclarations(html, '.site-marker[data-group-kind="unit"] .marker-label-bg'), /fill:\s*var\(--unit-marker\)/);
  assert.match(
    groupTextSource,
    /title:\s*`U\$\{unit\.id\}`[\s\S]*subtitle:\s*`\$\{unit\.nameEn\} · \$\{formatPieceCount\(group\.works\.length\)\}`/,
  );
  assert.match(groupTextSource, /title:\s*MAP_REGIONS\[group\.regionId\]\?\.nameEn/);
  assert.match(groupTextSource, /title:\s*group\.siteName/);
});
