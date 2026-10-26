import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  ALLOWED_OPEN_LICENSE_CLASSES, MAX_LOCAL_MEDIA_BYTES,
  assertLocalMediaContract, flattenRequiredViewKeys,
} from '../scripts/art-history-local-media-contract.mjs';

test('real U5 bundle satisfies the local media release contract', () => {
  const rootDir = fileURLToPath(new URL('../', import.meta.url));
  const read = (path) => JSON.parse(readFileSync(join(rootDir, path), 'utf8'));
  assertLocalMediaContract({
    rootDir,
    manifest: read('data/ap-art-history-unit-5-manifest.json'),
    artworks: read('tests/fixtures/u5-canonical.json').artworks,
    rights: read('data/ap-art-history-unit-5-rights.json'),
    authority: read('data/ap-art-history-unit-5-placeholder-authority.json'),
  });
});

test('real U6 bundle satisfies the local release contract with eight open and fifteen restricted views', () => {
  const rootDir = fileURLToPath(new URL('../', import.meta.url));
  const read = (path) => JSON.parse(readFileSync(join(rootDir, path), 'utf8'));
  const html = readFileSync(join(rootDir, 'art-history-map.html'), 'utf8');
  const artworks = JSON.parse(html.match(/<script id="artwork-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  const rights = read('data/ap-art-history-unit-6-rights.json');
  assert.equal(Object.values(rights).filter(({ releaseClass }) => releaseClass === 'open').length, 8);
  assert.equal(Object.values(rights).filter(({ releaseClass }) => releaseClass === 'restricted').length, 15);
  assertLocalMediaContract({ rootDir, artworks, rights,
    manifest: read('data/ap-art-history-unit-6-manifest.json'),
    authority: read('data/ap-art-history-unit-6-placeholder-authority.json'),
  });
});

function fixture(t, unit = 6) {
  const rootDir = mkdtempSync(join(tmpdir(), 'art-history-contract-'));
  t.after(() => rmSync(rootDir, { recursive: true, force: true }));
  const id = `ap${({5:153,6:167,7:181,8:192,9:213,10:224})[unit]}-example`;
  const ap = id.slice(0, 5);
  const localAssetPath = `assets/art-history/u${unit}/${ap}-primary.webp`;
  mkdirSync(join(rootDir, `assets/art-history/u${unit}`), { recursive: true });
  writeFileSync(join(rootDir, localAssetPath), Buffer.from('image'));
  const row = (open) => ({
    creatorOrInstitution: 'Museum', sourcePageUrl: 'https://example.org/source',
    originalFileUrl: open ? 'https://example.org/image.webp' : null,
    localAssetPath: open ? localAssetPath : null,
    licenseClass: open ? 'cc-by' : 'restricted', licenseName: open ? 'CC BY 4.0' : 'Unverified',
    licenseUrl: open ? 'https://creativecommons.org/licenses/by/4.0/' : null,
    releaseClass: open ? 'open' : 'restricted', accessedOn: '2026-10-08',
    identityNote: 'Verified identity', derivativeNote: 'No changes',
  });
  return { rootDir, manifest: { [ap.slice(2)]: { id, requiredViewIds: ['primary', 'context'] } },
    artworks: [{ id, unit, images: [{ id: 'primary', imageUrl: localAssetPath }, { id: 'context', imageUrl: null, imageSourceName: 'Museum', imageSourceUrl: 'https://example.org/source' }] }],
    rights: { [`${id}::primary`]: row(true), [`${id}::context`]: row(false) },
    authority: { [`${id}::context`]: { imageSourceName: 'Museum', imageSourceUrl: 'https://example.org/source', rightsNote: 'Permission unverified' } } };
}

test('exports the uniform limits and flattens manifest view order', (t) => {
  const data = fixture(t);
  assert.deepEqual(ALLOWED_OPEN_LICENSE_CLASSES, ['public-domain', 'cc0', 'cc-by', 'cc-by-sa']);
  assert.equal(MAX_LOCAL_MEDIA_BYTES, 1_572_864);
  assert.deepEqual(flattenRequiredViewKeys(data.manifest), Object.keys(data.rights));
});
for (const unit of [5, 6, 7, 8, 9, 10]) test(`accepts local open and unresolved U${unit} views`, (t) => {
  assert.doesNotThrow(() => assertLocalMediaContract(fixture(t, unit)));
});

const mutations = [
  ['remote live image', (d) => { d.artworks[0].images[0].imageUrl = 'https://example.org/live.jpg'; }, /must use a repository-local image path/],
  ['missing local file', (d) => rmSync(join(d.rootDir, Object.values(d.rights)[0].localAssetPath)), /file/],
  ['disallowed license', (d) => { Object.values(d.rights)[0].licenseClass = 'cc-by-nc'; }, /license/],
  ['duplicate local asset', (d) => { Object.assign(Object.values(d.rights)[1], Object.values(d.rights)[0]); d.artworks[0].images[1].imageUrl = d.artworks[0].images[0].imageUrl; }, /duplicate/],
  ['oversize file', (d) => writeFileSync(join(d.rootDir, Object.values(d.rights)[0].localAssetPath), Buffer.alloc(1_572_865)), /size/],
  ['authority on open view', (d) => { d.authority[Object.keys(d.rights)[0]] = {}; }, /authority/],
  ['noncanonical path', (d) => { Object.values(d.rights)[0].localAssetPath = 'assets/art-history/u6/other.webp'; }, /canonical/],
  ['rights key order', (d) => { d.rights = Object.fromEntries(Object.entries(d.rights).reverse()); }, /order/],
  ['field order', (d) => { const row = Object.values(d.rights)[0]; const value = row.creatorOrInstitution; delete row.creatorOrInstitution; row.creatorOrInstitution = value; }, /field order/],
  ['invalid access date', (d) => { Object.values(d.rights)[0].accessedOn = '2026-02-30'; }, /date/],
  ['insecure evidence', (d) => { Object.values(d.rights)[0].sourcePageUrl = 'http://example.org'; }, /HTTPS/],
  ['zero size file', (d) => writeFileSync(join(d.rootDir, Object.values(d.rights)[0].localAssetPath), ''), /size/],
  ['open media mismatch', (d) => { d.artworks[0].images[0].imageUrl = null; }, /alignment/],
  ['restricted without authority', (d) => { d.authority = {}; }, /authority/],
  ['contradictory restricted license', (d) => { Object.values(d.rights)[1].licenseClass = 'cc-by'; }, /restricted license class/],
  ['restricted authority mismatch', (d) => { Object.values(d.authority)[0].imageSourceName = 'Other'; }, /authority/],
  ['insecure authority URL', (d) => { Object.values(d.authority)[0].imageSourceUrl = 'http://example.org'; }, /HTTPS/],
  ['missing live view', (d) => { d.artworks[0].images.pop(); }, /view/],
  ['duplicate live work', (d) => { d.artworks.push(structuredClone(d.artworks[0])); }, /view/],
];

for (const unit of [5, 6]) for (const index of [0, 1]) {
  for (const field of ['creatorOrInstitution', 'licenseName', 'identityNote', 'derivativeNote']) {
    for (const value of ['', '   ', null, 42]) {
      test(`U${unit} ${index === 0 ? 'open' : 'restricted'} rights reject invalid ${field}: ${JSON.stringify(value)}`, (t) => {
        const data = fixture(t, unit);
        Object.values(data.rights)[index][field] = value;
        assert.throws(() => assertLocalMediaContract(data), new RegExp(`${field}.*non-empty string`));
      });
    }
  }
}
for (const path of ['http://example.org/a.jpg', '/tmp/a.jpg', '.private-media/a.jpg', 'file:///tmp/a.jpg']) {
  mutations.push([`unsafe live path ${path}`, (d) => { d.artworks[0].images[0].imageUrl = path; }, /must use a repository-local image path/]);
}
for (const [name, mutate, error] of mutations) test(`rejects ${name}`, (t) => {
  const data = fixture(t); mutate(data);
  assert.throws(() => assertLocalMediaContract(data), error);
});

for (const targetType of ['private', 'outside']) test(`rejects canonical alias to ${targetType} media`, (t) => {
  const data = fixture(t);
  const targetRoot = targetType === 'private' ? join(data.rootDir, '.private-media') : mkdtempSync(join(tmpdir(), 'outside-media-'));
  if (targetType === 'outside') t.after(() => rmSync(targetRoot, { recursive: true, force: true }));
  else mkdirSync(targetRoot);
  const target = join(targetRoot, 'private.webp');
  writeFileSync(target, 'private image');
  const alias = join(data.rootDir, Object.values(data.rights)[0].localAssetPath);
  rmSync(alias);
  symlinkSync(target, alias);
  assert.throws(() => assertLocalMediaContract(data), /repository-local|public asset subtree|private-media/);
});

test('duplicate asset error identifies path and both owning media keys', (t) => {
  const data = fixture(t);
  const [first, second] = Object.keys(data.rights);
  data.rights[second].localAssetPath = data.rights[first].localAssetPath;
  assert.throws(() => assertLocalMediaContract(data), (error) => {
    assert.ok(error.message.includes(data.rights[first].localAssetPath));
    assert.ok(error.message.includes(first));
    assert.ok(error.message.includes(second));
    return true;
  });
});
