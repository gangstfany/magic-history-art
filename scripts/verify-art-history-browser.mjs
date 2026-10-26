#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { access, readdir, readFile, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, extname, join, normalize, relative } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

export const REQUIRED_VIEWPORTS = Object.freeze([
  { width: 1365, height: 768 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 667, height: 375 },
  { width: 665, height: 700 },
]);

export const U6_SMOKE_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 1365, height: 768, mode: 'standalone' }),
  Object.freeze({ width: 390, height: 844, mode: 'standalone' }),
  Object.freeze({ width: 1024, height: 768, mode: 'embedded' }),
]);

const U6_TAB_IDS = Object.freeze(['quick', 'form', 'context', 'compare']);
const U6_REGION_LABELS = Object.freeze([
  'Southern Africa · 1 piece', 'West Africa · 7 pieces', 'Central Africa · 6 pieces',
]);
const U6_VIEW_IDS = Object.freeze([
  ['conical-tower', 'circular-wall'], ['mosque', 'monday-market'],
  ['wall-plaque', 'oba-context'], ['golden-stool', 'stool-context'],
  ['ndop', 'ruler-context'], ['primary'], ['primary'],
  ['mask', 'performance-context'], ['mask', 'performance-context'], ['primary'],
  ['memory-board', 'contextual'], ['mask', 'performance-context'], ['primary'], ['primary'],
].map(Object.freeze));

export function assertU6SmokeCoverage(report) {
  assert.equal(report.kind, 'u6-fourteen-works', 'U6 smoke result kind');
  assert.equal(report.cases.length, 3, 'U6 smoke exact three cases');
  for (const [caseIndex, entry] of report.cases.entries()) {
    const label = `U6 case ${caseIndex}`;
    assert.deepEqual(entry.viewport, U6_SMOKE_VIEWPORTS[caseIndex], `${label} viewport/mode`);
    assert.deepEqual(entry.regions, U6_REGION_LABELS, `${label} region counts`);
    assert.deepEqual(entry.works.map(({ apNumber }) => apNumber),
      Array.from({ length: 14 }, (_, index) => 167 + index), `${label} numeric AP traversal`);
    for (const [workIndex, work] of entry.works.entries()) {
      assert.equal(work.selected, true, `${label} AP ${work.apNumber} selected through UI`);
      assert.deepEqual(work.viewIds, U6_VIEW_IDS[workIndex], `${label} AP ${work.apNumber} required views`);
      assert.deepEqual(work.tabIds, U6_TAB_IDS, `${label} AP ${work.apNumber} all four tabs`);
    }
    assert.equal(entry.workCount, 14, `${label} work count`);
    assert.equal(entry.viewCount, 23, `${label} required view count`);
    assert.equal(entry.tabCount, 56, `${label} tab visit count`);
    assert.equal(entry.viewButtonActivations, 18, `${label} multi-view button activations`);
    assert.equal(entry.singleViewSelections, 5, `${label} sole primary view selections`);
    assert.equal(entry.comparison.fromApNumber, 167, `${label} comparison origin`);
    assert.ok(entry.comparison.targetId, `${label} comparison target`);
    assert.equal(entry.comparison.followed, true, `${label} comparison followed`);
    assert.equal(entry.comparison.returned, true, `${label} comparison returned`);
    assert.equal(entry.dialog.apNumber, 167, `${label} public dialog work`);
    assert.equal(entry.dialog.viewId, 'conical-tower', `${label} public dialog view`);
    assertDialogFocusRestored(entry.dialog.focusRestored, label);
    assertNoHorizontalOverflow(entry.horizontalOverflow, label);
    assertNoHorizontalOverflow(entry.hostHorizontalOverflow, `${label} host`);
    assert.ok(entry.overflowHistory.length, `${label} overflow checkpoints`);
    for (const checkpoint of entry.overflowHistory) {
      assertNoHorizontalOverflow(checkpoint.horizontalOverflow, `${label} ${checkpoint.checkpoint}`);
      assertNoHorizontalOverflow(checkpoint.hostHorizontalOverflow, `${label} host ${checkpoint.checkpoint}`);
    }
    assertNoCollectedIssues(entry.issues, label);
  }
}

export const BOUNDARY_VIEWPORTS = Object.freeze([
  { width: 519, height: 700 },
  { width: 520, height: 700 },
  { width: 521, height: 700 },
  { width: 519, height: 519 },
  { width: 519, height: 520 },
  { width: 519, height: 521 },
  { width: 520, height: 519 },
  { width: 520, height: 520 },
  { width: 520, height: 521 },
  { width: 521, height: 519 },
  { width: 521, height: 520 },
  { width: 521, height: 521 },
  { width: 639, height: 700 },
  { width: 640, height: 700 },
  { width: 641, height: 700 },
  { width: 664, height: 700 },
  { width: 665, height: 700 },
  { width: 639, height: 519 },
  { width: 639, height: 520 },
  { width: 639, height: 521 },
  { width: 640, height: 519 },
  { width: 640, height: 520 },
  { width: 640, height: 521 },
  { width: 641, height: 519 },
  { width: 641, height: 520 },
  { width: 641, height: 521 },
  { width: 663, height: 519 },
  { width: 663, height: 520 },
  { width: 663, height: 521 },
  { width: 664, height: 519 },
  { width: 664, height: 520 },
  { width: 664, height: 521 },
  { width: 665, height: 519 },
  { width: 665, height: 520 },
  { width: 665, height: 521 },
  { width: 667, height: 519 },
  { width: 667, height: 520 },
  { width: 667, height: 521 },
]);

export const VERIFIER_IMAGE_TIMEOUT_MS = 15_000;
export const BROWSER_VERIFICATION_TIMEOUT_MS = 10 * 60 * 1000;
export const BROWSER_CLEANUP_TIMEOUT_MS = 30_000;
export const U3_FAULT_MODES = Object.freeze([
  'wrong-rendered-url',
  'broken-focus-restoration',
  'duplicate-network-request',
]);

export function parseU3FaultMode(args) {
  const faultArguments = args.filter((argument) => argument.startsWith('--u3-fault'));
  for (const argument of faultArguments) {
    assert.match(
      argument,
      /^--u3-fault=.+$/,
      `Malformed --u3-fault argument ${JSON.stringify(argument)}`,
    );
  }
  assert.ok(
    faultArguments.length <= 1,
    'Verifier accepts exactly one --u3-fault argument',
  );
  if (!faultArguments.length) return null;
  const faultMode = faultArguments[0].slice('--u3-fault='.length);
  assert.ok(
    U3_FAULT_MODES.includes(faultMode),
    `Unknown U3 verifier fault mode ${JSON.stringify(faultMode)}`,
  );
  return faultMode;
}

const PROJECT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

class DuplicateVerifierJsonKeyError extends Error {}

export function parseVerifierJson(source, label) {
  let index = 0;
  const skipWhitespace = () => {
    while (/\s/.test(source[index] || '')) index += 1;
  };
  const syntaxError = (message) => {
    throw new SyntaxError(`${message} at position ${index}`);
  };
  const parseString = () => {
    if (source[index] !== '"') syntaxError('Expected a JSON string');
    const start = index;
    index += 1;
    while (index < source.length) {
      if (source[index] === '\\') {
        index += 2;
      } else if (source[index] === '"') {
        index += 1;
        return JSON.parse(source.slice(start, index));
      } else {
        index += 1;
      }
    }
    syntaxError('Unterminated JSON string');
    return '';
  };
  const childPath = (path, key) => (
    /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
      ? `${path}.${key}`
      : `${path}[${JSON.stringify(key)}]`
  );
  const parseValue = (path) => {
    skipWhitespace();
    if (source[index] === '{') {
      parseObject(path);
    } else if (source[index] === '[') {
      parseArray(path);
    } else if (source[index] === '"') {
      parseString();
    } else {
      const start = index;
      while (
        index < source.length
        && ![',', ']', '}'].includes(source[index])
        && !/\s/.test(source[index])
      ) index += 1;
      if (index === start) syntaxError('Expected a JSON value');
    }
  };
  const parseObject = (path) => {
    index += 1;
    skipWhitespace();
    if (source[index] === '}') {
      index += 1;
      return;
    }
    const keys = new Set();
    while (index < source.length) {
      skipWhitespace();
      const key = parseString();
      if (keys.has(key)) {
        throw new DuplicateVerifierJsonKeyError(
          `contains duplicate object key ${JSON.stringify(key)} at ${path}`,
        );
      }
      keys.add(key);
      skipWhitespace();
      if (source[index] !== ':') syntaxError('Expected ":" after object key');
      index += 1;
      parseValue(childPath(path, key));
      skipWhitespace();
      if (source[index] === '}') {
        index += 1;
        return;
      }
      if (source[index] !== ',') syntaxError('Expected "," or "}" in object');
      index += 1;
    }
    syntaxError('Unterminated JSON object');
  };
  const parseArray = (path) => {
    index += 1;
    skipWhitespace();
    if (source[index] === ']') {
      index += 1;
      return;
    }
    let itemIndex = 0;
    while (index < source.length) {
      parseValue(`${path}[${itemIndex}]`);
      itemIndex += 1;
      skipWhitespace();
      if (source[index] === ']') {
        index += 1;
        return;
      }
      if (source[index] !== ',') syntaxError('Expected "," or "]" in array');
      index += 1;
    }
    syntaxError('Unterminated JSON array');
  };

  try {
    parseValue('$');
    skipWhitespace();
    if (index !== source.length) syntaxError('Unexpected trailing JSON content');
    return JSON.parse(source);
  } catch (error) {
    if (error instanceof DuplicateVerifierJsonKeyError) {
      throw new Error(`${label} ${error.message}`);
    }
    throw new Error(`${label} contains invalid JSON (${error.message})`);
  }
}

const U1_WORKS = Object.freeze(JSON.parse(
  await readFile(join(PROJECT_ROOT, 'tests', 'fixtures', 'u1-browser.json'), 'utf8'),
));
const NINE_IMPORTED_WORKS = Object.freeze(JSON.parse(
  await readFile(join(PROJECT_ROOT, 'tests', 'fixtures', 'u2-imported-browser.json'), 'utf8'),
));
const U3_WORK_KEYS = Object.freeze([
  'id',
  'apNumber',
  'titleEn',
  'titleZh',
  'unit',
  'region',
  'siteName',
  'provenanceQualifier',
  'images',
]);
const U3_IMAGE_KEYS = Object.freeze([
  'id',
  'label',
  'imageUrl',
  'imageAlt',
  'imageSourceUrl',
]);
const U3_CULTURE_LABELS_ZH = Object.freeze({
  earlyChristianRome: '早期基督教罗马',
  earlyByzantineManuscript: '早期拜占庭手抄本',
  byzantineRavenna: '拜占庭拉文纳',
  byzantineConstantinople: '拜占庭君士坦丁堡',
  merovingianMetalwork: '墨洛温金属工艺',
  byzantineSinai: '拜占庭西奈',
  insularHibernoSaxon: '不列颠群岛希伯诺-撒克逊',
  umayyadIberia: '伊比利亚倭马亚',
  romanesquePilgrimage: '罗马式朝圣艺术',
  normanRomanesque: '诺曼罗马式',
  frenchGothic: '法国哥特式',
  frenchGothicManuscript: '法国哥特式手抄本',
  germanGothicDevotional: '德国哥特式虔敬艺术',
  protoRenaissanceItaly: '意大利原文艺复兴',
  sephardicJewishManuscript: '塞法迪犹太手抄本',
  nasridAndalusia: '纳斯里德安达卢西亚',
  earlyNetherlandish: '早期尼德兰',
  florentineEarlyRenaissance: '佛罗伦萨早期文艺复兴',
  florentineRenaissance: '佛罗伦萨文艺复兴',
  highRenaissanceItaly: '意大利文艺复兴盛期',
  northernRenaissanceGermany: '德国北方文艺复兴',
  italianMannerism: '意大利矫饰主义',
  protestantReformationGermany: '德国宗教改革',
  venetianRenaissance: '威尼斯文艺复兴',
  colonialMexicaManuscript: '新西班牙墨西加殖民手抄本',
  romanBaroqueJesuit: '罗马耶稣会巴洛克',
  northernRenaissanceFlemish: '佛兰德斯北方文艺复兴',
  ottomanIslamic: '奥斯曼伊斯兰',
  italianBaroque: '意大利巴洛克',
  flemishBaroque: '佛兰德斯巴洛克',
  dutchBaroque: '荷兰巴洛克',
  andeanColonialBaroque: '安第斯殖民巴洛克',
  spanishBaroque: '西班牙巴洛克',
  frenchBaroqueAbsolutism: '法国绝对主义巴洛克',
  newSpainEnconchado: '新西班牙螺钿画',
  newSpainGuadalupe: '新西班牙瓜达卢佩圣母艺术',
  dutchBaroqueStillLife: '荷兰巴洛克静物画',
  newSpainCasta: '新西班牙种姓画',
  britishRococoSatire: '英国洛可可讽刺画',
});

function assertExactKeys(value, expected, label) {
  assert.deepEqual(Object.keys(value), expected, `${label} exact keyset`);
}

function assertUnique(values, label) {
  assert.equal(new Set(values).size, values.length, `duplicate ${label}`);
}

export function projectAndFreezeU3Canonical(canonical) {
  assertExactKeys(canonical, ['artworks', 'credits'], 'U3 canonical');
  assert.equal(canonical.artworks.length, 51, 'U3 canonical work count');
  const projected = canonical.artworks.map((work, workIndex) => {
    const apNumber = 48 + workIndex;
    assert.equal(work.apNumber, apNumber, `U3 canonical AP ${apNumber} sequence`);
    const rawCredits = canonical.credits[work.id];
    const credits = Array.isArray(rawCredits) ? rawCredits : [rawCredits];
    assert.equal(
      credits.length,
      work.images.length,
      `U3 canonical AP ${apNumber} credit alignment`,
    );
    const cultureLabelZh = U3_CULTURE_LABELS_ZH[work.culture];
    assert.ok(cultureLabelZh, `U3 canonical AP ${apNumber} culture label`);
    const metadata = Object.freeze({
      titleZh: work.titleZh,
      siteName: work.siteName,
      provenanceQualifier: work.provenanceQualifier ?? null,
      culture: work.culture,
      cultureLabelZh,
      period: work.period,
      date: work.date,
      artistCulture: work.artistCulture,
      medium: work.medium,
      workType: work.workType,
    });
    const images = work.images.map((image, imageIndex) => {
      const canonicalCredit = credits[imageIndex];
      const credit = Object.freeze({
        creatorOrInstitution: canonicalCredit.creatorOrInstitution,
        licenseName: canonicalCredit.licenseName,
        licenseUrl: canonicalCredit.licenseUrl,
        imageSourceName: image.imageSourceName,
        imageSourceUrl: image.imageSourceUrl,
      });
      return Object.freeze({
        id: image.id,
        label: image.label,
        imageUrl: image.imageUrl,
        imageAlt: image.imageAlt,
        imageSourceName: image.imageSourceName,
        imageSourceUrl: image.imageSourceUrl,
        credit,
      });
    });
    return Object.freeze({
      id: work.id,
      apNumber: work.apNumber,
      titleEn: work.titleEn,
      titleZh: work.titleZh,
      unit: work.unit,
      region: work.region,
      siteName: work.siteName,
      metadata,
      images: Object.freeze(images),
    });
  });
  assert.equal(
    projected.reduce((total, work) => total + work.images.length, 0),
    103,
    'U3 canonical rendered credit count',
  );
  return Object.freeze(projected);
}

function projectU3CanonicalBrowser(expectedWorks) {
  return Object.freeze(expectedWorks.map((work) => Object.freeze({
    id: work.id,
    apNumber: work.apNumber,
    titleEn: work.titleEn,
    titleZh: work.titleZh,
    unit: work.unit,
    region: work.region,
    siteName: work.siteName,
    provenanceQualifier: work.metadata.provenanceQualifier,
    images: Object.freeze(work.images.map((image) => Object.freeze({
      id: image.id,
      label: image.label,
      imageUrl: image.imageUrl,
      imageAlt: image.imageAlt,
      imageSourceUrl: image.imageSourceUrl,
    }))),
  })));
}

function assertExactCanonicalValue(actual, expected, path) {
  if (Array.isArray(expected)) {
    const sharedLength = Math.min(actual.length, expected.length);
    for (let index = 0; index < sharedLength; index += 1) {
      assertExactCanonicalValue(actual[index], expected[index], `${path}[${index}]`);
    }
    if (actual.length > expected.length) {
      assert.fail(`${path}[${expected.length}] unexpected canonical view`);
    }
    if (actual.length < expected.length) {
      assert.fail(`${path}[${actual.length}] missing canonical view`);
    }
    return;
  }
  if (expected && typeof expected === 'object') {
    for (const key of Object.keys(expected)) {
      assertExactCanonicalValue(actual[key], expected[key], `${path}.${key}`);
    }
    return;
  }
  assert.equal(actual, expected, path);
}

const U3_CANONICAL = parseVerifierJson(
  await readFile(join(PROJECT_ROOT, 'tests', 'fixtures', 'u3-canonical.json'), 'utf8'),
  'U3 canonical fixture',
);
const U3_EXPECTED_WORKS = projectAndFreezeU3Canonical(U3_CANONICAL);
const U3_EXPECTED_BROWSER = projectU3CanonicalBrowser(U3_EXPECTED_WORKS);

export function calculateExpectedU3FitTransform(points, bounds = null) {
  assert.ok(points.length > 0, 'U3 expected fit requires canonical points');
  const left = Math.min(...points.map(({ x }) => x));
  const right = Math.max(...points.map(({ x }) => x));
  const top = Math.min(...points.map(({ y }) => y));
  const bottom = Math.max(...points.map(({ y }) => y));
  const screenScale = bounds ? Math.min(bounds.width / 1600, bounds.height / 800) : 0;
  const padding = screenScale > 0 ? Math.min(80, bounds.width * .16) / screenScale : 160;
  const scale = Math.min(3, Math.max(1, Math.min(
    1600 / Math.max(1, right - left + padding * 2),
    800 / Math.max(1, bottom - top + padding * 2),
  )));
  const unclamped = {
    x: 800 - (left + right) / 2 * scale,
    y: 400 - (top + bottom) / 2 * scale,
    scale,
  };
  return Object.freeze({
    x: Math.min(0, Math.max(1600 * (1 - scale), unclamped.x)),
    y: Math.min(0, Math.max(800 * (1 - scale), unclamped.y)),
    scale,
  });
}

export function calculateExpectedU3ZoomTransform(transform, nextScale, point) {
  const scale = Math.min(3, Math.max(1, nextScale));
  const contentX = (point.x - transform.x) / transform.scale;
  const contentY = (point.y - transform.y) / transform.scale;
  const unclamped = {
    x: point.x - contentX * scale,
    y: point.y - contentY * scale,
  };
  return Object.freeze({
    x: Math.min(0, Math.max(1600 * (1 - scale), unclamped.x)),
    y: Math.min(0, Math.max(800 * (1 - scale), unclamped.y)),
    scale,
  });
}

function compactCanonicalApNumbers(apNumbers) {
  const ranges = [];
  let start = apNumbers[0];
  let end = apNumbers[0];
  for (const apNumber of apNumbers.slice(1)) {
    if (apNumber === end + 1) {
      end = apNumber;
    } else {
      ranges.push(start === end ? String(start) : `${start}–${end}`);
      start = apNumber;
      end = apNumber;
    }
  }
  ranges.push(start === end ? String(start) : `${start}–${end}`);
  return ranges.join(', ');
}

const U3_REGION_BRANCHES = Object.freeze([
  ['italyVatican', 'Italy & Vatican · 18 pieces'],
  ['france', 'France · 5 pieces'],
  ['iberianPeninsula', 'Iberian Peninsula · 5 pieces'],
  ['britishIsles', 'British Isles · 3 pieces'],
  ['lowCountries', 'Low Countries · 7 pieces'],
  ['centralEurope', 'Central Europe · 4 pieces'],
  ['easternMediterranean', 'Eastern Mediterranean · 4 pieces'],
  ['colonialAmericas', 'Colonial Americas · 5 pieces'],
].map(([id, label]) => {
  const canonicalWorks = U3_CANONICAL.artworks.filter(({ region }) => region === id);
  const siteWorks = new Map();
  for (const work of canonicalWorks) {
    if (!siteWorks.has(work.siteName)) siteWorks.set(work.siteName, []);
    siteWorks.get(work.siteName).push(work);
  }
  const siteNames = [...siteWorks.keys()];
  const siteLabels = [...siteWorks]
    .map(([siteName, works]) => (
      `${siteName} · AP ${compactCanonicalApNumbers(works.map(({ apNumber }) => apNumber))}`
      + ` · ${works.length} ${works.length === 1 ? 'piece' : 'pieces'}`
    ))
    .sort();
  return Object.freeze({
    id,
    label,
    siteNames: Object.freeze(siteNames),
    siteLabels: Object.freeze(siteLabels),
  });
}));

export function validateAndFreezeU3Works(works) {
  assert.ok(Array.isArray(works), 'U3 browser fixture must be an array');
  assert.equal(works.length, 51, 'U3 browser fixture must contain exactly 51 U3 works');
  const workIds = [];
  const viewIds = [];
  const imageUrls = [];
  const imageAlts = [];
  const sourceUrls = [];
  let viewCount = 0;

  works.forEach((work, workIndex) => {
    const expectedApNumber = 48 + workIndex;
    assertExactKeys(work, U3_WORK_KEYS, `AP ${expectedApNumber}`);
    assert.equal(work.apNumber, expectedApNumber, `AP ${expectedApNumber} sequence`);
    assert.equal(work.unit, 3, `AP ${expectedApNumber} Unit`);
    for (const key of ['id', 'titleEn', 'titleZh', 'region', 'siteName']) {
      assert.equal(typeof work[key], 'string', `AP ${expectedApNumber} ${key} type`);
      assert.ok(work[key].trim(), `AP ${expectedApNumber} ${key} value`);
    }
    assert.ok(
      work.provenanceQualifier === null
        || (
          typeof work.provenanceQualifier === 'string'
          && work.provenanceQualifier.trim()
        ),
      `AP ${expectedApNumber} provenanceQualifier value`,
    );
    assert.ok(Array.isArray(work.images), `AP ${expectedApNumber} images`);
    assert.ok(work.images.length > 0, `AP ${expectedApNumber} must retain required views`);
    workIds.push(work.id);
    work.images.forEach((image, imageIndex) => {
      assertExactKeys(
        image,
        U3_IMAGE_KEYS,
        `AP ${expectedApNumber} view ${imageIndex + 1}`,
      );
      for (const key of U3_IMAGE_KEYS) {
        assert.equal(
          typeof image[key],
          'string',
          `AP ${expectedApNumber} view ${imageIndex + 1} ${key} type`,
        );
        assert.ok(
          image[key].trim(),
          `AP ${expectedApNumber} view ${imageIndex + 1} ${key} value`,
        );
      }
      assert.match(image.imageUrl, /^https:\/\//, `AP ${expectedApNumber} image URL`);
      assert.match(
        image.imageSourceUrl,
        /^https:\/\//,
        `AP ${expectedApNumber} image source URL`,
      );
      viewIds.push(`${work.id}/${image.id}`);
      imageUrls.push(image.imageUrl);
      imageAlts.push(image.imageAlt);
      sourceUrls.push(image.imageSourceUrl);
      viewCount += 1;
      Object.freeze(image);
    });
    Object.freeze(work.images);
    Object.freeze(work);
  });
  assert.equal(viewCount, 103, 'U3 browser fixture must contain exactly 103 U3 views');
  assertUnique(workIds, 'U3 work id');
  assertUnique(viewIds, 'U3 view id');
  assertUnique(imageUrls, 'U3 image URL');
  assertUnique(imageAlts, 'U3 image alt');
  assertUnique(sourceUrls, 'U3 image source URL');
  works.forEach((work, index) => {
    assertExactCanonicalValue(
      work,
      U3_EXPECTED_BROWSER[index],
      `U3 canonical projection.AP${work.apNumber}`,
    );
  });
  return Object.freeze(works);
}

const U3_WORKS = validateAndFreezeU3Works(parseVerifierJson(
  await readFile(join(PROJECT_ROOT, 'tests', 'fixtures', 'u3-browser.json'), 'utf8'),
  'U3 browser fixture',
));
const U4_WORK_KEYS = Object.freeze([
  'id',
  'apNumber',
  'titleEn',
  'titleZh',
  'unit',
  'region',
  'siteName',
  'provenanceQualifier',
  'images',
]);
const U4_IMAGE_KEYS = Object.freeze([
  'id',
  'label',
  'imageUrl',
  'imageAlt',
  'imageSourceUrl',
]);
export const U4_PRIVATE_MEDIA_KEYS = Object.freeze([
  'ap140-two-fridas::primary',
  'ap143-dream-alameda-central::primary',
  'ap146-marilyn-diptych::primary',
  'ap148-narcissus-garden::primary',
  'ap149-bay::primary',
  'ap150-lipstick-caterpillar-tracks::primary',
  'ap152-house-new-castle-county::exterior',
  'ap152-house-new-castle-county::interior',
]);
export const U5_PRIVATE_MEDIA_KEYS = Object.freeze([
  'ap153-chavin-huantar::relief-sculpture',
  'ap155-yaxchilan::structure-40',
  'ap157-templo-mayor::reconstruction',
  'ap160-maize-cobs::primary',
  'ap163-bandolier-bag::primary',
  'ap164-transformation-mask::closed',
  'ap164-transformation-mask::open',
  'ap165-painted-elk-hide::primary',
  'ap166-black-on-black-vessel::primary',
]);
export const PRIVATE_MEDIA_BUNDLES = Object.freeze([
  Object.freeze({
    unit:4,
    globalName:'AP_ART_HISTORY_PRIVATE_MEDIA_U4',
    scriptPath:'.private-media/u4/overrides.js',
    pathPattern:/^\.private-media\/u4\/[a-z0-9-]+\.(?:jpe?g|png|webp)$/,
    keys:U4_PRIVATE_MEDIA_KEYS,
  }),
  Object.freeze({
    unit:5,
    globalName:'AP_ART_HISTORY_PRIVATE_MEDIA_U5',
    scriptPath:'.private-media/u5/overrides.js',
    pathPattern:/^\.private-media\/u5\/[a-z0-9-]+\.(?:jpe?g|png|webp)$/,
    keys:U5_PRIVATE_MEDIA_KEYS,
  }),
]);
const U4_PRIVATE_SCRIPT_PATH = PRIVATE_MEDIA_BUNDLES[0].scriptPath;
const U5_PRIVATE_SCRIPT_PATH = PRIVATE_MEDIA_BUNDLES[1].scriptPath;
export const U4_REGION_LABELS = Object.freeze([
  'Southern Europe · 4 pieces',
  'France · 20 pieces',
  'British Isles · 3 pieces',
  'Central & Northern Europe · 5 pieces',
  'Russia & Soviet Union · 1 piece',
  'United States · 14 pieces',
  'Mexico & Caribbean · 5 pieces',
  'Pacific · 1 piece',
  'Transatlantic · 1 piece',
]);

function projectU4CanonicalBrowser(canonical) {
  assertExactKeys(canonical, ['artworks', 'credits'], 'U4 canonical');
  assert.equal(canonical.artworks.length, 54, 'U4 canonical work count');
  return canonical.artworks.map((work, index) => {
    assert.equal(work.apNumber, index + 99, `U4 canonical AP ${index + 99} sequence`);
    return Object.freeze({
      id: work.id,
      apNumber: work.apNumber,
      titleEn: work.titleEn,
      titleZh: work.titleZh,
      unit: work.unit,
      region: work.region,
      siteName: work.siteName,
      provenanceQualifier: work.provenanceQualifier ?? null,
      images: Object.freeze(work.images.map((image) => Object.freeze({
        id: image.id,
        label: image.label,
        imageUrl: image.imageUrl,
        imageAlt: image.imageAlt,
        imageSourceUrl: image.imageSourceUrl,
        ...(image.mediaStatus ? { mediaStatus: image.mediaStatus } : {}),
      }))),
    });
  });
}

const U4_CANONICAL = parseVerifierJson(
  await readFile(join(PROJECT_ROOT, 'tests', 'fixtures', 'u4-canonical.json'), 'utf8'),
  'U4 canonical fixture',
);
const U4_EXPECTED_BROWSER = Object.freeze(projectU4CanonicalBrowser(U4_CANONICAL));

export function validateAndFreezeU4Works(works) {
  assert.ok(Array.isArray(works), 'U4 browser fixture must be an array');
  assert.equal(works.length, 54, 'U4 browser fixture must contain exactly 54 U4 works');
  const workIds = [];
  const viewIds = [];
  const publicImageUrls = [];
  const privateKeys = [];
  let viewCount = 0;

  works.forEach((work, workIndex) => {
    const apNumber = workIndex + 99;
    assertExactKeys(work, U4_WORK_KEYS, `AP ${apNumber}`);
    assert.equal(work.apNumber, apNumber, `AP ${apNumber} sequence`);
    assert.equal(work.unit, 4, `AP ${apNumber} Unit`);
    for (const key of ['id', 'titleEn', 'titleZh', 'region', 'siteName']) {
      assert.equal(typeof work[key], 'string', `AP ${apNumber} ${key} type`);
      assert.ok(work[key].trim(), `AP ${apNumber} ${key} value`);
    }
    assert.ok(
      work.provenanceQualifier === null
        || (typeof work.provenanceQualifier === 'string' && work.provenanceQualifier.trim()),
      `AP ${apNumber} provenanceQualifier value`,
    );
    assert.ok(Array.isArray(work.images) && work.images.length > 0, `AP ${apNumber} images`);
    workIds.push(work.id);
    work.images.forEach((image, imageIndex) => {
      const restricted = image.mediaStatus === 'rightsRestricted';
      assertExactKeys(
        image,
        restricted ? [...U4_IMAGE_KEYS, 'mediaStatus'] : U4_IMAGE_KEYS,
        `AP ${apNumber} view ${imageIndex + 1}`,
      );
      for (const key of ['id', 'label', 'imageAlt', 'imageSourceUrl']) {
        assert.equal(typeof image[key], 'string', `AP ${apNumber} view ${imageIndex + 1} ${key}`);
        assert.ok(image[key].trim(), `AP ${apNumber} view ${imageIndex + 1} ${key} value`);
      }
      assert.match(image.imageSourceUrl, /^https:\/\//, `AP ${apNumber} image source URL`);
      const identity = `${work.id}::${image.id}`;
      if (restricted) {
        assert.equal(image.imageUrl, null, `${identity} rightsRestricted requires null image URL`);
        privateKeys.push(identity);
      } else {
        assert.equal(typeof image.imageUrl, 'string', `${identity} public image URL type`);
        assert.match(image.imageUrl, /^https:\/\//, `${identity} public image URL`);
        publicImageUrls.push(image.imageUrl);
      }
      viewIds.push(identity);
      viewCount += 1;
      Object.freeze(image);
    });
    Object.freeze(work.images);
    Object.freeze(work);
  });
  assert.equal(viewCount, 63, 'U4 browser fixture must contain exactly 63 U4 views');
  assert.equal(publicImageUrls.length, 55, 'U4 browser fixture public image count');
  assert.deepEqual(privateKeys, U4_PRIVATE_MEDIA_KEYS, 'U4 exact private media keys');
  assertUnique(workIds, 'U4 work id');
  assertUnique(viewIds, 'U4 view id');
  assertUnique(publicImageUrls, 'U4 public image URL');
  works.forEach((work, index) => {
    assertExactCanonicalValue(
      work,
      U4_EXPECTED_BROWSER[index],
      `U4 canonical projection.AP${work.apNumber}`,
    );
  });
  return Object.freeze(works);
}

const U4_WORKS = validateAndFreezeU4Works(parseVerifierJson(
  await readFile(join(PROJECT_ROOT, 'tests', 'fixtures', 'u4-browser.json'), 'utf8'),
  'U4 browser fixture',
));

const U5_BROWSER_WORK_KEYS = Object.freeze([
  'id',
  'apNumber',
  'unit',
  'region',
  'siteName',
  'traditionGroup',
  'viewIds',
  'images',
]);
export const U5_REGION_LABELS = Object.freeze([
  'Mesoamerica · 3 pieces',
  'Central Andes · 5 pieces',
  'Ancestral Pueblo · 2 pieces',
  'Eastern Woodlands · 2 pieces',
  'Northwest Coast · 1 piece',
  'Plains & Great Basin · 1 piece',
]);
const U5_REGION_NAMES = Object.freeze({
  mesoamerica: 'Mesoamerica',
  centralAndes: 'Central Andes',
  ancestralPueblo: 'Ancestral Pueblo',
  easternWoodlands: 'Eastern Woodlands',
  northwestCoast: 'Northwest Coast',
  plainsGreatBasin: 'Plains & Great Basin',
});
export const U5_MATRIX_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 1440, height: 900, name: 'desktop' }),
  Object.freeze({ width: 390, height: 844, name: 'narrow-touch' }),
]);

const U5_CANONICAL = parseVerifierJson(
  await readFile(join(PROJECT_ROOT, 'tests', 'fixtures', 'u5-canonical.json'), 'utf8'),
  'U5 canonical fixture',
);
const U5_EXPECTED_BROWSER = Object.freeze(U5_CANONICAL.artworks.map((work) => Object.freeze({
  id: work.id,
  apNumber: work.apNumber,
  unit: work.unit,
  region: work.region,
  siteName: work.siteName,
  traditionGroup: work.traditionGroup,
  viewIds: Object.freeze(work.images.map(({ id }) => id)),
  images: Object.freeze(work.images.map(({ id, imageUrl, mediaStatus }) => Object.freeze({
    id, imageUrl, mediaStatus: mediaStatus ?? 'local',
  }))),
})));

export function validateAndFreezeU5Works(works) {
  assert.ok(Array.isArray(works), 'U5 browser fixture must be an array');
  assert.equal(works.length, 14, 'U5 browser fixture must contain exactly 14 U5 works');
  const workIds = [];
  const viewKeys = [];
  let viewCount = 0;
  works.forEach((work, workIndex) => {
    const apNumber = workIndex + 153;
    assertExactKeys(work, U5_BROWSER_WORK_KEYS, `AP ${apNumber}`);
    assert.equal(work.apNumber, apNumber, `AP ${apNumber} sequence`);
    assert.equal(work.unit, 5, `AP ${apNumber} Unit`);
    for (const key of ['id', 'region', 'siteName', 'traditionGroup']) {
      assert.equal(typeof work[key], 'string', `AP ${apNumber} ${key} type`);
      assert.ok(work[key].trim(), `AP ${apNumber} ${key} value`);
    }
    assert.ok(Array.isArray(work.viewIds) && work.viewIds.length > 0, `AP ${apNumber} viewIds`);
    assert.ok(Array.isArray(work.images), `AP ${apNumber} images must be an array`);
    work.images.forEach((image, index) => {
      assertExactKeys(image, ['id', 'imageUrl', 'mediaStatus'],
        `AP ${apNumber} image ${index}`);
    });
    workIds.push(work.id);
    for (const viewId of work.viewIds) {
      assert.equal(typeof viewId, 'string', `AP ${apNumber} view id type`);
      assert.ok(viewId.trim(), `AP ${apNumber} view id value`);
      viewKeys.push(`${work.id}::${viewId}`);
      viewCount += 1;
    }
    assertExactCanonicalValue(
      work,
      U5_EXPECTED_BROWSER[workIndex],
      `U5 canonical projection.AP${apNumber}`,
    );
    Object.freeze(work.viewIds);
    work.images.forEach(Object.freeze);
    Object.freeze(work.images);
    Object.freeze(work);
  });
  assert.equal(viewCount, 27, 'U5 browser fixture must contain exactly 27 U5 views');
  assertUnique(workIds, 'U5 work id');
  assertUnique(viewKeys, 'U5 view key');
  return Object.freeze(works);
}

const U5_WORKS = validateAndFreezeU5Works(parseVerifierJson(
  await readFile(join(PROJECT_ROOT, 'tests', 'fixtures', 'u5-browser.json'), 'utf8'),
  'U5 browser fixture',
));
const U5_RENDER_WORKS = Object.freeze(U5_WORKS.map((fixtureWork, index) => {
  const canonicalWork = U5_CANONICAL.artworks[index];
  assert.equal(canonicalWork.id, fixtureWork.id, `U5 render AP ${fixtureWork.apNumber} id`);
  return Object.freeze({
    ...canonicalWork,
    images: Object.freeze(canonicalWork.images.map((image) => Object.freeze({ ...image }))),
    comparisonIds: Object.freeze([...canonicalWork.comparisonIds]),
  });
}));

export function assertU5RegionTraversalCoverage(actualLabels, label) {
  const length = Math.max(actualLabels.length, U5_REGION_LABELS.length);
  for (let index = 0; index < length; index += 1) {
    assert.equal(
      actualLabels[index],
      U5_REGION_LABELS[index],
      `${label} expected ${U5_REGION_LABELS[index] || 'no extra branch'} at index ${index}`,
    );
  }
}

export function assertU5HierarchySelection(regionLabel, siteLabel, work) {
  assert.equal(
    regionLabel,
    `${U5_REGION_NAMES[work.region]} · 1 piece`,
    `AP ${work.apNumber} region branch`,
  );
  assert.equal(
    siteLabel,
    `${work.siteName} · AP ${work.apNumber} · 1 piece`,
    `AP ${work.apNumber} site branch`,
  );
}

export function assertNoHorizontalOverflow(horizontalOverflow, label) {
  assert.equal(horizontalOverflow, 0, `${label} horizontal overflow`);
}

function u5PrivatePath(identity) {
  return `.private-media/u5/${identity.replace('::', '-')}.jpg`;
}

export function createU5PrivateOverrides() {
  return Object.fromEntries(U5_PRIVATE_MEDIA_KEYS.map((identity) => [identity, {
    filePath: u5PrivatePath(identity),
    creatorOrInstitution: 'Browser verifier private study copy',
    rightsNote: 'Private browser-verification copy',
    rightsUrl: 'https://example.org/private-study-rights',
  }]));
}

export function validateU5PrivateOverrides(overrides) {
  assert.ok(overrides && typeof overrides === 'object' && !Array.isArray(overrides), 'U5 private overrides object');
  assert.deepEqual(Object.keys(overrides), U5_PRIVATE_MEDIA_KEYS, 'U5 private override exact keys');
  for (const identity of U5_PRIVATE_MEDIA_KEYS) {
    const override = overrides[identity];
    assertExactKeys(
      override,
      ['filePath', 'creatorOrInstitution', 'rightsNote', 'rightsUrl'],
      `U5 private override ${identity}`,
    );
    assert.match(
      override.filePath,
      /^\.private-media\/u5\/[a-z0-9-]+\.(?:jpe?g|png|webp)$/,
      `U5 private path ${identity} rejects cross-unit paths`,
    );
    assert.match(override.rightsUrl, /^https:\/\//, `U5 private rights URL ${identity}`);
  }
  return overrides;
}

export function assertNoU5RestrictedPublicRequests(requests, label) {
  for (const request of requests) {
    const requestText = String(request);
    let decodedRequest = requestText;
    try {
      decodedRequest = decodeURIComponent(requestText);
    } catch {
      // A malformed URL is still checked in its original form.
    }
    assert.equal(
      requestText.includes('.private-media/') || decodedRequest.includes('.private-media/'),
      false,
      `${label} requested private-media asset ${requestText}`,
    );
  }
}

export function assertU5HorizontalOverflowHistory(history, label) {
  assert.ok(Array.isArray(history) && history.length > 0, `${label} overflow checkpoints`);
  for (const entry of history) {
    assert.equal(
      entry.horizontalOverflow,
      0,
      `${label} ${entry.checkpoint} horizontal overflow: ${entry.horizontalOverflow}px`,
    );
  }
  return history;
}

async function recordU5HorizontalOverflow(frame, history, checkpoint) {
  const horizontalOverflow = await frame.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
  history.push({ checkpoint, horizontalOverflow });
  return horizontalOverflow;
}

export function assertU5RenderedMatrixCoverage(matrix) {
  assert.equal(matrix.length, U5_MATRIX_VIEWPORTS.length, 'U5 rendered matrix viewport count');
  matrix.forEach((entry, viewportIndex) => {
    const expectedViewport = U5_MATRIX_VIEWPORTS[viewportIndex];
    assert.deepEqual(entry.viewport, expectedViewport, `U5 matrix viewport ${viewportIndex}`);
    for (const [access, privateMode] of [['public', false], ['private', true]]) {
      for (const mode of ['standalone', 'embedded']) {
        const label = `${expectedViewport.name} ${access} ${mode}`;
        const leaf = entry[access]?.[mode];
        assert.ok(leaf, `${label} matrix leaf`);
        assert.deepEqual(leaf.viewport, expectedViewport, `${label} viewport`);
        assert.equal(leaf.mode, mode, `${label} mode`);
        assert.equal(leaf.privateMode, privateMode, `${label} private mode`);
        assertU5RegionTraversalCoverage(leaf.regions, `${label} regions`);
        assertNoHorizontalOverflow(leaf.horizontalOverflow, label);
        assert.equal(leaf.works.length, 14, `${label} must traverse 14 works`);
        assert.deepEqual(
          leaf.works.map(({ apNumber }) => apNumber),
          U5_WORKS.map(({ apNumber }) => apNumber),
          `${label} AP sequence`,
        );
        assert.equal(
          leaf.works.reduce((total, work) => total + work.views, 0),
          27,
          `${label} must traverse 27 views`,
        );
        for (const work of leaf.works) {
          assert.equal(work.mode, mode, `${label} AP ${work.apNumber} mode`);
          assert.equal(work.privateMode, privateMode, `${label} AP ${work.apNumber} private mode`);
          assert.equal(work.tabs, 4, `${label} AP ${work.apNumber} study tabs`);
          assert.ok(
            work.overflowCheckpoints >= work.views + 8,
            `${label} AP ${work.apNumber} overflow checkpoints`,
          );
          assert.equal(
            work.comparisonFollowed,
            true,
            `${label} AP ${work.apNumber} comparison navigation`,
          );
        }
        assert.equal(
          leaf.restrictedPrivateViews,
          privateMode ? U5_PRIVATE_MEDIA_KEYS.length : 0,
          `${label} restricted private view count`,
        );
        assert.equal(leaf.restrictedPublicRequests, 0, `${label} restricted public requests`);
      }
    }
  });
  return matrix;
}

export function assertU4RegionTraversalCoverage(actualLabels, label) {
  assert.deepEqual(actualLabels, U4_REGION_LABELS, `${label} exact U4 region branches`);
}

export function assertU4MarkerLayoutPreserved(preserved, label) {
  assert.equal(preserved, true, `${label} marker layout rollback`);
}
const IMAGE_FIXTURE = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#d8c5a7"/><circle cx="320" cy="240" r="120" fill="#8f553f"/></svg>',
);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

async function isReadable(path) {
  if (!path) return false;
  try {
    await access(path, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function newestDirectory(path) {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
  } catch {
    return null;
  }
}

export async function discoverPlaywright() {
  const configured = process.env.ART_HISTORY_PLAYWRIGHT_PATH;
  const cacheRoot = join(homedir(), 'Library', 'Caches', 'ms-playwright-go');
  const cacheVersion = await newestDirectory(cacheRoot);
  const candidates = [
    configured,
    join(PROJECT_ROOT, 'node_modules', 'playwright', 'index.mjs'),
    join(PROJECT_ROOT, 'node_modules', 'playwright', 'index.js'),
    join(PROJECT_ROOT, 'node_modules', 'playwright-core', 'index.mjs'),
    join(PROJECT_ROOT, 'node_modules', 'playwright-core', 'index.js'),
    cacheVersion && join(cacheRoot, cacheVersion, 'package', 'index.mjs'),
    cacheVersion && join(cacheRoot, cacheVersion, 'package', 'index.js'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!await isReadable(candidate)) continue;
    try {
      return await import(pathToFileURL(candidate).href);
    } catch {
      // Try the next discovered installation and report one actionable error below.
    }
  }
  throw new Error(
    'No supported Playwright runtime found. Install playwright locally or set ART_HISTORY_PLAYWRIGHT_PATH.',
  );
}

export async function discoverBrowser(chromium) {
  const configured = process.env.ART_HISTORY_BROWSER_PATH;
  const candidates = [
    configured,
    chromium?.executablePath?.(),
    process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : null,
    process.platform === 'darwin'
      ? '/Applications/Chromium.app/Contents/MacOS/Chromium'
      : null,
    process.platform === 'linux' ? '/usr/bin/google-chrome' : null,
    process.platform === 'linux' ? '/usr/bin/chromium' : null,
    process.platform === 'win32'
      ? join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
      : null,
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (await isReadable(candidate)) return candidate;
  }
  throw new Error(
    'No supported Chromium or Chrome executable found. Install Chrome/Chromium or set ART_HISTORY_BROWSER_PATH.',
  );
}

export async function startStaticServer(root = PROJECT_ROOT) {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      if (requestUrl.pathname === '/favicon.ico') {
        response.writeHead(204);
        response.end();
        return;
      }
      const decoded = decodeURIComponent(requestUrl.pathname);
      const requested = decoded === '/' ? '/index.html' : decoded;
      const path = normalize(join(root, requested));
      if (relative(root, path).startsWith('..')) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }
      const info = await stat(path);
      const file = info.isDirectory() ? join(path, 'index.html') : path;
      const body = await readFile(file);
      response.writeHead(200, {
        'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    ))),
  };
}

function installErrorCollection(page, label) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (
      message.type() === 'error'
      || message.type() === 'warning'
    ) {
      errors.push(`${label} console ${message.type()}: ${message.text()}`);
    }
  });
  return errors;
}

export function assertNoCollectedIssues(issues, label) {
  assert.deepEqual(issues, [], `${label}: ${issues.join('\n')}`);
}

export function assertDialogFocusRestored(restored, label) {
  assert.equal(restored, true, `${label} dialog focus restoration`);
}

export function assertU3ViewMatches(actual, expected, label) {
  assert.equal(actual.id, expected.id, `${label} view id`);
  assert.equal(actual.label, expected.label, `${label} view label`);
  assert.equal(actual.imageUrl, expected.imageUrl, `${label} image URL`);
  assert.equal(actual.imageAlt, expected.imageAlt, `${label} image alt`);
  assert.equal(actual.imageSourceUrl, expected.imageSourceUrl, `${label} image source URL`);
}

export function assertU3MetadataMatches(actual, expected, label) {
  for (const field of [
    'titleZh',
    'siteName',
    'provenanceQualifier',
    'cultureLabelZh',
    'period',
    'date',
    'artistCulture',
    'medium',
    'workType',
  ]) {
    assert.equal(actual[field], expected[field], `${label} ${field}`);
  }
}

export function assertU3CreditMatches(actual, expected, label) {
  for (const field of [
    'creatorOrInstitution',
    'licenseName',
    'licenseUrl',
    'imageSourceName',
    'imageSourceUrl',
  ]) {
    assert.equal(actual[field], expected[field], `${label} ${field}`);
  }
}

export function assertU3RegionTraversalCoverage(actualLabels, label) {
  const expectedLabels = U3_REGION_BRANCHES.map((region) => region.label);
  const length = Math.max(actualLabels.length, expectedLabels.length);
  for (let index = 0; index < length; index += 1) {
    assert.equal(
      actualLabels[index],
      expectedLabels[index],
      `${label} expected ${expectedLabels[index] || 'no extra branch'} at index ${index}`,
    );
  }
}

export function assertU3SiteTraversalCoverage(actualLabels, expectedLabels, label) {
  assert.deepEqual(
    [...actualLabels].sort(),
    [...expectedLabels].sort(),
    `${label} exact canonical site markers`,
  );
}

export function assertU3TransformMatches(actual, expected, label) {
  for (const field of ['x', 'y', 'scale']) {
    assert.ok(
      Number.isFinite(actual[field])
        && Math.abs(actual[field] - expected[field]) <= 1e-4,
      `${label} ${field}: expected ${expected[field]}, received ${actual[field]}`,
    );
  }
}

export function assertExactImageRequests(imageRequests, work, checkpoint) {
  assert.equal(
    imageRequests.size,
    work.images.length,
    `${checkpoint} AP ${work.apNumber} expected image URL count`,
  );
  for (const image of work.images) {
    assert.equal(
      imageRequests.get(image.imageUrl),
      1,
      `${checkpoint} AP ${work.apNumber} ${image.id} request count`,
    );
  }
}

export function snapshotRequestCounts(requests) {
  assert.ok(requests instanceof Map, 'request accounting source must be a Map');
  return new Map(requests);
}

// Browser requests are absolute, while canonical U5 media paths are repository-local.
// Observe real local file traffic without routing or replacing its image bytes.
export function recordU5LocalImageRequest(requests, requestUrl, baseUrl) {
  const url = new URL(requestUrl);
  if (url.origin !== new URL(baseUrl).origin
    || !/^\/assets\/art-history\/u5\/ap\d{3}-[a-z0-9-]+\.webp$/.test(url.pathname)) return;
  const path = url.pathname.slice(1);
  requests.set(path, (requests.get(path) || 0) + 1);
}

export function requestCountsSince(requests, boundary) {
  assert.ok(requests instanceof Map, 'request accounting source must be a Map');
  assert.ok(boundary instanceof Map, 'request accounting boundary must be a Map');
  const counts = new Map();
  for (const [url, previousCount] of boundary) {
    assert.ok(
      (requests.get(url) || 0) >= previousCount,
      `request accounting count for ${url} moved backwards`,
    );
  }
  for (const [url, currentCount] of requests) {
    const count = currentCount - (boundary.get(url) || 0);
    assert.ok(count >= 0, `request accounting count for ${url} moved backwards`);
    if (count > 0) counts.set(url, count);
  }
  return counts;
}

export function mergeRequestCounts(target, requests) {
  assert.ok(target instanceof Map, 'request aggregate must be a Map');
  assert.ok(requests instanceof Map, 'request window must be a Map');
  for (const [url, count] of requests) {
    assert.ok(Number.isInteger(count) && count > 0, `request count for ${url} must be positive`);
    target.set(url, (target.get(url) || 0) + count);
  }
  return target;
}

export function createImageRequestObserver(imageRequests) {
  const observe = (url) => {
    imageRequests.set(url, (imageRequests.get(url) || 0) + 1);
  };
  return {
    observe,
    beginExactReload(url) {
      return {
        url,
        countBeforeReload: imageRequests.get(url) || 0,
        attempted: true,
      };
    },
    completeExactReload(url, attempt) {
      assert.equal(attempt?.attempted, true, `${url} exact reload was not attempted`);
      assert.equal(attempt?.url, url, `${url} exact reload attempt URL`);
      const routeObserved = (imageRequests.get(url) || 0) > attempt.countBeforeReload;
      if (!routeObserved) observe(url);
      return {
        attempted: true,
        routeObserved,
        fallbackObservationAdded: !routeObserved,
      };
    },
  };
}

async function mockRemoteImages(page, onImageRequest = () => {}) {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async (route) => {
    if (route.request().resourceType() === 'image') {
      onImageRequest(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: IMAGE_FIXTURE,
      });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });
}

async function waitForArt(frame) {
  await frame.locator('#markerLayer .site-marker').first().waitFor();
  await frame.locator('#unitFilter').waitFor();
}

async function waitForPostTransformRender(frame) {
  await frame.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

export async function waitForVerifierImage(
  image,
  label,
  timeoutMs = VERIFIER_IMAGE_TIMEOUT_MS,
) {
  const deadline = Date.now() + timeoutMs;
  try {
    await image.waitFor({ state: 'attached', timeout: timeoutMs });
  } catch (error) {
    throw new Error(
      `${label} image element was not attached within ${timeoutMs} ms`,
      { cause: error },
    );
  }
  const remainingTimeoutMs = Math.max(0, deadline - Date.now());
  if (!remainingTimeoutMs) {
    throw new Error(`${label} image timed out after ${timeoutMs} ms`);
  }
  await image.evaluate((element, options) => {
    const {
      imageLabel,
      imageTimeoutMs,
      reportedTimeoutMs,
    } = options;
    const failure = (reason) => new Error(`${imageLabel} image ${reason}`);
    if (element.complete) {
      if (element.naturalWidth > 0) return;
      throw failure('already failed (complete with naturalWidth 0)');
    }
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const cleanup = () => {
        element.removeEventListener('load', onLoad);
        element.removeEventListener('error', onError);
        clearTimeout(timer);
      };
      const settle = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else resolve();
      };
      const onLoad = () => {
        settle(element.naturalWidth > 0
          ? null
          : failure('loaded without a natural width'));
      };
      const onError = () => settle(failure('emitted an error event'));
      element.addEventListener('load', onLoad, { once: true });
      element.addEventListener('error', onError, { once: true });
      timer = setTimeout(
        () => settle(failure(`timed out after ${reportedTimeoutMs} ms`)),
        imageTimeoutMs,
      );
      if (element.complete) onLoad();
    });
  }, {
    imageLabel: label,
    imageTimeoutMs: remainingTimeoutMs,
    reportedTimeoutMs: timeoutMs,
  });
}

async function geometry(frame) {
  return frame.evaluate(() => {
    const workspace = document.querySelector('.art-workspace').getBoundingClientRect();
    const map = document.querySelector('.map-panel').getBoundingClientRect();
    const detail = document.querySelector('.detail-panel').getBoundingClientRect();
    const toolbar = document.querySelector('.filter-toolbar').getBoundingClientRect();
    const bodyStyle = getComputedStyle(document.body);
    return {
      innerWidth,
      innerHeight,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      pageScroll: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      bodyOverflowY: bodyStyle.overflowY,
      workspace: { width: workspace.width, height: workspace.height },
      toolbar: { top: toolbar.top, bottom: toolbar.bottom, height: toolbar.height },
      map: { x: map.x, y: map.y, width: map.width, height: map.height },
      detail: { x: detail.x, y: detail.y, width: detail.width, height: detail.height },
      contentBottom: Math.max(toolbar.bottom, map.bottom, detail.bottom),
      scrollHeight: document.documentElement.scrollHeight,
      stacked: detail.y >= map.y + map.height - 1,
      detailScroll: document.querySelector('.detail-panel').scrollHeight
        - document.querySelector('.detail-panel').clientHeight,
      horizontalOverflowElements: [...document.querySelectorAll('body *')]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}`
              + `${[...element.classList].map((name) => `.${name}`).join('')}`,
            left: rect.left,
            right: rect.right,
            width: rect.width,
          };
        })
        .filter(({ left, right }) => left < -1 || right > innerWidth + 1)
        .slice(0, 12),
    };
  });
}

function assertReachability(metrics, mode, viewport) {
  const fitsFrame = metrics.contentBottom <= metrics.innerHeight + 1;
  const childCanScroll = metrics.pageScroll > 0 && (
    mode === 'standalone'
    || ['auto', 'scroll'].includes(metrics.bodyOverflowY)
  );
  assert.ok(
    fitsFrame || childCanScroll,
    `${mode} ${viewport.width}x${viewport.height} content bottom ${metrics.contentBottom}`
      + ` is clipped by ${metrics.innerHeight}px frame with ${metrics.bodyOverflowY} overflow`,
  );
  if (metrics.bodyOverflowY === 'hidden') {
    assert.ok(
      fitsFrame,
      `${mode} ${viewport.width}x${viewport.height} hidden child clips content`,
    );
  }
  if (
    mode === 'embedded'
    && metrics.bodyOverflowY === 'hidden'
    && metrics.stacked
    && metrics.innerWidth <= 520
  ) {
    assert.ok(
      metrics.detail.height >= 220,
      `${mode} ${viewport.width}x${viewport.height} detail height ${metrics.detail.height}`,
    );
  }
}

async function assertCommonLayout(frame, mode, viewport) {
  const metrics = await geometry(frame);
  assert.ok(
    metrics.horizontalOverflow <= 1,
    `${mode} ${viewport.width} has ${metrics.horizontalOverflow}px horizontal overflow: `
      + JSON.stringify(metrics.horizontalOverflowElements),
  );
  assert.equal(
    await frame.locator('.page-header').isVisible(),
    mode === 'standalone',
    `${mode} header visibility`,
  );
  const expectedStack = metrics.innerWidth <= 664;
  assert.equal(metrics.stacked, expectedStack, `${mode} ${viewport.width} stack mode`);
  if (!expectedStack) {
    assert.ok(metrics.map.width >= 348, `${mode} ${viewport.width} map width ${metrics.map.width}`);
    assert.ok(metrics.detail.width >= 273, `${mode} ${viewport.width} detail width ${metrics.detail.width}`);
  }
  const controls = await frame.locator('.map-controls button').evaluateAll((buttons) => (
    buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    })
  ));
  assert.ok(
    controls.every(({ width, height }) => width >= 30 && height >= 30),
    `${mode} ${viewport.width} control sizes ${JSON.stringify(controls)}`,
  );
  assertReachability(metrics, mode, viewport);
  return metrics;
}

async function assertKeyboardAndFilters(page, frame) {
  const unitFilter = frame.locator('#unitFilter');
  await frame.locator('body').click({ position: { x: 2, y: 2 } });
  await frame.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('Tab');
  assert.equal(await frame.evaluate(() => document.activeElement?.id), 'unitFilter');
  const focusStyle = await unitFilter.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth) };
  });
  assert.notEqual(focusStyle.outlineStyle, 'none');
  assert.ok(focusStyle.outlineWidth >= 2);

  await unitFilter.selectOption('1');
  await waitForPostTransformRender(frame);
  assert.equal(await unitFilter.inputValue(), '1');
  assert.equal(await frame.evaluate(() => document.activeElement?.id), 'unitFilter');
  assert.match(await frame.locator('.result-count').textContent(), /\b11\b/);
  const cultureFilters = frame.locator('#cultureFilters');
  assert.equal(await cultureFilters.isHidden(), true);
  assert.equal(await cultureFilters.locator('[data-culture]').count(), 0);
  const u1RegionLabels = await frame
    .locator('.site-marker[data-group-kind="region"]')
    .evaluateAll((markers) => markers.map((marker) => marker.getAttribute('aria-label')).sort());
  assert.deepEqual(u1RegionLabels, [
    'Africa · 2 pieces',
    'Americas · 2 pieces',
    'East Asia · 1 piece',
    'Europe · 2 pieces',
    'Middle East · 2 pieces',
    'Oceania · 2 pieces',
  ]);

  await unitFilter.selectOption('2');
  await waitForPostTransformRender(frame);
  assert.equal(await unitFilter.inputValue(), '2');
  assert.equal(await frame.evaluate(() => document.activeElement?.id), 'unitFilter');
  assert.match(await frame.locator('.result-count').textContent(), /36/);
  const cultures = frame.locator('#cultureFilters [data-culture]');
  assert.equal(await cultures.count(), 6);
  const expected = new Map([
    ['all', 36],
    ['ancientNearEast', 6],
    ['egypt', 9],
    ['greece', 10],
    ['etruscan', 3],
    ['rome', 8],
  ]);
  for (const [culture, count] of expected) {
    const button = frame.locator(`[data-culture="${culture}"]`);
    if (culture === 'ancientNearEast') {
      await frame.locator('[data-culture="all"]').focus();
      await page.keyboard.press('Tab');
      assert.equal(
        await frame.evaluate(() => document.activeElement?.dataset?.culture),
        'ancientNearEast',
      );
      const semantics = await button.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          tagName: element.tagName,
          tabIndex: element.tabIndex,
          ariaPressed: element.getAttribute('aria-pressed'),
          outlineStyle: style.outlineStyle,
          outlineWidth: parseFloat(style.outlineWidth),
        };
      });
      assert.equal(semantics.tagName, 'BUTTON');
      assert.equal(semantics.tabIndex, 0);
      assert.equal(semantics.ariaPressed, 'false');
      assert.notEqual(semantics.outlineStyle, 'none');
      assert.ok(semantics.outlineWidth >= 2);
      await page.keyboard.press('Space');
    } else {
      await button.click();
    }
    assert.match(await frame.locator('.result-count').textContent(), new RegExp(`\\b${count}\\b`));
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    assert.equal(await frame.evaluate(() => document.activeElement?.dataset?.culture), culture);
  }
  await frame.locator('[data-culture="all"]').click();

  await unitFilter.focus();
  await unitFilter.selectOption('3');
  await waitForPostTransformRender(frame);
  assert.equal(await unitFilter.inputValue(), '3');
  assert.equal(await frame.evaluate(() => document.activeElement?.id), 'unitFilter');
  assert.match(await frame.locator('.result-count').textContent(), /\b51\b/);
  const traditions = frame.locator('#cultureFilters [data-culture]');
  assert.equal(await traditions.count(), 5);
  const expectedTraditions = new Map([
    ['all', 51],
    ['lateAntiqueByzantine', 5],
    ['medievalIslamic', 14],
    ['renaissanceMannerism', 16],
    ['baroqueColonial', 16],
  ]);
  for (const [tradition, count] of expectedTraditions) {
    const button = frame.locator(`[data-culture="${tradition}"]`);
    await button.click();
    assert.match(await frame.locator('.result-count').textContent(), new RegExp(`\\b${count}\\b`));
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
  }
  await frame.locator('[data-culture="all"]').click();
  const u3RegionLabels = await frame
    .locator('.site-marker[data-group-kind="region"]')
    .evaluateAll((markers) => markers.map((marker) => marker.getAttribute('aria-label')).sort());
  assert.deepEqual(u3RegionLabels, [
    'British Isles · 3 pieces',
    'Central Europe · 4 pieces',
    'Colonial Americas · 5 pieces',
    'Eastern Mediterranean · 4 pieces',
    'France · 5 pieces',
    'Iberian Peninsula · 5 pieces',
    'Italy & Vatican · 18 pieces',
    'Low Countries · 7 pieces',
  ]);
  return unitFilter;
}

async function assertInitialHierarchy(frame) {
  const initial = await frame
    .locator('.site-marker[data-group-kind="unit"]')
    .evaluateAll((markers) => markers.map((marker) => marker.getAttribute('aria-label')));
  assert.deepEqual(initial, [
    'U1 · Global Prehistory · 11 pieces',
    'U2 · Ancient Mediterranean · 36 pieces',
    'U3 · Early Europe and Colonial Americas · 51 pieces',
    'U4 · Later Europe and Americas · 54 pieces',
    'U5 · Indigenous Americas · 14 pieces',
    'U6 · Africa · 14 pieces',
    'U7 · West and Central Asia · 11 pieces',
    'U8 · South, East, and Southeast Asia · 21 pieces',
    'U9 · The Pacific · 11 pieces',
    'U10 · Global Contemporary · 27 pieces',
  ]);
  assert.equal((await frame.locator('.result-count').textContent()).trim(), '当前显示 250 件作品');
}

async function assertHierarchyAndDialog(page, frame) {
  const region = frame.locator('.site-marker[data-group-kind="region"]').first();
  await region.focus();
  await page.keyboard.press('Enter');
  await frame.locator('.site-marker[data-group-kind="site"]').first().waitFor();
  const site = frame.locator('.site-marker[data-group-kind="site"]').first();
  await site.focus();
  await page.keyboard.press('Space');

  const workPin = frame.locator('.expanded-work-pin, .expanded-pin-list-button').first();
  if (await workPin.count()) {
    await workPin.focus();
    await page.keyboard.press('Space');
  }
  const heading = frame.locator('[data-selected-artwork-title]');
  await heading.waitFor();
  assert.ok((await heading.textContent()).trim().length > 3);

  const imageButton = frame.locator('.artwork-image-button');
  const image = imageButton.locator('img');
  await waitForVerifierImage(image, 'responsive hierarchy artwork image');
  const imageFacts = await image.evaluate((element) => ({
    alt: element.alt,
    complete: element.complete,
    naturalWidth: element.naturalWidth,
    objectFit: getComputedStyle(element).objectFit,
    height: element.getBoundingClientRect().height,
  }));
  assert.ok(imageFacts.alt.length > 5);
  assert.equal(imageFacts.complete, true);
  assert.ok(imageFacts.naturalWidth > 0);
  assert.equal(imageFacts.objectFit, 'contain');
  assert.ok(imageFacts.height > 40);

  await imageButton.focus();
  await page.keyboard.press('Enter');
  const dialog = frame.locator('#imageDialog');
  await dialog.waitFor({ state: 'visible' });
  assert.equal(await frame.evaluate(() => document.activeElement?.id), 'dialogClose');
  await page.keyboard.press('Enter');
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await frame.evaluate(() => document.activeElement?.className), 'artwork-image-button');
}

function rectanglesOverlap(first, second) {
  return (
    first.left < second.right - 1
    && first.right > second.left + 1
    && first.top < second.bottom - 1
    && first.bottom > second.top + 1
  );
}

function assertRectangleInside(rect, bounds, label) {
  assert.ok(
    rect.left >= bounds.left - 1
      && rect.right <= bounds.right + 1
      && rect.top >= bounds.top - 1
      && rect.bottom <= bounds.bottom + 1,
    `${label} clipped: ${JSON.stringify({ rect, bounds })}`,
  );
}

export function assertMarkerGeometrySet(geometry, label) {
  assert.ok(geometry.markers.length > 0, `${label} must contain markers`);
  for (const marker of geometry.markers) {
    assert.ok(
      marker.hitSize.width >= 43.99 && marker.hitSize.height >= 43.99,
      `${label} ${marker.label} 44px hit target: ${JSON.stringify(marker.hitSize)}`,
    );
    for (const kind of ['group', 'hit', 'capsule', 'text']) {
      assertRectangleInside(
        marker.client[kind],
        geometry.map,
        `${label} ${marker.label} ${kind} client`,
      );
      assertRectangleInside(
        marker.world[kind],
        geometry.visibleWorldBounds,
        `${label} ${marker.label} ${kind} world`,
      );
    }
  }
  for (let first = 0; first < geometry.markers.length; first += 1) {
    for (let second = first + 1; second < geometry.markers.length; second += 1) {
      const firstMarker = geometry.markers[first];
      const secondMarker = geometry.markers[second];
      for (const kind of ['group', 'hit', 'capsule', 'text']) {
        assert.equal(
          rectanglesOverlap(firstMarker.client[kind], secondMarker.client[kind]),
          false,
          `${label} ${kind} overlap: ${firstMarker.label} / ${secondMarker.label}`,
        );
      }
    }
  }
}

async function captureMarkerGeometry(frame, markerKind) {
  return frame
    .locator(`.site-marker[data-group-kind="${markerKind}"]`)
    .evaluateAll((markers) => {
    const rect = (element) => {
      const bounds = element.getBoundingClientRect();
      return {
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        bottom: bounds.bottom,
        width: bounds.width,
        height: bounds.height,
      };
    };
    const union = (elements) => {
      const rectangles = elements.map(rect);
      return {
        left: Math.min(...rectangles.map((bounds) => bounds.left)),
        right: Math.max(...rectangles.map((bounds) => bounds.right)),
        top: Math.min(...rectangles.map((bounds) => bounds.top)),
        bottom: Math.max(...rectangles.map((bounds) => bounds.bottom)),
      };
    };
    const project = (bounds, inverse) => {
      const corners = [
        new DOMPoint(bounds.left, bounds.top),
        new DOMPoint(bounds.right, bounds.top),
        new DOMPoint(bounds.left, bounds.bottom),
        new DOMPoint(bounds.right, bounds.bottom),
      ].map((point) => point.matrixTransform(inverse));
      return {
        left: Math.min(...corners.map(({ x }) => x)),
        right: Math.max(...corners.map(({ x }) => x)),
        top: Math.min(...corners.map(({ y }) => y)),
        bottom: Math.max(...corners.map(({ y }) => y)),
      };
    };
    const map = document.querySelector('.map-svg');
    const mapViewport = document.querySelector('#mapViewport');
    const screenMatrix = mapViewport.getScreenCTM();
    if (!screenMatrix) throw new Error('Unable to project marker geometry');
    const inverse = screenMatrix.inverse();
    const mapBounds = rect(map);
    const projectedViewport = project(mapBounds, inverse);
    const transform = { ...window.ArtHistoryMap.state.transform };
    const visibleWorldBounds = {
      left: Math.max(0, projectedViewport.left),
      right: Math.min(1600, projectedViewport.right),
      top: Math.max(0, projectedViewport.top),
      bottom: Math.min(800, projectedViewport.bottom),
    };
    return {
      map: mapBounds,
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      activeRegion: window.ArtHistoryMap.state.activeRegion,
      activeUnit: window.ArtHistoryMap.state.activeUnit,
      stateTransform: transform,
      mapViewportTransform: mapViewport.getAttribute('transform'),
      visibleWorldBounds,
      focusedSiteLabel: document.activeElement?.matches?.(
        '.site-marker[data-group-kind="site"]',
      )
        ? document.activeElement.getAttribute('aria-label')
        : null,
      markers: markers.map((marker) => {
        const hit = marker.querySelector('.marker-hit-area');
        const capsule = marker.querySelector('.marker-label-bg');
        const texts = [
          ...marker.querySelectorAll(
            '.marker-ap-label, .marker-title-label, .marker-subtitle-label',
          ),
        ];
        const localTransform = marker.transform.baseVal.consolidate()?.matrix;
        const hitX = Number(hit.getAttribute('x'));
        const hitY = Number(hit.getAttribute('y'));
        const hitWidth = Number(hit.getAttribute('width'));
        const hitHeight = Number(hit.getAttribute('height'));
        const client = {
          group: rect(marker),
          hit: rect(hit),
          capsule: rect(capsule),
          text: union(texts),
        };
        return {
          label: marker.getAttribute('aria-label'),
          client,
          world: Object.fromEntries(
            Object.entries(client).map(([kind, bounds]) => [kind, project(bounds, inverse)]),
          ),
          hitSize: { width: client.hit.width, height: client.hit.height },
          worldHit: {
            left: localTransform.e + hitX,
            right: localTransform.e + hitX + hitWidth,
            top: localTransform.f + hitY,
            bottom: localTransform.f + hitY + hitHeight,
          },
        };
      }),
    };
  });
}

async function resetToU3Regions(frame) {
  const unitFilter = frame.locator('#unitFilter');
  await unitFilter.selectOption('all');
  await waitForPostTransformRender(frame);
  await unitFilter.selectOption('3');
  await waitForPostTransformRender(frame);
  await frame.locator('.site-marker[data-group-kind="region"]').first().waitFor();
}

async function verifyU3ResponsiveRegionBranches(page, frame, issues, mode, viewport) {
  const visited = [];
  const bounds = await frame.locator('.map-svg').evaluate(element => {
    const box = element.getBoundingClientRect(); return { width: box.width, height: box.height };
  });
  const expectedUnitFit = calculateExpectedU3FitTransform(
    U3_CANONICAL.artworks.map(({ coordinates }) => coordinates), bounds,
  );
  for (const region of U3_REGION_BRANCHES) {
    const regionMarker = frame.getByRole('button', { name: region.label, exact: true });
    assert.equal(
      await regionMarker.count(),
      1,
      `${mode} ${viewport.width} ${region.label} region marker`,
    );
    const activation = await regionMarker.evaluate((marker) => {
      const localTransform = marker.transform.baseVal.consolidate()?.matrix;
      return {
        point: { x: localTransform.e, y: localTransform.f },
        transform: { ...window.ArtHistoryMap.state.transform },
      };
    });
    assertU3TransformMatches(
      activation.transform,
      expectedUnitFit,
      `${mode} ${viewport.width} ${region.label} canonical Unit fit`,
    );
    const expectedActivatedTransform = calculateExpectedU3FitTransform(
      U3_CANONICAL.artworks.filter(work => work.region === region.id).map(work => work.coordinates), bounds,
    );
    await regionMarker.focus();
    assert.equal(
      await frame.evaluate(() => document.activeElement?.getAttribute('aria-label')),
      region.label,
      `${mode} ${viewport.width} ${region.label} region focus`,
    );
    await page.keyboard.press('Enter');
    await waitForPostTransformRender(frame);

    const siteMarkers = frame.locator('.site-marker[data-group-kind="site"]');
    await siteMarkers.first().waitFor();
    assert.ok(
      await siteMarkers.count() > 0,
      `${mode} ${viewport.width} ${region.label} nonempty site branch`,
    );
    const geometry = await captureMarkerGeometry(frame, 'site');
    assert.equal(
      geometry.activeRegion,
      `unit-3-region-${region.id}`,
      `${mode} ${viewport.width} ${region.label} parent branch`,
    );
    assert.equal(geometry.activeUnit, 3, `${mode} ${viewport.width} ${region.label} active Unit`);
    assert.ok(
      region.siteNames.some((siteName) => geometry.focusedSiteLabel?.startsWith(`${siteName} · `)),
      `${mode} ${viewport.width} ${region.label} focused child ${geometry.focusedSiteLabel}`,
    );
    assertU3SiteTraversalCoverage(
      geometry.markers.map(({ label }) => label),
      region.siteLabels,
      `${mode} ${viewport.width} ${region.label}`,
    );
    assertU3TransformMatches(
      geometry.stateTransform,
      expectedActivatedTransform,
      `${mode} ${viewport.width} ${region.label} canonical region fit`,
    );
    assert.equal(
      geometry.mapViewportTransform,
      `translate(${geometry.stateTransform.x} ${geometry.stateTransform.y}) `
        + `scale(${geometry.stateTransform.scale})`,
      `${mode} ${viewport.width} ${region.label} final transform`,
    );
    assert.ok(
      geometry.markers.every((marker) => (
        region.siteNames.some((siteName) => marker.label.startsWith(`${siteName} · `))
      )),
      `${mode} ${viewport.width} ${region.label} site parent membership`,
    );
    assertMarkerGeometrySet(
      geometry,
      `${mode} ${viewport.width} ${region.label} site geometry`,
    );
    assert.ok(
      geometry.horizontalOverflow <= 1,
      `${mode} ${viewport.width} ${region.label} horizontalOverflow `
        + geometry.horizontalOverflow,
    );
    assertNoCollectedIssues(
      issues,
      `${mode} ${viewport.width} ${region.label} responsive branch`,
    );
    visited.push(region.label);
    await resetToU3Regions(frame);
  }
  assertU3RegionTraversalCoverage(
    visited,
    `${mode} ${viewport.width} U3 responsive branch coverage`,
  );
  return Object.freeze(visited);
}

async function assertU3ResponsiveLayout(page, frame, issues, mode, viewport) {
  const unitFilter = frame.locator('#unitFilter');
  await unitFilter.selectOption('3');
  await waitForPostTransformRender(frame);
  assert.equal(await unitFilter.inputValue(), '3');
  assert.equal((await frame.locator('.result-count').textContent()).trim(), '当前显示 51 件作品');

  const culturePills = frame.locator('#cultureFilters [data-culture]');
  assert.equal(await culturePills.count(), 5, `${mode} ${viewport.width} U3 culture pill count`);
  const frameWidth = await frame.evaluate(() => innerWidth);
  const minimumPillHeight = frameWidth <= 520 ? 44 : 34;
  const pillRects = await culturePills.evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      height: rect.height,
    };
  }));
  assert.ok(
    pillRects.every(({ left, right, width, height }) => (
      left >= -1
      && right <= frameWidth + 1
      && width >= minimumPillHeight
      && height >= minimumPillHeight
    )),
    `${mode} ${viewport.width} U3 culture pills must be visible ${minimumPillHeight}px targets: `
      + JSON.stringify(pillRects),
  );

  await frame.locator('.map-controls').scrollIntoViewIfNeeded();
  const mapControls = await frame.locator('.map-controls button').evaluateAll((buttons) => (
    buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      return {
        id: button.id,
        label: button.textContent.trim(),
        centerHitsControl: hit === button || button.contains(hit),
        centerHit: hit
          ? `${hit.tagName.toLowerCase()}${hit.id ? `#${hit.id}` : ''}`
            + `${[...hit.classList].map((name) => `.${name}`).join('')}`
          : null,
      };
    })
  ));
  assert.ok(
    mapControls.every(({ centerHitsControl }) => centerHitsControl),
    `${mode} ${viewport.width} map control pointer centers ${JSON.stringify(mapControls)}`,
  );

  const markerGeometry = await captureMarkerGeometry(frame, 'region');
  assert.equal(
    markerGeometry.mapViewportTransform,
    `translate(${markerGeometry.stateTransform.x} ${markerGeometry.stateTransform.y}) `
      + `scale(${markerGeometry.stateTransform.scale})`,
    `${mode} ${viewport.width} applied map transform`,
  );
  assert.equal(markerGeometry.markers.length, 8, `${mode} ${viewport.width} U3 region count`);
  assertMarkerGeometrySet(
    markerGeometry,
    `${mode} ${viewport.width} U3 region overview geometry`,
  );

  const regionBranches = await verifyU3ResponsiveRegionBranches(
    page,
    frame,
    issues,
    mode,
    viewport,
  );
  const responsiveWork = U3_WORKS.find(({ id }) => id === 'ap60-chartres-cathedral');
  await resetAndActivateWork(page, frame, responsiveWork);
  const importantDetails = frame.locator(
    '[data-selected-artwork-title], .image-view-switcher button',
  );
  for (let index = 0; index < await importantDetails.count(); index += 1) {
    const detail = importantDetails.nth(index);
    await detail.scrollIntoViewIfNeeded();
    const visible = await detail.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const panel = document.querySelector('.detail-panel').getBoundingClientRect();
      return (
        rect.width > 0
        && rect.height > 0
        && rect.left >= panel.left - 1
        && rect.right <= panel.right + 1
        && rect.top >= -1
        && rect.bottom <= innerHeight + 1
      );
    });
    assert.equal(visible, true, `${mode} ${viewport.width} clipped U3 detail control ${index}`);
  }
  return {
    count: regionBranches.length,
    labels: regionBranches,
  };
}

async function selectBoundaryFilters(frame) {
  await frame.locator('#unitFilter').selectOption('2');
  await waitForPostTransformRender(frame);
  const culture = frame.locator('[data-culture="ancientNearEast"]');
  await culture.click();
  assert.equal(await culture.getAttribute('aria-pressed'), 'true');
  assert.match(await frame.locator('.result-count').textContent(), /\b6\b/);
}

async function verifyStandalone(
  browser,
  baseUrl,
  viewport,
  full,
  { injectConsoleIssue = null } = {},
) {
  return withBrowserContext(browser, {
    viewport,
    reducedMotion: 'reduce',
  }, async (context) => {
    const page = await context.newPage();
    const errors = installErrorCollection(page, `standalone ${viewport.width}x${viewport.height}`);
    await mockRemoteImages(page);
    await page.goto(`${baseUrl}/art-history-map.html`, { waitUntil: 'load' });
    await waitForArt(page);
    assert.equal(
      (await page.locator('.page-header h1').textContent()).trim(),
      'AP 艺术史互动地图 · Units 1-10',
    );
    await assertInitialHierarchy(page);
    let metrics = await assertCommonLayout(page, 'standalone', viewport);
    let u3RegionBranches = null;
    if (full) {
      await assertKeyboardAndFilters(page, page);
      await assertHierarchyAndDialog(page, page);
      u3RegionBranches = await assertU3ResponsiveLayout(
        page,
        page,
        errors,
        'standalone',
        viewport,
      );
      assert.match(
        await page.evaluate(() => getComputedStyle(document.querySelector('.marker-visual')).transitionDuration),
        /^(?:0\.01ms|1e-05s)$/,
      );
    } else {
      await selectBoundaryFilters(page);
      metrics = await assertCommonLayout(page, 'standalone', viewport);
    }
    if (injectConsoleIssue === 'warning') {
      await page.evaluate(() => console.warn('responsive warning regression'));
    } else if (injectConsoleIssue === 'error') {
      await page.evaluate(() => console.error('responsive error regression'));
    }
    assertNoCollectedIssues(errors, `standalone ${viewport.width}x${viewport.height}`);
    return { ...metrics, u3RegionBranches };
  });
}

async function selectArtAndFrame(page, useKeyboard = false) {
  const artPill = page.locator('.subj-pill[data-subj="art"]');
  if (useKeyboard) {
    await artPill.focus();
    const semantics = await artPill.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        role: element.getAttribute('role'),
        tabIndex: element.tabIndex,
        ariaPressed: element.getAttribute('aria-pressed'),
        outlineStyle: style.outlineStyle,
        outlineWidth: parseFloat(style.outlineWidth),
      };
    });
    assert.equal(semantics.role, 'button');
    assert.equal(semantics.tabIndex, 0);
    assert.equal(semantics.ariaPressed, 'false');
    assert.notEqual(semantics.outlineStyle, 'none');
    assert.ok(semantics.outlineWidth >= 2);
    await page.keyboard.press('Enter');
    assert.equal(await artPill.getAttribute('aria-pressed'), 'true');
    assert.equal(
      await page.evaluate(() => document.activeElement?.dataset?.subj),
      'art',
    );
  } else {
    await artPill.click();
  }
  const caption = page.locator('#homeMapCaption');
  await caption.waitFor({ state: 'visible' });
  assert.equal(
    (await caption.textContent()).trim(),
    '250 AP works · Units 1-10 · filter, compare and study',
  );
  const iframe = page.locator('#artMapFrame');
  await iframe.waitFor({ state: 'visible' });
  await page.waitForFunction(() => (
    document.querySelector('#artMapFrame')?.contentDocument?.querySelector('#markerLayer .site-marker')
  ));
  const frame = page.frames().find((candidate) => candidate.url().includes('art-history-map.html'));
  assert.ok(frame, 'Art iframe was not attached');
  await waitForArt(frame);
  return { frame, iframe };
}

async function verifyEmbedded(browser, baseUrl, viewport, full) {
  return withBrowserContext(browser, {
    viewport,
    reducedMotion: 'reduce',
  }, async (context) => {
    const page = await context.newPage();
    const errors = installErrorCollection(page, `embedded ${viewport.width}x${viewport.height}`);
    await mockRemoteImages(page);
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'load' });
    await page.locator('#home-map-embed').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => (
      document.querySelector('#worldMapFrame')?.contentDocument?.querySelector('.map-zone')
    ));
    const worldFrame = page.frames().find((candidate) => candidate.url().includes('world-map.html'));
    assert.ok(worldFrame, 'World iframe was not attached');
    await worldFrame.locator('.map-zone').waitFor();
    assert.ok(await worldFrame.locator('.pin-group').count() > 0);
    const { frame, iframe } = await selectArtAndFrame(page, full);
    await assertInitialHierarchy(frame);
    let metrics = await assertCommonLayout(frame, 'embedded', viewport);
    // content-fitted host ResizeObserver settlement: compare the same live
    // geometry that the existing host observer uses before taking snapshots.
    await page.waitForFunction(() => {
      const iframe = document.querySelector('#artMapFrame');
      const child = iframe?.contentDocument;
      const toolbar = child?.querySelector('.filter-toolbar');
      const workspace = child?.querySelector('.art-workspace');
      const wrap = iframe?.closest('.home-map-wrap');
      return wrap && toolbar && workspace && Math.abs(
        wrap.getBoundingClientRect().height
          - Math.ceil(toolbar.getBoundingClientRect().height + workspace.getBoundingClientRect().height)
      ) <= 1;
    });
    const host = await page.evaluate(() => {
      const wrap = document.querySelector('.map-card[data-subject="art"] .home-map-wrap');
      const rect = wrap.getBoundingClientRect();
      return {
        wrapHeight: rect.height,
        pageScroll: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    assert.ok(host.horizontalOverflow <= 1);
    // The approved shared-height UI fits the host to toolbar + workspace,
    // rather than the superseded viewport-height cap / fixed mobile host.
    const approved = await frame.locator('body').evaluate(() => {
      const toolbar = document.querySelector('.filter-toolbar').getBoundingClientRect();
      const workspace = document.querySelector('.art-workspace').getBoundingClientRect();
      const map = document.querySelector('.map-svg').getBoundingClientRect();
      return { hostHeight: Math.ceil(toolbar.height + workspace.height), mapHeight: map.height };
    });
    assert.ok(Math.abs(host.wrapHeight - approved.hostHeight) <= 1, `content-fitted host height ${host.wrapHeight}`);
    assert.ok(Math.abs(approved.mapHeight - (viewport.width > 900 ? 500 : 300)) <= 1,
      `shared World/Art map height ${approved.mapHeight}`);
    // ResizeObserver/postMessage can settle the iframe after the first metrics
    // snapshot. Verify the settled child, not a stale pre-resize measurement.
    await frame.waitForFunction(() => (
      document.documentElement.scrollHeight <= document.documentElement.clientHeight + 1
    ));
    metrics = await assertCommonLayout(frame, 'embedded', viewport);
    assert.ok(metrics.pageScroll <= 1, 'content-fitted embedded child must not be clipped or page-scroll');
    if (host.wrapHeight > viewport.height) assert.ok(host.pageScroll > 0, 'homepage owns tall embedded scrolling');
    assert.equal(await iframe.getAttribute('aria-hidden'), 'false');
    let u3RegionBranches = null;
    if (full) {
      await assertKeyboardAndFilters(page, frame);
      await assertHierarchyAndDialog(page, frame);
      u3RegionBranches = await assertU3ResponsiveLayout(
        page,
        frame,
        errors,
        'embedded',
        viewport,
      );
    } else {
      await selectBoundaryFilters(frame);
      metrics = await assertCommonLayout(frame, 'embedded', viewport);
    }
    assertNoCollectedIssues(errors, `embedded ${viewport.width}x${viewport.height}`);
    return { ...metrics, host, u3RegionBranches };
  });
}

async function fillSearchThroughUi(searchInput, value, label) {
  let actualValue = await searchInput.inputValue();
  for (let attempt = 0; actualValue !== value && attempt < 5; attempt += 1) {
    await searchInput.fill(value);
    actualValue = await searchInput.inputValue();
  }
  assert.equal(actualValue, value, label);
}

async function resetAndActivateWork(
  page,
  frame,
  work,
  beforeActivate = () => {},
  beforeTargetFilter = () => {},
) {
  const unitFilter = frame.locator('#unitFilter');
  const searchInput = frame.locator('#searchInput');
  const resultCount = frame.locator('.result-count');
  const unit = work.unit || (
    work.apNumber <= 11 ? 1 : work.apNumber <= 47 ? 2 : work.apNumber <= 98 ? 3 : 4
  );
  const unitCount = new Map([[1, 11], [2, 36], [3, 51], [4, 54], [5, 14], [6, 14]]).get(unit);
  await fillSearchThroughUi(searchInput, '', `AP ${work.apNumber} reset search`);
  await unitFilter.selectOption('all');
  await waitForPostTransformRender(frame);
  assert.equal(await unitFilter.inputValue(), 'all', `AP ${work.apNumber} reset Unit`);
  assert.equal(await searchInput.inputValue(), '', `AP ${work.apNumber} Unit reset retains search`);
  assert.equal(
    (await resultCount.textContent()).trim(),
    '当前显示 250 件作品',
    `AP ${work.apNumber} search reset result`,
  );
  await frame.locator('#resetView').click();
  assert.equal(
    (await resultCount.textContent()).trim(),
    '当前显示 250 件作品',
    `AP ${work.apNumber} hierarchy reset result`,
  );

  await unitFilter.selectOption(String(unit));
  await waitForPostTransformRender(frame);
  assert.equal(await unitFilter.inputValue(), String(unit), `AP ${work.apNumber} Unit selection`);
  assert.equal(
    (await resultCount.textContent()).trim(),
    `当前显示 ${unitCount} 件作品`,
    `AP ${work.apNumber} Unit result`,
  );
  await waitForPostTransformRender(frame);
  await page.waitForTimeout(0);
  await beforeTargetFilter();
  const exactSearch = unit >= 4 ? `AP ${work.apNumber}` : work.titleEn;
  await fillSearchThroughUi(searchInput, exactSearch, `AP ${work.apNumber} exact search`);
  assert.equal(
    (await resultCount.textContent()).trim(),
    '当前显示 1 件作品',
    `AP ${work.apNumber} exact search result`,
  );

  const region = frame.locator('.site-marker[data-group-kind="region"]');
  await region.waitFor();
  assert.equal(await region.count(), 1, `AP ${work.apNumber} should expose one region`);
  const regionLabel = await region.getAttribute('aria-label');
  await region.focus();
  await page.keyboard.press('Enter');

  const site = frame.locator('.site-marker[data-group-kind="site"]');
  await site.waitFor();
  assert.equal(await site.count(), 1, `AP ${work.apNumber} should expose one site`);
  if (unit === 5) {
    assertU5HierarchySelection(
      regionLabel,
      await site.getAttribute('aria-label'),
      work,
    );
  }
  await waitForPostTransformRender(frame);
  await page.waitForTimeout(0);
  await beforeActivate();
  await site.focus();
  await page.keyboard.press('Space');

  const heading = frame.locator('[data-selected-artwork-title]');
  await heading.waitFor();
  assert.equal((await heading.textContent()).trim(), work.titleEn);
}

function privatePathForU4(identity) {
  return `.private-media/u4/${identity.replace('::', '-')}.jpg`;
}

export function createU4PrivateOverrides() {
  return Object.fromEntries(U4_PRIVATE_MEDIA_KEYS.map((identity) => [identity, {
    filePath: privatePathForU4(identity),
    creatorOrInstitution: 'Browser verifier private study copy',
    rightsNote: 'Private browser-verification copy',
    rightsUrl: 'https://example.org/private-study-rights',
  }]));
}

async function installU4PrivateRoutes(
  page,
  privateImageRequests,
  { includeScript = true, includeImages = true } = {},
) {
  const overrides = createU4PrivateOverrides();
  await page.route('**/.private-media/u4/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname.endsWith(U4_PRIVATE_SCRIPT_PATH)) {
      if (!includeScript) {
        await route.fulfill({ status: 404, body: '' });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/javascript; charset=utf-8',
        body: `window.AP_ART_HISTORY_PRIVATE_MEDIA_U4 = Object.freeze(${JSON.stringify(overrides)});`,
      });
      return;
    }
    const localPath = requestUrl.pathname.replace(/^\//, '');
    privateImageRequests.set(localPath, (privateImageRequests.get(localPath) || 0) + 1);
    if (!includeImages) {
      await route.fulfill({ status: 404, body: '' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: IMAGE_FIXTURE,
    });
  });
  return overrides;
}

async function verifyU4RegionBranches(frame, mode) {
  await frame.locator('#unitFilter').selectOption('4');
  await waitForPostTransformRender(frame);
  const regionLabels = await frame
    .locator('.site-marker[data-group-kind="region"]')
    .evaluateAll((markers) => markers.map((marker) => marker.getAttribute('aria-label')));
  assertU4RegionTraversalCoverage(regionLabels, `${mode} U4 regions`);
  assertU4MarkerLayoutPreserved(
    await frame.locator('#markerLayer .site-marker').count() === 9,
    `${mode} U4 region render`,
  );
  return regionLabels;
}

async function verifyU4Works(
  page,
  frame,
  remoteImageRequests,
  privateImageRequests,
  mode,
  { privateMode = false } = {},
) {
  const results = [];
  const privateOverrides = createU4PrivateOverrides();
  for (const work of U4_WORKS) {
    let remoteRequestBoundary;
    let privateRequestBoundary;
    await resetAndActivateWork(
      page,
      frame,
      work,
      () => {},
      () => {
        remoteRequestBoundary = snapshotRequestCounts(remoteImageRequests);
        privateRequestBoundary = snapshotRequestCounts(privateImageRequests);
      },
    );
    const summary = frame.locator('.selected-summary');
    assert.equal(
      (await summary.locator('[data-selected-artwork-title]').textContent()).trim(),
      work.titleEn,
      `${mode} AP ${work.apNumber} English title`,
    );
    assert.equal(
      (await summary.locator('.work-title-zh').textContent()).trim(),
      work.titleZh,
      `${mode} AP ${work.apNumber} Chinese subtitle`,
    );
    const viewButtons = summary.locator('.image-view-switcher button');
    assert.equal(
      await viewButtons.count(),
      work.images.length > 1 ? work.images.length : 0,
      `${mode} AP ${work.apNumber} view button count`,
    );
    if (work.images.length > 1) {
      assert.deepEqual(
        await viewButtons.allTextContents(),
        work.images.map(({ label }) => label),
        `${mode} AP ${work.apNumber} view labels`,
      );
    }

    for (let imageIndex = 0; imageIndex < work.images.length; imageIndex += 1) {
      const expected = work.images[imageIndex];
      const identity = `${work.id}::${expected.id}`;
      const restricted = expected.mediaStatus === 'rightsRestricted';
      if (work.images.length > 1) await viewButtons.nth(imageIndex).click();
      if (restricted && !privateMode) {
        const placeholder = summary.locator('.rights-placeholder');
        assert.equal(await placeholder.count(), 1, `${mode} ${identity} public placeholder`);
        assert.match(
          (await placeholder.textContent()).trim(),
          /Image unavailable in the public version/,
          `${mode} ${identity} placeholder message`,
        );
        assert.equal(
          await placeholder.locator('.rights-placeholder-source').getAttribute('href'),
          expected.imageSourceUrl,
          `${mode} ${identity} official source`,
        );
        assert.equal(await summary.locator('.artwork-image-button').count(), 0);
        assert.equal(await placeholder.locator('img').count(), 0);
        assert.equal(await frame.locator('#imageDialog').getAttribute('open'), null);
        continue;
      }

      const expectedImageUrl = restricted
        ? privateOverrides[identity].filePath
        : expected.imageUrl;
      const imageButton = summary.locator('.artwork-image-button');
      const image = imageButton.locator('img');
      await waitForVerifierImage(image, `${mode} ${identity} ${expectedImageUrl}`);
      assert.equal(await image.getAttribute('src'), expectedImageUrl, `${mode} ${identity} image URL`);
      assert.equal(await image.getAttribute('alt'), expected.imageAlt, `${mode} ${identity} image alt`);
      const inlineLinks = summary.locator('.image-credit-host .image-credit a');
      assert.equal(await inlineLinks.count(), 2, `${mode} ${identity} credit links`);
      assert.equal(
        await inlineLinks.nth(1).getAttribute('href'),
        expected.imageSourceUrl,
        `${mode} ${identity} inline source`,
      );
      if (restricted) {
        assert.equal(
          await inlineLinks.nth(0).getAttribute('href'),
          privateOverrides[identity].rightsUrl,
          `${mode} ${identity} private rights`,
        );
      }

      await imageButton.focus();
      await imageButton.click();
      const dialog = frame.locator('#imageDialog');
      await dialog.waitFor({ state: 'visible' });
      const dialogImage = frame.locator('#dialogImage');
      await waitForVerifierImage(dialogImage, `${mode} ${identity} dialog ${expectedImageUrl}`);
      assert.equal(await dialogImage.getAttribute('src'), expectedImageUrl);
      assert.equal(await dialogImage.getAttribute('alt'), expected.imageAlt);
      assert.equal(await frame.locator('#dialogSource').getAttribute('href'), expected.imageSourceUrl);
      await frame.locator('#dialogClose').click();
      await waitForPostTransformRender(frame);
      await dialog.waitFor({ state: 'hidden' });
      assertDialogFocusRestored(
        await frame.evaluate(() => document.activeElement?.classList.contains('artwork-image-button')),
        `${mode} ${identity}`,
      );
    }

    const currentRemoteImageRequests = requestCountsSince(
      remoteImageRequests,
      remoteRequestBoundary,
    );
    const publicViews = work.images.filter(({ imageUrl }) => imageUrl !== null);
    assert.equal(currentRemoteImageRequests.size, publicViews.length, `${mode} AP ${work.apNumber} public request set`);
    for (const image of publicViews) {
      assert.equal(
        currentRemoteImageRequests.get(image.imageUrl),
        1,
        `${mode} AP ${work.apNumber} ${image.id} request count`,
      );
    }
    const currentPrivateImageRequests = requestCountsSince(
      privateImageRequests,
      privateRequestBoundary,
    );
    const privateViews = privateMode
      ? work.images.filter(({ mediaStatus }) => mediaStatus === 'rightsRestricted')
      : [];
    assert.equal(currentPrivateImageRequests.size, privateViews.length, `${mode} AP ${work.apNumber} private request set`);
    for (const image of privateViews) {
      const path = privatePathForU4(`${work.id}::${image.id}`);
      assert.equal(currentPrivateImageRequests.get(path), 1, `${mode} AP ${work.apNumber} ${image.id} private request`);
    }
    results.push({
      apNumber: work.apNumber,
      mode,
      privateMode,
      views: work.images.length,
    });
  }
  return results;
}

async function verifyU4PrivateFallbacks(page, frame, mode) {
  const restrictedWork = U4_WORKS.find(({ apNumber }) => apNumber === 140);
  assert.ok(restrictedWork, `${mode} AP 140 fallback fixture`);
  await resetAndActivateWork(page, frame, restrictedWork);
  const placeholder = frame.locator('.rights-placeholder');
  await placeholder.waitFor();
  assert.match(await placeholder.textContent(), /Private image not installed/);
  assert.equal(await frame.locator('.artwork-image-button').count(), 0);
}

function assertSingleImageRequest(imageRequests, work, checkpoint) {
  assert.equal(imageRequests.length, 1,
    `${checkpoint} AP ${work.apNumber} should issue exactly one image request`,
  );
  assert.equal(imageRequests[0], work.imageUrl,
    `${checkpoint} AP ${work.apNumber} requested image URL`,
  );
}

async function verifyNineImportedWorks(page, frame, imageRequests, mode) {
  const verified = [];
  for (const work of NINE_IMPORTED_WORKS) {
    imageRequests.length = 0;
    await resetAndActivateWork(page, frame, work);

    const summary = frame.locator('.selected-summary');
    assert.equal((await summary.locator('.work-title-en').textContent()).trim(), work.titleEn);
    assert.equal((await summary.locator('.work-title-zh').textContent()).trim(), work.titleZh);
    const meta = (await summary.locator('.work-meta').textContent()).trim();
    assert.equal(meta.split(' · ')[0], `AP #${work.apNumber}`);

    const imageButtons = summary.locator('.artwork-image-button');
    assert.equal(await imageButtons.count(), 1, `${mode} AP ${work.apNumber} detail image button`);
    assert.equal(await summary.locator('img').count(), 1, `${mode} AP ${work.apNumber} detail image`);
    assert.equal(await summary.locator('[class*="gallery"]').count(), 0);
    const imageButton = imageButtons.first();
    const image = imageButton.locator('img');
    await waitForVerifierImage(
      image,
      `${mode} AP ${work.apNumber} primary ${work.imageUrl}`,
    );
    assert.equal(await image.getAttribute('alt'), work.imageAlt);

    const imageCredit = summary.locator('.image-credit');
    assert.equal(await imageCredit.isVisible(), true);
    assert.equal(
      (await imageCredit.textContent()).trim(),
      `图片：${work.credit.creatorOrInstitution} · ${work.credit.licenseName} · ${work.imageSourceName}`,
    );
    const inlineLicense = imageCredit.locator('a').nth(0);
    assert.equal(await inlineLicense.getAttribute('href'), work.credit.licenseUrl);
    assert.equal((await inlineLicense.textContent()).trim(), work.credit.licenseName);
    const inlineSource = imageCredit.locator('a').nth(1);
    assert.equal(await inlineSource.getAttribute('href'), work.imageSourceUrl);
    assert.equal((await inlineSource.textContent()).trim(), work.imageSourceName);

    assertSingleImageRequest(imageRequests, work, `${mode} detail`);

    const originalImageButton = await imageButton.elementHandle();
    assert.ok(originalImageButton, `${mode} AP ${work.apNumber} original image button handle`);
    await imageButton.focus();
    await page.keyboard.press('Enter');
    const dialog = frame.locator('#imageDialog');
    await dialog.waitFor({ state: 'visible' });
    assert.equal(await frame.evaluate(() => document.activeElement?.id), 'dialogClose');
    assert.equal((await frame.locator('#dialogTitle').textContent()).trim(), `${work.titleEn} · ${work.titleZh}`);
    assert.equal(await dialog.locator('img').count(), 1);
    const dialogImage = frame.locator('#dialogImage');
    await waitForVerifierImage(
      dialogImage,
      `${mode} AP ${work.apNumber} primary dialog ${work.imageUrl}`,
    );
    assert.equal(await dialogImage.getAttribute('alt'), work.imageAlt);
    assert.equal((await frame.locator('#dialogCredit').textContent()).trim(), `图片：${work.credit.creatorOrInstitution}`);

    const dialogLicense = frame.locator('#dialogLicense');
    assert.equal(await dialogLicense.isVisible(), true);
    assert.equal(await dialogLicense.getAttribute('href'), work.credit.licenseUrl);
    assert.equal((await dialogLicense.textContent()).trim(), work.credit.licenseName);
    const dialogSource = frame.locator('#dialogSource');
    assert.equal(await dialogSource.isVisible(), true);
    assert.equal(await dialogSource.getAttribute('href'), work.imageSourceUrl);
    assert.equal((await dialogSource.textContent()).trim(), work.imageSourceName);

    assertSingleImageRequest(imageRequests, work, `${mode} open dialog`);

    const originalViewport = page.viewportSize();
    assert.ok(originalViewport, `${mode} AP ${work.apNumber} viewport`);
    await page.setViewportSize({
      width: originalViewport.width - 1,
      height: originalViewport.height,
    });
    await frame.waitForFunction(
      (element) => !element.isConnected,
      originalImageButton,
    );
    assert.equal(await originalImageButton.evaluate((element) => element.isConnected), false);
    await frame.waitForFunction(
      (element) => (
        document.querySelector('.artwork-image-button')?.isConnected
        && document.querySelector('.artwork-image-button') !== element
      ),
      originalImageButton,
    );

    await page.keyboard.press('Enter');
    await dialog.waitFor({ state: 'hidden' });
    await frame.waitForFunction(() => (
      document.activeElement === document.querySelector('.artwork-image-button')
    ));
    assert.equal(
      await frame.evaluate(() => (
        document.activeElement === document.querySelector('.artwork-image-button')
      )),
      true,
      `${mode} AP ${work.apNumber} should restore focus to the current detail image button`,
    );
    await page.setViewportSize(originalViewport);
    await frame.waitForFunction(() => (
      document.activeElement === document.querySelector('.artwork-image-button')
    ));
    assertSingleImageRequest(imageRequests, work, `${mode} closed dialog`);
    verified.push({
      apNumber: work.apNumber,
      imageUrl: work.imageUrl,
      imageRequestCount: imageRequests.length,
    });
  }
  return verified;
}

async function verifyU1Works(page, frame, imageRequests, mode) {
  const results = [];
  for (const work of U1_WORKS) {
    imageRequests.clear();
    await resetAndActivateWork(page, frame, work);

    const summary = frame.locator('.selected-summary');
    assert.equal(
      (await summary.locator('[data-selected-artwork-title]').textContent()).trim(),
      work.titleEn,
    );
    assert.equal((await summary.locator('.work-title-zh').textContent()).trim(), work.titleZh);
    const meta = (await summary.locator('.work-meta').textContent()).trim();
    assert.equal(meta.split(' · ')[0], `AP #${work.apNumber}`);
    const viewButtons = summary.locator('.image-view-switcher button');
    assert.equal(
      await viewButtons.count(),
      work.images.length === 2 ? 2 : 0,
      `${mode} AP ${work.apNumber} view button count`,
    );
    if (work.images.length === 2) {
      assert.deepEqual(
        await viewButtons.allTextContents(),
        work.images.map(({ label }) => label),
        `${mode} AP ${work.apNumber} view button labels`,
      );
    }

    for (let imageIndex = 0; imageIndex < work.images.length; imageIndex += 1) {
      if (work.images.length === 2) {
        await viewButtons.nth(imageIndex).click();
        assert.deepEqual(
          await viewButtons.evaluateAll((buttons) => (
            buttons.map((button) => button.getAttribute('aria-pressed'))
          )),
          work.images.map((image, index) => String(index === imageIndex)),
          `${mode} AP ${work.apNumber} view ${imageIndex + 1} pressed state`,
        );
      }
      const expected = work.images[imageIndex];
      const imageButton = summary.locator('.artwork-image-button');
      const image = imageButton.locator('img');
      await waitForVerifierImage(
        image,
        `${mode} AP ${work.apNumber} view ${imageIndex + 1} ${expected.imageUrl}`,
      );
      assert.equal(await image.getAttribute('src'), expected.imageUrl);
      assert.equal(await image.getAttribute('alt'), expected.imageAlt);

      const creditHost = summary.locator('.image-credit-host');
      const imageCredit = creditHost.locator('.image-credit');
      assert.equal(
        (await imageCredit.textContent()).trim(),
        `图片：${expected.creatorOrInstitution} · ${expected.licenseName} · ${expected.imageSourceName}`,
      );
      const inlineLinks = imageCredit.locator('a');
      assert.equal(await inlineLinks.count(), 2);
      assert.equal(
        await inlineLinks.nth(0).getAttribute('href'),
        expected.licenseUrl,
      );
      assert.equal((await inlineLinks.nth(0).textContent()).trim(), expected.licenseName);
      assert.equal(
        await inlineLinks.nth(1).getAttribute('href'),
        expected.imageSourceUrl,
      );
      assert.equal((await inlineLinks.nth(1).textContent()).trim(), expected.imageSourceName);

      await imageButton.click();
      const dialog = frame.locator('#imageDialog');
      await dialog.waitFor({ state: 'visible' });
      assert.equal(await frame.evaluate(() => document.activeElement?.id), 'dialogClose');
      const dialogImage = frame.locator('#dialogImage');
      await waitForVerifierImage(
        dialogImage,
        `${mode} AP ${work.apNumber} view ${imageIndex + 1} dialog ${expected.imageUrl}`,
      );
      assert.equal(await dialogImage.getAttribute('src'), expected.imageUrl);
      assert.equal(await dialogImage.getAttribute('alt'), expected.imageAlt);
      assert.equal(
        (await frame.locator('#dialogTitle').textContent()).trim(),
        `${work.titleEn} · ${work.titleZh}`,
      );
      assert.equal((await frame.locator('#dialogCaption').textContent()).trim(), expected.imageAlt);
      assert.equal(
        (await frame.locator('#dialogCredit').textContent()).trim(),
        `图片：${expected.creatorOrInstitution}`,
      );
      const dialogLicense = frame.locator('#dialogLicense');
      assert.equal(await dialogLicense.getAttribute('href'), expected.licenseUrl);
      assert.equal((await dialogLicense.textContent()).trim(), expected.licenseName);
      const dialogSource = frame.locator('#dialogSource');
      assert.equal(await dialogSource.getAttribute('href'), expected.imageSourceUrl);
      assert.equal((await dialogSource.textContent()).trim(), expected.imageSourceName);

      await frame.locator('#dialogClose').click();
      await waitForPostTransformRender(frame);
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(
        await frame.evaluate(() => (
          document.activeElement?.classList.contains('artwork-image-button')
        )),
        true,
        `${mode} AP ${work.apNumber} view ${imageIndex + 1} focus restoration`,
      );
      assert.equal(
        imageRequests.get(expected.imageUrl),
        1,
        `${mode} AP ${work.apNumber} view ${imageIndex + 1} image request count`,
      );
    }

    assert.equal(
      imageRequests.size,
      work.images.length,
      `${mode} AP ${work.apNumber} should request only its expected image URLs`,
    );
    results.push({
      apNumber: work.apNumber,
      mode,
      images: work.images.map(({ imageUrl }) => ({
        imageUrl,
        imageRequestCount: imageRequests.get(imageUrl),
      })),
    });
  }
  return results;
}

async function verifyU1StudyTabsAndComparison(page, frame, mode) {
  const sourceWork = U1_WORKS.find(({ id }) => id === 'ap2-great-hall-bulls');
  assert.ok(sourceWork, `${mode} AP 2 study-tab source fixture`);
  await resetAndActivateWork(page, frame, sourceWork);

  const expectedTabs = [
    { id: 'quick', label: '速览', headings: ['核心功能', '识别锚点'] },
    { id: 'form', label: '形式', headings: ['形式', '内容'] },
    { id: 'context', label: '语境', headings: ['历史语境', '图像内容'] },
    { id: 'compare', label: '比较', headings: [] },
  ];
  const tabs = frame.locator('.detail-tab');
  assert.equal(await tabs.count(), expectedTabs.length, `${mode} AP 2 study tab count`);
  assert.deepEqual(
    await tabs.allTextContents(),
    expectedTabs.map(({ label }) => label),
    `${mode} AP 2 study tab labels`,
  );

  let comparisonIds = [];
  for (let tabIndex = 0; tabIndex < expectedTabs.length; tabIndex += 1) {
    const expected = expectedTabs[tabIndex];
    await tabs.nth(tabIndex).click();
    assert.deepEqual(
      await tabs.evaluateAll((buttons) => buttons.map((button) => ({
        selected: button.getAttribute('aria-selected'),
        tabIndex: button.getAttribute('tabindex'),
      }))),
      expectedTabs.map((tab, index) => ({
        selected: String(index === tabIndex),
        tabIndex: index === tabIndex ? '0' : '-1',
      })),
      `${mode} AP 2 ${expected.label} tab state`,
    );

    const panel = frame.locator('#detail-tabpanel');
    assert.equal(await panel.getAttribute('aria-labelledby'), `detail-tab-${expected.id}`);
    const panelText = (await panel.textContent()).trim();
    assert.ok(panelText.length > 8, `${mode} AP 2 ${expected.label} panel content`);
    assert.deepEqual(
      await panel.locator('h3').allTextContents(),
      expected.headings,
      `${mode} AP 2 ${expected.label} panel headings`,
    );

    if (expected.id === 'compare') {
      const cards = panel.locator('.comparison-card');
      comparisonIds = await cards.evaluateAll((elements) => (
        elements.map((element) => element.dataset.comparisonId)
      ));
      assert.deepEqual(comparisonIds, [
        'ap1-apollo-11-stones',
        'ap4-running-horned-woman',
        'ap24-last-judgment-of-hunefer',
      ]);
      assert.ok(
        (await cards.allTextContents()).every((text) => text.trim().length > 20),
        `${mode} AP 2 comparison card content`,
      );
    }
  }

  const crossUnitCard = frame.locator(
    '.comparison-card[data-comparison-id="ap24-last-judgment-of-hunefer"]',
  );
  assert.equal(await crossUnitCard.count(), 1, `${mode} AP 2 cross-Unit comparison card`);
  await crossUnitCard.click();
  const targetHeading = frame.locator('[data-selected-artwork-title]');
  await targetHeading.waitFor();
  assert.equal(
    (await targetHeading.textContent()).trim(),
    'Last judgment of Hunefer, from his tomb (page from the Book of the Dead)',
  );
  assert.equal((await frame.locator('.work-title-zh').textContent()).trim(), '胡内弗《末日审判》');
  assert.equal(
    (await frame.locator('.work-meta').textContent()).trim().split(' · ')[0],
    'AP #24',
  );
  assert.equal(await frame.locator('#unitFilter').inputValue(), '2');
  assert.equal((await frame.locator('.result-count').textContent()).trim(), '当前显示 36 件作品');
  assert.equal(await frame.locator('#searchInput').inputValue(), '');
  await frame.waitForFunction(() => (
    document.activeElement === document.querySelector('[data-selected-artwork-title]')
  ));
  assert.equal(
    await frame.evaluate(() => (
      document.activeElement === document.querySelector('[data-selected-artwork-title]')
    )),
    true,
    `${mode} AP 24 comparison target focus`,
  );

  await resetAndActivateWork(page, frame, sourceWork);
  assert.equal(await frame.locator('#unitFilter').inputValue(), '1');
  assert.equal(
    (await frame.locator('[data-selected-artwork-title]').textContent()).trim(),
    sourceWork.titleEn,
  );
  assert.equal((await frame.locator('.result-count').textContent()).trim(), '当前显示 1 件作品');
  await frame.locator('#detail-tab-form').click();
  assert.equal(await frame.locator('#detail-tab-form').getAttribute('aria-selected'), 'true');
  assert.deepEqual(
    await frame.locator('#detail-tabpanel h3').allTextContents(),
    ['形式', '内容'],
  );

  return {
    sourceApNumber: sourceWork.apNumber,
    tabs: expectedTabs.map(({ id, label }) => ({ id, label })),
    comparisonIds,
    crossUnitTarget: 24,
    resetToSource: true,
  };
}

async function verifyU3Works(
  page,
  frame,
  imageRequests,
  mode,
  {
    faultMode = null,
    maxWorks = Number.POSITIVE_INFINITY,
    requestObserver = null,
  } = {},
) {
  const results = [];
  for (const work of U3_WORKS) {
    const expectedWork = U3_EXPECTED_WORKS.find(({ id }) => id === work.id);
    assert.ok(expectedWork, `${mode} AP ${work.apNumber} canonical work`);
    await resetAndActivateWork(page, frame, work, () => imageRequests.clear());

    const summary = frame.locator('.selected-summary');
    assert.equal(
      (await summary.locator('[data-selected-artwork-title]').textContent()).trim(),
      work.titleEn,
      `${mode} AP ${work.apNumber} English title`,
    );
    assert.equal(
      (await summary.locator('.work-title-zh').textContent()).trim(),
      work.titleZh,
      `${mode} AP ${work.apNumber} Chinese subtitle`,
    );
    const meta = (await summary.locator('.work-meta').textContent()).trim();
    const metaParts = meta.split(' · ');
    assert.deepEqual(
      metaParts,
      [
        `AP #${work.apNumber}`,
        expectedWork.metadata.cultureLabelZh,
        expectedWork.metadata.period,
        expectedWork.metadata.date,
      ],
      `${mode} AP ${work.apNumber} exact metadata line`,
    );
    const identity = await summary.locator('.identity-row').evaluateAll((rows) => (
      Object.fromEntries(rows.map((row) => [
        row.querySelector('dt')?.textContent?.trim(),
        row.querySelector('dd')?.textContent?.trim(),
      ]))
    ));
    const renderedLocation = identity['地点'];
    const qualifierSeparator = renderedLocation.indexOf(' · ');
    assertU3MetadataMatches({
      titleZh: (await summary.locator('.work-title-zh').textContent()).trim(),
      siteName: qualifierSeparator < 0
        ? renderedLocation
        : renderedLocation.slice(0, qualifierSeparator),
      provenanceQualifier: qualifierSeparator < 0
        ? null
        : renderedLocation.slice(qualifierSeparator + 3),
      cultureLabelZh: metaParts[1],
      period: metaParts[2],
      date: metaParts[3],
      artistCulture: identity['艺术家／文化'],
      medium: identity['材料'],
      workType: identity['类型'],
    }, expectedWork.metadata, `${mode} AP ${work.apNumber} rendered metadata`);
    assert.equal(
      await frame.locator('.site-marker[data-group-kind="site"][aria-pressed="true"]').count(),
      1,
      `${mode} AP ${work.apNumber} selected site marker`,
    );

    const viewButtons = summary.locator('.image-view-switcher button');
    const expectedViewButtonCount = work.images.length > 1 ? work.images.length : 0;
    assert.equal(
      await viewButtons.count(),
      expectedViewButtonCount,
      `${mode} AP ${work.apNumber} view button count`,
    );
    if (expectedViewButtonCount) {
      assert.deepEqual(
        await viewButtons.allTextContents(),
        work.images.map(({ label }) => label),
        `${mode} AP ${work.apNumber} view button labels`,
      );
    }

    for (let imageIndex = 0; imageIndex < work.images.length; imageIndex += 1) {
      const expected = work.images[imageIndex];
      const expectedCanonicalView = expectedWork.images[imageIndex];
      if (expectedViewButtonCount) {
        await viewButtons.nth(imageIndex).click();
        assert.deepEqual(
          await viewButtons.evaluateAll((buttons) => (
            buttons.map((button) => button.getAttribute('aria-pressed'))
          )),
          work.images.map((image, index) => String(index === imageIndex)),
          `${mode} AP ${work.apNumber} ${expected.id} pressed state`,
        );
      }

      const imageButton = summary.locator('.artwork-image-button');
      const image = imageButton.locator('img');
      await waitForVerifierImage(
        image,
        `${mode} AP ${work.apNumber} ${expected.id} ${expected.imageUrl}`,
      );
      const injectFault = faultMode
        && work.apNumber === 48
        && imageIndex === 0;
      if (injectFault && faultMode === 'wrong-rendered-url') {
        await image.evaluate((element) => {
          element.setAttribute(
            'src',
            'https://example.invalid/verifier-wrong-rendered-url.jpg',
          );
          element.setAttribute('alt', 'Verifier wrong rendered image');
        });
      }
      const sourceLink = summary.locator('.image-credit a').nth(1);
      const actual = {
        id: expected.id,
        label: expectedViewButtonCount
          ? (await viewButtons.nth(imageIndex).textContent()).trim()
          : expected.label,
        imageUrl: await image.getAttribute('src'),
        imageAlt: await image.getAttribute('alt'),
        imageSourceUrl: await sourceLink.getAttribute('href'),
      };
      assertU3ViewMatches(
        actual,
        expected,
        `${mode} AP ${work.apNumber} ${expected.id}`,
      );
      assert.equal(
        await summary.locator('.image-credit a').count(),
        2,
        `${mode} AP ${work.apNumber} ${expected.id} inline credit links`,
      );
      const inlineCredit = await summary.locator('.image-credit').evaluate((line) => {
        const [license, source] = line.querySelectorAll('a');
        return {
          creatorOrInstitution: (line.childNodes[0]?.textContent || '')
            .replace(/^图片：/, '')
            .replace(/ · $/, ''),
          licenseName: license?.textContent?.trim(),
          licenseUrl: license?.getAttribute('href'),
          imageSourceName: source?.textContent?.trim(),
          imageSourceUrl: source?.getAttribute('href'),
        };
      });
      assertU3CreditMatches(
        inlineCredit,
        expectedCanonicalView.credit,
        `${mode} AP ${work.apNumber} ${expected.id} inline credit`,
      );

      await imageButton.click();
      const dialog = frame.locator('#imageDialog');
      await dialog.waitFor({ state: 'visible' });
      assert.equal(await frame.evaluate(() => document.activeElement?.id), 'dialogClose');
      const dialogImage = frame.locator('#dialogImage');
      await waitForVerifierImage(
        dialogImage,
        `${mode} AP ${work.apNumber} ${expected.id} dialog ${expected.imageUrl}`,
      );
      assert.equal(await dialogImage.getAttribute('src'), expected.imageUrl);
      assert.equal(await dialogImage.getAttribute('alt'), expected.imageAlt);
      assert.equal(
        (await frame.locator('#dialogTitle').textContent()).trim(),
        `${work.titleEn} · ${work.titleZh}`,
      );
      assert.equal((await frame.locator('#dialogCaption').textContent()).trim(), expected.imageAlt);
      assert.match((await frame.locator('#dialogCredit').textContent()).trim(), /^图片：\S/);
      const dialogLicense = frame.locator('#dialogLicense');
      const dialogSource = frame.locator('#dialogSource');
      assertU3CreditMatches({
        creatorOrInstitution: (await frame.locator('#dialogCredit').textContent())
          .trim()
          .replace(/^图片：/, ''),
        licenseName: (await dialogLicense.textContent()).trim(),
        licenseUrl: await dialogLicense.getAttribute('href'),
        imageSourceName: (await dialogSource.textContent()).trim(),
        imageSourceUrl: await dialogSource.getAttribute('href'),
      }, expectedCanonicalView.credit, `${mode} AP ${work.apNumber} ${expected.id} modal credit`);

      await frame.locator('#dialogClose').click();
      await waitForPostTransformRender(frame);
      await dialog.waitFor({ state: 'hidden' });
      if (injectFault && faultMode === 'broken-focus-restoration') {
        await frame.locator('#unitFilter').focus();
      }
      assertDialogFocusRestored(
        await frame.evaluate(() => (
          document.activeElement?.classList.contains('artwork-image-button')
        )),
        `${mode} AP ${work.apNumber} ${expected.id}`,
      );
      if (injectFault && faultMode === 'duplicate-network-request') {
        assert.ok(requestObserver, `${mode} AP ${work.apNumber} request observer`);
        const exactReload = requestObserver.beginExactReload(expected.imageUrl);
        const exactReloadResult = await frame.evaluate((url) => new Promise((resolve, reject) => {
          const reload = new Image();
          const timer = setTimeout(
            () => reject(new Error(`Exact image reload timed out for ${url}`)),
            15_000,
          );
          const settle = (result) => {
            clearTimeout(timer);
            reload.onload = null;
            reload.onerror = null;
            resolve(result);
          };
          reload.onload = () => settle('loaded');
          reload.onerror = () => settle('errored');
          reload.src = url;
        }), expected.imageUrl);
        assert.equal(
          exactReloadResult,
          'loaded',
          `${mode} AP ${work.apNumber} ${expected.id} exact reload completion`,
        );
        const duplicateObservation = requestObserver.completeExactReload(
          expected.imageUrl,
          exactReload,
        );
        assert.equal(
          duplicateObservation.attempted,
          true,
          `${mode} AP ${work.apNumber} ${expected.id} exact reload attempted`,
        );
        assert.equal(
          duplicateObservation.routeObserved,
          false,
          `${mode} AP ${work.apNumber} ${expected.id} exact reload cache coalescing`,
        );
        assert.equal(
          duplicateObservation.fallbackObservationAdded,
          true,
          `${mode} AP ${work.apNumber} ${expected.id} fallback observation`,
        );
      }
    }
    assertExactImageRequests(imageRequests, work, mode);
    results.push({
      apNumber: work.apNumber,
      mode,
      views: work.images.map(({ id, imageUrl }) => ({
        id,
        imageUrl,
        requestCount: imageRequests.get(imageUrl),
      })),
    });
    if (faultMode && results.length >= maxWorks) break;
  }
  return results;
}

async function verifyU3StudyTabsAndComparison(page, frame, mode) {
  const studyWork = U3_WORKS.find(({ id }) => id === 'ap52-hagia-sophia');
  const comparisonWork = U3_WORKS.find(({ id }) => id === 'ap89-ecstasy-saint-teresa');
  assert.ok(studyWork, `${mode} AP 52 study fixture`);
  assert.ok(comparisonWork, `${mode} AP 89 comparison fixture`);
  await resetAndActivateWork(page, frame, studyWork);

  const expectedTabs = [
    { id: 'quick', label: '速览', headings: ['核心功能', '识别锚点'] },
    { id: 'form', label: '形式', headings: ['形式', '内容'] },
    { id: 'context', label: '语境', headings: ['历史语境', '图像内容'] },
    { id: 'compare', label: '比较', headings: [] },
  ];
  const tabs = frame.locator('.detail-tab');
  assert.equal(await tabs.count(), expectedTabs.length, `${mode} AP 52 study tab count`);
  for (let tabIndex = 0; tabIndex < expectedTabs.length; tabIndex += 1) {
    const expected = expectedTabs[tabIndex];
    await tabs.nth(tabIndex).click();
    assert.deepEqual(
      await tabs.evaluateAll((buttons) => buttons.map((button) => ({
        selected: button.getAttribute('aria-selected'),
        tabIndex: button.getAttribute('tabindex'),
      }))),
      expectedTabs.map((tab, index) => ({
        selected: String(index === tabIndex),
        tabIndex: index === tabIndex ? '0' : '-1',
      })),
      `${mode} AP 52 ${expected.label} tab state`,
    );
    const panel = frame.locator('#detail-tabpanel');
    assert.equal(await panel.getAttribute('aria-labelledby'), `detail-tab-${expected.id}`);
    assert.ok((await panel.textContent()).trim().length > 8);
    assert.deepEqual(await panel.locator('h3').allTextContents(), expected.headings);
  }

  await resetAndActivateWork(page, frame, comparisonWork);
  await frame.locator('#detail-tab-compare').click();
  const targetCard = frame.locator('.comparison-card[data-comparison-id="ap46-pantheon"]');
  assert.equal(await targetCard.count(), 1, `${mode} AP 89 to AP 46 comparison card`);
  await targetCard.click();
  const targetHeading = frame.locator('[data-selected-artwork-title]');
  await targetHeading.waitFor();
  assert.equal((await targetHeading.textContent()).trim(), 'Pantheon');
  assert.equal((await frame.locator('.work-meta').textContent()).trim().split(' · ')[0], 'AP #46');
  assert.equal(await frame.locator('#unitFilter').inputValue(), '2');
  assert.equal((await frame.locator('.result-count').textContent()).trim(), '当前显示 36 件作品');
  assert.equal(await frame.locator('#searchInput').inputValue(), '');
  await frame.waitForFunction(() => (
    document.activeElement === document.querySelector('[data-selected-artwork-title]')
  ));
  assert.equal(
    await frame.evaluate(() => (
      document.activeElement === document.querySelector('[data-selected-artwork-title]')
    )),
    true,
    `${mode} AP 46 comparison target focus`,
  );

  return {
    sourceApNumber: studyWork.apNumber,
    tabs: expectedTabs.map(({ id, label }) => ({ id, label })),
    comparisonSource: comparisonWork.apNumber,
    crossUnitTarget: 46,
  };
}

async function verifyU3Standalone(browser, baseUrl, faultOptions = null) {
  const viewport = { width: 1365, height: 768 };
  return withBrowserContext(browser, { viewport, reducedMotion: 'reduce' }, async (context) => {
    const page = await context.newPage();
    const issues = installErrorCollection(page, 'U3 fifty-one works standalone');
    const imageRequests = new Map();
    const requestObserver = createImageRequestObserver(imageRequests);
    await mockRemoteImages(page, requestObserver.observe);
    await page.goto(`${baseUrl}/art-history-map.html`, { waitUntil: 'load' });
    await waitForArt(page);
    const works = faultOptions
      ? await verifyU3Works(page, page, imageRequests, 'standalone', {
          ...faultOptions,
          requestObserver,
        })
      : await verifyU3Works(page, page, imageRequests, 'standalone');
    if (faultOptions) {
      assertNoCollectedIssues(issues, `U3 ${faultOptions.faultMode} assembled fault path`);
      return { viewport, works, faultMode: faultOptions.faultMode };
    }
    const study = await verifyU3StudyTabsAndComparison(page, page, 'standalone');
    assertNoCollectedIssues(issues, 'U3 standalone');
    return { viewport, works, study };
  });
}

async function verifyU3Embedded(browser, baseUrl) {
  const viewport = { width: 1365, height: 768 };
  return withBrowserContext(browser, { viewport, reducedMotion: 'reduce' }, async (context) => {
    const page = await context.newPage();
    const issues = installErrorCollection(page, 'U3 fifty-one works embedded');
    const imageRequests = new Map();
    await mockRemoteImages(page, (url) => {
      imageRequests.set(url, (imageRequests.get(url) || 0) + 1);
    });
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'load' });
    await page.locator('#home-map-embed').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => (
      document.querySelector('#worldMapFrame')?.contentDocument?.querySelector('.map-zone')
    ));
    const { frame } = await selectArtAndFrame(page, true);
    const works = await verifyU3Works(page, frame, imageRequests, 'embedded');
    const study = await verifyU3StudyTabsAndComparison(page, frame, 'embedded');
    assertNoCollectedIssues(issues, 'U3 embedded');
    return { viewport, works, study };
  });
}

async function verifyU4Standalone(browser, baseUrl, privateMode = false) {
  const viewport = { width: 1440, height: 900 };
  return withBrowserContext(browser, { viewport, reducedMotion: 'reduce' }, async (context) => {
    const page = await context.newPage();
    const label = `U4 standalone ${privateMode ? 'private' : 'public'}`;
    const issues = installErrorCollection(page, label);
    const remoteImageRequests = new Map();
    const privateImageRequests = new Map();
    const u5PrivateImageRequests = new Map();
    await mockRemoteImages(page, (url) => {
      remoteImageRequests.set(url, (remoteImageRequests.get(url) || 0) + 1);
    });
    if (privateMode) {
      await installU4PrivateRoutes(page, privateImageRequests);
      await installU5PrivateRoutes(page, u5PrivateImageRequests);
    }
    await page.goto(
      `${baseUrl}/art-history-map.html${privateMode ? '?privateMedia=1' : ''}`,
      { waitUntil: 'load' },
    );
    await waitForArt(page);
    const regions = await verifyU4RegionBranches(page, label);
    const works = await verifyU4Works(
      page,
      page,
      remoteImageRequests,
      privateImageRequests,
      label,
      { privateMode },
    );
    assert.equal(u5PrivateImageRequests.size, 0, `${label} U5 private image isolation`);
    assertNoCollectedIssues(issues, label);
    return { viewport, regions, works };
  });
}

async function verifyU4Embedded(browser, baseUrl, privateMode = false) {
  const viewport = { width: 1440, height: 900 };
  return withBrowserContext(browser, { viewport, reducedMotion: 'reduce' }, async (context) => {
    const page = await context.newPage();
    const label = `U4 embedded ${privateMode ? 'private' : 'public'}`;
    const issues = installErrorCollection(page, label);
    const remoteImageRequests = new Map();
    const privateImageRequests = new Map();
    const u5PrivateImageRequests = new Map();
    await mockRemoteImages(page, (url) => {
      remoteImageRequests.set(url, (remoteImageRequests.get(url) || 0) + 1);
    });
    if (privateMode) {
      await installU4PrivateRoutes(page, privateImageRequests);
      await installU5PrivateRoutes(page, u5PrivateImageRequests);
    }
    await page.goto(
      `${baseUrl}/index.html${privateMode ? '?privateMedia=1' : ''}`,
      { waitUntil: 'load' },
    );
    await page.locator('#home-map-embed').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => (
      document.querySelector('#worldMapFrame')?.contentDocument?.querySelector('.map-zone')
    ));
    const { frame } = await selectArtAndFrame(page, true);
    const regions = await verifyU4RegionBranches(frame, label);
    const works = await verifyU4Works(
      page,
      frame,
      remoteImageRequests,
      privateImageRequests,
      label,
      { privateMode },
    );
    assert.equal(u5PrivateImageRequests.size, 0, `${label} U5 private image isolation`);
    assertNoCollectedIssues(issues, label);
    return { viewport, regions, works };
  });
}

async function verifyU4PrivateNegativePaths(browser, baseUrl) {
  const viewport = { width: 1365, height: 768 };
  const missingScript = await withBrowserContext(
    browser,
    { viewport, reducedMotion: 'reduce' },
    async (context) => {
      const page = await context.newPage();
      await mockRemoteImages(page);
      await installU4PrivateRoutes(page, new Map(), { includeScript: false });
      await page.goto(`${baseUrl}/art-history-map.html?privateMedia=1`, { waitUntil: 'load' });
      await waitForArt(page);
      await verifyU4PrivateFallbacks(page, page, 'U4 missing private script');
      return true;
    },
  );
  const missingImage = await withBrowserContext(
    browser,
    { viewport, reducedMotion: 'reduce' },
    async (context) => {
      const page = await context.newPage();
      await mockRemoteImages(page);
      await installU4PrivateRoutes(page, new Map(), { includeImages: false });
      await page.goto(`${baseUrl}/art-history-map.html?privateMedia=1`, { waitUntil: 'load' });
      await waitForArt(page);
      await verifyU4PrivateFallbacks(page, page, 'U4 missing private image');
      return true;
    },
  );
  return { missingScript, missingImage, status: 'Private image not installed' };
}

async function installU5PrivateRoutes(
  page,
  privateImageRequests,
  { includeScript = true, includeImages = true, missingIdentity = null } = {},
) {
  const overrides = validateU5PrivateOverrides(createU5PrivateOverrides());
  await page.route('**/.private-media/u5/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname.endsWith(U5_PRIVATE_SCRIPT_PATH)) {
      if (!includeScript) {
        await route.fulfill({ status: 404, body: '' });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/javascript; charset=utf-8',
        body: `window.AP_ART_HISTORY_PRIVATE_MEDIA_U5 = Object.freeze(${JSON.stringify(overrides)});`,
      });
      return;
    }
    const localPath = requestUrl.pathname.replace(/^\//, '');
    privateImageRequests.set(localPath, (privateImageRequests.get(localPath) || 0) + 1);
    if (!includeImages || (missingIdentity && localPath === u5PrivatePath(missingIdentity))) {
      await route.fulfill({ status: 404, body: '' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: IMAGE_FIXTURE,
    });
  });
  return overrides;
}

async function verifyU5RegionBranches(frame, mode) {
  await frame.locator('#unitFilter').selectOption('5');
  await waitForPostTransformRender(frame);
  assert.equal(
    (await frame.locator('.result-count').textContent()).trim(),
    '当前显示 14 件作品',
    `${mode} U5 result count`,
  );
  const regionLabels = await frame
    .locator('.site-marker[data-group-kind="region"]')
    .evaluateAll((markers) => markers.map((marker) => marker.getAttribute('aria-label')));
  assertU5RegionTraversalCoverage(regionLabels, `${mode} U5 regions`);
  return regionLabels;
}

async function verifyU5StudyTabsAndComparison(page, frame, work, mode, recordOverflow) {
  const expectedTabs = [
    { id: 'quick', label: '速览' },
    { id: 'form', label: '形式' },
    { id: 'context', label: '语境' },
    { id: 'compare', label: '比较' },
  ];
  const tabs = frame.locator('.detail-tab');
  assert.equal(await tabs.count(), expectedTabs.length, `${mode} AP ${work.apNumber} tab count`);
  assert.deepEqual(
    await tabs.allTextContents(),
    expectedTabs.map(({ label }) => label),
    `${mode} AP ${work.apNumber} tab labels`,
  );
  await recordOverflow(`${mode} AP ${work.apNumber} before tabs`);
  for (const { id } of expectedTabs) {
    const tab = frame.locator(`#detail-tab-${id}`);
    await tab.click();
    assert.equal(await tab.getAttribute('aria-selected'), 'true', `${mode} AP ${work.apNumber} ${id} tab`);
    assert.equal(
      await frame.locator('#detail-tabpanel').getAttribute('aria-labelledby'),
      `detail-tab-${id}`,
      `${mode} AP ${work.apNumber} ${id} panel owner`,
    );
    assert.ok(
      (await frame.locator('#detail-tabpanel').textContent()).trim().length > 0,
      `${mode} AP ${work.apNumber} ${id} panel content`,
    );
    await recordOverflow(`${mode} AP ${work.apNumber} after ${id} tab`);
  }

  const comparisonCard = frame.locator('.comparison-card').first();
  assert.equal(await comparisonCard.count(), 1, `${mode} AP ${work.apNumber} comparison card`);
  assert.equal(
    await comparisonCard.getAttribute('data-comparison-id'),
    work.comparisonIds[0],
    `${mode} AP ${work.apNumber} comparison target`,
  );
  const targetMeta = (await comparisonCard.locator('span').first().textContent()).trim();
  const targetApNumber = Number(targetMeta.match(/AP #(\d+)/)?.[1]);
  assert.ok(Number.isInteger(targetApNumber), `${mode} AP ${work.apNumber} comparison AP number`);
  await recordOverflow(`${mode} AP ${work.apNumber} before comparison`);
  await comparisonCard.focus();
  await comparisonCard.click();
  const heading = frame.locator('[data-selected-artwork-title]');
  await heading.waitFor();
  assert.equal(
    (await frame.locator('.work-meta').textContent()).trim().split(' · ')[0],
    `AP #${targetApNumber}`,
    `${mode} AP ${work.apNumber} comparison navigation`,
  );
  assert.equal(await frame.locator('#searchInput').inputValue(), '');
  assert.equal(
    await frame.evaluate(() => document.activeElement === document.querySelector('[data-selected-artwork-title]')),
    true,
    `${mode} AP ${work.apNumber} comparison target focus`,
  );
  await recordOverflow(`${mode} AP ${work.apNumber} after comparison`);
  await resetAndActivateWork(page, frame, work);
  await recordOverflow(`${mode} AP ${work.apNumber} restored after comparison`);
  return true;
}

async function verifyU5Works(
  page,
  frame,
  remoteImageRequests,
  privateImageRequests,
  allRequests,
  mode,
  {
    privateMode = false,
    overflowHistory = [],
    resetRequestCache = async () => {},
  } = {},
) {
  const results = [];
  const observedPrivateImageRequests = new Map();
  const privateOverrides = validateU5PrivateOverrides(createU5PrivateOverrides());
  for (const work of U5_RENDER_WORKS) {
    const overflowCheckpointStart = overflowHistory.length;
    let remoteRequestBoundary;
    let privateRequestBoundary;
    await resetAndActivateWork(
      page,
      frame,
      work,
      () => {},
      async () => {
        await resetRequestCache();
        remoteRequestBoundary = snapshotRequestCounts(remoteImageRequests);
        privateRequestBoundary = snapshotRequestCounts(privateImageRequests);
      },
    );
    const recordOverflow = (checkpoint) => recordU5HorizontalOverflow(
      frame,
      overflowHistory,
      checkpoint,
    );
    const summary = frame.locator('.selected-summary');
    assert.equal(
      (await summary.locator('[data-selected-artwork-title]').textContent()).trim(),
      work.titleEn,
      `${mode} AP ${work.apNumber} English title`,
    );
    assert.equal(
      (await summary.locator('.work-title-zh').textContent()).trim(),
      work.titleZh,
      `${mode} AP ${work.apNumber} Chinese subtitle`,
    );
    const viewButtons = summary.locator('.image-view-switcher button');
    assert.equal(
      await viewButtons.count(),
      work.images.length > 1 ? work.images.length : 0,
      `${mode} AP ${work.apNumber} view button count`,
    );
    if (work.images.length > 1) {
      assert.deepEqual(
        await viewButtons.allTextContents(),
        work.images.map(({ label }) => label),
        `${mode} AP ${work.apNumber} ordered view labels`,
      );
    }

    for (let imageIndex = 0; imageIndex < work.images.length; imageIndex += 1) {
      const expected = work.images[imageIndex];
      const identity = `${work.id}::${expected.id}`;
      const restricted = expected.mediaStatus === 'rightsRestricted';
      if (work.images.length > 1 && imageIndex > 0) await viewButtons.nth(imageIndex).click();
      if (work.images.length > 1) {
        assert.deepEqual(
          await viewButtons.evaluateAll((buttons) => (
            buttons.map((button) => button.getAttribute('aria-pressed'))
          )),
          work.images.map((image, index) => String(index === imageIndex)),
          `${mode} ${identity} pressed state`,
        );
      }

      if (restricted && !privateMode) {
        const placeholder = summary.locator('.rights-placeholder');
        await placeholder.waitFor();
        assert.match(
          (await placeholder.textContent()).trim(),
          /Image unavailable in the public version/,
          `${mode} ${identity} public placeholder`,
        );
        assert.equal(
          await placeholder.locator('.rights-placeholder-source').getAttribute('href'),
          expected.imageSourceUrl,
          `${mode} ${identity} official source`,
        );
        assert.equal(await summary.locator('.artwork-image-button').count(), 0);
        assert.equal(await frame.locator('#imageDialog').getAttribute('open'), null);
        await recordOverflow(`${mode} AP ${work.apNumber} ${expected.id} view`);
        continue;
      }

      const expectedImageUrl = restricted
        ? privateOverrides[identity].filePath
        : expected.imageUrl;
      const imageButton = summary.locator('.artwork-image-button');
      const image = imageButton.locator('img');
      await waitForVerifierImage(image, `${mode} ${identity} ${expectedImageUrl}`);
      assert.equal(await image.getAttribute('src'), expectedImageUrl, `${mode} ${identity} image URL`);
      assert.equal(await image.getAttribute('alt'), expected.imageAlt, `${mode} ${identity} image alt`);
      const inlineLinks = summary.locator('.image-credit-host .image-credit a');
      assert.equal(await inlineLinks.count(), 2, `${mode} ${identity} credit links`);
      assert.equal(
        await inlineLinks.nth(1).getAttribute('href'),
        expected.imageSourceUrl,
        `${mode} ${identity} source link`,
      );
      if (restricted) {
        assert.equal(
          await inlineLinks.nth(0).getAttribute('href'),
          privateOverrides[identity].rightsUrl,
          `${mode} ${identity} private rights link`,
        );
      }

      await imageButton.focus();
      await imageButton.click();
      const dialog = frame.locator('#imageDialog');
      await dialog.waitFor({ state: 'visible' });
      const dialogImage = frame.locator('#dialogImage');
      await waitForVerifierImage(dialogImage, `${mode} ${identity} dialog ${expectedImageUrl}`);
      assert.equal(await dialogImage.getAttribute('src'), expectedImageUrl);
      assert.equal(await dialogImage.getAttribute('alt'), expected.imageAlt);
      assert.equal(await frame.locator('#dialogSource').getAttribute('href'), expected.imageSourceUrl);
      if (mode === 'embedded') {
        // The image trigger can scroll the parent page toward the iframe's lower
        // portion. Real portrait images place the modal close near its top.
        await page.locator('#artMapFrame').evaluate(element => {
          element.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
        });
      }
      await frame.locator('#dialogClose').click();
      await waitForPostTransformRender(frame);
      await dialog.waitFor({ state: 'hidden' });
      assertDialogFocusRestored(
        await frame.evaluate(() => document.activeElement?.classList.contains('artwork-image-button')),
        `${mode} ${identity}`,
      );
      await recordOverflow(`${mode} AP ${work.apNumber} ${expected.id} view`);
    }

    const currentRemoteImageRequests = requestCountsSince(
      remoteImageRequests,
      remoteRequestBoundary,
    );
    const publicViews = work.images.filter(({ imageUrl }) => imageUrl !== null);
    assert.equal(
      currentRemoteImageRequests.size,
      publicViews.length,
      `${mode} AP ${work.apNumber} public image request set`,
    );
    for (const image of publicViews) {
      assert.equal(
        currentRemoteImageRequests.get(image.imageUrl),
        1,
        `${mode} AP ${work.apNumber} ${image.id} public request count`,
      );
    }
    const privateViews = privateMode
      ? work.images.filter(({ mediaStatus }) => mediaStatus === 'rightsRestricted')
      : [];
    const currentPrivateImageRequests = requestCountsSince(
      privateImageRequests,
      privateRequestBoundary,
    );
    assert.equal(
      currentPrivateImageRequests.size,
      privateViews.length,
      `${mode} AP ${work.apNumber} private image request set`,
    );
    for (const image of privateViews) {
      const path = u5PrivatePath(`${work.id}::${image.id}`);
      assert.equal(
        currentPrivateImageRequests.get(path),
        1,
        `${mode} AP ${work.apNumber} ${image.id} private request count`,
      );
    }
    mergeRequestCounts(observedPrivateImageRequests, currentPrivateImageRequests);
    const comparisonFollowed = await verifyU5StudyTabsAndComparison(
      page,
      frame,
      work,
      mode,
      recordOverflow,
    );
    results.push({
      apNumber: work.apNumber,
      mode,
      privateMode,
      views: work.images.length,
      tabs: 4,
      comparisonFollowed,
      overflowCheckpoints: overflowHistory.length - overflowCheckpointStart,
    });
  }
  assert.equal(
    observedPrivateImageRequests.size,
    privateMode ? U5_PRIVATE_MEDIA_KEYS.length : 0,
    `${mode} U5 exact private request set`,
  );
  if (privateMode) {
    for (const identity of U5_PRIVATE_MEDIA_KEYS) {
      const path = u5PrivatePath(identity);
      assert.equal(
        observedPrivateImageRequests.get(path),
        1,
        `${mode} ${identity} private request count`,
      );
    }
  }
  if (!privateMode) assertNoU5RestrictedPublicRequests(allRequests, `${mode} U5 public mode`);
  return results;
}

async function verifyU5Page(browser, baseUrl, viewport, mode, privateMode = false) {
  return withBrowserContext(browser, {
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'reduce',
    hasTouch: viewport.name === 'narrow-touch',
  }, async (context) => {
    const page = await context.newPage();
    const cacheControlSession = await context.newCDPSession(page);
    await cacheControlSession.send('Network.enable');
    await cacheControlSession.send('Network.setCacheDisabled', { cacheDisabled: true });
    const label = `U5 ${viewport.name} ${mode} ${privateMode ? 'private' : 'public'}`;
    const issues = installErrorCollection(page, label);
    const remoteImageRequests = new Map();
    const privateImageRequests = new Map();
    const u4PrivateImageRequests = new Map();
    const allRequests = [];
    const overflowHistory = [];
    page.on('request', (request) => {
      allRequests.push(request.url());
      if (request.resourceType() === 'image') {
        recordU5LocalImageRequest(remoteImageRequests, request.url(), baseUrl);
      }
    });
    await mockRemoteImages(page, (url) => {
      remoteImageRequests.set(url, (remoteImageRequests.get(url) || 0) + 1);
    });
    if (privateMode) {
      await installU4PrivateRoutes(page, u4PrivateImageRequests);
      await installU5PrivateRoutes(page, privateImageRequests);
    }

    let frame = page;
    if (mode === 'standalone') {
      await page.goto(
        `${baseUrl}/art-history-map.html${privateMode ? '?privateMedia=1' : ''}`,
        { waitUntil: 'load' },
      );
      await waitForArt(page);
    } else {
      await page.goto(
        `${baseUrl}/index.html${privateMode ? '?privateMedia=1' : ''}`,
        { waitUntil: 'load' },
      );
      await page.locator('#home-map-embed').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => (
        document.querySelector('#worldMapFrame')?.contentDocument?.querySelector('.map-zone')
      ));
      ({ frame } = await selectArtAndFrame(page, true));
    }

    const regions = await verifyU5RegionBranches(frame, label);
    const works = await verifyU5Works(
      page,
      frame,
      remoteImageRequests,
      privateImageRequests,
      allRequests,
      mode,
      {
        privateMode,
        overflowHistory,
        resetRequestCache: () => cacheControlSession.send('Network.clearBrowserCache'),
      },
    );
    assertU5HorizontalOverflowHistory(overflowHistory, label);
    const metrics = await geometry(frame);
    assertNoHorizontalOverflow(metrics.horizontalOverflow, label);
    assertNoCollectedIssues(issues, label);
    assert.equal(
      u4PrivateImageRequests.size,
      0,
      `${label} must not request U4 private images while traversing U5`,
    );
    return {
      viewport,
      mode,
      privateMode,
      regions,
      horizontalOverflow: metrics.horizontalOverflow,
      works,
      restrictedPrivateViews: privateMode ? U5_PRIVATE_MEDIA_KEYS.length : 0,
      restrictedPublicRequests: 0,
    };
  });
}

async function verifyU5Standalone(browser, baseUrl, viewport, privateMode = false) {
  return verifyU5Page(browser, baseUrl, viewport, 'standalone', privateMode);
}

async function verifyU5Embedded(browser, baseUrl, viewport, privateMode = false) {
  return verifyU5Page(browser, baseUrl, viewport, 'embedded', privateMode);
}

async function verifyU5PrivateNegativePaths(browser, baseUrl) {
  const viewport = U5_MATRIX_VIEWPORTS[0];
  const missingIdentity = 'ap164-transformation-mask::open';
  assert.ok(U5_PRIVATE_MEDIA_KEYS.includes(missingIdentity), 'AP 164 open private fixture');
  return withBrowserContext(
    browser,
    {
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: 'reduce',
    },
    async (context) => {
      const page = await context.newPage();
      const privateImageRequests = new Map();
      await mockRemoteImages(page);
      await installU4PrivateRoutes(page, new Map());
      await installU5PrivateRoutes(page, privateImageRequests, { missingIdentity });
      await page.goto(`${baseUrl}/art-history-map.html?privateMedia=1`, { waitUntil: 'load' });
      await waitForArt(page);
      const work = U5_RENDER_WORKS.find(({ apNumber }) => apNumber === 164);
      await resetAndActivateWork(page, page, work);
      const viewButtons = page.locator('.image-view-switcher button');
      assert.deepEqual(await viewButtons.allTextContents(), ['Closed state', 'Open state']);
      const closedIdentity = 'ap164-transformation-mask::closed';
      const closedPath = u5PrivatePath(closedIdentity);
      const closedImage = page.locator('.artwork-image-button img');
      await waitForVerifierImage(closedImage, 'U5 AP 164 closed fallback setup');
      assert.equal(await closedImage.getAttribute('src'), closedPath);
      await viewButtons.nth(1).click();
      const placeholder = page.locator('.rights-placeholder');
      await placeholder.waitFor();
      assert.match(await placeholder.textContent(), /Private image not installed/);
      assert.equal(await page.locator('.artwork-image-button').count(), 0);
      assert.equal(await page.locator(`img[src="${closedPath}"]`).count(), 0);
      assert.equal(await page.locator('#imageDialog').getAttribute('open'), null);
      assert.deepEqual(
        await viewButtons.evaluateAll((buttons) => (
          buttons.map((button) => button.getAttribute('aria-pressed'))
        )),
        ['false', 'true'],
      );
      assert.equal(
        privateImageRequests.get(closedPath),
        1,
        'U5 AP 164 closed private request count',
      );
      assert.equal(
        privateImageRequests.get(u5PrivatePath(missingIdentity)),
        1,
        'U5 missing private image request count',
      );
      return { missingIdentity, status: 'Private image not installed' };
    },
  );
}

async function runU5RenderedMatrix(browser, baseUrl) {
  const matrix = [];
  for (const viewport of U5_MATRIX_VIEWPORTS) {
    matrix.push({
      viewport,
      public: {
        standalone: await verifyU5Standalone(browser, baseUrl, viewport),
        embedded: await verifyU5Embedded(browser, baseUrl, viewport),
      },
      private: {
        standalone: await verifyU5Standalone(browser, baseUrl, viewport, true),
        embedded: await verifyU5Embedded(browser, baseUrl, viewport, true),
      },
    });
  }
  assertU5RenderedMatrixCoverage(matrix);
  return matrix;
}

async function verifyU1Standalone(browser, baseUrl) {
  const viewport = { width: 1440, height: 900 };
  return withBrowserContext(browser, { viewport, reducedMotion: 'reduce' }, async (context) => {
    const page = await context.newPage();
    const issues = installErrorCollection(page, 'U1 eleven works standalone');
    const imageRequests = new Map();
    await mockRemoteImages(page, (url) => {
      imageRequests.set(url, (imageRequests.get(url) || 0) + 1);
    });
    await page.goto(`${baseUrl}/art-history-map.html`, { waitUntil: 'load' });
    await waitForArt(page);
    const works = await verifyU1Works(page, page, imageRequests, 'standalone');
    const study = await verifyU1StudyTabsAndComparison(page, page, 'standalone');
    assert.deepEqual(issues, []);
    return { viewport, works, study };
  });
}

async function verifyU1Embedded(browser, baseUrl) {
  const viewport = { width: 1024, height: 768 };
  return withBrowserContext(browser, { viewport, reducedMotion: 'reduce' }, async (context) => {
    const page = await context.newPage();
    const issues = installErrorCollection(page, 'U1 eleven works embedded');
    const imageRequests = new Map();
    await mockRemoteImages(page, (url) => {
      imageRequests.set(url, (imageRequests.get(url) || 0) + 1);
    });
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'load' });
    await page.locator('#home-map-embed').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => (
      document.querySelector('#worldMapFrame')?.contentDocument?.querySelector('.map-zone')
    ));
    const { frame } = await selectArtAndFrame(page, true);
    const works = await verifyU1Works(page, frame, imageRequests, 'embedded');
    const study = await verifyU1StudyTabsAndComparison(page, frame, 'embedded');
    assert.deepEqual(issues, []);
    return { viewport, works, study };
  });
}

async function verifyImportedWorksStandalone(browser, baseUrl) {
  const viewport = { width: 1440, height: 900 };
  return withBrowserContext(browser, { viewport, reducedMotion: 'reduce' }, async (context) => {
    const page = await context.newPage();
    const issues = installErrorCollection(page, 'nine works standalone');
    const imageRequests = [];
    await mockRemoteImages(page, (url) => imageRequests.push(url));
    await page.goto(`${baseUrl}/art-history-map.html`, { waitUntil: 'load' });
    await waitForArt(page);
    assert.equal(
      (await page.locator('.page-header h1').textContent()).trim(),
      'AP 艺术史互动地图 · Units 1-10',
    );
    const works = await verifyNineImportedWorks(page, page, imageRequests, 'standalone');
    assert.deepEqual(issues, []);
    return { viewport, works };
  });
}

async function verifyImportedWorksEmbedded(browser, baseUrl) {
  const viewport = { width: 1024, height: 768 };
  return withBrowserContext(browser, { viewport, reducedMotion: 'reduce' }, async (context) => {
    const page = await context.newPage();
    const issues = installErrorCollection(page, 'nine works embedded');
    const imageRequests = [];
    await mockRemoteImages(page, (url) => imageRequests.push(url));
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'load' });
    await page.locator('#home-map-embed').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => (
      document.querySelector('#worldMapFrame')?.contentDocument?.querySelector('.map-zone')
    ));
    const { frame } = await selectArtAndFrame(page, true);
    const works = await verifyNineImportedWorks(page, frame, imageRequests, 'embedded');
    assert.deepEqual(issues, []);
    return { viewport, works };
  });
}

async function verifyResponsiveWarningRegression(browser, baseUrl) {
  const viewport = { width: 519, height: 700 };
  await assert.rejects(
    verifyStandalone(
      browser,
      baseUrl,
      viewport,
      false,
      { injectConsoleIssue: 'warning' },
    ),
    /responsive warning regression/,
  );
  await assert.rejects(
    verifyStandalone(
      browser,
      baseUrl,
      viewport,
      false,
      { injectConsoleIssue: 'error' },
    ),
    /responsive error regression/,
  );
  return { viewport, warningRejected: true, errorRejected: true };
}

async function selectU6Work(page, frame, work) {
  await fillSearchThroughUi(frame.locator('#searchInput'), '', `AP ${work.apNumber} clear search`);
  await frame.locator('#unitFilter').selectOption('6');
  await frame.locator('#resetView').click();
  await fillSearchThroughUi(frame.locator('#searchInput'), `AP ${work.apNumber}`, `AP ${work.apNumber} search`);
  assert.equal((await frame.locator('.result-count').textContent()).trim(), '当前显示 1 件作品');
  const region = frame.locator('.site-marker[data-group-kind="region"]');
  assert.equal(await region.count(), 1, `AP ${work.apNumber} exact region`);
  const regionName = { southernAfrica: 'Southern Africa', westAfrica: 'West Africa', centralAfrica: 'Central Africa' }[work.region];
  assert.equal(await region.getAttribute('aria-label'), `${regionName} · 1 piece`);
  await region.focus();
  await page.keyboard.press('Enter');
  const site = frame.locator('.site-marker[data-group-kind="site"]');
  await site.waitFor();
  assert.equal(await site.count(), 1, `AP ${work.apNumber} exact site`);
  assert.equal(await site.getAttribute('aria-label'), `${work.siteName} · AP ${work.apNumber} · 1 piece`);
  await site.focus();
  await page.keyboard.press('Space');
  const heading = frame.locator('[data-selected-artwork-title]');
  await heading.waitFor();
  assert.equal((await heading.textContent()).trim(), work.titleEn, `AP ${work.apNumber} selected title`);
  assert.equal((await frame.locator('.work-meta').textContent()).trim().split(' · ')[0], `AP #${work.apNumber}`);
}

async function verifyU6SmokeCase(browser, baseUrl, viewport, works) {
  return withBrowserContext(browser, {
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'reduce',
    hasTouch: viewport.width === 390,
  }, async (context) => {
    const page = await context.newPage();
    const label = `U6 ${viewport.mode} ${viewport.width}x${viewport.height}`;
    const issues = installErrorCollection(page, label);
    // Deterministic media transport, shared with the full verifier. URL/alt/source
    // contracts below still check the actual rendered public image or placeholder.
    await mockRemoteImages(page);
    let frame = page;
    if (viewport.mode === 'standalone') {
      await page.goto(`${baseUrl}/art-history-map.html`, { waitUntil: 'load' });
      await waitForArt(frame);
    } else {
      await page.goto(`${baseUrl}/index.html`, { waitUntil: 'load' });
      await page.locator('#home-map-embed').scrollIntoViewIfNeeded();
      ({ frame } = await selectArtAndFrame(page, true));
    }
    await frame.locator('#unitFilter').selectOption('6');
    await waitForPostTransformRender(frame);
    assert.equal((await frame.locator('.result-count').textContent()).trim(), '当前显示 14 件作品');
    const regions = await frame.locator('.site-marker[data-group-kind="region"]')
      .evaluateAll((markers) => markers.map((marker) => marker.getAttribute('aria-label')));
    assert.deepEqual(regions, U6_REGION_LABELS, `${label} exact three regions`);
    const overflowHistory = [];
    const recordOverflow = async (checkpoint) => {
      await waitForPostTransformRender(frame);
      const measure = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const horizontalOverflow = await frame.evaluate(measure);
      const hostHorizontalOverflow = await page.evaluate(measure);
      assertNoHorizontalOverflow(horizontalOverflow, `${label} ${checkpoint}`);
      assertNoHorizontalOverflow(hostHorizontalOverflow, `${label} host ${checkpoint}`);
      overflowHistory.push({ checkpoint, horizontalOverflow, hostHorizontalOverflow });
    };
    await recordOverflow('regions');
    const evidence = [];
    let comparison;
    let dialog;
    let viewButtonActivations = 0;
    let singleViewSelections = 0;
    for (const work of works) {
      await selectU6Work(page, frame, work);
      await recordOverflow(`AP ${work.apNumber} selected`);
      const summary = frame.locator('.selected-summary');
      assert.equal((await summary.locator('.work-title-zh').textContent()).trim(), work.titleZh);
      const viewButtons = summary.locator('.image-view-switcher button');
      assert.equal(await viewButtons.count(), work.images.length > 1 ? work.images.length : 0);
      if (work.images.length > 1) {
        assert.deepEqual(await viewButtons.allTextContents(), work.images.map(({ label: viewLabel }) => viewLabel));
      }
      const viewIds = [];
      for (const [imageIndex, expected] of work.images.entries()) {
        const identity = `AP ${work.apNumber} ${expected.id}`;
        if (work.images.length > 1) {
          await viewButtons.nth(imageIndex).click();
          viewButtonActivations += 1;
          assert.deepEqual(await viewButtons.evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-pressed'))),
            work.images.map((_, index) => String(index === imageIndex)), `${label} ${identity} active view`);
        } else {
          // The existing UI exposes a sole primary view via its site control,
          // without a redundant one-item switcher. selectU6Work activated it.
          singleViewSelections += 1;
        }
        if (expected.imageUrl === null) {
          const placeholder = summary.locator('.rights-placeholder');
          await placeholder.waitFor();
          assert.match(await placeholder.textContent(), /Reusable image not yet verified/);
          assert.ok((await placeholder.textContent()).includes(expected.mediaStatus), `${label} ${identity} status`);
          assert.equal(await placeholder.locator('.rights-placeholder-source').getAttribute('href'), expected.imageSourceUrl);
          assert.equal(await summary.locator('.artwork-image-button').count(), 0);
          assert.equal(await frame.locator('#imageDialog').getAttribute('open'), null);
        } else {
          const trigger = summary.locator('.artwork-image-button');
          const image = trigger.locator('img');
          await waitForVerifierImage(image, `${label} ${identity}`);
          assert.equal(await image.getAttribute('src'), expected.imageUrl);
          assert.equal(await image.getAttribute('alt'), expected.imageAlt);
          assert.equal(await summary.locator('.image-credit a').nth(1).getAttribute('href'), expected.imageSourceUrl);
          if (work.apNumber === 167 && expected.id === 'conical-tower') {
            await trigger.focus();
            await trigger.click();
            await frame.locator('#imageDialog').waitFor({ state: 'visible' });
            await waitForVerifierImage(frame.locator('#dialogImage'), `${label} ${identity} dialog`);
            assert.equal(await frame.locator('#dialogImage').getAttribute('src'), expected.imageUrl);
            assert.equal(await frame.locator('#dialogSource').getAttribute('href'), expected.imageSourceUrl);
            await recordOverflow('public image dialog open');
            await frame.locator('#dialogClose').click();
            await waitForPostTransformRender(frame);
            await frame.locator('#imageDialog').waitFor({ state: 'hidden' });
            const focusRestored = await trigger.evaluate((element) => document.activeElement === element);
            assertDialogFocusRestored(focusRestored, `${label} ${identity}`);
            dialog = { apNumber: work.apNumber, viewId: expected.id, focusRestored };
          }
        }
        viewIds.push(expected.id);
        await recordOverflow(identity);
      }
      const tabIds = [];
      assert.equal(await frame.locator('.detail-tab').count(), 4);
      for (const id of U6_TAB_IDS) {
        const tab = frame.locator(`#detail-tab-${id}`);
        await tab.click();
        assert.equal(await tab.getAttribute('aria-selected'), 'true', `${label} AP ${work.apNumber} ${id}`);
        const panel = frame.locator('#detail-tabpanel');
        assert.equal(await panel.getAttribute('aria-labelledby'), `detail-tab-${id}`);
        assert.ok((await panel.textContent()).trim().length > 0);
        tabIds.push(id);
        await recordOverflow(`AP ${work.apNumber} ${id} tab`);
      }
      if (work.apNumber === 167) {
        const card = frame.locator('.comparison-card').first();
        const targetId = await card.getAttribute('data-comparison-id');
        assert.equal(targetId, work.comparisonIds[0], `${label} comparison target`);
        const targetApNumber = Number((await card.locator('span').first().textContent()).match(/AP #(\d+)/)?.[1]);
        assert.ok(Number.isInteger(targetApNumber));
        await card.click();
        assert.equal((await frame.locator('.work-meta').textContent()).trim().split(' · ')[0], `AP #${targetApNumber}`);
        assert.equal(await frame.locator('#searchInput').inputValue(), '');
        await recordOverflow('comparison followed');
        await selectU6Work(page, frame, work);
        await recordOverflow('comparison returned');
        comparison = { fromApNumber: work.apNumber, targetId, targetApNumber, followed: true, returned: true };
      }
      evidence.push({ apNumber: work.apNumber, selected: true, viewIds, tabIds });
    }
    await recordOverflow('final');
    assertNoCollectedIssues(issues, label);
    assert.equal(viewButtonActivations, 18, `${label} every multi-view button activated`);
    assert.equal(singleViewSelections, 5, `${label} every sole primary view selected`);
    const final = overflowHistory.at(-1);
    return {
      viewport, regions, works: evidence,
      workCount: evidence.length,
      viewCount: evidence.reduce((count, work) => count + work.viewIds.length, 0),
      tabCount: evidence.reduce((count, work) => count + work.tabIds.length, 0),
      viewButtonActivations, singleViewSelections, comparison, dialog,
      horizontalOverflow: final.horizontalOverflow,
      hostHorizontalOverflow: final.hostHorizontalOverflow,
      overflowHistory, issues,
    };
  });
}

export async function runFocusedImportedVerification() {
  const playwright = await discoverPlaywright();
  const executablePath = await discoverBrowser(playwright.chromium);
  return runManagedVerification({
    startServer: () => startStaticServer(),
    launchBrowser: () => playwright.chromium.launch({
      executablePath,
      headless: true,
      args: ['--disable-gpu', '--no-sandbox'],
    }),
    verify: async ({ server, browser }) => ({
      standalone: await verifyImportedWorksStandalone(browser, server.baseUrl),
      embedded: await verifyImportedWorksEmbedded(browser, server.baseUrl),
    }),
  });
}

export async function runFocusedWarningVerification() {
  const playwright = await discoverPlaywright();
  const executablePath = await discoverBrowser(playwright.chromium);
  return runManagedVerification({
    startServer: () => startStaticServer(),
    launchBrowser: () => playwright.chromium.launch({
      executablePath,
      headless: true,
      args: ['--disable-gpu', '--no-sandbox'],
    }),
    verify: async ({ server, browser }) => (
      verifyResponsiveWarningRegression(browser, server.baseUrl)
    ),
  });
}

export async function runFocusedU5Verification() {
  const playwright = await discoverPlaywright();
  const executablePath = await discoverBrowser(playwright.chromium);
  return runManagedVerification({
    startServer: () => startStaticServer(),
    launchBrowser: () => playwright.chromium.launch({
      executablePath,
      headless: true,
      args: ['--disable-gpu', '--no-sandbox'],
    }),
    verify: async ({ server, browser }) => ({
      kind: 'u5-fourteen-works',
      matrix: await runU5RenderedMatrix(browser, server.baseUrl),
      negativePaths: await verifyU5PrivateNegativePaths(browser, server.baseUrl),
    }),
  });
}

export async function runFocusedU6Verification() {
  const html = await readFile(join(PROJECT_ROOT, 'art-history-map.html'), 'utf8');
  const dataBlock = html.match(/<script id="artwork-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(dataBlock, 'U6 artwork-data block');
  const works = parseVerifierJson(dataBlock[1], 'U6 artwork data')
    .filter(({ unit }) => unit === 6).sort((left, right) => left.apNumber - right.apNumber);
  const manifest = parseVerifierJson(await readFile(join(PROJECT_ROOT, 'data', 'ap-art-history-unit-6-manifest.json'), 'utf8'), 'U6 manifest');
  assert.deepEqual(works.map(({ apNumber }) => apNumber), Array.from({ length: 14 }, (_, index) => 167 + index));
  for (const [index, work] of works.entries()) {
    const expected = manifest[work.apNumber];
    for (const field of ['id', 'titleEn', 'region', 'siteName']) {
      assert.equal(work[field], expected[field], `U6 AP ${work.apNumber} manifest ${field}`);
    }
    assert.deepEqual(work.images.map(({ id }) => id), U6_VIEW_IDS[index]);
    assert.deepEqual(expected.requiredViewIds, U6_VIEW_IDS[index]);
  }
  const playwright = await discoverPlaywright();
  const executablePath = await discoverBrowser(playwright.chromium);
  return runManagedVerification({
    startServer: () => startStaticServer(),
    launchBrowser: () => playwright.chromium.launch({
      executablePath, headless: true, args: ['--disable-gpu', '--no-sandbox'],
    }),
    verify: async ({ server, browser }) => {
      const report = { kind: 'u6-fourteen-works', cases: [] };
      for (const viewport of U6_SMOKE_VIEWPORTS) {
        report.cases.push(await verifyU6SmokeCase(browser, server.baseUrl, viewport, works));
      }
      assertU6SmokeCoverage(report);
      return report;
    },
  });
}

export async function runFocusedU3FaultVerification(faultMode) {
  assert.ok(U3_FAULT_MODES.includes(faultMode), `Unknown U3 verifier fault mode ${faultMode}`);
  const playwright = await discoverPlaywright();
  const executablePath = await discoverBrowser(playwright.chromium);
  return runManagedVerification({
    startServer: () => startStaticServer(),
    launchBrowser: () => playwright.chromium.launch({
      executablePath,
      headless: true,
      args: ['--disable-gpu', '--no-sandbox'],
    }),
    verify: async ({ server, browser }) => (
      verifyU3Standalone(browser, server.baseUrl, { faultMode, maxWorks: 1 })
    ),
  });
}

export async function withBrowserContext(browser, options, verify) {
  const context = await browser.newContext(options);
  let result;
  let operationError;
  try {
    result = await verify(context);
  } catch (error) {
    operationError = error;
  }
  const [cleanup] = await Promise.allSettled([context.close()]);
  if (operationError) throw operationError;
  if (cleanup.status === 'rejected') throw cleanup.reason;
  return result;
}

export async function runManagedVerification({
  startServer,
  launchBrowser,
  verify,
  timeoutMs = BROWSER_VERIFICATION_TIMEOUT_MS,
  cleanupTimeoutMs = BROWSER_CLEANUP_TIMEOUT_MS,
}) {
  let server;
  let browser;
  let result;
  let operationError;
  let verificationTimer;
  let timedOut = false;
  let phase = 'server startup';
  const deadline = Date.now() + timeoutMs;
  const timeoutError = (timeoutPhase = phase) => new Error(
    `Browser verification timed out after ${timeoutMs} ms during ${timeoutPhase}`,
  );
  const deadlineExpired = () => timedOut || Date.now() >= deadline;
  const closeWithTimeout = async (resource, label) => {
    if (!resource?.close) return;
    let cleanupTimer;
    try {
      await Promise.race([
        resource.close(),
        new Promise((_, reject) => {
          cleanupTimer = setTimeout(
            () => reject(new Error(
              `Browser verification ${label} cleanup timed out after ${cleanupTimeoutMs} ms`,
            )),
            cleanupTimeoutMs,
          );
        }),
      ]);
    } finally {
      clearTimeout(cleanupTimer);
    }
  };
  const watchdog = new Promise((_, reject) => {
    verificationTimer = setTimeout(
      () => {
        timedOut = true;
        reject(timeoutError());
      },
      Math.max(0, deadline - Date.now()),
    );
  });
  const lifecycle = (async () => {
    const startedServer = await startServer();
    if (deadlineExpired()) {
      timedOut = true;
      await closeWithTimeout(startedServer, 'late server');
      throw timeoutError('server startup');
    }
    server = startedServer;
    phase = 'browser launch';
    const launchedBrowser = await launchBrowser(server);
    if (deadlineExpired()) {
      timedOut = true;
      await closeWithTimeout(launchedBrowser, 'late browser');
      throw timeoutError('browser launch');
    }
    browser = launchedBrowser;
    phase = 'verification';
    const verificationResult = await verify({ server, browser });
    if (deadlineExpired()) {
      timedOut = true;
      throw timeoutError('verification');
    }
    return verificationResult;
  })();
  try {
    result = await Promise.race([
      lifecycle,
      watchdog,
    ]);
  } catch (error) {
    operationError = error;
  } finally {
    clearTimeout(verificationTimer);
  }
  const cleanupResults = await Promise.allSettled([
    closeWithTimeout(browser, 'browser'),
    closeWithTimeout(server, 'server'),
  ]);
  if (operationError) throw operationError;
  const cleanupErrors = cleanupResults
    .filter(({ status }) => status === 'rejected')
    .map(({ reason }) => reason);
  if (cleanupErrors.length === 1) throw cleanupErrors[0];
  if (cleanupErrors.length > 1) {
    throw new AggregateError(cleanupErrors, 'Browser verification cleanup failed');
  }
  return result;
}

export async function runVerification() {
  const playwright = await discoverPlaywright();
  const executablePath = await discoverBrowser(playwright.chromium);
  return runManagedVerification({
    startServer: () => startStaticServer(),
    launchBrowser: () => playwright.chromium.launch({
      executablePath,
      headless: true,
      args: ['--disable-gpu', '--no-sandbox'],
    }),
    verify: async ({ server, browser }) => {
      const report = [];
      const warningRegression = await verifyResponsiveWarningRegression(browser, server.baseUrl);
      report.push({ kind: 'warning-regression', ...warningRegression });
      for (const viewport of REQUIRED_VIEWPORTS) {
        const standalone = await verifyStandalone(browser, server.baseUrl, viewport, true);
        const embedded = await verifyEmbedded(browser, server.baseUrl, viewport, true);
        report.push({ viewport, kind: 'required', standalone, embedded });
      }
      for (const viewport of BOUNDARY_VIEWPORTS) {
        const standalone = await verifyStandalone(browser, server.baseUrl, viewport, false);
        const embedded = await verifyEmbedded(browser, server.baseUrl, viewport, false);
        report.push({ viewport, kind: 'boundary', standalone, embedded });
      }
      const u1Standalone = await verifyU1Standalone(browser, server.baseUrl);
      const u1Embedded = await verifyU1Embedded(browser, server.baseUrl);
      report.push({
        kind: 'u1-eleven-works',
        standalone: u1Standalone,
        embedded: u1Embedded,
      });
      const u3Standalone = await verifyU3Standalone(browser, server.baseUrl);
      const u3Embedded = await verifyU3Embedded(browser, server.baseUrl);
      report.push({
        kind: 'u3-fifty-one-works',
        standalone: u3Standalone,
        embedded: u3Embedded,
      });
      const u4PublicStandalone = await verifyU4Standalone(browser, server.baseUrl);
      const u4PublicEmbedded = await verifyU4Embedded(browser, server.baseUrl);
      const u4PrivateStandalone = await verifyU4Standalone(browser, server.baseUrl, true);
      const u4PrivateEmbedded = await verifyU4Embedded(browser, server.baseUrl, true);
      const u4PrivateNegativePaths = await verifyU4PrivateNegativePaths(
        browser,
        server.baseUrl,
      );
      report.push({
        kind: 'u4-fifty-four-works',
        public: {
          standalone: u4PublicStandalone,
          embedded: u4PublicEmbedded,
        },
        private: {
          standalone: u4PrivateStandalone,
          embedded: u4PrivateEmbedded,
        },
        negativePaths: u4PrivateNegativePaths,
      });
      const u5Matrix = await runU5RenderedMatrix(browser, server.baseUrl);
      const u5PrivateNegativePaths = await verifyU5PrivateNegativePaths(
        browser,
        server.baseUrl,
      );
      report.push({
        kind: 'u5-fourteen-works',
        matrix: u5Matrix,
        negativePaths: u5PrivateNegativePaths,
      });
      const standaloneImported = await verifyImportedWorksStandalone(browser, server.baseUrl);
      const embeddedImported = await verifyImportedWorksEmbedded(browser, server.baseUrl);
      report.push({
        kind: 'nine-imported-works',
        standalone: standaloneImported,
        embedded: embeddedImported,
      });
      return report;
    },
  });
}

const isMain = process.argv[1]
  && fileURLToPath(import.meta.url) === normalize(process.argv[1]);

if (isMain) {
  Promise.resolve()
    .then(() => {
      const faultMode = parseU3FaultMode(process.argv.slice(2));
      if (faultMode) return runFocusedU3FaultVerification(faultMode);
      if (process.argv.includes('--imported-only')) return runFocusedImportedVerification();
      if (process.argv.includes('--warning-regression-only')) {
        return runFocusedWarningVerification();
      }
      if (process.argv.includes('--u6-only')) return runFocusedU6Verification();
      if (process.argv.includes('--u5-only')) return runFocusedU5Verification();
      return runVerification();
    })
    .then((report) => {
      process.stdout.write(`${JSON.stringify({ ok: true, cases: report }, null, 2)}\n`);
    })
    .catch((error) => {
      process.stderr.write(`Art History browser verification failed: ${error.stack || error}\n`);
      process.exitCode = 1;
    });
}
