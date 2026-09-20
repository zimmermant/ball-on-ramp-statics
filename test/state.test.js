import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/state.js';
import { flapWindow } from '../src/physics.js';

test('starts at the documented default', () => {
  const s = createState().getState();
  assert.equal(s.W, 500);
  assert.equal(s.th, 30);
  assert.equal(s.al, 0);
  assert.ok(Math.abs(s.NA - 288.7) < 0.05);
  assert.ok(Math.abs(s.NB - 577.4) < 0.05);
});

test('setters clamp to their domains', () => {
  const st = createState();
  st.setRampAngle(-5);   assert.equal(st.getState().th, 5);
  st.setRampAngle(999);  assert.equal(st.getState().th, 85);
  st.setWeight(0);       assert.equal(st.getState().W, 100);
});

test('steepening the ramp drags the flap into its new window', () => {
  const st = createState();
  st.setRampAngle(10);
  st.setFlapAngle(-60);
  assert.equal(st.getState().al, -60, 'legal at a shallow ramp');
  st.setRampAngle(85);
  assert.equal(st.getState().th, 85, 'the ramp moves where it is dragged');
  assert.equal(st.getState().al, 5, 'and the flap follows to the window edge');
});

test('a ramp change that does not invalidate the flap leaves it alone', () => {
  const st = createState();
  st.setFlapAngle(20);
  st.setRampAngle(45);
  assert.equal(st.getState().al, 20);
});

test('the flap can never escape its window, under any sequence', () => {
  const st = createState();
  const seq = [[ 'r', 85], ['f', -90], ['r', 5], ['f', 200], ['r', 60],
               ['f', -200], ['r', 20], ['f', 84.9], ['r', 85], ['f', 0]];
  for (const [kind, v] of seq) {
    if (kind === 'r') st.setRampAngle(v); else st.setFlapAngle(v);
    const { th, al } = st.getState();
    const w = flapWindow(th);
    assert.ok(al >= w.min - 1e-9 && al <= w.max + 1e-9,
      `al=${al} outside [${w.min}, ${w.max}] at th=${th}`);
  }
});

test('subscribers fire once for a coupled change', () => {
  const st = createState();
  st.setRampAngle(10);
  st.setFlapAngle(-60);
  let calls = 0, seen = null;
  st.subscribe(s => { calls++; seen = s; });
  st.setRampAngle(85);          // moves BOTH th and al
  assert.equal(calls, 1, 'one notification, not two');
  assert.equal(seen.th, 85);
  assert.equal(seen.al, 5);
});

test('unsubscribe stops notifications, and an unchanged set is silent', () => {
  const st = createState();
  let calls = 0;
  const off = st.subscribe(() => calls++);
  st.setWeight(600);
  off();
  st.setWeight(700);
  assert.equal(calls, 1);
  let more = 0;
  st.subscribe(() => more++);
  st.setRampAngle(st.getState().th);
  assert.equal(more, 0, 'setting an unchanged value must not notify');
});
