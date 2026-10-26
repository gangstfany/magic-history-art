import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const FIXTURE_URL = new URL('./fixtures/u3-canonical.json', import.meta.url);
const MANIFEST_URL = new URL(
  '../data/ap-art-history-unit-3-manifest.json',
  import.meta.url,
);
const RIGHTS_URL = new URL(
  '../data/ap-art-history-unit-3-rights.json',
  import.meta.url,
);
const LEDGER_URL = new URL(
  '../docs/data-sources/u3-source-ledger.md',
  import.meta.url,
);
const HTML_URL = new URL('../art-history-map.html', import.meta.url);

const CREDIT_FIELDS = [
  'creatorOrInstitution',
  'licenseName',
  'licenseUrl',
];
const RIGHTS_FIELDS = [...CREDIT_FIELDS, 'releaseClass'];
const RELEASE_CLASSES = new Set([
  'open',
  'noncommercial',
  'institutionalEducational',
  'restricted',
]);
const EXPECTED_RELEASE_CLASS_DISTRIBUTION = {
  open: 99,
  noncommercial: 2,
  institutionalEducational: 2,
  restricted: 0,
};
const OPEN_LICENSES = new Set([
  'CC BY 2.0',
  'CC BY 4.0',
  'CC BY-SA 2.0',
  'CC BY-SA 2.5',
  'CC BY-SA 3.0',
  'CC BY-SA 4.0',
  'CC0 1.0',
  'Free Art License 1.3',
  'No known copyright restrictions',
  'Public domain (anonymous EU work)',
  'Public domain (self-dedicated)',
  'Public Domain Mark 1.0',
]);
const LEDGER_HEADER = [
  'AP #',
  'Artwork id',
  'View id',
  'View label',
  'Image',
  'Source page',
  'Creator/institution',
  'License/rights',
];
const REQUIRED_ARTWORK_FIELDS = [
  'id',
  'apNumber',
  'unit',
  'region',
  'culture',
  'traditionGroup',
  'period',
  'titleEn',
  'titleZh',
  'artistCulture',
  'siteName',
  'coordinates',
  'date',
  'medium',
  'workType',
  'function',
  'form',
  'content',
  'context',
  'recognitionAnchors',
  'comparisonIds',
  'keywords',
  'images',
].sort();
const TRADITION_GROUPS = new Set([
  'lateAntiqueByzantine',
  'medievalIslamic',
  'renaissanceMannerism',
  'baroqueColonial',
]);
const PROVENANCE_QUALIFIERS = new Map([
  [
    'ap50-vienna-genesis',
    'Made in Syria or Palestine; the precise workshop is not securely localized.',
  ],
  [
    'ap53-merovingian-fibulae',
    'The Louvre records Jouy-le-Comte as the findspot; the manufacturing workshop is not securely localized, so the map uses a broad early medieval European anchor.',
  ],
  [
    'ap55-lindisfarne-gospels',
    'Made in Northumbria, probably at Lindisfarne; Eadfrith is the traditionally attributed scribe-artist.',
  ],
  [
    'ap59-bayeux-tapestry',
    'Probably embroidered in England for a Norman patron; the precise workshop and original display setting remain debated.',
  ],
  [
    'ap62-rottgen-pieta',
    'Made in the Rhineland; the precise workshop and original devotional setting are not securely localized.',
  ],
  [
    'ap68-arnolfini-portrait',
    'Made in Flanders, probably Bruges; the sitters’ identities and original domestic setting remain debated.',
  ],
]);
const REQUIRED_COMPARISONS = new Map([
  ['ap49-santa-sabina', 'ap46-pantheon'],
  ['ap52-hagia-sophia', 'ap46-pantheon'],
  ['ap58-church-sainte-foy', 'ap23-tutankhamun-innermost-coffin'],
  ['ap81-codex-mendoza-frontispiece', 'ap19-code-of-hammurabi'],
  ['ap89-ecstasy-saint-teresa', 'ap46-pantheon'],
]);
const NON_COMMONS_MEDIA = new Map([
  [
    mediaKey('ap53-merovingian-fibulae', 'primary'),
    {
      imageUrl: 'https://collections.louvre.fr/media/cache/small/0000000021/0000116783/0000846601_OG.JPG',
      sourceUrl: 'https://collections.louvre.fr/en/ark:/53355/cl010116783',
    },
  ],
  [
    mediaKey('ap55-lindisfarne-gospels', 'st-luke-portrait'),
    {
      imageUrl: 'https://human.libretexts.org/@api/deki/files/29514/luke-portrait.jpg?revision=1',
      sourceUrl: 'https://pressbooks.pub/pacarthistory/back-matter/image-credits/',
    },
  ],
  [
    mediaKey('ap66-merode-altarpiece', 'primary'),
    {
      imageUrl: 'https://images.metmuseum.org/CRDImages/cl/original/DP273206.jpg',
      sourceUrl: 'https://www.metmuseum.org/collection/the-collection-online/search/470304',
    },
  ],
  [
    mediaKey('ap95-virgin-guadalupe', 'primary'),
    {
      imageUrl: 'https://collections-images.lacma.org/images/158374/158374-1-primary.webp',
      sourceUrl: 'https://collections.lacma.org/object/158374',
    },
  ],
  [
    mediaKey('ap97-spaniard-indian-mestizo', 'primary'),
    {
      imageUrl: 'https://human.libretexts.org/@api/deki/files/110949/77fccf037a0741d8859632be19bd3d6f0bd88b60.jpg?revision=1',
      sourceUrl: 'https://smarthistory.org/spaniard-and-indian-produce-a-mestizo-attributed-to-juan-rodriguez/',
    },
  ],
]);
const HAN_SCRIPT = /\p{Script=Han}/u;
const UNFINISHED_VALUE = /\b(?:tbd|todo|placeholder|n\/a|not available)\b|待补|待定|占位/i;

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}

function mediaKey(artworkId, viewId) {
  return `${artworkId}::${viewId}`;
}

function expectedTraditionGroup(apNumber) {
  if (apNumber <= 52) return 'lateAntiqueByzantine';
  if (apNumber <= 65 || apNumber === 84) return 'medievalIslamic';
  if (apNumber <= 80 || apNumber === 83) return 'renaissanceMannerism';
  return 'baroqueColonial';
}

function parseJsonBlock(html, id) {
  const match = html.match(new RegExp(
    `<script id="${id}" type="application/json">([\\s\\S]*?)<\\/script>`,
  ));
  assert.ok(match, `missing ${id}`);
  return JSON.parse(match[1]);
}

function normalizeCommonsFilename(url, prefix) {
  if (!url.startsWith(prefix)) return null;
  return decodeURIComponent(url.slice(prefix.length))
    .normalize('NFC')
    .replaceAll('_', ' ');
}

function assertAuditedMediaPair(artworkId, viewId, imageUrl, sourceUrl) {
  const identity = mediaKey(artworkId, viewId);
  const frozen = NON_COMMONS_MEDIA.get(identity);
  if (frozen) {
    assert.deepEqual({ imageUrl, sourceUrl }, frozen, `${identity}: media pair`);
    return;
  }
  const imageFilename = normalizeCommonsFilename(
    imageUrl,
    'https://commons.wikimedia.org/wiki/Special:Redirect/file/',
  );
  const sourceFilename = normalizeCommonsFilename(
    sourceUrl,
    'https://commons.wikimedia.org/wiki/File:',
  );
  assert.ok(imageFilename && sourceFilename, `${identity}: unaudited media pair`);
  assert.equal(imageFilename, sourceFilename, `${identity}: Commons filename mismatch`);
}

function projectCanonicalMedia(fixture) {
  return fixture.artworks.flatMap((work) => work.images.map((image) => ({
    apNumber: work.apNumber,
    artworkId: work.id,
    viewId: image.id,
    viewLabel: image.label,
    imageUrl: image.imageUrl,
    sourceName: image.imageSourceName,
    sourceUrl: image.imageSourceUrl,
  })));
}

function normalizedCredits(fixture) {
  return fixture.artworks.flatMap((work) => {
    const credits = Array.isArray(fixture.credits[work.id])
      ? fixture.credits[work.id]
      : [fixture.credits[work.id]];
    assert.equal(
      credits.length,
      work.images.length,
      `${work.id}: credit count must match media count`,
    );
    return work.images.map((image, index) => [
      mediaKey(work.id, image.id),
      credits[index],
    ]);
  });
}

function expectedReleaseClass(licenseName) {
  if (OPEN_LICENSES.has(licenseName)) return 'open';
  if (licenseName === 'CC BY-NC-SA 4.0') return 'noncommercial';
  if (
    licenseName === 'Louvre educational-use terms; commercial permission required'
    || licenseName === 'LACMA collection image; reuse subject to museum terms'
  ) {
    return 'institutionalEducational';
  }
  return 'restricted';
}

function assertFinishedString(value, identity, field) {
  assert.equal(typeof value, 'string', `${identity}.${field}: expected string`);
  assert.ok(value.trim(), `${identity}.${field}: expected finished string`);
  assert.doesNotMatch(
    value,
    UNFINISHED_VALUE,
    `${identity}.${field}: unfinished value`,
  );
}

function validateRightsAudit(audit, expectedEntries) {
  assert.deepEqual(
    Object.keys(audit),
    expectedEntries.map(([key]) => key),
    'rights audit key set and order',
  );

  expectedEntries.forEach(([identity, canonicalCredit]) => {
    const entry = audit[identity];
    assert.deepEqual(
      Object.keys(entry).sort(),
      RIGHTS_FIELDS.toSorted(),
      `${identity}: exact rights schema`,
    );
    RIGHTS_FIELDS.forEach((field) => {
      assertFinishedString(entry[field], identity, field);
    });
    assert.match(
      entry.licenseUrl,
      /^https:\/\//,
      `${identity}.licenseUrl: expected HTTPS`,
    );
    assert.ok(
      RELEASE_CLASSES.has(entry.releaseClass),
      `${identity}.releaseClass: unsupported value`,
    );
    assert.equal(
      entry.releaseClass,
      expectedReleaseClass(entry.licenseName),
      `${identity}.releaseClass: does not match audited license policy`,
    );
    CREDIT_FIELDS.forEach((field) => {
      assert.equal(
        entry[field],
        canonicalCredit[field],
        `${identity}.${field}: canonical credit differs from rights audit`,
      );
    });
  });
}

function assertCanonicalCreditSchema(expectedEntries) {
  expectedEntries.forEach(([identity, credit]) => {
    assert.deepEqual(
      Object.keys(credit).sort(),
      CREDIT_FIELDS.toSorted(),
      `${identity}: exact canonical credit schema`,
    );
    CREDIT_FIELDS.forEach((field) => {
      assertFinishedString(credit[field], identity, field);
    });
    assert.match(
      credit.licenseUrl,
      /^https:\/\//,
      `${identity}.licenseUrl: expected HTTPS`,
    );
  });
}

function markdownLink(cell, identity = 'ledger') {
  const match = cell.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  assert.ok(match, `${identity}: malformed ledger link: ${cell}`);
  return { label: match[1], url: match[2] };
}

function splitLedgerRow(line) {
  assert.match(line, /^\|.*\|$/, `malformed ledger row: ${line}`);
  return line.split('|').slice(1, -1).map((cell) => cell.trim());
}

function parseU3Ledger(markdown) {
  const headerLine = markdown
    .split('\n')
    .find((line) => line.startsWith('| AP # |'));
  assert.ok(headerLine, 'missing exact ledger header');
  assert.deepEqual(splitLedgerRow(headerLine), LEDGER_HEADER);

  const rows = markdown
    .split('\n')
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map(splitLedgerRow);
  const identities = new Set();
  rows.forEach((cells, index) => {
    assert.equal(cells.length, 8, `ledger row ${index + 1}: expected 8 cells`);
    const identity = mediaKey(cells[1].replaceAll('`', ''), cells[2]);
    assert.ok(!identities.has(identity), `${identity}: duplicate ledger identity`);
    identities.add(identity);
    for (const cellIndex of [4, 5, 7]) {
      assert.match(
        markdownLink(cells[cellIndex], identity).url,
        /^https:\/\//,
        `${identity}: ledger column ${cellIndex + 1} must use HTTPS`,
      );
    }
    const imageUrl = markdownLink(cells[4], identity).url;
    const sourceUrl = markdownLink(cells[5], identity).url;
    const imageFilename = normalizeCommonsFilename(
      imageUrl,
      'https://commons.wikimedia.org/wiki/Special:Redirect/file/',
    );
    const sourceFilename = normalizeCommonsFilename(
      sourceUrl,
      'https://commons.wikimedia.org/wiki/File:',
    );
    if (imageFilename || sourceFilename) {
      assert.ok(
        imageFilename && sourceFilename,
        `${identity}: incomplete Commons media pair`,
      );
      assert.equal(imageFilename, sourceFilename, `${identity}: Commons filename mismatch`);
    }
  });
  return rows;
}

function parseLedgerCredits(markdown) {
  return parseU3Ledger(markdown)
    .map((cells) => {
      const identity = mediaKey(cells[1].replaceAll('`', ''), cells[2]);
      const license = markdownLink(cells[7], identity);
      return [
        identity,
        {
          creatorOrInstitution: cells[6],
          licenseName: license.label,
          licenseUrl: license.url,
        },
      ];
    });
}

function assertLedgerMatchesAudit(ledgerEntries, audit) {
  assert.deepEqual(
    ledgerEntries.map(([key]) => key),
    Object.keys(audit),
    'ledger and rights audit key order',
  );
  ledgerEntries.forEach(([identity, credit]) => {
    CREDIT_FIELDS.forEach((field) => {
      assert.equal(
        credit[field],
        audit[identity][field],
        `${identity}.${field}: ledger credit differs from rights audit`,
      );
    });
  });
}

function assertReleaseReady(audit) {
  const restricted = Object.entries(audit)
    .filter(([, entry]) => entry.releaseClass === 'restricted')
    .map(([identity]) => identity);
  assert.deepEqual(
    restricted,
    [],
    `release blocked by restricted media: ${restricted.join(', ')}`,
  );
}

function assertReleaseClassDistribution(audit) {
  const distribution = Object.fromEntries(
    [...RELEASE_CLASSES].map((releaseClass) => [releaseClass, 0]),
  );
  Object.values(audit).forEach(({ releaseClass }) => {
    distribution[releaseClass] += 1;
  });
  assert.deepEqual(
    distribution,
    EXPECTED_RELEASE_CLASS_DISTRIBUTION,
    'U3 release class distribution',
  );
}

test('U3 ledger parser rejects malformed rows, HTTP, duplicates, and Commons mismatches', () => {
  const row = '| 48 | `ap48-catacomb-priscilla` | greek-chapel | Greek Chapel | [direct image](https://example.com/image.jpg) | [Example](https://example.com/source) | Example institution | [Public domain](https://creativecommons.org/publicdomain/mark/1.0/) |';
  const table = [
    `| ${LEDGER_HEADER.join(' | ')} |`,
    '| ---: | --- | --- | --- | --- | --- | --- | --- |',
  ];
  assert.throws(
    () => parseU3Ledger([...table, row.replace(' | Example institution', '')].join('\n')),
    /expected 8 cells/,
  );
  assert.throws(
    () => parseU3Ledger([...table, row.replace(' | Example institution', ' | extra | Example institution')].join('\n')),
    /expected 8 cells/,
  );
  assert.throws(
    () => parseU3Ledger([...table, row, row].join('\n')),
    /duplicate ledger identity/,
  );
  assert.throws(
    () => parseU3Ledger(
      [...table, row.replace('https://example.com/image.jpg', 'http://example.com/image.jpg')].join('\n'),
    ),
    /HTTPS/,
  );
  const mismatchedCommons = row
    .replace(
      'https://example.com/image.jpg',
      'https://commons.wikimedia.org/wiki/Special:Redirect/file/Greek_Chapel.jpg',
    )
    .replace(
      'https://example.com/source',
      'https://commons.wikimedia.org/wiki/File:Good_Shepherd.jpg',
    );
  assert.throws(
    () => parseU3Ledger([...table, mismatchedCommons].join('\n')),
    /Commons filename mismatch/,
  );
});

test('U3 canonical fixture matches the 51-work manifest and study contract', async () => {
  const [fixture, manifest, html] = await Promise.all([
    readJson(FIXTURE_URL),
    readJson(MANIFEST_URL),
    readFile(HTML_URL, 'utf8'),
  ]);
  const manifestEntries = Object.entries(manifest);
  const expectedIds = manifestEntries.map(([, work]) => work.id);
  const liveIds = parseJsonBlock(html, 'artwork-data').map(({ id }) => id);
  const resolvableIds = new Set([...liveIds, ...expectedIds]);

  assert.deepEqual(Object.keys(fixture).sort(), ['artworks', 'credits']);
  assert.equal(fixture.artworks.length, 51);
  assert.deepEqual(
    fixture.artworks.map(({ apNumber }) => apNumber),
    Array.from({ length: 51 }, (_, index) => index + 48),
  );
  assert.deepEqual(fixture.artworks.map(({ id }) => id), expectedIds);

  fixture.artworks.forEach((work, index) => {
    const manifestWork = manifestEntries[index][1];
    const expectedFields = work.provenanceQualifier === undefined
      ? REQUIRED_ARTWORK_FIELDS
      : [...REQUIRED_ARTWORK_FIELDS, 'provenanceQualifier'].sort();
    assert.deepEqual(Object.keys(work).sort(), expectedFields, `${work.id}: schema`);
    assert.equal(work.unit, 3, `${work.id}.unit`);
    assert.equal(work.id, manifestWork.id, `${work.id}.id`);
    assert.equal(work.titleEn, manifestWork.titleEn, `${work.id}.titleEn`);
    assert.equal(work.region, manifestWork.region, `${work.id}.region`);
    assert.equal(work.siteName, manifestWork.siteName, `${work.id}.siteName`);

    for (const field of [
      'id',
      'region',
      'culture',
      'traditionGroup',
      'period',
      'titleEn',
      'titleZh',
      'artistCulture',
      'siteName',
      'date',
      'medium',
      'workType',
      'function',
      'form',
      'content',
      'context',
    ]) {
      assertFinishedString(work[field], work.id, field);
    }
    const qualifier = PROVENANCE_QUALIFIERS.get(work.id);
    if (qualifier) {
      assert.equal(work.provenanceQualifier, qualifier, `${work.id}.provenanceQualifier`);
    }
    assert.ok(TRADITION_GROUPS.has(work.traditionGroup), `${work.id}.traditionGroup`);
    assert.equal(
      work.traditionGroup,
      expectedTraditionGroup(work.apNumber),
      `${work.id}.traditionGroup`,
    );
    assert.ok(!TRADITION_GROUPS.has(work.culture), `${work.id}.culture`);
    assert.deepEqual(Object.keys(work.coordinates).sort(), ['x', 'y']);
    assert.ok(Number.isFinite(work.coordinates.x), `${work.id}.coordinates.x`);
    assert.ok(Number.isFinite(work.coordinates.y), `${work.id}.coordinates.y`);
    assert.ok(work.coordinates.x >= 0 && work.coordinates.x <= 1600);
    assert.ok(work.coordinates.y >= 0 && work.coordinates.y <= 800);

    for (const [field, minimum] of [
      ['recognitionAnchors', 2],
      ['comparisonIds', 1],
      ['keywords', 3],
    ]) {
      assert.ok(Array.isArray(work[field]), `${work.id}.${field}: expected array`);
      assert.ok(work[field].length >= minimum, `${work.id}.${field}: minimum`);
      work[field].forEach((value, itemIndex) => {
        assertFinishedString(value, work.id, `${field}[${itemIndex}]`);
      });
    }
    work.comparisonIds.forEach((comparisonId) => {
      assert.ok(resolvableIds.has(comparisonId), `${work.id}: unresolved ${comparisonId}`);
    });
    const requiredComparison = REQUIRED_COMPARISONS.get(work.id);
    if (requiredComparison) {
      assert.ok(
        work.comparisonIds.includes(requiredComparison),
        `${work.id}: missing comparison ${requiredComparison}`,
      );
    }
    for (const field of ['function', 'form', 'content', 'context']) {
      assert.match(work[field], HAN_SCRIPT, `${work.id}.${field}: Chinese study copy`);
    }
    work.recognitionAnchors.forEach((anchor, anchorIndex) => {
      assert.match(
        anchor,
        HAN_SCRIPT,
        `${work.id}.recognitionAnchors[${anchorIndex}]: Chinese`,
      );
    });
    assert.ok(
      work.keywords.some((keyword) => HAN_SCRIPT.test(keyword)),
      `${work.id}.keywords: Chinese search term`,
    );
  });
  assert.match(
    fixture.credits['ap53-merovingian-fibulae'].creatorOrInstitution,
    /^Anonymous\b/,
  );
});

test('U3 canonical media has exact view schemas, visible-content alts, and audited pairs', async () => {
  const [fixture, manifest] = await Promise.all([
    readJson(FIXTURE_URL),
    readJson(MANIFEST_URL),
  ]);
  const manifestById = new Map(Object.values(manifest).map((work) => [work.id, work]));
  fixture.artworks.forEach((work) => {
    assert.deepEqual(
      work.images.map(({ id }) => id),
      manifestById.get(work.id).requiredViewIds,
      `${work.id}: view order`,
    );
    const alts = new Set();
    work.images.forEach((image) => {
      const identity = mediaKey(work.id, image.id);
      assert.deepEqual(
        Object.keys(image).sort(),
        ['id', 'imageAlt', 'imageSourceName', 'imageSourceUrl', 'imageUrl', 'label'],
        `${identity}: image schema`,
      );
      for (const field of [
        'id',
        'label',
        'imageUrl',
        'imageAlt',
        'imageSourceName',
        'imageSourceUrl',
      ]) {
        assertFinishedString(image[field], identity, field);
      }
      assert.match(image.imageUrl, /^https:\/\//, `${identity}.imageUrl`);
      assert.match(image.imageSourceUrl, /^https:\/\//, `${identity}.imageSourceUrl`);
      assert.doesNotMatch(image.imageAlt, /Primary view/i, `${identity}.imageAlt`);
      assert.notEqual(
        image.imageAlt,
        `${work.titleEn} — ${image.label} (AP ${work.apNumber})`,
        `${identity}.imageAlt`,
      );
      assert.match(image.imageAlt, HAN_SCRIPT, `${identity}.imageAlt`);
      assert.ok(!alts.has(image.imageAlt), `${identity}: duplicate imageAlt`);
      alts.add(image.imageAlt);
      assertAuditedMediaPair(work.id, image.id, image.imageUrl, image.imageSourceUrl);
    });
  });
  assert.equal(projectCanonicalMedia(fixture).length, 103);
});

test('U3 ledger is the exact 103-view media projection', async () => {
  const [fixture, ledger] = await Promise.all([
    readJson(FIXTURE_URL),
    readFile(LEDGER_URL, 'utf8'),
  ]);
  const rows = parseU3Ledger(ledger);
  assert.equal(rows.length, 103);
  const ledgerMedia = rows.map((cells) => {
    const artworkId = cells[1].replaceAll('`', '');
    const identity = mediaKey(artworkId, cells[2]);
    const image = markdownLink(cells[4], identity);
    const source = markdownLink(cells[5], identity);
    return {
      apNumber: Number(cells[0]),
      artworkId,
      viewId: cells[2],
      viewLabel: cells[3],
      imageUrl: image.url,
      sourceName: source.label,
      sourceUrl: source.url,
    };
  });
  assert.deepEqual(ledgerMedia, projectCanonicalMedia(fixture));
});

test('U3 rights audit independently freezes all 103 canonical and ledger credits', async () => {
  const [fixture, manifest, audit, ledger] = await Promise.all([
    readJson(FIXTURE_URL),
    readJson(MANIFEST_URL),
    readJson(RIGHTS_URL),
    readFile(LEDGER_URL, 'utf8'),
  ]);
  const expectedKeys = Object.values(manifest).flatMap((work) =>
    work.requiredViewIds.map((viewId) => mediaKey(work.id, viewId)));
  const credits = normalizedCredits(fixture);

  assert.equal(expectedKeys.length, 103);
  assert.deepEqual(credits.map(([key]) => key), expectedKeys);
  assertCanonicalCreditSchema(credits);
  validateRightsAudit(audit, credits);
  assertLedgerMatchesAudit(parseLedgerCredits(ledger), audit);
});

test('U3 rights validator rejects credit, schema, URL, and release downgrades', async () => {
  const [fixture, audit] = await Promise.all([
    readJson(FIXTURE_URL),
    readJson(RIGHTS_URL),
  ]);
  const credits = normalizedCredits(fixture);
  const firstKey = credits[0][0];
  const mutate = (field, value) => {
    const candidate = structuredClone(audit);
    candidate[firstKey][field] = value;
    return candidate;
  };

  assert.throws(
    () => validateRightsAudit(mutate('creatorOrInstitution', 'Altered creator'), credits),
    /canonical credit differs/,
  );
  assert.throws(
    () => validateRightsAudit(mutate('licenseName', 'Altered license'), credits),
    /releaseClass|canonical credit differs/,
  );
  assert.throws(
    () => validateRightsAudit(mutate('licenseUrl', 'https://example.com/altered'), credits),
    /canonical credit differs/,
  );
  const extraKey = structuredClone(audit);
  extraKey[firstKey].unexpected = 'extra';
  assert.throws(
    () => validateRightsAudit(extraKey, credits),
    /exact rights schema/,
  );
  assert.throws(
    () => validateRightsAudit(mutate('licenseUrl', 'http://example.com/license'), credits),
    /expected HTTPS/,
  );
  assert.throws(
    () => validateRightsAudit(mutate('releaseClass', 'institutionalEducational'), credits),
    /audited license policy/,
  );
});

test('U3 release readiness rejects every restricted media view', async () => {
  assertReleaseReady(await readJson(RIGHTS_URL));
});

test('U3 release class distribution is exactly 99 open, 2 noncommercial, 2 institutional, and 0 restricted', async () => {
  const audit = await readJson(RIGHTS_URL);
  assertReleaseClassDistribution(audit);

  const candidate = structuredClone(audit);
  const openKey = Object.keys(candidate)
    .find((key) => candidate[key].releaseClass === 'open');
  assert.ok(openKey, 'expected at least one open media view');
  candidate[openKey].releaseClass = 'noncommercial';
  assert.throws(
    () => assertReleaseClassDistribution(candidate),
    /U3 release class distribution/,
  );
});

test('U3 exact AP55 and AP97 OER replacements are noncommercial and release-ready', async () => {
  const [fixture, audit] = await Promise.all([
    readJson(FIXTURE_URL),
    readJson(RIGHTS_URL),
  ]);
  const byId = new Map(fixture.artworks.map((work) => [work.id, work]));
  const ap55 = byId.get('ap55-lindisfarne-gospels').images
    .find(({ id }) => id === 'st-luke-portrait');
  const ap97 = byId.get('ap97-spaniard-indian-mestizo').images[0];

  assert.equal(
    ap55.imageUrl,
    'https://human.libretexts.org/@api/deki/files/29514/luke-portrait.jpg?revision=1',
  );
  assert.equal(
    ap55.imageSourceUrl,
    'https://pressbooks.pub/pacarthistory/back-matter/image-credits/',
  );
  assert.equal(
    ap97.imageUrl,
    'https://human.libretexts.org/@api/deki/files/110949/77fccf037a0741d8859632be19bd3d6f0bd88b60.jpg?revision=1',
  );
  assert.equal(
    ap97.imageSourceUrl,
    'https://smarthistory.org/spaniard-and-indian-produce-a-mestizo-attributed-to-juan-rodriguez/',
  );
  assert.equal(
    audit[mediaKey('ap55-lindisfarne-gospels', 'st-luke-portrait')].releaseClass,
    'noncommercial',
  );
  assert.equal(
    audit[mediaKey('ap97-spaniard-indian-mestizo', 'primary')].releaseClass,
    'noncommercial',
  );
  assertReleaseReady(audit);
});

test('AP55 St. Luke portrait preserves the approved Smarthistory attribution', async () => {
  const [fixture, audit] = await Promise.all([
    readJson(FIXTURE_URL),
    readJson(RIGHTS_URL),
  ]);
  const work = fixture.artworks.find(({ id }) => id === 'ap55-lindisfarne-gospels');
  const viewIndex = work.images.findIndex(({ id }) => id === 'st-luke-portrait');
  const expectedCreator =
    'Eadfrith (traditionally attributed) / British Library / Smarthistory';
  const mediaIdentity = mediaKey(work.id, work.images[viewIndex].id);

  assert.equal(
    fixture.credits[work.id][viewIndex].creatorOrInstitution,
    expectedCreator,
    'canonical AP55 St. Luke portrait attribution',
  );
  assert.equal(
    audit[mediaIdentity].creatorOrInstitution,
    expectedCreator,
    'rights audit AP55 St. Luke portrait attribution',
  );
  assert.match(audit[mediaIdentity].creatorOrInstitution, /Smarthistory/);
});

test('AP55 ledger summary distinguishes its Pressbooks source from institutional terms', async () => {
  const ledger = await readFile(LEDGER_URL, 'utf8');
  const ap55Row = parseU3Ledger(ledger).find((cells) => (
    cells[1] === '`ap55-lindisfarne-gospels`'
      && cells[2] === 'st-luke-portrait'
  ));

  assert.doesNotMatch(ledger, /Penn State/);
  assert.match(
    ledger,
    /AP 55 St\. Luke portrait 使用 Pressbooks 来源页、Smarthistory 图片署名与 CC BY-NC-SA 4\.0/,
  );
  assert.ok(ap55Row, 'missing AP55 St. Luke portrait ledger row');
  assert.equal(
    markdownLink(ap55Row[5]).url,
    'https://pressbooks.pub/pacarthistory/back-matter/image-credits/',
  );
  assert.equal(
    ap55Row[6],
    'Eadfrith (traditionally attributed) / British Library / Smarthistory',
  );
  assert.deepEqual(markdownLink(ap55Row[7]), {
    label:'CC BY-NC-SA 4.0',
    url:'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  });
});
