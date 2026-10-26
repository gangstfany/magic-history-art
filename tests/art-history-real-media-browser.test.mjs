import test from 'node:test';
import assert from 'node:assert/strict';
import { assertRealMediaCoverage } from '../scripts/verify-art-history-local-media-browser.mjs';
import { U6_SMOKE_VIEWPORTS } from '../scripts/verify-art-history-browser.mjs';

const expected = Array.from({ length: 50 }, (_, i) => ({ key: `work-${i}::primary`, src: i < 26 ? `assets/art-history/u5/ap${i}.webp` : null }));
function fixture() {
  return { cases: U6_SMOKE_VIEWPORTS.map(viewport => ({
    viewport, issues: [], checkpoints: Array.from({ length: 50 }, () => ({ frame: 0, host: 0 })),
    dialogFocusRestored: true, comparisonReturned: true, tabsVisited: 112,
    rows: expected.map(row => row.src ? { ...row, width: 800, height: 600, bytes: 120000, objectFit: 'contain', status: 200 } : { ...row, imageCount: 0, newImageRequests: 0 }),
  })) };
}
test('accepts complete real-image evidence in all three modes', () => assert.doesNotThrow(() => assertRealMediaCoverage(fixture(), expected)));
const corruptions = {
  'missing view': report => report.cases[0].rows.pop(),
  'zero decoded width': report => { report.cases[0].rows[0].width = 0; },
  'oversized dimensions': report => { report.cases[0].rows[0].height = 2001; },
  'oversized bytes': report => { report.cases[0].rows[0].bytes = 1572865; },
  '404 response': report => { report.cases[0].rows[0].status = 404; },
  'wrong source': report => { report.cases[0].rows[0].src = 'wrong.webp'; },
  'cropped image': report => { report.cases[0].rows[0].objectFit = 'cover'; },
  'host overflow': report => { report.cases[0].checkpoints[0].host = 20; },
  'frame overflow': report => { report.cases[0].checkpoints[0].frame = 20; },
  'console error': report => { report.cases[0].issues.push('error'); },
  'placeholder request': report => { report.cases[0].rows[49].newImageRequests = 1; },
  'placeholder image': report => { report.cases[0].rows[49].imageCount = 1; },
  'lost focus': report => { report.cases[0].dialogFocusRestored = false; },
  'missing tab': report => { report.cases[0].tabsVisited--; },
};
for (const [label, corrupt] of Object.entries(corruptions)) test(`rejects ${label}`, () => {
  const report = fixture();
  corrupt(report);
  assert.throws(() => assertRealMediaCoverage(report, expected));
});
