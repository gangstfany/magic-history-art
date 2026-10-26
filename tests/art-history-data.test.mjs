import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  loadAndValidate,
  normalizeArtworkMedia,
  validateArtworks,
  validateImageCredits,
} from '../scripts/validate-art-history-data.mjs';

const execFileAsync = promisify(execFile);
const VALIDATOR_PATH = fileURLToPath(new URL('../scripts/validate-art-history-data.mjs', import.meta.url));
const HTML_PATH = new URL('../art-history-map.html', import.meta.url);

test('strict U5 loader accepts local media and rejects remote media and disallowed licenses', async () => {
  const { artworks, manifests, credits, rights, placeholders } = await loadCompleteUnits12345Fixture();
  const authority = {
    4: JSON.parse(await readFile(U4_PLACEHOLDERS_PATH, 'utf8')),
    5: JSON.parse(await readFile(U5_PLACEHOLDERS_PATH, 'utf8')),
  };
  assert.doesNotThrow(() => validateArtworks(artworks, manifests, authority));
  const remote = structuredClone(artworks);
  remote.find(work => work.unit === 5).images[0].imageUrl = 'https://example.org/remote.jpg';
  assert.throws(() => validateArtworks(remote, manifests, authority), /local/);
  const badRights = structuredClone(rights);
  Object.values(badRights[5])[0].licenseClass = 'cc-by-nc';
  assert.throws(() => validateImageCredits(credits, artworks, badRights, placeholders), /disallowed open license/);
  const inheritedNc = await loadCompleteUnits12345Fixture();
  const firstKey = Object.keys(inheritedNc.rights[5])[0];
  mutateUnit5CreditAndRights(inheritedNc, firstKey, {
    licenseName: 'CC BY-NC-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  });
  assert.throws(() => validateImageCredits(
    inheritedNc.credits, inheritedNc.artworks, inheritedNc.rights, inheritedNc.placeholders,
  ), /disallowed open license|license class/);
});
const U1_CANONICAL_PATH = new URL('./fixtures/u1-canonical.json', import.meta.url);
const U3_CANONICAL_PATH = new URL('./fixtures/u3-canonical.json', import.meta.url);
const U4_CANONICAL_PATH = new URL('./fixtures/u4-canonical.json', import.meta.url);
const U5_CANONICAL_PATH = new URL('./fixtures/u5-canonical.json', import.meta.url);
const U3_MANIFEST_PATH = new URL(
  '../data/ap-art-history-unit-3-manifest.json',
  import.meta.url,
);
const U3_RIGHTS_PATH = new URL(
  '../data/ap-art-history-unit-3-rights.json',
  import.meta.url,
);
const U4_RIGHTS_PATH = new URL(
  '../data/ap-art-history-unit-4-rights.json',
  import.meta.url,
);
const U4_PLACEHOLDERS_PATH = new URL(
  '../data/ap-art-history-unit-4-public-placeholders.json',
  import.meta.url,
);
const U5_RIGHTS_PATH = new URL(
  '../data/ap-art-history-unit-5-rights.json',
  import.meta.url,
);
const U5_PLACEHOLDERS_PATH = new URL(
  '../data/ap-art-history-unit-5-placeholder-authority.json',
  import.meta.url,
);
const MANIFEST_PATHS = {
  1: new URL('../data/ap-art-history-unit-1-manifest.json', import.meta.url),
  2: new URL('../data/ap-art-history-unit-2-manifest.json', import.meta.url),
  3: U3_MANIFEST_PATH,
  4: new URL('../data/ap-art-history-unit-4-manifest.json', import.meta.url),
  5: new URL('../data/ap-art-history-unit-5-manifest.json', import.meta.url),
};
const EXPECTED_COMPLETE_AP_NUMBERS = Array.from({ length: 98 }, (_, index) => index + 1);
const EXPECTED_LIVE_AP_NUMBERS = Array.from({ length: 250 }, (_, index) => index + 1);
const EXPECTED_RELEASE_AP_NUMBERS = Array.from({ length: 166 }, (_, index) => index + 1);
const EXPECTED_U2_AP_NUMBERS = Array.from({ length: 36 }, (_, index) => index + 12);
const EXPECTED_U1_MANIFEST = [
  '1|ap1-apollo-11-stones|Apollo 11 stones',
  '2|ap2-great-hall-bulls|Great Hall of the Bulls',
  '3|ap3-camelid-sacrum-canine|Camelid sacrum in the shape of a canine',
  '4|ap4-running-horned-woman|Running horned woman',
  '5|ap5-beaker-ibex-motifs|Beaker with ibex motifs',
  '6|ap6-anthropomorphic-stele|Anthropomorphic stele',
  '7|ap7-jade-cong|Jade cong',
  '8|ap8-stonehenge|Stonehenge',
  '9|ap9-ambum-stone|The Ambum stone',
  '10|ap10-tlatilco-female-figurine|Tlatilco female figurine',
  '11|ap11-terra-cotta-fragment|Terra cotta fragment',
];
const EXPECTED_OFFICIAL_MANIFEST = [
  '12|ap12-white-temple-ziggurat|White Temple and its ziggurat',
  '13|ap13-palette-of-king-narmer|Palette of King Narmer',
  '14|ap14-statues-votive-figures|Statues of votive figures, from the Square Temple at Eshnunna (modern Tell Asmar, Iraq)',
  '15|ap15-seated-scribe|Seated scribe',
  '16|ap16-standard-of-ur|Standard of Ur from the Royal Tombs at Ur (modern Tell el-Muqayyar, Iraq)',
  '17|ap17-great-pyramids-giza|Great Pyramids (Menkaura, Khafre, Khufu) and Great Sphinx',
  '18|ap18-king-menkaura-and-queen|King Menkaura and queen',
  '19|ap19-code-of-hammurabi|The Code of Hammurabi',
  '20|ap20-temple-of-amun-re-karnak|Temple of Amun-Re and Hypostyle Hall',
  '21|ap21-mortuary-temple-hatshepsut|Mortuary temple of Hatshepsut',
  '22|ap22-akhenaten-nefertiti-daughters|Akhenaten, Nefertiti, and three daughters',
  '23|ap23-tutankhamun-innermost-coffin|Tutankhamun’s tomb, innermost coffin',
  '24|ap24-last-judgment-of-hunefer|Last judgment of Hunefer, from his tomb (page from the Book of the Dead)',
  '25|ap25-lamassu-sargon-ii|Lamassu from the citadel of Sargon II, Dur Sharrukin (modern Khorsabad, Iraq)',
  '26|ap26-athenian-agora|Athenian agora',
  '27|ap27-anavysos-kouros|Anavysos Kouros',
  '28|ap28-peplos-kore|Peplos Kore from the Acropolis',
  '29|ap29-sarcophagus-of-the-spouses|Sarcophagus of the Spouses',
  '30|ap30-apadana-darius-xerxes|Audience Hall (apadana) of Darius and Xerxes',
  '31|ap31-temple-minerva-apollo|Temple of Minerva (Veii, near Rome, Italy) and sculpture of Apollo',
  '32|ap32-tomb-of-the-triclinium|Tomb of the Triclinium',
  '33|ap33-niobides-krater|Niobides Krater',
  '34|ap34-doryphoros|Doryphoros (Spear Bearer)',
  '35|ap35-athenian-acropolis|Acropolis',
  '36|ap36-grave-stele-hegeso|Grave stele of Hegeso',
  '37|ap37-winged-victory-samothrace|Winged Victory of Samothrace',
  '38|ap38-great-altar-pergamon|Great Altar of Zeus and Athena at Pergamon',
  '39|ap39-house-of-the-vettii|House of the Vettii',
  '40|ap40-alexander-mosaic|Alexander Mosaic from the House of Faun, Pompeii',
  '41|ap41-seated-boxer|Seated boxer',
  '42|ap42-head-of-a-roman-patrician|Head of a Roman patrician',
  '43|ap43-augustus-prima-porta|Augustus of Prima Porta',
  '44|ap44-colosseum|Colosseum (Flavian Amphitheater)',
  '45|ap45-forum-of-trajan|Forum of Trajan',
  '46|ap46-pantheon|Pantheon',
  '47|ap47-ludovisi-battle-sarcophagus|Ludovisi Battle Sarcophagus',
];
const EXPECTED_U3_MANIFEST = [
  '48|ap48-catacomb-priscilla|Catacomb of Priscilla|italyVatican|3',
  '49|ap49-santa-sabina|Santa Sabina|italyVatican|3',
  '50|ap50-vienna-genesis|Rebecca and Eliezer at the Well and Jacob Wrestling the Angel, from the Vienna Genesis|easternMediterranean|2',
  '51|ap51-san-vitale|San Vitale|italyVatican|5',
  '52|ap52-hagia-sophia|Hagia Sophia|easternMediterranean|3',
  '53|ap53-merovingian-fibulae|Merovingian looped fibulae|france|1',
  '54|ap54-virgin-theotokos-saints|Virgin (Theotokos) and Child between Saints Theodore and George|easternMediterranean|1',
  '55|ap55-lindisfarne-gospels|Lindisfarne Gospels: St. Matthew, cross-carpet page; St. Luke portrait page; St. Luke incipit page|britishIsles|3',
  '56|ap56-great-mosque-cordoba|Great Mosque|iberianPeninsula|5',
  '57|ap57-pyxis-al-mughira|Pyxis of al-Mughira|iberianPeninsula|1',
  '58|ap58-church-sainte-foy|Church of Sainte-Foy|france|4',
  '59|ap59-bayeux-tapestry|Bayeux Tapestry|britishIsles|2',
  '60|ap60-chartres-cathedral|Chartres Cathedral|france|6',
  '61|ap61-bibles-moralisees|Dedication Page with Blanche of Castile and King Louis IX of France, Scenes from the Apocalypse from Bibles moralisées|france|2',
  '62|ap62-rottgen-pieta|Röttgen Pietà|centralEurope|1',
  '63|ap63-arena-scrovegni-chapel|Arena (Scrovegni) Chapel, including Lamentation|italyVatican|3',
  '64|ap64-golden-haggadah|Golden Haggadah (The Plagues of Egypt, Scenes of Liberation, and Preparation for Passover)|iberianPeninsula|3',
  '65|ap65-alhambra|Alhambra|iberianPeninsula|4',
  '66|ap66-merode-altarpiece|Annunciation Triptych (Merode Altarpiece)|lowCountries|1',
  '67|ap67-pazzi-chapel|Pazzi Chapel|italyVatican|2',
  '68|ap68-arnolfini-portrait|The Arnolfini Portrait|lowCountries|1',
  '69|ap69-donatello-david|David|italyVatican|1',
  '70|ap70-palazzo-rucellai|Palazzo Rucellai|italyVatican|1',
  '71|ap71-madonna-child-two-angels|Madonna and Child with Two Angels|italyVatican|1',
  '72|ap72-birth-venus|Birth of Venus|italyVatican|1',
  '73|ap73-last-supper|Last Supper|italyVatican|1',
  '74|ap74-adam-eve-durer|Adam and Eve|centralEurope|1',
  '75|ap75-sistine-chapel-frescoes|Sistine Chapel ceiling and altar wall frescoes|italyVatican|4',
  '76|ap76-school-athens|School of Athens|italyVatican|1',
  '77|ap77-isenheim-altarpiece|Isenheim altarpiece|centralEurope|2',
  '78|ap78-entombment-christ-pontormo|Entombment of Christ|italyVatican|1',
  '79|ap79-allegory-law-grace|Allegory of Law and Grace|centralEurope|1',
  '80|ap80-venus-urbino|Venus of Urbino|italyVatican|1',
  '81|ap81-codex-mendoza-frontispiece|Frontispiece of the Codex Mendoza|colonialAmericas|1',
  '82|ap82-il-gesu|Il Gesù, including Triumph of the Name of Jesus ceiling fresco|italyVatican|3',
  '83|ap83-hunters-snow|Hunters in the Snow|lowCountries|1',
  '84|ap84-mosque-selim-ii|Mosque of Selim II|easternMediterranean|3',
  '85|ap85-calling-saint-matthew|Calling of Saint Matthew|italyVatican|1',
  '86|ap86-henri-iv-marie-medici|Henri IV Receives the Portrait of Marie de’ Medici, from the Marie de’ Medici Cycle|lowCountries|1',
  '87|ap87-self-portrait-saskia|Self-Portrait with Saskia|lowCountries|1',
  '88|ap88-san-carlo-quattro-fontane|San Carlo alle Quattro Fontane|italyVatican|3',
  '89|ap89-ecstasy-saint-teresa|Ecstasy of Saint Teresa|italyVatican|3',
  '90|ap90-angel-arquebus|Angel with Arquebus, Asiel Timor Dei|colonialAmericas|1',
  '91|ap91-las-meninas|Las Meninas|iberianPeninsula|1',
  '92|ap92-woman-holding-balance|Woman Holding a Balance|lowCountries|1',
  '93|ap93-palace-versailles|The Palace at Versailles|france|5',
  '94|ap94-screen-siege-belgrade|Screen with the Siege of Belgrade and hunting scene|colonialAmericas|2',
  '95|ap95-virgin-guadalupe|The Virgin of Guadalupe (Virgen de Guadalupe)|colonialAmericas|1',
  '96|ap96-fruit-insects|Fruit and Insects|lowCountries|1',
  '97|ap97-spaniard-indian-mestizo|Spaniard and Indian Produce a Mestizo|colonialAmericas|1',
  '98|ap98-tete-a-tete|The Tête à Tête, from Marriage à la Mode|britishIsles|1',
];
const EXPECTED_U3_REQUIRED_VIEW_IDS = {
  48: ['greek-chapel', 'orant-fresco', 'good-shepherd-fresco'],
  49: ['exterior', 'interior', 'plan'],
  50: ['rebecca-eliezer', 'jacob-wrestling-angel'],
  51: ['exterior', 'interior', 'justinian-panel', 'theodora-panel', 'plan'],
  52: ['exterior', 'interior', 'plan'],
  55: ['st-matthew-cross-carpet', 'st-luke-portrait', 'st-luke-incipit'],
  56: ['exterior', 'hypostyle-hall', 'mihrab-detail', 'double-tier-arches', 'plan'],
  58: ['exterior', 'last-judgment-tympanum', 'interior', 'reliquary'],
  59: ['narrative-overview', 'narrative-detail'],
  60: ['west-facade', 'nave', 'plan', 'royal-portal', 'rose-window', 'stained-glass'],
  61: ['dedication-page', 'apocalypse-scenes'],
  63: ['chapel-interior', 'lamentation', 'chapel-exterior'],
  64: ['plagues-egypt', 'scenes-liberation', 'preparation-passover'],
  65: ['exterior', 'court-lions', 'hall-sisters', 'plan'],
  67: ['exterior', 'interior'],
  75: ['ceiling-overview', 'delphic-sibyl', 'the-flood', 'last-judgment'],
  77: ['closed-state', 'open-state'],
  82: ['facade', 'nave', 'triumph-name-jesus'],
  84: ['exterior', 'interior', 'plan'],
  88: ['facade', 'interior', 'plan'],
  89: ['church-interior', 'cornaro-chapel', 'ecstasy-saint-teresa'],
  93: ['aerial-overview', 'facade', 'courtyard', 'hall-mirrors', 'gardens'],
  94: ['siege-belgrade-front', 'hunting-scene-reverse'],
};
const EXPECTED_U3_SITES = [
  '48|Rome, Italy',
  '49|Rome, Italy',
  '50|Syria or Palestine',
  '51|Ravenna, Italy',
  '52|Constantinople (Istanbul), Turkey',
  '53|Early medieval Europe',
  '54|Mount Sinai, Egypt',
  '55|Northumbria, England',
  '56|Córdoba, Spain',
  '57|Madinat al-Zahra, Spain',
  '58|Conques, France',
  '59|England or Normandy',
  '60|Chartres, France',
  '61|Paris, France',
  '62|Rhineland, Germany',
  '63|Padua, Italy',
  '64|Barcelona, Spain',
  '65|Granada, Spain',
  '66|Tournai, present-day Belgium',
  '67|Florence, Italy',
  '68|Flanders, present-day Belgium',
  '69|Florence, Italy',
  '70|Florence, Italy',
  '71|Florence, Italy',
  '72|Florence, Italy',
  '73|Milan, Italy',
  '74|Nuremberg, Germany',
  '75|Vatican City',
  '76|Vatican City',
  '77|Isenheim, Alsace',
  '78|Florence, Italy',
  '79|Wittenberg, Germany',
  '80|Venice, Italy',
  '81|Tenochtitlan (Mexico City), New Spain',
  '82|Rome, Italy',
  '83|Antwerp, present-day Belgium',
  '84|Edirne, Turkey',
  '85|Rome, Italy',
  '86|Antwerp, Southern Netherlands',
  '87|Amsterdam, Netherlands',
  '88|Rome, Italy',
  '89|Rome, Italy',
  '90|Calamarca, present-day Bolivia',
  '91|Madrid, Spain',
  '92|Delft, Netherlands',
  '93|Versailles, France',
  '94|Mexico City, New Spain',
  '95|Mexico City, New Spain',
  '96|Amsterdam, Netherlands',
  '97|Mexico City, New Spain',
  '98|London, England',
];
const EXPECTED_U3_ENTRY_KEYS = [
  'id',
  'region',
  'requiredViewIds',
  'siteName',
  'titleEn',
];
const EXPECTED_NEW_WORKS = [
  {
    apNumber: 12,
    id: 'ap12-white-temple-ziggurat',
    title: 'White Temple and its ziggurat',
    site: 'Uruk, Iraq',
    culture: 'ancientNearEast',
    region: 'middleEast',
  },
  {
    apNumber: 14,
    id: 'ap14-statues-votive-figures',
    title: 'Statues of votive figures, from the Square Temple at Eshnunna (modern Tell Asmar, Iraq)',
    site: 'Eshnunna (Tell Asmar), Iraq',
    culture: 'ancientNearEast',
    region: 'middleEast',
  },
  {
    apNumber: 16,
    id: 'ap16-standard-of-ur',
    title: 'Standard of Ur from the Royal Tombs at Ur (modern Tell el-Muqayyar, Iraq)',
    site: 'Ur, Iraq',
    culture: 'ancientNearEast',
    region: 'middleEast',
  },
  {
    apNumber: 19,
    id: 'ap19-code-of-hammurabi',
    title: 'The Code of Hammurabi',
    site: 'Susa, Iran',
    culture: 'ancientNearEast',
    region: 'middleEast',
  },
  {
    apNumber: 25,
    id: 'ap25-lamassu-sargon-ii',
    title: 'Lamassu from the citadel of Sargon II, Dur Sharrukin (modern Khorsabad, Iraq)',
    site: 'Dur Sharrukin (Khorsabad), Iraq',
    culture: 'ancientNearEast',
    region: 'middleEast',
  },
  {
    apNumber: 29,
    id: 'ap29-sarcophagus-of-the-spouses',
    title: 'Sarcophagus of the Spouses',
    site: 'Cerveteri, Italy',
    culture: 'etruscan',
    region: 'southernEurope',
  },
  {
    apNumber: 30,
    id: 'ap30-apadana-darius-xerxes',
    title: 'Audience Hall (apadana) of Darius and Xerxes',
    site: 'Persepolis, Iran',
    culture: 'ancientNearEast',
    region: 'middleEast',
  },
  {
    apNumber: 31,
    id: 'ap31-temple-minerva-apollo',
    title: 'Temple of Minerva (Veii, near Rome, Italy) and sculpture of Apollo',
    site: 'Veii, Italy',
    culture: 'etruscan',
    region: 'southernEurope',
  },
  {
    apNumber: 32,
    id: 'ap32-tomb-of-the-triclinium',
    title: 'Tomb of the Triclinium',
    site: 'Tarquinia, Italy',
    culture: 'etruscan',
    region: 'southernEurope',
  },
];

async function loadManifest() {
  return JSON.parse(await readFile(MANIFEST_PATHS[2], 'utf8'));
}

async function loadManifests() {
  const [unit1, unit2, unit3] = await Promise.all(
    [1, 2, 3].map(async (unit) => JSON.parse(await readFile(MANIFEST_PATHS[unit], 'utf8'))),
  );
  return { 1: unit1, 2: unit2, 3: unit3 };
}

async function loadUnits12Manifests() {
  const manifests = await loadManifests();
  return { 1: manifests[1], 2: manifests[2] };
}

test('checked-in U1 manifest matches the official AP 1-11 sequence', async () => {
  const manifest = JSON.parse(await readFile(MANIFEST_PATHS[1], 'utf8'));
  assert.deepEqual(
    Object.entries(manifest).map(
      ([apNumber, { id, titleEn }]) => `${apNumber}|${id}|${titleEn}`,
    ),
    EXPECTED_U1_MANIFEST,
  );
});

test('checked-in U2 manifest matches the official AP 12-47 sequence', async () => {
  const manifest = await loadManifest();
  assert.deepEqual(
    Object.entries(manifest).map(
      ([apNumber, { id, titleEn }]) => `${apNumber}|${id}|${titleEn}`,
    ),
    EXPECTED_OFFICIAL_MANIFEST,
    'checked-in manifest must match the independently transcribed CED sequence',
  );
});

test('checked-in U3 manifest matches AP 48-98 and 103 required views', async () => {
  const manifest = JSON.parse(await readFile(U3_MANIFEST_PATH, 'utf8'));
  const entries = Object.entries(manifest)
    .sort(([a], [b]) => Number(a) - Number(b));

  assert.deepEqual(
    entries.map(([apNumber]) => Number(apNumber)),
    Array.from({ length: 51 }, (_, index) => index + 48),
  );
  assert.deepEqual(
    entries.map(([apNumber, work]) => (
      `${apNumber}|${work.id}|${work.titleEn}|${work.region}|${work.requiredViewIds.length}`
    )),
    EXPECTED_U3_MANIFEST,
  );
  assert.equal(
    entries.reduce((sum, [, work]) => sum + work.requiredViewIds.length, 0),
    103,
  );
});

test('checked-in U3 manifest preserves approved ordered required view IDs', async () => {
  const manifest = JSON.parse(await readFile(U3_MANIFEST_PATH, 'utf8'));
  const entries = Object.entries(manifest)
    .sort(([a], [b]) => Number(a) - Number(b));

  for (const [apNumber, work] of entries) {
    assert.deepEqual(
      work.requiredViewIds,
      EXPECTED_U3_REQUIRED_VIEW_IDS[apNumber] ?? ['primary'],
      `AP ${apNumber} required view IDs`,
    );
  }
});

test('checked-in U3 manifest preserves reviewed creation-context sites', async () => {
  const manifest = JSON.parse(await readFile(U3_MANIFEST_PATH, 'utf8'));
  const entries = Object.entries(manifest)
    .sort(([a], [b]) => Number(a) - Number(b));

  assert.deepEqual(
    entries.map(([apNumber, work]) => `${apNumber}|${work.siteName}`),
    EXPECTED_U3_SITES,
  );
});

test('checked-in U3 manifest entries use the exact five-field schema', async () => {
  const manifest = JSON.parse(await readFile(U3_MANIFEST_PATH, 'utf8'));
  const entries = Object.entries(manifest)
    .sort(([a], [b]) => Number(a) - Number(b));

  for (const [apNumber, work] of entries) {
    assert.deepEqual(
      Object.keys(work).sort(),
      EXPECTED_U3_ENTRY_KEYS,
      `AP ${apNumber} manifest fields`,
    );
  }
});

async function writeFixtureHtml(directory, artworks, credits) {
  const htmlPath = join(directory, 'fixture.html');
  await writeFile(
    htmlPath,
    [
      '<script id="artwork-data" type="application/json">',
      JSON.stringify(artworks),
      '</script>',
      '<script id="image-credit-data" type="application/json">',
      JSON.stringify(credits),
      '</script>',
    ].join('\n'),
    'utf8',
  );
  return htmlPath;
}

async function writeRawFixtureHtml(directory, html) {
  const htmlPath = join(directory, 'fixture.html');
  await writeFile(htmlPath, html, 'utf8');
  return htmlPath;
}

async function loadDocumentData() {
  const html = await readFile(HTML_PATH, 'utf8');
  const parseBlock = (id) => JSON.parse(
    html.match(new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)<\\/script>`))[1],
  );
  return {
    artworks: parseBlock('artwork-data'),
    credits: parseBlock('image-credit-data'),
  };
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
    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);
    assert.deepEqual(actualKeys, expectedKeys, `${path} object key order`);
    expectedKeys.forEach((key) => {
      assertOrderedDeepEqual(actual[key], expected[key], `${path}.${key}`);
    });
    return;
  }

  assert.deepEqual(actual, expected, `${path} value`);
}

function projectUnit3Credits(artworks, credits) {
  const artworkIds = new Set(artworks.map(({ id }) => id));
  return Object.fromEntries(
    Object.entries(credits).filter(([id]) => artworkIds.has(id)),
  );
}

test('live U1 records and credits match the reviewed canonical fixture', async () => {
  const [{ artworks, credits }, fixture] = await Promise.all([
    loadDocumentData(),
    readFile(U1_CANONICAL_PATH, 'utf8').then(JSON.parse),
  ]);
  assert.deepEqual(
    artworks.filter(({ unit }) => unit === 1),
    fixture.artworks,
  );
  assert.deepEqual(
    Object.fromEntries(fixture.artworks.map(({ id }) => [id, credits[id]])),
    fixture.credits,
  );
});

test('live U3 records and credits match the reviewed canonical fixture', async () => {
  const [{ artworks, credits }, fixture] = await Promise.all([
    loadDocumentData(),
    readFile(U3_CANONICAL_PATH, 'utf8').then(JSON.parse),
  ]);
  assertOrderedDeepEqual(
    artworks.filter(({ unit }) => unit === 3),
    fixture.artworks,
  );
  assertOrderedDeepEqual(
    projectUnit3Credits(fixture.artworks, credits),
    fixture.credits,
  );
});

test('ordered U3 canonical comparison rejects artwork field-order drift recursively', async () => {
  const fixture = JSON.parse(await readFile(U3_CANONICAL_PATH, 'utf8'));
  const reorderedArtwork = structuredClone(fixture.artworks);
  reorderedArtwork[0] = Object.fromEntries(
    Object.entries(reorderedArtwork[0]).reverse(),
  );
  assert.throws(
    () => assertOrderedDeepEqual(reorderedArtwork, fixture.artworks),
    /\$\[0\].*object key order/i,
  );

  const reorderedNestedFields = structuredClone(fixture.artworks);
  reorderedNestedFields[0].coordinates = Object.fromEntries(
    Object.entries(reorderedNestedFields[0].coordinates).reverse(),
  );
  assert.throws(
    () => assertOrderedDeepEqual(reorderedNestedFields, fixture.artworks),
    /\$\[0\]\.coordinates.*object key order/i,
  );
});

test('ordered U3 canonical comparison rejects top-level credit key-order drift', async () => {
  const fixture = JSON.parse(await readFile(U3_CANONICAL_PATH, 'utf8'));
  const entries = Object.entries(fixture.credits);
  const reorderedCredits = Object.fromEntries([
    entries[1],
    entries[0],
    ...entries.slice(2),
  ]);

  assert.throws(
    () => assertOrderedDeepEqual(
      projectUnit3Credits(fixture.artworks, reorderedCredits),
      fixture.credits,
    ),
    /\$.*object key order/i,
  );
});

function makeUnit1Artworks(manifest) {
  const regions = [
    'africa',
    'europe',
    'americas',
    'africa',
    'middleEast',
    'middleEast',
    'eastAsia',
    'europe',
    'oceania',
    'americas',
    'oceania',
  ];
  return Object.entries(manifest).map(([apNumberText, { id, titleEn }]) => {
    const apNumber = Number(apNumberText);
    const mediaCount = apNumber === 8 ? 2 : 1;
    return {
      id,
      apNumber,
      titleEn,
      titleZh: `作品 ${apNumber}`,
      unit: 1,
      culture: 'globalPrehistory',
      region: regions[apNumber - 1],
      period: 'Global Prehistory',
      date: 'Prehistoric',
      artistCulture: 'Unknown',
      siteName: `Site ${apNumber}`,
      ...(apNumber === 6
        ? { siteQualifier: 'Broad regional provenance; marker location is approximate' }
        : {}),
      coordinates: { x: 100 + apNumber, y: 100 + apNumber },
      medium: 'Test medium',
      workType: 'test work',
      function: 'Test function',
      form: 'Test form',
      content: 'Test content',
      context: 'Test context',
      recognitionAnchors: ['Test anchor'],
      comparisonIds: [
        apNumber === 1 ? 'ap2-great-hall-bulls' : 'ap1-apollo-11-stones',
      ],
      images: Array.from({ length: mediaCount }, (_, index) => ({
        label: mediaCount === 1 ? 'Primary view' : `View ${index + 1}`,
        imageUrl: `https://example.com/${id}-${index + 1}.jpg`,
        imageAlt: `${titleEn} view ${index + 1}`,
        imageSourceName: 'Example source',
        imageSourceUrl: `https://example.com/source/${id}-${index + 1}`,
      })),
      keywords: ['test'],
    };
  });
}

function makeUnit1Credits(artworks) {
  return Object.fromEntries(artworks.map((artwork) => {
    const entries = normalizeArtworkMedia(artwork).map((_, index) => ({
      creatorOrInstitution: `Creator ${artwork.apNumber}-${index + 1}`,
      licenseName: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    }));
    return [artwork.id, entries.length === 1 ? entries[0] : entries];
  }));
}

async function loadCompleteFixture() {
  const [{ artworks, credits }, manifests] = await Promise.all([
    loadDocumentData(),
    loadUnits12Manifests(),
  ]);
  const unit2Artworks = artworks.filter(({ unit }) => unit === 2);
  const unit2Credits = Object.fromEntries(
    unit2Artworks.map(({ id }) => [id, credits[id]]),
  );
  const unit1Artworks = makeUnit1Artworks(manifests[1]);
  return {
    artworks: [...unit1Artworks, ...unit2Artworks],
    credits: { ...makeUnit1Credits(unit1Artworks), ...unit2Credits },
    manifests,
  };
}

async function loadCompleteUnits123Fixture() {
  const [units12, unit3, rights] = await Promise.all([
    loadCompleteFixture(),
    readFile(U3_CANONICAL_PATH, 'utf8').then(JSON.parse),
    readFile(U3_RIGHTS_PATH, 'utf8').then(JSON.parse),
  ]);
  const manifest3 = JSON.parse(await readFile(MANIFEST_PATHS[3], 'utf8'));
  return {
    artworks: [...units12.artworks, ...unit3.artworks],
    credits: { ...units12.credits, ...unit3.credits },
    manifests: { ...units12.manifests, 3: manifest3 },
    rights,
  };
}

async function loadCompleteUnits1234Fixture() {
  const [units123, unit4, manifest4, rights4, placeholders] = await Promise.all([
    loadCompleteUnits123Fixture(),
    readFile(U4_CANONICAL_PATH, 'utf8').then(JSON.parse),
    readFile(MANIFEST_PATHS[4], 'utf8').then(JSON.parse),
    readFile(U4_RIGHTS_PATH, 'utf8').then(JSON.parse),
    readFile(U4_PLACEHOLDERS_PATH, 'utf8').then(JSON.parse),
  ]);
  return {
    artworks: [...units123.artworks, ...unit4.artworks],
    credits: { ...units123.credits, ...unit4.credits },
    manifests: { ...units123.manifests, 4: manifest4 },
    rights: { 3: units123.rights, 4: rights4 },
    placeholders,
  };
}

async function loadCompleteUnits12345Fixture() {
  const [live, unit5, manifest5, rights3, rights4, rights5, placeholders4, placeholders5]
    = await Promise.all([
      loadDocumentData(),
      readFile(U5_CANONICAL_PATH, 'utf8').then(JSON.parse),
      readFile(MANIFEST_PATHS[5], 'utf8').then(JSON.parse),
      readFile(U3_RIGHTS_PATH, 'utf8').then(JSON.parse),
      readFile(U4_RIGHTS_PATH, 'utf8').then(JSON.parse),
      readFile(U5_RIGHTS_PATH, 'utf8').then(JSON.parse),
      readFile(U4_PLACEHOLDERS_PATH, 'utf8').then(JSON.parse),
      readFile(U5_PLACEHOLDERS_PATH, 'utf8').then(JSON.parse),
    ]);
  const manifests = Object.fromEntries(await Promise.all(
    [1, 2, 3, 4].map(async (unit) => [
      unit,
      JSON.parse(await readFile(MANIFEST_PATHS[unit], 'utf8')),
    ]),
  ));
  const canonicalU5Ids = unit5.artworks.map(({ id }) => id);
  const liveU5 = live.artworks.filter(({ unit }) => unit === 5);
  let artworks;
  let credits;
  if (liveU5.length) {
    assert.equal(live.artworks.length, 250, 'live release requires exactly AP 1–180');
    assert.deepEqual(live.artworks.slice(0, 166).map(({ apNumber }) => apNumber), EXPECTED_RELEASE_AP_NUMBERS);
    assertOrderedDeepEqual(liveU5, unit5.artworks, '$.fixtureHelper.liveU5.artworks');
    const liveU5CreditIds = Object.keys(live.credits).slice(152, 166);
    assert.deepEqual(liveU5CreditIds, canonicalU5Ids, 'live U5 credit key order');
    assertOrderedDeepEqual(
      Object.fromEntries(liveU5CreditIds.map((id) => [id, live.credits[id]])),
      unit5.credits,
      '$.fixtureHelper.liveU5.credits',
    );
    artworks = structuredClone(live.artworks.slice(0, 166));
    credits = structuredClone(Object.fromEntries(artworks.map(({ id }) => [id, live.credits[id]])));
  } else {
    assert.equal(live.artworks.length, 152, 'pre-import fixture boundary must end at AP 152');
    assert.ok(
      canonicalU5Ids.every((id) => !Object.hasOwn(live.credits, id)),
      'pre-import credits must not already contain U5',
    );
    artworks = [...structuredClone(live.artworks), ...structuredClone(unit5.artworks)];
    credits = { ...structuredClone(live.credits), ...structuredClone(unit5.credits) };
  }
  return {
    artworks,
    credits,
    manifests: { ...manifests, 5: manifest5 },
    rights: { 3: rights3, 4: rights4, 5: rights5 },
    placeholders: { 4: placeholders4, 5: placeholders5 },
  };
}

function findUnit5Media(fixture, mediaKey) {
  const [artworkId, viewId] = mediaKey.split('::');
  const artwork = fixture.artworks.find(({ id }) => id === artworkId);
  const index = artwork.images.findIndex(({ id }) => id === viewId);
  return { artwork, media: artwork.images[index], index };
}

function mutateUnit5CreditAndRights(fixture, mediaKey, patch) {
  const { artwork, index } = findUnit5Media(fixture, mediaKey);
  const rawCredit = fixture.credits[artwork.id];
  const credit = Array.isArray(rawCredit) ? rawCredit[index] : rawCredit;
  Object.assign(credit, patch);
  Object.assign(fixture.rights[5][mediaKey], patch);
}

function patchAlignedUnit3Credit(fixture, mediaKey, patch) {
  const [artworkId, viewId] = mediaKey.split('::');
  const artwork = fixture.artworks.find(({ id }) => id === artworkId);
  const viewIndex = artwork.images.findIndex(({ id }) => id === viewId);
  const rawCredit = fixture.credits[artworkId];
  const credit = Array.isArray(rawCredit) ? rawCredit[viewIndex] : rawCredit;
  Object.assign(credit, patch);
  Object.assign(fixture.rights[mediaKey], patch);
}

async function loadValidatedLiveArtworks() {
  return loadDocumentData().then(({ artworks }) => artworks);
}

function assertInvalidArtworkError(operation, patterns, label) {
  assert.throws(
    operation,
    (error) => {
      assert.match(error.message, /^Invalid artwork data:/, `${label}: branded error`);
      for (const pattern of patterns) {
        assert.match(error.message, pattern, `${label}: diagnostic context`);
      }
      return true;
    },
  );
}

test('normalizes both explicit image arrays and legacy single-image fields', () => {
  const explicit = {
    images: [{
      label: 'Ground-level view',
      imageUrl: 'https://example.com/ground.jpg',
      imageAlt: 'Ground view',
      imageSourceName: 'Example',
      imageSourceUrl: 'https://example.com/source',
      ignored: 'not part of normalized media',
    }],
  };
  const legacy = {
    imageUrl: 'https://example.com/primary.jpg',
    imageAlt: 'Primary view',
    imageSourceName: 'Example',
    imageSourceUrl: 'https://example.com/source',
  };

  assert.deepEqual(normalizeArtworkMedia(explicit), [{
    label: 'Ground-level view',
    imageUrl: 'https://example.com/ground.jpg',
    imageAlt: 'Ground view',
    imageSourceName: 'Example',
    imageSourceUrl: 'https://example.com/source',
  }]);
  assert.deepEqual(normalizeArtworkMedia(legacy), [{
    label: 'Primary view',
    imageUrl: 'https://example.com/primary.jpg',
    imageAlt: 'Primary view',
    imageSourceName: 'Example',
    imageSourceUrl: 'https://example.com/source',
  }]);
});

test('CLI rejects an empty Units 1-2 dataset instead of reporting success', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'art-history-validator-'));
  const htmlPath = await writeFixtureHtml(directory, [], {});

  try {
    await assert.rejects(
      execFileAsync(process.execPath, [VALIDATOR_PATH, htmlPath]),
      /exactly 47|manifest/i,
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('loads exactly AP 1–180 with the canonical Unit 5 projection and preserved AP 1–166', async () => {
  const [{ artworks, credits }, unit5] = await Promise.all([
    loadDocumentData(),
    readFile(U5_CANONICAL_PATH, 'utf8').then(JSON.parse),
  ]);
  const manifest = await loadManifest();
  const liveU5 = artworks.filter(({ unit }) => unit === 5);
  const unit5Ids = unit5.artworks.map(({ id }) => id);
  const liveU5Credits = Object.fromEntries(unit5Ids.map((id) => [id, credits[id]]));
  const unit5Media = liveU5.flatMap(({ images }) => images);

  assert.equal(artworks.length, 250);
  assert.deepEqual(
    artworks.map(({ apNumber }) => apNumber),
    EXPECTED_LIVE_AP_NUMBERS,
    'artwork-data must remain in official AP order',
  );
  assert.deepEqual(
    artworks.slice(0, 166).map(({ apNumber }) => apNumber),
    EXPECTED_RELEASE_AP_NUMBERS,
    'first 166 works must preserve the U1–U5 AP order independently of U6',
  );
  assertOrderedDeepEqual(liveU5, unit5.artworks, '$.liveU5.artworks');
  assertOrderedDeepEqual(liveU5Credits, unit5.credits, '$.liveU5.credits');
  assert.equal(liveU5.length, 14, 'live U5 work count');
  assert.equal(unit5Media.length, 27, 'live U5 view count');
  const auditedRights = JSON.parse(await readFile(U5_RIGHTS_PATH, 'utf8'));
  assert.equal(unit5Media.filter(({ imageUrl }) => imageUrl !== null).length,
    Object.values(auditedRights).filter(row => row.releaseClass === 'open').length);
  assert.equal(unit5Media.filter(({ imageUrl }) => imageUrl === null).length,
    Object.values(auditedRights).filter(row => row.releaseClass === 'restricted').length);
  assert.deepEqual(
    artworks.filter(({ unit }) => unit === 2).map(({ apNumber }) => apNumber),
    EXPECTED_U2_AP_NUMBERS,
  );
  assert.deepEqual(
    Object.fromEntries(
      artworks
        .filter(({ unit }) => unit === 2)
        .sort((first, second) => first.apNumber - second.apNumber)
        .map(({ apNumber, id, titleEn }) => [apNumber, { id, titleEn }]),
    ),
    manifest,
  );
});

test('complete Units 1–5 fixture helper emits AP 1–166 once without duplicating live U5', async () => {
  const [fixture, unit5] = await Promise.all([
    loadCompleteUnits12345Fixture(),
    readFile(U5_CANONICAL_PATH, 'utf8').then(JSON.parse),
  ]);
  const fixtureU5 = fixture.artworks.filter(({ unit }) => unit === 5);

  assert.equal(fixture.artworks.length, 166);
  assert.deepEqual(fixture.artworks.map(({ apNumber }) => apNumber), EXPECTED_RELEASE_AP_NUMBERS);
  assert.equal(new Set(fixture.artworks.map(({ id }) => id)).size, 166, 'unique work ids');
  assert.equal(fixtureU5.length, 14, 'one canonical U5 set');
  assertOrderedDeepEqual(fixtureU5, unit5.artworks, '$.fixtureHelper.artworks');
  assertOrderedDeepEqual(
    Object.fromEntries(unit5.artworks.map(({ id }) => [id, fixture.credits[id]])),
    unit5.credits,
    '$.fixtureHelper.credits',
  );
});

test('strict loader accepts the complete AP 1–180 live release by default', async () => {
  const fixture = await loadDocumentData();
  const directory = await mkdtemp(join(tmpdir(), 'art-history-validator-u6-release-'));
  const htmlPath = await writeFixtureHtml(directory, fixture.artworks, fixture.credits);

  try {
    const artworks = await loadAndValidate(htmlPath);
    assert.deepEqual(
      artworks.map(({ apNumber }) => apNumber),
      EXPECTED_LIVE_AP_NUMBERS,
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('strict live loader rejects a duplicate raw artwork property key', async () => {
  const html = await readFile(HTML_PATH, 'utf8');
  const original = /"id":\s*"ap48-catacomb-priscilla",\s*"apNumber":\s*48/;
  const duplicate = '"id": "ap48-catacomb-priscilla", "id": "ap48-catacomb-priscilla", "apNumber": 48';
  assert.equal(html.match(new RegExp(original.source, 'g'))?.length, 1, 'AP48 mutation target must be unique');

  const directory = await mkdtemp(join(tmpdir(), 'art-history-duplicate-artwork-key-'));
  const htmlPath = await writeRawFixtureHtml(directory, html.replace(original, duplicate));
  try {
    await assert.rejects(
      loadAndValidate(htmlPath),
      /artwork-data.*duplicate object key.*id.*\$\[47\]/i,
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('strict live loader rejects a duplicate raw top-level image credit key', async () => {
  const fixture = await loadDocumentData();
  const directory = await mkdtemp(join(tmpdir(), 'art-history-duplicate-credit-key-'));
  const cleanHtmlPath = await writeFixtureHtml(directory, fixture.artworks, fixture.credits);
  const html = await readFile(cleanHtmlPath, 'utf8');
  const creditValue = JSON.stringify(fixture.credits['ap48-catacomb-priscilla']);
  const scriptStart = /(<script id="image-credit-data" type="application\/json">\s*\{)/;
  assert.match(html, scriptStart, 'image-credit-data mutation target must exist');

  const htmlPath = await writeRawFixtureHtml(
    directory,
    html.replace(
      scriptStart,
      `$1\n  "ap48-catacomb-priscilla": ${creditValue},`,
    ),
  );
  try {
    await assert.rejects(
      loadAndValidate(htmlPath),
      /image-credit-data.*duplicate object key.*ap48-catacomb-priscilla.*\$/i,
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('validator rejects an injected AP 48 manifest entry with unchanged official artworks', async () => {
  const { artworks, manifests } = await loadCompleteFixture();

  assert.throws(
    () => validateArtworks(artworks, {
      ...manifests,
      2: {
        ...manifests[2],
        48: {
          id: 'ap48-extra',
          titleEn: 'Extra',
        },
      },
    }),
    /official Unit 2 manifest.*(?:keys|12\.\.47|36)/i,
  );
});

test('validator requires the exact numeric manifest keyset 12 through 47', async () => {
  const { artworks, manifests } = await loadCompleteFixture();
  const { 12: omitted, ...missingAp12 } = manifests[2];

  for (const invalidManifest of [
    missingAp12,
    { ...manifests[2], extra: { id: 'extra', titleEn: 'Extra' } },
    { ...manifests[2], '12.0': manifests[2][12] },
  ]) {
    assert.throws(
      () => validateArtworks(artworks, { ...manifests, 2: invalidManifest }),
      /official Unit 2 manifest.*(?:keys|12\.\.47|36)/i,
    );
  }
});

test('validator requires the exact numeric manifest keyset 1 through 11', async () => {
  const { artworks, manifests } = await loadCompleteFixture();
  const { 1: omitted, ...missingAp1 } = manifests[1];

  for (const invalidManifest of [
    missingAp1,
    { ...manifests[1], extra: { id: 'extra', titleEn: 'Extra' } },
    { ...manifests[1], '1.0': manifests[1][1] },
  ]) {
    assert.throws(
      () => validateArtworks(artworks, { ...manifests, 1: invalidManifest }),
      /official Unit 1 manifest.*(?:keys|1\.\.11|11)/i,
    );
  }
});

test('validator rejects incomplete, mismatched, duplicate, and extra manifest entries', async () => {
  const { artworks, manifests } = await loadCompleteFixture();
  const cases = [
    {
      label: 'incomplete',
      artworks: artworks.slice(1),
    },
    {
      label: 'mismatched title',
      artworks: artworks.map((work) => (
        work.apNumber === 12 ? { ...work, titleEn: 'White Temple' } : work
      )),
    },
    {
      label: 'mismatched id',
      artworks: artworks.map((work) => (
        work.apNumber === 12 ? { ...work, id: 'ap12-wrong-id' } : work
      )),
    },
    {
      label: 'duplicate',
      artworks: [...artworks, { ...artworks[0] }],
    },
    {
      label: 'extra',
      artworks: [
        ...artworks,
        { ...artworks[0], id: 'ap48-extra', apNumber: 48 },
      ],
    },
  ];

  for (const fixture of cases) {
    assert.throws(
      () => validateArtworks(fixture.artworks, manifests),
      /manifest|exactly 47|duplicate|1\.\.47/i,
      fixture.label,
    );
  }
});

test('validator enforces exact media-aligned HTTPS image credit manifests', async () => {
  const { artworks, credits, manifests } = await loadCompleteFixture();
  validateArtworks(artworks, manifests);
  const stonehengeId = 'ap8-stonehenge';
  const invalidCredits = [
    Object.fromEntries(Object.entries(credits).slice(1)),
    { ...credits, extra: credits['ap12-white-temple-ziggurat'] },
    {
      ...credits,
      'ap12-white-temple-ziggurat': {
        ...credits['ap12-white-temple-ziggurat'],
        creatorOrInstitution: '',
      },
    },
    {
      ...credits,
      'ap12-white-temple-ziggurat': {
        ...credits['ap12-white-temple-ziggurat'],
        licenseUrl: 'http://creativecommons.org/licenses/by-sa/2.0/',
      },
    },
    {
      ...credits,
      [stonehengeId]: [credits[stonehengeId][0]],
    },
    {
      ...credits,
      [stonehengeId]: credits[stonehengeId][0],
    },
  ];

  for (const [index, fixtureCredits] of invalidCredits.entries()) {
    assert.throws(
      () => validateImageCredits(fixtureCredits, artworks),
      /credit|creatorOrInstitution|HTTPS|media/i,
      `invalid credit fixture ${index + 1}`,
    );
  }
});

test('validator rejects a one-element credit array for a single-media Unit 2 work', async () => {
  const { artworks, credits } = await loadCompleteFixture();
  const id = 'ap12-white-temple-ziggurat';

  assert.throws(
    () => validateImageCredits({
      ...credits,
      [id]: [credits[id]],
    }, artworks),
    /credit.*(?:single|object|array|shape)/i,
  );
});

test('validator rejects a one-element credit array for a single-media Unit 1 work', async () => {
  const { artworks, credits } = await loadCompleteFixture();
  const id = 'ap1-apollo-11-stones';

  assert.throws(
    () => validateImageCredits({
      ...credits,
      [id]: [credits[id]],
    }, artworks),
    /credit.*(?:single|object|array|shape)/i,
  );
});

test('validator accepts a complete Units 1-2 fixture with legacy and array media', async () => {
  const { artworks, credits, manifests } = await loadCompleteFixture();

  assert.equal(validateArtworks(artworks, manifests), artworks);
  assert.equal(validateImageCredits(credits, artworks), credits);
});

test('validator accepts the complete AP 1–98 fixture with exact artwork and credit keys', async () => {
  const fixture = await loadCompleteUnits123Fixture();

  assert.deepEqual(
    fixture.artworks.map(({ apNumber }) => apNumber),
    EXPECTED_COMPLETE_AP_NUMBERS,
  );
  assert.deepEqual(
    Object.keys(fixture.credits).sort(),
    fixture.artworks.map(({ id }) => id).sort(),
  );
  assert.equal(validateArtworks(fixture.artworks, fixture.manifests), fixture.artworks);
  assert.equal(
    validateImageCredits(fixture.credits, fixture.artworks, fixture.rights),
    fixture.credits,
  );
});

test('validator rejects missing AP 48, extra AP 99, and a duplicate AP number', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const missingAp48 = fixture.artworks.filter(({ apNumber }) => apNumber !== 48);
  const extraAp99 = [
    ...fixture.artworks,
    {
      ...structuredClone(fixture.artworks.at(-1)),
      id: 'ap99-extra',
      apNumber: 99,
    },
  ];
  const duplicateAp48 = structuredClone(fixture.artworks);
  duplicateAp48[48].apNumber = 48;

  assert.throws(
    () => validateArtworks(missingAp48, fixture.manifests),
    /artwork AP numbers.*exactly 1\.\.98|missing AP 48/i,
  );
  assert.throws(
    () => validateArtworks(extraAp99, fixture.manifests),
    /AP 99|exactly 1\.\.98|Unit 3 range/i,
  );
  assert.throws(
    () => validateArtworks(duplicateAp48, fixture.manifests),
    /duplicate AP number 48/i,
  );
});

test('validator requires the exact Unit 3 manifest keyset 48 through 98', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const { 48: omitted, ...missingAp48 } = fixture.manifests[3];

  for (const invalidManifest of [
    missingAp48,
    {
      ...fixture.manifests[3],
      99: {
        id: 'ap99-extra',
        titleEn: 'Extra',
        region: 'italyVatican',
        siteName: 'Extra',
        requiredViewIds: ['primary'],
      },
    },
    { ...fixture.manifests[3], '48.0': fixture.manifests[3][48] },
  ]) {
    assert.throws(
      () => validateArtworks(
        fixture.artworks,
        { ...fixture.manifests, 3: invalidManifest },
      ),
      /official Unit 3 manifest.*(?:keys|48\.\.98|51)/i,
    );
  }
});

test('validator rejects malformed Unit 3 manifest entries with branded AP and field context', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const cases = [
    {
      label: 'null entry',
      mutate: (manifest) => {
        manifest[60] = null;
      },
      fieldPattern: /entry|object/i,
    },
    {
      label: 'null required views',
      mutate: (manifest) => {
        manifest[60].requiredViewIds = null;
      },
      fieldPattern: /requiredViewIds/i,
    },
    {
      label: 'non-array required views',
      mutate: (manifest) => {
        manifest[60].requiredViewIds = 'west-facade';
      },
      fieldPattern: /requiredViewIds/i,
    },
    {
      label: 'empty required views',
      mutate: (manifest) => {
        manifest[60].requiredViewIds = [];
      },
      fieldPattern: /requiredViewIds/i,
    },
    {
      label: 'duplicate required view ids',
      mutate: (manifest) => {
        manifest[60].requiredViewIds[1] = manifest[60].requiredViewIds[0];
      },
      fieldPattern: /requiredViewIds.*duplicate|duplicate.*requiredViewIds/i,
    },
    {
      label: 'extra manifest entry field',
      mutate: (manifest) => {
        manifest[60].unexpected = 'extra';
      },
      fieldPattern: /unexpected|extra/i,
    },
    {
      label: 'missing manifest entry field',
      mutate: (manifest) => {
        delete manifest[60].siteName;
      },
      fieldPattern: /siteName|missing/i,
    },
  ];

  for (const { label, mutate, fieldPattern } of cases) {
    const manifests = structuredClone(fixture.manifests);
    mutate(manifests[3]);
    assertInvalidArtworkError(
      () => validateArtworks(fixture.artworks, manifests),
      [/Unit 3/i, /AP 60/i, fieldPattern],
      label,
    );
  }
});

test('validator reports exact manifest key differences', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const missing = structuredClone(fixture.manifests);
  delete missing[3][48];
  assertInvalidArtworkError(
    () => validateArtworks(fixture.artworks, missing),
    [/Unit 3/i, /missing/i, /\b48\b/],
    'missing Unit 3 manifest key',
  );

  const extra = structuredClone(fixture.manifests);
  extra[3][99] = structuredClone(extra[3][98]);
  assertInvalidArtworkError(
    () => validateArtworks(fixture.artworks, extra),
    [/Unit 3/i, /extra/i, /\b99\b/],
    'extra Unit 3 manifest key',
  );
});

test('validator enforces every Unit 3 manifest identity and creation-site field', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const cases = [
    ['id', 'ap60-wrong-id'],
    ['titleEn', 'Chartres'],
    ['region', 'italyVatican'],
    ['siteName', 'Paris, France'],
  ];

  for (const [field, value] of cases) {
    const copy = structuredClone(fixture.artworks);
    Object.assign(copy.find(({ apNumber }) => apNumber === 60), { [field]: value });
    assert.throws(
      () => validateArtworks(copy, fixture.manifests),
      new RegExp(`AP 60.*(?:manifest )?${field === 'titleEn' ? 'title' : field}`, 'i'),
      `AP 60 ${field}`,
    );
  }
});

test('validator rejects unknown Unit 3 regions and exact region-count mismatches', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const unknownRegion = structuredClone(fixture.artworks);
  unknownRegion.find(({ apNumber }) => apNumber === 98).region = 'unknownRegion';
  assert.throws(
    () => validateArtworks(unknownRegion, fixture.manifests),
    /AP 98|region.*Unit 3|unknownRegion/i,
  );

  const countMismatch = structuredClone(fixture);
  countMismatch.artworks.find(({ apNumber }) => apNumber === 98).region = 'italyVatican';
  countMismatch.manifests[3][98].region = 'italyVatican';
  assert.throws(
    () => validateArtworks(countMismatch.artworks, countMismatch.manifests),
    /Unit 3 region counts|italyVatican.*18|britishIsles.*3/i,
  );
});

test('validator freezes all six broad Unit 3 provenance qualifiers', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  for (const apNumber of [50, 53, 55, 59, 62, 68]) {
    for (const qualifier of [undefined, 'Broad provenance']) {
      const copy = structuredClone(fixture.artworks);
      const artwork = copy.find((work) => work.apNumber === apNumber);
      if (qualifier === undefined) {
        delete artwork.provenanceQualifier;
      } else {
        artwork.provenanceQualifier = qualifier;
      }
      assert.throws(
        () => validateArtworks(copy, fixture.manifests),
        new RegExp(`AP ${apNumber}|${artwork.id}.*provenanceQualifier`, 'i'),
        `AP ${apNumber} qualifier ${qualifier ?? 'missing'}`,
      );
    }
  }
});

test('validator requires precise Unit 3 cultures, approved traditions, and complete study arrays', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const cases = [
    {
      label: 'precise culture',
      mutate: (work) => {
        work.culture = 'baroqueColonial';
      },
      pattern: /culture.*precise|valid Unit 3 culture/i,
    },
    {
      label: 'approved tradition',
      mutate: (work) => {
        work.traditionGroup = 'unknownTradition';
      },
      pattern: /traditionGroup.*approved|valid Unit 3 tradition/i,
    },
    {
      label: 'reviewed precise culture assignment',
      mutate: (work) => {
        work.culture = 'spanishBaroque';
      },
      pattern: /culture.*reviewed.*AP 60|AP 60.*culture/i,
    },
    {
      label: 'reviewed broad tradition assignment',
      mutate: (work) => {
        work.traditionGroup = 'baroqueColonial';
      },
      pattern: /traditionGroup.*reviewed.*AP 60|AP 60.*tradition/i,
    },
    {
      label: 'two recognition anchors',
      mutate: (work) => {
        work.recognitionAnchors = work.recognitionAnchors.slice(0, 1);
      },
      pattern: /recognitionAnchors.*(?:at least 2|two)/i,
    },
    {
      label: 'one comparison',
      mutate: (work) => {
        work.comparisonIds = [];
      },
      pattern: /comparisonIds.*non-empty|at least 1/i,
    },
    {
      label: 'three keywords',
      mutate: (work) => {
        work.keywords = work.keywords.slice(0, 2);
      },
      pattern: /keywords.*at least 3/i,
    },
  ];

  for (const { label, mutate, pattern } of cases) {
    const copy = structuredClone(fixture.artworks);
    mutate(copy.find(({ apNumber }) => apNumber === 60));
    assert.throws(() => validateArtworks(copy, fixture.manifests), pattern, label);
  }
});

test('validator rejects duplicate Unit 3 view ids and exact Chartres view drift', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const duplicateViewId = structuredClone(fixture.artworks);
  const duplicateChartres = duplicateViewId.find(({ apNumber }) => apNumber === 60);
  duplicateChartres.images[1].id = duplicateChartres.images[0].id;
  assert.throws(
    () => validateArtworks(duplicateViewId, fixture.manifests),
    /AP 60|ap60-chartres-cathedral.*duplicate.*view id/i,
  );

  const cases = [
    {
      label: 'missing sixth view',
      mutate: (images) => images.pop(),
    },
    {
      label: 'extra seventh view',
      mutate: (images) => images.push({
        ...images[0],
        id: 'extra-view',
        label: 'Extra view',
        imageUrl: 'https://example.com/chartres-extra.jpg',
        imageAlt: '沙特尔大教堂额外视图',
        imageSourceUrl: 'https://example.com/chartres-extra-source',
      }),
    },
    {
      label: 'wrong view id',
      mutate: (images) => {
        images[0].id = 'wrong-view';
      },
    },
    {
      label: 'wrong view order',
      mutate: (images) => {
        [images[0], images[1]] = [images[1], images[0]];
      },
    },
  ];
  for (const { label, mutate } of cases) {
    const copy = structuredClone(fixture.artworks);
    mutate(copy.find(({ apNumber }) => apNumber === 60).images);
    assert.throws(
      () => validateArtworks(copy, fixture.manifests),
      /AP 60.*(?:required views|6)|ap60-chartres-cathedral.*(?:view|media)/i,
      label,
    );
  }
});

test('validator reports the first mismatched Unit 3 view key with AP context', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const artworks = structuredClone(fixture.artworks);
  const chartres = artworks.find(({ apNumber }) => apNumber === 60);
  [chartres.images[0], chartres.images[1]] = [chartres.images[1], chartres.images[0]];

  assertInvalidArtworkError(
    () => validateArtworks(artworks, fixture.manifests),
    [
      /AP 60/i,
      /index 0|first mismatch/i,
      /expected.*west-facade/i,
      /received.*nave/i,
    ],
    'Chartres first view mismatch',
  );
});

test('validator requires HTTPS and distinct Unit 3 media URLs and alt text', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const cases = [
    {
      label: 'HTTPS image URL',
      mutate: (images) => {
        images[0].imageUrl = images[0].imageUrl.replace('https:', 'http:');
      },
      pattern: /imageUrl.*HTTPS/i,
    },
    {
      label: 'HTTPS source URL',
      mutate: (images) => {
        images[0].imageSourceUrl = images[0].imageSourceUrl.replace('https:', 'http:');
      },
      pattern: /imageSourceUrl.*HTTPS/i,
    },
    {
      label: 'distinct alt',
      mutate: (images) => {
        images[1].imageAlt = images[0].imageAlt;
      },
      pattern: /duplicate.*imageAlt/i,
    },
    {
      label: 'distinct source URL',
      mutate: (images) => {
        images[1].imageSourceUrl = images[0].imageSourceUrl;
      },
      pattern: /duplicate.*imageSourceUrl/i,
    },
  ];

  for (const { label, mutate, pattern } of cases) {
    const copy = structuredClone(fixture.artworks);
    mutate(copy.find(({ apNumber }) => apNumber === 60).images);
    assert.throws(() => validateArtworks(copy, fixture.manifests), pattern, label);
  }
});

test('validator rejects Unit 3 media identity reuse across different artworks', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const owner = fixture.artworks.find(({ apNumber }) => apNumber === 60).images[0];
  const conflictingMediaKey = 'ap61-bibles-moralisees::dedication-page';
  const ownerMediaKey = 'ap60-chartres-cathedral::west-facade';
  const cases = [
    ['imageUrl', /imageUrl/i],
    ['imageSourceUrl', /imageSourceUrl/i],
    ['imageAlt', /imageAlt/i],
  ];

  for (const [field, fieldPattern] of cases) {
    const artworks = structuredClone(fixture.artworks);
    const conflict = artworks.find(({ apNumber }) => apNumber === 61).images[0];
    conflict[field] = owner[field];
    assertInvalidArtworkError(
      () => validateArtworks(artworks, fixture.manifests),
      [fieldPattern, new RegExp(ownerMediaKey), new RegExp(conflictingMediaKey)],
      `cross-work ${field}`,
    );
  }
});

test('validator enforces exact Unit 3 credit schema, count, and view alignment', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const chartresId = 'ap60-chartres-cathedral';
  const cases = [
    {
      label: 'missing credit',
      mutate: (copy) => copy[chartresId].pop(),
      pattern: /AP 60|ap60-chartres-cathedral.*credit count.*6|media views/i,
    },
    {
      label: 'extra credit',
      mutate: (copy) => copy[chartresId].push({ ...copy[chartresId][0] }),
      pattern: /AP 60|ap60-chartres-cathedral.*credit count.*6|media views/i,
    },
    {
      label: 'misaligned credit',
      mutate: (copy) => {
        [copy[chartresId][0], copy[chartresId][1]] = [
          copy[chartresId][1],
          copy[chartresId][0],
        ];
      },
      pattern: /ap60-chartres-cathedral::west-facade.*credit mismatch|rights audit.*credit/i,
    },
    {
      label: 'extra credit field',
      mutate: (copy) => {
        copy[chartresId][0].unexpected = 'extra';
      },
      pattern: /exact credit schema|credit.*unexpected/i,
    },
  ];

  for (const { label, mutate, pattern } of cases) {
    const credits = structuredClone(fixture.credits);
    mutate(credits);
    assert.throws(
      () => validateImageCredits(credits, fixture.artworks, fixture.rights),
      pattern,
      label,
    );
  }
});

test('validator requires exact artwork-level credit keys through AP 98', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const missing = structuredClone(fixture.credits);
  delete missing['ap48-catacomb-priscilla'];
  const extra = {
    ...fixture.credits,
    'ap99-extra': fixture.credits['ap98-tete-a-tete'],
  };

  assertInvalidArtworkError(
    () => validateImageCredits(missing, fixture.artworks, fixture.rights),
    [/image credit/i, /missing/i, /ap48-catacomb-priscilla/i],
    'missing artwork credit key',
  );
  assertInvalidArtworkError(
    () => validateImageCredits(extra, fixture.artworks, fixture.rights),
    [/image credit/i, /extra/i, /ap99-extra/i],
    'extra artwork credit key',
  );
});

test('validator binds every reviewed release class and license name to approved URLs', async () => {
  const base = await loadCompleteUnits123Fixture();
  const cases = [
    {
      label: 'public-domain mark on an unrelated host',
      mediaKey: 'ap48-catacomb-priscilla::greek-chapel',
      patch: { licenseUrl: 'https://example.com/not-a-license' },
    },
    {
      label: 'CC name paired with the wrong canonical CC path',
      mediaKey: 'ap49-santa-sabina::interior',
      patch: {
        licenseName: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      },
    },
    {
      label: 'Commons public-domain template name paired with another template',
      mediaKey: 'ap49-santa-sabina::exterior',
      patch: {
        licenseUrl: 'https://commons.wikimedia.org/wiki/Template:PD-anon-70-EU',
      },
    },
    {
      label: 'Louvre terms paired with LACMA terms',
      mediaKey: 'ap53-merovingian-fibulae::primary',
      patch: { licenseUrl: 'https://www.lacma.org/terms-use' },
    },
    {
      label: 'noncommercial credit on an unrelated host',
      mediaKey: 'ap55-lindisfarne-gospels::st-luke-portrait',
      patch: { licenseUrl: 'https://example.com/not-a-license' },
    },
  ];

  for (const { label, mediaKey, patch } of cases) {
    const fixture = structuredClone(base);
    patchAlignedUnit3Credit(fixture, mediaKey, patch);
    assertInvalidArtworkError(
      () => validateImageCredits(fixture.credits, fixture.artworks, fixture.rights),
      [new RegExp(mediaKey), /licenseName|licenseUrl|release.*policy/i],
      label,
    );
  }
});

test('validator pins noncommercial and institutional policies to reviewed media keys', async () => {
  const base = await loadCompleteUnits123Fixture();
  const cases = [
    {
      label: 'move AP55 noncommercial policy to AP48',
      mutate: (fixture) => {
        patchAlignedUnit3Credit(
          fixture,
          'ap48-catacomb-priscilla::greek-chapel',
          {
            licenseName: 'CC BY-NC-SA 4.0',
            licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
          },
        );
        fixture.rights['ap48-catacomb-priscilla::greek-chapel'].releaseClass = 'noncommercial';
        patchAlignedUnit3Credit(
          fixture,
          'ap55-lindisfarne-gospels::st-luke-portrait',
          {
            licenseName: 'Public Domain Mark 1.0',
            licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
          },
        );
        fixture.rights['ap55-lindisfarne-gospels::st-luke-portrait'].releaseClass = 'open';
      },
      pattern: /ap48-catacomb-priscilla::greek-chapel|ap55-lindisfarne-gospels::st-luke-portrait/i,
    },
    {
      label: 'swap Louvre and LACMA institutional policies',
      mutate: (fixture) => {
        patchAlignedUnit3Credit(
          fixture,
          'ap53-merovingian-fibulae::primary',
          {
            licenseName: 'LACMA collection image; reuse subject to museum terms',
            licenseUrl: 'https://www.lacma.org/terms-use',
          },
        );
        patchAlignedUnit3Credit(
          fixture,
          'ap95-virgin-guadalupe::primary',
          {
            licenseName: 'Louvre educational-use terms; commercial permission required',
            licenseUrl: 'https://collections.louvre.fr/en/page/cgu',
          },
        );
      },
      pattern: /ap53-merovingian-fibulae::primary|ap95-virgin-guadalupe::primary/i,
    },
  ];

  for (const { label, mutate, pattern } of cases) {
    const fixture = structuredClone(base);
    mutate(fixture);
    assertInvalidArtworkError(
      () => validateImageCredits(fixture.credits, fixture.artworks, fixture.rights),
      [pattern, /reviewed media|release.*policy/i],
      label,
    );
  }
});

test('validator accepts an equivalent Unit 3 rights audit regardless of key insertion order', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const reorderedRights = Object.fromEntries(
    Object.entries(fixture.rights).reverse(),
  );

  assert.equal(
    validateImageCredits(fixture.credits, fixture.artworks, reorderedRights),
    fixture.credits,
  );
});

test('validator accepts the complete rights-safe AP 1–152 fixture', async () => {
  const fixture = await loadCompleteUnits1234Fixture();

  assert.deepEqual(
    fixture.artworks.map(({ apNumber }) => apNumber),
    Array.from({ length: 152 }, (_, index) => index + 1),
  );
  assert.equal(
    validateArtworks(fixture.artworks, fixture.manifests, fixture.placeholders),
    fixture.artworks,
  );
  assert.equal(
    validateImageCredits(
      fixture.credits,
      fixture.artworks,
      fixture.rights,
      fixture.placeholders,
    ),
    fixture.credits,
  );

  const restricted = fixture.artworks
    .flatMap((work) => normalizeArtworkMedia(work))
    .filter(({ mediaStatus }) => mediaStatus === 'rightsRestricted');
  assert.equal(restricted.length, 8);
  assert.ok(restricted.every(({ imageUrl }) => imageUrl === null));

});

test('validator rejects missing, extra, and duplicate Unit 4 AP numbers', async () => {
  const fixture = await loadCompleteUnits1234Fixture();
  const missing = fixture.artworks.filter(({ apNumber }) => apNumber !== 99);
  const extra = [
    ...fixture.artworks,
    { ...structuredClone(fixture.artworks.at(-1)), id: 'ap153-extra', apNumber: 153 },
  ];
  const duplicate = structuredClone(fixture.artworks);
  duplicate[99].apNumber = 99;

  assert.throws(
    () => validateArtworks(missing, fixture.manifests, fixture.placeholders),
    /exactly 152|1\.\.152|received 151/i,
  );
  assert.throws(
    () => validateArtworks(extra, fixture.manifests, fixture.placeholders),
    /exactly 152|1\.\.152|received 153/i,
  );
  assert.throws(
    () => validateArtworks(duplicate, fixture.manifests, fixture.placeholders),
    /duplicate AP number 99/i,
  );
});

test('validator rejects Unit 4 manifest, view-order, and comparison drift', async () => {
  const fixture = await loadCompleteUnits1234Fixture();

  const mismatchedManifest = structuredClone(fixture.manifests);
  mismatchedManifest[4][99].id = 'ap99-wrong';
  assert.throws(
    () => validateArtworks(fixture.artworks, mismatchedManifest, fixture.placeholders),
    /AP 99 manifest id.*ap99-wrong/i,
  );

  const reorderedViews = structuredClone(fixture.artworks);
  const monticello = reorderedViews.find(({ apNumber }) => apNumber === 102);
  monticello.images.reverse();
  assert.throws(
    () => validateArtworks(reorderedViews, fixture.manifests, fixture.placeholders),
    /AP 102.*required views.*Unit 4 manifest/i,
  );

  const unresolvedComparison = structuredClone(fixture.artworks);
  const firstU4 = unresolvedComparison.find(({ unit }) => unit === 4);
  delete firstU4.comparisonNotes[firstU4.comparisonIds[0]];
  assert.throws(
    () => validateArtworks(unresolvedComparison, fixture.manifests, fixture.placeholders),
    /comparisonNotes must define/i,
  );
});

test('validator rejects Unit 4 placeholder leaks, status drift, and wrong restricted sets', async () => {
  const fixture = await loadCompleteUnits1234Fixture();
  const restrictedKey = Object.keys(fixture.placeholders)[0];
  const [restrictedArtworkId, restrictedViewId] = restrictedKey.split('::');

  const leaked = structuredClone(fixture.artworks);
  leaked
    .find(({ id }) => id === restrictedArtworkId)
    .images.find(({ id }) => id === restrictedViewId).imageUrl = 'https://invalid.test/leak.jpg';
  assert.throws(
    () => validateArtworks(leaked, fixture.manifests, fixture.placeholders),
    new RegExp(`${restrictedKey}.*public placeholder`, 'i'),
  );

  const missingStatus = structuredClone(fixture.artworks);
  delete missingStatus
    .find(({ id }) => id === restrictedArtworkId)
    .images.find(({ id }) => id === restrictedViewId).mediaStatus;
  assert.throws(
    () => validateArtworks(missingStatus, fixture.manifests, fixture.placeholders),
    new RegExp(`${restrictedKey}.*public placeholder`, 'i'),
  );

  const unapprovedNull = structuredClone(fixture.artworks);
  unapprovedNull.find(({ id }) => id === 'ap139-fallingwater').images[0].imageUrl = null;
  assert.throws(
    () => validateArtworks(unapprovedNull, fixture.manifests, fixture.placeholders),
    /ap139-fallingwater.*imageUrl.*non-empty/i,
  );

  const wrongPlaceholders = structuredClone(fixture.placeholders);
  delete wrongPlaceholders[restrictedKey];
  assert.throws(
    () => validateImageCredits(
      fixture.credits,
      fixture.artworks,
      fixture.rights,
      wrongPlaceholders,
    ),
    new RegExp(`placeholder keys.*${restrictedKey}`, 'i'),
  );

  const rightsMismatch = structuredClone(fixture.rights);
  rightsMismatch[4][restrictedKey].creatorOrInstitution = 'Altered creator';
  assert.throws(
    () => validateImageCredits(
      fixture.credits,
      fixture.artworks,
      rightsMismatch,
      fixture.placeholders,
    ),
    new RegExp(`${restrictedKey}.*creatorOrInstitution.*credit mismatch`, 'i'),
  );
});

test('validator accepts the complete rights-safe AP 1–166 release without changing Units 1–4', async () => {
  const [fixture, live] = await Promise.all([
    loadCompleteUnits12345Fixture(),
    loadDocumentData(),
  ]);

  assert.deepEqual(fixture.artworks.map(({ apNumber }) => apNumber), EXPECTED_RELEASE_AP_NUMBERS);
  assert.equal(fixture.artworks.length, 166);
  assert.equal(fixture.artworks.filter(({ unit }) => unit === 5).length, 14);
  assert.equal(
    fixture.artworks.filter(({ unit }) => unit === 5).flatMap(({ images }) => images).length,
    27,
  );
  const unit5Media = fixture.artworks.filter(({ unit }) => unit === 5).flatMap(({ images }) => images);
  const auditedRights = JSON.parse(await readFile(U5_RIGHTS_PATH, 'utf8'));
  assert.equal(unit5Media.filter(({ imageUrl }) => imageUrl !== null).length,
    Object.values(auditedRights).filter(row => row.releaseClass === 'open').length);
  assert.equal(unit5Media.filter(({ imageUrl }) => imageUrl === null).length,
    Object.values(auditedRights).filter(row => row.releaseClass === 'restricted').length);
  assert.deepEqual(
    [...new Set(fixture.artworks.filter(({ unit }) => unit === 5).map(({ region }) => region))].sort(),
    ['ancestralPueblo', 'centralAndes', 'easternWoodlands', 'mesoamerica', 'northwestCoast', 'plainsGreatBasin'],
  );
  assert.deepEqual(
    [...new Set(fixture.artworks.filter(({ unit }) => unit === 5)
      .map(({ traditionGroup }) => traditionGroup))].sort(),
    ['Ancient Central Andes', 'Ancient Mesoamerica', 'Ancient North America', 'Native North America'],
  );
  assert.ok(unit5Media.filter(({ imageUrl }) => imageUrl === null)
    .every(({ mediaStatus }) => mediaStatus === 'rightsRestricted'));
  assert.deepEqual(fixture.artworks.slice(0, 152), live.artworks.slice(0, 152));
  assert.deepEqual(
    Object.fromEntries(fixture.artworks.slice(0, 152).map(({ id }) => [id, fixture.credits[id]])),
    Object.fromEntries(live.artworks.slice(0, 152).map(({ id }) => [id, live.credits[id]])),
  );
  assertOrderedDeepEqual(
    fixture.artworks.slice(152),
    live.artworks.slice(152, 166),
    '$.release.liveU5.artworks',
  );
  assert.deepEqual(
    Object.keys(fixture.rights[5]),
    fixture.artworks.filter(({ unit }) => unit === 5).flatMap((artwork) => (
      artwork.images.map(({ id }) => `${artwork.id}::${id}`)
    )),
  );
  assert.deepEqual(
    Object.keys(fixture.placeholders[5]),
    fixture.artworks.filter(({ unit }) => unit === 5).flatMap((artwork) => (
      artwork.images.flatMap((media) => (
        media.imageUrl === null ? [`${artwork.id}::${media.id}`] : []
      ))
    )),
  );

  assert.equal(
    validateArtworks(fixture.artworks, fixture.manifests, fixture.placeholders),
    fixture.artworks,
  );
  assert.equal(
    validateImageCredits(fixture.credits, fixture.artworks, fixture.rights, fixture.placeholders),
    fixture.credits,
  );
});

test('validator rejects missing AP 153, extra AP 167, and duplicate AP 166', async () => {
  const fixture = await loadCompleteUnits12345Fixture();
  const missing = fixture.artworks.filter(({ apNumber }) => apNumber !== 153);
  const extra = [
    ...fixture.artworks,
    { ...structuredClone(fixture.artworks.at(-1)), id: 'ap167-extra', apNumber: 167 },
  ];
  const duplicate = structuredClone(fixture.artworks);
  duplicate[164].apNumber = 166;

  assertInvalidArtworkError(
    () => validateArtworks(missing, fixture.manifests, fixture.placeholders),
    [/166 works|1\.\.166|received 165/i, /Unit|official/i],
    'missing AP153',
  );
  assertInvalidArtworkError(
    () => validateArtworks(extra, fixture.manifests, fixture.placeholders),
    [/166 works|1\.\.166|received 167/i, /Unit|official/i],
    'extra AP167',
  );
  assertInvalidArtworkError(
    () => validateArtworks(duplicate, fixture.manifests, fixture.placeholders),
    [/duplicate AP number 166/i],
    'duplicate AP166',
  );
});

test('validator freezes every Unit 5 manifest identity, context field, and media order', async () => {
  const fixture = await loadCompleteUnits12345Fixture();
  const mutations = [
    ['title', (copy) => { copy.manifests[5][153].titleEn = 'Wrong title'; }, /AP 153.*manifest title/i],
    ['site', (copy) => { copy.manifests[5][154].siteName = 'Wrong site'; }, /AP 154.*siteName/i],
    ['region', (copy) => { copy.manifests[5][155].region = 'centralAndes'; }, /AP 155.*region/i],
    ['tradition', (copy) => { copy.manifests[5][156].traditionGroup = 'Native North America'; }, /AP 156.*traditionGroup/i],
    ['qualifier', (copy) => { copy.manifests[5][158].provenanceQualifier = 'Wrong qualifier'; }, /ap158.*provenanceQualifier|AP 158.*qualifier/i],
    ['view order', (copy) => { copy.artworks.find(({ apNumber }) => apNumber === 157).images.reverse(); }, /AP 157.*required views.*Unit 5/i],
    ['manifest field order', (copy) => {
      copy.manifests[5][153] = Object.fromEntries(Object.entries(copy.manifests[5][153]).reverse());
    }, /Unit 5 manifest AP 153.*schema.*first mismatch/i],
    ['invalid region', (copy) => {
      copy.manifests[5][164].region = 'invalidRegion';
      copy.artworks.find(({ apNumber }) => apNumber === 164).region = 'invalidRegion';
    }, /ap164-transformation-mask.*region.*Unit 5/i],
    ['invalid tradition', (copy) => {
      copy.manifests[5][165].traditionGroup = 'Invalid tradition';
      copy.artworks.find(({ apNumber }) => apNumber === 165).traditionGroup = 'Invalid tradition';
    }, /ap165-painted-elk-hide.*four approved Unit 5 traditions/i],
  ];

  for (const [label, mutate, pattern] of mutations) {
    const copy = structuredClone(fixture);
    mutate(copy);
    assertInvalidArtworkError(
      () => validateArtworks(copy.artworks, copy.manifests, copy.placeholders),
      [pattern],
      `Unit 5 ${label}`,
    );
  }
});

test('validator enforces the exact Unit 5 restricted placeholder authority', async () => {
  const fixture = await loadCompleteUnits12345Fixture();
  const restrictedKey = Object.keys(fixture.placeholders[5])[0];
  const openKey = Object.keys(fixture.rights[5]).find((key) => (
    fixture.rights[5][key].releaseClass === 'open'
  ));

  const missingAuthority = structuredClone(fixture);
  delete missingAuthority.placeholders[5][restrictedKey];
  assertInvalidArtworkError(
    () => validateImageCredits(
      missingAuthority.credits,
      missingAuthority.artworks,
      missingAuthority.rights,
      missingAuthority.placeholders,
    ),
    [/Unit 5.*placeholder keys/i, /missing/i, new RegExp(restrictedKey)],
    'missing restricted key',
  );

  const extraAuthority = structuredClone(fixture);
  extraAuthority.placeholders[5][openKey] = structuredClone(
    Object.values(extraAuthority.placeholders[5])[0],
  );
  assertInvalidArtworkError(
    () => validateImageCredits(
      extraAuthority.credits,
      extraAuthority.artworks,
      extraAuthority.rights,
      extraAuthority.placeholders,
    ),
    [/Unit 5.*placeholder keys/i, /extra/i, new RegExp(openKey)],
    'extra restricted key',
  );

  const unknownAuthority = structuredClone(fixture);
  unknownAuthority.placeholders[5]['ap999-unknown::primary'] = structuredClone(
    Object.values(unknownAuthority.placeholders[5])[0],
  );
  assertInvalidArtworkError(
    () => validateImageCredits(
      unknownAuthority.credits,
      unknownAuthority.artworks,
      unknownAuthority.rights,
      unknownAuthority.placeholders,
    ),
    [/Unit 5.*placeholder keys/i, /extra/i, /ap999-unknown::primary/i],
    'unknown restricted key',
  );
});

test('validator blocks Unit 5 placeholder URL leaks, null/status drift, and restricted non-null media', async () => {
  const fixture = await loadCompleteUnits12345Fixture();
  const restrictedKey = Object.keys(fixture.placeholders[5])[0];
  const openKey = Object.keys(fixture.rights[5]).find((key) => (
    fixture.rights[5][key].releaseClass === 'open'
  ));

  for (const [label, mutate, pattern] of [
    ['URL leak', (copy) => { findUnit5Media(copy, restrictedKey).media.imageUrl = 'https://invalid.test/leak.jpg'; }, new RegExp(`${restrictedKey}.*public placeholder`, 'i')],
    ['missing status', (copy) => { delete findUnit5Media(copy, restrictedKey).media.mediaStatus; }, new RegExp(`${restrictedKey}.*(?:raw media schema|public placeholder)`, 'i')],
    ['wrong status', (copy) => { findUnit5Media(copy, restrictedKey).media.mediaStatus = 'available'; }, new RegExp(`${restrictedKey}.*public placeholder`, 'i')],
    ['unapproved null', (copy) => { findUnit5Media(copy, openKey).media.imageUrl = null; }, new RegExp(`${openKey.split('::')[0]}.*imageUrl.*non-empty`, 'i')],
    ['non-null restricted', (copy) => { findUnit5Media(copy, restrictedKey).media.imageUrl = 'https://example.com/restricted.jpg'; }, new RegExp(`${restrictedKey}.*public placeholder`, 'i')],
    ['malformed media HTTPS', (copy) => { findUnit5Media(copy, openKey).media.imageUrl = 'http://invalid.test/image.jpg'; }, new RegExp(`${openKey.split('::')[0]}.*imageUrl.*HTTPS`, 'i')],
  ]) {
    const copy = structuredClone(fixture);
    mutate(copy);
    assertInvalidArtworkError(
      () => validateArtworks(copy.artworks, copy.manifests, copy.placeholders),
      [pattern],
      `Unit 5 ${label}`,
    );
  }
});

test('validator enforces exact Unit 5 rights keys, credits, schemas, URLs, and release triples', async () => {
  const fixture = await loadCompleteUnits12345Fixture();
  const firstKey = Object.keys(fixture.rights[5])[0];

  const missing = structuredClone(fixture);
  delete missing.rights[5][firstKey];
  assertInvalidArtworkError(
    () => validateImageCredits(missing.credits, missing.artworks, missing.rights, missing.placeholders),
    [/Unit 5.*rights audit/i, /missing/i, new RegExp(firstKey)],
    'missing U5 rights key',
  );

  const extraKey = 'ap999-extra::primary';
  const extra = structuredClone(fixture);
  extra.rights[5][extraKey] = structuredClone(extra.rights[5][firstKey]);
  assertInvalidArtworkError(
    () => validateImageCredits(extra.credits, extra.artworks, extra.rights, extra.placeholders),
    [/Unit 5.*rights audit/i, /extra/i, new RegExp(extraKey)],
    'extra U5 rights key',
  );

  const creditMismatch = structuredClone(fixture);
  creditMismatch.rights[5][firstKey].creatorOrInstitution = 'Wrong institution';
  assertInvalidArtworkError(
    () => validateImageCredits(
      creditMismatch.credits,
      creditMismatch.artworks,
      creditMismatch.rights,
      creditMismatch.placeholders,
    ),
    [new RegExp(`${firstKey}.*creatorOrInstitution.*credit mismatch`, 'i')],
    'U5 credit mismatch',
  );

  const wrongCreditShape = structuredClone(fixture);
  wrongCreditShape.credits['ap153-chavin-huantar'] = wrongCreditShape.credits['ap153-chavin-huantar'][0];
  assertInvalidArtworkError(
    () => validateImageCredits(
      wrongCreditShape.credits,
      wrongCreditShape.artworks,
      wrongCreditShape.rights,
      wrongCreditShape.placeholders,
    ),
    [/ap153-chavin-huantar.*multi-media.*array/i],
    'U5 credit shape',
  );

  const malformedHttps = structuredClone(fixture);
  mutateUnit5CreditAndRights(malformedHttps, firstKey, { licenseUrl: 'http://invalid.test/license' });
  assertInvalidArtworkError(
    () => validateImageCredits(
      malformedHttps.credits,
      malformedHttps.artworks,
      malformedHttps.rights,
      malformedHttps.placeholders,
    ),
    [new RegExp(`${firstKey}.*licenseUrl.*HTTPS`, 'i')],
    'U5 malformed HTTPS license',
  );

  const wrongPolicy = structuredClone(fixture);
  mutateUnit5CreditAndRights(wrongPolicy, firstKey, {
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  });
  assertInvalidArtworkError(
    () => validateImageCredits(
      wrongPolicy.credits,
      wrongPolicy.artworks,
      wrongPolicy.rights,
      wrongPolicy.placeholders,
    ),
    [new RegExp(`${firstKey}.*approved release policy`, 'i')],
    'U5 wrong release triple',
  );

  const wrongReleaseClass = structuredClone(fixture);
  wrongReleaseClass.rights[5][firstKey].releaseClass = 'restricted';
  assertInvalidArtworkError(
    () => validateImageCredits(
      wrongReleaseClass.credits,
      wrongReleaseClass.artworks,
      wrongReleaseClass.rights,
      wrongReleaseClass.placeholders,
    ),
    [new RegExp(`${firstKey}.*approved release policy`, 'i')],
    'U5 wrong release class',
  );
});

test('validator resolves Unit 5 comparisons and rejects duplicate U5 alt/source identities', async () => {
  const fixture = await loadCompleteUnits12345Fixture();

  const unresolved = structuredClone(fixture);
  unresolved.artworks.find(({ apNumber }) => apNumber === 153).comparisonIds = ['ap999-missing'];
  unresolved.artworks.find(({ apNumber }) => apNumber === 153).comparisonNotes = {
    'ap999-missing': '比较仪式功能与建筑形式。',
  };
  assertInvalidArtworkError(
    () => validateArtworks(unresolved.artworks, unresolved.manifests, unresolved.placeholders),
    [/ap153-chavin-huantar.*comparisonIds.*ap999-missing/i],
    'U5 unresolved comparison',
  );

  const duplicateAlt = structuredClone(fixture);
  const chavinAlt = duplicateAlt.artworks.find(({ apNumber }) => apNumber === 153);
  chavinAlt.images[1].imageAlt = chavinAlt.images[0].imageAlt;
  assertInvalidArtworkError(
    () => validateArtworks(duplicateAlt.artworks, duplicateAlt.manifests, duplicateAlt.placeholders),
    [/Unit 5.*duplicate imageAlt.*ap153-chavin-huantar::lanzon-stela.*plan/i],
    'U5 duplicate alt',
  );

  const duplicateSource = structuredClone(fixture);
  const chavinSource = duplicateSource.artworks.find(({ apNumber }) => apNumber === 153);
  chavinSource.images[1].imageSourceUrl = chavinSource.images[0].imageSourceUrl;
  assertInvalidArtworkError(
    () => validateArtworks(duplicateSource.artworks, duplicateSource.manifests, duplicateSource.placeholders),
    [/Unit 5.*duplicate imageSourceUrl.*ap153-chavin-huantar::lanzon-stela.*plan/i],
    'U5 duplicate source',
  );
});

test('validator rejects pseudo-HTTPS Unit 5 media and rights URLs with exact view context', async () => {
  const fixture = await loadCompleteUnits12345Fixture();
  const publicKey = Object.keys(fixture.rights[5]).find((key) => (
    fixture.rights[5][key].releaseClass === 'open'
  ));

  for (const [label, mutate, pattern] of [
    ['public image URL', (copy) => {
      findUnit5Media(copy, publicKey).media.imageUrl = 'https:///missing-host';
    }, new RegExp(`${publicKey}.*imageUrl.*HTTPS`, 'i')],
    ['public source URL', (copy) => {
      findUnit5Media(copy, publicKey).media.imageSourceUrl = 'https:example.com/path';
    }, new RegExp(`${publicKey}.*imageSourceUrl.*HTTPS`, 'i')],
  ]) {
    const copy = structuredClone(fixture);
    mutate(copy);
    assertInvalidArtworkError(
      () => validateArtworks(copy.artworks, copy.manifests, copy.placeholders),
      [pattern],
      `Unit 5 pseudo-HTTPS ${label}`,
    );
  }

  const malformedRights = structuredClone(fixture);
  mutateUnit5CreditAndRights(malformedRights, publicKey, {
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/\n',
  });
  assertInvalidArtworkError(
    () => validateImageCredits(
      malformedRights.credits,
      malformedRights.artworks,
      malformedRights.rights,
      malformedRights.placeholders,
    ),
    [new RegExp(`${publicKey}.*licenseUrl.*HTTPS`, 'i')],
    'Unit 5 pseudo-HTTPS rights URL',
  );
});

test('validator enforces strict finished bilingual Unit 5 study contracts', async () => {
  const fixture = await loadCompleteUnits12345Fixture();
  const cases = [
    ['unfinished title', (work) => { work.titleZh = 'TBD'; }, /ap153-chavin-huantar\.titleZh.*unfinished/i],
    ['unfinished study', (work) => { work.function = 'TODO 待补'; }, /ap153-chavin-huantar\.function.*unfinished/i],
    ['missing Han', (work) => { work.content = 'Finished English-only content'; }, /ap153-chavin-huantar\.content.*Han|Chinese/i],
    ['duplicate anchors', (work) => { work.recognitionAnchors[1] = work.recognitionAnchors[0]; }, /ap153-chavin-huantar\.recognitionAnchors.*duplicate/i],
    ['too many anchors', (work) => { work.recognitionAnchors.push('第四个识别锚点', '第五个识别锚点'); }, /ap153-chavin-huantar\.recognitionAnchors.*2\.\.4/i],
    ['duplicate keywords', (work) => { work.keywords[1] = work.keywords[0]; }, /ap153-chavin-huantar\.keywords.*duplicate/i],
    ['unfinished keyword', (work) => { work.keywords[0] = 'placeholder'; }, /ap153-chavin-huantar\.keywords\[0\].*unfinished/i],
    ['no Han keyword', (work) => { work.keywords = ['Chavin', 'Lanzon', 'Pilgrimage']; }, /ap153-chavin-huantar\.keywords.*Han|Chinese/i],
    ['self comparison', (work) => {
      work.comparisonIds = [work.id];
      work.comparisonNotes = { [work.id]: '比较仪式功能和建筑形式。' };
    }, /ap153-chavin-huantar\.comparisonIds.*self/i],
    ['duplicate comparison', (work) => { work.comparisonIds.push(work.comparisonIds[0]); }, /ap153-chavin-huantar\.comparisonIds.*duplicate/i],
    ['comparison note order', (work) => {
      work.comparisonIds.push('ap46-pantheon');
      work.comparisonNotes = {
        'ap46-pantheon': '比较两者的仪式空间形式。',
        [work.comparisonIds[0]]: work.comparisonNotes[work.comparisonIds[0]],
      };
    }, /ap153-chavin-huantar\.comparisonNotes.*first mismatch/i],
    ['unfinished comparison note', (work) => {
      work.comparisonNotes[work.comparisonIds[0]] = 'TODO 待补';
    }, /ap153-chavin-huantar\.comparisonNotes.*unfinished/i],
    ['comparison note without basis', (work) => {
      work.comparisonNotes[work.comparisonIds[0]] = '这是一条完整的中文说明。';
    }, /ap153-chavin-huantar\.comparisonNotes.*explicit comparison basis/i],
  ];

  for (const [label, mutate, pattern] of cases) {
    const copy = structuredClone(fixture);
    mutate(copy.artworks.find(({ apNumber }) => apNumber === 153));
    assertInvalidArtworkError(
      () => validateArtworks(copy.artworks, copy.manifests, copy.placeholders),
      [pattern],
      `Unit 5 study ${label}`,
    );
  }
});

test('validator rejects unfinished values in every Unit 5 descriptive metadata field', async () => {
  const fixture = await loadCompleteUnits12345Fixture();
  const fields = ['culture', 'period', 'artistCulture', 'date', 'medium', 'workType'];

  for (const field of fields) {
    const copy = structuredClone(fixture);
    copy.artworks.find(({ apNumber }) => apNumber === 153)[field] = 'TBD';
    assertInvalidArtworkError(
      () => validateArtworks(copy.artworks, copy.manifests, copy.placeholders),
      [new RegExp(`ap153-chavin-huantar\\.${field}.*unfinished`, 'i')],
      `Unit 5 unfinished ${field}`,
    );
  }
});

test('validator requires exact ordered raw Unit 5 media schemas with exact view context', async () => {
  const fixture = await loadCompleteUnits12345Fixture();
  const publicKey = Object.keys(fixture.rights[5]).find((key) => (
    fixture.rights[5][key].releaseClass === 'open'
  ));
  const restrictedKey = Object.keys(fixture.placeholders[5])[0];
  const cases = [
    ['unexpected public field', publicKey, (media) => { media.unexpected = true; }],
    ['missing public field', publicKey, (media) => { delete media.imageAlt; }],
    ['reordered public fields', publicKey, (media, holder) => {
      const reversed = Object.fromEntries(Object.entries(media).reverse());
      Object.keys(media).forEach((key) => delete media[key]);
      Object.assign(media, reversed);
      holder.expected = 'first mismatch';
    }],
    ['missing restricted status', restrictedKey, (media) => { delete media.mediaStatus; }],
    ['wrong restricted status', restrictedKey, (media) => { media.mediaStatus = 'available'; }],
  ];

  for (const [label, mediaKey, mutate] of cases) {
    const copy = structuredClone(fixture);
    const holder = { expected: 'schema|mediaStatus|public placeholder' };
    mutate(findUnit5Media(copy, mediaKey).media, holder);
    assertInvalidArtworkError(
      () => validateArtworks(copy.artworks, copy.manifests, copy.placeholders),
      [new RegExp(mediaKey), new RegExp(holder.expected, 'i')],
      `Unit 5 raw media ${label}`,
    );
  }
});

test('validator reports exact missing and extra Unit 3 rights media keys', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const missingKey = Object.keys(fixture.rights)[0];
  const missing = structuredClone(fixture.rights);
  delete missing[missingKey];
  assertInvalidArtworkError(
    () => validateImageCredits(fixture.credits, fixture.artworks, missing),
    [/rights audit/i, /missing/i, new RegExp(missingKey)],
    'missing rights media key',
  );

  const extraKey = 'ap99-extra::primary';
  const extra = {
    ...fixture.rights,
    [extraKey]: structuredClone(fixture.rights[missingKey]),
  };
  assertInvalidArtworkError(
    () => validateImageCredits(fixture.credits, fixture.artworks, extra),
    [/rights audit/i, /extra/i, new RegExp(extraKey)],
    'extra rights media key',
  );
});

test('validator enforces the exact reviewed Unit 3 release-class distribution', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const mediaKey = 'ap48-catacomb-priscilla::greek-chapel';
  patchAlignedUnit3Credit(fixture, mediaKey, {
    licenseName: 'CC BY-NC-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  });
  fixture.rights[mediaKey].releaseClass = 'noncommercial';

  assertInvalidArtworkError(
    () => validateImageCredits(fixture.credits, fixture.artworks, fixture.rights),
    [/release class distribution/i, /99 open/i, /2 noncommercial/i],
    'release distribution mismatch',
  );
});

test('validator rejects incomplete, mismatched, unknown, and restricted U3 rights audits', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  assert.throws(
    () => validateImageCredits(fixture.credits, fixture.artworks),
    /Unit 3.*rights audit.*required/i,
  );

  const firstKey = Object.keys(fixture.rights)[0];
  const cases = [
    {
      label: 'missing media key',
      mutate: (rights) => delete rights[firstKey],
      pattern: /rights audit.*media keys.*exactly|missing.*media key/i,
    },
    {
      label: 'extra media key',
      mutate: (rights) => {
        rights['ap99-extra::primary'] = { ...rights[firstKey] };
      },
      pattern: /rights audit.*media keys.*exactly|extra.*media key/i,
    },
    {
      label: 'credit mismatch',
      mutate: (rights) => {
        rights[firstKey].creatorOrInstitution = 'Altered creator';
      },
      pattern: /rights audit.*credit mismatch|creatorOrInstitution.*canonical credit/i,
    },
    {
      label: 'unknown release class',
      mutate: (rights) => {
        rights[firstKey].releaseClass = 'unknown';
      },
      pattern: /releaseClass.*(?:unknown|unsupported|allowed)/i,
    },
    {
      label: 'restricted media',
      mutate: (rights) => {
        rights[firstKey].releaseClass = 'restricted';
      },
      pattern: /restricted.*(?:release|media)|release.*restricted/i,
    },
  ];

  for (const { label, mutate, pattern } of cases) {
    const rights = structuredClone(fixture.rights);
    mutate(rights);
    assert.throws(
      () => validateImageCredits(fixture.credits, fixture.artworks, rights),
      pattern,
      label,
    );
  }
});

test('validator resolves Unit 3 comparison targets across the complete AP 1–98 set', async () => {
  const fixture = await loadCompleteUnits123Fixture();
  const copy = structuredClone(fixture.artworks);
  copy.find(({ apNumber }) => apNumber === 60).comparisonIds = ['missing-work'];

  assert.throws(
    () => validateArtworks(copy, fixture.manifests),
    /ap60-chartres-cathedral.*comparisonIds.*unknown.*missing-work/i,
  );
});

test('validator requires a provenance qualifier for AP6 broad-region placement', async () => {
  const { artworks, manifests } = await loadCompleteFixture();
  const copy = structuredClone(artworks);
  const ap6Index = copy.findIndex(({ id }) => id === 'ap6-anthropomorphic-stele');
  delete copy[ap6Index].siteQualifier;

  assert.throws(
    () => validateArtworks(copy, manifests),
    /Invalid artwork data:.*ap6-anthropomorphic-stele.*siteQualifier/i,
  );
});

test('validator requires every Unit 1 work to retain comparison targets', async () => {
  const { artworks, manifests } = await loadCompleteFixture();
  const copy = structuredClone(artworks);
  copy[0] = { ...copy[0], comparisonIds: [] };

  assert.throws(
    () => validateArtworks(copy, manifests),
    /Invalid artwork data:.*comparisonIds.*non-empty/i,
  );
});

test('validator rejects duplicate Stonehenge image alt text across distinct views', async () => {
  const { artworks, manifests } = await loadCompleteFixture();
  const copy = structuredClone(artworks);
  const stonehenge = copy.find(({ id }) => id === 'ap8-stonehenge');
  stonehenge.images[1].imageAlt = stonehenge.images[0].imageAlt;

  assert.throws(
    () => validateArtworks(copy, manifests),
    /Invalid artwork data:.*ap8-stonehenge.*duplicate.*imageAlt/i,
  );
});

test('validator rejects duplicate Stonehenge source URLs across distinct views', async () => {
  const { artworks, manifests } = await loadCompleteFixture();
  const copy = structuredClone(artworks);
  const stonehenge = copy.find(({ id }) => id === 'ap8-stonehenge');
  stonehenge.images[1].imageSourceUrl = stonehenge.images[0].imageSourceUrl;

  assert.throws(
    () => validateArtworks(copy, manifests),
    /Invalid artwork data:.*ap8-stonehenge.*duplicate.*imageSourceUrl/i,
  );
});

test('validator rejects duplicate Stonehenge credit metadata across distinct views', async () => {
  const { artworks, credits } = await loadCompleteFixture();
  const copy = structuredClone(credits);
  const stonehengeId = 'ap8-stonehenge';
  copy[stonehengeId][1] = {
    ...copy[stonehengeId][0],
  };

  assert.throws(
    () => validateImageCredits(copy, artworks),
    /Invalid artwork data:.*ap8-stonehenge.*duplicate.*credit/i,
  );
});

test('validator enforces Unit 1 media counts and complete media fields', async () => {
  const { artworks, manifests } = await loadCompleteFixture();
  const stonehengeIndex = artworks.findIndex(({ apNumber }) => apNumber === 8);
  const apolloIndex = artworks.findIndex(({ apNumber }) => apNumber === 1);
  const whiteTempleIndex = artworks.findIndex(({ apNumber }) => apNumber === 12);
  const cases = [
    {
      label: 'Stonehenge requires two views',
      mutate: (copy) => {
        copy[stonehengeIndex] = {
          ...copy[stonehengeIndex],
          images: copy[stonehengeIndex].images.slice(0, 1),
        };
      },
    },
    {
      label: 'other Unit 1 works require one view',
      mutate: (copy) => {
        copy[apolloIndex] = {
          ...copy[apolloIndex],
          images: [...copy[apolloIndex].images, {
            ...copy[apolloIndex].images[0],
            label: 'Extra view',
            imageUrl: 'https://example.com/extra.jpg',
          }],
        };
      },
    },
    {
      label: 'Unit 2 works require one view',
      mutate: (copy) => {
        const work = copy[whiteTempleIndex];
        const primary = normalizeArtworkMedia(work)[0];
        copy[whiteTempleIndex] = {
          ...work,
          images: [
            primary,
            {
              ...primary,
              label: 'Extra view',
              imageUrl: 'https://example.com/u2-extra.jpg',
            },
          ],
        };
      },
    },
    {
      label: 'media URL must be unique within a work',
      mutate: (copy) => {
        copy[stonehengeIndex] = {
          ...copy[stonehengeIndex],
          images: copy[stonehengeIndex].images.map((media, index) => ({
            ...media,
            imageUrl: index === 0
              ? media.imageUrl
              : copy[stonehengeIndex].images[0].imageUrl,
          })),
        };
      },
    },
    {
      label: 'images array cannot be empty',
      mutate: (copy) => {
        copy[apolloIndex] = { ...copy[apolloIndex], images: [] };
      },
    },
    {
      label: 'media fields cannot be blank',
      mutate: (copy) => {
        copy[apolloIndex] = {
          ...copy[apolloIndex],
          images: [{ ...copy[apolloIndex].images[0], imageAlt: '' }],
        };
      },
    },
    {
      label: 'media URLs must be HTTP(S)',
      mutate: (copy) => {
        copy[apolloIndex] = {
          ...copy[apolloIndex],
          images: [{ ...copy[apolloIndex].images[0], imageSourceUrl: 'file:///source' }],
        };
      },
    },
  ];

  for (const fixture of cases) {
    const copy = structuredClone(artworks);
    fixture.mutate(copy);
    assert.throws(
      () => validateArtworks(copy, manifests),
      /media|images|view|image|HTTP|duplicate/i,
      fixture.label,
    );
  }
});

test('validator enforces unit ranges, regions, AP order, coordinates, and comparisons', async () => {
  const { artworks, manifests } = await loadCompleteFixture();
  const cases = [
    {
      label: 'Unit 1 region',
      mutate: (copy) => {
        copy[0] = { ...copy[0], region: 'southernEurope' };
      },
    },
    {
      label: 'Unit 2 range',
      mutate: (copy) => {
        copy[11] = { ...copy[11], unit: 1 };
      },
    },
    {
      label: 'official order',
      mutate: (copy) => {
        [copy[0], copy[1]] = [copy[1], copy[0]];
      },
    },
    {
      label: 'SVG coordinate bounds',
      mutate: (copy) => {
        copy[0] = { ...copy[0], coordinates: { x: 1601, y: 800 } };
      },
    },
    {
      label: 'comparison resolution',
      mutate: (copy) => {
        copy[0] = { ...copy[0], comparisonIds: ['missing-work'] };
      },
    },
  ];

  for (const fixture of cases) {
    const copy = structuredClone(artworks);
    fixture.mutate(copy);
    assert.throws(
      () => validateArtworks(copy, manifests),
      /region|unit|range|order|coordinate|comparison|unknown/i,
      fixture.label,
    );
  }

  const boundaryCoordinates = structuredClone(artworks);
  boundaryCoordinates[0] = {
    ...boundaryCoordinates[0],
    coordinates: { x: 1600, y: 800 },
  };
  assert.equal(validateArtworks(boundaryCoordinates, manifests), boundaryCoordinates);
});

test('imports the exact nine missing works with approved classification metadata', async () => {
  const artworks = await loadValidatedLiveArtworks();

  for (const expected of EXPECTED_NEW_WORKS) {
    const artwork = artworks.find(({ id }) => id === expected.id);
    assert.ok(artwork, `missing ${expected.id}`);
    assert.equal(artwork.apNumber, expected.apNumber, `${expected.id} AP number`);
    assert.equal(artwork.titleEn, expected.title, `${expected.id} title`);
    assert.equal(artwork.siteName, expected.site, `${expected.id} site`);
    assert.equal(artwork.culture, expected.culture, `${expected.id} culture`);
    assert.equal(artwork.region, expected.region, `${expected.id} region`);
    assert.equal(artwork.unit, 2, `${expected.id} unit`);
  }
});

test('assigns exactly 11, 36, 51, 54, 14, and 14 works to Units 1 through 6', async () => {
  const artworks = await loadValidatedLiveArtworks();

  assert.equal(artworks.filter(({ unit }) => unit === 1).length, 11);
  assert.equal(artworks.filter(({ unit }) => unit === 2).length, 36);
  assert.equal(artworks.filter(({ unit }) => unit === 3).length, 51);
  assert.equal(artworks.filter(({ unit }) => unit === 4).length, 54);
  assert.equal(artworks.filter(({ unit }) => unit === 5).length, 14);
  assert.equal(artworks.filter(({ unit }) => unit === 6).length, 14);
  for (const artwork of artworks) {
    assert.ok([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(artwork.unit), `${artwork.id} must be in Units 1–10`);
    assert.equal(typeof artwork.culture, 'string', `${artwork.id} must have a culture`);
    assert.ok(artwork.culture.trim(), `${artwork.id} must have a non-empty culture`);
    assert.equal(typeof artwork.region, 'string', `${artwork.id} must have a region`);
    assert.ok(artwork.region.trim(), `${artwork.id} must have a non-empty region`);
    assert.equal('civilization' in artwork, false, `${artwork.id} must not retain civilization`);
  }
});

test('keeps one image per Unit 1 work except Stonehenge with exactly two', async () => {
  const { artworks, credits } = await loadDocumentData();
  const unit1Artworks = artworks.filter(({ unit }) => unit === 1);

  assert.equal(unit1Artworks.length, 11);
  for (const artwork of unit1Artworks) {
    const media = normalizeArtworkMedia(artwork);
    const workCredits = Array.isArray(credits[artwork.id])
      ? credits[artwork.id]
      : [credits[artwork.id]];
    assert.equal(
      media.length,
      artwork.apNumber === 8 ? 2 : 1,
      `${artwork.id} media count`,
    );
    assert.equal(workCredits.length, media.length, `${artwork.id} credit count`);
  }
});

test('uses unique artwork ids and AP numbers', async () => {
  const artworks = await loadValidatedLiveArtworks();
  const ids = artworks.map(({ id }) => id);
  const apNumbers = artworks.map(({ apNumber }) => apNumber);

  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(apNumbers).size, apNumbers.length);
});

test('resolves comparison ids and keeps coordinates inside the map', async () => {
  const artworks = await loadValidatedLiveArtworks();
  const ids = new Set(artworks.map(({ id }) => id));

  for (const artwork of artworks) {
    assert.ok(artwork.coordinates.x >= 0 && artwork.coordinates.x <= 1600);
    assert.ok(artwork.coordinates.y >= 0 && artwork.coordinates.y <= 800);
    for (const comparisonId of artwork.comparisonIds) {
      assert.ok(ids.has(comparisonId), `${artwork.id} references unknown ${comparisonId}`);
    }
  }
});

test('keeps the approved AP 27 source coordinates', async () => {
  const artworks = await loadValidatedLiveArtworks();
  const kouros = artworks.find(({ id }) => id === 'ap27-anavysos-kouros');

  assert.deepEqual(kouros?.coordinates, { x: 405, y: 285 });
});
