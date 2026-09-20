import test from 'node:test';
import assert from 'node:assert/strict';
import {
  solve, clampRamp, clampWeight, clampFlap, flapWindow, DEG
} from '../src/physics.js';

function residuals({ W, th, al }) {
  const { NA, NB } = solve({ W, th, al });
  const a = al * DEG, b = th * DEG;
  return {
    fx: NA * Math.cos(a) - NB * Math.sin(b),
    fy: NA * Math.sin(a) + NB * Math.cos(b) - W,
    NA, NB
  };
}

test('default state matches the spec', () => {
  const { NA, NB } = solve({ W: 500, th: 30, al: 0 });
  assert.ok(Math.abs(NA - 288.7) < 0.05, `NA was ${NA}`);
  assert.ok(Math.abs(NB - 577.4) < 0.05, `NB was ${NB}`);
});

test('a vertical flap gives W*tan(th) and W/cos(th)', () => {
  for (const th of [15, 30, 45, 60, 80]) {
    const { NA, NB } = solve({ W: 500, th, al: 0 });
    assert.ok(Math.abs(NA - 500 * Math.tan(th * DEG)) < 1e-9, `NA at ${th}`);
    assert.ok(Math.abs(NB - 500 / Math.cos(th * DEG)) < 1e-9, `NB at ${th}`);
  }
});

test('randomised configurations are in equilibrium', () => {
  for (let i = 0; i < 10000; i++) {
    const W = 100 + Math.random() * 800;
    const th = 5 + Math.random() * 80;
    const w = flapWindow(th);
    const al = w.min + Math.random() * (w.max - w.min);
    const { fx, fy, NA, NB } = residuals({ W, th, al });
    assert.ok(Math.abs(fx) < 1e-9 * Math.max(1, NA), `fx=${fx} at ${th},${al}`);
    assert.ok(Math.abs(fy) < 1e-9 * Math.max(1, W), `fy=${fy} at ${th},${al}`);
    assert.ok(NA >= 0 && NB >= 0, `negative force at ${th},${al}`);
  }
});

test('the flap window slides with the ramp angle', () => {
  assert.deepEqual(flapWindow(5), { min: -75, max: 85 });
  assert.deepEqual(flapWindow(85), { min: 5, max: 85 });
  // Steepening the ramp can strand a flap angle that was legal a moment ago.
  assert.equal(clampFlap(-40, 5), -40);
  assert.equal(clampFlap(-40, 85), 5);
  // Upper bound is enforced.
  assert.equal(clampFlap(120, 30), 85);
  // flapWindow coerces its ramp argument; clampFlap respects both bounds.
  assert.deepEqual(flapWindow('abc'), { min: -75, max: 85 });
  assert.equal(clampFlap(-300, NaN), -75);
});

test('clamping lands exactly on the boundary and survives junk', () => {
  assert.equal(clampRamp(-10), 5);
  assert.equal(clampRamp(120), 85);
  assert.equal(clampRamp(30), 30);
  assert.equal(clampWeight(0), 100);
  assert.equal(clampWeight(5000), 900);
  assert.equal(clampRamp(NaN), 5);
  assert.equal(clampWeight(''), 100);
  assert.equal(clampRamp('abc'), 5);
});
