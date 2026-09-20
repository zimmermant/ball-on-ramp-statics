import test from 'node:test';
import assert from 'node:assert/strict';
import { solve, DEG } from '../src/physics.js';
import { terms } from '../src/equations.js';

function stateAt(W, th, al) {
  return { W, th, al, ...solve({ W, th, al }) };
}

test('the two horizontal terms agree, because they are mathematically equal', () => {
  for (let i = 0; i < 2000; i++) {
    const th = 5 + Math.random() * 80;
    const al = th - 80 + Math.random() * (85 - (th - 80));
    const s = stateAt(100 + Math.random() * 800, th, al);
    const t = terms(s);
    assert.ok(Math.abs(Number(t.fxLeft) - Number(t.fxRight)) < 1e-9,
      `${t.fxLeft} vs ${t.fxRight}`);
  }
});

test('at the default state both horizontal terms print identically', () => {
  const t = terms(stateAt(500, 30, 0));
  assert.equal(t.fxLeft, t.fxRight);
  assert.equal(t.na, '288.7');
  assert.equal(t.nb, '577.4');
});

test('rounding the forces first would visibly break the balance', () => {
  // This is the bug the one-decimal rule prevents. If someone "simplifies" the
  // panel back to whole newtons, this test documents why that is wrong.
  const s = stateAt(500, 30, 0);
  const naiveLeft = Math.round(s.NA) * Math.cos(s.al * DEG);
  const naiveRight = Math.round(s.NB) * Math.sin(s.th * DEG);
  assert.ok(Math.abs(naiveLeft - naiveRight) > 0.05,
    'expected the naive rounding to disagree noticeably');
});
