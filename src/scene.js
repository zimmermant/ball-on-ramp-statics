import { el, clear, text, COLORS } from './svg.js';
import { DEG, RAMP_MIN, RAMP_MAX } from './physics.js';

// All geometry below is SVG space: y points DOWN. Every maths-space y is
// negated on the way in, once, at the point of use.
export const PIVOT = { x: 190, y: 520 };   // the ramp hinges here
export const RAMP_LEN = 430;
export const BALL_R = 70;                  // FIXED: it sets both contact points
export const CONTACT_D = 250;              // ball contact, measured along the ramp
export const FLAP_UP = 150;
export const FLAP_DOWN = 30;
export const FLAP_HANDLE_R = Math.hypot(BALL_R, FLAP_UP);
export const FLAP_HANDLE_OFF = 180 - Math.atan2(FLAP_UP, BALL_R) / DEG;

export function rampDir(th) {
  return { x: Math.cos(th * DEG), y: -Math.sin(th * DEG) };
}
export function rampEnd(th) {
  const d = rampDir(th);
  return { x: PIVOT.x + RAMP_LEN * d.x, y: PIVOT.y + RAMP_LEN * d.y };
}
export function ballContact(th) {
  const d = rampDir(th);
  return { x: PIVOT.x + CONTACT_D * d.x, y: PIVOT.y + CONTACT_D * d.y };
}
export function ballCentre(th) {
  const c = ballContact(th);
  return { x: c.x - BALL_R * Math.sin(th * DEG), y: c.y - BALL_R * Math.cos(th * DEG) };
}
export function flapContact(th, al) {
  const o = ballCentre(th);
  return { x: o.x - BALL_R * Math.cos(al * DEG), y: o.y + BALL_R * Math.sin(al * DEG) };
}
export function flapDir(al) {                 // along the flap, pointing up
  return { x: -Math.sin(al * DEG), y: -Math.cos(al * DEG) };
}
// Rides a circle of radius FLAP_HANDLE_R about the ball's centre, at angle
// al + FLAP_HANDLE_OFF -- which is what lets Task 6 read al off the pointer.
export function flapHandle(th, al) {
  const o = ballCentre(th);
  const psi = (al + FLAP_HANDLE_OFF) * DEG;
  return { x: o.x + FLAP_HANDLE_R * Math.cos(psi), y: o.y - FLAP_HANDLE_R * Math.sin(psi) };
}

export function createScene(svg, handlers = {}) {
  const C_A = COLORS.t1, C_B = COLORS.t2, INK = COLORS.ink;
  const drawRoot = el('g', {}, svg);
  const handleRoot = el('g', {}, svg);

  const handles = {};
  for (const [key, color] of [['ramp', INK], ['flap', C_A]]) {
    const g = el('g', {
      class: 'handle', tabindex: '0', role: 'slider', 'data-scene': key
    }, handleRoot);
    el('circle', { class: 'hit', r: 22, fill: 'transparent' }, g);
    el('circle', { r: 8, fill: '#fff', stroke: color, 'stroke-width': 3 }, g);
    handles[key] = g;
  }

  function render(s) {
    clear(drawRoot);
    const end = rampEnd(s.th);
    const cb  = ballContact(s.th);
    const o   = ballCentre(s.th);
    const ca  = flapContact(s.th, s.al);
    const fd  = flapDir(s.al);

    // horizontal reference the ramp angle is measured from
    el('line', { x1: PIVOT.x - 20, y1: PIVOT.y, x2: PIVOT.x + 340, y2: PIVOT.y,
                 stroke: '#c9ccd2', 'stroke-width': 1, 'stroke-dasharray': '5 4' }, drawRoot);

    // the ramp, a wedge like the reference figure
    el('polygon', {
      points: `${PIVOT.x},${PIVOT.y} ${end.x},${end.y} ${end.x},${PIVOT.y}`,
      fill: '#ddd8c4', stroke: '#b9b298', 'stroke-width': 1.5
    }, drawRoot);

    // ramp angle arc, drawn on top of the wedge so it stays legible
    const ar = 96;
    el('path', {
      d: `M ${PIVOT.x + ar} ${PIVOT.y} A ${ar} ${ar} 0 0 0 ` +
         `${PIVOT.x + ar * Math.cos(s.th * DEG)} ${PIVOT.y - ar * Math.sin(s.th * DEG)}`,
      fill: 'none', stroke: INK, 'stroke-width': 1.5, opacity: .8
    }, drawRoot);
    text(drawRoot,
      PIVOT.x + (ar + 18) * Math.cos(s.th / 2 * DEG),
      PIVOT.y - (ar + 18) * Math.sin(s.th / 2 * DEG) + 4,
      `θ = ${s.th.toFixed(1)}°`, { fill: INK, weight: 600 });

    // the flap: a plank tangent to the ball, mount at its top end
    const top = { x: ca.x + FLAP_UP * fd.x,   y: ca.y + FLAP_UP * fd.y };
    const bot = { x: ca.x - FLAP_DOWN * fd.x, y: ca.y - FLAP_DOWN * fd.y };
    el('line', { x1: bot.x, y1: bot.y, x2: top.x, y2: top.y, stroke: C_A,
                 'stroke-width': 10, 'stroke-linecap': 'round', opacity: .35 }, drawRoot);
    el('line', { x1: bot.x, y1: bot.y, x2: top.x, y2: top.y, stroke: C_A,
                 'stroke-width': 3 }, drawRoot);
    el('rect', { x: top.x - 17, y: top.y - 5, width: 34, height: 10, rx: 2,
                 fill: '#d7dae0', stroke: INK, 'stroke-width': 1.2,
                 transform: `rotate(${-s.al} ${top.x} ${top.y})` }, drawRoot);

    // the ball
    el('circle', { cx: o.x, cy: o.y, r: BALL_R, fill: '#9cc3e8',
                   stroke: INK, 'stroke-width': 2 }, drawRoot);
    text(drawRoot, o.x, o.y + 5, `${Math.round(s.W)} N`,
         { anchor: 'middle', fill: INK, weight: 600 });

    // contact markers, lettered to match the reference figure
    el('circle', { cx: ca.x, cy: ca.y, r: 4.5, fill: C_A }, drawRoot);
    text(drawRoot, ca.x - 13, ca.y - 12, 'A',
         { fill: C_A, weight: 700, anchor: 'end', size: 16 });
    el('circle', { cx: cb.x, cy: cb.y, r: 4.5, fill: C_B }, drawRoot);
    text(drawRoot, cb.x + 13, cb.y + 22, 'B', { fill: C_B, weight: 700, size: 16 });

    text(drawRoot, ca.x - 15, ca.y + 16, `N_A = ${Math.round(s.NA)} N`,
         { fill: C_A, weight: 600, anchor: 'end' });
    text(drawRoot, cb.x + 13, cb.y + 44, `N_B = ${Math.round(s.NB)} N`,
         { fill: C_B, weight: 600 });

    // handle positions and ARIA, updated in place so focus survives a render
    const pos  = { ramp: end, flap: flapHandle(s.th, s.al) };
    const meta = {
      ramp: [s.th, RAMP_MIN, RAMP_MAX, 'Ramp angle above horizontal',
             `${s.th.toFixed(1)} degrees`],
      flap: [s.al, Math.round(s.th - 80), 85, 'Flap angle',
             `${s.al.toFixed(1)} degrees, flap force ${Math.round(s.NA)} newtons`]
    };
    for (const key of ['ramp', 'flap']) {
      const g = handles[key], p = pos[key], m = meta[key];
      for (const c of g.querySelectorAll('circle')) {
        c.setAttribute('cx', p.x);
        c.setAttribute('cy', p.y);
      }
      g.setAttribute('aria-label', m[3]);
      g.setAttribute('aria-valuemin', m[1]);
      g.setAttribute('aria-valuemax', m[2]);
      g.setAttribute('aria-valuenow', m[0].toFixed(1));
      g.setAttribute('aria-valuetext', m[4]);
    }
  }

  return { render };
}
