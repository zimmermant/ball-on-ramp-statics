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

test('the perpendicular message quotes the LIVE forces everywhere in the tolerance band, ' +
     'not just at al = th exactly', () => {
  // N_A is stationary at al = th (a minimum), so recomputing W*sin(th) instead of
  // quoting s.NA is nearly harmless there. N_B is monotonic in al at that point --
  // it has no interior minimum -- so the same shortcut can be off by several
  // percent a fraction of a degree away. Sweep the whole tolerance band at a
  // steep ramp, where the asymmetry bites, and demand the message's two numbers
  // equal Math.round(s.NA) and Math.round(s.NB) at every sample -- not
  // Math.round(W*sin(th)) / Math.round(W*cos(th)), which only coincide with the
  // live forces at the single point al === th.
  // The perpendicular branch is an OPEN interval (Math.abs(al - th) < TOL), so
  // the band's endpoints themselves are silent; sweep strictly inside it.
  const W = 900, th = 80;
  const EPS = 1e-6;
  let sampled = 0;
  for (let al = th - PERPENDICULAR_TOL + EPS; al < th + PERPENDICULAR_TOL; al += 0.01) {
    const s = at(W, th, al);
    const msg = messageFor(s);
    assert.match(msg, /perpendicular/i, `expected the perpendicular message at al=${al}`);
    const m = msg.match(/W·sin θ = (-?\d+) N[\s\S]*W·cos θ = (-?\d+) N/);
    assert.ok(m, `could not find quoted N_A/N_B in message: "${msg}"`);
    const quotedNA = Number(m[1]), quotedNB = Number(m[2]);
    assert.equal(quotedNA, Math.round(s.NA),
      `at al=${al}: message quoted ${quotedNA} N for N_A, live N_A rounds to ${Math.round(s.NA)} N`);
    assert.equal(quotedNB, Math.round(s.NB),
      `at al=${al}: message quoted ${quotedNB} N for N_B, live N_B rounds to ${Math.round(s.NB)} N ` +
      `(gap vs recomputed W*cos(th) = ${(s.NB - W * Math.cos(th * DEG)).toFixed(2)} N)`);
    sampled++;
  }
  assert.ok(sampled > 10, 'the sweep should have covered many samples');
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
