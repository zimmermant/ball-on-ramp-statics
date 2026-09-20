import test from 'node:test';
import assert from 'node:assert/strict';
import { DEG, RAMP_MIN, RAMP_MAX, flapWindow } from '../src/physics.js';
import { PIVOT, BALL_R, FLAP_HANDLE_R, FLAP_HANDLE_OFF,
         rampDir, ballCentre, flapContact, flapDir, flapHandle } from '../src/scene.js';

// scene.js is pure geometry -- no DOM touched at module load -- so importing
// it under `node --test` is safe. (createScene() does build SVG nodes, but
// only when called, and these tests never call it.) No test file previously
// imported this module at all, so its tangency and handle-circle identities
// were pinned only by prose in the design spec.

const TOL = 1e-9;

function thSamples() {
  const out = [];
  for (let th = RAMP_MIN; th <= RAMP_MAX; th += 1) out.push(th);
  return out;
}

// Signed shortest difference a - b, wrapped into (-180, 180].
function angleDiffDeg(a, b) {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

test('the ball rests on the ramp: perpendicular distance from ballCentre(th) to the ramp line is BALL_R', () => {
  for (const th of thSamples()) {
    const o = ballCentre(th);
    const d = rampDir(th);                 // unit vector along the ramp, through PIVOT
    const rel = { x: o.x - PIVOT.x, y: o.y - PIVOT.y };
    // |cross(rel, d)| is the perpendicular distance from o to the line, since d is unit length.
    const dist = Math.abs(rel.x * d.y - rel.y * d.x);
    assert.ok(Math.abs(dist - BALL_R) < TOL,
      `th=${th}: perpendicular distance ${dist} != BALL_R ${BALL_R}`);
  }
});

test('the flap touches the ball: flapContact(th, al) is at distance exactly BALL_R from ballCentre(th), across the domain', () => {
  for (const th of thSamples()) {
    const o = ballCentre(th);
    const w = flapWindow(th);
    for (let al = w.min; al <= w.max; al += 1) {
      const c = flapContact(th, al);
      const dist = Math.hypot(c.x - o.x, c.y - o.y);
      assert.ok(Math.abs(dist - BALL_R) < TOL,
        `th=${th}, al=${al}: |flapContact - ballCentre| = ${dist} != BALL_R`);
    }
  }
});

test('the flap is tangent: flapDir(al) is perpendicular to the radius from ballCentre(th) to flapContact(th, al)', () => {
  // This is the identity that makes the whole problem a point-particle
  // equilibrium: the flap's normal force acts along this radius only because
  // the flap itself is tangent to the ball at the contact point.
  for (const th of thSamples()) {
    const o = ballCentre(th);
    const w = flapWindow(th);
    for (let al = w.min; al <= w.max; al += 1) {
      const c = flapContact(th, al);
      const radius = { x: c.x - o.x, y: c.y - o.y };
      const dir = flapDir(al);
      const dot = radius.x * dir.x + radius.y * dir.y;
      assert.ok(Math.abs(dot) < TOL,
        `th=${th}, al=${al}: radius . flapDir = ${dot}, expected 0`);
    }
  }
});

test('the flap handle rides a circle of radius FLAP_HANDLE_R about ballCentre(th), at angle al + FLAP_HANDLE_OFF (mod 360)', () => {
  // This is what makes the drag a single subtraction (al = psi - FLAP_HANDLE_OFF).
  for (const th of thSamples()) {
    const o = ballCentre(th);
    const w = flapWindow(th);
    for (let al = w.min; al <= w.max; al += 1) {
      const h = flapHandle(th, al);
      const rel = { x: h.x - o.x, y: h.y - o.y };
      const dist = Math.hypot(rel.x, rel.y);
      assert.ok(Math.abs(dist - FLAP_HANDLE_R) < TOL,
        `th=${th}, al=${al}: |flapHandle - ballCentre| = ${dist} != FLAP_HANDLE_R`);

      // Angle measured in maths space (y UP), matching this file's documented
      // convention that every maths-space y is negated once, at point of use.
      const angle = Math.atan2(-rel.y, rel.x) / DEG;
      const expected = al + FLAP_HANDLE_OFF;
      assert.ok(Math.abs(angleDiffDeg(angle, expected)) < 1e-7,
        `th=${th}, al=${al}: handle angle ${angle} != al + FLAP_HANDLE_OFF = ${expected} (mod 360)`);
    }
  }
});
