#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RELEASE_STAGE_FORCE_KILL_MS,
  RELEASE_STAGE_TIMEOUT_MS,
  runReleaseStage,
} from './art-history-release-stage.mjs';

const PROJECT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const tests = readdirSync(join(PROJECT_ROOT, 'tests'))
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => join('tests', name));

export const EXPECTED_RELEASE_STAGE_LABELS = Object.freeze([
  'Node test suite',
  'strict 250-work Units 1-10 validator',
  'private-media leak guard',
  'rendered browser matrix',
]);

function releaseStage(label, args) {
  return Object.freeze({
    label,
    command: process.execPath,
    args: Object.freeze(args),
    cwd: PROJECT_ROOT,
    timeoutMs: RELEASE_STAGE_TIMEOUT_MS,
    forceKillMs: RELEASE_STAGE_FORCE_KILL_MS,
    stdio: 'inherit',
  });
}

const EXPECTED_RELEASE_STAGES = Object.freeze([
  releaseStage(EXPECTED_RELEASE_STAGE_LABELS[0], ['--test', ...tests]),
  releaseStage(EXPECTED_RELEASE_STAGE_LABELS[1], [
    'scripts/validate-art-history-data.mjs',
    'art-history-map.html',
  ]),
  releaseStage(EXPECTED_RELEASE_STAGE_LABELS[2], [
    'scripts/verify-art-history-private-leaks.mjs',
  ]),
  releaseStage(EXPECTED_RELEASE_STAGE_LABELS[3], [
    'scripts/verify-art-history-browser.mjs',
  ]),
]);

export const RELEASE_STEPS = EXPECTED_RELEASE_STAGES;

export function assertExactReleaseStages(steps) {
  assert.deepEqual(
    steps,
    EXPECTED_RELEASE_STAGES,
    'release stage descriptors',
  );
}

export const assertExactReleaseStageOrder = assertExactReleaseStages;

export async function runReleaseVerification() {
  assertExactReleaseStages(RELEASE_STEPS);
  for (const stage of RELEASE_STEPS) {
    process.stdout.write(`\n[release] ${stage.label}\n`);
    await runReleaseStage(stage);
  }
  process.stdout.write('\nRelease verification passed.\n');
}

const isMain = process.argv[1]
  && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  runReleaseVerification().catch((error) => {
    process.stderr.write(`Release verification failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
