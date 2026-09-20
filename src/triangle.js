import { el, clear, text, COLORS } from './svg.js';
import { tipPosition } from './physics.js';

export const VB = { w: 480, h: 380 };
export const PAD = 0.12;

export function createTriangle(svg) {
  const C1 = COLORS.t1, C2 = COLORS.t2, CW = COLORS.w;
  const defsNode = el('defs', {}, svg);
  for (const [id, color] of [['t1', C1], ['t2', C2], ['w', CW]]) {
    const m = el('marker', { id: `tri-arrow-${id}`, viewBox: '0 0 10 10',
      refX: 8, refY: 5, markerWidth: 6, markerHeight: 6,
      orient: 'auto-start-reverse' }, defsNode);
    el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: color }, m);
  }
  const root = el('g', {}, svg);

  function render(s) {
    clear(root);

    const B = tipPosition({ N: s.NA, ang: s.al, which: 'flap' });
    const pts = [{ x: 0, y: 0 }, B, { x: 0, y: s.W }];

    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 1e-6), spanY = Math.max(maxY - minY, 1e-6);

    const k = Math.min(VB.w * (1 - 2 * PAD) / spanX, VB.h * (1 - 2 * PAD) / spanY);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const px = (x, y) => ({ x: VB.w / 2 + (x - cx) * k, y: VB.h / 2 - (y - cy) * k });

    const [a, b, c] = pts.map(p => px(p.x, p.y));
    const sides = [
      { from: a, to: b, color: C1, mk: 't1', label: `N_A ${Math.round(s.NA)}` },
      { from: b, to: c, color: C2, mk: 't2', label: `N_B ${Math.round(s.NB)}` },
      { from: c, to: a, color: CW, mk: 'w',  label: `W ${Math.round(s.W)}` }
    ];

    // A label positioned by a fixed outward push can still land past the viewBox edge
    // for a long, thin triangle -- most visibly the W label, which always sits at the
    // bounding box's minimum-x extreme (A and C both have physics x = 0, and B.x > 0
    // across the whole angle domain). SVG clips at the viewBox, so an escaping label
    // isn't just off-canvas, its digits get visibly cut off. Measure after placing and
    // nudge back inside rather than guess a bigger fixed margin.
    function nudgeInside(node) {
      const M = 4;                                  // margin inside the viewBox
      const bb = node.getBBox();
      let dx = 0, dy = 0;
      if (bb.x < M) dx = M - bb.x;
      else if (bb.x + bb.width > VB.w - M) dx = (VB.w - M) - (bb.x + bb.width);
      if (bb.y < M) dy = M - bb.y;
      else if (bb.y + bb.height > VB.h - M) dy = (VB.h - M) - (bb.y + bb.height);
      if (dx || dy) {
        node.setAttribute('x', Number(node.getAttribute('x')) + dx);
        node.setAttribute('y', Number(node.getAttribute('y')) + dy);
      }
    }

    for (const sd of sides) {
      el('line', { x1: sd.from.x, y1: sd.from.y, x2: sd.to.x, y2: sd.to.y,
                   stroke: sd.color, 'stroke-width': 3,
                   'marker-end': `url(#tri-arrow-${sd.mk})` }, root);
      const mx = (sd.from.x + sd.to.x) / 2, my = (sd.from.y + sd.to.y) / 2;
      // push the label away from the triangle's centre so it never sits on a side
      const ox = mx - VB.w / 2, oy = my - VB.h / 2;
      const on = Math.hypot(ox, oy) || 1;
      const node = text(root, mx + ox / on * 20, my + oy / on * 20 + 4, sd.label,
           { fill: sd.color, weight: 600, anchor: ox < 0 ? 'end' : 'start' });
      nudgeInside(node);
    }

    const caption = text(root, 10, VB.h - 10,
         `auto-scaled to fit — 100 N ≈ ${Math.round(100 * k)} px`,
         { fill: '#9aa1ab', size: 11, halo: false });
    nudgeInside(caption);
  }

  return { render };
}
