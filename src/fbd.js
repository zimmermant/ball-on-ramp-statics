import { el, clear, text, COLORS, clientToSvg } from './svg.js';
import { tipPosition, constraintLine, projectOntoLine, angleFromTip,
         RAMP_MIN, RAMP_MAX, FLAP_MAX, WEIGHT_MIN, WEIGHT_MAX } from './physics.js';

export const FBD_ORIGIN = { x: 330, y: 260 };
export const S = 0.28;                       // px per newton — never changes
const BOX = { x1: 6, y1: 6, x2: 654, y2: 594 };

// maths coords (y up, origin at the ball's centre) -> viewBox coords (y down)
export function px(x, y) {
  return { x: FBD_ORIGIN.x + S * x, y: FBD_ORIGIN.y - S * y };
}

// How far along origin->tip we can travel before leaving the panel. 1 means it fits.
export function exitParam(from, to) {
  let t = 1;
  const test = (num, den) => { if (den !== 0) { const v = num / den; if (v >= 0) t = Math.min(t, v); } };
  if (to.x > BOX.x2) test(BOX.x2 - from.x, to.x - from.x);
  if (to.x < BOX.x1) test(BOX.x1 - from.x, to.x - from.x);
  if (to.y > BOX.y2) test(BOX.y2 - from.y, to.y - from.y);
  if (to.y < BOX.y1) test(BOX.y1 - from.y, to.y - from.y);
  return t;
}

function defs(svg) {
  const d = el('defs', {}, svg);
  for (const [id, color] of [['t1', COLORS.t1], ['t2', COLORS.t2], ['w', COLORS.w]]) {
    const m = el('marker', {
      id: `fbd-arrow-${id}`, viewBox: '0 0 10 10', refX: 8, refY: 5,
      markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse'
    }, d);
    el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: color }, m);
  }
}

export function createFbd(svg, { setAngle, setWeight } = {}) {
  const C1 = COLORS.t1, C2 = COLORS.t2, CW = COLORS.w, CK = COLORS.ink;
  let active = null;          // which force's handle is hovered or being dragged
  defs(svg);
  const drawRoot = el('g', {}, svg);
  const handleRoot = el('g', {}, svg);

  const handles = {};
  for (const [key, color] of [['flap', C1], ['ramp', C2], ['w', CW]]) {
    const g = el('g', {
      class: 'handle', tabindex: '0', role: 'slider', 'data-fbd': key
    }, handleRoot);
    el('circle', { class: 'hit', r: 22, fill: 'transparent' }, g);
    el('circle', { r: 7, fill: '#fff', stroke: color, 'stroke-width': 3 }, g);
    handles[key] = g;
  }

  // Each arrowhead rides a straight line through Q = (0, W). Defined once and
  // called from both render and pointermove so the two can never drift.
  const lineFor = (s, which) =>
    constraintLine({ W: s.W, th: s.th, al: s.al, which });

  function render(s) {
    clear(drawRoot);

    // faint axes through the origin
    el('line', { x1: BOX.x1, y1: FBD_ORIGIN.y, x2: BOX.x2, y2: FBD_ORIGIN.y,
                 stroke: '#e6e8ec', 'stroke-width': 1 }, drawRoot);
    el('line', { x1: FBD_ORIGIN.x, y1: BOX.y1, x2: FBD_ORIGIN.x, y2: BOX.y2,
                 stroke: '#e6e8ec', 'stroke-width': 1 }, drawRoot);

    // Both constraint lines. Each force's arrowhead is confined to its own line,
    // and both lines meet at Q = (0, W).
    for (const which of ['flap', 'ramp']) {
      const line = lineFor(s, which);
      const xs = [-2200, 2200];
      const a = px(xs[0], line.slope * xs[0] + line.intercept);
      const b = px(xs[1], line.slope * xs[1] + line.intercept);
      // Faint at rest, brighter while this force's handle is hovered or dragged,
      // so the handle visibly announces which line it rides.
      const hot = active === which;
      el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y,
                   stroke: which === 'flap' ? C1 : C2,
                   'stroke-width': hot ? 2 : 1,
                   'stroke-dasharray': '4 4', opacity: hot ? 0.95 : 0.3,
                   'clip-path': 'url(#fbd-clip)' }, drawRoot);
    }

    // Q: one W-length above the origin, the force triangle's third vertex
    const q = px(0, s.W);
    el('circle', { cx: q.x, cy: q.y, r: 4, fill: 'none',
                   stroke: '#9aa1ab', 'stroke-width': 1.5 }, drawRoot);
    text(drawRoot, q.x + 10, q.y + 4, 'Q', { fill: '#6b7280', size: 12 });

    const arrows = [
      { key: 'flap', tip: tipPosition({ N: s.NA, ang: s.al, which: 'flap' }),
        color: C1, mk: 't1', label: `N_A = ${Math.round(s.NA)} N` },
      { key: 'ramp', tip: tipPosition({ N: s.NB, ang: s.th, which: 'ramp' }),
        color: C2, mk: 't2', label: `N_B = ${Math.round(s.NB)} N` },
      { key: 'w',    tip: { x: 0, y: -s.W },
        color: CW, mk: 'w',  label: `W = ${Math.round(s.W)} N` }
    ];

    // This must be a hoisted function declaration, and it must sit BEFORE the
    // arrows loop below (which calls it). A `const place = (...) =>` placed
    // after the loop would still be in the temporal dead zone when the loop
    // tries to call it, and the first render would throw ReferenceError before
    // anything is ever drawn.
    function place(key, tipMaths, cutPoint, offScale, valueNow, min, max, label, valueText) {
      const g = handles[key];
      const p = offScale ? cutPoint : px(tipMaths.x, tipMaths.y);
      for (const c of g.querySelectorAll('circle')) {
        c.setAttribute('cx', p.x); c.setAttribute('cy', p.y);
      }
      g.setAttribute('aria-label', label);
      g.setAttribute('aria-valuemin', min);
      g.setAttribute('aria-valuemax', max);
      g.setAttribute('aria-valuenow', valueNow.toFixed(1));
      // aria-valuenow carries the ANGLE (or weight) even though the label says
      // "force arrowhead" -- without this a screen reader announces e.g. "Flap
      // force arrowhead, 35.0", which reads as 35 newtons on a 289 N force.
      // Mirrors the pattern already used in scene.js.
      g.setAttribute('aria-valuetext', valueText);
    }

    for (const a of arrows) {
      const end = px(a.tip.x, a.tip.y);
      const t = exitParam(FBD_ORIGIN, end);
      const cut = { x: FBD_ORIGIN.x + (end.x - FBD_ORIGIN.x) * t,
                    y: FBD_ORIGIN.y + (end.y - FBD_ORIGIN.y) * t };
      const offScale = t < 1;

      el('line', {
        x1: FBD_ORIGIN.x, y1: FBD_ORIGIN.y, x2: cut.x, y2: cut.y,
        stroke: a.color, 'stroke-width': 3,
        'marker-end': offScale ? null : `url(#fbd-arrow-${a.mk})`
      }, drawRoot);

      // Off-scale: chevron at the boundary, value still readable just inside.
      const ux = (cut.x - FBD_ORIGIN.x), uy = (cut.y - FBD_ORIGIN.y);
      const len = Math.hypot(ux, uy) || 1;
      const ang = Math.atan2(uy, ux) * 180 / Math.PI;
      if (offScale) {
        el('path', { d: 'M -7 -8 L 3 0 L -7 8', fill: 'none', stroke: a.color,
                     'stroke-width': 3, 'stroke-linecap': 'round',
                     transform: `translate(${cut.x} ${cut.y}) rotate(${ang})` }, drawRoot);
      }

      const meta = {
        flap: [s.al, s.th - 80, FLAP_MAX, 'Flap force arrowhead',
               `${s.al.toFixed(1)} degrees, force ${Math.round(s.NA)} newtons`],
        ramp: [s.th, RAMP_MIN, RAMP_MAX, 'Ramp force arrowhead',
               `${s.th.toFixed(1)} degrees, force ${Math.round(s.NB)} newtons`],
        w:    [s.W, WEIGHT_MIN, WEIGHT_MAX, 'Ball weight arrowhead',
               `${Math.round(s.W)} newtons`]
      }[a.key];
      place(a.key, a.tip, cut, offScale, meta[0], meta[1], meta[2], meta[3], meta[4]);

      // The number must stay readable even when the arrowhead is off scale.
      // Off-scale labels are clamped inside the box and anchored by which edge
      // they exit, so the text always reads back toward the panel's middle.
      // On-scale labels are unchanged.
      const lxRaw = FBD_ORIGIN.x + ux / len * (len - (offScale ? 64 : 10)) + (ux > 0 ? 8 : -8);
      const ly = FBD_ORIGIN.y + uy / len * (len - (offScale ? 64 : 10)) - 8;
      const lx = offScale ? Math.min(Math.max(lxRaw, BOX.x1 + 10), BOX.x2 - 10) : lxRaw;
      const anchor = offScale ? (ux < 0 ? 'start' : 'end') : (ux < 0 ? 'end' : 'start');
      text(drawRoot, lx, ly, a.label + (offScale ? '  → off scale' : ''),
           { fill: a.color, weight: 600, anchor });
    }

    el('circle', { cx: FBD_ORIGIN.x, cy: FBD_ORIGIN.y, r: 7, fill: CK }, drawRoot);
  }

  let dragging = null;
  let dragPointerId = null;   // only the pointer that started the drag may move
                               // or end it (matches the pattern in scene.js).
  let latest = null;                  // most recent state, for the constraint lines
  let grabOffset = null;              // true tip minus pointer, in maths coords, at grab time
                                       // (an off-scale handle sits at the clipped
                                       // boundary point, not at the true tip, so a bare
                                       // pointer position must be re-anchored before it is
                                       // projected onto the constraint line)

  const origRender = render;
  function renderTracking(s) { latest = s; origRender(s); }

  // Visual feedback: highlight the constraint line belonging to the handle the
  // pointer is on, and keep it highlighted for the whole drag.
  function setActive(key) {
    if (active === key) return;
    active = key;
    if (latest) origRender(latest);
  }
  svg.addEventListener('pointerover', e => {
    const g = e.target.closest('[data-fbd]');
    if (g) setActive(g.getAttribute('data-fbd'));
  });
  svg.addEventListener('pointerout', e => {
    if (dragging) return;
    const g = e.target.closest('[data-fbd]');
    if (g) setActive(null);
  });
  handleRoot.addEventListener('focusin', e => {
    const g = e.target.closest('[data-fbd]');
    if (g) setActive(g.getAttribute('data-fbd'));
  });
  handleRoot.addEventListener('focusout', () => { if (!dragging) setActive(null); });

  // viewBox point -> maths coords (origin at the ball's centre, y up)
  function toMaths(p) {
    return { x: (p.x - FBD_ORIGIN.x) / S, y: (FBD_ORIGIN.y - p.y) / S };
  }

  svg.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;   // ignore right/middle click
    const g = e.target.closest('[data-fbd]');
    if (!g) return;
    dragging = g.getAttribute('data-fbd');
    dragPointerId = e.pointerId;
    setActive(dragging);
    g.focus();

    // Record the offset between the true tip (maths coords) and the pointer
    // (maths coords) at grab time. An off-scale handle is drawn at the clipped
    // boundary point, not the true tip -- see place() above -- so a bare
    // pointer position must be re-anchored by this offset before every projection below.
    if (latest) {
      const tip = dragging === 'w'
        ? { x: 0, y: -latest.W }
        : dragging === 'flap'
          ? tipPosition({ N: latest.NA, ang: latest.al, which: 'flap' })
          : tipPosition({ N: latest.NB, ang: latest.th, which: 'ramp' });
      const pm = toMaths(clientToSvg(svg, e.clientX, e.clientY));
      grabOffset = { x: tip.x - pm.x, y: tip.y - pm.y };
    } else {
      grabOffset = { x: 0, y: 0 };
    }

    try { svg.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  });

  svg.addEventListener('pointermove', e => {
    if (!dragging || e.pointerId !== dragPointerId || !latest) return;
    const m = toMaths(clientToSvg(svg, e.clientX, e.clientY));
    const g = { x: m.x + grabOffset.x, y: m.y + grabOffset.y };

    if (dragging === 'w') {
      setWeight(-g.y);               // the weight arrow points down, so its tip has y < 0
      return;
    }
    const line = lineFor(latest, dragging);
    const proj = projectOntoLine(g, line);
    setAngle(dragging, angleFromTip({ x: proj.x, y: proj.y, which: dragging }));
  });

  function endDrag(e) {
    if (!dragging || e.pointerId !== dragPointerId) return;
    if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
    dragging = null;
    dragPointerId = null;
    grabOffset = null;
    // Fall back to whatever still has focus rather than unconditionally dimming
    // the constraint line -- after a mouse drag the handle is still focused and
    // still arrow-key adjustable, so its line should stay lit.
    const stillFocused = document.activeElement && document.activeElement.closest &&
      document.activeElement.closest('[data-fbd]');
    setActive(stillFocused ? stillFocused.getAttribute('data-fbd') : null);
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  handleRoot.addEventListener('keydown', e => {
    const g = e.target.closest('[data-fbd]');
    if (!g) return;
    const key = g.getAttribute('data-fbd');
    const step = (e.shiftKey ? 0.1 : 1) * (key === 'w' ? 10 : 1);
    let delta = 0;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') delta = step;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') delta = -step;
    else return;
    e.preventDefault();
    const now = Number(g.getAttribute('aria-valuenow'));
    if (key === 'w') setWeight(now + delta);
    else setAngle(key, now + delta);
  });

  return { render: renderTracking };
}
