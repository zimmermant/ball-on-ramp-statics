import test from 'node:test';
import assert from 'node:assert/strict';
import { solve, flapWindow, DEG, RAMP_MIN, RAMP_MAX, FLAP_MAX } from '../src/physics.js';
import { messageFor, PERPENDICULAR_TOL, EDGE_TOL } from '../src/messages.js';

const at = (W, th, al) => ({ W, th, al, ...solve({ W, th, al }) });

test('the perpendicular message appears only at al = th, and quotes W sin th / W cos th', () => {
  for (const th of [10, 30, 60, 80]) {
    const s = at(500, th, th);
    const msg = messageFor(s);
    assert.match(msg, /perpendicular/i);
    assert.match(msg, new RegExp(String(Math.round(500 * Math.sin(th * DEG)))));
    assert.match(msg, new RegExp(String(Math.round(500 * Math.cos(th * DEG)))));

    // The sibling app's equivalent message claims BOTH forces are minimised at
    // this configuration. That is true there but false here -- N_B has no
    // interior minimum (physics.test.js pins the monotonicity). The wording
    // must not carry the "both" claim over.
    assert.doesNotMatch(msg, /N_B.*(minimum|least|cannot go below)/i);
  }

  // Just outside the tolerance, well clear of either edge, it is silent.
  const away = at(500, 30, 30 + PERPENDICULAR_TOL + 1);
  assert.equal(messageFor(away), '');
});

test('each edge message appears only within EDGE_TOL of its own limit', () => {
  for (const th of [10, 30, 60]) {
    // Near-parallel edge: the flap window's minimum.
    const w = flapWindow(th);
    const minInside = at(500, th, w.min + EDGE_TOL - 0.5);
    const minMsgIn = messageFor(minInside);
    assert.match(minMsgIn, /nearly parallel|almost no grip/i);
    assert.match(minMsgIn, new RegExp(Math.round(minInside.NA).toLocaleString('en-US')));
    assert.match(minMsgIn, new RegExp(String(Math.round(minInside.W))));

    const minOutside = at(500, th, w.min + EDGE_TOL + 5);
    assert.equal(messageFor(minOutside), '');

    // Flap-dominant edge: FLAP_MAX.
    const maxInside = at(500, th, FLAP_MAX - (EDGE_TOL - 0.5));
    const maxMsgIn = messageFor(maxInside);
    assert.match(maxMsgIn, /N_B/);
    assert.match(maxMsgIn, new RegExp(String(Math.round(maxInside.NB))));

    const maxOutside = at(500, th, FLAP_MAX - (EDGE_TOL + 5));
    assert.equal(messageFor(maxOutside), '');
  }
});

test('an ordinary state, away from every special configuration, is silent', () => {
  const s = at(500, 45, 55);
  assert.equal(messageFor(s), '');
});

test('no message ever mentions "rope", "crate" or "ring"', () => {
  for (let th = RAMP_MIN; th <= RAMP_MAX; th += 5) {
    const w = flapWindow(th);
    for (let al = w.min; al <= w.max; al += 5) {
      const msg = messageFor(at(500, th, al));
      assert.doesNotMatch(msg, /rope|crate|ring/i, `at th=${th}, al=${al}: "${msg}"`);
    }
  }
});
