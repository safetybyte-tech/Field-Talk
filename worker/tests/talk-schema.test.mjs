import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
const schemaSource = source.slice(source.indexOf('const structuredTalkSchema ='), source.indexOf('const TALK_SECTION_KEYS ='));
const schema = runInNewContext(`${schemaSource}\nstructuredTalkSchema`);

test('abbreviated generation fields match the displayed safety sections', () => {
  assert.match(schema.properties.sif.description, /PREVENTION.*actions and controls/);
  assert.match(schema.properties.sif.description, /not a list of injuries/);
  assert.match(schema.properties.manual.description, /Material handling.*lifting, carrying, moving/);
  assert.match(schema.properties.manual.description, /does not mean manuals/);
  for (const key of ['sif', 'manual']) {
    assert.equal(schema.properties[key].type, 'array');
    assert.equal(schema.properties[key].maxItems, 4);
    assert.equal(schema.properties[key].items.type, 'string');
  }
});
