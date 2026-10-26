import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const media = JSON.parse(readFileSync(new URL('../data/ap-art-history-unit-10-media.json', import.meta.url), 'utf8'));
const content = JSON.parse(readFileSync(new URL('../data/ap-art-history-unit-10-content.json', import.meta.url), 'utf8'));
const english = readFileSync(new URL('../docs/content/ap-art-history-unit-10-english.md', import.meta.url), 'utf8');

test('U10 English edition carries reviewed status and source for every required component', () => {
  const sections = english.split(/^## AP #/m).slice(1);
  assert.equal(sections.length, 27);
  for (const work of content) {
    const section = sections.find(value => value.startsWith(`${work.apNumber}:`));
    assert.ok(section, `AP${work.apNumber} section`);
    const status = section.split('### Media Credits and Public Status')[1];
    assert.ok(status, `AP${work.apNumber} public media status`);
    for (const view of media.images[work.id]) {
      assert.ok(status.includes(`\`${view.id}\``), `${work.id}::${view.id} status`);
      assert.ok(status.includes(view.imageSourceUrl), `${work.id}::${view.id} source`);
      if (!view.imageUrl) assert.match(status, /not (?:(?:yet|jointly) )?verified|unverified/i);
    }
  }
});
