import { DEG } from './physics.js';
import { COLORS } from './svg.js';

// Every term is computed from the UNROUNDED state and rounded only here, at the
// moment of display. Rounding the forces first makes the two horizontal terms
// disagree in the last digit, right beside a printed "= 0".
export function terms(s) {
  return {
    na: s.NA.toFixed(1),
    nb: s.NB.toFixed(1),
    al: s.al.toFixed(1),
    th: s.th.toFixed(1),
    w:  s.W.toFixed(1),
    fxLeft:  (s.NA * Math.cos(s.al * DEG)).toFixed(1),
    fxRight: (s.NB * Math.sin(s.th * DEG)).toFixed(1)
  };
}

export function createEquations(node) {
  function render(s) {
    const t = terms(s);
    const o = COLORS.t1, b = COLORS.t2, g = COLORS.w;
    // Values are all numbers formatted by toFixed, so there is nothing to escape.
    node.innerHTML =
      `<div>&Sigma;F<sub>x</sub>: <span style="color:${o}">${t.na}&middot;cos&nbsp;${t.al}&deg;</span>` +
      ` &minus; <span style="color:${b}">${t.nb}&middot;sin&nbsp;${t.th}&deg;</span> = 0</div>` +
      `<div>&Sigma;F<sub>y</sub>: <span style="color:${o}">${t.na}&middot;sin&nbsp;${t.al}&deg;</span>` +
      ` + <span style="color:${b}">${t.nb}&middot;cos&nbsp;${t.th}&deg;</span>` +
      ` &minus; <span style="color:${g}">${t.w}</span> = 0</div>` +
      `<div style="font-size:12px;color:#9aa1ab;font-family:system-ui;line-height:1.5;margin-top:6px">` +
      `Both horizontal terms equal ${t.fxLeft} N. The sums are exactly zero &mdash; that is what fixes the forces.</div>`;
  }
  return { render };
}
