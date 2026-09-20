import test from 'node:test';
import assert from 'node:assert/strict';
import { strip } from '../build.js';

// build.js only calls main() when it is the program node was invoked on (see
// its guard at the bottom), so importing it here to reach `strip` does not
// trigger a real build. These pin strip()'s two rewrites -- import/export
// removal and export-keyword stripping -- as a pure function, independent of
// the file system.

test('a single-line relative import is removed', () => {
  const src = "import { el, clear } from './svg.js';\nconst x = 1;\n";
  const out = strip(src);
  assert.ok(!out.includes('import'), out);
  assert.ok(out.includes('const x = 1;'));
});

test('a multi-line relative import is removed', () => {
  const src =
    "import { tipPosition, constraintLine,\n" +
    "         RAMP_MIN, RAMP_MAX } from './physics.js';\n" +
    "const y = 2;\n";
  const out = strip(src);
  assert.ok(!out.includes('import'), out);
  assert.ok(!out.includes('RAMP_MIN'), 'the wrapped second line must be dropped too');
  assert.ok(out.includes('const y = 2;'));
});

test('a single-line export { ... } block is removed', () => {
  const src = 'const a = 1;\nexport { a, b };\nconst c = 2;\n';
  const out = strip(src);
  assert.ok(!out.includes('export'), out);
  assert.ok(out.includes('const a = 1;'));
  assert.ok(out.includes('const c = 2;'));
});

test('export function / export const keep their declaration but lose the keyword', () => {
  const src = 'export function foo() {}\nexport const bar = 1;\n';
  const out = strip(src);
  assert.ok(!/\bexport\b/.test(out), out);
  assert.ok(out.includes('function foo() {}'));
  assert.ok(out.includes('const bar = 1;'));
});
