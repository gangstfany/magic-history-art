import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const HTML_PATH = new URL('../art-history-map.html', import.meta.url);
const SOURCE_WORKSHEET_PATH = new URL(
  '../docs/data-sources/u2-missing-works.md',
  import.meta.url,
);
const EXPECTED_CED_SOURCE = '[College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf)';
const ORIGINAL_ARTWORK_IDS = [
  'ap13-palette-of-king-narmer',
  'ap15-seated-scribe',
  'ap17-great-pyramids-giza',
  'ap18-king-menkaura-and-queen',
  'ap20-temple-of-amun-re-karnak',
  'ap21-mortuary-temple-hatshepsut',
  'ap22-akhenaten-nefertiti-daughters',
  'ap23-tutankhamun-innermost-coffin',
  'ap24-last-judgment-of-hunefer',
  'ap26-athenian-agora',
  'ap27-anavysos-kouros',
  'ap28-peplos-kore',
  'ap33-niobides-krater',
  'ap34-doryphoros',
  'ap35-athenian-acropolis',
  'ap36-grave-stele-hegeso',
  'ap37-winged-victory-samothrace',
  'ap38-great-altar-pergamon',
  'ap39-house-of-the-vettii',
  'ap40-alexander-mosaic',
  'ap41-seated-boxer',
  'ap42-head-of-a-roman-patrician',
  'ap43-augustus-prima-porta',
  'ap44-colosseum',
  'ap45-forum-of-trajan',
  'ap46-pantheon',
  'ap47-ludovisi-battle-sarcophagus',
];
const NEW_ARTWORK_IDS = [
  'ap12-white-temple-ziggurat',
  'ap14-statues-votive-figures',
  'ap16-standard-of-ur',
  'ap19-code-of-hammurabi',
  'ap25-lamassu-sargon-ii',
  'ap29-sarcophagus-of-the-spouses',
  'ap30-apadana-darius-xerxes',
  'ap31-temple-minerva-apollo',
  'ap32-tomb-of-the-triclinium',
];
const PRIVATE_OVERRIDE_FIELDS = [
  'filePath',
  'creatorOrInstitution',
  'rightsNote',
  'rightsUrl',
];
const EXPECTED_U4_PRIVATE_MEDIA_KEYS = [
  'ap140-two-fridas::primary',
  'ap143-dream-alameda-central::primary',
  'ap146-marilyn-diptych::primary',
  'ap148-narcissus-garden::primary',
  'ap149-bay::primary',
  'ap150-lipstick-caterpillar-tracks::primary',
  'ap152-house-new-castle-county::exterior',
  'ap152-house-new-castle-county::interior',
];
const EXPECTED_U5_PRIVATE_MEDIA_KEYS = [
  'ap153-chavin-huantar::relief-sculpture',
  'ap155-yaxchilan::structure-40',
  'ap157-templo-mayor::reconstruction',
  'ap160-maize-cobs::primary',
  'ap163-bandolier-bag::primary',
  'ap164-transformation-mask::closed',
  'ap164-transformation-mask::open',
  'ap165-painted-elk-hide::primary',
  'ap166-black-on-black-vessel::primary',
];
const REQUIRED_U3_COMPARISON_NOTES = [
  {
    sourceId:'ap49-santa-sabina',
    targetId:'ap46-pantheon',
    basis:[
      '中轴式长厅以高侧窗、侧廊、列柱和木构屋顶组织行进',
      '传统门廊连接圆形穹顶大厅',
      '服务会众共同参与的基督教礼仪',
    ],
  },
  {
    sourceId:'ap52-hagia-sophia',
    targetId:'ap46-pantheon',
    basis:[
      '帆拱承托巨型穹顶',
      '作为帝国主教座堂举行东正教礼仪',
      '敬奉诸神并关联皇帝与宇宙秩序',
    ],
  },
  {
    sourceId:'ap58-church-sainte-foy',
    targetId:'ap23-tutankhamun-innermost-coffin',
    basis:[
      '珠宝圣物箱构成整体',
      '实心黄金人形棺',
      '圣髑崇敬',
    ],
  },
  {
    sourceId:'ap81-codex-mendoza-frontispiece',
    targetId:'ap19-code-of-hammurabi',
    basis:[
      '贡赋与社会习俗',
      '王室司法纪念物宣示法律',
      '神授正义',
    ],
  },
  {
    sourceId:'ap89-ecstasy-saint-teresa',
    targetId:'ap46-pantheon',
    basis:[
      '彩色大理石和包厢肖像融合雕塑建筑',
      '天主教感化',
      '罗马混凝土技术创造前所未有的统一内部空间',
    ],
  },
];
const EXPECTED_NEW_ARTWORK_MEDIA = {
  'ap12-white-temple-ziggurat': {
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Uruk_(3).jpg',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Uruk_(3).jpg',
    creatorOrInstitution: '摄影：tobeytravels；来源机构：Wikimedia Commons',
    licenseName: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
  },
  'ap14-statues-votive-figures': {
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Sumerian_Status_from_Tell_Asmar,_part_of_the_Tell_Asmar_Hoard.jpg',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Sumerian_Status_from_Tell_Asmar,_part_of_the_Tell_Asmar_Hoard.jpg',
    creatorOrInstitution: '摄影：Osama Shukir Muhammed Amin FRCP(Glasg)；来源机构：Wikimedia Commons',
    licenseName: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  'ap16-standard-of-ur': {
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Denis_Bourez_-_British_Museum,_London_(8747049029)_(2).jpg',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Denis_Bourez_-_British_Museum,_London_(8747049029)_(2).jpg',
    creatorOrInstitution: '摄影：Denis Bourez；来源机构：Wikimedia Commons / British Museum',
    licenseName: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  'ap19-code-of-hammurabi': {
    imageUrl: 'https://www.worldhistory.org/image/14341/code-of-hammurabi/download/',
    imageSourceUrl: 'https://www.worldhistory.org/image/14341/code-of-hammurabi/',
    creatorOrInstitution: '摄影：Larry Koester；来源机构：World History Encyclopedia / Louvre Museum',
    licenseName: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  'ap25-lamassu-sargon-ii': {
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Lamassu_(Winged_Bull)_of_Throne_Room_of_Palace_of_Sargon_II,_Khorsabad,_Assyria_(28218791021).jpg',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Lamassu_(Winged_Bull)_of_Throne_Room_of_Palace_of_Sargon_II,_Khorsabad,_Assyria_(28218791021).jpg',
    creatorOrInstitution: '摄影：Gary Todd；来源机构：Wikimedia Commons / Louvre Museum',
    licenseName: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  'ap29-sarcophagus-of-the-spouses': {
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Sarcofago_degli_Sposi_Villa_Giulia.jpg',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Sarcofago_degli_Sposi_Villa_Giulia.jpg',
    creatorOrInstitution: '摄影：Tutorialwiki；来源机构：Wikimedia Commons / Museo Nazionale Etrusco di Villa Giulia',
    licenseName: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  'ap30-apadana-darius-xerxes': {
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Persepolis_-_Apadana_01.jpg',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Persepolis_-_Apadana_01.jpg',
    creatorOrInstitution: '摄影：Bernard Gagnon；来源机构：Wikimedia Commons',
    licenseName: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  'ap31-temple-minerva-apollo': {
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Reconstruction_of_the_Apollo_temple_from_the_Portonaccio_sanctuary.jpg',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Reconstruction_of_the_Apollo_temple_from_the_Portonaccio_sanctuary.jpg',
    creatorOrInstitution: '作者：unknown；来源机构：Wikimedia Commons / tDAR',
    licenseName: 'Public domain (PD-ineligible)',
    licenseUrl: 'https://commons.wikimedia.org/wiki/File:Reconstruction_of_the_Apollo_temple_from_the_Portonaccio_sanctuary.jpg',
  },
  'ap32-tomb-of-the-triclinium': {
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Pittore_forse_attico,_affreschi_della_tomba_del_triclinio,_500-475_ac_ca,_01.jpg',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Pittore_forse_attico,_affreschi_della_tomba_del_triclinio,_500-475_ac_ca,_01.jpg',
    creatorOrInstitution: '摄影：Sailko；来源机构：Wikimedia Commons / Museo Archeologico Nazionale di Tarquinia；许可提示：个人/学习用途允许，其他用途（尤其商业再利用）须另行获得意大利文化遗产主管部门授权',
    licenseName: 'CC BY 3.0；另受意大利文化遗产再利用授权限制',
    licenseUrl: 'https://commons.wikimedia.org/wiki/File:Pittore_forse_attico,_affreschi_della_tomba_del_triclinio,_500-475_ac_ca,_01.jpg',
  },
};
const EXPECTED_SOURCE_WORKSHEET_ROWS = [
  {
    ap: '12',
    id: '`ap12-white-temple-ziggurat`',
    study: '`APAH notes.pdf`, p. 6<br>[Smarthistory — White Temple and ziggurat](https://smarthistory.org/white-temple-and-ziggurat-uruk/)',
    image: '[Uncropped White Temple and ziggurat view](https://commons.wikimedia.org/wiki/File:Uruk_(3).jpg)',
    creator: 'tobeytravels / Wikimedia Commons',
    license: '[CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/)',
    visual: 'complete subject visible; identity cross-checked with CED and Smarthistory',
  },
  {
    ap: '14',
    id: '`ap14-statues-votive-figures`',
    study: '`APAH notes.pdf`, p. 7<br>[Smarthistory — Standing Male Worshipper (Tell Asmar)](https://smarthistory.org/standing-male-worshipper-from-the-square-temple-at-eshnunna-tell-asmar/)',
    image: '[Tell Asmar votive figures](https://commons.wikimedia.org/wiki/File:Sumerian_Status_from_Tell_Asmar,_part_of_the_Tell_Asmar_Hoard.jpg)',
    creator: 'Osama Shukir Muhammed Amin FRCP(Glasg) / Wikimedia Commons',
    license: '[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)',
  },
  {
    ap: '16',
    id: '`ap16-standard-of-ur`',
    study: '`APAH notes.pdf`, pp. 8–9<br>[Smarthistory — Standard of Ur](https://smarthistory.org/standard-of-ur-2/)',
    image: '[Standard of Ur — complete object view](https://commons.wikimedia.org/wiki/File:Denis_Bourez_-_British_Museum,_London_(8747049029)_(2).jpg)',
    creator: 'Denis Bourez / Wikimedia Commons / British Museum',
    license: '[CC BY 2.0](https://creativecommons.org/licenses/by/2.0/)',
  },
  {
    ap: '19',
    id: '`ap19-code-of-hammurabi`',
    study: '`APAH notes.pdf`, pp. 10–11<br>[Smarthistory — Law Code Stele of King Hammurabi](https://smarthistory.org/hammurabi-2/)',
    image: '[Code of Hammurabi](https://www.worldhistory.org/image/14341/code-of-hammurabi/)',
    creator: 'Larry Koester / World History Encyclopedia / Louvre Museum',
    license: '[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)',
  },
  {
    ap: '25',
    id: '`ap25-lamassu-sargon-ii`',
    study: '`APAH notes.pdf`, pp. 14–15<br>[Smarthistory — Lamassu from the citadel of Sargon II](https://smarthistory.org/lamassu-from-the-citadel-of-sargon-ii/)',
    image: '[Lamassu from Sargon II’s palace](https://commons.wikimedia.org/wiki/File:Lamassu_%28Winged_Bull%29_of_Throne_Room_of_Palace_of_Sargon_II,_Khorsabad,_Assyria_%2828218791021%29.jpg)',
    creator: 'Gary Todd / Wikimedia Commons / Louvre Museum',
    license: '[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)',
  },
  {
    ap: '29',
    id: '`ap29-sarcophagus-of-the-spouses`',
    study: '`APAH notes.pdf`, p. 16<br>[Smarthistory — Sarcophagus of the Spouses (Rome)](https://smarthistory.org/sarcophagus-of-the-spouses-rome/)',
    image: '[Sarcophagus of the Spouses](https://commons.wikimedia.org/wiki/File:Sarcofago_degli_Sposi_Villa_Giulia.jpg)',
    creator: 'Tutorialwiki / Wikimedia Commons / Museo Nazionale Etrusco di Villa Giulia',
    license: '[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)',
  },
  {
    ap: '30',
    id: '`ap30-apadana-darius-xerxes`',
    study: '`APAH notes.pdf`, p. 17<br>[Smarthistory — Persepolis: The Audience Hall of Darius and Xerxes](https://smarthistory.org/persepolis-the-audience-hall-of-darius-and-xerxes/)',
    image: '[Persepolis — Apadana](https://commons.wikimedia.org/wiki/File:Persepolis_-_Apadana_01.jpg)',
    creator: 'Bernard Gagnon / Wikimedia Commons',
    license: '[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)',
  },
  {
    ap: '31',
    id: '`ap31-temple-minerva-apollo`',
    study: '`APAH notes.pdf`, pp. 17–18<br>[Smarthistory — Temple of Minerva and the sculpture of Apollo (Veii)](https://smarthistory.org/temple-of-minerva-and-the-sculpture-of-apollo-veii/)',
    image: '[Portonaccio Apollo temple reconstruction](https://commons.wikimedia.org/wiki/File:Reconstruction_of_the_Apollo_temple_from_the_Portonaccio_sanctuary.jpg)',
    creator: 'unknown / Wikimedia Commons / tDAR',
    license: '[Public domain (PD-ineligible)](https://commons.wikimedia.org/wiki/File:Reconstruction_of_the_Apollo_temple_from_the_Portonaccio_sanctuary.jpg)',
    visual: 'temple architecture and rooftop Apollo ensemble visible in one image',
  },
  {
    ap: '32',
    id: '`ap32-tomb-of-the-triclinium`',
    study: '`APAH notes.pdf`, pp. 18–19<br>[Smarthistory — Tomb of the Triclinium](https://smarthistory.org/tomb-of-the-triclinium/)',
    image: '[Tomb of the Triclinium frescoes](https://commons.wikimedia.org/wiki/File:Pittore_forse_attico,_affreschi_della_tomba_del_triclinio,_500-475_ac_ca,_01.jpg)',
    creator: 'Sailko / Wikimedia Commons / Museo Archeologico Nazionale di Tarquinia',
    license: '[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/); Italian cultural-heritage rules permit personal/study use, but require further authorization for other uses, especially commercial reuse ([Commons warning](https://commons.wikimedia.org/wiki/File:Pittore_forse_attico,_affreschi_della_tomba_del_triclinio,_500-475_ac_ca,_01.jpg))',
  },
];

async function loadHtml() {
  return readFile(HTML_PATH, 'utf8');
}

function parseJsonBlock(html, id) {
  const match = html.match(new RegExp(
    `<script id="${id}" type="application/json">([\\s\\S]*?)<\\/script>`,
  ));
  assert.ok(match, `missing ${id} JSON block`);
  return JSON.parse(match[1]);
}

function getFunctionSource(html, functionName) {
  const signature = `function ${functionName}(`;
  const start = html.indexOf(signature);
  assert.notEqual(start, -1, `missing ${functionName}()`);
  const openBrace = html.indexOf('{', html.indexOf(')', start));
  let depth = 0;
  for (let index = openBrace; index < html.length; index += 1) {
    if (html[index] === '{') depth += 1;
    if (html[index] === '}') depth -= 1;
    if (depth === 0) return html.slice(start, index + 1);
  }
  assert.fail(`unterminated ${functionName}()`);
}

function getPrivateMediaRuntimeSource(html) {
  const start = html.indexOf('const U4_PRIVATE_MEDIA_KEYS = Object.freeze([');
  assert.notEqual(start, -1, 'missing production U4 private media descriptor source');
  const end = html.indexOf('const PRIVATE_MEDIA_MODE =', start);
  assert.notEqual(end, -1, 'missing production private media mode boundary');
  return html.slice(start, end);
}

function evaluatePrivateMediaRuntimeSource(source) {
  return Function(
    `"use strict"; ${source}; return {
      U4_PRIVATE_MEDIA_KEYS,
      U5_PRIVATE_MEDIA_KEYS,
      PRIVATE_MEDIA_BUNDLES,
    };`,
  )();
}

function extractPrivateMediaRuntime(html) {
  return evaluatePrivateMediaRuntimeSource(getPrivateMediaRuntimeSource(html));
}

function assertPrivateMediaDescriptorContract(runtime, u5Authority) {
  assert.deepEqual(runtime.U4_PRIVATE_MEDIA_KEYS, EXPECTED_U4_PRIVATE_MEDIA_KEYS);
  assert.deepEqual(runtime.U5_PRIVATE_MEDIA_KEYS, Object.keys(u5Authority));
  assert.deepEqual(runtime.U5_PRIVATE_MEDIA_KEYS, EXPECTED_U5_PRIVATE_MEDIA_KEYS);
  assert.equal(runtime.PRIVATE_MEDIA_BUNDLES.length, 2);
  const expected = [
    {
      unit:4,
      globalName:'AP_ART_HISTORY_PRIVATE_MEDIA_U4',
      scriptPath:'.private-media/u4/overrides.js',
      pathSource:'^\\.private-media\\/u4\\/[a-z0-9-]+\\.(?:jpe?g|png|webp)$',
      keys:EXPECTED_U4_PRIVATE_MEDIA_KEYS,
    },
    {
      unit:5,
      globalName:'AP_ART_HISTORY_PRIVATE_MEDIA_U5',
      scriptPath:'.private-media/u5/overrides.js',
      pathSource:'^\\.private-media\\/u5\\/[a-z0-9-]+\\.(?:jpe?g|png|webp)$',
      keys:EXPECTED_U5_PRIVATE_MEDIA_KEYS,
    },
  ];
  runtime.PRIVATE_MEDIA_BUNDLES.forEach((bundle, index) => {
    assert.ok(Object.isFrozen(bundle), `production U${bundle.unit} descriptor frozen`);
    assert.deepEqual(
      {
        unit:bundle.unit,
        globalName:bundle.globalName,
        scriptPath:bundle.scriptPath,
        pathSource:bundle.pathPattern.source,
        keys:bundle.keys,
      },
      expected[index],
      `production U${expected[index].unit} private descriptor`,
    );
    assert.strictEqual(bundle.keys, index === 0
      ? runtime.U4_PRIVATE_MEDIA_KEYS
      : runtime.U5_PRIVATE_MEDIA_KEYS);
  });
}

function createPrivateMediaLoaderHarness(html, routes = {}, privateMode = true) {
  const requests = [];
  const window = {};
  const document = {
    createElement(tagName) {
      assert.equal(tagName, 'script');
      return {
        src:'',
        onload:null,
        onerror:null,
        removed:false,
        remove() { this.removed = true; },
      };
    },
    head:{
      append(script) {
        requests.push(script.src);
        const route = routes[script.src] ?? { type:'error' };
        if (route.type === 'timeout') return;
        queueMicrotask(() => {
          if (route.type === 'load') {
            window[route.globalName] = route.value;
            script.onload?.();
          } else {
            script.onerror?.();
          }
        });
      },
    },
  };
  const runtime = extractPrivateMediaRuntime(html);
  const sources = [
    'isPlainObject',
    'assertExactPrivateFields',
    'assertHttpsUrl',
    'validatePrivateMediaOverrides',
    'loadPrivateBundle',
    'mergePrivateMediaBundles',
    'loadPrivateMediaOverrides',
  ].map((name) => {
    const source = getFunctionSource(html, name);
    return name === 'loadPrivateMediaOverrides'
      ? source.replace('function loadPrivateMediaOverrides', 'async function loadPrivateMediaOverrides')
      : source;
  }).join('\n');
  const api = Function(
    'document',
    'window',
    'PRIVATE_OVERRIDE_FIELDS',
    'PRIVATE_MEDIA_BUNDLES',
    'PRIVATE_MEDIA_MODE',
    `"use strict"; ${sources}; return {
      validatePrivateMediaOverrides,
      loadPrivateBundle,
      mergePrivateMediaBundles,
      loadPrivateMediaOverrides,
    };`,
  )(
    document,
    window,
    PRIVATE_OVERRIDE_FIELDS,
    runtime.PRIVATE_MEDIA_BUNDLES,
    privateMode,
  );
  return { ...api, requests, window, runtime, bundles:runtime.PRIVATE_MEDIA_BUNDLES };
}

class FakeNode {
  constructor(tagName = '#text', ownerDocument = null, value = '') {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.listeners = {};
    this.parentNode = null;
    this.className = '';
    this.id = '';
    this._textContent = value;
  }

  get textContent() {
    return this.children.length
      ? this.children.map((child) => child.textContent).join('')
      : this._textContent;
  }

  set textContent(value) {
    this.children = [];
    this._textContent = String(value);
  }

  append(...nodes) {
    for (const node of nodes) {
      const child = typeof node === 'string'
        ? new FakeNode('#text', this.ownerDocument, node)
        : node;
      child.parentNode = this;
      this.children.push(child);
    }
  }

  replaceChildren(...nodes) {
    this.children.forEach((child) => {
      child.parentNode = null;
    });
    this.children = [];
    this._textContent = '';
    this.append(...nodes);
  }

  replaceWith(node) {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    this.parentNode.children.splice(index, 1, node);
    node.parentNode = this.parentNode;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  addEventListener(type, listener) {
    (this.listeners[type] ||= []).push(listener);
  }

  click() {
    this.onclick?.({ target:this });
    for (const listener of this.listeners.click ?? []) listener({ target:this });
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  get classList() {
    return {
      contains: (name) => this.className.split(/\s+/).includes(name),
    };
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      const className = selector.startsWith('.') ? selector.slice(1) : null;
      const id = selector.match(/^#([a-zA-Z][\w-]*)$/)?.[1];
      const role = selector.match(/^\[role="([^"]+)"\]$/)?.[1];
      const selectedArtworkTitle = selector === '[data-selected-artwork-title]';
      const tagName = /^[a-z]+$/i.test(selector) ? selector.toUpperCase() : null;
      if (
        (className && node.classList.contains(className))
        || (id && node.id === id)
        || (role && node.getAttribute('role') === role)
        || (selectedArtworkTitle && Object.hasOwn(node.dataset, 'selectedArtworkTitle'))
        || (tagName && node.tagName === tagName)
      ) matches.push(node);
      node.children.forEach(visit);
    };
    this.children.forEach(visit);
    return matches;
  }

  querySelector(selector) {
    const dataTab = selector.match(/^\[data-tab="([^"]+)"\]$/)?.[1];
    if (dataTab) {
      return this.find((node) => node.dataset.tab === dataTab);
    }
    return this.querySelectorAll(selector)[0] ?? null;
  }

  find(predicate) {
    if (predicate(this)) return this;
    for (const child of this.children) {
      const result = child.find?.(predicate);
      if (result) return result;
    }
    return null;
  }

  contains(candidate) {
    return this === candidate
      || this.children.some((child) => child.contains?.(candidate));
  }
}

function createDetailHarness(
  html,
  artworks,
  credits,
  stateOverrides = {},
  privateOverrides = {},
  privateMode = false,
) {
  const elements = new Map();
  const document = {
    activeElement:null,
    createElement(tagName) {
      return new FakeNode(tagName, document);
    },
    createTextNode(value) {
      return new FakeNode('#text', document, value);
    },
    getElementById(id) {
      return elements.get(id);
    },
  };
  for (const [id, tagName] of [
    ['dialogMedia', 'div'],
    ['dialogTitle', 'h2'],
    ['dialogCaption', 'p'],
    ['dialogCredit', 'p'],
    ['dialogLicense', 'a'],
    ['dialogSource', 'a'],
    ['dialogClose', 'button'],
  ]) {
    const element = document.createElement(tagName);
    element.id = id;
    elements.set(id, element);
  }
  const imageDialog = document.createElement('dialog');
  imageDialog.showModal = () => {
    if (imageDialog.open) {
      throw new Error('InvalidStateError: dialog is already open');
    }
    imageDialog.open = true;
  };
  imageDialog.close = () => {
    if (!imageDialog.open) return;
    imageDialog.open = false;
    for (const listener of imageDialog.listeners.close ?? []) {
      listener({ target:imageDialog });
    }
  };
  const state = {
    activeDetailTab:'quick',
    selectedSiteIndex:0,
    ...stateOverrides,
  };
  const detailPanel = document.createElement('aside');
  const scrollCalls = [];
  detailPanel.scrollTo = (options) => scrollCalls.push(options);
  const sources = [
    getFunctionSource(html, 'installImageFallback'),
    getFunctionSource(html, 'getArtworkImages'),
    getFunctionSource(html, 'getArtworkImageCredits'),
    getFunctionSource(html, 'createImageCredit'),
    getFunctionSource(html, 'createRightsPlaceholder'),
    getFunctionSource(html, 'resolveMediaView'),
    getFunctionSource(html, 'summarizeComparisonField'),
    getFunctionSource(html, 'createComparisonAngle'),
    getFunctionSource(html, 'openImageDialog'),
    getFunctionSource(html, 'focusSelectedArtworkHeading'),
    getFunctionSource(html, 'isUnmappedWork'),
    getFunctionSource(html, 'selectComparison'),
    getFunctionSource(html, 'renderArtworkDetails'),
  ].join('\n');
  return Function(
    'document',
    'IMAGE_CREDITS',
    'ARTWORKS',
    'imageDialog',
    'state',
    'detailPanel',
    'scrollCalls',
    'privateMediaOverrides',
    'PRIVATE_MEDIA_MODE',
    `"use strict";
      let imageDialogTrigger = null;
      let artworkMediaRenderGeneration = 0;
      let syncedControls = null;
      // This harness isolates detail DOM. Camera geometry is covered by the
      // real-browser production map verifier; preserve the new camera seam here.
      const cameraCalls = [];
      const focusSelectedWork = () => cameraCalls.push('focus');
      const applyTransform = () => cameraCalls.push('apply');
      const formatArtworkMeta = () => 'meta';
      const createStudyBlock = (title, ...paragraphs) => {
        const block = document.createElement('section');
        block.textContent = [title, ...paragraphs].join(' ');
        return block;
      };
      const cycleSite = () => {};
      const syncFilterControls = () => {
        syncedControls = {
        unit:state.unit,
        culture:state.culture,
        period:state.period,
        workType:state.workType,
        search:state.search,
        };
      };
      const render = () => {
        const selected = ARTWORKS.find((work) => work.id === state.selectedId);
        detailPanel.replaceChildren(renderArtworkDetails(selected, { works:[selected] }));
      };
      ${sources}
      document.getElementById('dialogClose').addEventListener('click', () => imageDialog.close());
      imageDialog.addEventListener('close', () => {
        imageDialogTrigger?.focus();
        imageDialogTrigger = null;
      });
      return {
        getArtworkImages,
        getArtworkImageCredits,
        createRightsPlaceholder,
        renderArtworkDetails,
        getDialogTrigger: () => imageDialogTrigger,
        isDialogOpen: () => imageDialog.open,
        closeDialog: () => imageDialog.close(),
        getDialogMedia: () => document.getElementById('dialogMedia'),
        getActiveElement: () => document.activeElement,
        getSelectedSiteIndex: () => state.selectedSiteIndex,
        createComparisonAngle,
        renderSelected: render,
        getDetailPanel: () => detailPanel,
        getState: () => state,
        getSyncedControls: () => syncedControls,
        getScrollCalls: () => scrollCalls,
        getCameraCalls: () => cameraCalls,
      };`,
  )(
    document,
    credits,
    artworks,
    imageDialog,
    state,
    detailPanel,
    scrollCalls,
    privateOverrides,
    privateMode,
  );
}

function parseSourceWorksheet(markdown) {
  return markdown
    .split('\n')
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => {
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim());
      assert.equal(cells.length, 8, `worksheet row must have exactly 8 cells: ${line}`);
      const [ap, id, identifying, study, image, creator, license, visual] = cells;
      return { ap, id, identifying, study, image, creator, license, visual };
    });
}

function assertCurrentDetailHeadingFocus(detailPanel, expectedTitle) {
  const currentHeading = detailPanel.querySelector('#detailTitle');
  assert.ok(currentHeading, 'the current detail render must contain #detailTitle');
  assert.equal(currentHeading.textContent, expectedTitle);
  assert.ok(
    detailPanel.contains(currentHeading),
    '#detailTitle must belong to the current detail render',
  );
  assert.ok(
    detailPanel.ownerDocument.activeElement === currentHeading,
    'focus must be on the current live detail heading, not a detached heading with the same id',
  );
  return currentHeading;
}

test('detail view exposes four accessible study tabs', async () => {
  const html = await loadHtml();

  assert.match(html, /setAttribute\(['"]role['"], ['"]tablist['"]\)/);
  assert.match(html, /setAttribute\(['"]role['"], ['"]tab['"]\)/);
  assert.match(html, /setAttribute\(['"]aria-selected['"]/);
  assert.match(html, /setAttribute\(['"]aria-controls['"], ['"]detail-tabpanel['"]\)/);
  for (const label of ['速览', '形式', '语境', '比较']) {
    assert.ok(html.includes(label), `missing ${label} tab`);
  }
});

test('standalone map copy and accessible map labels cover all 250 Units 1-10 works worldwide', async () => {
  const html = await loadHtml();

  assert.match(html, /<h1>AP 艺术史互动地图 · Units 1-10<\/h1>/);
  assert.doesNotMatch(html, /<h1>[^<]*Unit 2 古代地中海[^<]*<\/h1>/);
  assert.match(
    html,
    /<p class="subtitle">Units 1-10：从全球史前艺术、古代地中海到 U5 Indigenous Americas 、U6 Africa（非洲）、U7 West and Central Asia（西亚与中亚）与 U8 South, East, and Southeast Asia（南亚、东亚与东南亚），以地点连接全部 250 件作品、传统与历史语境。<\/p>/,
  );
  assert.match(
    html,
    /<section id="mapPanel" class="map-panel" aria-label="完整世界地图；展示 AP 艺术史 Units 1-10 全部 250 件作品在非洲、欧洲、亚洲、大洋洲与美洲的全球分布，包含 U6 Africa（非洲）、U7 West and Central Asia（西亚与中亚）与 U8 South, East, and Southeast Asia（南亚、东亚与东南亚）">/,
  );
  assert.match(
    html,
    /<svg class="map-svg"[^>]+aria-label="AP 艺术史 Units 1-10 完整世界地图，标记全部 250 件作品在非洲、欧洲、亚洲、大洋洲与美洲的全球分布，包含 U6 Africa（非洲）、U7 West and Central Asia（西亚与中亚）与 U8 South, East, and Southeast Asia（南亚、东亚与东南亚）">/,
  );
  assert.doesNotMatch(html, /Units 1-2/);
  assert.doesNotMatch(html, /当前作品地点集中在古代地中海/);
  assert.doesNotMatch(html, /当前艺术史作品标记集中在古代地中海/);
});

test('Unit 3 detail metadata keeps precise traditions distinct from broad filter groups', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data').filter(({ unit }) => unit === 3);
  const traditionStart = html.indexOf('const TRADITION_LABELS =');
  const traditionEnd = html.indexOf('const UNIT_FILTER_CONFIG =', traditionStart);
  assert.notEqual(traditionStart, -1);
  assert.notEqual(traditionEnd, -1);
  const sources = [
    html.slice(traditionStart, traditionEnd),
    getFunctionSource(html, 'getCultureLabel'),
    getFunctionSource(html, 'formatArtworkMeta'),
  ].join('\n');
  const { TRADITION_LABELS, formatArtworkMeta } = Function(
    `"use strict"; ${sources}; return { TRADITION_LABELS, formatArtworkMeta };`,
  )();

  assert.deepEqual(
    [...new Set(artworks.map(({ culture }) => culture))]
      .filter((culture) => !TRADITION_LABELS[culture]),
    [],
  );
  const chartres = artworks.find(({ apNumber }) => apNumber === 60);
  const metadata = formatArtworkMeta(chartres);
  assert.match(metadata, /· 法国哥特式 ·/);
  assert.doesNotMatch(metadata, /中世纪与伊斯兰/);
  assert.equal(chartres.culture, 'frenchGothic');
  assert.equal(chartres.traditionGroup, 'medievalIslamic');
});

test('Unit 5 detail metadata resolves every precise culture without undefined labels', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data').filter(({ unit }) => unit === 5);
  const traditionStart = html.indexOf('const TRADITION_LABELS =');
  const traditionEnd = html.indexOf('const UNIT_FILTER_CONFIG =', traditionStart);
  const sources = [
    html.slice(traditionStart, traditionEnd),
    getFunctionSource(html, 'getCultureLabel'),
    getFunctionSource(html, 'formatArtworkMeta'),
  ].join('\n');
  const { TRADITION_LABELS, formatArtworkMeta } = Function(
    `"use strict"; ${sources}; return { TRADITION_LABELS, formatArtworkMeta };`,
  )();

  assert.equal(artworks.length, 14);
  for (const work of artworks) {
    assert.ok(TRADITION_LABELS[work.culture], `missing ${work.culture}`);
    const metadata = formatArtworkMeta(work);
    assert.doesNotMatch(metadata, /undefined/);
    assert.match(metadata, new RegExp(`· ${TRADITION_LABELS[work.culture].labelZh.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} ·`));
  }
});

test('Unit 6 detail metadata resolves every exact culture and tradition in both languages', async () => {
  const html = await loadHtml();
  const works = parseJsonBlock(html, 'artwork-data').filter(({ unit }) => unit === 6);
  const start = html.indexOf('const TRADITION_LABELS =');
  const end = html.indexOf('const UNIT_FILTER_CONFIG =', start);
  const sources = [html.slice(start, end), getFunctionSource(html, 'getCultureLabel'),
    getFunctionSource(html, 'formatArtworkMeta')].join('\n');
  const { TRADITION_LABELS, formatArtworkMeta } = Function(
    `${sources}; return { TRADITION_LABELS, formatArtworkMeta };`,
  )();
  assert.equal(works.length, 14);
  for (const work of works) {
    for (const key of [work.culture, work.traditionGroup]) {
      assert.ok(TRADITION_LABELS[key]?.labelEn?.trim(), `${key} English`);
      assert.ok(TRADITION_LABELS[key]?.labelZh?.trim(), `${key} Chinese`);
    }
    const metadata = formatArtworkMeta(work);
    assert.doesNotMatch(metadata, /undefined/);
    assert.ok(metadata.includes(TRADITION_LABELS[work.culture].labelZh));
  }
});

test('Unit 3 detail location rows render every exact provenance qualifier', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const harness = createDetailHarness(html, artworks, credits);
  const expectedLocations = new Map([
    [50, 'Syria or Palestine · Made in Syria or Palestine; the precise workshop is not securely localized.'],
    [53, 'Early medieval Europe · The Louvre records Jouy-le-Comte as the findspot; the manufacturing workshop is not securely localized, so the map uses a broad early medieval European anchor.'],
    [55, 'Northumbria, England · Made in Northumbria, probably at Lindisfarne; Eadfrith is the traditionally attributed scribe-artist.'],
    [59, 'England or Normandy · Probably embroidered in England for a Norman patron; the precise workshop and original display setting remain debated.'],
    [62, 'Rhineland, Germany · Made in the Rhineland; the precise workshop and original devotional setting are not securely localized.'],
    [68, 'Flanders, present-day Belgium · Made in Flanders, probably Bruges; the sitters’ identities and original domestic setting remain debated.'],
  ]);

  for (const [apNumber, expectedLocation] of expectedLocations) {
    const work = artworks.find((artwork) => artwork.apNumber === apNumber);
    const details = harness.renderArtworkDetails(work, { works:[work] });
    const locationRow = details.querySelectorAll('.identity-row').find(
      (row) => row.querySelector('dt')?.textContent === '地点',
    );

    assert.equal(
      locationRow?.querySelector('dd')?.textContent,
      expectedLocation,
      `AP ${apNumber} provenance-qualified location`,
    );
  }
});

test('comparison navigation resolves targets without rewriting artwork data', async () => {
  const html = await loadHtml();
  const selectComparison = html.match(
    /function selectComparison\(comparisonId\) \{([\s\S]*?)\n    \}/,
  )?.[1];

  assert.match(html, /function selectComparison\(/);
  assert.ok(selectComparison, 'missing selectComparison() body');
  assert.match(selectComparison, /expandedSiteToken:\s*null/);
  assert.match(html, /comparisonIds/);
  assert.match(html, /dataset\.comparisonId/);
  assert.match(html, /function createComparisonAngle\(/);
  assert.match(html, /形式：/);
  assert.match(html, /功能：/);
  assert.match(html, /语境：/);
  assert.match(selectComparison, /unit:\s*String\(target\.unit\)/);
  assert.match(selectComparison, /activeUnit:\s*target\.unit/);
  assert.match(selectComparison, /focusSelectedArtworkHeading\(\)/);
});

test('comparison navigation clears conflicting filters when crossing Units 1 and 2', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const source = getFunctionSource(html, 'selectComparison');
  const state = {};
  const calls = [];
  let renderedSelectedId = null;
  const detailPanel = {
    scrollTo(options) {
      calls.push('scroll');
      assert.deepEqual(options, { top:0, behavior:'smooth' });
    },
  };
  const selectComparison = Function(
    'ARTWORKS',
    'state',
    'focusSelectedWork',
    'applyTransform',
    'syncFilterControls',
    'render',
    'focusSelectedArtworkHeading',
    'detailPanel',
    `"use strict";
      ${getFunctionSource(html, 'isUnmappedWork')}
      ${source}
      return selectComparison;`,
  )(
    artworks,
    state,
    () => {},
    () => {},
    () => { calls.push('sync'); },
    () => {
      renderedSelectedId = state.selectedId;
      calls.push('render');
    },
    () => {
      assert.equal(
        renderedSelectedId,
        state.selectedId,
        'focus must run after render creates the newly selected artwork title',
      );
      calls.push('focus');
    },
    detailPanel,
  );
  const u1Target = artworks.find(({ unit }) => unit === 1);
  const u2Target = artworks.find(({ unit }) => unit === 2);

  Object.assign(state, {
    unit:'1',
    culture:'prehistoricNamibia',
    period:'Paleolithic',
    workType:'rock art',
    search:'cave',
    selectedId:u1Target.id,
    selectedSiteIndex:4,
    expandedSiteToken:'u1:africa',
    activeUnit:1,
    activeRegion:'africa',
    pendingFocusParentKey:'u1:africa',
    activeDetailTab:'compare',
  });
  selectComparison(u2Target.id);
  assert.deepEqual(state, {
    unit:'2',
    culture:'all',
    period:'',
    workType:'',
    search:'',
    selectedId:u2Target.id,
    selectedSiteIndex:0,
    expandedSiteToken:null,
    activeUnit:2,
    activeRegion:null,
    pendingFocusParentKey:null,
    activeDetailTab:'quick',
  });
  assert.deepEqual(calls, ['sync', 'render', 'focus', 'scroll']);

  calls.length = 0;
  renderedSelectedId = null;
  Object.assign(state, {
    culture:'rome',
    period:'Imperial Roman',
    workType:'architecture',
    search:'Rome',
    selectedSiteIndex:2,
    expandedSiteToken:'u2:southernEurope',
    activeRegion:'southernEurope',
    pendingFocusParentKey:'u2:southernEurope',
    activeDetailTab:'form',
  });
  selectComparison(u1Target.id);
  assert.deepEqual(state, {
    unit:'1',
    culture:'all',
    period:'',
    workType:'',
    search:'',
    selectedId:u1Target.id,
    selectedSiteIndex:0,
    expandedSiteToken:null,
    activeUnit:1,
    activeRegion:null,
    pendingFocusParentKey:null,
    activeDetailTab:'quick',
  });
  assert.deepEqual(calls, ['sync', 'render', 'focus', 'scroll']);
});

test('required U3 cross-unit comparison notes retain their canonical basis', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const harness = createDetailHarness(html, artworks, credits);

  for (const { sourceId, targetId, basis } of REQUIRED_U3_COMPARISON_NOTES) {
    const source = artworks.find(({ id }) => id === sourceId);
    const target = artworks.find(({ id }) => id === targetId);
    assert.ok(source.comparisonIds.includes(targetId));
    const note = harness.createComparisonAngle(source, target);

    assert.ok(note.trim(), `${sourceId} comparison note must not be empty`);
    assert.match(note, /^联系：.+形式：.+功能：.+语境：.+$/);
    for (const expectedBasis of basis) {
      assert.ok(
        note.includes(expectedBasis),
        `${sourceId} -> ${targetId} must retain basis "${expectedBasis}"`,
      );
    }
  }
});

test('U3 comparison card clears incompatible filters and focuses AP 46 in Unit 2', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const harness = createDetailHarness(html, artworks, credits, {
    unit:'3',
    culture:'baroqueColonial',
    period:'Spanish Colonial Baroque',
    workType:'Casta painting',
    search:'mestizo',
    selectedId:'ap89-ecstasy-saint-teresa',
    selectedSiteIndex:3,
    expandedSiteToken:'u3:italyVatican',
    activeUnit:3,
    activeRegion:'italyVatican',
    pendingFocusParentKey:'u3:italyVatican',
    activeDetailTab:'compare',
  });

  harness.renderSelected();
  const sourceHeading = harness.getDetailPanel().querySelector('#detailTitle');
  assert.equal(sourceHeading.textContent, 'Ecstasy of Saint Teresa');
  sourceHeading.focus();
  const comparisonCard = harness.getDetailPanel().find(
    (node) => node.dataset.comparisonId === 'ap46-pantheon',
  );
  assert.ok(comparisonCard, 'AP 89 comparison UI must expose AP 46');
  comparisonCard.click();

  assert.deepEqual(harness.getState(), {
    unit:'2',
    culture:'all',
    period:'',
    workType:'',
    search:'',
    selectedId:'ap46-pantheon',
    selectedSiteIndex:0,
    expandedSiteToken:null,
    activeUnit:2,
    activeRegion:null,
    pendingFocusParentKey:null,
    activeDetailTab:'quick',
  });
  assert.deepEqual(harness.getSyncedControls(), {
    unit:'2',
    culture:'all',
    period:'',
    workType:'',
    search:'',
  });
  assert.equal(
    harness.getDetailPanel().find(
      (node) => node.dataset.selectedArtworkTitle === '',
    )?.textContent,
    'Pantheon',
    'the incompatible U3 filters must not hide the selected U2 target',
  );
  const currentHeading = assertCurrentDetailHeadingFocus(
    harness.getDetailPanel(),
    'Pantheon',
  );
  assert.equal(currentHeading.id, 'detailTitle');
  assert.equal(sourceHeading.id, currentHeading.id);
  assert.notStrictEqual(
    currentHeading,
    sourceHeading,
    'AP46 must render a new heading rather than reuse the detached AP89 heading',
  );
  assert.equal(
    harness.getDetailPanel().contains(sourceHeading),
    false,
    'the prior AP89 heading must be detached after rendering AP46',
  );

  const focusedHeading = harness.getDetailPanel().ownerDocument.activeElement;
  harness.getDetailPanel().ownerDocument.activeElement = sourceHeading;
  assert.throws(
    () => assertCurrentDetailHeadingFocus(harness.getDetailPanel(), 'Pantheon'),
    /current live detail heading/,
    'a detached stale heading with the same id must not satisfy the focus contract',
  );
  harness.getDetailPanel().ownerDocument.activeElement = focusedHeading;
  assert.strictEqual(
    assertCurrentDetailHeadingFocus(harness.getDetailPanel(), 'Pantheon'),
    currentHeading,
  );
  assert.deepEqual(
    harness.getScrollCalls(),
    [{ top:0, behavior:'smooth' }],
  );
});

test('image dialog supports labelled media, attribution, and focus restoration', async () => {
  const html = await loadHtml();

  assert.match(html, /<dialog id="imageDialog"[^>]*aria-labelledby="dialogTitle"/);
  assert.match(html, /id="dialogTitle"/);
  assert.match(html, /id="dialogImage"/);
  assert.match(html, /id="dialogSource"/);
  assert.match(html, /id="dialogCredit"/);
  assert.match(html, /id="dialogLicense"/);
  assert.match(html, /function openImageDialog\(/);
  assert.match(html, /imageDialogTrigger\?\.isConnected/);
  assert.match(html, /detailPanel\.querySelector\('\.artwork-image-button'\)/);
  assert.match(html, /focusTarget\?\.focus\(\)/);
});

test('private media bundle constants preserve exact U4 keys and match the U5 authority order', async () => {
  const html = await loadHtml();
  const authority = JSON.parse(await readFile(
    new URL('../data/ap-art-history-unit-5-placeholder-authority.json', import.meta.url),
    'utf8',
  ));
  const runtime = extractPrivateMediaRuntime(html);
  const verifier = await import('../scripts/verify-art-history-browser.mjs');

  assertPrivateMediaDescriptorContract(runtime, authority);
  assert.deepEqual(verifier.U4_PRIVATE_MEDIA_KEYS, runtime.U4_PRIVATE_MEDIA_KEYS);
  assert.deepEqual(verifier.U5_PRIVATE_MEDIA_KEYS, runtime.U5_PRIVATE_MEDIA_KEYS);
  assert.deepEqual(
    verifier.PRIVATE_MEDIA_BUNDLES.map((bundle) => ({
      unit:bundle.unit,
      globalName:bundle.globalName,
      scriptPath:bundle.scriptPath,
      pathSource:bundle.pathPattern.source,
      keys:bundle.keys,
    })),
    runtime.PRIVATE_MEDIA_BUNDLES.map((bundle) => ({
      unit:bundle.unit,
      globalName:bundle.globalName,
      scriptPath:bundle.scriptPath,
      pathSource:bundle.pathPattern.source,
      keys:bundle.keys,
    })),
    'browser verifier descriptors must exactly match the production runtime',
  );
});

test('private media descriptor contract rejects missing, reordered, and misrouted production source', async () => {
  const html = await loadHtml();
  const authority = JSON.parse(await readFile(
    new URL('../data/ap-art-history-unit-5-placeholder-authority.json', import.meta.url),
    'utf8',
  ));
  const source = getPrivateMediaRuntimeSource(html);
  const mutations = [
    source.replace("      'ap166-black-on-black-vessel::primary'\n", ''),
    source.replace('AP_ART_HISTORY_PRIVATE_MEDIA_U5', 'AP_ART_HISTORY_PRIVATE_MEDIA_U4'),
    source.replace("scriptPath:'.private-media/u5/overrides.js'", "scriptPath:'.private-media/u5/wrong.js'"),
    source.replace(
      'pathPattern:/^\\.private-media\\/u5\\/',
      'pathPattern:/^\\.private-media\\/u4\\/',
    ),
    source
      .replace('ap153-chavin-huantar::relief-sculpture', '__FIRST_U5_KEY__')
      .replace('ap155-yaxchilan::structure-40', 'ap153-chavin-huantar::relief-sculpture')
      .replace('__FIRST_U5_KEY__', 'ap155-yaxchilan::structure-40'),
  ];

  for (const mutatedSource of mutations) {
    assert.throws(
      () => assertPrivateMediaDescriptorContract(
        evaluatePrivateMediaRuntimeSource(mutatedSource),
        authority,
      ),
      assert.AssertionError,
    );
  }
});

test('unit-scoped private override validation is exact, strict, and fail-closed', async () => {
  const html = await loadHtml();
  const harness = createPrivateMediaLoaderHarness(html);
  const { validatePrivateMediaOverrides } = harness;
  const validEntry = {
    filePath:'.private-media/u4/two-fridas.jpg',
    creatorOrInstitution:'Private study copy',
    rightsNote:'Local educational reference only',
    rightsUrl:'https://example.org/rights',
  };
  const u4 = harness.bundles[0];
  const u5 = harness.bundles[1];
  const valid = validatePrivateMediaOverrides({ [EXPECTED_U4_PRIVATE_MEDIA_KEYS[0]]:validEntry }, u4);

  assert.deepEqual(valid, { [EXPECTED_U4_PRIVATE_MEDIA_KEYS[0]]:validEntry });
  assert.ok(Object.isFrozen(valid));
  assert.ok(Object.isFrozen(valid[EXPECTED_U4_PRIVATE_MEDIA_KEYS[0]]));
  assert.deepEqual(validatePrivateMediaOverrides(null, u4), {});
  assert.throws(() => validatePrivateMediaOverrides([], u4), /U4.*must be a plain object/);
  assert.throws(
    () => validatePrivateMediaOverrides(Object.create({ inherited:true }), u4),
    /U4.*must be a plain object/,
  );
  assert.throws(
    () => validatePrivateMediaOverrides({ [EXPECTED_U5_PRIVATE_MEDIA_KEYS[0]]:validEntry }, u4),
    /Unapproved U4 private media key/,
  );
  assert.throws(
    () => validatePrivateMediaOverrides({ [EXPECTED_U4_PRIVATE_MEDIA_KEYS[0]]:{
      ...validEntry,
      filePath:'.private-media/u5/two-fridas.jpg',
    } }, u5),
    /Unapproved U5 private media key/,
  );
  for (const filePath of [
    'https://example.org/image.jpg',
    '/Users/student/image.jpg',
    '.private-media/u4/../image.jpg',
    '.private-media/u3/image.jpg',
    '.private-media/u5/image.jpg',
    '.private-media/u4/image.svg',
    '.private-media/u4/image.jpg?download=1',
    '.private-media/u4/image.jpg#view',
  ]) {
    assert.throws(
      () => validatePrivateMediaOverrides({
        [EXPECTED_U4_PRIVATE_MEDIA_KEYS[0]]:{ ...validEntry, filePath },
      }, u4),
      /invalid private path/,
      filePath,
    );
  }
  for (const entry of [
    { ...validEntry, extra:'nope' },
    {
      filePath:validEntry.filePath,
      creatorOrInstitution:validEntry.creatorOrInstitution,
      rightsNote:validEntry.rightsNote,
    },
  ]) {
    assert.throws(
      () => validatePrivateMediaOverrides({ [EXPECTED_U4_PRIVATE_MEDIA_KEYS[0]]:entry }, u4),
      /schema mismatch/,
    );
  }
  for (const rightsUrl of [
    'javascript:alert(1)',
    'http://example.org/rights',
    'https:example.org/rights',
    'HTTPS://example.org/rights',
    'https://',
    'https://example.org/with space',
    'https://example.org/with\nnewline',
  ]) {
    assert.throws(
      () => validatePrivateMediaOverrides({
        [EXPECTED_U4_PRIVATE_MEDIA_KEYS[0]]:{ ...validEntry, rightsUrl },
      }, u4),
      /expected HTTPS URL/,
      rightsUrl,
    );
  }
});

test('public mode performs no private requests', async () => {
  const html = await loadHtml();
  const harness = createPrivateMediaLoaderHarness(html, {}, false);

  assert.deepEqual(await harness.loadPrivateMediaOverrides(1), {});
  assert.deepEqual(harness.requests, []);
});

test('private loader supports U4-only, U5-only, and both isolated bundles', async () => {
  const html = await loadHtml();
  const u4Entry = {
    filePath:'.private-media/u4/two-fridas.jpg',
    creatorOrInstitution:'U4 study copy',
    rightsNote:'Local only',
    rightsUrl:'https://example.org/u4-rights',
  };
  const u5Entry = {
    filePath:'.private-media/u5/chavin-relief.jpg',
    creatorOrInstitution:'U5 study copy',
    rightsNote:'Local only',
    rightsUrl:'https://example.org/u5-rights',
  };
  const scenarios = [
    {
      name:'U4 only',
      routes:{
        '.private-media/u4/overrides.js':{
          type:'load', globalName:'AP_ART_HISTORY_PRIVATE_MEDIA_U4',
          value:{ [EXPECTED_U4_PRIVATE_MEDIA_KEYS[0]]:u4Entry },
        },
      },
      expected:{ [EXPECTED_U4_PRIVATE_MEDIA_KEYS[0]]:u4Entry },
    },
    {
      name:'U5 only',
      routes:{
        '.private-media/u5/overrides.js':{
          type:'load', globalName:'AP_ART_HISTORY_PRIVATE_MEDIA_U5',
          value:{ [EXPECTED_U5_PRIVATE_MEDIA_KEYS[0]]:u5Entry },
        },
      },
      expected:{ [EXPECTED_U5_PRIVATE_MEDIA_KEYS[0]]:u5Entry },
    },
    {
      name:'both',
      routes:{
        '.private-media/u4/overrides.js':{
          type:'load', globalName:'AP_ART_HISTORY_PRIVATE_MEDIA_U4',
          value:{ [EXPECTED_U4_PRIVATE_MEDIA_KEYS[0]]:u4Entry },
        },
        '.private-media/u5/overrides.js':{
          type:'load', globalName:'AP_ART_HISTORY_PRIVATE_MEDIA_U5',
          value:{ [EXPECTED_U5_PRIVATE_MEDIA_KEYS[0]]:u5Entry },
        },
      },
      expected:{
        [EXPECTED_U4_PRIVATE_MEDIA_KEYS[0]]:u4Entry,
        [EXPECTED_U5_PRIVATE_MEDIA_KEYS[0]]:u5Entry,
      },
    },
  ];
  for (const scenario of scenarios) {
    const harness = createPrivateMediaLoaderHarness(html, scenario.routes);
    const loaded = await harness.loadPrivateMediaOverrides(5);
    assert.deepEqual(loaded, scenario.expected, scenario.name);
    assert.ok(Object.isFrozen(loaded), `${scenario.name} frozen merge`);
    assert.deepEqual(harness.requests, harness.bundles.map(({ scriptPath }) => scriptPath));
    assert.equal(harness.window.AP_ART_HISTORY_PRIVATE_MEDIA_U4, undefined);
    assert.equal(harness.window.AP_ART_HISTORY_PRIVATE_MEDIA_U5, undefined);
  }
});

test('one private bundle error or timeout does not discard the other bundle', async () => {
  const html = await loadHtml();
  const u5Entry = {
    filePath:'.private-media/u5/chavin-relief.jpg',
    creatorOrInstitution:'U5 study copy',
    rightsNote:'Local only',
    rightsUrl:'https://example.org/u5-rights',
  };
  for (const failureType of ['error', 'timeout']) {
    const harness = createPrivateMediaLoaderHarness(html, {
      '.private-media/u4/overrides.js':{ type:failureType },
      '.private-media/u5/overrides.js':{
        type:'load', globalName:'AP_ART_HISTORY_PRIVATE_MEDIA_U5',
        value:{ [EXPECTED_U5_PRIVATE_MEDIA_KEYS[0]]:u5Entry },
      },
    });
    assert.deepEqual(
      await harness.loadPrivateMediaOverrides(2),
      { [EXPECTED_U5_PRIVATE_MEDIA_KEYS[0]]:u5Entry },
      failureType,
    );
  }
});

test('bundle validation failures and duplicate identities fail closed', async () => {
  const html = await loadHtml();
  const entry = {
    filePath:'.private-media/u5/chavin-relief.jpg',
    creatorOrInstitution:'U5 study copy',
    rightsNote:'Local only',
    rightsUrl:'https://example.org/u5-rights',
  };
  const harness = createPrivateMediaLoaderHarness(html, {
    '.private-media/u4/overrides.js':{ type:'error' },
    '.private-media/u5/overrides.js':{
      type:'load', globalName:'AP_ART_HISTORY_PRIVATE_MEDIA_U5',
      value:{ [EXPECTED_U4_PRIVATE_MEDIA_KEYS[0]]:entry },
    },
  });

  assert.deepEqual(await harness.loadPrivateMediaOverrides(5), {});
  assert.throws(
    () => harness.mergePrivateMediaBundles([
      { duplicate:entry },
      { duplicate:{ ...entry } },
    ]),
    /Duplicate private media identity/,
  );
});

test('private overlay resolution is ephemeral and leaves the public media record untouched', async () => {
  const html = await loadHtml();
  const source = getFunctionSource(html, 'resolveMediaView');
  const publicMedia = {
    id:'primary',
    imageUrl:null,
    imageAlt:'受版权限制的公开占位视图',
    imageSourceName:'Official source',
    imageSourceUrl:'https://example.org/source',
    mediaStatus:'rightsRestricted',
  };
  const override = {
    filePath:'.private-media/u4/two-fridas.jpg',
    creatorOrInstitution:'Private study copy',
    rightsNote:'Local educational reference only',
    rightsUrl:'https://example.org/rights',
  };
  const resolveMediaView = Function(
    'privateMediaOverrides',
    `"use strict"; ${source}; return resolveMediaView;`,
  )({ 'ap140-two-fridas::primary':override });
  const resolved = resolveMediaView({ id:'ap140-two-fridas' }, publicMedia);

  assert.equal(resolved.imageUrl, override.filePath);
  assert.equal(resolved.mediaStatus, 'privateLocal');
  assert.deepEqual(resolved.privateCredit, {
    creatorOrInstitution:override.creatorOrInstitution,
    licenseName:override.rightsNote,
    licenseUrl:override.rightsUrl,
  });
  assert.equal(publicMedia.imageUrl, null);
  assert.equal(publicMedia.mediaStatus, 'rightsRestricted');
});

test('rights-restricted views render a noninteractive public placeholder and opt-in local image', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const work = artworks.find(({ id }) => id === 'ap140-two-fridas');
  const publicHarness = createDetailHarness(html, artworks, credits);
  const publicSummary = publicHarness.renderArtworkDetails(work, { works:[work] });
  const publicPlaceholder = publicSummary.querySelector('.rights-placeholder');

  assert.ok(publicPlaceholder);
  assert.equal(publicSummary.querySelectorAll('img').length, 0);
  assert.equal(publicSummary.querySelector('.artwork-image-button'), null);
  assert.match(publicPlaceholder.textContent, /Image unavailable in the public version/);
  assert.match(publicPlaceholder.textContent, /公开版不显示图像/);
  assert.equal(
    publicPlaceholder.querySelector('.rights-placeholder-source').href,
    work.images[0].imageSourceUrl,
  );

  const identity = `${work.id}::${work.images[0].id}`;
  const override = {
    filePath:'.private-media/u4/two-fridas.jpg',
    creatorOrInstitution:'Private study copy',
    rightsNote:'Local educational reference only',
    rightsUrl:'https://example.org/rights',
  };
  const privateHarness = createDetailHarness(
    html,
    artworks,
    credits,
    {},
    { [identity]:override },
    true,
  );
  const privateSummary = privateHarness.renderArtworkDetails(work, { works:[work] });
  const imageButton = privateSummary.querySelector('.artwork-image-button');

  assert.ok(imageButton);
  assert.equal(privateSummary.querySelector('.rights-placeholder'), null);
  assert.equal(imageButton.querySelector('img').src, override.filePath);
  assert.match(privateSummary.querySelector('.image-credit-host').textContent, /Private study copy/);
  imageButton.click();
  assert.equal(privateHarness.isDialogOpen(), true);
  privateHarness.closeDialog();
  assert.equal(privateHarness.isDialogOpen(), false);

  const failedPrivateImage = imageButton.querySelector('img');
  failedPrivateImage.listeners.error[0]({ target:failedPrivateImage });
  const fallback = privateSummary.querySelector('.rights-placeholder');
  assert.ok(fallback, 'missing local image must restore the public rights placeholder');
  assert.match(fallback.textContent, /Private image not installed/);
  assert.equal(privateSummary.querySelectorAll('img').length, 0);
  assert.equal(privateSummary.querySelector('.artwork-image-button'), null);
  assert.equal(privateHarness.isDialogOpen(), false);
  assert.strictEqual(privateHarness.getActiveElement(), fallback);
  assert.equal(
    fallback.querySelector('.rights-placeholder-source').href,
    work.images[0].imageSourceUrl,
  );
});

test('private mode without an installed override retains the placeholder with a local status', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const work = artworks.find(({ id }) => id === 'ap140-two-fridas');
  const harness = createDetailHarness(html, artworks, credits, {}, {}, true);
  const summary = harness.renderArtworkDetails(work, { works:[work] });

  assert.match(summary.querySelector('.rights-placeholder').textContent, /Private image not installed/);
  assert.equal(summary.querySelectorAll('img').length, 0);
});

test('Unit 7 and Unit 8 unresolved views avoid false copyright and private-bundle claims', async()=>{
 const html=await loadHtml(),artworks=parseJsonBlock(html,'artwork-data'),credits=parseJsonBlock(html,'image-credit-data');
 let checkedViews=0;
 for(const privateMode of [false,true]){
  const harness=createDetailHarness(html,artworks,credits,{}, {},privateMode);
  for(const unit of [7,8]) for(const work of artworks.filter(w=>w.unit===unit)){
   const summary=harness.renderArtworkDetails(work,{works:[work]});
   for(const [index,view]of work.images.entries()){
    if(view.imageUrl)continue;
    checkedViews++;
    summary.querySelector('.image-view-switcher')?.children[index].click();
    const text=summary.querySelector('.rights-placeholder').textContent;
    assert.match(text,/Reusable image not yet verified/);
    assert.ok(text.includes(view.mediaStatus));
    assert.doesNotMatch(text,/由于作品版权限制|私人学习模式可显示|Private image not installed/);
   }
  }
 }
 assert.equal(checkedViews,30,'actual U7/U8 unresolved views checked in both public and private modes');
});

test('all Unit 6 unresolved views show honest reusable-image status in public and private modes', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  let checkedViews = 0;
  for (const privateMode of [false, true]) {
    const harness = createDetailHarness(html, artworks, credits, {}, {}, privateMode);
    for (const work of artworks.filter(({ unit }) => unit === 6)) {
      const summary = harness.renderArtworkDetails(work, { works:[work] });
      for (const [index, media] of work.images.entries()) {
        if (media.imageUrl) continue;
        const switcher = summary.querySelector('.image-view-switcher');
        if (switcher) switcher.children[index].click();
        const panel = summary.querySelector('.rights-placeholder');
        assert.ok(panel, `${work.id} ${media.id}`);
        assert.ok(panel.textContent.includes(media.mediaStatus), 'must visibly use the media item status');
        assert.match(panel.textContent, /Reusable image not yet verified/);
        assert.match(panel.textContent, /可复用图片尚未核实/);
        assert.doesNotMatch(panel.textContent, /版权限制|私人学习模式可显示|Private image not installed/);
        assert.equal(panel.querySelector('.private-media-missing'), null);
        assert.equal(summary.querySelectorAll('img').length, 0);
        assert.equal(summary.querySelector('.artwork-image-button'), null);
        assert.equal(panel.getAttribute('aria-label'), `${work.titleEn}: reusable image not yet verified`);
        const source = panel.querySelector('.rights-placeholder-source');
        assert.equal(source.href, media.imageSourceUrl);
        assert.equal(source.target, '_blank');
        assert.equal(source.rel, 'noopener noreferrer');
        assert.ok(source.textContent.trim(), 'external source link needs an accessible name');
        checkedViews += 1;
      }
    }
  }
  const authority = JSON.parse(await readFile(new URL('../data/ap-art-history-unit-6-placeholder-authority.json', import.meta.url), 'utf8'));
  assert.equal(checkedViews, Object.keys(authority).length * 2, 'every reviewed restricted view checked in both modes');
});

test('Unit 6 unresolved placeholders use alternate status wording even when privateMissing is true', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const work = artworks.find(({ unit, images }) => unit === 6 && images.some(({ imageUrl }) => imageUrl === null));
  const media = structuredClone(work.images.find(({ imageUrl }) => imageUrl === null));
  media.mediaStatus = '图像复用待确认 — Reuse verification pending.';

  for (const privateMode of [false, true]) {
    const harness = createDetailHarness(html, artworks, credits, {}, {}, privateMode);
    for (const privateMissing of [false, true]) {
      const panel = harness.createRightsPlaceholder(work, media, privateMissing);
      assert.equal(panel.find(({ tagName }) => tagName === 'H3').textContent, 'Reusable image not yet verified');
      assert.equal(panel.querySelector('p').textContent, media.mediaStatus);
      assert.equal(panel.getAttribute('aria-label'), `${work.titleEn}: reusable image not yet verified`);
      assert.doesNotMatch(panel.textContent, /版权限制|私人学习模式可显示|Private image not installed/);
      assert.equal(panel.querySelector('.private-media-missing'), null);
    }
  }
});

test('Unit 5 rights placeholders preserve public wording and private-missing status', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const work = artworks.find(({ id }) => id === 'ap153-chavin-huantar');
  const index = work.images.findIndex(({ mediaStatus }) => mediaStatus === 'rightsRestricted');
  for (const privateMode of [false, true]) {
    const harness = createDetailHarness(html, artworks, credits, {}, {}, privateMode);
    const summary = harness.renderArtworkDetails(work, { works:[work] });
    summary.querySelector('.image-view-switcher').children[index].click();
    const panel = summary.querySelector('.rights-placeholder');
    assert.match(panel.textContent, /Image unavailable in the public version/);
    assert.match(panel.textContent, /由于作品版权限制，公开版不显示图像。本地私人学习模式可显示完整视图。/);
    assert.equal(panel.getAttribute('aria-label'), `${work.titleEn}: public image unavailable`);
    if (privateMode) {
      assert.equal(panel.querySelector('.private-media-missing').textContent, 'Private image not installed');
      assert.equal(panel.tabIndex, -1);
    } else {
      assert.equal(panel.querySelector('.private-media-missing'), null);
    }
  }
});

test('Unit 5 restricted media keeps its public placeholder and accepts only an ephemeral U5 local view', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const work = artworks.find(({ id }) => id === 'ap153-chavin-huantar');
  const publicMedia = work.images.find(({ id }) => id === 'relief-sculpture');
  const publicHarness = createDetailHarness(html, artworks, credits);
  const publicSummary = publicHarness.renderArtworkDetails(work, { works:[work] });
  const reliefButton = publicSummary.querySelector('.image-view-switcher').children[
    work.images.indexOf(publicMedia)
  ];

  reliefButton.click();
  assert.ok(publicSummary.querySelector('.rights-placeholder'));
  assert.equal(publicSummary.querySelectorAll('img').length, 0);

  const identity = `${work.id}::${publicMedia.id}`;
  const override = {
    filePath:'.private-media/u5/chavin-relief.jpg',
    creatorOrInstitution:'Private U5 study copy',
    rightsNote:'Local educational reference only',
    rightsUrl:'https://example.org/u5-rights',
  };
  const privateHarness = createDetailHarness(
    html,
    artworks,
    credits,
    {},
    { [identity]:override },
    true,
  );
  const privateSummary = privateHarness.renderArtworkDetails(work, { works:[work] });
  const privateSwitcher = privateSummary.querySelector('.image-view-switcher');
  privateSwitcher.children[work.images.indexOf(publicMedia)].click();

  const privateImageButton = privateSummary.querySelector('.artwork-image-button');
  assert.equal(privateImageButton.querySelector('img').src, override.filePath);
  assert.equal(publicMedia.imageUrl, null);
  assert.equal(publicMedia.mediaStatus, 'rightsRestricted');

  privateImageButton.click();
  assert.equal(privateHarness.isDialogOpen(), true);
  const dialogImage = privateHarness.getDialogMedia().querySelector('img');
  assert.equal(dialogImage.src, override.filePath);
  for (const listener of [...dialogImage.listeners.error]) {
    listener({ target:dialogImage });
  }

  const placeholder = privateSummary.querySelector('.rights-placeholder');
  assert.equal(privateHarness.isDialogOpen(), false);
  assert.equal(privateHarness.getDialogMedia().children.length, 0);
  assert.ok(placeholder, 'modal private failure must restore the public placeholder inline');
  assert.equal(placeholder.tabIndex, -1);
  assert.strictEqual(privateHarness.getActiveElement(), placeholder);
  assert.equal(privateSummary.querySelectorAll('img').length, 0);
  assert.strictEqual(privateSummary.querySelector('.image-view-switcher'), privateSwitcher);

  privateSwitcher.children[0].click();
  assert.equal(privateSummary.querySelector('img').src, work.images[0].imageUrl);
  assert.equal(privateSummary.querySelector('.rights-placeholder'), null);
});

test('a stale private inline error cannot replace or focus away from the current public view', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const work = artworks.find(({ id }) => id === 'ap153-chavin-huantar');
  const restrictedIndex = work.images.findIndex(({ id }) => id === 'relief-sculpture');
  const identity = `${work.id}::${work.images[restrictedIndex].id}`;
  const harness = createDetailHarness(html, artworks, credits, {}, {
    [identity]:{
      filePath:'.private-media/u5/chavin-relief.jpg',
      creatorOrInstitution:'Private U5 study copy',
      rightsNote:'Local educational reference only',
      rightsUrl:'https://example.org/u5-rights',
    },
  }, true);
  const summary = harness.renderArtworkDetails(work, { works:[work] });
  const switcher = summary.querySelector('.image-view-switcher');
  switcher.children[restrictedIndex].click();
  const stalePrivateImage = summary.querySelector('img');

  switcher.children[0].click();
  const currentPublicButton = summary.querySelector('.artwork-image-button');
  const currentPublicImage = currentPublicButton.querySelector('img');
  currentPublicButton.focus();
  for (const listener of [...stalePrivateImage.listeners.error]) {
    listener({ target:stalePrivateImage });
  }

  assert.strictEqual(summary.querySelector('.artwork-image-button'), currentPublicButton);
  assert.strictEqual(summary.querySelector('img'), currentPublicImage);
  assert.equal(currentPublicImage.src, work.images[0].imageUrl);
  assert.equal(summary.querySelector('.rights-placeholder'), null);
  assert.equal(switcher.children[0].getAttribute('aria-pressed'), 'true');
  assert.equal(switcher.children[restrictedIndex].getAttribute('aria-pressed'), 'false');
  assert.strictEqual(harness.getActiveElement(), currentPublicButton);

  switcher.children[1].click();
  assert.equal(summary.querySelector('img').src, work.images[1].imageUrl);
  assert.equal(switcher.children[1].getAttribute('aria-pressed'), 'true');
});

test('a stale private modal error cannot close or clear a newer public modal', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const work = artworks.find(({ id }) => id === 'ap153-chavin-huantar');
  const restrictedIndex = work.images.findIndex(({ id }) => id === 'relief-sculpture');
  const identity = `${work.id}::${work.images[restrictedIndex].id}`;
  const harness = createDetailHarness(html, artworks, credits, {}, {
    [identity]:{
      filePath:'.private-media/u5/chavin-relief.jpg',
      creatorOrInstitution:'Private U5 study copy',
      rightsNote:'Local educational reference only',
      rightsUrl:'https://example.org/u5-rights',
    },
  }, true);
  const summary = harness.renderArtworkDetails(work, { works:[work] });
  const switcher = summary.querySelector('.image-view-switcher');
  switcher.children[restrictedIndex].click();
  summary.querySelector('.artwork-image-button').click();
  const stalePrivateDialogImage = harness.getDialogMedia().querySelector('img');
  harness.closeDialog();

  switcher.children[0].click();
  summary.querySelector('.artwork-image-button').click();
  const currentPublicDialogImage = harness.getDialogMedia().querySelector('img');
  const currentModalFocus = harness.getActiveElement();
  for (const listener of [...stalePrivateDialogImage.listeners.error]) {
    listener({ target:stalePrivateDialogImage });
  }

  assert.equal(harness.isDialogOpen(), true);
  assert.strictEqual(harness.getDialogMedia().querySelector('img'), currentPublicDialogImage);
  assert.equal(currentPublicDialogImage.src, work.images[0].imageUrl);
  assert.strictEqual(harness.getActiveElement(), currentModalFocus);
  assert.equal(summary.querySelector('.rights-placeholder'), null);
  assert.equal(switcher.children[0].getAttribute('aria-pressed'), 'true');
});

test('all Unit 4 details preserve bilingual hierarchy, study tabs, and required view controls', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const harness = createDetailHarness(html, artworks, credits);
  const unit4 = artworks.filter(({ unit }) => unit === 4);

  assert.equal(unit4.length, 54);
  for (const work of unit4) {
    const summary = harness.renderArtworkDetails(work, { works:[work] });
    assert.equal(summary.children[0].textContent, work.titleEn, `${work.id} English title`);
    assert.equal(summary.children[1].textContent, work.titleZh, `${work.id} Chinese title`);
    assert.equal(summary.querySelectorAll('[role="tab"]').length, 4, `${work.id} tabs`);
    const expectedViews = work.images?.length ?? 1;
    const switcher = summary.querySelector('.image-view-switcher');
    if (expectedViews > 1) {
      assert.equal(switcher.querySelectorAll('button').length, expectedViews, `${work.id} views`);
    } else {
      assert.equal(switcher, null, `${work.id} single view`);
    }
  }
});

test('Monticello keeps a real cross-unit Pantheon comparison and navigation clears U4 filters', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const monticello = artworks.find(({ id }) => id === 'ap102-monticello');
  const pantheon = artworks.find(({ id }) => id === 'ap46-pantheon');
  const harness = createDetailHarness(html, artworks, credits, {
    unit:'4',
    culture:'enlightenmentRevolution',
    period:'Neoclassicism',
    workType:'House and plantation complex',
    search:'Monticello',
    selectedId:monticello.id,
    selectedSiteIndex:0,
    expandedSiteToken:'u4:unitedStates',
    activeUnit:4,
    activeRegion:'unit-4-region-unitedStates',
    pendingFocusParentKey:'unit-4-region-unitedStates',
    activeDetailTab:'compare',
  });
  const summary = harness.renderArtworkDetails(monticello, { works:[monticello] });
  const comparison = summary.querySelectorAll('.comparison-card').find(
    ({ dataset }) => dataset.comparisonId === pantheon.id,
  );

  assert.ok(monticello.comparisonIds.includes(pantheon.id));
  assert.match(monticello.comparisonNotes[pantheon.id], /万神殿/);
  assert.ok(comparison);
  comparison.click();
  assert.equal(harness.getState().unit, '2');
  assert.equal(harness.getState().culture, 'all');
  assert.equal(harness.getState().period, '');
  assert.equal(harness.getState().workType, '');
  assert.equal(harness.getState().search, '');
  assert.equal(harness.getState().selectedId, pantheon.id);
  assert.equal(harness.getDetailPanel().ownerDocument.activeElement?.textContent, pantheon.titleEn);
});

test('Unit 5 comparison cards clear filters and restore focus within U5 and across units', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const maize = artworks.find(({ id }) => id === 'ap160-maize-cobs');
  const chavin = artworks.find(({ id }) => id === 'ap153-chavin-huantar');
  const whiteTemple = artworks.find(({ id }) => id === 'ap12-white-temple-ziggurat');
  const withinUnit = createDetailHarness(html, artworks, credits, {
    unit:'5',
    culture:'Ancient Central Andes',
    period:'Late Horizon Andes',
    workType:'Ritual metalwork',
    search:'maize',
    selectedId:maize.id,
    selectedSiteIndex:1,
    expandedSiteToken:'u5-central-andes',
    activeUnit:5,
    activeRegion:'unit-5-region-centralAndes',
    pendingFocusParentKey:'unit-5-region-centralAndes',
    activeDetailTab:'compare',
  });

  withinUnit.renderSelected();
  const maizeHeading = withinUnit.getDetailPanel().querySelector('#detailTitle');
  maizeHeading.focus();
  const chavinCard = withinUnit.getDetailPanel().find(
    ({ dataset }) => dataset.comparisonId === chavin.id,
  );
  assert.ok(chavinCard, 'AP 160 must expose its within-U5 AP 153 comparison');
  chavinCard.click();
  assert.deepEqual(withinUnit.getState(), {
    unit:'5', culture:'all', period:'', workType:'', search:'',
    selectedId:chavin.id, selectedSiteIndex:0, expandedSiteToken:null,
    activeUnit:5, activeRegion:null, pendingFocusParentKey:null,
    activeDetailTab:'quick',
  });
  assertCurrentDetailHeadingFocus(withinUnit.getDetailPanel(), chavin.titleEn);

  const crossUnit = createDetailHarness(html, artworks, credits, {
    unit:'5',
    culture:'Ancient Central Andes',
    period:'Early Horizon Andes',
    workType:'Ceremonial complex and ritual objects',
    search:'Lanzón',
    selectedId:chavin.id,
    selectedSiteIndex:0,
    expandedSiteToken:'u5-chavin',
    activeUnit:5,
    activeRegion:'unit-5-region-centralAndes',
    pendingFocusParentKey:'unit-5-region-centralAndes',
    activeDetailTab:'compare',
  });
  crossUnit.renderSelected();
  const chavinHeading = crossUnit.getDetailPanel().querySelector('#detailTitle');
  chavinHeading.focus();
  const whiteTempleCard = crossUnit.getDetailPanel().find(
    ({ dataset }) => dataset.comparisonId === whiteTemple.id,
  );
  assert.ok(whiteTempleCard, 'AP 153 must expose its cross-unit AP 12 comparison');
  whiteTempleCard.click();
  assert.deepEqual(crossUnit.getState(), {
    unit:'2', culture:'all', period:'', workType:'', search:'',
    selectedId:whiteTemple.id, selectedSiteIndex:0, expandedSiteToken:null,
    activeUnit:2, activeRegion:null, pendingFocusParentKey:null,
    activeDetailTab:'quick',
  });
  assertCurrentDetailHeadingFocus(crossUnit.getDetailPanel(), whiteTemple.titleEn);
});

test('normalizes legacy single images and preserves explicit image arrays', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const harness = createDetailHarness(html, artworks, credits);
  const stonehenge = artworks.find(({ id }) => id === 'ap8-stonehenge');
  const single = artworks.find(({ unit }) => unit === 2);

  assert.strictEqual(harness.getArtworkImages(stonehenge), stonehenge.images);
  assert.equal(harness.getArtworkImages(stonehenge).length, 2);
  assert.deepEqual(harness.getArtworkImages(single), [{
    label:'Primary view',
    imageUrl:single.imageUrl,
    imageAlt:single.imageAlt,
    imageSourceName:single.imageSourceName,
    imageSourceUrl:single.imageSourceUrl,
  }]);
  assert.deepEqual(harness.getArtworkImageCredits(stonehenge), credits[stonehenge.id]);
  assert.deepEqual(harness.getArtworkImageCredits(single), [credits[single.id]]);
});

test('Stonehenge view buttons synchronize image, attribution, dialog, and pressed state', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const harness = createDetailHarness(html, artworks, credits);
  const stonehenge = artworks.find(({ id }) => id === 'ap8-stonehenge');
  const summary = harness.renderArtworkDetails(stonehenge, { works:[stonehenge] });
  const imageButton = summary.querySelector('.artwork-image-button');
  const switcher = summary.querySelector('.image-view-switcher');
  const creditHost = summary.querySelector('.image-credit-host');
  const viewButtons = switcher.querySelectorAll('button');

  assert.equal(switcher.getAttribute('role'), 'group');
  assert.equal(switcher.getAttribute('aria-label'), 'Choose artwork image view');
  assert.deepEqual(viewButtons.map(({ textContent }) => textContent), [
    'Aerial overview',
    'Ground-level view',
  ]);
  assert.equal(viewButtons[0].getAttribute('aria-pressed'), 'true');
  assert.equal(viewButtons[1].getAttribute('aria-pressed'), 'false');
  assert.equal(imageButton.children[0].src, stonehenge.images[0].imageUrl);

  viewButtons[1].click();
  assert.equal(viewButtons[0].getAttribute('aria-pressed'), 'false');
  assert.equal(viewButtons[1].getAttribute('aria-pressed'), 'true');
  assert.equal(imageButton.children[0].src, stonehenge.images[1].imageUrl);
  assert.equal(imageButton.children[0].alt, stonehenge.images[1].imageAlt);
  assert.match(imageButton.getAttribute('aria-label'), /Stonehenge.*Ground-level view/);
  assert.match(creditHost.textContent, new RegExp(credits[stonehenge.id][1].creatorOrInstitution));
  const creditLinks = creditHost.querySelectorAll('a');
  assert.equal(creditLinks[0].href, credits[stonehenge.id][1].licenseUrl);
  assert.equal(creditLinks[1].href, stonehenge.images[1].imageSourceUrl);
  assert.equal(creditLinks[1].textContent, stonehenge.images[1].imageSourceName);

  imageButton.click();
  assert.equal(harness.getDialogTrigger(), imageButton);
  assert.equal(imageButton.ownerDocument.getElementById('dialogMedia').children[0].src, stonehenge.images[1].imageUrl);
  assert.equal(imageButton.ownerDocument.getElementById('dialogMedia').children[0].alt, stonehenge.images[1].imageAlt);
  assert.equal(imageButton.ownerDocument.getElementById('dialogCaption').textContent, stonehenge.images[1].imageAlt);
  assert.match(
    imageButton.ownerDocument.getElementById('dialogCredit').textContent,
    new RegExp(credits[stonehenge.id][1].creatorOrInstitution),
  );
  assert.equal(
    imageButton.ownerDocument.getElementById('dialogLicense').href,
    credits[stonehenge.id][1].licenseUrl,
  );
  assert.equal(
    imageButton.ownerDocument.getElementById('dialogSource').href,
    stonehenge.images[1].imageSourceUrl,
  );
  assert.equal(
    imageButton.ownerDocument.getElementById('dialogSource').textContent,
    stonehenge.images[1].imageSourceName,
  );
  assert.equal(
    imageButton.ownerDocument.activeElement,
    imageButton.ownerDocument.getElementById('dialogClose'),
  );
});

test('Chartres six-view buttons keep every image, attribution, dialog, and local selection in sync', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const harness = createDetailHarness(html, artworks, credits, { selectedSiteIndex:4 });
  const chartres = artworks.find(({ apNumber }) => apNumber === 60);
  const chartresCredits = credits[chartres.id];
  const summary = harness.renderArtworkDetails(chartres, { works:[chartres] });
  const imageButton = summary.querySelector('.artwork-image-button');
  const switcher = summary.querySelector('.image-view-switcher');
  const creditHost = summary.querySelector('.image-credit-host');
  const viewButtons = switcher.querySelectorAll('button');
  const expectedLabels = [
    'West Facade',
    'Nave',
    'Plan',
    'Royal Portal',
    'Rose Window',
    'Stained Glass',
  ];

  assert.equal(chartres.images.length, 6);
  assert.equal(chartresCredits.length, 6);
  assert.equal(switcher.getAttribute('role'), 'group');
  assert.equal(switcher.getAttribute('aria-label'), 'Choose artwork image view');
  assert.deepEqual(viewButtons.map(({ textContent }) => textContent), expectedLabels);
  assert.ok(viewButtons.every(({ type }) => type === 'button'));
  assert.deepEqual(
    viewButtons.map((button) => button.getAttribute('aria-pressed')),
    ['true', 'false', 'false', 'false', 'false', 'false'],
  );

  for (const [index, button] of viewButtons.entries()) {
    const media = chartres.images[index];
    const credit = chartresCredits[index];

    button.focus();
    button.click();

    assert.equal(
      button.ownerDocument.activeElement,
      button,
      `${media.label} selection preserves focus`,
    );
    assert.deepEqual(
      viewButtons.map((candidate) => candidate.getAttribute('aria-pressed')),
      viewButtons.map((_, candidateIndex) => String(candidateIndex === index)),
      `${media.label} has exactly one pressed view`,
    );
    assert.equal(imageButton.children[0].src, media.imageUrl);
    assert.equal(imageButton.children[0].alt, media.imageAlt);
    assert.match(imageButton.getAttribute('aria-label'), /Chartres Cathedral/);
    assert.match(imageButton.getAttribute('aria-label'), new RegExp(media.label));

    assert.match(creditHost.textContent, new RegExp(credit.creatorOrInstitution));
    const creditLinks = creditHost.querySelectorAll('a');
    assert.equal(creditLinks[0].href, credit.licenseUrl);
    assert.equal(creditLinks[0].textContent, credit.licenseName);
    assert.equal(creditLinks[1].href, media.imageSourceUrl);
    assert.equal(creditLinks[1].textContent, media.imageSourceName);

    imageButton.click();
    const document = imageButton.ownerDocument;
    assert.equal(harness.getDialogTrigger(), imageButton);
    assert.equal(document.getElementById('dialogMedia').children[0].src, media.imageUrl);
    assert.equal(document.getElementById('dialogMedia').children[0].alt, media.imageAlt);
    assert.equal(document.getElementById('dialogCaption').textContent, media.imageAlt);
    assert.match(
      document.getElementById('dialogCredit').textContent,
      new RegExp(credit.creatorOrInstitution),
    );
    assert.equal(document.getElementById('dialogLicense').href, credit.licenseUrl);
    assert.equal(document.getElementById('dialogLicense').textContent, credit.licenseName);
    assert.equal(document.getElementById('dialogSource').href, media.imageSourceUrl);
    assert.equal(document.getElementById('dialogSource').textContent, media.imageSourceName);
    assert.equal(document.activeElement, document.getElementById('dialogClose'));
    assert.equal(
      harness.getSelectedSiteIndex(),
      4,
      'media selection must not mutate shared site navigation state',
    );

    document.getElementById('dialogClose').click();
    assert.equal(harness.isDialogOpen(), false);
    assert.equal(harness.getDialogTrigger(), null);
    assert.equal(
      document.activeElement,
      imageButton,
      `${media.label} close restores focus to the image trigger`,
    );
  }
});

test('single-image Unit 2 details preserve one image and render no empty view switcher', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const harness = createDetailHarness(html, artworks, credits);
  const single = artworks.find(({ unit }) => unit === 2);
  const summary = harness.renderArtworkDetails(single, { works:[single] });

  assert.equal(summary.querySelectorAll('.artwork-image-button').length, 1);
  assert.equal(summary.querySelector('.image-view-switcher'), null);
  assert.equal(summary.querySelectorAll('.image-credit-host').length, 1);
});

test('AP 15 uses the Louvre E 3023 Seated Scribe image and matching credit', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const seatedScribe = artworks.find(({ id }) => id === 'ap15-seated-scribe');

  assert.ok(seatedScribe, 'missing AP 15 Seated Scribe');
  assert.equal(
    seatedScribe.imageUrl,
    'https://commons.wikimedia.org/wiki/Special:Redirect/file/Le_Scribe_accroupi_-_Mus%C3%A9e_du_Louvre_Antiquit%C3%A9s_%C3%A9gyptiennes_E_3023.jpg',
  );
  assert.equal(
    seatedScribe.imageSourceUrl,
    'https://commons.wikimedia.org/wiki/File:Le_Scribe_accroupi_-_Mus%C3%A9e_du_Louvre_Antiquit%C3%A9s_%C3%A9gyptiennes_E_3023.jpg',
  );
  assert.equal(seatedScribe.imageAlt, '卢浮宫 E 3023 坐姿书记官彩绘石灰岩像');
  assert.deepEqual(credits['ap15-seated-scribe'], {
    creatorOrInstitution: '摄影：Shonagon；来源机构：Wikimedia Commons',
    licenseName: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  });
});

test('nine imported works use the exact verified image sources and credits', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');

  for (const [id, expected] of Object.entries(EXPECTED_NEW_ARTWORK_MEDIA)) {
    const artwork = artworks.find((candidate) => candidate.id === id);
    assert.ok(artwork, `missing ${id}`);
    assert.equal(artwork.imageUrl, expected.imageUrl, `${id} image URL`);
    assert.equal(artwork.imageSourceUrl, expected.imageSourceUrl, `${id} source URL`);
    assert.deepEqual(
      credits[id],
      {
        creatorOrInstitution: expected.creatorOrInstitution,
        licenseName: expected.licenseName,
        licenseUrl: expected.licenseUrl,
      },
      `${id} image credit`,
    );
  }
});

test('Unit 2 source worksheet has nine exact verified rows and study links', async () => {
  const markdown = await readFile(SOURCE_WORKSHEET_PATH, 'utf8');
  const rows = parseSourceWorksheet(markdown);

  assert.equal(rows.length, 9);
  assert.deepEqual(
    rows.map(({ id }) => id),
    NEW_ARTWORK_IDS.map((id) => `\`${id}\``),
  );
  for (const [index, expected] of EXPECTED_SOURCE_WORKSHEET_ROWS.entries()) {
    const row = rows[index];
    assert.equal(row.ap, expected.ap, `${expected.id} AP number`);
    assert.equal(row.id, expected.id, `${expected.id} id`);
    assert.equal(row.identifying, EXPECTED_CED_SOURCE, `${expected.id} CED source`);
    assert.equal(row.study, expected.study, `${expected.id} study sources`);
    assert.equal(row.image, expected.image, `${expected.id} image source`);
    assert.equal(row.creator, expected.creator, `${expected.id} creator`);
    assert.equal(row.license, expected.license, `${expected.id} license`);
    assert.equal(
      row.visual,
      expected.visual ?? 'complete subject visible',
      `${expected.id} visual check`,
    );
    assert.match(row.study, /https:\/\/smarthistory\.org\//, `${expected.id} Smarthistory URL`);
    assert.ok(row.image, `${expected.id} needs an image source`);
    assert.ok(row.license, `${expected.id} needs a license`);
  }
});

test('source worksheet parser rejects rows with missing or extra cells', () => {
  const valid = '| 12 | id | identifying | study | image | creator | license | visual |';
  assert.equal(parseSourceWorksheet(valid).length, 1);
  assert.throws(
    () => parseSourceWorksheet(`${valid} extra |`),
    /exactly 8 cells/,
  );
  assert.throws(
    () => parseSourceWorksheet('| 12 | id | identifying | study | image | creator | license |'),
    /exactly 8 cells/,
  );
});

test('keeps all 250 loaded works, complete imported ids, and one credit per image', async () => {
  const html = await loadHtml();
  const artworks = parseJsonBlock(html, 'artwork-data');
  const credits = parseJsonBlock(html, 'image-credit-data');
  const artworkIds = artworks.map(({ id }) => id);

  assert.equal(artworks.length, 250);
  assert.equal(artworks.filter(({ unit }) => unit === 5).length, 14);
  assert.deepEqual(
    artworks.filter(({ unit }) => unit === 5).map(({ apNumber }) => apNumber),
    Array.from({ length: 14 }, (_, index) => index + 153),
  );
  for (const id of ORIGINAL_ARTWORK_IDS) {
    assert.ok(artworkIds.includes(id), `missing original artwork ${id}`);
  }
  for (const id of NEW_ARTWORK_IDS) {
    assert.ok(artworkIds.includes(id), `missing imported artwork ${id}`);
  }

  assert.deepEqual(Object.keys(credits).sort(), artworks.map(({ id }) => id).sort());
  for (const artwork of artworks) {
    const mediaItems = artwork.images ?? [artwork];
    const creditItems = Array.isArray(credits[artwork.id])
      ? credits[artwork.id]
      : [credits[artwork.id]];
    assert.equal(creditItems.length, mediaItems.length, `${artwork.id} needs one credit per image`);
    mediaItems.forEach((media, index) => {
      if (media.mediaStatus === 'rightsRestricted'
        || media.mediaStatus === '可复用图片尚未核实 · Reusable image not yet verified'
        || ([7, 8, 9, 10].includes(artwork.unit) && media.imageUrl === null)) {
        assert.equal(media.imageUrl, null, `${artwork.id} image ${index + 1} must use a public placeholder`);
        assert.ok(typeof media.mediaStatus === 'string' && media.mediaStatus.trim());
      } else {
        assert.equal(typeof media.imageUrl, 'string', `${artwork.id} image ${index + 1} needs a URL`);
        assert.ok(media.imageUrl.trim(), `${artwork.id} image ${index + 1} needs a non-empty URL`);
      }
      const credit = creditItems[index];
      assert.ok(credit.creatorOrInstitution, `${artwork.id} missing creator or institution`);
      assert.ok(credit.licenseName, `${artwork.id} missing license name`);
      assert.match(credit.licenseUrl, /^https:\/\//, `${artwork.id} needs a linked license`);
    });
    if (artwork.unit === 2) {
      assert.equal(
        Object.hasOwn(artwork, 'images'),
        false,
        `${artwork.id} must preserve the Unit 2 single-image model`,
      );
    }
  }

  assert.match(html, /function createImageCredit\(/);
  assert.match(html, /rel = 'noopener noreferrer'/);
});

test('comparison navigation moves focus to the newly selected title', async () => {
  const html = await loadHtml();

  assert.match(html, /heading\.tabIndex = -1/);
  assert.match(html, /function focusSelectedArtworkHeading\(/);
  assert.match(html, /document\.activeElement !== heading/);
});

test('group marker accessible labels include both English hierarchy lines', async () => {
  const html = await loadHtml();

  assert.match(
    html,
    /marker\.setAttribute\('aria-label', `\$\{groupText\.title\} · \$\{groupText\.subtitle\}`\)/,
  );
  assert.doesNotMatch(html, /marker\.setAttribute\('aria-label',[^\n]*artworkNames/);
  assert.match(html, /marker\.setAttribute\('role', 'button'\)/);
  assert.match(html, /marker\.setAttribute\('tabindex', '0'\)/);
  assert.match(html, /expandSiteGroup\(group, true\)/);
});

test('map panning owns touch gestures only on the interactive pan surface', async () => {
  const html = await loadHtml();

  assert.match(html, /#panSurface\s*\{[^}]*touch-action:\s*none/s);
  assert.doesNotMatch(html, /(?:body|\.art-workspace|\.map-panel)\s*\{[^}]*touch-action:\s*none/s);
  assert.match(html, /if \(event\.cancelable\) event\.preventDefault\(\)/);
  assert.match(html, /addEventListener\('pointercancel', stopPan\)/);
  assert.match(html, /addEventListener\('lostpointercapture', stopPan\)/);
});

test('clearing filters also restores the overview transform', async () => {
  const html = await loadHtml();
  const clearFilters = html.match(/function clearFilters\(\) \{([\s\S]*?)\n    \}/)?.[1];

  assert.ok(clearFilters, 'missing clearFilters()');
  assert.match(clearFilters, /transform:\s*\{\s*x:0,\s*y:0,\s*scale:1\s*\}/);
  assert.match(clearFilters, /applyTransform\(\)/);
});

test('images install a named fallback and never inject dataset HTML', async () => {
  const html = await loadHtml();

  assert.match(html, /function installImageFallback\(/);
  assert.match(html, /className = 'image-fallback'/);
  assert.doesNotMatch(html, /innerHTML\s*=/);
});
