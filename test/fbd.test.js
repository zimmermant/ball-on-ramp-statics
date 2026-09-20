import test from 'node:test';
import assert from 'node:assert/strict';
import { FBD_ORIGIN, S, px, exitParam } from '../src/fbd.js';
import { solve, tipPosition, constraintLine, projectOntoLine,
         angleFromTip, flapWindow } from '../src/physics.js';

const toMaths = p => ({ x: (p.x - FBD_ORIGIN.x) / S, y: (FBD_ORIGIN.y - p.y) / S });
const onLine = ({ x, y }, { slope, intercept }) => y - (slope * x + intercept);

test('px and toMaths are exact inverses', () => {
  for (const p of [{ x: 0, y: 0 }, { x: 250, y: -400 }, { x: -1200, y: 900 }]) {
    const back = toMaths(px(p.x, p.y));
    assert.ok(Math.hypot(back.x - p.x, back.y - p.y) < 1e-9);
  }
});

test('grabbing an ON-SCALE arrowhead dead-centre moves nothing', () => {
  for (const [th, al] of [[30, 0], [45, 20], [20, -30]]) {
    const s = { W: 500, th, al, ...solve({ W: 500, th, al }) };
    for (const [which, ang] of [['flap', al], ['ramp', th]]) {
      const N = which === 'flap' ? s.NA : s.NB;
      const tip = tipPosition({ N, ang, which });
      const line = constraintLine({ W: s.W, th, al, which });
      const back = angleFromTip({ ...projectOntoLine(tip, line), which });
      assert.ok(Math.abs(back - ang) < 1e-9, `${which} moved ${back - ang} deg`);
    }
  }
});

test('an off-scale cut point is NOT on the constraint line', () => {
  // This is exactly why the drag records a grab offset: the handle is parked at
  // the clipped boundary, which lies on the origin-to-tip ray and not on the
  // line. Projecting the raw pointer from there would snap the angle.
  const th = 85, al = 5, W = 900;
  const s = solve({ W, th, al });
  const tip = tipPosition({ N: s.NA, ang: al, which: 'flap' });
  const end = px(tip.x, tip.y);
  const t = exitParam(FBD_ORIGIN, end);
  assert.ok(t < 1, 'precondition: this state must be off-scale');
  const cut = { x: FBD_ORIGIN.x + (end.x - FBD_ORIGIN.x) * t,
                y: FBD_ORIGIN.y + (end.y - FBD_ORIGIN.y) * t };
  const line = constraintLine({ W, th, al, which: 'flap' });
  assert.ok(Math.abs(onLine(toMaths(cut), line)) > 1,
    'the cut point would have to be off the line for the grab offset to matter');
});
