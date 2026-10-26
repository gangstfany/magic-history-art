import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RIGHTS_FIELDS } from '../scripts/art-history-local-media-contract.mjs';

const MANIFEST_URL = new URL(
  '../data/ap-art-history-unit-5-manifest.json',
  import.meta.url,
);
const CANONICAL_URL = new URL('./fixtures/u5-canonical.json', import.meta.url);
const RIGHTS_URL = new URL('../data/ap-art-history-unit-5-rights.json', import.meta.url);
const PLACEHOLDER_AUTHORITY_URL = new URL(
  '../data/ap-art-history-unit-5-placeholder-authority.json',
  import.meta.url,
);
const LEDGER_URL = new URL('../docs/data-sources/u5-source-ledger.md', import.meta.url);
const HTML_URL = new URL('../art-history-map.html', import.meta.url);

const PUBLIC_PLACEHOLDER_LITERAL = 'Rights-restricted public placeholder';
const PLACEHOLDER_RIGHTS_NOTE = 'The public build preserves identity and source information without reproducing an image for which portable public permission was not verified.';
const ARTWORK_FIELDS = [
  'id', 'apNumber', 'unit', 'region', 'culture', 'traditionGroup', 'period',
  'titleEn', 'titleZh', 'artistCulture', 'siteName', 'coordinates', 'date',
  'medium', 'workType', 'function', 'form', 'content', 'context',
  'recognitionAnchors', 'comparisonIds', 'comparisonNotes', 'keywords', 'images',
];
const PUBLIC_MEDIA_FIELDS = [
  'id', 'label', 'imageUrl', 'imageAlt', 'imageSourceName', 'imageSourceUrl',
];
const RESTRICTED_MEDIA_FIELDS = [...PUBLIC_MEDIA_FIELDS, 'mediaStatus'];
const CREDIT_FIELDS = ['creatorOrInstitution', 'licenseName', 'licenseUrl'];

const PLACEHOLDER_FIELDS = ['imageSourceName', 'imageSourceUrl', 'rightsNote'];
const RELEASE_CLASSES = new Set(['open', 'restricted']);
const LEDGER_HEADER = [
  'AP #', 'Work ID', 'View ID', 'Image', 'Source', 'Rights', 'Release class', 'Review note',
];
const LEDGER_DIVIDER = '| ---: | --- | --- | --- | --- | --- | --- | --- |';
const HAN_SCRIPT = /\p{Script=Han}/u;
const COMPARISON_BASIS = /(?:Compare|对比|比较|形式|功能|材料|语境|权力|仪式|景观|身份|技术)/i;
const UNFINISHED_VALUE = /\b(?:tbd|todo|placeholder|n\/a|not available)\b|待补|待定|占位/i;

const ENTRY_FIELDS = [
  'id',
  'titleEn',
  'region',
  'siteName',
  'provenanceQualifier',
  'traditionGroup',
  'requiredViewIds',
];

const EXPECTED_U5 = [
  [153, 'ap153-chavin-huantar', 'Chavín de Huántar', 'centralAndes', 'Ancient Central Andes', ['plan', 'lanzon-stela', 'relief-sculpture', 'nose-ornament']],
  [154, 'ap154-mesa-verde', 'Mesa Verde cliff dwellings', 'ancestralPueblo', 'Ancient North America', ['cliff-dwellings']],
  [155, 'ap155-yaxchilan', 'Yaxchilán', 'mesoamerica', 'Ancient Mesoamerica', ['structure-40', 'lintel-25-structure-23', 'structure-33']],
  [156, 'ap156-great-serpent-mound', 'Great Serpent Mound', 'easternWoodlands', 'Ancient North America', ['earthwork']],
  [157, 'ap157-templo-mayor', 'Templo Mayor (Main Temple)', 'mesoamerica', 'Ancient Mesoamerica', ['reconstruction', 'coyolxauhqui-stone', 'calendar-stone', 'olmec-style-mask']],
  [158, 'ap158-ruler-feather-headdress', "Ruler's feather headdress (probably of Motecuhzoma II)", 'mesoamerica', 'Ancient Mesoamerica', ['primary']],
  [159, 'ap159-city-cusco', 'City of Cusco, including Qorikancha, Santo Domingo, and Walls at Saqsa Waman', 'centralAndes', 'Ancient Central Andes', ['city-plan', 'qorikancha-santo-domingo', 'saqsa-waman-walls']],
  [160, 'ap160-maize-cobs', 'Maize cobs', 'centralAndes', 'Ancient Central Andes', ['primary']],
  [161, 'ap161-machu-picchu', 'City of Machu Picchu', 'centralAndes', 'Ancient Central Andes', ['city', 'observatory', 'intihuatana-stone']],
  [162, 'ap162-all-toqapu-tunic', "All-T'oqapu tunic", 'centralAndes', 'Ancient Central Andes', ['primary']],
  [163, 'ap163-bandolier-bag', 'Bandolier bag', 'easternWoodlands', 'Native North America', ['primary']],
  [164, 'ap164-transformation-mask', 'Transformation mask', 'northwestCoast', 'Native North America', ['closed', 'open']],
  [165, 'ap165-painted-elk-hide', 'Painted elk hide', 'plainsGreatBasin', 'Native North America', ['primary']],
  [166, 'ap166-black-on-black-vessel', 'Black-on-black ceramic vessel', 'ancestralPueblo', 'Native North America', ['primary']],
];

const EXPECTED_PROVENANCE = new Map([
  [153, ['Chavín de Huántar, Ancash, Peru', null]],
  [154, ['Mesa Verde, Colorado, U.S.', null]],
  [155, ['Yaxchilán, Chiapas, Mexico', null]],
  [156, ['Adams County, Ohio, U.S.', null]],
  [157, ['Tenochtitlan (Mexico City), Mexico', null]],
  [158, ['Mexica realm, Central Mexico', 'Traditionally associated with Motecuhzoma II; exact maker and original ownership remain uncertain.']],
  [159, ['Cusco, Peru', null]],
  [160, ['Inka realm, Central Andes', 'Exact excavation and production location is not securely documented; map placement represents the Inka Central Andes.']],
  [161, ['Machu Picchu, Cusco Region, Peru', null]],
  [162, ['Inka realm, Central Andes', 'Exact production location is unknown; map placement represents the Inka imperial heartland.']],
  [163, ['Lenape homelands, northeastern North America', 'Portable work; exact maker and place of production are not securely documented.']],
  [164, ["Kwakwaka'wakw territories, British Columbia, Canada", 'Portable ceremonial object; the regional anchor does not claim a precise village of manufacture.']],
  [165, ['Wind River Reservation, Wyoming, U.S.', 'Attributed to Cotsiogo (Cadzi Cody), Eastern Shoshone; map placement represents the documented community context.']],
  [166, ['San Ildefonso Pueblo, New Mexico, U.S.', null]],
]);

const EXPECTED_REGIONS = [
  'ancestralPueblo',
  'centralAndes',
  'easternWoodlands',
  'mesoamerica',
  'northwestCoast',
  'plainsGreatBasin',
];

const EXPECTED_TRADITION_GROUPS = [
  'Ancient Central Andes',
  'Ancient Mesoamerica',
  'Ancient North America',
  'Native North America',
];

const AUDITED_RIGHTS = await readJson(RIGHTS_URL);
const EXPECTED_MEDIA_SOURCES = Object.fromEntries((await readJson(CANONICAL_URL)).artworks.flatMap(work =>
  work.images.map(view => [mediaIdentity(work.id, view.id), {
    imageUrl: view.imageUrl, imageSourceName: view.imageSourceName, imageSourceUrl: view.imageSourceUrl,
  }])
));

const NMAI_BANDOLIER_SOURCE_URL = 'https://www.si.edu/object/shoulder-bagbandolier-bag%3ANMAI_227689';

function topLevelManifestSourceKeys(rawManifest) {
  const keys = [];
  let objectDepth = 0;
  let arrayDepth = 0;
  let inString = false;
  let escaped = false;
  let stringStart = -1;

  for (let index = 0; index < rawManifest.length; index += 1) {
    const character = rawManifest[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (character !== '"') continue;

      inString = false;
      if (objectDepth !== 1 || arrayDepth !== 0) continue;
      let cursor = index + 1;
      while (/\s/.test(rawManifest[cursor] ?? '')) cursor += 1;
      if (rawManifest[cursor] !== ':') continue;

      const propertyName = JSON.parse(rawManifest.slice(stringStart, index + 1));
      if (/^\d+$/.test(propertyName)) keys.push(propertyName);
      continue;
    }

    if (character === '"') {
      inString = true;
      stringStart = index;
    } else if (character === '{') {
      objectDepth += 1;
    } else if (character === '}') {
      objectDepth -= 1;
    } else if (character === '[') {
      arrayDepth += 1;
    } else if (character === ']') {
      arrayDepth -= 1;
    }
  }

  return keys;
}

function assertManifestSourceKeyOrder(rawManifest, expectedKeys) {
  assert.deepEqual(
    topLevelManifestSourceKeys(rawManifest),
    expectedKeys,
    'raw manifest top-level key order',
  );
}

test('U5 manifest freezes the AP 153–166 identity, provenance, and view contract', async () => {
  const rawManifest = await readFile(MANIFEST_URL, 'utf8');
  const manifest = JSON.parse(rawManifest);
  const expectedKeys = EXPECTED_U5.map(([apNumber]) => String(apNumber));

  assertManifestSourceKeyOrder(rawManifest, expectedKeys);
  assert.deepEqual(Object.keys(manifest), expectedKeys, 'AP keys and order');

  const projectedEntries = Object.entries(manifest).map(([apNumber, entry]) => [
    Number(apNumber),
    entry.id,
    entry.titleEn,
    entry.region,
    entry.traditionGroup,
    entry.requiredViewIds,
  ]);
  assert.deepEqual(projectedEntries, EXPECTED_U5, 'exact U5 identity and view projection');

  for (const [apNumber, entry] of Object.entries(manifest)) {
    assert.deepEqual(Object.keys(entry), ENTRY_FIELDS, `AP ${apNumber}: field schema and order`);
    assert.deepEqual(
      [entry.siteName, entry.provenanceQualifier],
      EXPECTED_PROVENANCE.get(Number(apNumber)),
      `AP ${apNumber}: exact site and provenance qualifier`,
    );
    assert.equal('coordinates' in entry, false, `AP ${apNumber}: manifest excludes coordinates`);
    assert.equal(
      new Set(entry.requiredViewIds).size,
      entry.requiredViewIds.length,
      `AP ${apNumber}: unique required view ids`,
    );
  }

  assert.equal(
    Object.values(manifest).reduce((total, entry) => total + entry.requiredViewIds.length, 0),
    27,
    'exact total required view count',
  );
  assert.deepEqual(
    [...new Set(Object.values(manifest).map(({ region }) => region))].sort(),
    EXPECTED_REGIONS,
    'exact six-region keyset',
  );
  assert.deepEqual(
    [...new Set(Object.values(manifest).map(({ traditionGroup }) => traditionGroup))].sort(),
    EXPECTED_TRADITION_GROUPS,
    'exact four-group keyset',
  );
});

test('U5 manifest source-order guard rejects AP 154 before AP 153', () => {
  const reversedSource = `{
  "154": {
    "999": {
      "nested": true
    }
  },
  "153": {
    "id": "ap153-chavin-huantar"
  }
}`;

  assert.deepEqual(
    topLevelManifestSourceKeys(reversedSource),
    ['154', '153'],
    'extractor ignores nested numeric-looking keys',
  );
  assert.throws(
    () => assertManifestSourceKeyOrder(reversedSource, ['153', '154']),
    /raw manifest top-level key order/,
  );
});

test('manifest source scanner follows JSON depth across whitespace and string decoys', () => {
  const variedSource = `{
"153"\t: {
"999": {
"value": true
},
"items": [
{
"997": {
"value": false
}
}
],
"note": "escaped decoy: \\\"998\\\": {"
},
    "154" : {
      "id": "ap154-mesa-verde"
    }
}`;

  assert.doesNotThrow(() => JSON.parse(variedSource));
  assert.deepEqual(
    topLevelManifestSourceKeys(variedSource),
    ['153', '154'],
    'only root numeric keys are returned regardless of indentation',
  );
});

function assertFinishedString(value, identity, field) {
  assert.equal(typeof value, 'string', `${identity}.${field}: expected string`);
  assert.ok(value.trim(), `${identity}.${field}: expected finished string`);
  assert.doesNotMatch(value, UNFINISHED_VALUE, `${identity}.${field}: unfinished value`);
}

function assertHttpsUrl(value, identity) {
  assert.match(value, /^https:\/\/[^/]/, `${identity}: expected valid HTTPS URL`);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    assert.fail(`${identity}: expected valid HTTPS URL`);
  }
  assert.equal(parsed.protocol, 'https:', `${identity}: expected valid HTTPS URL`);
  assert.ok(parsed.hostname, `${identity}: expected valid HTTPS URL`);
  return parsed;
}

function markdownLink(value, identity) {
  const match = value.match(/^\[([^\]]+)\]\((https:\/\/[^\s]+|(?:\.\.\/\.\.\/)?assets\/art-history\/u5\/[^\s]+)\)$/);
  assert.ok(match, `${identity}: malformed HTTPS Markdown link`);
  const url = match[2].replace(/^\.\.\/\.\.\//, '');
  if (!url.startsWith('assets/')) assertHttpsUrl(url, identity);
  return { label: match[1], url };
}

function mediaIdentity(workId, viewId) {
  return `${workId}::${viewId}`;
}

function expectedMediaKeys(manifest) {
  return Object.values(manifest).flatMap((entry) => (
    entry.requiredViewIds.map((viewId) => mediaIdentity(entry.id, viewId))
  ));
}

function splitLedgerRow(line) {
  assert.match(line, /^\|.*\|$/, `malformed ledger row: ${line}`);
  return line.split('|').slice(1, -1).map((cell) => cell.trim());
}

function parseU5Ledger(markdown) {
  const lines = markdown.split('\n');
  const headerMatches = lines
    .map((line, index) => [line, index])
    .filter(([line]) => line === `| ${LEDGER_HEADER.join(' | ')} |`);
  assert.equal(headerMatches.length, 1, 'expected exactly one U5 ledger table');
  const headerIndex = headerMatches[0][1];
  assert.equal(lines[headerIndex + 1], LEDGER_DIVIDER, 'exact ledger divider');

  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith('|')) break;
    const cells = splitLedgerRow(line);
    assert.equal(cells.length, 8, 'ledger row expected exactly 8 cells');
    assert.match(cells[0], /^1(?:5[3-9]|6[0-6])$/, 'ledger AP number');
    assert.match(cells[1], /^`ap\d+-[a-z0-9-]+`$/, 'ledger work id');
    assert.match(cells[2], /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'ledger view id');
    const identity = mediaIdentity(cells[1].slice(1, -1), cells[2]);
    const imageUrl = cells[3] === PUBLIC_PLACEHOLDER_LITERAL
      ? null
      : markdownLink(cells[3], `${identity}: image`).url;
    const source = markdownLink(cells[4], `${identity}: source`);
    const rights = markdownLink(cells[5], `${identity}: rights`);
    assert.ok(RELEASE_CLASSES.has(cells[6]), `${identity}: release class`);
    const review = cells[7].match(/^Creator\/institution: (.+); Reviewed: (.+)$/);
    assert.ok(review, `${identity}: reviewed row and creator/institution`);
    assertFinishedString(review[1], identity, 'creatorOrInstitution');
    assertFinishedString(review[2], identity, 'reviewNote');
    rows.push({
      apNumber: Number(cells[0]),
      workId: cells[1].slice(1, -1),
      viewId: cells[2],
      key: identity,
      imageUrl,
      sourceName: source.label,
      sourceUrl: source.url,
      creatorOrInstitution: review[1],
      licenseName: rights.label,
      licenseUrl: rights.url,
      releaseClass: cells[6],
      reviewStatus: 'reviewed',
      reviewNote: review[2],
    });
  }
  assert.ok(rows.length, 'missing consecutive ledger rows');
  assert.equal(new Set(rows.map(({ key }) => key)).size, rows.length, 'duplicate ledger identity');
  return rows;
}

function readJson(url) {
  return readFile(url, 'utf8').then(JSON.parse);
}

function parseJsonBlock(html, id) {
  const match = html.match(new RegExp(
    `<script id="${id}" type="application/json">([\\s\\S]*?)<\\/script>`,
  ));
  assert.ok(match, `missing ${id}`);
  return JSON.parse(match[1]);
}

function assertOrderedDeepEqual(actual, expected, path = '$') {
  if (Array.isArray(actual) || Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), `${path} must remain an array`);
    assert.ok(Array.isArray(expected), `${path} canonical value must be an array`);
    assert.equal(actual.length, expected.length, `${path} array length`);
    actual.forEach((item, index) => {
      assertOrderedDeepEqual(item, expected[index], `${path}[${index}]`);
    });
    return;
  }

  const actualIsObject = actual !== null && typeof actual === 'object';
  const expectedIsObject = expected !== null && typeof expected === 'object';
  if (actualIsObject || expectedIsObject) {
    assert.ok(actualIsObject, `${path} must remain an object`);
    assert.ok(expectedIsObject, `${path} canonical value must be an object`);
    assert.deepEqual(Object.keys(actual), Object.keys(expected), `${path} object key order`);
    Object.keys(expected).forEach((key) => {
      assertOrderedDeepEqual(actual[key], expected[key], `${path}.${key}`);
    });
    return;
  }

  assert.deepEqual(actual, expected, `${path} value`);
}

function normalizedCredits(fixture) {
  return fixture.artworks.flatMap((work) => {
    const storedCredit = fixture.credits[work.id];
    if (work.images.length === 1) {
      assert.ok(storedCredit !== null && typeof storedCredit === 'object' && !Array.isArray(storedCredit),
        `${work.id}: single-view credit must be a plain object`);
    } else {
      assert.ok(Array.isArray(storedCredit), `${work.id}: multi-view credits must be an array`);
      assert.equal(storedCredit.length, work.images.length,
        `${work.id}: multi-view credit count`);
    }
    const credits = Array.isArray(storedCredit) ? storedCredit : [storedCredit];
    assert.equal(credits.length, work.images.length, `${work.id}: credit count`);
    return work.images.map((image, index) => [
      mediaIdentity(work.id, image.id),
      credits[index],
    ]);
  });
}

function restrictedKeys(rights) {
  return Object.entries(rights)
    .filter(([, entry]) => entry.releaseClass === 'restricted')
    .map(([identity]) => identity);
}

function assertRightsPolicy(rights) {
  for (const [key, row] of Object.entries(rights)) {
    assert.ok(RELEASE_CLASSES.has(row.releaseClass), key + ': release class');
    assert.deepEqual([row.licenseName, row.licenseUrl, row.releaseClass],
      [AUDITED_RIGHTS[key].licenseName, AUDITED_RIGHTS[key].licenseUrl, AUDITED_RIGHTS[key].releaseClass],
      'exact public license URL and audited restricted rights policy');
  }
}

function assertPlaceholderAuthority(authority, rights) {
  const expected = restrictedKeys(rights);
  assert.deepEqual(Object.keys(authority), expected, 'placeholder authority exact key set and order');
  for (const identity of expected) {
    const entry = authority[identity];
    assert.deepEqual(Object.keys(entry), PLACEHOLDER_FIELDS, `${identity}: placeholder schema`);
    assertFinishedString(entry.imageSourceName, identity, 'imageSourceName');
    assertHttpsUrl(entry.imageSourceUrl, `${identity}.imageSourceUrl`);
    assert.equal(entry.rightsNote, PLACEHOLDER_RIGHTS_NOTE, `${identity}.rightsNote`);
    assert.doesNotMatch(entry.imageSourceUrl, /\/Special:Redirect\/file\//i, `${identity}: restricted URL leak`);
    const expectedSource = EXPECTED_MEDIA_SOURCES[identity];
    assert.equal(expectedSource.imageUrl, null, `${identity}: audited restricted image URL`);
    assert.deepEqual({
      imageSourceName: entry.imageSourceName,
      imageSourceUrl: entry.imageSourceUrl,
    }, {
      imageSourceName: expectedSource.imageSourceName,
      imageSourceUrl: expectedSource.imageSourceUrl,
    }, `${identity}: exact audited media source policy in placeholder authority`);
  }
}

function assertComparisonContract(work, resolvableIds) {
  assert.ok(Array.isArray(work.comparisonIds), `${work.id}.comparisonIds`);
  assert.ok(work.comparisonIds.length >= 1, `${work.id}: comparison minimum`);
  assert.equal(new Set(work.comparisonIds).size, work.comparisonIds.length, `${work.id}: duplicate comparison`);
  assert.deepEqual(Object.keys(work.comparisonNotes), work.comparisonIds, `${work.id}: comparison note keys`);
  for (const targetId of work.comparisonIds) {
    assert.notEqual(targetId, work.id, `${work.id}: self comparison`);
    assert.ok(resolvableIds.has(targetId), `${work.id}: unresolved comparison ${targetId}`);
    assertFinishedString(work.comparisonNotes[targetId], work.id, `comparisonNotes.${targetId}`);
    assert.match(work.comparisonNotes[targetId], COMPARISON_BASIS, `${work.id}: explicit comparison basis`);
  }
}

function assertCanonicalStudy(fixture, manifest, resolvableIds) {
  const expectedIds = Object.values(manifest).map(({ id }) => id);
  assert.deepEqual(Object.keys(fixture), ['artworks', 'credits'], 'canonical top-level field order');
  assert.equal(fixture.artworks.length, 14, 'canonical work count');
  assert.deepEqual(fixture.artworks.map(({ apNumber }) => apNumber),
    Array.from({ length: 14 }, (_, index) => index + 153), 'canonical AP order');
  assert.deepEqual(fixture.artworks.map(({ id }) => id), expectedIds, 'canonical work ids');
  assert.deepEqual(Object.keys(fixture.credits), expectedIds, 'canonical credit work ids');

  fixture.artworks.forEach((work, index) => {
    const manifestEntry = Object.values(manifest)[index];
    const expectedFields = manifestEntry.provenanceQualifier === null
      ? ARTWORK_FIELDS
      : [...ARTWORK_FIELDS, 'provenanceQualifier'];
    assert.deepEqual(Object.keys(work), expectedFields, `${work.id}: exact artwork field order`);
    assert.equal(work.apNumber, index + 153, `${work.id}.apNumber`);
    assert.equal(work.unit, 5, `${work.id}.unit`);
    for (const field of ['id', 'titleEn', 'region', 'siteName', 'traditionGroup']) {
      assert.equal(work[field], manifestEntry[field], `${work.id}.${field}: manifest parity`);
    }
    assert.equal(work.provenanceQualifier ?? null, manifestEntry.provenanceQualifier,
      `${work.id}.provenanceQualifier: manifest parity`);
    assert.ok(EXPECTED_REGIONS.includes(work.region), `${work.id}: region`);
    assert.ok(EXPECTED_TRADITION_GROUPS.includes(work.traditionGroup), `${work.id}: tradition group`);
    assertFinishedString(work.culture, work.id, 'culture');
    assert.notEqual(work.culture, work.traditionGroup, `${work.id}: precise culture`);
    for (const field of ['period', 'titleZh', 'artistCulture', 'date', 'medium', 'workType', 'function', 'form', 'content', 'context']) {
      assertFinishedString(work[field], work.id, field);
    }
    assert.match(work.titleZh, HAN_SCRIPT, `${work.id}: Chinese subtitle`);
    for (const field of ['function', 'form', 'content', 'context']) {
      assert.match(work[field], HAN_SCRIPT, `${work.id}.${field}: Chinese study text`);
    }
    assert.deepEqual(Object.keys(work.coordinates), ['x', 'y'], `${work.id}: coordinate schema`);
    assert.ok(Number.isFinite(work.coordinates.x) && Number.isFinite(work.coordinates.y), `${work.id}: finite coordinates`);
    assert.ok(work.coordinates.x >= 0 && work.coordinates.x <= 1600, `${work.id}: x bounds`);
    assert.ok(work.coordinates.y >= 0 && work.coordinates.y <= 800, `${work.id}: y bounds`);
    assert.ok(work.recognitionAnchors.length >= 2 && work.recognitionAnchors.length <= 4,
      `${work.id}: 2-4 recognition anchors`);
    assert.equal(new Set(work.recognitionAnchors).size, work.recognitionAnchors.length,
      `${work.id}: unique recognition anchors`);
    work.recognitionAnchors.forEach((anchor) => assert.match(anchor, HAN_SCRIPT, `${work.id}: Chinese anchor`));
    assertComparisonContract(work, resolvableIds);
    assert.ok(work.keywords.length >= 3, `${work.id}: 3+ keywords`);
    assert.equal(new Set(work.keywords).size, work.keywords.length, `${work.id}: unique keywords`);
    assert.ok(work.keywords.some((keyword) => HAN_SCRIPT.test(keyword)), `${work.id}: Chinese keyword`);
  });
}

function assertCanonicalMedia(fixture, manifest, rights, authority) {
  const expectedKeys = expectedMediaKeys(manifest);
  assert.deepEqual(Object.keys(EXPECTED_MEDIA_SOURCES), expectedKeys,
    'audited media source policy exact key order');
  const mediaKeys = [];
  const alts = new Set();
  const imageUrls = new Set();
  const authorityKeys = new Set(Object.keys(authority));
  const manifestById = new Map(Object.values(manifest).map((entry) => [entry.id, entry]));
  for (const work of fixture.artworks) {
    assert.deepEqual(work.images.map(({ id }) => id), manifestById.get(work.id).requiredViewIds,
      `${work.id}: view order`);
    for (const view of work.images) {
      const identity = mediaIdentity(work.id, view.id);
      mediaKeys.push(identity);
      const isRestricted = authorityKeys.has(identity);
      assert.deepEqual(Object.keys(view), isRestricted ? RESTRICTED_MEDIA_FIELDS : PUBLIC_MEDIA_FIELDS,
        `${identity}: exact media field order`);
      assertFinishedString(view.label, identity, 'label');
      assertFinishedString(view.imageAlt, identity, 'imageAlt');
      assert.match(view.imageAlt, HAN_SCRIPT, `${identity}: Chinese visible-content alt`);
      assert.ok(!alts.has(view.imageAlt), `${identity}: repeated alt`);
      alts.add(view.imageAlt);
      assertFinishedString(view.imageSourceName, identity, 'imageSourceName');
      assertHttpsUrl(view.imageSourceUrl, `${identity}.imageSourceUrl`);
      if (isRestricted) {
        assert.equal(view.imageUrl, null, `${identity}: restricted URL leak`);
        assert.equal(view.mediaStatus, 'rightsRestricted', `${identity}: restricted status`);
        assert.equal(rights[identity].releaseClass, 'restricted', `${identity}: restricted class drift`);
        assert.equal(view.imageSourceName, authority[identity].imageSourceName,
          `${identity}: placeholder source name`);
        assert.equal(view.imageSourceUrl, authority[identity].imageSourceUrl,
          `${identity}: placeholder source URL`);
      } else {
        assert.equal(view.imageUrl, rights[identity].localAssetPath, `${identity}: local image alignment`);
        assert.match(view.imageUrl ?? '', /^assets\/art-history\/u5\/ap\d+-[a-z0-9-]+\.webp$/, `${identity}: local image alignment`);
        assert.ok(!imageUrls.has(view.imageUrl), `${identity}: duplicate image URL`);
        imageUrls.add(view.imageUrl);
        assert.notEqual(rights[identity].releaseClass, 'restricted', `${identity}: normal/restricted drift`);
      }
      assert.deepEqual({
        imageUrl: view.imageUrl,
        imageSourceName: view.imageSourceName,
        imageSourceUrl: view.imageSourceUrl,
      }, EXPECTED_MEDIA_SOURCES[identity], `${identity}: exact audited media source policy in canonical`);
    }
  }
  assert.deepEqual(mediaKeys, expectedKeys, 'canonical flattened media keys');
  assert.equal(mediaKeys.length, 27, 'exact media count');
}

function assertRightsAndLedger(fixture, manifest, rights, authority, markdown) {
  const expectedKeys = expectedMediaKeys(manifest);
  const rows = parseU5Ledger(markdown);
  const credits = normalizedCredits(fixture);
  const expectedApByWorkId = new Map(Object.entries(manifest)
    .map(([apNumber, entry]) => [entry.id, Number(apNumber)]));
  assert.deepEqual(Object.keys(rights), expectedKeys, 'rights exact key order');
  assert.deepEqual(rows.map(({ key }) => key), expectedKeys, 'ledger exact key order');
  assert.deepEqual(credits.map(([key]) => key), expectedKeys, 'credit exact key order');
  assertPlaceholderAuthority(authority, rights);
  assertRightsPolicy(rights);
  const media = new Map(fixture.artworks.flatMap((work) => work.images.map((view) => [
    mediaIdentity(work.id, view.id), view,
  ])));
  expectedKeys.forEach((identity, index) => {
    const entry = rights[identity];
    const row = rows[index];
    const credit = credits[index][1];
    assert.equal(row.apNumber, expectedApByWorkId.get(row.workId),
      `${identity}: ledger AP number mismatch`);
    assert.deepEqual(Object.keys(entry), RIGHTS_FIELDS, `${identity}: exact rights field order`);
    assert.deepEqual(Object.keys(credit), CREDIT_FIELDS, `${identity}: exact credit field order`);
    CREDIT_FIELDS.forEach((field) => {
      assertFinishedString(entry[field], identity, field);
      assert.equal(credit[field], entry[field], `${identity}.${field}: credit mismatch`);
      assert.equal(row[field], entry[field], `${identity}.${field}: ledger mismatch`);
    });
    for (const field of ['accessedOn', 'identityNote', 'derivativeNote']) {
      assert.ok(row.reviewNote.includes(entry[field]), identity + ': ledger evidence ' + field);
    }
    assert.equal(row.sourceUrl, entry.sourcePageUrl, identity + ': source evidence');
    if (entry.releaseClass === 'open') {
      assert.ok(row.reviewNote.includes(entry.originalFileUrl), identity + ': original-file evidence');
    }
    assert.ok(RELEASE_CLASSES.has(entry.releaseClass), `${identity}: release class`);
    assert.equal(row.releaseClass, entry.releaseClass, `${identity}: ledger release class`);
    assert.equal(row.sourceName, media.get(identity).imageSourceName, `${identity}: ledger source name`);
    assert.equal(row.sourceUrl, media.get(identity).imageSourceUrl, `${identity}: ledger source URL`);
    assert.equal(row.imageUrl, media.get(identity).imageUrl, `${identity}: ledger image URL`);
    assert.deepEqual({
      imageUrl: row.imageUrl,
      imageSourceName: row.sourceName,
      imageSourceUrl: row.sourceUrl,
    }, EXPECTED_MEDIA_SOURCES[identity], `${identity}: exact audited media source policy in ledger`);
    assert.equal(row.reviewStatus, 'reviewed', `${identity}: reviewed ledger row`);
    assert.equal(row.imageUrl === null, entry.releaseClass === 'restricted',
      `${identity}: unapproved null or restricted URL leak`);
  });
  assertCanonicalMedia(fixture, manifest, rights, authority);
}

test('U5 canonical freezes 14 complete bilingual study records', async () => {
  const [fixture, manifest, html] = await Promise.all([
    readJson(CANONICAL_URL), readJson(MANIFEST_URL), readFile(HTML_URL, 'utf8'),
  ]);
  const existingIds = new Set(parseJsonBlock(html, 'artwork-data').map(({ id }) => id));
  fixture.artworks.forEach(({ id }) => existingIds.add(id));
  assertCanonicalStudy(fixture, manifest, existingIds);
});

test('U5 source bundle locks exact ordered media, rights, credits, and reviewed ledger rows', async () => {
  const [fixture, manifest, rights, authority, ledger] = await Promise.all([
    readJson(CANONICAL_URL), readJson(MANIFEST_URL), readJson(RIGHTS_URL),
    readJson(PLACEHOLDER_AUTHORITY_URL), readFile(LEDGER_URL, 'utf8'),
  ]);
  assert.equal(expectedMediaKeys(manifest).length, 27, 'manifest-derived exact key count');
  assertRightsPolicy(rights);
  assert.equal(Object.values(rights).filter(row => RELEASE_CLASSES.has(row.releaseClass)).length, 27);
  assert.equal(
    authority['ap163-bandolier-bag::primary'].imageSourceUrl,
    NMAI_BANDOLIER_SOURCE_URL,
    'AP163 stable exact Smithsonian object source',
  );
  assert.match(
    authority['ap163-bandolier-bag::primary'].imageSourceUrl,
    /NMAI_227689$/,
    'AP163 source preserves exact object identity token',
  );
  assert.equal(
    rights['ap163-bandolier-bag::primary'].licenseUrl,
    NMAI_BANDOLIER_SOURCE_URL,
    'AP163 usage-conditions evidence stays on the exact Smithsonian object',
  );
  assertRightsAndLedger(fixture, manifest, rights, authority, ledger);
});

test('live map imports the exact ordered AP 153–166 canonical projection', async () => {
  const [fixture, html] = await Promise.all([
    readJson(CANONICAL_URL), readFile(HTML_URL, 'utf8'),
  ]);
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const liveU5 = artworks.filter(({ unit }) => unit === 5);
  const expectedIds = fixture.artworks.map(({ id }) => id);
  const liveCreditIds = Object.keys(credits);
  const liveU5CreditIds = liveCreditIds.slice(152, 166);
  const liveU5Credits = Object.fromEntries(liveU5CreditIds.map((id) => [id, credits[id]]));
  const flattenedViews = liveU5.flatMap((work) => work.images.map((image) => image));
  const restrictedViews = flattenedViews.filter(({ mediaStatus }) => mediaStatus === 'rightsRestricted');
  const publicViews = flattenedViews.filter(({ imageUrl }) => imageUrl !== null);

  assertOrderedDeepEqual(liveU5, fixture.artworks, '$.liveU5.artworks');
  assert.equal(liveCreditIds.length, 250, 'live credit total');
  assert.deepEqual(liveU5CreditIds, expectedIds, 'live U5 credit key order');
  assertOrderedDeepEqual(liveU5Credits, fixture.credits, '$.liveU5.credits');
  assert.equal(artworks.length, 250, 'live artwork total');
  assert.deepEqual(
    artworks.map(({ apNumber }) => apNumber),
    Array.from({ length: 250 }, (_, index) => index + 1),
    'live AP sequence',
  );
  assert.equal(flattenedViews.length, 27, 'live U5 view count');
  assert.equal(publicViews.length + restrictedViews.length, 27, 'live release distribution');
  publicViews.forEach(view => assert.match(view.imageUrl, /^assets\/art-history\/u5\//));
  restrictedViews.forEach((view) => {
    assert.equal(view.imageUrl, null, `${view.id}: restricted image URL`);
    assert.equal(view.mediaStatus, 'rightsRestricted', `${view.id}: restricted media status`);
  });
});

test('U5 URL validator rejects malformed pseudo-HTTPS values', () => {
  assert.doesNotThrow(() => assertHttpsUrl('https://example.com/path', 'valid'));
  for (const value of ['https:///missing-host', 'https:example.com/path', 'https://', 'http://example.com']) {
    assert.throws(() => assertHttpsUrl(value, 'malformed'), /valid HTTPS URL/);
  }
});

test('U5 ledger parser is bounded and rejects malformed, duplicate, and unreviewed rows', () => {
  const header = `| ${LEDGER_HEADER.join(' | ')} |`;
  const row = '| 153 | `ap153-chavin-huantar` | plan | [direct image](https://example.com/image.jpg) | [Source](https://example.com/source) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | open | Creator/institution: Example archive; Reviewed: exact plan identity checked |';
  const valid = ['# Ledger', header, LEDGER_DIVIDER, row, '', '| AP # | unrelated |', '| ---: | --- |'].join('\n');
  assert.equal(parseU5Ledger(valid).length, 1, 'parser stops at end of consecutive target table');
  const linkedLocal = valid.replace('https://example.com/image.jpg',
    '../../assets/art-history/u5/ap153-plan.webp');
  assert.equal(parseU5Ledger(linkedLocal)[0].imageUrl, 'assets/art-history/u5/ap153-plan.webp');
  assert.throws(() => parseU5Ledger([header, LEDGER_DIVIDER, row, row].join('\n')),
    /duplicate ledger identity/);
  assert.throws(() => parseU5Ledger([header, LEDGER_DIVIDER, row.replace(' | open |', ' | open | extra |')].join('\n')),
    /exactly 8 cells/);
  assert.throws(() => parseU5Ledger([header, LEDGER_DIVIDER, row.replace('Creator/institution:', 'Creator:')].join('\n')),
    /reviewed row/);
  assert.throws(() => parseU5Ledger([header, LEDGER_DIVIDER, row.replace('[Source](https://example.com/source)', 'Source')].join('\n')),
    /malformed HTTPS Markdown link/);
});

test('U5 canonical study guard rejects missing/extra/duplicate AP, classification, site, and comparisons', async () => {
  const [fixture, manifest, html] = await Promise.all([
    readJson(CANONICAL_URL), readJson(MANIFEST_URL), readFile(HTML_URL, 'utf8'),
  ]);
  const ids = new Set(parseJsonBlock(html, 'artwork-data').map(({ id }) => id));
  fixture.artworks.forEach(({ id }) => ids.add(id));

  const missing = structuredClone(fixture);
  missing.artworks.splice(1, 1);
  assert.throws(() => assertCanonicalStudy(missing, manifest, ids), /canonical work count/);

  const extra = structuredClone(fixture);
  extra.artworks.push({ ...structuredClone(extra.artworks.at(-1)), id: 'ap167-extra', apNumber: 167 });
  assert.throws(() => assertCanonicalStudy(extra, manifest, ids), /canonical work count/);

  const duplicate = structuredClone(fixture);
  duplicate.artworks[1].apNumber = 153;
  assert.throws(() => assertCanonicalStudy(duplicate, manifest, ids), /canonical AP order|apNumber/);

  const wrongRegion = structuredClone(fixture);
  wrongRegion.artworks[0].region = 'mesoamerica';
  assert.throws(() => assertCanonicalStudy(wrongRegion, manifest, ids), /manifest parity/);

  const wrongTradition = structuredClone(fixture);
  wrongTradition.artworks[0].traditionGroup = 'Native North America';
  assert.throws(() => assertCanonicalStudy(wrongTradition, manifest, ids), /manifest parity/);

  const inventedSite = structuredClone(fixture);
  inventedSite.artworks[0].siteName = 'Invented exact city';
  assert.throws(() => assertCanonicalStudy(inventedSite, manifest, ids), /manifest parity/);

  const qualifierDrift = structuredClone(fixture);
  const qualifiedWork = qualifierDrift.artworks.find((work) => work.provenanceQualifier);
  assert.ok(qualifiedWork, 'fixture includes a non-null provenance qualifier');
  qualifiedWork.provenanceQualifier = 'Invented precise provenance.';
  assert.throws(() => assertCanonicalStudy(qualifierDrift, manifest, ids),
    /provenanceQualifier: manifest parity/);

  const unresolved = structuredClone(fixture);
  unresolved.artworks[0].comparisonIds = ['ap999-missing'];
  unresolved.artworks[0].comparisonNotes = { 'ap999-missing': '比较形式与材料。' };
  assert.throws(() => assertCanonicalStudy(unresolved, manifest, ids), /unresolved comparison/);
});

test('U5 media and source guards reject order, alt, URL, ledger, rights, and placeholder drift', async () => {
  const [fixture, manifest, rights, authority, ledger] = await Promise.all([
    readJson(CANONICAL_URL), readJson(MANIFEST_URL), readJson(RIGHTS_URL),
    readJson(PLACEHOLDER_AUTHORITY_URL), readFile(LEDGER_URL, 'utf8'),
  ]);
  const firstIdentity = expectedMediaKeys(manifest)[0];

  const reordered = structuredClone(fixture);
  [reordered.artworks[0].images[0], reordered.artworks[0].images[1]] =
    [reordered.artworks[0].images[1], reordered.artworks[0].images[0]];
  assert.throws(() => assertCanonicalMedia(reordered, manifest, rights, authority), /view order/);

  const repeatedAlt = structuredClone(fixture);
  repeatedAlt.artworks[0].images[1].imageAlt = repeatedAlt.artworks[0].images[0].imageAlt;
  assert.throws(() => assertCanonicalMedia(repeatedAlt, manifest, rights, authority), /repeated alt/);

  const malformedUrl = structuredClone(fixture);
  const publicWork = malformedUrl.artworks.find((work) => work.images.some((view) => view.imageUrl));
  publicWork.images.find((view) => view.imageUrl).imageUrl = 'https:///missing-host';
  assert.throws(() => assertCanonicalMedia(malformedUrl, manifest, rights, authority), /local image alignment/);

  const missingLedgerRow = ledger.split('\n');
  const lastRow = missingLedgerRow.findLastIndex((line) => /^\|\s*166\s*\|/.test(line));
  missingLedgerRow.splice(lastRow, 1);
  assert.throws(() => assertRightsAndLedger(fixture, manifest, rights, authority, missingLedgerRow.join('\n')),
    /ledger exact key order/);

  const mismatch = structuredClone(rights);
  mismatch[firstIdentity].creatorOrInstitution = 'Altered source';
  assert.throws(() => assertRightsAndLedger(fixture, manifest, mismatch, authority, ledger), /credit mismatch/);

  const inventedPolicy = structuredClone(rights);
  inventedPolicy[firstIdentity].licenseName = 'Invented open terms';
  assert.throws(() => assertRightsPolicy(inventedPolicy), /exact public license URL/);

  const firstRestricted = Object.keys(authority)[0];
  assert.ok(firstRestricted, 'audit must include at least one restricted U5 view');
  const leaked = structuredClone(fixture);
  const [restrictedWorkId, restrictedViewId] = firstRestricted.split('::');
  leaked.artworks.find(({ id }) => id === restrictedWorkId).images
    .find(({ id }) => id === restrictedViewId).imageUrl = 'https://example.com/restricted.jpg';
  assert.throws(() => assertCanonicalMedia(leaked, manifest, rights, authority), /restricted URL leak/);

  const statusDrift = structuredClone(fixture);
  delete statusDrift.artworks.find(({ id }) => id === restrictedWorkId).images
    .find(({ id }) => id === restrictedViewId).mediaStatus;
  assert.throws(() => assertCanonicalMedia(statusDrift, manifest, rights, authority), /exact media field order/);

  const classDrift = structuredClone(rights);
  classDrift[firstRestricted].releaseClass = 'open';
  assert.throws(() => assertRightsAndLedger(fixture, manifest, classDrift, authority, ledger),
    /placeholder authority exact key set and order|ledger release class/);

  const missingAuthority = structuredClone(authority);
  delete missingAuthority[firstRestricted];
  assert.throws(() => assertPlaceholderAuthority(missingAuthority, rights), /exact key set and order/);

  const extraAuthority = structuredClone(authority);
  extraAuthority['ap999-extra::primary'] = structuredClone(authority[firstRestricted]);
  assert.throws(() => assertPlaceholderAuthority(extraAuthority, rights), /exact key set and order/);

  const wrongAuthority = structuredClone(authority);
  wrongAuthority[firstRestricted].imageSourceUrl = 'https:///missing-host';
  assert.throws(() => assertPlaceholderAuthority(wrongAuthority, rights), /valid HTTPS URL/);

  const wrongAuthorityIdentity = structuredClone(authority);
  wrongAuthorityIdentity[firstRestricted].imageSourceName = 'Wrong but well-formed source';
  wrongAuthorityIdentity[firstRestricted].imageSourceUrl = 'https://example.com/wrong-object';
  assert.throws(
    () => assertCanonicalMedia(fixture, manifest, rights, wrongAuthorityIdentity),
    /placeholder source name|placeholder source URL/,
  );

  const unapprovedNull = structuredClone(fixture);
  const normalWork = unapprovedNull.artworks.find((work) => work.images.some((view) => view.imageUrl));
  normalWork.images.find((view) => view.imageUrl).imageUrl = null;
  assert.throws(() => assertCanonicalMedia(unapprovedNull, manifest, rights, authority), /local image alignment/);
});

test('U5 source guard rejects coordinated restricted-source drift across every mutable bundle', async () => {
  const [fixture, manifest, rights, authority, ledger] = await Promise.all([
    readJson(CANONICAL_URL), readJson(MANIFEST_URL), readJson(RIGHTS_URL),
    readJson(PLACEHOLDER_AUTHORITY_URL), readFile(LEDGER_URL, 'utf8'),
  ]);
  const identity = 'ap153-chavin-huantar::relief-sculpture';
  const work = fixture.artworks.find(({ id }) => id === 'ap153-chavin-huantar');
  const viewIndex = work.images.findIndex(({ id }) => id === 'relief-sculpture');
  const driftedSourceName = 'Well-formed but unaudited source';
  const driftedSourceUrl = 'https://example.com/well-formed-object';
  const driftedCreator = 'Well-formed but unaudited creator';
  const driftedLicense = 'Well-formed but unaudited restricted terms';
  const driftedLicenseUrl = 'https://example.com/well-formed-rights';

  work.images[viewIndex].imageSourceName = driftedSourceName;
  work.images[viewIndex].imageSourceUrl = driftedSourceUrl;
  fixture.credits[work.id][viewIndex] = {
    creatorOrInstitution: driftedCreator,
    licenseName: driftedLicense,
    licenseUrl: driftedLicenseUrl,
  };
  rights[identity] = {
    creatorOrInstitution: driftedCreator,
    licenseName: driftedLicense,
    licenseUrl: driftedLicenseUrl,
    releaseClass: 'restricted',
  };
  authority[identity].imageSourceName = driftedSourceName;
  authority[identity].imageSourceUrl = driftedSourceUrl;
  const driftedLedger = ledger.split('\n').map((line) => {
    if (!line.includes('`ap153-chavin-huantar` | relief-sculpture |')) return line;
    return line
      .replace('[College Board CED / Corbis](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf)', `[${driftedSourceName}](${driftedSourceUrl})`)
      .replace('[Rights-managed; no portable public image permission verified](https://www.gettyimages.com/eula)', `[${driftedLicense}](${driftedLicenseUrl})`)
      .replace('Creator/institution: Charles & Josette Lenars / Corbis;', `Creator/institution: ${driftedCreator};`);
  }).join('\n');

  assert.throws(
    () => assertRightsAndLedger(fixture, manifest, rights, authority, driftedLedger),
    /audited restricted rights policy|audited media source policy/,
  );
});

test('U5 credit-shape guard rejects an array for a single-view work', async () => {
  const [fixture, manifest, rights, authority, ledger] = await Promise.all([
    readJson(CANONICAL_URL), readJson(MANIFEST_URL), readJson(RIGHTS_URL),
    readJson(PLACEHOLDER_AUTHORITY_URL), readFile(LEDGER_URL, 'utf8'),
  ]);
  fixture.credits['ap154-mesa-verde'] = [fixture.credits['ap154-mesa-verde']];
  assert.throws(
    () => assertRightsAndLedger(fixture, manifest, rights, authority, ledger),
    /single-view credit must be a plain object/,
  );
});

test('U5 ledger guard rejects an AP number that disagrees with its work identity', async () => {
  const [fixture, manifest, rights, authority, ledger] = await Promise.all([
    readJson(CANONICAL_URL), readJson(MANIFEST_URL), readJson(RIGHTS_URL),
    readJson(PLACEHOLDER_AUTHORITY_URL), readFile(LEDGER_URL, 'utf8'),
  ]);
  const wrongApLedger = ledger.replace(
    '| 153 | `ap153-chavin-huantar` | plan |',
    '| 166 | `ap153-chavin-huantar` | plan |',
  );
  assert.notEqual(wrongApLedger, ledger, 'test mutation must alter the target ledger row');
  assert.throws(
    () => assertRightsAndLedger(fixture, manifest, rights, authority, wrongApLedger),
    /ledger AP number mismatch/,
  );
});
