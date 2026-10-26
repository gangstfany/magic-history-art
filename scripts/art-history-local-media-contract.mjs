import assert from 'node:assert/strict';
import { realpathSync, statSync } from 'node:fs';
import { join, relative, isAbsolute, sep } from 'node:path';

export const ALLOWED_OPEN_LICENSE_CLASSES = Object.freeze([
  'public-domain', 'cc0', 'cc-by', 'cc-by-sa',
]);
export const MAX_LOCAL_MEDIA_BYTES = 1_572_864;
export const RIGHTS_FIELDS = Object.freeze([
  'creatorOrInstitution', 'sourcePageUrl', 'originalFileUrl',
  'localAssetPath', 'licenseClass', 'licenseName', 'licenseUrl',
  'releaseClass', 'accessedOn', 'identityNote', 'derivativeNote',
]);

export function flattenRequiredViewKeys(manifest) {
  return Object.values(manifest).flatMap((work) =>
    work.requiredViewIds.map((viewId) => `${work.id}::${viewId}`));
}

function https(value, label) {
  let valid = false;
  try { valid = typeof value === 'string' && value.startsWith('https://') && new URL(value).protocol === 'https:'; } catch {}
  assert.ok(valid, `${label} must be an HTTPS evidence URL`);
}

/** Validate one unit's ordered rights ledger against its public artwork views. */
export function assertLocalMediaContract({ manifest, artworks, rights, authority, rootDir }) {
  const keys = flattenRequiredViewKeys(manifest);
  assert.deepEqual(Object.keys(rights), keys, 'rights key order must match manifest view order');
  const live = new Map();
  for (const work of Object.values(manifest)) {
    const matches = artworks.filter(({ id }) => id === work.id);
    assert.equal(matches.length, 1, `${work.id} must have one live artwork view set`);
    assert.deepEqual(matches[0].images.map(({ id }) => id), work.requiredViewIds, `${work.id} live view order`);
    for (const view of matches[0].images) live.set(`${work.id}::${view.id}`, { view, unit: matches[0].unit });
  }
  const assets = new Map();
  // Check duplicates first so reuse is diagnosed even when its filename is for another view.
  for (const [key, row] of Object.entries(rights)) {
    if (row.localAssetPath === null) continue;
    assert.ok(!assets.has(row.localAssetPath), `duplicate local asset path ${row.localAssetPath}: ${assets.get(row.localAssetPath)} and ${key}`);
    assets.set(row.localAssetPath, key);
  }
  for (const key of keys) {
    const row = rights[key];
    const { view, unit } = live.get(key);
    assert.deepEqual(Object.keys(row), RIGHTS_FIELDS, `${key} rights field order`);
    for (const field of ['creatorOrInstitution', 'licenseName', 'identityNote', 'derivativeNote']) {
      assert.ok(typeof row[field] === 'string' && row[field].trim(), `${key} ${field} must be a non-empty string`);
    }
    assert.match(row.accessedOn, /^\d{4}-\d{2}-\d{2}$/, `${key} ISO access date`);
    const date = new Date(`${row.accessedOn}T00:00:00Z`);
    assert.ok(!Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === row.accessedOn, `${key} valid access date`);
    https(row.sourcePageUrl, `${key} sourcePageUrl`);
    for (const field of ['originalFileUrl', 'licenseUrl']) if (row[field] !== null) https(row[field], `${key} ${field}`);
    if (view.imageUrl !== null) {
      assert.ok(typeof view.imageUrl === 'string' && /^assets\/art-history\/u(?:[56789]|10)\//.test(view.imageUrl)
        && !view.imageUrl.includes('.private-media/') && !view.imageUrl.includes('..'),
      `${key} must use a repository-local image path`);
    }
    assert.ok(['open', 'restricted'].includes(row.releaseClass), `${key} release class`);
    if (row.releaseClass === 'open') {
      assert.ok(ALLOWED_OPEN_LICENSE_CLASSES.includes(row.licenseClass), `${key} disallowed open license class`);
      assert.ok(row.originalFileUrl !== null && row.licenseUrl !== null, `${key} open HTTPS evidence required`);
      assert.ok(!Object.hasOwn(authority, key), `${key} open view must have no authority`);
      const [workId, viewId] = key.split('::');
      const ap = workId.match(/^ap\d{3}(?=-)/)?.[0];
      assert.ok([5, 6, 7, 8, 9, 10].includes(unit) && ap && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(viewId)
        && ['webp', 'jpg', 'jpeg', 'png'].some((ext) => row.localAssetPath === `assets/art-history/u${unit}/${ap}-${viewId}.${ext}`),
      `${key} canonical local asset path required`);
      assert.equal(view.imageUrl, row.localAssetPath, `${key} open media-path alignment`);
      const file = join(rootDir, row.localAssetPath);
      let stats;
      try {
        const resolvedFile = realpathSync(file);
        assert.ok(!resolvedFile.split(sep).includes('.private-media'), `${key} file must not resolve to .private-media`);
        const rel = relative(join(realpathSync(rootDir), `assets/art-history/u${unit}`), resolvedFile);
        assert.ok(!rel.startsWith('..') && !isAbsolute(rel), `${key} file must stay in its public asset subtree`);
        stats = statSync(file);
      } catch (error) { throw new Error(`${key} local file invalid: ${error.message}`); }
      assert.ok(stats.isFile() && stats.size > 0 && stats.size <= MAX_LOCAL_MEDIA_BYTES, `${key} local file size must be 1..${MAX_LOCAL_MEDIA_BYTES} bytes`);
    } else {
      assert.equal(row.licenseClass, 'restricted', `${key} restricted license class required`);
      assert.equal(row.localAssetPath, null, `${key} restricted media-path alignment`);
      assert.equal(row.originalFileUrl, null, `${key} restricted original file alignment`);
      assert.equal(view.imageUrl, null, `${key} restricted media-path alignment`);
      const source = authority[key];
      assert.ok(source, `${key} restricted authority required`);
      assert.deepEqual(Object.keys(source), ['imageSourceName', 'imageSourceUrl', 'rightsNote'], `${key} authority fields`);
      for (const value of Object.values(source)) assert.ok(typeof value === 'string' && value.trim(), `${key} authority must contain nonempty strings`);
      https(source.imageSourceUrl, `${key} authority imageSourceUrl`);
      for (const field of ['imageSourceName', 'imageSourceUrl']) assert.equal(view[field], source[field], `${key} restricted authority alignment`);
    }
  }
  assert.deepEqual(Object.keys(authority), keys.filter((key) => rights[key].releaseClass === 'restricted'), 'restricted authority key order');
}
