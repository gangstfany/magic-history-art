#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PROJECT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PRIVATE_MEDIA_SEGMENT = '.private-media/';
const MAC_USER_PREFIX = ['', 'Users', ''].join('/');
const LINUX_HOME_PREFIX = ['', 'home', ''].join('/');
const FILE_URL_PREFIX = ['file', '://'].join('');
const WINDOWS_DRIVE_PATH = /(?:^|[^A-Za-z0-9+.-])[A-Za-z]:[\\/]/m;
const MAX_NORMALIZATION_ROUNDS = 4;
const KNOWN_BINARY_EXTENSIONS = new Set([
  '.avif', '.eot', '.gif', '.ico', '.jpeg', '.jpg', '.mp3', '.mp4', '.ogg',
  '.otf', '.pdf', '.png', '.ttf', '.wav', '.webm', '.webp', '.woff', '.woff2',
  '.zip',
]);

export const MAX_TRACKED_TEXT_BYTES = 8 * 1024 * 1024;

export const RESTRICTED_ASSET_URL_HASHES = new Set([
  '0f9ce82f5ae6f07a780932ca45aa08b6c0dafb4e1ba7b6c0c8eeaee3f0d42338',
  '1b3f63857c67468c52487134ab19be80f12641be8edd774eae983af2e7ca4161',
  '48d1689e6d3ff68eb82c1bb89fef89757884ddf0c78cfb70e1a74dc57efc11f8',
  '22c73b3d78607821ee24ec1bb1bf1b5e4a368333dc4308f8405bc30c4db7a78d',
  '444f4811b4aba88301f8865a053d4153fa55d530ec2237371a62fe16eaa532ce',
  '56292334a9b12dc5aca208e02545e8e02d109ceb45cfabd6cac0946e39ede941',
  '58549ea2e384bde855c849fd15e359420db167b3646071bc7e16f5277f9755b2',
  '3ddd0a813d02389521bd5b64a97068b3455a8800f556a8a846a7940a89953c5a',
]);

function normalizePercentTripletHexCase(url) {
  return url.replace(/%[0-9a-f]{2}/gi, (triplet) => triplet.toUpperCase());
}

export function canonicalizeAssetUrl(url) {
  assert.equal(typeof url, 'string', 'restricted asset URL must be a string');
  const parsed = new URL(url);
  assert.equal(parsed.protocol, 'https:', 'restricted asset URL must use HTTPS');
  parsed.hash = '';
  return normalizePercentTripletHexCase(parsed.href);
}

export function hashAssetUrl(url) {
  return createHash('sha256').update(canonicalizeAssetUrl(url)).digest('hex');
}

export function assertNoTrackedPrivatePaths(paths) {
  const leaked = paths.find((path) => (
    path.startsWith(PRIVATE_MEDIA_SEGMENT)
    || path.includes(`/${PRIVATE_MEDIA_SEGMENT}`)
  ));
  assert.equal(leaked, undefined, `tracked private-media path: ${leaked}`);
}

function assertTextWithinScanLimit(path, textOrBytes, maxBytes = MAX_TRACKED_TEXT_BYTES) {
  const bytes = typeof textOrBytes === 'string'
    ? Buffer.byteLength(textOrBytes, 'utf8')
    : textOrBytes.byteLength;
  assert.ok(
    bytes <= maxBytes,
    `${path} exceeds ${maxBytes}-byte tracked text scan limit`,
  );
}

function isKnownBinaryPath(path) {
  return KNOWN_BINARY_EXTENSIONS.has(extname(path).toLowerCase());
}

export function decodeTrackedTextContent(
  path,
  content,
  maxBytes = MAX_TRACKED_TEXT_BYTES,
) {
  if (isKnownBinaryPath(path)) return null;
  assert.ok(content instanceof Uint8Array, `${path} tracked content must be bytes`);
  assertTextWithinScanLimit(path, content, maxBytes);
  assert.equal(
    content.includes(0),
    false,
    `Tracked release text ${path} contains a NUL byte`,
  );
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(content);
  } catch (error) {
    assert.fail(`Tracked release text ${path} is not valid UTF-8: ${error.message}`);
  }
}

function decodeHtmlEntities(text) {
  const named = new Map([
    ['amp', '&'],
    ['bsol', '\\'],
    ['colon', ':'],
    ['percnt', '%'],
    ['sol', '/'],
  ]);
  return text.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi,
    (entity, decimal, hexadecimal, name) => {
      if (decimal || hexadecimal) {
        const codePoint = Number.parseInt(decimal ?? hexadecimal, decimal ? 10 : 16);
        if (Number.isSafeInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff) {
          return String.fromCodePoint(codePoint);
        }
        return entity;
      }
      return named.get(name.toLowerCase()) ?? entity;
    },
  );
}

function decodeSlashEscapes(text) {
  return text
    .replace(/\\u([0-9a-f]{4})/gi, (_escape, hexadecimal) => (
      String.fromCodePoint(Number.parseInt(hexadecimal, 16))
    ))
    .replace(/\\x([0-9a-f]{2})/gi, (_escape, hexadecimal) => (
      String.fromCodePoint(Number.parseInt(hexadecimal, 16))
    ))
    .replace(/\\\//g, '/')
    .replace(/\\\\/g, '\\');
}

function decodePercentEscapes(text) {
  return text.replace(/(?:%[0-9a-f]{2})+/gi, (encoded) => {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded.replace(/%([0-9a-f]{2})/gi, (_escape, hexadecimal) => (
        String.fromCodePoint(Number.parseInt(hexadecimal, 16))
      ));
    }
  });
}

function browserEquivalentHttpsCandidates(text) {
  return text.matchAll(/https:[/\\]{1,2}[^\s"'<>`]+/gi);
}

function decodePercentEscapesOutsideHttpsUrls(text) {
  let decoded = '';
  let cursor = 0;
  for (const match of browserEquivalentHttpsCandidates(text)) {
    decoded += decodePercentEscapes(text.slice(cursor, match.index));
    decoded += match[0];
    cursor = match.index + match[0].length;
  }
  return decoded + decodePercentEscapes(text.slice(cursor));
}

function normalizedTextVariants(path, text) {
  assert.equal(typeof text, 'string', `${path} scan text must be a string`);
  assertTextWithinScanLimit(path, text);
  const variants = new Set([text]);
  let current = text;
  const transforms = [decodeHtmlEntities, decodeSlashEscapes, decodePercentEscapes];
  for (let round = 0; round < MAX_NORMALIZATION_ROUNDS; round += 1) {
    const roundStart = current;
    for (const transform of transforms) {
      current = transform(current);
      assertTextWithinScanLimit(path, current);
      variants.add(current);
    }
    if (current === roundStart) break;
  }
  return variants;
}

function normalizedUrlScanVariants(path, text) {
  assert.equal(typeof text, 'string', `${path} scan text must be a string`);
  assertTextWithinScanLimit(path, text);
  const variants = new Set([text]);
  let current = text;
  for (let round = 0; round < MAX_NORMALIZATION_ROUNDS; round += 1) {
    const roundStart = current;
    current = decodeHtmlEntities(current);
    assertTextWithinScanLimit(path, current);
    variants.add(current);
    current = decodeSlashEscapes(current);
    assertTextWithinScanLimit(path, current);
    variants.add(current);

    // Percent decoding is transport normalization only outside an already
    // visible URL. URL path/query escapes remain for the WHATWG parser, while
    // separately encoded URLs in the same file continue to be discovered.
    current = decodePercentEscapesOutsideHttpsUrls(current);
    assertTextWithinScanLimit(path, current);
    variants.add(current);
    if (current === roundStart) break;
  }
  return variants;
}

export function assertNoAbsolutePrivatePaths(entries) {
  for (const { path, text } of entries) {
    for (const candidate of normalizedTextVariants(path, text)) {
      assert.equal(
        candidate.includes(MAC_USER_PREFIX),
        false,
        `Public artifact ${path} contains forbidden ${MAC_USER_PREFIX} path`,
      );
      assert.equal(
        candidate.includes(FILE_URL_PREFIX),
        false,
        `Public artifact ${path} contains forbidden ${FILE_URL_PREFIX} URL`,
      );
      assert.equal(
        candidate.includes(LINUX_HOME_PREFIX),
        false,
        `Public artifact ${path} contains forbidden ${LINUX_HOME_PREFIX} path`,
      );
      assert.equal(
        WINDOWS_DRIVE_PATH.test(candidate),
        false,
        `Public artifact ${path} contains forbidden Windows drive path`,
      );
    }
  }
}

export const RUNTIME_BROWSER_TIMEOUT_MS = 30_000;
export const RUNTIME_BROWSER_CLEANUP_TIMEOUT_MS = 5_000;

export async function runBoundedRuntimeSession(
  run,
  {
    label = 'runtime private-key browser',
    timeoutMs = RUNTIME_BROWSER_TIMEOUT_MS,
    cleanupTimeoutMs = RUNTIME_BROWSER_CLEANUP_TIMEOUT_MS,
  } = {},
) {
  assert.equal(typeof run, 'function', `${label} runner`);
  assert.ok(Number.isFinite(timeoutMs) && timeoutMs > 0, `${label} timeout`);
  assert.ok(
    Number.isFinite(cleanupTimeoutMs) && cleanupTimeoutMs > 0,
    `${label} cleanup timeout`,
  );

  const resources = [];
  const cleanupErrors = [];
  const deadline = Date.now() + timeoutMs;
  let phase = 'startup';
  let timedOut = false;
  let watchdogTimer;
  const timeoutError = (timeoutPhase = phase) => new Error(
    `${label} timed out after ${timeoutMs} ms during ${timeoutPhase}`,
  );
  const deadlineExpired = () => timedOut || Date.now() >= deadline;
  const closeResource = async (resource, resourceLabel, cleanup) => {
    if (!resource) return;
    const release = cleanup ?? ((target) => target.close());
    if (!cleanup && typeof resource.close !== 'function') return;
    let cleanupTimer;
    try {
      await Promise.race([
        Promise.resolve().then(() => release(resource)),
        new Promise((_, reject) => {
          cleanupTimer = setTimeout(
            () => reject(new Error(
              `${label} ${resourceLabel} cleanup timed out after ${cleanupTimeoutMs} ms`,
            )),
            cleanupTimeoutMs,
          );
        }),
      ]);
    } finally {
      clearTimeout(cleanupTimer);
    }
  };
  const session = Object.freeze({
    acquire: async (resourceLabel, create, cleanup) => {
      assert.equal(typeof create, 'function', `${label} ${resourceLabel} creator`);
      if (cleanup !== undefined) {
        assert.equal(typeof cleanup, 'function', `${label} ${resourceLabel} cleanup`);
      }
      phase = `${resourceLabel} creation`;
      const resource = await create();
      if (deadlineExpired()) {
        timedOut = true;
        try {
          await closeResource(resource, `late ${resourceLabel}`, cleanup);
        } catch {
          // The primary timeout remains authoritative; late cleanup is still bounded.
        }
        throw timeoutError(`${resourceLabel} creation`);
      }
      resources.push({ label: resourceLabel, resource, cleanup });
      return resource;
    },
    run: async (operationLabel, operation) => {
      assert.equal(typeof operation, 'function', `${label} ${operationLabel} operation`);
      phase = operationLabel;
      const value = await operation();
      if (deadlineExpired()) {
        timedOut = true;
        throw timeoutError(operationLabel);
      }
      return value;
    },
  });
  const watchdog = new Promise((_, reject) => {
    watchdogTimer = setTimeout(() => {
      timedOut = true;
      reject(timeoutError());
    }, Math.max(0, deadline - Date.now()));
  });

  let result;
  let operationError;
  const lifecycle = Promise.resolve().then(() => run(session));
  try {
    result = await Promise.race([lifecycle, watchdog]);
  } catch (error) {
    operationError = error;
  } finally {
    clearTimeout(watchdogTimer);
  }

  for (const { label: resourceLabel, resource, cleanup } of resources.reverse()) {
    try {
      await closeResource(resource, resourceLabel, cleanup);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (operationError) throw operationError;
  if (cleanupErrors.length === 1) throw cleanupErrors[0];
  if (cleanupErrors.length > 1) {
    throw new AggregateError(cleanupErrors, `${label} cleanup failed`);
  }
  return result;
}

export async function withRuntimePrivateKeyBrowser(
  verify,
  {
    launchBrowser,
    timeoutMs = RUNTIME_BROWSER_TIMEOUT_MS,
    cleanupTimeoutMs = RUNTIME_BROWSER_CLEANUP_TIMEOUT_MS,
  } = {},
) {
  return runBoundedRuntimeSession(async (session) => {
    const browser = await session.acquire('browser', async () => {
      if (launchBrowser) return launchBrowser();
      const { discoverBrowser, discoverPlaywright } = await import('./verify-art-history-browser.mjs');
      const playwright = await discoverPlaywright();
      const executablePath = await discoverBrowser(playwright.chromium);
      return playwright.chromium.launch({
        executablePath,
        headless: true,
        args: ['--disable-gpu', '--no-sandbox'],
      });
    });
    return session.run('runtime verification', () => verify(browser, session));
  }, {
    label: 'runtime private-key browser',
    timeoutMs,
    cleanupTimeoutMs,
  });
}

export async function readRuntimePrivateMediaKeysInBrowser({
  browser,
  html,
  url,
  label = 'runtime U5 private media',
  session,
  timeoutMs = RUNTIME_BROWSER_TIMEOUT_MS,
  cleanupTimeoutMs = RUNTIME_BROWSER_CLEANUP_TIMEOUT_MS,
}) {
  assert.ok(browser && typeof browser.newContext === 'function', `${label} browser`);
  assert.equal(
    (typeof html === 'string') + (typeof url === 'string'),
    1,
    `${label} requires exactly one HTML string or URL`,
  );
  if (typeof html === 'string') assertTextWithinScanLimit(label, html);

  const inspect = async (activeSession) => {
    const context = await activeSession.acquire(
      `${label} context`,
      () => browser.newContext({ serviceWorkers: 'block' }),
    );
    const checkerProperty = randomBytes(32).toString('hex');
    const checkerPropertyLiteral = JSON.stringify(checkerProperty);
    const checkerSource = `{
      const primordialArrayIsArray = Array.isArray;
      const primordialObjectIsFrozen = Object.isFrozen;
      const checker = (value) => (
        primordialArrayIsArray(value) && primordialObjectIsFrozen(value)
      );
      Object.defineProperty(this, ${checkerPropertyLiteral}, {
        value: checker,
        writable: false,
        configurable: false,
        enumerable: false,
      });
    }`;
    await activeSession.run(
      `${label} primordial checker installation`,
      () => context.addInitScript({ content: checkerSource }),
    );
    const page = await activeSession.acquire(`${label} page`, () => context.newPage());
    const cdp = await activeSession.acquire(
      `${label} CDP session`,
      () => context.newCDPSession(page),
      (cdpSession) => cdpSession.detach(),
    );
    return activeSession.run(`${label} inspection`, async () => {
      const issues = [];
      page.on('pageerror', (error) => {
        issues.push(`${label} pageerror: ${error.message}`);
      });
      page.on('console', (message) => {
        if (message.type() === 'error') {
          issues.push(`${label} console error: ${message.text()}`);
        }
      });
      await page.route('**/*', async (route) => {
        const protocol = new URL(route.request().url()).protocol;
        if (protocol === 'http:' || protocol === 'https:') {
          await route.abort('blockedbyclient');
        } else {
          await route.continue();
        }
      });

      if (typeof html === 'string') {
        await page.setContent(html, { waitUntil: 'load', timeout: timeoutMs });
      } else {
        await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
      }
      await page.waitForTimeout(0);
      assert.deepEqual(issues, [], `${label} runtime U5 private media issues`);

      const evaluateOptions = {
        awaitPromise: false,
        includeCommandLineAPI: false,
        silent: false,
      };
      let shapeResponse;
      let checkerResponse;
      let frozenResponse;
      let propertiesResponse;
      try {
        shapeResponse = await cdp.send('Runtime.evaluate', {
          ...evaluateOptions,
          expression: 'U5_PRIVATE_MEDIA_KEYS',
          returnByValue: false,
        });
        checkerResponse = await cdp.send('Runtime.evaluate', {
          ...evaluateOptions,
          expression: `this[${checkerPropertyLiteral}]`,
          returnByValue: false,
        });
      } catch (error) {
        throw new Error(`${label} CDP Runtime.evaluate failed: ${error.message}`);
      }
      assert.deepEqual(issues, [], `${label} runtime U5 private media issues`);
      for (const [responseLabel, response] of [
        ['shape', shapeResponse],
        ['primordial checker', checkerResponse],
      ]) {
        if (!response.exceptionDetails) continue;
        const exception = response.exceptionDetails.exception?.description
          ?? response.exceptionDetails.text
          ?? 'unknown exception';
        throw new Error(
          `${label} CDP Runtime.evaluate ${responseLabel} exception: ${exception}`,
        );
      }
      const shapeRemote = shapeResponse.result;
      if (typeof shapeRemote?.objectId === 'string') {
        await activeSession.acquire(
          `${label} runtime remote object`,
          async () => shapeRemote.objectId,
          (objectId) => cdp.send('Runtime.releaseObject', { objectId }),
        );
      }
      assert.equal(shapeRemote?.type, 'object', `${label} runtime U5 private media remote type`);
      assert.equal(shapeRemote?.subtype, 'array', `${label} runtime U5 private media remote subtype`);
      assert.equal(
        typeof shapeRemote?.objectId,
        'string',
        `${label} runtime U5 private media remote object id`,
      );
      const checkerRemote = checkerResponse.result;
      if (typeof checkerRemote?.objectId === 'string') {
        await activeSession.acquire(
          `${label} primordial checker remote object`,
          async () => checkerRemote.objectId,
          (objectId) => cdp.send('Runtime.releaseObject', { objectId }),
        );
      }
      assert.equal(
        checkerRemote?.type,
        'function',
        `${label} primordial checker remote type`,
      );
      assert.equal(
        typeof checkerRemote?.objectId,
        'string',
        `${label} primordial checker remote object id`,
      );
      try {
        frozenResponse = await cdp.send('Runtime.callFunctionOn', {
          objectId: checkerRemote.objectId,
          functionDeclaration: 'function (value) { return this(value); }',
          arguments: [{ objectId: shapeRemote.objectId }],
          returnByValue: true,
          awaitPromise: false,
          silent: false,
        });
        propertiesResponse = await cdp.send('Runtime.getProperties', {
          objectId: shapeRemote.objectId,
          ownProperties: true,
          accessorPropertiesOnly: false,
          generatePreview: false,
          nonIndexedPropertiesOnly: false,
        });
      } catch (error) {
        throw new Error(`${label} CDP runtime object inspection failed: ${error.message}`);
      }
      if (frozenResponse.exceptionDetails) {
        const exception = frozenResponse.exceptionDetails.exception?.description
          ?? frozenResponse.exceptionDetails.text
          ?? 'unknown exception';
        throw new Error(`${label} primordial checker exception: ${exception}`);
      }
      assert.equal(
        frozenResponse.result?.type,
        'boolean',
        `${label} primordial checker result type`,
      );
      assert.equal(
        frozenResponse.result?.value,
        true,
        `${label} runtime U5 private media keys must be frozen`,
      );
      if (propertiesResponse.exceptionDetails) {
        const exception = propertiesResponse.exceptionDetails.exception?.description
          ?? propertiesResponse.exceptionDetails.text
          ?? 'unknown exception';
        throw new Error(`${label} CDP Runtime.getProperties exception: ${exception}`);
      }
      const proxyMarkers = new Set(['[[Target]]', '[[Handler]]', '[[IsRevoked]]']);
      assert.equal(
        propertiesResponse.internalProperties?.some(({ name }) => proxyMarkers.has(name)) ?? false,
        false,
        `${label} runtime U5 private media keys must not be a Proxy`,
      );
      assert.equal(
        Array.isArray(propertiesResponse.result),
        true,
        `${label} runtime U5 private media property descriptors`,
      );
      const descriptors = new Map();
      for (const descriptor of propertiesResponse.result) {
        assert.equal(
          descriptor.symbol,
          undefined,
          `${label} runtime U5 private media keys must not have symbol properties`,
        );
        assert.equal(
          descriptors.has(descriptor.name),
          false,
          `${label} runtime U5 private media duplicate property ${descriptor.name}`,
        );
        descriptors.set(descriptor.name, descriptor);
      }
      const lengthDescriptor = descriptors.get('length');
      assert.ok(lengthDescriptor, `${label} runtime U5 private media array length descriptor`);
      assert.equal(
        Object.hasOwn(lengthDescriptor, 'get') || Object.hasOwn(lengthDescriptor, 'set'),
        false,
        `${label} runtime U5 private media array length must be a data property`,
      );
      assert.equal(
        lengthDescriptor.value?.type,
        'number',
        `${label} runtime U5 private media array length type`,
      );
      const length = lengthDescriptor.value?.value;
      assert.equal(
        Number.isSafeInteger(length) && length >= 0,
        true,
        `${label} runtime U5 private media array length value`,
      );
      assert.equal(
        descriptors.size,
        length + 1,
        `${label} runtime U5 private media keys must be dense with no extra own properties`,
      );
      const keys = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors.get(String(index));
        assert.ok(
          descriptor,
          `${label} runtime U5 private media keys must contain index ${index}`,
        );
        assert.equal(
          Object.hasOwn(descriptor, 'get') || Object.hasOwn(descriptor, 'set'),
          false,
          `${label} runtime U5 private media index ${index} must be a data property`,
        );
        assert.equal(
          descriptor.value?.type,
          'string',
          `${label} runtime U5 private media index ${index} must be a string`,
        );
        keys.push(descriptor.value.value);
      }
      assert.ok(
        keys.every((key) => typeof key === 'string' && key.length > 0),
        `${label} runtime U5 private media keys must be nonempty strings`,
      );
      assert.equal(
        new Set(keys).size,
        keys.length,
        `${label} runtime U5 private media keys must be unique`,
      );
      return Object.freeze(keys);
    });
  };
  if (session) return inspect(session);
  return runBoundedRuntimeSession(inspect, {
    label,
    timeoutMs,
    cleanupTimeoutMs,
  });
}

function collectU5RestrictedCanonicalKeys(canonical) {
  assert.ok(canonical && Array.isArray(canonical.artworks), 'U5 canonical artworks must be an array');
  const keys = [];
  for (const work of canonical.artworks) {
    assert.equal(typeof work.id, 'string', 'U5 canonical work id');
    assert.ok(Array.isArray(work.images), `U5 canonical ${work.id} images must be an array`);
    for (const image of work.images) {
      if (image.mediaStatus !== 'rightsRestricted') continue;
      const identity = `${work.id}::${image.id}`;
      assert.equal(
        image.imageUrl,
        null,
        `${identity} restricted media requires null public imageUrl`,
      );
      keys.push(identity);
    }
  }
  assert.equal(new Set(keys).size, keys.length, 'U5 canonical restricted keys must be unique');
  return keys;
}

export function assertU5RestrictedMediaContract({
  authority,
  canonical,
  runtimeKeys,
  verifierKeys,
}) {
  assert.ok(authority && typeof authority === 'object' && !Array.isArray(authority), 'U5 placeholder authority must be an object');
  const canonicalKeys = collectU5RestrictedCanonicalKeys(canonical);
  const authorityKeys = Object.keys(authority);

  assert.deepEqual(authorityKeys, canonicalKeys, 'U5 placeholder authority keys');
  assert.deepEqual(Array.from(runtimeKeys), canonicalKeys, 'runtime U5 private media keys');
  assert.deepEqual(Array.from(verifierKeys), canonicalKeys, 'browser verifier U5 private media keys');
  return canonicalKeys;
}

function extractHttpsUrls(text) {
  return [...browserEquivalentHttpsCandidates(text)]
    .map(([url]) => url.replace(/[),.;\]}]+$/g, ''));
}

export function assertNoRestrictedAssetUrls(
  entries,
  restrictedHashes = RESTRICTED_ASSET_URL_HASHES,
) {
  for (const { path, text } of entries) {
    for (const candidate of normalizedUrlScanVariants(path, text)) {
      for (const url of extractHttpsUrls(candidate)) {
        let hash;
        try {
          hash = hashAssetUrl(url);
        } catch (error) {
          if (error?.code === 'ERR_INVALID_URL') continue;
          throw error;
        }
        assert.equal(
          restrictedHashes.has(hash),
          false,
          `${path} contains restricted asset URL hash ${hash}`,
        );
      }
    }
  }
}

function isDeployablePublicArtifact(path) {
  return (
    path === 'art-history-map.html'
    || path === 'index.html'
    || path === 'world-map.html'
    || path === 'docs/art-history-sources.md'
    || path.startsWith('data/')
    || path.startsWith('docs/data-sources/')
    || path.startsWith('scripts/')
    || path.startsWith('tests/fixtures/')
  );
}

export function selectTrackedReleaseTextEntries(entries) {
  return entries.filter(({ path }) => isDeployablePublicArtifact(path));
}

export async function loadTrackedTextEntries(
  root,
  paths,
  maxBytes = MAX_TRACKED_TEXT_BYTES,
) {
  const entries = [];
  for (const path of paths) {
    if (isKnownBinaryPath(path)) continue;
    const metadata = await stat(join(root, path));
    assert.ok(metadata.isFile(), `Tracked release path ${path} must be a regular file`);
    assert.ok(
      metadata.size <= maxBytes,
      `${path} exceeds ${maxBytes}-byte tracked text scan limit`,
    );
    const content = await readFile(join(root, path));
    const text = decodeTrackedTextContent(path, content, maxBytes);
    if (text !== null) entries.push({ path, text });
  }
  return entries;
}

async function readJsonWhenPresent(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function runPrivateLeakVerification(root = PROJECT_ROOT) {
  const trackedOutput = execFileSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'utf8',
  });
  const trackedPaths = trackedOutput.split('\0').filter(Boolean);
  assertNoTrackedPrivatePaths(trackedPaths);

  const trackedText = await loadTrackedTextEntries(root, trackedPaths);
  const deployableText = selectTrackedReleaseTextEntries(trackedText);
  assertNoAbsolutePrivatePaths(deployableText);
  assertNoRestrictedAssetUrls(trackedText);
  const authority = await readJsonWhenPresent(join(
    root,
    'data/ap-art-history-unit-5-placeholder-authority.json',
  ));
  let u5RestrictedKeyCount = 0;
  if (authority) {
    const [canonical, browserVerifier] = await Promise.all([
      readJsonWhenPresent(join(root, 'tests/fixtures/u5-canonical.json')),
      import(pathToFileURL(join(root, 'scripts/verify-art-history-browser.mjs')).href),
    ]);
    assert.ok(canonical, 'U5 canonical fixture is required with placeholder authority');
    const runtimeUrl = pathToFileURL(join(root, 'art-history-map.html'));
    runtimeUrl.searchParams.set('privateMedia', '0');
    const runtimeKeys = await withRuntimePrivateKeyBrowser((browser, session) => (
      readRuntimePrivateMediaKeysInBrowser({
        browser,
        session,
        url: runtimeUrl.href,
        label: 'production runtime',
      })
    ));
    u5RestrictedKeyCount = assertU5RestrictedMediaContract({
      authority,
      canonical,
      runtimeKeys,
      verifierKeys: browserVerifier.U5_PRIVATE_MEDIA_KEYS,
    }).length;
  }
  return {
    trackedFiles: trackedPaths.length,
    trackedTextFiles: trackedText.length,
    deployableTextFiles: deployableText.length,
    restrictedHashCount: RESTRICTED_ASSET_URL_HASHES.size,
    u5RestrictedKeyCount,
  };
}

const isMain = process.argv[1]
  && fileURLToPath(import.meta.url) === normalize(process.argv[1]);

if (isMain) {
  runPrivateLeakVerification()
    .then((result) => {
      process.stdout.write(`Private media leak verification passed: ${JSON.stringify(result)}\n`);
    })
    .catch((error) => {
      process.stderr.write(`Private media leak verification failed: ${error.message}\n`);
      process.exitCode = 1;
    });
}
