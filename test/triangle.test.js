import test from 'node:test';
import assert from 'node:assert/strict';
import { solve, tipPosition, flapWindow, DEG } from '../src/physics.js';

test('the triangle closes, and its second side IS the ramp force', () => {
  // Acceptance criterion 8 rests on this construction, so assert the physics
  // rather than the telescoping identity AB + BC + CA = 0, which holds for any
  // three points whatsoever and can never fail.
  for (const [W, th, al] of [[500, 30, 0], [900, 60, 45], [200, 10, -60], [500, 85, 5]]) {
    const { NA, NB } = solve({ W, th, al });
    const A = { x: 0, y: 0 };
    const B = tipPosition({ N: NA, ang: al, which: 'flap' });
    const C = { x: 0, y: W };
    const BC = { x: C.x - B.x, y: C.y - B.y };
    const ramp = tipPosition({ N: NB, ang: th, which: 'ramp' });
    assert.ok(Math.abs(Math.hypot(BC.x, BC.y) - NB) < 1e-9, `|BC| != NB at ${th},${al}`);
    assert.ok(Math.hypot(BC.x - ramp.x, BC.y - ramp.y) < 1e-9,
      `BC is not the ramp force vector at ${th},${al}`);
    assert.ok(Math.abs(A.x) < 1e-12 && Math.abs(C.x) < 1e-12, 'the W side must be vertical');
  }
});
