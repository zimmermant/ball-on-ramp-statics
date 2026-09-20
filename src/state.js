import { clampRamp, clampFlap, clampWeight, solve } from './physics.js';

// The ONLY stored state is these three numbers. NA and NB are derived on every
// read, which is what makes it structurally impossible for the panels to drift
// out of step -- there is one copy of the truth.
export function createState() {
  let W = 500, th = 30, al = 0;
  let subscribers = [];

  function getState() {
    const { NA, NB } = solve({ W, th, al });
    return { W, th, al, NA, NB };
  }

  function notify() {
    const snapshot = getState();
    for (const fn of subscribers.slice()) fn(snapshot);
  }

  // The ramp always moves where it is dragged. If that strands the flap outside
  // its new window the flap is re-clamped and follows -- one notification for
  // both changes, so no subscriber ever sees the intermediate invalid pair.
  function setRampAngle(deg) {
    const nextTh = clampRamp(deg);
    const nextAl = clampFlap(al, nextTh);
    if (nextTh === th && nextAl === al) return;
    th = nextTh;
    al = nextAl;
    notify();
  }

  function setFlapAngle(deg) {
    const v = clampFlap(deg, th);
    if (v === al) return;
    al = v;
    notify();
  }

  function setWeight(n) {
    const v = clampWeight(n);
    if (v === W) return;
    W = v;
    notify();
  }

  function subscribe(fn) {
    subscribers.push(fn);
    return () => { subscribers = subscribers.filter(f => f !== fn); };
  }

  return { getState, setRampAngle, setFlapAngle, setWeight, subscribe };
}
