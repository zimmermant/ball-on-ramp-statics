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

import {
  tipPosition, constraintLine, minFlapForce,
  projectOntoLine, angleFromTip, forceMagnitude
} from '../src/physics.js';

function onLine({ x, y }, { slope, intercept }) {
  return y - (slope * x + intercept);
}

test('both arrowheads lie on their constraint lines', () => {
  for (let i = 0; i < 5000; i++) {
    const W = 100 + Math.random() * 800;
    const th = 5 + Math.random() * 80;
    const w = flapWindow(th);
    const al = w.min + Math.random() * (w.max - w.min);
    const { NA, NB } = solve({ W, th, al });

    const pa = tipPosition({ N: NA, ang: al, which: 'flap' });
    const la = constraintLine({ W, th, al, which: 'flap' });
    assert.ok(Math.abs(onLine(pa, la)) < 1e-9 * W, `flap off line by ${onLine(pa, la)}`);

    const pb = tipPosition({ N: NB, ang: th, which: 'ramp' });
    const lb = constraintLine({ W, th, al, which: 'ramp' });
    assert.ok(Math.abs(onLine(pb, lb)) < 1e-9 * W, `ramp off line by ${onLine(pb, lb)}`);

    assert.ok(pb.x <= 0, 'the ramp force tip must have negative x');
  }
});

test('both constraint lines pass through Q = (0, W)', () => {
  const W = 640;
  for (const which of ['flap', 'ramp']) {
    const line = constraintLine({ W, th: 37, al: 12, which });
    assert.ok(Math.abs(onLine({ x: 0, y: W }, line)) < 1e-12);
  }
});

test('the flap force is minimised with the flap perpendicular to the ramp', () => {
  const W = 500, th = 40;
  let best = Infinity, bestAl = null;
  const w = flapWindow(th);
  for (let al = w.min; al <= w.max; al += 0.01) {
    const { NA } = solve({ W, th, al });
    if (NA < best) { best = NA; bestAl = al; }
  }
  const m = minFlapForce({ W, th });
  assert.ok(Math.abs(m.N - best) < 1e-3, `closed form ${m.N} vs sweep ${best}`);
  assert.ok(Math.abs(m.al - bestAl) < 0.02, `angle ${m.al} vs sweep ${bestAl}`);
  assert.ok(Math.abs(m.N - W * Math.sin(th * DEG)) < 1e-9, 'minimum must be W*sin(th)');
  // and there the ramp carries exactly W*cos(th) -- the textbook decomposition
  const { NB } = solve({ W, th, al: th });
  assert.ok(Math.abs(NB - W * Math.cos(th * DEG)) < 1e-9, 'NB must be W*cos(th) there');
});

test('the ramp force has NO interior minimum, it decreases monotonically', () => {
  // Spec 2.7: d/d(al)[cos(al)/cos(th-al)] = -sin(th)/cos^2(th-al) < 0.
  // This guards the on-screen text, which must not claim both forces are
  // minimised at the perpendicular flap the way the sibling rope app does.
  for (const th of [10, 30, 60, 85]) {
    const w = flapWindow(th);
    let prev = Infinity;
    for (let al = w.min; al <= w.max; al += 0.25) {
      const { NB } = solve({ W: 500, th, al });
      assert.ok(NB < prev + 1e-12, `NB rose at th=${th}, al=${al}`);
      prev = NB;
    }
  }
});

test('projection returns a point that is ON the line', () => {
  // Three assertions, because the first two alone pass against a no-op that
  // returns its input: a point already on the line has zero residual either
  // way, and a zero residual is trivially perpendicular.
  const line = constraintLine({ W: 500, th: 40, al: 10, which: 'flap' });
  const { NA } = solve({ W: 500, th: 40, al: 10 });
  const p = tipPosition({ N: NA, ang: 10, which: 'flap' });
  const back = projectOntoLine(p, line);
  assert.ok(Math.hypot(back.x - p.x, back.y - p.y) < 1e-9, 'a point on the line is unchanged');

  for (const q of [{ x: 0, y: 0 }, { x: 700, y: 900 }, { x: -200, y: 120 }]) {
    const r = projectOntoLine(q, line);
    const dot = (q.x - r.x) * 1 + (q.y - r.y) * line.slope;
    assert.ok(Math.abs(dot) < 1e-9, `residual not perpendicular, dot=${dot}`);
    assert.ok(Math.abs(onLine(r, line)) < 1e-9 * (1 + Math.hypot(r.x, r.y)),
      `projection off the line by ${onLine(r, line)}`);
  }
});

test('a tip round-trips back to its angle and magnitude', () => {
  const { NA, NB } = solve({ W: 500, th: 30, al: 0 });
  for (const [N, ang, which] of [[NA, 0, 'flap'], [NB, 30, 'ramp']]) {
    const p = tipPosition({ N, ang, which });
    assert.ok(Math.abs(angleFromTip({ ...p, which }) - ang) < 1e-9, `angle ${which}`);
    assert.ok(Math.abs(forceMagnitude(p) - N) < 1e-9, `magnitude ${which}`);
  }
});
