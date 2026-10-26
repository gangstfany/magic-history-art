import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeArtworkMedia } from '../scripts/validate-art-history-data.mjs';

const FIXTURE_URL = new URL('./fixtures/u4-canonical.json', import.meta.url);

const MANIFEST_URL = new URL(
  '../data/ap-art-history-unit-4-manifest.json',
  import.meta.url,
);
const LEDGER_URL = new URL(
  '../docs/data-sources/u4-source-ledger.md',
  import.meta.url,
);
const RIGHTS_URL = new URL(
  '../data/ap-art-history-unit-4-rights.json',
  import.meta.url,
);
const PLACEHOLDERS_URL = new URL(
  '../data/ap-art-history-unit-4-public-placeholders.json',
  import.meta.url,
);
const HTML_URL = new URL('../art-history-map.html', import.meta.url);

const PUBLIC_PLACEHOLDER_LITERAL = 'Rights-restricted public placeholder';
const RESTRICTED_MEDIA_KEYS = Object.freeze([
  'ap140-two-fridas::primary',
  'ap143-dream-alameda-central::primary',
  'ap146-marilyn-diptych::primary',
  'ap148-narcissus-garden::primary',
  'ap149-bay::primary',
  'ap150-lipstick-caterpillar-tracks::primary',
  'ap152-house-new-castle-county::exterior',
  'ap152-house-new-castle-county::interior',
]);
const PUBLIC_IMAGE_FIELDS = [
  'id',
  'label',
  'imageUrl',
  'imageAlt',
  'imageSourceName',
  'imageSourceUrl',
];
const PLACEHOLDER_IMAGE_FIELDS = [...PUBLIC_IMAGE_FIELDS, 'mediaStatus'];
const PLACEHOLDER_AUTHORITY_FIELDS = [
  'imageSourceName',
  'imageSourceUrl',
  'rightsNote',
];
const PLACEHOLDER_RIGHTS_NOTE = 'The underlying work or source photograph remains protected; public reproduction is omitted, and this link is identity/source evidence rather than a portable license.';
const EXPECTED_PLACEHOLDER_SOURCES = Object.freeze({
  'ap140-two-fridas::primary': Object.freeze({
    imageSourceName: 'Museo de Arte Moderno / INBAL',
    imageSourceUrl: 'https://inba.gob.mx/prensa/23566/el-museo-de-arte-moderno-presenta-las-dos-fridas-una-identidad-global',
  }),
  'ap143-dream-alameda-central::primary': Object.freeze({
    imageSourceName: 'Smarthistory / Museo Mural Diego Rivera / INBAL',
    imageSourceUrl: 'https://smarthistory.org/rivera-dream-of-a-sunday-afternoon-in-alameda-central-park/',
  }),
  'ap146-marilyn-diptych::primary': Object.freeze({
    imageSourceName: 'Tate',
    imageSourceUrl: 'https://www.tate.org.uk/art/artworks/warhol-marilyn-diptych-t03093',
  }),
  'ap148-narcissus-garden::primary': Object.freeze({
    imageSourceName: 'Victoria Miro / FIAC 2010',
    imageSourceUrl: 'https://www.victoria-miro.com/exhibitions/411/',
  }),
  'ap149-bay::primary': Object.freeze({
    imageSourceName: 'Detroit Institute of Arts',
    imageSourceUrl: 'https://dia.org/collection/bay/45380',
  }),
  'ap150-lipstick-caterpillar-tracks::primary': Object.freeze({
    imageSourceName: 'Yale University Art Gallery',
    imageSourceUrl: 'https://artgallery.yale.edu/collections/objects/13727',
  }),
  'ap152-house-new-castle-county::exterior': Object.freeze({
    imageSourceName: 'Smarthistory / University of Pennsylvania Architectural Archives',
    imageSourceUrl: 'https://human.libretexts.org/Bookshelves/Art/Art_History_and_Theory/SmartHistory_of_Art_2e/SmartHistory_of_Art_IXb_-_Modernism_1945-1980/08%3A_Architecture_design_and_dance/8.09%3A_Late_Modernism_Post-Modernism/8.9.05%3A_Robert_Venturi_House_in_New_Castle_County_Delaware',
  }),
  'ap152-house-new-castle-county::interior': Object.freeze({
    imageSourceName: 'Smarthistory / University of Pennsylvania Architectural Archives',
    imageSourceUrl: 'https://human.libretexts.org/Bookshelves/Art/Art_History_and_Theory/SmartHistory_of_Art_2e/SmartHistory_of_Art_IXb_-_Modernism_1945-1980/08%3A_Architecture_design_and_dance/8.09%3A_Late_Modernism_Post-Modernism/8.9.05%3A_Robert_Venturi_House_in_New_Castle_County_Delaware',
  }),
});
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
const NORMAL_RELEASE_CLASSES = new Set([
  'open',
  'noncommercial',
  'institutionalEducational',
]);
const APPROVED_NORMAL_LICENSE_POLICIES = new Map([
  ['CC BY 2.0', {
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    releaseClass: 'open',
  }],
  ['CC BY 4.0', {
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    releaseClass: 'open',
  }],
  ['CC BY-NC-SA 2.0', {
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/2.0/',
    releaseClass: 'noncommercial',
  }],
  ['CC BY-NC-SA 4.0', {
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    releaseClass: 'noncommercial',
  }],
  ['CC BY-SA 2.0', {
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
    releaseClass: 'open',
  }],
  ['CC BY-SA 2.5', {
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.5/',
    releaseClass: 'open',
  }],
  ['CC BY-SA 3.0', {
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    releaseClass: 'open',
  }],
  ['CC BY-SA 4.0', {
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    releaseClass: 'open',
  }],
  ['CC0 1.0', {
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    releaseClass: 'open',
  }],
  ['Free Art License 1.3', {
    licenseUrl: 'https://artlibre.org/licence/lal/en/',
    releaseClass: 'open',
  }],
  ['LACMA collection image; reuse subject to museum terms', {
    licenseUrl: 'https://www.lacma.org/terms-use',
    releaseClass: 'institutionalEducational',
  }],
  ['Louvre educational-use terms; commercial permission required', {
    licenseUrl: 'https://collections.louvre.fr/en/page/cgu',
    releaseClass: 'institutionalEducational',
  }],
  ['Library of Congress HABS/HAER rights advisory; no known restrictions', {
    licenseUrl: 'https://www.loc.gov/pictures/collection/hh/rights.html',
    releaseClass: 'open',
  }],
  ['MoMA fair-use terms—noncommercial educational use', {
    licenseUrl: 'https://www.moma.org/about/about-this-site/',
    releaseClass: 'institutionalEducational',
  }],
  ['No known copyright restrictions', {
    licenseUrl: 'https://commons.wikimedia.org/wiki/Commons:Copyright_rules_by_subject_matter#Photographs_of_old_artworks',
    releaseClass: 'open',
  }],
  ['No known restrictions on publication', {
    licenseUrl: 'https://hdl.loc.gov/loc.pnp/res.598.kora',
    releaseClass: 'open',
  }],
  ['PMA educational/fair-use terms', {
    licenseUrl: 'https://www.philamuseum.org/legal',
    releaseClass: 'institutionalEducational',
  }],
  ['Public Domain Mark 1.0', {
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    releaseClass: 'open',
  }],
  ['Public domain (anonymous EU work)', {
    licenseUrl: 'https://commons.wikimedia.org/wiki/Template:PD-anon-70-EU',
    releaseClass: 'open',
  }],
  ['Public domain (self-dedicated)', {
    licenseUrl: 'https://commons.wikimedia.org/wiki/Template:PD-self',
    releaseClass: 'open',
  }],
  ['Public domain (U.S. pre-1931 publication)', {
    licenseUrl: 'https://commons.wikimedia.org/wiki/Template:PD-US-expired',
    releaseClass: 'open',
  }],
  ['University at Buffalo educational-use terms', {
    licenseUrl: 'https://digital.lib.buffalo.edu/items/show/31590',
    releaseClass: 'institutionalEducational',
  }],
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
const LEDGER_DIVIDER = '| ---: | --- | --- | --- | --- | --- | --- | --- |';
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
  'comparisonNotes',
  'keywords',
  'images',
].sort();
const REQUIRED_STUDY_FIELDS = [
  'titleZh',
  'culture',
  'period',
  'date',
  'artistCulture',
  'medium',
  'workType',
  'function',
  'form',
  'content',
  'context',
];
const COMPARISON_BASIS = /形式|formal|材料|material|功能|function|政治|political|殖民|colonial|社会|social|建筑|architectural|空间|构图|色彩|媒介|权力|身份|性别|种族|观看|场域|赞助|现代性/i;
const HAN_SCRIPT = /\p{Script=Han}/u;
const UNFINISHED_VALUE = /\b(?:tbd|todo|placeholder|n\/a|not available)\b|待补|待定|占位/i;

const EXPECTED_TITLES = [
  'Portrait of Sor Juana Inés de la Cruz',
  'A Philosopher Giving a Lecture on the Orrery',
  'The Swing',
  'Monticello',
  'The Oath of the Horatii',
  'George Washington',
  'Self-Portrait',
  "Y no hai remedio (And There's Nothing to Be Done), from Los Desastres de la Guerra (The Disasters of War), plate 15",
  'La Grande Odalisque',
  'Liberty Leading the People',
  'View from Mount Holyoke, Northampton, Massachusetts, after a Thunderstorm - The Oxbow',
  'Still Life in Studio',
  'Slave Ship (Slavers Throwing Overboard the Dead and Dying, Typhoon Coming On)',
  'Palace of Westminster (Houses of Parliament)',
  'The Stone Breakers',
  'Nadar Raising Photography to the Height of Art',
  'Olympia',
  'The Saint-Lazare Station',
  'The Horse in Motion',
  'The Valley of Mexico from the Hillside of Santa Isabel',
  'The Burghers of Calais',
  'The Starry Night',
  'The Coiffure',
  'The Scream',
  'Where Do We Come From? What Are We? Where Are We Going?',
  'Carson, Pirie, Scott and Company Building',
  'Mont Sainte-Victoire',
  "Les Demoiselles d'Avignon",
  'The Steerage',
  'The Kiss',
  'The Kiss',
  'The Portuguese',
  'The Goldfish',
  'Improvisation 28 (second version)',
  'Self-Portrait as a Soldier',
  'Memorial Sheet of Karl Liebknecht',
  'Villa Savoye',
  'Composition with Red, Blue and Yellow',
  'Illustration from The Results of the First Five-Year Plan',
  'Object (Le Déjeuner en fourrure)',
  'Fallingwater',
  'The Two Fridas',
  'The Migration of the Negro, Panel no. 49',
  'The Jungle',
  'Dream of a Sunday Afternoon in the Alameda Central Park',
  'Fountain',
  'Woman, I',
  'Marilyn Diptych',
  'Seagram Building',
  'Narcissus Garden',
  'The Bay',
  'Lipstick (Ascending) on Caterpillar Tracks',
  'Spiral Jetty',
  'House in New Castle County',
];
const ENTRY_FIELDS = [
  'id',
  'titleEn',
  'region',
  'siteName',
  'provenanceQualifier',
  'traditionGroup',
  'requiredViewIds',
];
const STABLE_FIELDS = [
  'id',
  'region',
  'siteName',
  'provenanceQualifier',
  'traditionGroup',
];

function stable(id, region, siteName, provenanceQualifier, traditionGroup) {
  return { id, region, siteName, provenanceQualifier, traditionGroup };
}

const EXPECTED_STABLE_PROJECTION = {
  '99': stable(
    'ap99-portrait-sor-juana',
    'mexicoCaribbean',
    'Mexico City, New Spain (Mexico)',
    null,
    'enlightenmentRevolution',
  ),
  '100': stable('ap100-philosopher-lecture-orrery', 'britishIsles', 'Derby, England', null, 'enlightenmentRevolution'),
  '101': stable('ap101-swing', 'france', 'Paris, France', null, 'enlightenmentRevolution'),
  '102': stable('ap102-monticello', 'unitedStates', 'Charlottesville, Virginia, U.S.', null, 'enlightenmentRevolution'),
  '103': stable('ap103-oath-horatii', 'southernEurope', 'Rome, Italy', null, 'enlightenmentRevolution'),
  '104': stable(
    'ap104-george-washington',
    'france',
    'Paris, France',
    'Modeled from life at Mount Vernon in 1785 and carved in Paris for installation at the Virginia State Capitol in Richmond.',
    'enlightenmentRevolution',
  ),
  '105': stable('ap105-self-portrait-vigee-le-brun', 'southernEurope', 'Rome, Italy', null, 'enlightenmentRevolution'),
  '106': stable(
    'ap106-y-no-hai-remedio',
    'southernEurope',
    'Spain',
    'Made during the Peninsular War; the precise place where Goya produced this plate is not securely localized.',
    'enlightenmentRevolution',
  ),
  '107': stable('ap107-grande-odalisque', 'france', 'Paris, France', null, 'enlightenmentRevolution'),
  '108': stable('ap108-liberty-leading-people', 'france', 'Paris, France', null, 'enlightenmentRevolution'),
  '109': stable(
    'ap109-oxbow',
    'unitedStates',
    'New York City, New York, U.S.',
    "Painted in Cole's New York studio from sketches made at Mount Holyoke, Massachusetts.",
    'enlightenmentRevolution',
  ),
  '110': stable('ap110-still-life-studio', 'france', 'Paris, France', null, 'realismIndustryPhotography'),
  '111': stable('ap111-slave-ship', 'britishIsles', 'London, England', null, 'realismIndustryPhotography'),
  '112': stable('ap112-palace-westminster', 'britishIsles', 'London, England', null, 'realismIndustryPhotography'),
  '113': stable('ap113-stone-breakers', 'france', 'Ornans, France', null, 'realismIndustryPhotography'),
  '114': stable('ap114-nadar-raising-photography', 'france', 'Paris, France', null, 'realismIndustryPhotography'),
  '115': stable('ap115-olympia', 'france', 'Paris, France', null, 'realismIndustryPhotography'),
  '116': stable('ap116-saint-lazare-station', 'france', 'Paris, France', null, 'realismIndustryPhotography'),
  '117': stable('ap117-horse-motion', 'unitedStates', 'Palo Alto, California, U.S.', null, 'realismIndustryPhotography'),
  '118': stable(
    'ap118-valley-mexico',
    'mexicoCaribbean',
    'Mexico City, Mexico',
    "Painted from studies of the Valley of Mexico made at the hillside of Santa Isabel; the manifest maps Velasco's Mexico City creation context.",
    'realismIndustryPhotography',
  ),
  '119': stable(
    'ap119-burghers-calais',
    'france',
    'Paris, France',
    "Modeled in Rodin's Paris studio for the city of Calais; later casts exist at multiple sites.",
    'realismIndustryPhotography',
  ),
  '120': stable('ap120-starry-night', 'france', 'Saint-Rémy-de-Provence, France', null, 'postImpressionismEarlyModernism'),
  '121': stable('ap121-coiffure', 'france', 'Paris, France', null, 'postImpressionismEarlyModernism'),
  '122': stable(
    'ap122-scream',
    'centralNorthernEurope',
    'Berlin, Germany',
    'Painted while Munch was based in Berlin from a remembered experience and landscape near Kristiania (Oslo).',
    'postImpressionismEarlyModernism',
  ),
  '123': stable('ap123-where-do-we-come-from', 'pacific', 'Punaauia, Tahiti, French Polynesia', null, 'postImpressionismEarlyModernism'),
  '124': stable('ap124-carson-pirie-scott', 'unitedStates', 'Chicago, Illinois, U.S.', null, 'postImpressionismEarlyModernism'),
  '125': stable('ap125-mont-sainte-victoire', 'france', 'Aix-en-Provence, France', null, 'postImpressionismEarlyModernism'),
  '126': stable('ap126-demoiselles-avignon', 'france', 'Paris, France', null, 'postImpressionismEarlyModernism'),
  '127': stable(
    'ap127-steerage',
    'transatlantic',
    'North Atlantic Ocean, aboard SS Kaiser Wilhelm II',
    "Photographed aboard the SS Kaiser Wilhelm II during Stieglitz's 1907 voyage from New York to Europe; the map anchor represents the transatlantic voyage rather than a fixed city.",
    'postImpressionismEarlyModernism',
  ),
  '128': stable('ap128-kiss-klimt', 'centralNorthernEurope', 'Vienna, Austria', null, 'postImpressionismEarlyModernism'),
  '129': stable(
    'ap129-kiss-brancusi',
    'france',
    'Paris, France',
    "Maps the Paris creation context of Brancusi's original 1907-1908 conception; the College Board reference image shows the 1916 version.",
    'postImpressionismEarlyModernism',
  ),
  '130': stable('ap130-portuguese', 'france', 'Paris, France', null, 'postImpressionismEarlyModernism'),
  '131': stable('ap131-goldfish', 'france', 'Issy-les-Moulineaux, France', null, 'postImpressionismEarlyModernism'),
  '132': stable('ap132-improvisation-28', 'centralNorthernEurope', 'Munich, Germany', null, 'postImpressionismEarlyModernism'),
  '133': stable('ap133-self-portrait-soldier', 'centralNorthernEurope', 'Berlin, Germany', null, 'postImpressionismEarlyModernism'),
  '134': stable('ap134-memorial-sheet-karl-liebknecht', 'centralNorthernEurope', 'Berlin, Germany', null, 'postImpressionismEarlyModernism'),
  '135': stable('ap135-villa-savoye', 'france', 'Poissy-sur-Seine, France', null, 'avantGardeArchitecturePostwar'),
  '136': stable('ap136-composition-red-blue-yellow', 'france', 'Paris, France', null, 'avantGardeArchitecturePostwar'),
  '137': stable('ap137-first-five-year-plan', 'russiaSoviet', 'Moscow, Soviet Union (Russia)', null, 'avantGardeArchitecturePostwar'),
  '138': stable('ap138-object-dejeuner-fourrure', 'france', 'Paris, France', null, 'avantGardeArchitecturePostwar'),
  '139': stable('ap139-fallingwater', 'unitedStates', 'Mill Run, Pennsylvania, U.S.', null, 'avantGardeArchitecturePostwar'),
  '140': stable('ap140-two-fridas', 'mexicoCaribbean', 'Mexico City, Mexico', null, 'avantGardeArchitecturePostwar'),
  '141': stable('ap141-migration-negro-panel-49', 'unitedStates', 'New York City, New York, U.S.', null, 'avantGardeArchitecturePostwar'),
  '142': stable('ap142-jungle', 'mexicoCaribbean', 'Havana, Cuba', null, 'avantGardeArchitecturePostwar'),
  '143': stable('ap143-dream-alameda-central', 'mexicoCaribbean', 'Mexico City, Mexico', null, 'avantGardeArchitecturePostwar'),
  '144': stable(
    'ap144-fountain',
    'unitedStates',
    'New York City, New York, U.S.',
    'Maps the New York context of the lost 1917 original and the 1950 second version shown by College Board; multiple authorized replicas exist.',
    'avantGardeArchitecturePostwar',
  ),
  '145': stable('ap145-woman-i', 'unitedStates', 'New York City, New York, U.S.', null, 'avantGardeArchitecturePostwar'),
  '146': stable('ap146-marilyn-diptych', 'unitedStates', 'New York City, New York, U.S.', null, 'avantGardeArchitecturePostwar'),
  '147': stable('ap147-seagram-building', 'unitedStates', 'New York City, New York, U.S.', null, 'avantGardeArchitecturePostwar'),
  '148': stable(
    'ap148-narcissus-garden',
    'southernEurope',
    'Venice, Italy',
    "Maps Kusama's original 1966 Venice Biennale installation and performance; the College Board reference image documents a 2010 Paris installation.",
    'avantGardeArchitecturePostwar',
  ),
  '149': stable('ap149-bay', 'unitedStates', 'New York City, New York, U.S.', null, 'avantGardeArchitecturePostwar'),
  '150': stable('ap150-lipstick-caterpillar-tracks', 'unitedStates', 'New Haven, Connecticut, U.S.', null, 'avantGardeArchitecturePostwar'),
  '151': stable('ap151-spiral-jetty', 'unitedStates', 'Rozel Point, Great Salt Lake, Utah, U.S.', null, 'avantGardeArchitecturePostwar'),
  '152': stable(
    'ap152-house-new-castle-county',
    'unitedStates',
    'New Castle County, Delaware, U.S.',
    'Private residence; the manifest uses the county-level location published by College Board.',
    'avantGardeArchitecturePostwar',
  ),
};
const REGIONS = new Set([
  'france',
  'britishIsles',
  'southernEurope',
  'centralNorthernEurope',
  'russiaSoviet',
  'unitedStates',
  'mexicoCaribbean',
  'pacific',
  'transatlantic',
]);
const TRADITION_GROUPS = new Set([
  'enlightenmentRevolution',
  'realismIndustryPhotography',
  'postImpressionismEarlyModernism',
  'avantGardeArchitecturePostwar',
]);
const MULTI_VIEW_CONTRACT = new Map([
  ['102', ['exterior', 'plan']],
  ['112', ['exterior', 'central-lobby', 'westminster-hall']],
  ['124', ['exterior', 'detail', 'plan']],
  ['135', ['exterior', 'interior-ramp']],
  ['139', ['exterior', 'living-room', 'site-plan']],
  ['152', ['exterior', 'interior']],
]);
const STEERAGE_QUALIFIER = "Photographed aboard the SS Kaiser Wilhelm II during Stieglitz's 1907 voyage from New York to Europe; the map anchor represents the transatlantic voyage rather than a fixed city.";

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}

function mediaKey(artworkId, viewId) {
  return `${artworkId}::${viewId}`;
}

function isRestrictedMediaKey(value) {
  return RESTRICTED_MEDIA_KEYS.includes(value);
}

function assertFinishedString(value, identity, field) {
  assert.equal(typeof value, 'string', `${identity}.${field}: expected string`);
  assert.ok(value.trim(), `${identity}.${field}: expected finished string`);
  assert.doesNotMatch(value, UNFINISHED_VALUE, `${identity}.${field}: unfinished value`);
}

function parseJsonBlock(html, id) {
  const match = html.match(new RegExp(
    `<script id="${id}" type="application/json">([\\s\\S]*?)<\\/script>`,
  ));
  assert.ok(match, `missing ${id}`);
  return JSON.parse(match[1]);
}

function assertHttpsUrl(value, identity) {
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

function markdownLink(value, identity = 'ledger') {
  const match = value.match(/^\[([^\]]+)\]\((https:\/\/.+)\)$/);
  assert.ok(match, `${identity}: malformed HTTPS Markdown link: ${value}`);
  assert.match(match[2], /^https:\/\//, `${identity}: malformed HTTPS Markdown link: ${value}`);
  assertHttpsUrl(match[2], `${identity}: HTTPS Markdown link`);
  return { label: match[1], url: match[2] };
}

function assertApprovedNormalLicensePolicy(entry, identity) {
  const expected = APPROVED_NORMAL_LICENSE_POLICIES.get(entry.licenseName);
  assert.ok(expected, `${identity}: approved license policy`);
  assert.deepEqual(
    {
      licenseUrl: entry.licenseUrl,
      releaseClass: entry.releaseClass,
    },
    expected,
    `${identity}: approved license policy`,
  );
}

function assertPlaceholderAuthority(placeholders) {
  assert.deepEqual(
    Object.keys(placeholders),
    RESTRICTED_MEDIA_KEYS,
    'placeholder authority exact key set and order',
  );
  assert.deepEqual(
    Object.keys(EXPECTED_PLACEHOLDER_SOURCES),
    RESTRICTED_MEDIA_KEYS,
    'frozen placeholder source key order',
  );
  for (const identity of RESTRICTED_MEDIA_KEYS) {
    const entry = placeholders[identity];
    assert.deepEqual(
      Object.keys(entry),
      PLACEHOLDER_AUTHORITY_FIELDS,
      `${identity}: exact placeholder authority schema and order`,
    );
    assert.equal(
      entry.imageSourceName,
      EXPECTED_PLACEHOLDER_SOURCES[identity].imageSourceName,
      `${identity}.imageSourceName: frozen source identity`,
    );
    assertHttpsUrl(entry.imageSourceUrl, `${identity}.imageSourceUrl`);
    assert.equal(
      entry.imageSourceUrl,
      EXPECTED_PLACEHOLDER_SOURCES[identity].imageSourceUrl,
      `${identity}.imageSourceUrl: frozen source page`,
    );
    assert.equal(entry.rightsNote, PLACEHOLDER_RIGHTS_NOTE, `${identity}.rightsNote`);
    assert.doesNotMatch(entry.rightsNote, /fair use|open licen[cs]e/i, `${identity}.rightsNote`);
  }
}

function parseLedgerImageCell(value, identity) {
  if (isRestrictedMediaKey(identity)) {
    assert.equal(value, PUBLIC_PLACEHOLDER_LITERAL, `${identity}: placeholder ledger cell`);
    return null;
  }
  assert.notEqual(value, PUBLIC_PLACEHOLDER_LITERAL, `${identity}: normal ledger image cell`);
  return markdownLink(value, identity).url;
}

function splitLedgerRow(line) {
  assert.match(line, /^\|.*\|$/, `malformed ledger row: ${line}`);
  return line.split('|').slice(1, -1).map((cell) => cell.trim());
}

function parseU4Ledger(markdown) {
  const lines = markdown.split('\n');
  const headerIndex = lines.findIndex((line) => line.startsWith('| AP # |'));
  assert.notEqual(headerIndex, -1, 'missing exact ledger header');
  assert.deepEqual(splitLedgerRow(lines[headerIndex]), LEDGER_HEADER, 'exact ledger header');
  assert.equal(lines[headerIndex + 1], LEDGER_DIVIDER, 'exact ledger divider');

  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!/^\|\s*\d+\s*\|/.test(line)) break;
    rows.push(splitLedgerRow(line));
  }
  const identities = new Set();
  rows.forEach((cells, index) => {
    assert.equal(cells.length, 8, `ledger row ${index + 1}: expected 8 cells`);
    assert.match(cells[0], /^\d+$/, `ledger row ${index + 1}: AP number`);
    assert.match(cells[1], /^`ap\d+-[a-z0-9-]+`$/, `ledger row ${index + 1}: artwork id`);
    assert.match(cells[2], /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `ledger row ${index + 1}: view id`);
    assertFinishedString(cells[3], `ledger row ${index + 1}`, 'view label');
    assertFinishedString(cells[6], `ledger row ${index + 1}`, 'creatorOrInstitution');
    const identity = mediaKey(cells[1].slice(1, -1), cells[2]);
    assert.ok(!identities.has(identity), `${identity}: duplicate ledger identity`);
    identities.add(identity);
    parseLedgerImageCell(cells[4], identity);
    [5, 7].forEach((cellIndex) => markdownLink(cells[cellIndex], identity));
  });
  return rows;
}

function projectCanonicalMedia(fixture) {
  return fixture.artworks.flatMap((work) => {
    const normalized = normalizeArtworkMedia(work);
    return normalized.map((image, index) => ({
      apNumber: work.apNumber,
      artworkId: work.id,
      viewId: work.images[index].id,
      viewLabel: image.label,
      imageUrl: image.imageUrl,
      sourceName: image.imageSourceName,
      sourceUrl: image.imageSourceUrl,
    }));
  });
}

function projectLedgerMedia(markdown) {
  return parseU4Ledger(markdown).map((cells) => {
    const artworkId = cells[1].slice(1, -1);
    const identity = mediaKey(artworkId, cells[2]);
    const source = markdownLink(cells[5], identity);
    return {
      apNumber: Number(cells[0]),
      artworkId,
      viewId: cells[2],
      viewLabel: cells[3],
      imageUrl: parseLedgerImageCell(cells[4], identity),
      sourceName: source.label,
      sourceUrl: source.url,
    };
  });
}

function normalizedCredits(fixture) {
  return fixture.artworks.flatMap((work) => {
    const credits = Array.isArray(fixture.credits[work.id])
      ? fixture.credits[work.id]
      : [fixture.credits[work.id]];
    assert.equal(credits.length, work.images.length, `${work.id}: credit count`);
    return work.images.map((image, index) => [
      mediaKey(work.id, image.id),
      credits[index],
    ]);
  });
}

function expectedMediaKeys(manifest) {
  return Object.values(manifest).flatMap((entry) => (
    entry.requiredViewIds.map((viewId) => mediaKey(entry.id, viewId))
  ));
}

function assertRestrictedStatus({ identity, media, rightsEntry, placeholders }) {
  const restricted = isRestrictedMediaKey(identity);
  assert.equal(
    Object.hasOwn(placeholders, identity),
    restricted,
    `${identity}: placeholder authority mismatch`,
  );
  assert.equal(
    rightsEntry.releaseClass === 'restricted',
    restricted,
    `${identity}: restricted class must match public placeholder status`,
  );
  if (restricted) {
    assert.equal(media.imageUrl, null, `${identity}: restricted URL leak`);
    assert.equal(media.mediaStatus, 'rightsRestricted', `${identity}: restricted media status`);
  } else {
    assert.ok(
      NORMAL_RELEASE_CLASSES.has(rightsEntry.releaseClass),
      `${identity}: normal release class`,
    );
  }
}

function assertCanonicalRightsMatch(fixture, rights, expectedKeys, placeholders) {
  assertPlaceholderAuthority(placeholders);
  const credits = normalizedCredits(fixture);
  const mediaByKey = new Map(fixture.artworks.flatMap((work) => (
    work.images.map((media) => [mediaKey(work.id, media.id), media])
  )));
  assert.deepEqual(credits.map(([key]) => key), expectedKeys, 'canonical credit key order');
  assert.deepEqual([...mediaByKey.keys()], expectedKeys, 'canonical media key order');
  assert.deepEqual(Object.keys(rights), expectedKeys, 'rights key set and order');
  credits.forEach(([identity, credit]) => {
    assert.deepEqual(Object.keys(credit), CREDIT_FIELDS, `${identity}: canonical credit schema`);
    assert.deepEqual(Object.keys(rights[identity]), RIGHTS_FIELDS, `${identity}: rights schema`);
    CREDIT_FIELDS.forEach((field) => {
      assertFinishedString(credit[field], identity, field);
      assert.equal(rights[identity][field], credit[field], `${identity}.${field}: rights mismatch`);
    });
    assertHttpsUrl(credit.licenseUrl, `${identity}.licenseUrl`);
    assert.ok(RELEASE_CLASSES.has(rights[identity].releaseClass), `${identity}: release class`);
    assertRestrictedStatus({
      identity,
      media: mediaByKey.get(identity),
      rightsEntry: rights[identity],
      placeholders,
    });
    if (!isRestrictedMediaKey(identity)) {
      assertApprovedNormalLicensePolicy(rights[identity], identity);
    }
  });
}

function assertLedgerRightsMatch(markdown, rights) {
  const entries = parseU4Ledger(markdown).map((cells) => {
    const identity = mediaKey(cells[1].slice(1, -1), cells[2]);
    const license = markdownLink(cells[7], identity);
    return [identity, {
      creatorOrInstitution: cells[6],
      licenseName: license.label,
      licenseUrl: license.url,
    }];
  });
  assert.deepEqual(entries.map(([key]) => key), Object.keys(rights), 'ledger/rights key order');
  entries.forEach(([identity, credit]) => {
    CREDIT_FIELDS.forEach((field) => {
      assert.equal(credit[field], rights[identity][field], `${identity}.${field}: ledger mismatch`);
    });
  });
}

function assertComparisonDefinitions(work, resolvableIds) {
  assert.ok(Array.isArray(work.comparisonIds), `${work.id}.comparisonIds: array`);
  assert.ok(work.comparisonIds.length >= 1, `${work.id}.comparisonIds: minimum`);
  assert.equal(new Set(work.comparisonIds).size, work.comparisonIds.length, `${work.id}: duplicate comparison`);
  assert.ok(
    work.comparisonNotes && typeof work.comparisonNotes === 'object' && !Array.isArray(work.comparisonNotes),
    `${work.id}.comparisonNotes: mapping`,
  );
  assert.deepEqual(Object.keys(work.comparisonNotes), work.comparisonIds, `${work.id}: comparison note targets`);
  work.comparisonIds.forEach((comparisonId) => {
    assert.notEqual(comparisonId, work.id, `${work.id}: self comparison`);
    assert.ok(resolvableIds.has(comparisonId), `${work.id}: unresolved ${comparisonId}`);
    assertFinishedString(work.comparisonNotes[comparisonId], work.id, `comparisonNotes.${comparisonId}`);
    assert.match(
      work.comparisonNotes[comparisonId],
      COMPARISON_BASIS,
      `${work.id}: comparison ${comparisonId} needs an explicit basis`,
    );
  });
}

function assertCanonicalStudyContract(fixture, manifest, resolvableIds) {
  const manifestEntries = Object.entries(manifest);
  const expectedIds = manifestEntries.map(([, entry]) => entry.id);
  assert.deepEqual(Object.keys(fixture), ['artworks', 'credits'], 'canonical top-level key order');
  assert.equal(fixture.artworks.length, 54, 'canonical work count');
  assert.deepEqual(
    fixture.artworks.map(({ apNumber }) => apNumber),
    Array.from({ length: 54 }, (_, index) => index + 99),
    'canonical AP order',
  );
  assert.deepEqual(fixture.artworks.map(({ id }) => id), expectedIds, 'canonical work ids');
  assert.deepEqual(Object.keys(fixture.credits), expectedIds, 'canonical credit work ids');

  fixture.artworks.forEach((work, index) => {
    const [apNumber, manifestWork] = manifestEntries[index];
    const expectedFields = manifestWork.provenanceQualifier === null
      ? REQUIRED_ARTWORK_FIELDS
      : [...REQUIRED_ARTWORK_FIELDS, 'provenanceQualifier'].sort();
    assert.deepEqual(Object.keys(work).sort(), expectedFields, `${work.id}: artwork schema`);
    assert.equal(work.apNumber, Number(apNumber), `${work.id}.apNumber`);
    assert.equal(work.unit, 4, `${work.id}.unit`);
    for (const field of ['id', 'titleEn', 'region', 'siteName', 'traditionGroup']) {
      assert.equal(work[field], manifestWork[field], `${work.id}.${field}: manifest mismatch`);
    }
    assert.equal(
      work.provenanceQualifier ?? null,
      manifestWork.provenanceQualifier,
      `${work.id}.provenanceQualifier: manifest mismatch`,
    );
    REQUIRED_STUDY_FIELDS.forEach((field) => assertFinishedString(work[field], work.id, field));
    for (const field of ['function', 'form', 'content', 'context']) {
      assert.match(work[field], HAN_SCRIPT, `${work.id}.${field}: Chinese learning text`);
    }
    assert.ok(!TRADITION_GROUPS.has(work.culture), `${work.id}.culture: must be precise`);
    assert.deepEqual(Object.keys(work.coordinates), ['x', 'y'], `${work.id}.coordinates schema`);
    assert.ok(Number.isFinite(work.coordinates.x), `${work.id}.coordinates.x`);
    assert.ok(Number.isFinite(work.coordinates.y), `${work.id}.coordinates.y`);
    assert.ok(work.coordinates.x >= 0 && work.coordinates.x <= 1600, `${work.id}.coordinates.x bounds`);
    assert.ok(work.coordinates.y >= 0 && work.coordinates.y <= 800, `${work.id}.coordinates.y bounds`);

    assert.ok(Array.isArray(work.recognitionAnchors), `${work.id}.recognitionAnchors: array`);
    assert.ok(
      work.recognitionAnchors.length >= 2 && work.recognitionAnchors.length <= 4,
      `${work.id}.recognitionAnchors: 2-4`,
    );
    assert.equal(
      new Set(work.recognitionAnchors).size,
      work.recognitionAnchors.length,
      `${work.id}: duplicate recognition anchor`,
    );
    work.recognitionAnchors.forEach((value, itemIndex) => {
      assertFinishedString(value, work.id, `recognitionAnchors[${itemIndex}]`);
      assert.match(value, HAN_SCRIPT, `${work.id}: Chinese recognition anchor`);
    });
    assertComparisonDefinitions(work, resolvableIds);
    assert.ok(Array.isArray(work.keywords) && work.keywords.length >= 3, `${work.id}.keywords: minimum`);
    assert.equal(new Set(work.keywords).size, work.keywords.length, `${work.id}: duplicate keyword`);
    work.keywords.forEach((value, itemIndex) => assertFinishedString(value, work.id, `keywords[${itemIndex}]`));
    assert.ok(work.keywords.some((value) => HAN_SCRIPT.test(value)), `${work.id}: Chinese keyword`);
  });
}

function assertCanonicalMediaContract(fixture, manifest, placeholders) {
  assertPlaceholderAuthority(placeholders);
  const manifestById = new Map(Object.values(manifest).map((entry) => [entry.id, entry]));
  const imageUrls = new Set();
  const imageAlts = new Set();
  const canonicalKeys = [];
  let nullImageUrlCount = 0;
  fixture.artworks.forEach((work) => {
    assert.ok(Array.isArray(work.images) && work.images.length >= 1, `${work.id}.images`);
    assert.deepEqual(
      work.images.map(({ id }) => id),
      manifestById.get(work.id).requiredViewIds,
      `${work.id}: view order`,
    );
    normalizeArtworkMedia(work).forEach((image, index) => {
      const view = work.images[index];
      const identity = mediaKey(work.id, view.id);
      canonicalKeys.push(identity);
      if (isRestrictedMediaKey(identity)) {
        assert.deepEqual(
          Object.keys(view),
          PLACEHOLDER_IMAGE_FIELDS,
          `${identity}: exact placeholder schema and order`,
        );
        assert.equal(view.imageUrl, null, `${identity}: public image must be absent`);
        assert.equal(view.mediaStatus, 'rightsRestricted', `${identity}: public status`);
        assert.equal(
          view.imageSourceName,
          placeholders[identity].imageSourceName,
          `${identity}.imageSourceName: placeholder authority mismatch`,
        );
        assert.equal(
          view.imageSourceUrl,
          placeholders[identity].imageSourceUrl,
          `${identity}.imageSourceUrl: placeholder authority mismatch`,
        );
        nullImageUrlCount += 1;
      } else {
        assert.deepEqual(
          Object.keys(view),
          PUBLIC_IMAGE_FIELDS,
          `${identity}: exact public image schema and order`,
        );
        assertHttpsUrl(view.imageUrl, `${identity}: public HTTPS image`);
        assert.ok(!Object.hasOwn(view, 'mediaStatus'), `${identity}: no placeholder status`);
        assert.ok(!imageUrls.has(view.imageUrl), `${identity}: duplicate imageUrl`);
        imageUrls.add(view.imageUrl);
      }
      for (const field of ['id', 'label', 'imageAlt', 'imageSourceName', 'imageSourceUrl']) {
        assertFinishedString(view[field], identity, field);
      }
      assertHttpsUrl(image.imageSourceUrl, `${identity}.imageSourceUrl`);
      assert.match(image.imageAlt, HAN_SCRIPT, `${identity}.imageAlt: Chinese visible-content description`);
      assert.doesNotMatch(image.imageAlt, /primary view|主视图|主要视图/i, `${identity}.imageAlt: generic alt`);
      assert.ok(!imageAlts.has(image.imageAlt), `${identity}: duplicate imageAlt`);
      imageAlts.add(image.imageAlt);
    });
  });
  assert.deepEqual(canonicalKeys, expectedMediaKeys(manifest), 'canonical media key order');
  assert.equal(canonicalKeys.length, 63, 'exact logical media view count');
  assert.equal(imageUrls.size, 55, 'exact distinct non-null media URL count');
  assert.equal(nullImageUrlCount, 8, 'exact null placeholder URL count');
  assert.equal(imageAlts.size, 63, 'exact distinct media alt count');
  assert.deepEqual(
    canonicalKeys.filter((identity) => isRestrictedMediaKey(identity)),
    RESTRICTED_MEDIA_KEYS,
    'canonical placeholder key set and order',
  );
}

test('U4 manifest freezes the official AP 99-152 identity and view contract', async () => {
  const manifest = await readJson(MANIFEST_URL);
  const expectedNumbers = Array.from({ length: 54 }, (_, index) => String(index + 99));

  assert.deepEqual(Object.keys(manifest), expectedNumbers, 'AP keys and order');
  assert.deepEqual(
    Object.values(manifest).map(({ titleEn }) => titleEn),
    EXPECTED_TITLES,
    'official titles and order',
  );
  assert.deepEqual(
    Object.fromEntries(expectedNumbers.map((apNumber) => [
      apNumber,
      Object.fromEntries(STABLE_FIELDS.map((field) => [field, manifest[apNumber][field]])),
    ])),
    EXPECTED_STABLE_PROJECTION,
    'stable per-work identity and classification projection',
  );
  assert.equal(
    Object.values(manifest).reduce((total, entry) => total + entry.requiredViewIds.length, 0),
    63,
    'total College Board required views',
  );

  const representedRegions = new Set();
  const representedTraditionGroups = new Set();

  for (const apNumber of expectedNumbers) {
    const entry = manifest[apNumber];
    assert.deepEqual(Object.keys(entry), ENTRY_FIELDS, `AP ${apNumber}: field schema and order`);
    assert.match(entry.id, new RegExp(`^ap${apNumber}-[a-z0-9-]+$`), `AP ${apNumber}: id`);
    assert.ok(REGIONS.has(entry.region), `AP ${apNumber}: region`);
    assert.equal(typeof entry.siteName, 'string', `AP ${apNumber}: siteName type`);
    assert.ok(entry.siteName.trim(), `AP ${apNumber}: siteName`);
    assert.ok(
      entry.provenanceQualifier === null
        || (typeof entry.provenanceQualifier === 'string' && entry.provenanceQualifier.trim()),
      `AP ${apNumber}: provenanceQualifier`,
    );
    assert.ok(TRADITION_GROUPS.has(entry.traditionGroup), `AP ${apNumber}: traditionGroup`);
    assert.ok(Array.isArray(entry.requiredViewIds), `AP ${apNumber}: requiredViewIds type`);
    assert.ok(entry.requiredViewIds.length >= 1, `AP ${apNumber}: requiredViewIds`);
    assert.deepEqual(
      entry.requiredViewIds,
      MULTI_VIEW_CONTRACT.get(apNumber) ?? ['primary'],
      `AP ${apNumber}: exact College Board required views`,
    );
    assert.equal(
      new Set(entry.requiredViewIds).size,
      entry.requiredViewIds.length,
      `AP ${apNumber}: duplicate required view ids`,
    );
    for (const viewId of entry.requiredViewIds) {
      assert.equal(typeof viewId, 'string', `AP ${apNumber}: view id type`);
      assert.match(viewId, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `AP ${apNumber}: view id format`);
    }

    representedRegions.add(entry.region);
    representedTraditionGroups.add(entry.traditionGroup);
  }

  assert.deepEqual(representedRegions, REGIONS, 'all nine U4 regions represented');
  assert.deepEqual(
    representedTraditionGroups,
    TRADITION_GROUPS,
    'all four U4 movement groups represented',
  );
  assert.equal(manifest['127'].region, 'transatlantic', 'AP 127: voyage region');
  assert.equal(
    manifest['127'].siteName,
    'North Atlantic Ocean, aboard SS Kaiser Wilhelm II',
    'AP 127: voyage site',
  );
  assert.equal(
    manifest['127'].provenanceQualifier,
    STEERAGE_QUALIFIER,
    'AP 127: voyage qualifier',
  );
});

test('U4 public placeholder authority freezes exact restricted keys and source evidence', async () => {
  assertPlaceholderAuthority(await readJson(PLACEHOLDERS_URL));
});

test('U4 placeholder authority validation rejects missing, extra, wrong, and mismatched entries', async () => {
  const placeholders = await readJson(PLACEHOLDERS_URL);
  const firstKey = RESTRICTED_MEDIA_KEYS[0];

  const missing = structuredClone(placeholders);
  delete missing[firstKey];
  assert.throws(() => assertPlaceholderAuthority(missing), /exact key set and order/);

  const extra = structuredClone(placeholders);
  extra['ap999-extra::primary'] = structuredClone(placeholders[firstKey]);
  assert.throws(() => assertPlaceholderAuthority(extra), /exact key set and order/);

  const wrongKey = structuredClone(placeholders);
  wrongKey['ap140-two-fridas::wrong-view'] = wrongKey[firstKey];
  delete wrongKey[firstKey];
  assert.throws(() => assertPlaceholderAuthority(wrongKey), /exact key set and order/);

  const mismatchedSource = structuredClone(placeholders);
  mismatchedSource[firstKey].imageSourceName = 'Altered source identity';
  assert.throws(() => assertPlaceholderAuthority(mismatchedSource), /frozen source identity/);

  const malformedSourceUrl = structuredClone(placeholders);
  malformedSourceUrl[firstKey].imageSourceUrl = 'https:// not-a-url';
  assert.throws(
    () => assertPlaceholderAuthority(malformedSourceUrl),
    /valid HTTPS URL/,
  );
});

test('U4 URL validation rejects malformed pseudo-HTTPS values', () => {
  assert.doesNotThrow(() => assertHttpsUrl('https://example.com/path', 'valid URL'));
  for (const value of ['https:// not-a-url', 'https://?']) {
    assert.throws(() => assertHttpsUrl(value, 'malformed URL'), /valid HTTPS URL/);
  }
});

test('U4 normal rights policy requires an approved exact license triple', () => {
  const approved = {
    licenseName: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    releaseClass: 'open',
  };
  assert.doesNotThrow(() => assertApprovedNormalLicensePolicy(approved, 'approved'));
  for (const truthfulU4Policy of [
    {
      licenseName: 'CC BY-NC-SA 2.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/2.0/',
      releaseClass: 'noncommercial',
    },
    {
      licenseName: 'Public domain (U.S. pre-1931 publication)',
      licenseUrl: 'https://commons.wikimedia.org/wiki/Template:PD-US-expired',
      releaseClass: 'open',
    },
    {
      licenseName: 'Library of Congress HABS/HAER rights advisory; no known restrictions',
      licenseUrl: 'https://www.loc.gov/pictures/collection/hh/rights.html',
      releaseClass: 'open',
    },
    {
      licenseName: 'MoMA fair-use terms—noncommercial educational use',
      licenseUrl: 'https://www.moma.org/about/about-this-site/',
      releaseClass: 'institutionalEducational',
    },
    {
      licenseName: 'PMA educational/fair-use terms',
      licenseUrl: 'https://www.philamuseum.org/legal',
      releaseClass: 'institutionalEducational',
    },
    {
      licenseName: 'No known restrictions on publication',
      licenseUrl: 'https://hdl.loc.gov/loc.pnp/res.598.kora',
      releaseClass: 'open',
    },
    {
      licenseName: 'University at Buffalo educational-use terms',
      licenseUrl: 'https://digital.lib.buffalo.edu/items/show/31590',
      releaseClass: 'institutionalEducational',
    },
  ]) {
    assert.doesNotThrow(
      () => assertApprovedNormalLicensePolicy(truthfulU4Policy, truthfulU4Policy.licenseName),
    );
  }
  assert.throws(
    () => assertApprovedNormalLicensePolicy(
      { ...approved, releaseClass: 'noncommercial' },
      'class drift',
    ),
    /approved license policy/,
  );
  assert.throws(
    () => assertApprovedNormalLicensePolicy({
      licenseName: 'Unreviewed license policy',
      licenseUrl: 'https://example.com/unreviewed-license',
      releaseClass: 'open',
    }, 'unknown policy'),
    /approved license policy/,
  );
});

test('U4 ledger parser accepts only HTTPS image links or the exact restricted placeholder literal', () => {
  const row = '| 99 | `ap99-portrait-sor-juana` | primary | Overall | [direct image](https://example.com/image.jpg) | [Object page](https://example.com/source) | Example institution | [Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) |';
  const restrictedRow = `| 140 | \`ap140-two-fridas\` | primary | Overall | ${PUBLIC_PLACEHOLDER_LITERAL} | [Object page](https://example.com/source) | Example institution | [Rights statement](https://example.com/rights) |`;
  const table = [
    `| ${LEDGER_HEADER.join(' | ')} |`,
    LEDGER_DIVIDER,
  ];
  const unrelatedNumericTable = '| 2026 | unrelated document table |';
  const boundedDocument = [
    unrelatedNumericTable,
    '',
    ...table,
    row,
    restrictedRow,
    '',
    '| Other | Table |',
    '| ---: | --- |',
    unrelatedNumericTable,
  ].join('\n');
  assert.equal(parseU4Ledger(boundedDocument).length, 2, 'only consecutive U4 ledger rows');
  assert.throws(
    () => parseU4Ledger([...table, row.replace(' | Example institution', '')].join('\n')),
    /expected 8 cells/,
  );
  assert.throws(
    () => parseU4Ledger([...table, row.replace(' | Example institution', ' | extra | Example institution')].join('\n')),
    /expected 8 cells/,
  );
  assert.throws(() => parseU4Ledger([...table, row, row].join('\n')), /duplicate ledger identity/);
  assert.throws(
    () => parseU4Ledger([...table, row.replace('https://example.com/image.jpg', 'http://example.com/image.jpg')].join('\n')),
    /HTTPS Markdown link/,
  );
  assert.throws(
    () => parseU4Ledger([...table, row.replace('https://example.com/image.jpg', 'https:// not-a-url')].join('\n')),
    /valid HTTPS URL/,
  );
  assert.throws(
    () => parseU4Ledger([...table, row.replace('[Object page](https://example.com/source)', '[Object page](https://?)')].join('\n')),
    /valid HTTPS URL/,
  );
  assert.throws(
    () => parseU4Ledger([...table, row.replace('[Object page](https://example.com/source)', 'https://example.com/source')].join('\n')),
    /HTTPS Markdown link/,
  );
  assert.throws(
    () => parseU4Ledger([...table, row.replace('[direct image](https://example.com/image.jpg)', PUBLIC_PLACEHOLDER_LITERAL)].join('\n')),
    /normal ledger image cell/,
  );
  assert.throws(
    () => parseU4Ledger([...table, restrictedRow.replace(PUBLIC_PLACEHOLDER_LITERAL, '[restricted image](https://invalid.test/restricted-image.jpg)')].join('\n')),
    /placeholder ledger cell/,
  );
});

test('U4 canonical fixture matches all 54 manifest works and complete bilingual study contracts', async () => {
  const [fixture, manifest, html] = await Promise.all([
    readJson(FIXTURE_URL),
    readJson(MANIFEST_URL),
    readFile(HTML_URL, 'utf8'),
  ]);
  const liveIds = parseJsonBlock(html, 'artwork-data').map(({ id }) => id);
  const resolvableIds = new Set([
    ...liveIds,
    ...Object.values(manifest).map(({ id }) => id),
  ]);
  assertCanonicalStudyContract(fixture, manifest, resolvableIds);
});

test('live map projects the exact canonical Unit 4 artworks and credits', async () => {
  const [fixture, html] = await Promise.all([
    readJson(FIXTURE_URL),
    readFile(HTML_URL, 'utf8'),
  ]);
  const liveArtworks = parseJsonBlock(html, 'artwork-data').filter(({ unit }) => unit === 4);
  const liveCredits = parseJsonBlock(html, 'image-credit-data');
  const liveU4Credits = Object.fromEntries(
    fixture.artworks.map(({ id }) => [id, liveCredits[id]]),
  );

  assert.deepEqual(liveArtworks, fixture.artworks);
  assert.deepEqual(liveU4Credits, fixture.credits);
});

test('U4 canonical study validation rejects incomplete fields and unresolved comparison definitions', async () => {
  const [fixture, manifest, html] = await Promise.all([
    readJson(FIXTURE_URL),
    readJson(MANIFEST_URL),
    readFile(HTML_URL, 'utf8'),
  ]);
  const resolvableIds = new Set([
    ...parseJsonBlock(html, 'artwork-data').map(({ id }) => id),
    ...Object.values(manifest).map(({ id }) => id),
  ]);
  const blankField = structuredClone(fixture);
  blankField.artworks[0].function = '';
  assert.throws(() => assertCanonicalStudyContract(blankField, manifest, resolvableIds), /expected finished string/);

  const unresolved = structuredClone(fixture);
  unresolved.artworks[0].comparisonIds = ['ap999-missing'];
  unresolved.artworks[0].comparisonNotes = { 'ap999-missing': '形式比较：构图不同。' };
  assert.throws(() => assertCanonicalStudyContract(unresolved, manifest, resolvableIds), /unresolved/);

  const emptyNote = structuredClone(fixture);
  const target = emptyNote.artworks[0].comparisonIds[0];
  emptyNote.artworks[0].comparisonNotes[target] = '';
  assert.throws(() => assertCanonicalStudyContract(emptyNote, manifest, resolvableIds), /expected finished string/);

  const noBasis = structuredClone(fixture);
  const noBasisTarget = noBasis.artworks[0].comparisonIds[0];
  noBasis.artworks[0].comparisonNotes[noBasisTarget] = '两件作品可以放在一起讨论。';
  assert.throws(() => assertCanonicalStudyContract(noBasis, manifest, resolvableIds), /explicit basis/);
});

test('U4 canonical media has the exact 63 ordered manifest views and unique visible-content descriptions', async () => {
  const [fixture, manifest, placeholders] = await Promise.all([
    readJson(FIXTURE_URL),
    readJson(MANIFEST_URL),
    readJson(PLACEHOLDERS_URL),
  ]);
  assertCanonicalMediaContract(fixture, manifest, placeholders);
  assert.equal(projectCanonicalMedia(fixture).length, 63);
});

test('U4 canonical media validation rejects placeholder leaks/status/source drift and normal media drift', async () => {
  const [fixture, manifest, placeholders] = await Promise.all([
    readJson(FIXTURE_URL),
    readJson(MANIFEST_URL),
    readJson(PLACEHOLDERS_URL),
  ]);
  const multiViewIndex = fixture.artworks.findIndex(({ images }) => images.length > 1);
  const reordered = structuredClone(fixture);
  reordered.artworks[multiViewIndex].images.reverse();
  assert.throws(() => assertCanonicalMediaContract(reordered, manifest, placeholders), /view order/);

  const http = structuredClone(fixture);
  http.artworks[0].images[0].imageUrl = 'http://example.com/image.jpg';
  assert.throws(() => assertCanonicalMediaContract(http, manifest, placeholders), /public HTTPS image/);

  const malformedImageUrl = structuredClone(fixture);
  malformedImageUrl.artworks[0].images[0].imageUrl = 'https:// not-a-url';
  assert.throws(
    () => assertCanonicalMediaContract(malformedImageUrl, manifest, placeholders),
    /valid HTTPS URL/,
  );

  const malformedSourceUrl = structuredClone(fixture);
  malformedSourceUrl.artworks[0].images[0].imageSourceUrl = 'https://?';
  assert.throws(
    () => assertCanonicalMediaContract(malformedSourceUrl, manifest, placeholders),
    /valid HTTPS URL/,
  );

  const duplicateUrl = structuredClone(fixture);
  duplicateUrl.artworks[1].images[0].imageUrl = duplicateUrl.artworks[0].images[0].imageUrl;
  assert.throws(() => assertCanonicalMediaContract(duplicateUrl, manifest, placeholders), /duplicate imageUrl/);

  const duplicateAlt = structuredClone(fixture);
  duplicateAlt.artworks[1].images[0].imageAlt = duplicateAlt.artworks[0].images[0].imageAlt;
  assert.throws(() => assertCanonicalMediaContract(duplicateAlt, manifest, placeholders), /duplicate imageAlt/);

  const restrictedWorkId = RESTRICTED_MEDIA_KEYS[0].split('::')[0];
  const restrictedWorkIndex = fixture.artworks.findIndex(({ id }) => id === restrictedWorkId);

  const leaked = structuredClone(fixture);
  leaked.artworks[restrictedWorkIndex].images[0].imageUrl = 'https://invalid.test/restricted-image.jpg';
  assert.throws(
    () => assertCanonicalMediaContract(leaked, manifest, placeholders),
    /public image must be absent/,
  );

  const missingStatus = structuredClone(fixture);
  delete missingStatus.artworks[restrictedWorkIndex].images[0].mediaStatus;
  assert.throws(
    () => assertCanonicalMediaContract(missingStatus, manifest, placeholders),
    /placeholder schema/,
  );

  const wrongStatus = structuredClone(fixture);
  wrongStatus.artworks[restrictedWorkIndex].images[0].mediaStatus = 'unknown';
  assert.throws(
    () => assertCanonicalMediaContract(wrongStatus, manifest, placeholders),
    /public status/,
  );

  const mismatchedSource = structuredClone(fixture);
  mismatchedSource.artworks[restrictedWorkIndex].images[0].imageSourceName = 'Altered source identity';
  assert.throws(
    () => assertCanonicalMediaContract(mismatchedSource, manifest, placeholders),
    /placeholder authority mismatch/,
  );
});

test('U4 ledger is the exact canonical 63-view media projection in AP and manifest-view order', async () => {
  const ledger = await readFile(LEDGER_URL, 'utf8');
  const [fixture, manifest] = await Promise.all([
    readJson(FIXTURE_URL),
    readJson(MANIFEST_URL),
  ]);
  const expectedKeys = expectedMediaKeys(manifest);
  const ledgerProjection = projectLedgerMedia(ledger);
  assert.equal(ledgerProjection.length, 63);
  assert.deepEqual(
    ledgerProjection.map(({ artworkId, viewId }) => mediaKey(artworkId, viewId)),
    expectedKeys,
    'ledger exact key order',
  );
  assert.deepEqual(ledgerProjection, projectCanonicalMedia(fixture));
});

test('U4 rights audit exactly matches canonical credits and ledger attribution for all 63 views', async () => {
  const rights = await readJson(RIGHTS_URL);
  const [fixture, manifest, ledger, placeholders] = await Promise.all([
    readJson(FIXTURE_URL),
    readJson(MANIFEST_URL),
    readFile(LEDGER_URL, 'utf8'),
    readJson(PLACEHOLDERS_URL),
  ]);
  const expectedKeys = expectedMediaKeys(manifest);
  assert.equal(expectedKeys.length, 63);
  assertCanonicalRightsMatch(fixture, rights, expectedKeys, placeholders);
  assertLedgerRightsMatch(ledger, rights);
});

test('U4 rights validation rejects key, credit, URL, release-class, and placeholder mismatches', async () => {
  const rights = await readJson(RIGHTS_URL);
  const [fixture, manifest, placeholders] = await Promise.all([
    readJson(FIXTURE_URL),
    readJson(MANIFEST_URL),
    readJson(PLACEHOLDERS_URL),
  ]);
  const expectedKeys = expectedMediaKeys(manifest);
  const firstKey = expectedKeys[0];
  const missing = structuredClone(rights);
  delete missing[firstKey];
  assert.throws(
    () => assertCanonicalRightsMatch(fixture, missing, expectedKeys, placeholders),
    /rights key set and order/,
  );

  const extra = structuredClone(rights);
  extra['ap999-extra::primary'] = structuredClone(rights[firstKey]);
  assert.throws(
    () => assertCanonicalRightsMatch(fixture, extra, expectedKeys, placeholders),
    /rights key set and order/,
  );

  const mismatch = structuredClone(rights);
  mismatch[firstKey].creatorOrInstitution = 'Altered attribution';
  assert.throws(
    () => assertCanonicalRightsMatch(fixture, mismatch, expectedKeys, placeholders),
    /rights mismatch/,
  );

  const http = structuredClone(rights);
  http[firstKey].licenseUrl = 'http://example.com/license';
  const httpFixture = structuredClone(fixture);
  httpFixture.credits[httpFixture.artworks[0].id].licenseUrl = 'http://example.com/license';
  assert.throws(
    () => assertCanonicalRightsMatch(httpFixture, http, expectedKeys, placeholders),
    /licenseUrl/,
  );

  const unknown = structuredClone(rights);
  unknown[firstKey].releaseClass = 'unknown';
  assert.throws(
    () => assertCanonicalRightsMatch(fixture, unknown, expectedKeys, placeholders),
    /release class/,
  );

  const falseRestricted = structuredClone(rights);
  falseRestricted[firstKey].releaseClass = 'restricted';
  assert.throws(
    () => assertCanonicalRightsMatch(fixture, falseRestricted, expectedKeys, placeholders),
    /restricted class must match/,
  );

  const allowedClassDrift = structuredClone(rights);
  allowedClassDrift[firstKey].releaseClass = [
    'open',
    'noncommercial',
    'institutionalEducational',
  ].find((releaseClass) => releaseClass !== rights[firstKey].releaseClass);
  assert.throws(
    () => assertCanonicalRightsMatch(fixture, allowedClassDrift, expectedKeys, placeholders),
    /approved license policy/,
  );

  const unknownPolicy = structuredClone(rights);
  const unknownPolicyFixture = structuredClone(fixture);
  unknownPolicy[firstKey].licenseName = 'Unreviewed license policy';
  unknownPolicy[firstKey].licenseUrl = 'https://example.com/unreviewed-license';
  unknownPolicyFixture.credits[unknownPolicyFixture.artworks[0].id].licenseName = 'Unreviewed license policy';
  unknownPolicyFixture.credits[unknownPolicyFixture.artworks[0].id].licenseUrl = 'https://example.com/unreviewed-license';
  assert.throws(
    () => assertCanonicalRightsMatch(
      unknownPolicyFixture,
      unknownPolicy,
      expectedKeys,
      placeholders,
    ),
    /approved license policy/,
  );

  const nonRestrictedPlaceholder = structuredClone(rights);
  nonRestrictedPlaceholder[RESTRICTED_MEDIA_KEYS[0]].releaseClass = 'institutionalEducational';
  assert.throws(
    () => assertCanonicalRightsMatch(fixture, nonRestrictedPlaceholder, expectedKeys, placeholders),
    /restricted class must match/,
  );

  const wrongStatusFixture = structuredClone(fixture);
  const restrictedWorkId = RESTRICTED_MEDIA_KEYS[0].split('::')[0];
  wrongStatusFixture.artworks.find(({ id }) => id === restrictedWorkId).images[0].mediaStatus = 'unknown';
  assert.throws(
    () => assertCanonicalRightsMatch(
      wrongStatusFixture,
      rights,
      expectedKeys,
      placeholders,
    ),
    /restricted media status/,
  );

  const malformedLicenseUrl = structuredClone(rights);
  const malformedLicenseFixture = structuredClone(fixture);
  malformedLicenseUrl[firstKey].licenseUrl = 'https:// not-a-url';
  malformedLicenseFixture.credits[malformedLicenseFixture.artworks[0].id].licenseUrl = 'https:// not-a-url';
  assert.throws(
    () => assertCanonicalRightsMatch(
      malformedLicenseFixture,
      malformedLicenseUrl,
      expectedKeys,
      placeholders,
    ),
    /valid HTTPS URL/,
  );
});
