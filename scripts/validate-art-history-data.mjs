import { readFile } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { assertLocalMediaContract } from './art-history-local-media-contract.mjs';

const DEFAULT_HTML_PATH = new URL('../art-history-map.html', import.meta.url);
const ACTIVE_MANIFESTS = Object.freeze([
  ['U1', 'data/ap-art-history-unit-1-manifest.json'],
  ['U2', 'data/ap-art-history-unit-2-manifest.json'],
  ['U3', 'data/ap-art-history-unit-3-manifest.json'],
  ['U4', 'data/ap-art-history-unit-4-manifest.json'],
  ['U5', 'data/ap-art-history-unit-5-manifest.json'],
  ['U6', 'data/ap-art-history-unit-6-manifest.json'],
  ['U7', 'data/ap-art-history-unit-7-manifest.json'],
  ['U8', 'data/ap-art-history-unit-8-manifest.json'],
  ['U9', 'data/ap-art-history-unit-9-manifest.json'],
  ['U10', 'data/ap-art-history-unit-10-manifest.json'],
]);
const MANIFEST_URLS = Object.freeze(Object.fromEntries(
  ACTIVE_MANIFESTS.map(([unitLabel, relativePath]) => [
    Number(unitLabel.slice(1)),
    new URL(`../${relativePath}`, import.meta.url),
  ]),
));
const AUDITED_RIGHTS_URLS = Object.freeze({
  3: new URL('../data/ap-art-history-unit-3-rights.json', import.meta.url),
  4: new URL('../data/ap-art-history-unit-4-rights.json', import.meta.url),
  5: new URL('../data/ap-art-history-unit-5-rights.json', import.meta.url),
  6: new URL('../data/ap-art-history-unit-6-rights.json', import.meta.url),
  7: new URL('../data/ap-art-history-unit-7-rights.json', import.meta.url),
  8: new URL('../data/ap-art-history-unit-8-rights.json', import.meta.url),
  9: new URL('../data/ap-art-history-unit-9-rights.json', import.meta.url),
  10: new URL('../data/ap-art-history-unit-10-rights.json', import.meta.url),
});
const PLACEHOLDER_AUTHORITY_URLS = Object.freeze({
  4: new URL('../data/ap-art-history-unit-4-public-placeholders.json', import.meta.url),
  5: new URL('../data/ap-art-history-unit-5-placeholder-authority.json', import.meta.url),
  6: new URL('../data/ap-art-history-unit-6-placeholder-authority.json', import.meta.url),
  7: new URL('../data/ap-art-history-unit-7-placeholder-authority.json', import.meta.url),
  8: new URL('../data/ap-art-history-unit-8-placeholder-authority.json', import.meta.url),
  9: new URL('../data/ap-art-history-unit-9-placeholder-authority.json', import.meta.url),
  10: new URL('../data/ap-art-history-unit-10-placeholder-authority.json', import.meta.url),
});
const EXPECTED_ARTWORK_COUNT = 250;
const EXPECTED_LAST_AP_NUMBER = 250;
const U3_REGION_COUNTS = Object.freeze({
  italyVatican: 18,
  france: 5,
  iberianPeninsula: 5,
  britishIsles: 3,
  lowCountries: 7,
  centralEurope: 4,
  easternMediterranean: 4,
  colonialAmericas: 5,
});
const U3_REGIONS = new Set(Object.keys(U3_REGION_COUNTS));
const UNIT_RULES = Object.freeze({
  1: Object.freeze({
    start: 1,
    end: 11,
    count: 11,
    regions: new Set(['africa', 'europe', 'americas', 'middleEast', 'eastAsia', 'oceania']),
  }),
  2: Object.freeze({
    start: 12,
    end: 47,
    count: 36,
    regions: new Set(['middleEast', 'northAfrica', 'southernEurope']),
  }),
  3: Object.freeze({
    start: 48,
    end: 98,
    count: 51,
    regions: U3_REGIONS,
  }),
  4: Object.freeze({
    start: 99,
    end: 152,
    count: 54,
    regions: new Set([
      'france',
      'britishIsles',
      'southernEurope',
      'centralNorthernEurope',
      'russiaSoviet',
      'unitedStates',
      'mexicoCaribbean',
      'pacific',
      'transatlantic',
    ]),
  }),
  5: Object.freeze({
    start: 153,
    end: 166,
    count: 14,
    regions: new Set([
      'centralAndes',
      'ancestralPueblo',
      'mesoamerica',
      'easternWoodlands',
      'northwestCoast',
      'plainsGreatBasin',
    ]),
  }),
  6: Object.freeze({
    start: 167,
    end: 180,
    count: 14,
    regions: new Set(['southernAfrica', 'westAfrica', 'centralAfrica']),
  }),
  7: Object.freeze({
    start: 181, end: 191, count: 11,
    regions: new Set(['levant', 'arabianPeninsula', 'iran', 'afghanCentralAsia', 'tibetanHimalaya', 'northAfricaNearEast']),
  }),
  8: Object.freeze({
    start: 192, end: 212, count: 21,
    regions: new Set(['india', 'china', 'korea', 'japan', 'indonesia', 'cambodia']),
  }),
  9: Object.freeze({
    start: 213, end: 223, count: 11,
    regions: new Set(['micronesia','rapa-nui','hawaii','cook-islands','torres-strait','niue','new-zealand','marshall-islands','papua-new-guinea','fiji']),
  }),
  10: Object.freeze({
    start:224, end:250, count:27,
    regions:new Set(['united-states','korea','poland','china','europe','australia','new-zealand','spain','transnational','united-kingdom','nigeria','italy']),
  }),
});
const REQUIRED_FIELDS = [
  'id',
  'apNumber',
  'titleEn',
  'titleZh',
  'unit',
  'culture',
  'region',
  'period',
  'date',
  'artistCulture',
  'siteName',
  'coordinates',
  'medium',
  'workType',
  'function',
  'form',
  'content',
  'context',
  'recognitionAnchors',
  'comparisonIds',
  'keywords',
];
const STRING_FIELDS = REQUIRED_FIELDS.filter(
  (field) => !['apNumber', 'unit', 'coordinates', 'recognitionAnchors', 'comparisonIds', 'keywords'].includes(field),
);
const MEDIA_FIELDS = [
  'label',
  'imageUrl',
  'imageAlt',
  'imageSourceName',
  'imageSourceUrl',
];
const MEDIA_STATUS_FIELD = 'mediaStatus';
const U5_PUBLIC_MEDIA_FIELDS = [
  'id',
  'label',
  'imageUrl',
  'imageAlt',
  'imageSourceName',
  'imageSourceUrl',
];
const U5_RESTRICTED_MEDIA_FIELDS = [...U5_PUBLIC_MEDIA_FIELDS, MEDIA_STATUS_FIELD];
const LEGACY_MEDIA_FIELDS = MEDIA_FIELDS.filter((field) => field !== 'label');
const U2_CULTURES = new Set(['ancientNearEast', 'egypt', 'greece', 'etruscan', 'rome']);
const U3_CLASSIFICATIONS = new Map([
  [48, ['earlyChristianRome', 'lateAntiqueByzantine']],
  [49, ['earlyChristianRome', 'lateAntiqueByzantine']],
  [50, ['earlyByzantineManuscript', 'lateAntiqueByzantine']],
  [51, ['byzantineRavenna', 'lateAntiqueByzantine']],
  [52, ['byzantineConstantinople', 'lateAntiqueByzantine']],
  [53, ['merovingianMetalwork', 'medievalIslamic']],
  [54, ['byzantineSinai', 'medievalIslamic']],
  [55, ['insularHibernoSaxon', 'medievalIslamic']],
  [56, ['umayyadIberia', 'medievalIslamic']],
  [57, ['umayyadIberia', 'medievalIslamic']],
  [58, ['romanesquePilgrimage', 'medievalIslamic']],
  [59, ['normanRomanesque', 'medievalIslamic']],
  [60, ['frenchGothic', 'medievalIslamic']],
  [61, ['frenchGothicManuscript', 'medievalIslamic']],
  [62, ['germanGothicDevotional', 'medievalIslamic']],
  [63, ['protoRenaissanceItaly', 'medievalIslamic']],
  [64, ['sephardicJewishManuscript', 'medievalIslamic']],
  [65, ['nasridAndalusia', 'medievalIslamic']],
  [66, ['earlyNetherlandish', 'renaissanceMannerism']],
  [67, ['florentineEarlyRenaissance', 'renaissanceMannerism']],
  [68, ['earlyNetherlandish', 'renaissanceMannerism']],
  [69, ['florentineEarlyRenaissance', 'renaissanceMannerism']],
  [70, ['florentineEarlyRenaissance', 'renaissanceMannerism']],
  [71, ['florentineEarlyRenaissance', 'renaissanceMannerism']],
  [72, ['florentineRenaissance', 'renaissanceMannerism']],
  [73, ['highRenaissanceItaly', 'renaissanceMannerism']],
  [74, ['northernRenaissanceGermany', 'renaissanceMannerism']],
  [75, ['highRenaissanceItaly', 'renaissanceMannerism']],
  [76, ['highRenaissanceItaly', 'renaissanceMannerism']],
  [77, ['northernRenaissanceGermany', 'renaissanceMannerism']],
  [78, ['italianMannerism', 'renaissanceMannerism']],
  [79, ['protestantReformationGermany', 'renaissanceMannerism']],
  [80, ['venetianRenaissance', 'renaissanceMannerism']],
  [81, ['colonialMexicaManuscript', 'baroqueColonial']],
  [82, ['romanBaroqueJesuit', 'baroqueColonial']],
  [83, ['northernRenaissanceFlemish', 'renaissanceMannerism']],
  [84, ['ottomanIslamic', 'medievalIslamic']],
  [85, ['italianBaroque', 'baroqueColonial']],
  [86, ['flemishBaroque', 'baroqueColonial']],
  [87, ['dutchBaroque', 'baroqueColonial']],
  [88, ['italianBaroque', 'baroqueColonial']],
  [89, ['italianBaroque', 'baroqueColonial']],
  [90, ['andeanColonialBaroque', 'baroqueColonial']],
  [91, ['spanishBaroque', 'baroqueColonial']],
  [92, ['dutchBaroque', 'baroqueColonial']],
  [93, ['frenchBaroqueAbsolutism', 'baroqueColonial']],
  [94, ['newSpainEnconchado', 'baroqueColonial']],
  [95, ['newSpainGuadalupe', 'baroqueColonial']],
  [96, ['dutchBaroqueStillLife', 'baroqueColonial']],
  [97, ['newSpainCasta', 'baroqueColonial']],
  [98, ['britishRococoSatire', 'baroqueColonial']],
]);
const U3_CULTURES = new Set(
  [...U3_CLASSIFICATIONS.values()].map(([culture]) => culture),
);
const U3_TRADITION_GROUPS = new Set(
  [...U3_CLASSIFICATIONS.values()].map(([, traditionGroup]) => traditionGroup),
);
const U3_PROVENANCE_QUALIFIERS = new Map([
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
const BROAD_PROVENANCE_ARTWORK_IDS = Object.freeze(new Set([
  'ap6-anthropomorphic-stele',
]));
const CREDIT_FIELDS = [
  'creatorOrInstitution',
  'licenseName',
  'licenseUrl',
];
const RIGHTS_FIELDS = [...CREDIT_FIELDS, 'releaseClass'];
const U3_RELEASE_CLASSES = new Set([
  'open',
  'noncommercial',
  'institutionalEducational',
  'restricted',
]);
const U3_RELEASE_CLASS_COUNTS = Object.freeze({
  open: 99,
  noncommercial: 2,
  institutionalEducational: 2,
});
const U3_RELEASE_POLICY = new Map([
  ['CC BY 2.0', ['https://creativecommons.org/licenses/by/2.0/', 'open']],
  ['CC BY 4.0', ['https://creativecommons.org/licenses/by/4.0/', 'open']],
  ['CC BY-NC-SA 4.0', ['https://creativecommons.org/licenses/by-nc-sa/4.0/', 'noncommercial']],
  ['CC BY-SA 2.0', ['https://creativecommons.org/licenses/by-sa/2.0/', 'open']],
  ['CC BY-SA 2.5', ['https://creativecommons.org/licenses/by-sa/2.5/', 'open']],
  ['CC BY-SA 3.0', ['https://creativecommons.org/licenses/by-sa/3.0/', 'open']],
  ['CC BY-SA 4.0', ['https://creativecommons.org/licenses/by-sa/4.0/', 'open']],
  ['CC0 1.0', ['https://creativecommons.org/publicdomain/zero/1.0/', 'open']],
  ['Free Art License 1.3', ['https://artlibre.org/licence/lal/en/', 'open']],
  [
    'LACMA collection image; reuse subject to museum terms',
    ['https://www.lacma.org/terms-use', 'institutionalEducational'],
  ],
  [
    'Louvre educational-use terms; commercial permission required',
    ['https://collections.louvre.fr/en/page/cgu', 'institutionalEducational'],
  ],
  [
    'No known copyright restrictions',
    [
      'https://commons.wikimedia.org/wiki/Commons:Copyright_rules_by_subject_matter#Photographs_of_old_artworks',
      'open',
    ],
  ],
  ['Public Domain Mark 1.0', ['https://creativecommons.org/publicdomain/mark/1.0/', 'open']],
  [
    'Public domain (anonymous EU work)',
    ['https://commons.wikimedia.org/wiki/Template:PD-anon-70-EU', 'open'],
  ],
  [
    'Public domain (self-dedicated)',
    ['https://commons.wikimedia.org/wiki/Template:PD-self', 'open'],
  ],
]);
const U4_RELEASE_POLICY = new Map([
  ...U3_RELEASE_POLICY,
  ['CC BY-NC-SA 2.0', ['https://creativecommons.org/licenses/by-nc-sa/2.0/', 'noncommercial']],
  [
    'Library of Congress HABS/HAER rights advisory; no known restrictions',
    ['https://www.loc.gov/pictures/collection/hh/rights.html', 'open'],
  ],
  [
    'MoMA fair-use terms—noncommercial educational use',
    ['https://www.moma.org/about/about-this-site/', 'institutionalEducational'],
  ],
  [
    'No known restrictions on publication',
    ['https://hdl.loc.gov/loc.pnp/res.598.kora', 'open'],
  ],
  [
    'PMA educational/fair-use terms',
    ['https://www.philamuseum.org/legal', 'institutionalEducational'],
  ],
  [
    'Public domain (U.S. pre-1931 publication)',
    ['https://commons.wikimedia.org/wiki/Template:PD-US-expired', 'open'],
  ],
  [
    'University at Buffalo educational-use terms',
    ['https://digital.lib.buffalo.edu/items/show/31590', 'institutionalEducational'],
  ],
]);
const U5_TRADITION_GROUPS = new Set([
  'Ancient Central Andes',
  'Ancient North America',
  'Ancient Mesoamerica',
  'Native North America',
]);
const HAN_SCRIPT = /\p{Script=Han}/u;
const UNFINISHED_VALUE = /\b(?:tbd|todo|placeholder|n\/a|not available)\b|待补|待定|占位/i;
const COMPARISON_BASIS = /(?:Compare|对比|比较|形式|功能|材料|语境|权力|仪式|景观|身份|技术)/i;
const U5_RELEASE_POLICY = new Map([
  ...U3_RELEASE_POLICY,
  ['CC BY 2.5', ['https://creativecommons.org/licenses/by/2.5/', 'open']],
  ['U.S. federal public domain / NPS use conditions', ['https://www.nps.gov/aboutus/disclaimer.htm', 'open']],
  ['Public domain — author release', ['https://commons.wikimedia.org/wiki/File:Walls_at_Sacsayhuaman.jpg', 'open']],
  ['Rights-managed; no portable public image permission verified', ['https://www.gettyimages.com/eula', 'restricted']],
  ['Limited personal and educational use; no portable public release verified', ['https://peabody.harvard.edu/terms-use', 'restricted']],
  ['Rights retained; sacred-site public reproduction not cleared', ['https://ohiomemory.ohiohistory.org/about-ohio-memory/rights-reproductions', 'restricted']],
  ['Photograph CC BY 2.0; modern model rights not verified for portable release', ['https://commons.wikimedia.org/wiki/File:Templo_Mayor_Tenochtitlan.jpg', 'restricted']],
  ['Museum copyright and cultural patrimony; no portable public permission verified', ['https://www.weltmuseumwien.at/en/imprint/', 'restricted']],
  ['Rights-managed institutional photograph; no portable public permission verified', ['https://doi.org/10.4000/bifea.8301', 'restricted']],
  ['Usage Conditions Apply; publication permission required', ['https://www.si.edu/object/shoulder-bagbandolier-bag%3ANMAI_227689', 'restricted']],
  ['Museum image rights and community cultural permission not cleared', ['https://www.amisquaibranly.fr/wp-content/uploads/2024/10/20241014_cls-restaurations_masque-a-transformation.pdf', 'restricted']],
  ['Museum image rights; inherited family and clan authority not cleared', ['https://www.amisquaibranly.fr/wp-content/uploads/2024/10/20241014_cls-restaurations_masque-a-transformation.pdf', 'restricted']],
  ['Copyright School for Advanced Research; no portable permission verified', ['https://emuseum.sarsf.org/objects/1568/untitled', 'restricted']],
  ['All rights reserved; no portable public permission verified', ['https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf', 'restricted']],
]);
const U3_LIMITED_RELEASE_MEDIA = new Map([
  [
    'ap53-merovingian-fibulae::primary',
    'Louvre educational-use terms; commercial permission required',
  ],
  [
    'ap55-lindisfarne-gospels::st-luke-portrait',
    'CC BY-NC-SA 4.0',
  ],
  [
    'ap95-virgin-guadalupe::primary',
    'LACMA collection image; reuse subject to museum terms',
  ],
  [
    'ap97-spaniard-indian-mestizo::primary',
    'CC BY-NC-SA 4.0',
  ],
]);

function fail(message) {
  throw new Error(`Invalid artwork data: ${message}`);
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isHttpsUrl(value) {
  if (
    typeof value !== 'string'
    || !/^https:\/\/[^/]/.test(value)
    || /[\s\u0000-\u001f\u007f]/u.test(value)
  ) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname !== '';
  } catch {
    return false;
  }
}

function validateFinishedUnit5String(value, id, field, { requireHan = true } = {}) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${id}.${field} must be a finished non-empty string`);
  }
  if (UNFINISHED_VALUE.test(value)) {
    fail(`${id}.${field} contains unfinished placeholder text`);
  }
  if (requireHan && !HAN_SCRIPT.test(value)) {
    fail(`${id}.${field} must contain Han/Chinese text`);
  }
}

function validateStringArray(
  value,
  field,
  id,
  { minimum = 1 } = {},
) {
  if (
    !Array.isArray(value)
    || value.length < minimum
    || value.some((item) => typeof item !== 'string' || item.trim() === '')
  ) {
    const sizeContract = minimum === 0
      ? 'an'
      : `an array with at least ${minimum}`;
    fail(`${id}.${field} must be ${sizeContract} non-empty string${minimum === 1 ? '' : 's'}`);
  }
}

function validateUnit5StudyContract(artwork) {
  const { id } = artwork;
  for (const field of ['culture', 'period', 'artistCulture', 'date', 'medium', 'workType']) {
    validateFinishedUnit5String(artwork[field], id, field, { requireHan: false });
  }
  for (const field of ['titleZh', 'function', 'form', 'content', 'context']) {
    validateFinishedUnit5String(artwork[field], id, field);
  }

  if (artwork.recognitionAnchors.length < 2 || artwork.recognitionAnchors.length > 4) {
    fail(`${id}.recognitionAnchors must contain exactly 2..4 finished strings`);
  }
  artwork.recognitionAnchors.forEach((anchor, index) => {
    validateFinishedUnit5String(anchor, id, `recognitionAnchors[${index}]`);
  });
  if (new Set(artwork.recognitionAnchors).size !== artwork.recognitionAnchors.length) {
    fail(`${id}.recognitionAnchors must not contain duplicate values`);
  }

  artwork.keywords.forEach((keyword, index) => {
    validateFinishedUnit5String(keyword, id, `keywords[${index}]`, { requireHan: false });
  });
  if (new Set(artwork.keywords).size !== artwork.keywords.length) {
    fail(`${id}.keywords must not contain duplicate values`);
  }
  if (!artwork.keywords.some((keyword) => HAN_SCRIPT.test(keyword))) {
    fail(`${id}.keywords must include at least one Han/Chinese value`);
  }

  if (new Set(artwork.comparisonIds).size !== artwork.comparisonIds.length) {
    fail(`${id}.comparisonIds must not contain duplicate values`);
  }
  if (artwork.comparisonIds.includes(id)) {
    fail(`${id}.comparisonIds must not contain a self comparison`);
  }
  validateExactKeys(
    Object.keys(artwork.comparisonNotes),
    artwork.comparisonIds,
    `${id}.comparisonNotes keys must match comparisonIds exactly`,
  );
  for (const targetId of artwork.comparisonIds) {
    const field = `comparisonNotes.${targetId}`;
    const note = artwork.comparisonNotes[targetId];
    validateFinishedUnit5String(note, id, field, { requireHan: false });
    if (!COMPARISON_BASIS.test(note)) {
      fail(`${id}.${field} must state an explicit comparison basis`);
    }
  }
}

function validateExactKeys(
  actualKeys,
  expectedKeys,
  message,
  { orderSensitive = true } = {},
) {
  const actualSet = new Set(actualKeys);
  const expectedSet = new Set(expectedKeys);
  const missing = expectedKeys.filter((key) => !actualSet.has(key));
  const extra = actualKeys.filter((key) => !expectedSet.has(key));
  const mismatchIndex = orderSensitive
    ? expectedKeys.findIndex((key, index) => actualKeys[index] !== key)
    : -1;
  if (
    missing.length > 0
    || extra.length > 0
    || actualKeys.length !== expectedKeys.length
    || mismatchIndex !== -1
  ) {
    const details = [];
    if (missing.length > 0) details.push(`missing keys [${missing.join(', ')}]`);
    if (extra.length > 0) details.push(`extra keys [${extra.join(', ')}]`);
    if (mismatchIndex !== -1) {
      details.push(
        `first mismatch at index ${mismatchIndex}: expected ${expectedKeys[mismatchIndex] ?? '<none>'}; received ${actualKeys[mismatchIndex] ?? '<none>'}`,
      );
    }
    fail(`${message}${details.length > 0 ? `; ${details.join('; ')}` : ''}`);
  }
}

function validateManifests(manifests) {
  if (!manifests || typeof manifests !== 'object' || Array.isArray(manifests)) {
    fail('official unit manifests must be an object');
  }

  const unitKeys = Object.keys(manifests);
  const activeUnits = unitKeys.length >= 2
    && unitKeys.length <= 10
    && unitKeys.every((key, index) => key === String(index + 1))
    ? unitKeys.map(Number)
    : null;
  if (!activeUnits) {
    fail('official manifests must contain exactly sequential Units 1-2, Units 1-3, Units 1-4, Units 1-5, Units 1-6, Units 1-7, Units 1-8, Units 1-9, or Units 1-10');
  }

  for (const unit of activeUnits) {
    const manifest = manifests[unit];
    const rule = UNIT_RULES[unit];
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
      fail(`official Unit ${unit} manifest must be an object`);
    }
    const expectedKeys = Array.from(
      { length: rule.count },
      (_, index) => String(rule.start + index),
    );
    validateExactKeys(
      Object.keys(manifest),
      expectedKeys,
      `official Unit ${unit} manifest must contain exactly the ${rule.count} numeric keys ${rule.start}..${rule.end}`,
      { orderSensitive: false },
    );

    const entryFields = unit === 4 || unit === 5 || unit === 6 || unit === 7 || unit === 8 || unit === 9 || unit === 10
      ? [
        'id',
        'titleEn',
        'region',
        'siteName',
        'provenanceQualifier',
        'traditionGroup',
        'requiredViewIds',
      ]
      : unit === 3
        ? ['id', 'titleEn', 'region', 'siteName', 'requiredViewIds']
        : ['id', 'titleEn'];
    for (const apNumber of expectedKeys) {
      const entry = manifest[apNumber];
      const context = `official Unit ${unit} manifest AP ${apNumber}`;
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        fail(`${context} entry must be an object`);
      }
      validateExactKeys(
        Object.keys(entry),
        entryFields,
        `${context} entry must use the exact manifest schema`,
        { orderSensitive: unit === 5 || unit === 6 || unit === 7 || unit === 8 || unit === 9 || unit === 10 },
      );
      for (const field of entryFields.filter(
        (field) => field !== 'requiredViewIds' && field !== 'provenanceQualifier',
      )) {
        if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
          fail(`${context}.${field} must be a non-empty string`);
        }
      }
      if (
        (unit === 4 || unit === 5 || unit === 6 || unit === 7 || unit === 8 || unit === 9 || unit === 10)
        && entry.provenanceQualifier !== null
        && (typeof entry.provenanceQualifier !== 'string' || entry.provenanceQualifier.trim() === '')
      ) {
        fail(`${context}.provenanceQualifier must be null or a non-empty string`);
      }
      if (unit === 3 || unit === 4 || unit === 5 || unit === 6 || unit === 7 || unit === 8 || unit === 9 || unit === 10) {
        if (
          !Array.isArray(entry.requiredViewIds)
          || entry.requiredViewIds.length === 0
          || entry.requiredViewIds.some(
            (viewId) => typeof viewId !== 'string' || viewId.trim() === '',
          )
        ) {
          fail(`${context}.requiredViewIds must be a non-empty array of non-empty strings`);
        }
        if (new Set(entry.requiredViewIds).size !== entry.requiredViewIds.length) {
          fail(`${context}.requiredViewIds must not contain duplicate view ids`);
        }
      }
    }
  }
  return activeUnits;
}

function normalizePlaceholderAuthorities(placeholders, activeUnits) {
  if (!activeUnits.includes(5)) {
    return { 4: placeholders };
  }
  if (!placeholders || typeof placeholders !== 'object' || Array.isArray(placeholders)) {
    fail('public placeholder authorities must be an object for Units 4-5');
  }
  validateExactKeys(
    Object.keys(placeholders),
    activeUnits.filter(unit => unit >= 4).map(String),
    activeUnits.includes(10)
      ? 'public placeholder authorities must contain exactly Units 4, 5, 6, 7, 8, 9 and 10'
      : activeUnits.includes(9)
      ? 'public placeholder authorities must contain exactly Units 4, 5, 6, 7, 8 and 9'
      : activeUnits.includes(8)
      ? 'public placeholder authorities must contain exactly Units 4, 5, 6, 7 and 8'
      : activeUnits.includes(7)
      ? 'public placeholder authorities must contain exactly Units 4, 5, 6 and 7'
      : activeUnits.includes(6)
        ? 'public placeholder authorities must contain exactly Units 4, 5 and 6'
        : 'public placeholder authorities must contain exactly Units 4 and 5',
  );
  return placeholders;
}

export function normalizeArtworkMedia(work) {
  if (Array.isArray(work.images)) {
    return work.images.map((media) => {
      const normalized = Object.fromEntries(
        MEDIA_FIELDS.map((field) => [field, media?.[field]]),
      );
      if (Object.hasOwn(media ?? {}, MEDIA_STATUS_FIELD)) {
        normalized[MEDIA_STATUS_FIELD] = media[MEDIA_STATUS_FIELD];
      }
      return normalized;
    });
  }
  return [{
    label: 'Primary view',
    imageUrl: work.imageUrl,
    imageAlt: work.imageAlt,
    imageSourceName: work.imageSourceName,
    imageSourceUrl: work.imageSourceUrl,
  }];
}

function normalizedMediaIds(artwork) {
  return Array.isArray(artwork.images)
    ? artwork.images.map((media) => media?.id)
    : ['primary'];
}

function validateArtworkMedia(
  artwork,
  label,
  expectedManifest,
  auditedMediaOwners,
  placeholders,
) {
  if (Array.isArray(artwork.images)) {
    if (artwork.images.length === 0) {
      fail(`${label}.images must not be empty`);
    }
  } else if (artwork.unit === 3 || artwork.unit === 4 || artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10) {
    fail(`${label}.images must be a non-empty array for Unit ${artwork.unit}`);
  } else {
    for (const field of LEGACY_MEDIA_FIELDS) {
      if (typeof artwork[field] !== 'string' || artwork[field].trim() === '') {
        fail(`${label}.${field} must be a non-empty string when images is not provided`);
      }
    }
  }

  const media = normalizeArtworkMedia(artwork);
  const expectedMediaCount = artwork.unit === 3 || artwork.unit === 4 || artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10
    ? expectedManifest.requiredViewIds.length
    : artwork.unit === 1 && artwork.apNumber === 8
      ? 2
      : 1;
  if (media.length !== expectedMediaCount) {
    const prefix = artwork.unit === 3 ? `AP ${artwork.apNumber} ${label}` : label;
    fail(`${prefix} must have exactly ${expectedMediaCount} media view${expectedMediaCount === 1 ? '' : 's'}`);
  }

  const viewIds = new Set();
  const imageUrls = new Set();
  const imageAlts = new Set();
  const imageSourceUrls = new Set();
  for (const [index, item] of media.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      fail(`${label}.media[${index}] must be an object`);
    }
    const auditedUnit = artwork.unit === 3 || artwork.unit === 4 || artwork.unit === 5;
    const rawMedia = Array.isArray(artwork.images) ? artwork.images[index] : null;
    const manifestMediaUnit = auditedUnit || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10;
    const viewId = manifestMediaUnit
      ? rawMedia?.id ?? expectedManifest?.requiredViewIds?.[index]
      : 'primary';
    const mediaKey = `${artwork.id}::${viewId}`;
    const restrictedPlaceholder = (artwork.unit === 4 || artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10)
      && placeholders
      && Object.hasOwn(placeholders, mediaKey);
    const u6Placeholder = [6, 7, 8, 9, 10].includes(artwork.unit) && item.imageUrl === null;
    const mediaContext = artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10
      ? `Unit ${artwork.unit} ${mediaKey}`
      : `${label}.media[${index}]`;
    if (artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10) {
      if (!rawMedia || typeof rawMedia !== 'object' || Array.isArray(rawMedia)) {
        fail(`${mediaContext} raw media must be an object`);
      }
      validateExactKeys(
        Object.keys(rawMedia),
        restrictedPlaceholder || u6Placeholder ? U5_RESTRICTED_MEDIA_FIELDS : U5_PUBLIC_MEDIA_FIELDS,
        `${mediaContext} must use the exact ordered raw media schema`,
      );
    }
    for (const field of MEDIA_FIELDS.filter((field) => field !== 'imageUrl')) {
      if (typeof item[field] !== 'string' || item[field].trim() === '') {
        fail(`${mediaContext}.${field} must be a non-empty string`);
      }
    }
    if (restrictedPlaceholder && ![6, 7, 8, 9, 10].includes(artwork.unit)) {
      if (item.imageUrl !== null || item.mediaStatus !== 'rightsRestricted') {
        fail(`Unit ${artwork.unit} ${mediaKey} restricted media must be a public placeholder`);
      }
    } else if (u6Placeholder) {
      if (typeof item.mediaStatus !== 'string' || item.mediaStatus.trim() === '') {
        fail(`${mediaContext}.mediaStatus must be a non-empty string for a Unit 6 placeholder`);
      }
      if (!isHttpsUrl(item.imageSourceUrl)) {
        fail(`${mediaContext}.imageSourceUrl must be an HTTPS URL for a Unit 6 placeholder`);
      }
    } else {
      if (typeof item.imageUrl !== 'string' || item.imageUrl.trim() === '') {
        fail(`${mediaContext}.imageUrl must be a non-empty string`);
      }
      if (Object.hasOwn(item, MEDIA_STATUS_FIELD)) {
        fail(`${mediaContext}.mediaStatus is only allowed for a reviewed Unit 4 or Unit 5 placeholder`);
      }
    }
    if (manifestMediaUnit) {
      if (typeof viewId !== 'string' || viewId.trim() === '') {
        fail(`${label}.media[${index}].id must be a non-empty string`);
      }
      if (viewIds.has(viewId)) {
        fail(`${label} contains duplicate view id ${viewId}`);
      }
      viewIds.add(viewId);
    }
    if (auditedUnit) {
      for (const field of ['imageUrl', 'imageSourceUrl', 'imageAlt']) {
        if (
          item[field] === null
          || (artwork.unit === 4 && field !== 'imageAlt')
          || (artwork.unit === 5 && field === 'imageSourceUrl' && restrictedPlaceholder)
        ) continue;
        const owner = auditedMediaOwners[field].get(item[field]);
        if (owner) {
          fail(
            `Unit ${artwork.unit} duplicate ${field} across media views; ${mediaKey} conflicts with ${owner}`,
          );
        }
        auditedMediaOwners[field].set(item[field], mediaKey);
      }
    }
    if ((artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10) && item.imageUrl !== null
      && item.imageUrl !== `assets/art-history/u${artwork.unit}/ap${artwork.apNumber}-${viewId}.webp`) {
      fail(`${mediaContext}.imageUrl must be a canonical local path, not a remote HTTPS URL`);
    }
    if (artwork.unit !== 5 && artwork.unit !== 6 && artwork.unit !== 7 && artwork.unit !== 8 && artwork.unit !== 9 && artwork.unit !== 10 && item.imageUrl !== null && !(manifestMediaUnit ? isHttpsUrl(item.imageUrl) : isHttpUrl(item.imageUrl))) {
      fail(`${mediaContext}.imageUrl must be an ${manifestMediaUnit ? 'HTTPS' : 'HTTP(S)'} URL`);
    }
    if (!(manifestMediaUnit ? isHttpsUrl(item.imageSourceUrl) : isHttpUrl(item.imageSourceUrl))) {
      fail(`${mediaContext}.imageSourceUrl must be an ${manifestMediaUnit ? 'HTTPS' : 'HTTP(S)'} URL`);
    }
    if (item.imageUrl !== null && imageUrls.has(item.imageUrl)) {
      fail(`${label} contains duplicate media imageUrl ${item.imageUrl}`);
    }
    if (item.imageUrl !== null) imageUrls.add(item.imageUrl);
    if ((artwork.unit === 1 || artwork.unit === 3 || artwork.unit === 5) && media.length > 1) {
      if (imageAlts.has(item.imageAlt)) {
        fail(`${label} contains duplicate media imageAlt ${item.imageAlt}`);
      }
      if (!restrictedPlaceholder && imageSourceUrls.has(item.imageSourceUrl)) {
        fail(`${label} contains duplicate media imageSourceUrl ${item.imageSourceUrl}`);
      }
      imageAlts.add(item.imageAlt);
      if (!restrictedPlaceholder) imageSourceUrls.add(item.imageSourceUrl);
    }
  }

  if (artwork.unit === 3 || artwork.unit === 4 || artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10) {
    validateExactKeys(
      normalizedMediaIds(artwork),
      expectedManifest.requiredViewIds,
      `AP ${artwork.apNumber} ${label} required views must match the Unit ${artwork.unit} manifest exactly`,
    );
  }

  return media;
}

export function validateArtworks(artworks, manifests, placeholders) {
  const activeUnits = validateManifests(manifests);
  const placeholderAuthorities = normalizePlaceholderAuthorities(placeholders, activeUnits);
  const expectedApNumbers = activeUnits.flatMap((unit) => {
    const rule = UNIT_RULES[unit];
    return Array.from({ length: rule.count }, (_, index) => rule.start + index);
  });
  const expectedArtworkCount = activeUnits.includes(10)
    ? EXPECTED_ARTWORK_COUNT
    : expectedApNumbers.length;
  const expectedLastApNumber = activeUnits.includes(10)
    ? EXPECTED_LAST_AP_NUMBER
    : expectedApNumbers.at(-1);
  const unitLabel = `1-${activeUnits.length}`;
  if (!Array.isArray(artworks)) {
    fail('top-level JSON must be an array');
  }
  if (artworks.length !== expectedArtworkCount) {
    fail(
      `official Units ${unitLabel} manifests require exactly ${expectedArtworkCount} works and artwork AP numbers must cover exactly 1..${expectedLastApNumber}; received ${artworks.length}`,
    );
  }

  const ids = new Set();
  const apNumbers = new Set();
  const u3RegionCounts = Object.fromEntries(
    Object.keys(U3_REGION_COUNTS).map((region) => [region, 0]),
  );
  const u5Regions = new Set();
  const u5Traditions = new Set();
  const auditedMediaOwners = Object.fromEntries(
    ['imageUrl', 'imageSourceUrl', 'imageAlt'].map((field) => [field, new Map()]),
  );

  const duplicateApNumber = artworks
    .map(({ apNumber } = {}) => apNumber)
    .find((apNumber, index, values) => Number.isInteger(apNumber)
      && values.indexOf(apNumber) !== index);
  if (duplicateApNumber !== undefined) {
    fail(`duplicate AP number ${duplicateApNumber}`);
  }

  for (const [index, artwork] of artworks.entries()) {
    if (!artwork || typeof artwork !== 'object' || Array.isArray(artwork)) {
      fail(`entry ${index} must be an object`);
    }
    for (const field of REQUIRED_FIELDS) {
      if (!(field in artwork) || artwork[field] === null || artwork[field] === undefined) {
        fail(`entry ${index} is missing ${field}`);
      }
    }

    const label = typeof artwork.id === 'string' && artwork.id.trim() ? artwork.id : `entry ${index}`;
    for (const field of STRING_FIELDS) {
      if (typeof artwork[field] !== 'string' || artwork[field].trim() === '') {
        fail(`${label}.${field} must be a non-empty string`);
      }
    }
    if (
      BROAD_PROVENANCE_ARTWORK_IDS.has(artwork.id)
      && (typeof artwork.siteQualifier !== 'string' || artwork.siteQualifier.trim() === '')
    ) {
      fail(`${label}.siteQualifier must be a non-empty string for broad-region placement`);
    }
    if (!Number.isInteger(artwork.apNumber) || artwork.apNumber <= 0) {
      fail(`${label}.apNumber must be a positive integer`);
    }
    if (!Number.isInteger(artwork.unit) || !activeUnits.includes(artwork.unit)) {
      fail(`${label}.unit must be ${activeUnits.join(', ')}`);
    }

    const rule = UNIT_RULES[artwork.unit];
    if (artwork.apNumber < rule.start || artwork.apNumber > rule.end) {
      fail(`${label}.apNumber must be within the Unit ${artwork.unit} range (${rule.start}..${rule.end})`);
    }
    if (ids.has(artwork.id)) {
      fail(`duplicate id ${artwork.id}`);
    }
    if (apNumbers.has(artwork.apNumber)) {
      fail(`duplicate AP number ${artwork.apNumber}`);
    }
    const expectedApNumber = index + 1;
    if (artwork.apNumber !== expectedApNumber) {
      fail(
        `official Units ${unitLabel} manifest order requires AP ${expectedApNumber} at entry ${index}; received AP ${artwork.apNumber}`,
      );
    }
    if (artwork.unit === 2 && !U2_CULTURES.has(artwork.culture)) {
      fail(`${label}.culture must be a valid Unit 2 culture`);
    }
    if (artwork.unit === 3) {
      if (!U3_CULTURES.has(artwork.culture)) {
        fail(`${label}.culture must be a valid precise Unit 3 culture`);
      }
      if (
        typeof artwork.traditionGroup !== 'string'
        || !U3_TRADITION_GROUPS.has(artwork.traditionGroup)
      ) {
        fail(`${label}.traditionGroup must be a valid approved Unit 3 tradition group`);
      }
      const [expectedCulture, expectedTraditionGroup] = U3_CLASSIFICATIONS.get(
        artwork.apNumber,
      );
      if (artwork.culture !== expectedCulture) {
        fail(`AP ${artwork.apNumber} culture must match the reviewed Unit 3 assignment ${expectedCulture}`);
      }
      if (artwork.traditionGroup !== expectedTraditionGroup) {
        fail(`AP ${artwork.apNumber} traditionGroup must match the reviewed Unit 3 assignment ${expectedTraditionGroup}`);
      }
      const expectedQualifier = U3_PROVENANCE_QUALIFIERS.get(artwork.id);
      if (expectedQualifier !== undefined) {
        if (artwork.provenanceQualifier !== expectedQualifier) {
          fail(`${label}.provenanceQualifier must match the reviewed Unit 3 provenance qualifier exactly`);
        }
      } else if ('provenanceQualifier' in artwork) {
        fail(`${label}.provenanceQualifier is only allowed for the six reviewed broad-provenance Unit 3 works`);
      }
    }
    if (artwork.unit === 4 || artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10) {
      if (typeof artwork.traditionGroup !== 'string' || artwork.traditionGroup.trim() === '') {
        fail(`${label}.traditionGroup must be a non-empty Unit ${artwork.unit} tradition group`);
      }
      if (
        !artwork.comparisonNotes
        || typeof artwork.comparisonNotes !== 'object'
        || Array.isArray(artwork.comparisonNotes)
      ) {
        fail(`${label}.comparisonNotes must be an object for Unit ${artwork.unit}`);
      }
    }
    if (artwork.unit === 5 && !U5_TRADITION_GROUPS.has(artwork.traditionGroup)) {
      fail(`${label}.traditionGroup must be one of the four approved Unit 5 traditions`);
    }
    if (!rule.regions.has(artwork.region)) {
      fail(`${label}.region must be valid for Unit ${artwork.unit}`);
    }
    if (artwork.unit === 3) {
      u3RegionCounts[artwork.region] += 1;
    }
    if (artwork.unit === 5) {
      u5Regions.add(artwork.region);
      u5Traditions.add(artwork.traditionGroup);
    }

    const expected = manifests[artwork.unit][String(artwork.apNumber)];
    if (!expected) {
      fail(`${label}.apNumber is not in the official Unit ${artwork.unit} manifest`);
    }
    if (artwork.id !== expected.id) {
      fail(`AP ${artwork.apNumber} manifest id must be ${expected.id}; received ${artwork.id}`);
    }
    if (artwork.titleEn !== expected.titleEn) {
      fail(
        `AP ${artwork.apNumber} manifest title must be "${expected.titleEn}"; received "${artwork.titleEn}"`,
      );
    }
    if ((artwork.unit === 3 || artwork.unit === 4 || artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10) && artwork.region !== expected.region) {
      fail(
        `AP ${artwork.apNumber} manifest region must be ${expected.region}; received ${artwork.region}`,
      );
    }
    if ((artwork.unit === 3 || artwork.unit === 4 || artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10) && artwork.siteName !== expected.siteName) {
      fail(
        `AP ${artwork.apNumber} manifest siteName must be "${expected.siteName}"; received "${artwork.siteName}"`,
      );
    }
    if (artwork.unit === 4 || artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10) {
      if (artwork.traditionGroup !== expected.traditionGroup) {
        fail(`AP ${artwork.apNumber} manifest traditionGroup must be ${expected.traditionGroup}; received ${artwork.traditionGroup}`);
      }
      const expectedQualifier = expected.provenanceQualifier;
      if (expectedQualifier === null) {
        if ('provenanceQualifier' in artwork) {
          fail(`${label}.provenanceQualifier is not allowed when the Unit ${artwork.unit} manifest value is null`);
        }
      } else if (artwork.provenanceQualifier !== expectedQualifier) {
        fail(`${label}.provenanceQualifier must match the reviewed Unit ${artwork.unit} manifest exactly`);
      }
    }
    ids.add(artwork.id);
    apNumbers.add(artwork.apNumber);

    const { coordinates } = artwork;
    if (
      !coordinates
      || typeof coordinates !== 'object'
      || Array.isArray(coordinates)
      || !Number.isFinite(coordinates.x)
      || !Number.isFinite(coordinates.y)
      || coordinates.x < 0
      || coordinates.x > 1600
      || coordinates.y < 0
      || coordinates.y > 800
    ) {
      fail(`${label}.coordinates must contain x 0..1600 and y 0..800`);
    }

    validateStringArray(
      artwork.recognitionAnchors,
      'recognitionAnchors',
      label,
      { minimum: artwork.unit === 3 || artwork.unit === 4 || artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10 ? 2 : 1 },
    );
    validateStringArray(
      artwork.comparisonIds,
      'comparisonIds',
      label,
      { minimum: artwork.unit === 2 ? 0 : 1 },
    );
    validateStringArray(
      artwork.keywords,
      'keywords',
      label,
      { minimum: artwork.unit === 3 || artwork.unit === 4 || artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10 ? 3 : 1 },
    );
    if (artwork.unit === 5) {
      validateUnit5StudyContract(artwork);
    }
    validateArtworkMedia(
      artwork,
      label,
      expected,
      auditedMediaOwners,
      placeholderAuthorities[artwork.unit],
    );
  }

  validateExactKeys(
    [...apNumbers].map(String).sort((first, second) => Number(first) - Number(second)),
    expectedApNumbers.map(String),
    `artwork AP numbers must cover exactly 1..${expectedApNumbers.at(-1)}`,
  );

  if (activeUnits.includes(3)) {
    const mismatches = Object.entries(U3_REGION_COUNTS)
      .filter(([region, expectedCount]) => u3RegionCounts[region] !== expectedCount)
      .map(
        ([region, expectedCount]) => (
          `${region} expected ${expectedCount}, received ${u3RegionCounts[region]}`
        ),
      );
    if (mismatches.length > 0) {
      fail(`Unit 3 region counts must match exactly (${mismatches.join('; ')})`);
    }
  }

  if (activeUnits.includes(5)) {
    validateExactKeys(
      [...u5Regions].toSorted(),
      [...UNIT_RULES[5].regions].toSorted(),
      'Unit 5 must represent exactly the six approved regions',
      { orderSensitive: false },
    );
    validateExactKeys(
      [...u5Traditions].toSorted(),
      [...U5_TRADITION_GROUPS].toSorted(),
      'Unit 5 must represent exactly the four approved traditions',
      { orderSensitive: false },
    );
  }

  for (const artwork of artworks) {
    for (const comparisonId of artwork.comparisonIds) {
      if (!ids.has(comparisonId)) {
        fail(`${artwork.id}.comparisonIds references unknown id ${comparisonId}`);
      }
      if (artwork.unit === 4 || artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10) {
        const note = artwork.comparisonNotes[comparisonId];
        if (typeof note !== 'string' || note.trim() === '') {
          fail(`${artwork.id}.comparisonNotes must define ${comparisonId}`);
        }
      }
    }
    if (
      (artwork.unit === 4 || artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10)
      && Object.keys(artwork.comparisonNotes).some(
        (comparisonId) => !artwork.comparisonIds.includes(comparisonId),
      )
    ) {
      fail(`${artwork.id}.comparisonNotes contains an unresolved comparison id`);
    }
  }

  return artworks;
}

function validateUnit3RightsAudit(rightsAudit, artworks, credits) {
  if (!rightsAudit || typeof rightsAudit !== 'object' || Array.isArray(rightsAudit)) {
    fail('Unit 3 rights audit must be an object');
  }

  const expectedEntries = artworks
    .filter(({ unit }) => unit === 3)
    .flatMap((artwork) => {
      const rawCredit = credits[artwork.id];
      const creditEntries = Array.isArray(rawCredit) ? rawCredit : [rawCredit];
      return normalizedMediaIds(artwork).map((viewId, index) => [
        `${artwork.id}::${viewId}`,
        creditEntries[index],
      ]);
    });
  if (expectedEntries.length !== 103) {
    fail(`Unit 3 rights audit requires exactly 103 media keys; received ${expectedEntries.length}`);
  }
  validateExactKeys(
    Object.keys(rightsAudit),
    expectedEntries.map(([key]) => key),
    'Unit 3 rights audit media keys must match all 103 reviewed views exactly',
    { orderSensitive: false },
  );

  const releaseClassCounts = Object.fromEntries(
    [...U3_RELEASE_CLASSES].map((releaseClass) => [releaseClass, 0]),
  );
  const limitedReleaseMismatches = [];
  for (const [mediaKey, canonicalCredit] of expectedEntries) {
    const entry = rightsAudit[mediaKey];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      fail(`Unit 3 rights audit ${mediaKey} must be an object`);
    }
    validateExactKeys(
      Object.keys(entry).sort(),
      RIGHTS_FIELDS.toSorted(),
      `Unit 3 rights audit ${mediaKey} must use the exact rights schema`,
    );
    for (const field of RIGHTS_FIELDS) {
      if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
        fail(`Unit 3 rights audit ${mediaKey}.${field} must be a non-empty string`);
      }
    }
    if (!isHttpsUrl(entry.licenseUrl)) {
      fail(`Unit 3 rights audit ${mediaKey}.licenseUrl must be an HTTPS URL`);
    }
    if (!U3_RELEASE_CLASSES.has(entry.releaseClass)) {
      fail(`Unit 3 rights audit ${mediaKey}.releaseClass must be an allowed release class`);
    }
    if (entry.releaseClass === 'restricted') {
      fail(`Unit 3 release is blocked by restricted media ${mediaKey}`);
    }
    const policy = U3_RELEASE_POLICY.get(entry.licenseName);
    if (!policy) {
      fail(`Unit 3 rights audit ${mediaKey}.licenseName is not in the approved release policy`);
    }
    const [approvedLicenseUrl, approvedReleaseClass] = policy;
    if (entry.licenseUrl !== approvedLicenseUrl) {
      fail(
        `Unit 3 rights audit ${mediaKey}.licenseUrl does not match the approved policy for ${entry.licenseName}`,
      );
    }
    if (entry.releaseClass !== approvedReleaseClass) {
      fail(
        `Unit 3 rights audit ${mediaKey}.releaseClass does not match the approved policy for ${entry.licenseName}`,
      );
    }
    const reviewedLimitedLicense = U3_LIMITED_RELEASE_MEDIA.get(mediaKey);
    if (
      (reviewedLimitedLicense && entry.licenseName !== reviewedLimitedLicense)
      || (!reviewedLimitedLicense && entry.releaseClass !== 'open')
    ) {
      limitedReleaseMismatches.push(mediaKey);
    }
    for (const field of CREDIT_FIELDS) {
      if (entry[field] !== canonicalCredit[field]) {
        fail(`Unit 3 rights audit ${mediaKey}.${field} credit mismatch`);
      }
    }
    releaseClassCounts[entry.releaseClass] += 1;
  }

  const distributionMismatch = Object.entries(U3_RELEASE_CLASS_COUNTS)
    .some(([releaseClass, expectedCount]) => (
      releaseClassCounts[releaseClass] !== expectedCount
    ));
  if (distributionMismatch || releaseClassCounts.restricted !== 0) {
    fail(
      `Unit 3 release class distribution must be exactly 99 open, 2 noncommercial, 2 institutionalEducational, and 0 restricted`,
    );
  }
  if (limitedReleaseMismatches.length > 0) {
    fail(
      `Unit 3 rights audit ${limitedReleaseMismatches[0]} does not match its reviewed media release policy`,
    );
  }
}

function validateUnit4RightsAudit(rightsAudit, artworks, credits, placeholders) {
  if (!rightsAudit || typeof rightsAudit !== 'object' || Array.isArray(rightsAudit)) {
    fail('Unit 4 rights audit must be an object');
  }
  if (!placeholders || typeof placeholders !== 'object' || Array.isArray(placeholders)) {
    fail('Unit 4 public placeholder authority must be an object');
  }

  const unit4Works = artworks.filter(({ unit }) => unit === 4);
  const expectedEntries = unit4Works.flatMap((artwork) => {
    const rawCredit = credits[artwork.id];
    const creditEntries = Array.isArray(rawCredit) ? rawCredit : [rawCredit];
    return normalizedMediaIds(artwork).map((viewId, index) => [
      `${artwork.id}::${viewId}`,
      creditEntries[index],
      normalizeArtworkMedia(artwork)[index],
    ]);
  });
  if (expectedEntries.length !== 63) {
    fail(`Unit 4 rights audit requires exactly 63 media keys; received ${expectedEntries.length}`);
  }
  validateExactKeys(
    Object.keys(rightsAudit),
    expectedEntries.map(([key]) => key),
    'Unit 4 rights audit media keys must match all 63 reviewed views exactly',
    { orderSensitive: false },
  );

  const expectedPlaceholderKeys = expectedEntries
    .filter(([, , media]) => (
      media.imageUrl === null && media.mediaStatus === 'rightsRestricted'
    ))
    .map(([mediaKey]) => mediaKey);
  validateExactKeys(
    Object.keys(placeholders),
    expectedPlaceholderKeys,
    'Unit 4 public placeholder keys must match the reviewed restricted media exactly',
    { orderSensitive: false },
  );

  const releaseClassCounts = Object.fromEntries(
    [...U3_RELEASE_CLASSES].map((releaseClass) => [releaseClass, 0]),
  );
  for (const [mediaKey, canonicalCredit, media] of expectedEntries) {
    const entry = rightsAudit[mediaKey];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      fail(`Unit 4 rights audit ${mediaKey} must be an object`);
    }
    validateExactKeys(
      Object.keys(entry).sort(),
      RIGHTS_FIELDS.toSorted(),
      `Unit 4 rights audit ${mediaKey} must use the exact rights schema`,
    );
    for (const field of RIGHTS_FIELDS) {
      if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
        fail(`Unit 4 rights audit ${mediaKey}.${field} must be a non-empty string`);
      }
    }
    if (!isHttpsUrl(entry.licenseUrl)) {
      fail(`Unit 4 rights audit ${mediaKey}.licenseUrl must be an HTTPS URL`);
    }
    if (!U3_RELEASE_CLASSES.has(entry.releaseClass)) {
      fail(`Unit 4 rights audit ${mediaKey}.releaseClass must be an allowed release class`);
    }

    const expectedPlaceholder = Object.hasOwn(placeholders, mediaKey);
    if (entry.releaseClass === 'restricted') {
      if (
        !expectedPlaceholder
        || media.imageUrl !== null
        || media.mediaStatus !== 'rightsRestricted'
      ) {
        fail(`Unit 4 ${mediaKey} restricted media must be a public placeholder`);
      }
    } else {
      if (expectedPlaceholder) {
        fail(`Unit 4 ${mediaKey} placeholder must retain restricted rights status`);
      }
      const policy = U4_RELEASE_POLICY.get(entry.licenseName);
      if (!policy) {
        fail(`Unit 4 rights audit ${mediaKey}.licenseName is not in the approved release policy`);
      }
      const [approvedLicenseUrl, approvedReleaseClass] = policy;
      if (
        entry.licenseUrl !== approvedLicenseUrl
        || entry.releaseClass !== approvedReleaseClass
      ) {
        fail(`Unit 4 rights audit ${mediaKey} does not match its approved release policy`);
      }
    }
    for (const field of CREDIT_FIELDS) {
      if (entry[field] !== canonicalCredit[field]) {
        fail(`Unit 4 rights audit ${mediaKey}.${field} credit mismatch`);
      }
    }
    releaseClassCounts[entry.releaseClass] += 1;
  }

  const expectedCounts = {
    open: 48,
    noncommercial: 2,
    institutionalEducational: 5,
    restricted: 8,
  };
  const mismatch = Object.entries(expectedCounts).some(
    ([releaseClass, expectedCount]) => releaseClassCounts[releaseClass] !== expectedCount,
  );
  if (mismatch) {
    fail('Unit 4 release class distribution must be exactly 48 open, 2 noncommercial, 5 institutionalEducational, and 8 restricted');
  }
}

function validateUnit5RightsAudit(rightsAudit, artworks, credits, placeholders) {
  if (!rightsAudit || typeof rightsAudit !== 'object' || Array.isArray(rightsAudit)) {
    fail('Unit 5 rights audit must be an object');
  }
  if (!placeholders || typeof placeholders !== 'object' || Array.isArray(placeholders)) {
    fail('Unit 5 public placeholder authority must be an object');
  }
  const unit5 = artworks.filter(({ unit }) => unit === 5);
  const expectedKeys = unit5.flatMap(work => work.images.map(view => work.id + '::' + view.id));
  validateExactKeys(Object.keys(rightsAudit), expectedKeys,
    'Unit 5 rights audit media keys must match all 27 reviewed views exactly');
  const restrictedKeys = Object.entries(rightsAudit)
    .filter(([, row]) => row.releaseClass === 'restricted').map(([key]) => key);
  for (const work of unit5) {
    const raw = credits[work.id];
    const creditRows = Array.isArray(raw) ? raw : [raw];
    work.images.forEach((view, index) => {
      const key = work.id + '::' + view.id;
      const row = rightsAudit[key];
      for (const field of ['creatorOrInstitution', 'licenseName', 'identityNote', 'derivativeNote']) {
        if (typeof row[field] !== 'string' || !row[field].trim()) {
          fail('Unit 5 rights audit ' + key + '.' + field + ' must be a non-empty string');
        }
      }
      if (row.sourcePageUrl !== view.imageSourceUrl) {
        fail('Unit 5 rights audit ' + key + ' sourcePageUrl source mismatch');
      }
      const policy = U5_RELEASE_POLICY.get(row.licenseName);
      if (row.releaseClass === 'open') {
        const namesByClass = {
          'public-domain': /^(?:Public Domain Mark 1\.0|Public domain — author release)$/,
          cc0: /^CC0 1\.0$/,
          'cc-by': /^CC BY (?:2\.0|2\.5|3\.0|4\.0)$/,
          'cc-by-sa': /^CC BY-SA (?:2\.0|2\.5|3\.0|4\.0)$/,
        };
        if (!namesByClass[row.licenseClass]?.test(row.licenseName)) {
          fail('Unit 5 rights audit ' + key + ' disallowed open license or license class mismatch');
        }
      }
      if (!policy || row.licenseUrl !== policy[0] || row.releaseClass !== policy[1]) {
        fail('Unit 5 rights audit ' + key + ' does not match its approved release policy');
      }
      for (const field of CREDIT_FIELDS) {
        if (row[field] !== creditRows[index][field]) {
          fail('Unit 5 rights audit ' + key + '.' + field + ' credit mismatch');
        }
      }
    });
  }
  validateExactKeys(Object.keys(placeholders), restrictedKeys,
    'Unit 5 public placeholder keys must match the reviewed restricted media exactly');
  try {
    assertLocalMediaContract({
      manifest: JSON.parse(readFileSync(MANIFEST_URLS[5], 'utf8')),
      artworks: unit5, rights: rightsAudit, authority: placeholders,
      rootDir: fileURLToPath(new URL('../', import.meta.url)),
    });
  } catch (error) {
    fail('Unit 5 rights audit: ' + error.message);
  }
}

function validateUnit6RightsAudit(rights, artworks, credits, authority) {
  if (!rights || !authority) fail('Unit 6 reviewed rights audit and placeholder authority are required');
  try {
    assertLocalMediaContract({
      manifest: JSON.parse(readFileSync(MANIFEST_URLS[6], 'utf8')),
      artworks, rights, authority,
      rootDir: fileURLToPath(new URL('../', import.meta.url)),
    });
  } catch (error) { fail('Unit 6 rights audit: ' + error.message); }
  for (const work of artworks.filter(({ unit }) => unit === 6)) {
    const rows = Array.isArray(credits[work.id]) ? credits[work.id] : [credits[work.id]];
    work.images.forEach((view, index) => {
      const key = `${work.id}::${view.id}`, row = rights[key];
      if (row.sourcePageUrl !== view.imageSourceUrl) fail('Unit 6 rights audit ' + key + ' source mismatch');
      if (row.releaseClass === 'open') {
        const policy = new Map([
          ['CC BY 2.0', ['cc-by', 'https://creativecommons.org/licenses/by/2.0/']],
          ['CC BY 3.0', ['cc-by', 'https://creativecommons.org/licenses/by/3.0/']],
          ['CC0 1.0', ['cc0', 'https://creativecommons.org/publicdomain/zero/1.0/']],
        ]).get(row.licenseName);
        if (!policy || row.licenseClass !== policy[0] || row.licenseUrl !== policy[1]) {
          fail('Unit 6 rights audit ' + key + ' disallowed open license policy');
        }
      } else if (row.identityNote !== authority[key].rightsNote) {
        fail('Unit 6 rights audit ' + key + ' restricted evidence mismatch');
      }
      for (const field of CREDIT_FIELDS) {
        if (row[field] !== rows[index][field]) fail('Unit 6 rights audit ' + key + '.' + field + ' credit mismatch');
      }
    });
  }
}

function validateModernLocalRightsAudit(unitNumber, rights, artworks, credits, authority) {
  if (!rights || !authority) fail(`Unit ${unitNumber} reviewed rights audit and placeholder authority are required`);
  try {
    assertLocalMediaContract({
      manifest: JSON.parse(readFileSync(MANIFEST_URLS[unitNumber], 'utf8')),
      artworks, rights, authority,
      rootDir: fileURLToPath(new URL('../', import.meta.url)),
    });
  } catch (error) { fail(`Unit ${unitNumber} rights audit: ${error.message}`); }
  const policies = new Map([
    ['Public Domain', ['public-domain', 'https://creativecommons.org/publicdomain/mark/1.0/']],
    ['Public Domain Mark 1.0', ['public-domain', 'https://creativecommons.org/publicdomain/mark/1.0/']],
    ['CC0 1.0', ['cc0', 'https://creativecommons.org/publicdomain/zero/1.0/']],
    ...['2.0', '2.5', '3.0', '4.0'].flatMap(version => [
      [`CC BY ${version}`, ['cc-by', `https://creativecommons.org/licenses/by/${version}/`]],
      [`CC BY-SA ${version}`, ['cc-by-sa', `https://creativecommons.org/licenses/by-sa/${version}/`]],
    ]),
  ]);
  for (const work of artworks.filter(({ unit }) => unit === unitNumber)) {
    const rows = Array.isArray(credits[work.id]) ? credits[work.id] : [credits[work.id]];
    work.images.forEach((view, index) => {
      const key = `${work.id}::${view.id}`, row = rights[key];
      if (row.sourcePageUrl !== view.imageSourceUrl) fail(`Unit ${unitNumber} rights audit ${key} source mismatch`);
      if (row.releaseClass === 'open') {
        const policy = policies.get(row.licenseName);
        if (!policy || row.licenseClass !== policy[0] || row.licenseUrl !== policy[1]) {
          fail(`Unit ${unitNumber} rights audit ${key} disallowed open license policy`);
        }
      } else if (row.identityNote !== authority[key].rightsNote) {
        fail(`Unit ${unitNumber} rights audit ${key} restricted evidence mismatch`);
      }
      for (const field of CREDIT_FIELDS) {
        if (row[field] !== rows[index][field]) fail(`Unit ${unitNumber} rights audit ${key}.${field} credit mismatch`);
      }
    });
  }
}

export function validateImageCredits(credits, artworks, rightsAudit, placeholders) {
  if (!credits || typeof credits !== 'object' || Array.isArray(credits)) {
    fail('image-credit-data must be an object');
  }
  const artworkIds = artworks.map(({ id }) => id);
  const creditIds = Object.keys(credits);
  validateExactKeys(
    creditIds,
    artworkIds,
    'image credit ids must match artwork ids exactly',
    { orderSensitive: false },
  );

  for (const artwork of artworks) {
    const media = normalizeArtworkMedia(artwork);
    const rawCredit = credits[artwork.id];
    if (media.length === 1 && Array.isArray(rawCredit)) {
      fail(`${artwork.id} single-media image credit must be an object, not an array`);
    }
    if (media.length > 1 && !Array.isArray(rawCredit)) {
      fail(`${artwork.id} multi-media image credits must be an array`);
    }
    const creditEntries = Array.isArray(rawCredit) ? rawCredit : [rawCredit];
    if (creditEntries.length !== media.length) {
      fail(`${artwork.id} image credit count must match its ${media.length} media views`);
    }
    const creditSignatures = new Set();
    for (const [index, credit] of creditEntries.entries()) {
      const creditContext = artwork.unit === 3 || artwork.unit === 4 || artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10
        ? `${artwork.id}::${normalizedMediaIds(artwork)[index]}`
        : `${artwork.id} image credit ${index + 1}`;
      if (!credit || typeof credit !== 'object' || Array.isArray(credit)) {
        fail(`${creditContext} image credit must be an object`);
      }
      if (artwork.unit === 3 || artwork.unit === 4 || artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10) {
        validateExactKeys(
          artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10 ? Object.keys(credit) : Object.keys(credit).sort(),
          artwork.unit === 5 || artwork.unit === 6 || artwork.unit === 7 || artwork.unit === 8 || artwork.unit === 9 || artwork.unit === 10 ? CREDIT_FIELDS : CREDIT_FIELDS.toSorted(),
          `${creditContext} image credit must use the exact credit schema`,
        );
      }
      for (const field of CREDIT_FIELDS) {
        if (typeof credit[field] !== 'string' || credit[field].trim() === '') {
          fail(`${creditContext} image credit ${field} must be a non-empty string`);
        }
      }
      if (!isHttpsUrl(credit.licenseUrl)) {
        fail(`${creditContext} image credit licenseUrl must be an HTTPS URL`);
      }
      if (artwork.unit === 1 && media.length > 1) {
        const signature = JSON.stringify([
          credit.creatorOrInstitution,
          credit.licenseName,
          credit.licenseUrl,
        ]);
        if (creditSignatures.has(signature)) {
          fail(`${artwork.id} contains duplicate image credit metadata`);
        }
        creditSignatures.add(signature);
      }
    }
  }
  const includesUnit3 = artworks.some(({ unit }) => unit === 3);
  const includesUnit4 = artworks.some(({ unit }) => unit === 4);
  const includesUnit5 = artworks.some(({ unit }) => unit === 5);
  const includesUnit6 = artworks.some(({ unit }) => unit === 6);
  const includesUnit7 = artworks.some(({ unit }) => unit === 7);
  const includesUnit8 = artworks.some(({ unit }) => unit === 8);
  const includesUnit9 = artworks.some(({ unit }) => unit === 9);
  const includesUnit10 = artworks.some(({ unit }) => unit === 10);
  if (includesUnit10 && rightsAudit === undefined) fail('Unit 10 reviewed rights audit is required for image credits');
  if (includesUnit8 && rightsAudit === undefined) fail('Unit 8 reviewed rights audit is required for image credits');
  if (includesUnit9 && rightsAudit === undefined) fail('Unit 9 reviewed rights audit is required for image credits');
  if (includesUnit7 && rightsAudit === undefined) {
    fail('Unit 7 reviewed rights audit is required for image credits');
  }
  if (includesUnit6 && rightsAudit === undefined) {
    fail('Unit 6 reviewed rights audit is required for image credits');
  }
  if (includesUnit3 && rightsAudit === undefined) {
    fail('Unit 3 reviewed rights audit is required for image credits');
  }
  if (includesUnit4 && rightsAudit === undefined) {
    fail('Unit 4 reviewed rights audit is required for image credits');
  }
  if (includesUnit5 && rightsAudit === undefined) {
    fail('Unit 5 reviewed rights audit is required for image credits');
  }
  if (rightsAudit !== undefined) {
    const unit3Rights = includesUnit4 || includesUnit5 || includesUnit6 || includesUnit7 || includesUnit8 || includesUnit9 || includesUnit10 ? rightsAudit[3] : rightsAudit;
    const placeholderAuthorities = normalizePlaceholderAuthorities(
      placeholders,
      includesUnit10 ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : includesUnit9 ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : includesUnit8 ? [1, 2, 3, 4, 5, 6, 7, 8] : includesUnit7 ? [1, 2, 3, 4, 5, 6, 7] : includesUnit6 ? [1, 2, 3, 4, 5, 6] : includesUnit5 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4],
    );
    if (includesUnit3) validateUnit3RightsAudit(unit3Rights, artworks, credits);
    if (includesUnit4) {
      validateUnit4RightsAudit(rightsAudit[4], artworks, credits, placeholderAuthorities[4]);
    }
    if (includesUnit5) {
      validateUnit5RightsAudit(rightsAudit[5], artworks, credits, placeholderAuthorities[5]);
    }
    if (includesUnit6) {
      validateUnit6RightsAudit(rightsAudit[6], artworks, credits, placeholderAuthorities[6]);
    }
    if (includesUnit8) validateModernLocalRightsAudit(8, rightsAudit[8], artworks, credits, placeholderAuthorities[8]);
    if (includesUnit9) validateModernLocalRightsAudit(9, rightsAudit[9], artworks, credits, placeholderAuthorities[9]);
    if (includesUnit10) validateModernLocalRightsAudit(10, rightsAudit[10], artworks, credits, placeholderAuthorities[10]);
    if (includesUnit7) {
      validateModernLocalRightsAudit(7, rightsAudit[7], artworks, credits, placeholderAuthorities[7]);
    }
  }
  return credits;
}

class DuplicateJsonObjectKeyError extends Error {}

function validateNoDuplicateJsonObjectKeys(source) {
  let index = 0;

  const skipWhitespace = () => {
    while (
      source[index] === ' '
      || source[index] === '\t'
      || source[index] === '\n'
      || source[index] === '\r'
    ) {
      index += 1;
    }
  };

  const failSyntax = (message) => {
    throw new SyntaxError(`${message} at position ${index}`);
  };

  const parseString = () => {
    if (source[index] !== '"') failSyntax('Expected a JSON string');
    const start = index;
    index += 1;
    while (index < source.length) {
      if (source[index] === '\\') {
        index += 2;
        continue;
      }
      if (source[index] === '"') {
        index += 1;
        return JSON.parse(source.slice(start, index));
      }
      index += 1;
    }
    failSyntax('Unterminated JSON string');
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
      return;
    }
    if (source[index] === '[') {
      parseArray(path);
      return;
    }
    if (source[index] === '"') {
      parseString();
      return;
    }

    const start = index;
    while (
      index < source.length
      && source[index] !== ','
      && source[index] !== ']'
      && source[index] !== '}'
      && source[index] !== ' '
      && source[index] !== '\t'
      && source[index] !== '\n'
      && source[index] !== '\r'
    ) {
      index += 1;
    }
    if (index === start) failSyntax('Expected a JSON value');
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
        throw new DuplicateJsonObjectKeyError(
          `contains duplicate object key ${JSON.stringify(key)} at ${path}`,
        );
      }
      keys.add(key);
      skipWhitespace();
      if (source[index] !== ':') failSyntax('Expected ":" after object key');
      index += 1;
      parseValue(childPath(path, key));
      skipWhitespace();
      if (source[index] === '}') {
        index += 1;
        return;
      }
      if (source[index] !== ',') failSyntax('Expected "," or "}" in object');
      index += 1;
    }
    failSyntax('Unterminated JSON object');
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
      if (source[index] !== ',') failSyntax('Expected "," or "]" in array');
      index += 1;
    }
    failSyntax('Unterminated JSON array');
  };

  parseValue('$');
  skipWhitespace();
  if (index !== source.length) failSyntax('Unexpected trailing JSON content');
}

function parseJson(source, label) {
  try {
    validateNoDuplicateJsonObjectKeys(source);
    return JSON.parse(source);
  } catch (error) {
    if (error instanceof DuplicateJsonObjectKeyError) {
      fail(`${label} ${error.message}`);
    }
    fail(`${label} contains invalid JSON (${error.message})`);
  }
  return null;
}

export async function loadAndValidate(htmlPath = DEFAULT_HTML_PATH) {
  const [
    html,
    unit1ManifestSource,
    unit2ManifestSource,
    unit3ManifestSource,
    unit4ManifestSource,
    unit5ManifestSource,
    unit6ManifestSource,
    unit7ManifestSource,
    unit8ManifestSource,
    unit9ManifestSource,
    unit10ManifestSource,
    unit3RightsSource,
    unit4RightsSource,
    unit5RightsSource,
    unit6RightsSource,
    unit7RightsSource,
    unit8RightsSource,
    unit9RightsSource,
    unit10RightsSource,
    unit4PlaceholdersSource,
    unit5PlaceholdersSource,
    unit6PlaceholdersSource,
    unit7PlaceholdersSource,
    unit8PlaceholdersSource,
    unit9PlaceholdersSource,
    unit10PlaceholdersSource,
  ] = await Promise.all([
    readFile(htmlPath, 'utf8'),
    readFile(MANIFEST_URLS[1], 'utf8'),
    readFile(MANIFEST_URLS[2], 'utf8'),
    readFile(MANIFEST_URLS[3], 'utf8'),
    readFile(MANIFEST_URLS[4], 'utf8'),
    readFile(MANIFEST_URLS[5], 'utf8'),
    readFile(MANIFEST_URLS[6], 'utf8'),
    readFile(MANIFEST_URLS[7], 'utf8'),
    readFile(MANIFEST_URLS[8], 'utf8'),
    readFile(MANIFEST_URLS[9], 'utf8'),
    readFile(MANIFEST_URLS[10], 'utf8'),
    readFile(AUDITED_RIGHTS_URLS[3], 'utf8'),
    readFile(AUDITED_RIGHTS_URLS[4], 'utf8'),
    readFile(AUDITED_RIGHTS_URLS[5], 'utf8'),
    readFile(AUDITED_RIGHTS_URLS[6], 'utf8'),
    readFile(AUDITED_RIGHTS_URLS[7], 'utf8'),
    readFile(AUDITED_RIGHTS_URLS[8], 'utf8'),
    readFile(AUDITED_RIGHTS_URLS[9], 'utf8'),
    readFile(AUDITED_RIGHTS_URLS[10], 'utf8'),
    readFile(PLACEHOLDER_AUTHORITY_URLS[4], 'utf8'),
    readFile(PLACEHOLDER_AUTHORITY_URLS[5], 'utf8'),
    readFile(PLACEHOLDER_AUTHORITY_URLS[6], 'utf8'),
    readFile(PLACEHOLDER_AUTHORITY_URLS[7], 'utf8'),
    readFile(PLACEHOLDER_AUTHORITY_URLS[8], 'utf8'),
    readFile(PLACEHOLDER_AUTHORITY_URLS[9], 'utf8'),
    readFile(PLACEHOLDER_AUTHORITY_URLS[10], 'utf8'),
  ]);
  const parseDataScript = (id) => {
    const dataScript = html.match(
      new RegExp(
        `<script\\b(?=[^>]*\\bid=["']${id}["'])(?=[^>]*\\btype=["']application/json["'])[^>]*>([\\s\\S]*?)<\\/script>`,
        'i',
      ),
    );
    if (!dataScript) {
      fail(`missing <script id="${id}" type="application/json">`);
    }
    return parseJson(dataScript[1], id);
  };
  const rawArtworks = parseDataScript('artwork-data');
  const manifests = {
    1: parseJson(unit1ManifestSource, 'official Unit 1 manifest'),
    2: parseJson(unit2ManifestSource, 'official Unit 2 manifest'),
    3: parseJson(unit3ManifestSource, 'official Unit 3 manifest'),
    4: parseJson(unit4ManifestSource, 'official Unit 4 manifest'),
    5: parseJson(unit5ManifestSource, 'official Unit 5 manifest'),
    6: parseJson(unit6ManifestSource, 'official Unit 6 manifest'),
    7: parseJson(unit7ManifestSource, 'official Unit 7 manifest'),
    8: parseJson(unit8ManifestSource, 'official Unit 8 manifest'),
    9: parseJson(unit9ManifestSource, 'official Unit 9 manifest'),
    10: parseJson(unit10ManifestSource, 'official Unit 10 manifest'),
  };
  const placeholders = {
    4: parseJson(unit4PlaceholdersSource, 'Unit 4 public placeholder authority'),
    5: parseJson(unit5PlaceholdersSource, 'Unit 5 public placeholder authority'),
    6: parseJson(unit6PlaceholdersSource, 'Unit 6 public placeholder authority'),
    7: parseJson(unit7PlaceholdersSource, 'Unit 7 public placeholder authority'),
    8: parseJson(unit8PlaceholdersSource, 'Unit 8 public placeholder authority'),
    9: parseJson(unit9PlaceholdersSource, 'Unit 9 public placeholder authority'),
    10: parseJson(unit10PlaceholdersSource, 'Unit 10 public placeholder authority'),
  };
  const artworks = validateArtworks(rawArtworks, manifests, placeholders);
  validateImageCredits(
    parseDataScript('image-credit-data'),
    artworks,
    {
      3: parseJson(unit3RightsSource, 'Unit 3 rights audit'),
      4: parseJson(unit4RightsSource, 'Unit 4 rights audit'),
      5: parseJson(unit5RightsSource, 'Unit 5 rights audit'),
      6: parseJson(unit6RightsSource, 'Unit 6 rights audit'),
      7: parseJson(unit7RightsSource, 'Unit 7 rights audit'),
      8: parseJson(unit8RightsSource, 'Unit 8 rights audit'),
      9: parseJson(unit9RightsSource, 'Unit 9 rights audit'),
      10: parseJson(unit10RightsSource, 'Unit 10 rights audit'),
    },
    placeholders,
  );
  return artworks;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  const artworks = await loadAndValidate(process.argv[2] ?? DEFAULT_HTML_PATH);
  console.log(`Validated ${artworks.length} AP Art History works`);
}
