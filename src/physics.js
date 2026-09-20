// Statics of a ball resting on a ramp, held by a tangent flap.
//
// The flap is tangent to the ball, so its normal force acts along a radius and
// passes through the centre. The ramp's normal does too, and the weight acts at
// the centre -- so all three forces are CONCURRENT at the centre and this is a
// point-particle equilibrium.
//
// No DOM. Degrees in, degrees out; radians live only inside this file.

export const DEG = Math.PI / 180;

export const RAMP_MIN = 5;
export const RAMP_MAX = 85;
export const FLAP_MAX = 85;
export const FLAP_SPAN = 80;          // offset of the window's lower edge below the ramp
                                       // angle th (min = th - FLAP_SPAN). NOT the window's
                                       // width -- that is FLAP_MAX - (th - FLAP_SPAN), i.e.
                                       // 165 - th, and it shrinks as the ramp steepens.
export const WEIGHT_MIN = 100;
export const WEIGHT_MAX = 900;

// Coerces its own parameter because it does arithmetic -- a non-numeric or
// non-finite input would silently produce NaN, and clampTo cannot clamp against NaN.
export function clampTo(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return n < lo ? lo : n > hi ? hi : n;
}

export function clampRamp(deg) { return clampTo(deg, RAMP_MIN, RAMP_MAX); }
export function clampWeight(n) { return clampTo(n, WEIGHT_MIN, WEIGHT_MAX); }

// The flap's usable window SLIDES with the ramp angle. Equilibrium needs
// cos(th - al) > 0 (the flap must lean into the slope enough to grip) and
// cos(al) > 0 (the ball must still press on the ramp), i.e. al in (th-90, 90).
// We keep a margin inside both ends. Coerce the ramp angle before arithmetic.
export function flapWindow(th) {
  const t = clampRamp(th);
  return { min: t - FLAP_SPAN, max: FLAP_MAX };
}

export function clampFlap(al, th) {
  const w = flapWindow(th);
  return clampTo(al, w.min, w.max);
}

export function solve({ W, th, al }) {
  const d = Math.cos((th - al) * DEG);
  return {
    NA: W * Math.sin(th * DEG) / d,     // flap
    NB: W * Math.cos(al * DEG) / d      // ramp
  };
}

// Arrow tips in ball-centred coordinates, y UP.
//   'flap' pushes up-slope at al above horizontal    -> ( N cos, N sin)
//   'ramp' normal leans LEFT for a ramp rising right -> (-N sin, N cos)
export function tipPosition({ N, ang, which }) {
  const r = ang * DEG;
  return which === 'ramp'
    ? { x: -N * Math.sin(r), y: N * Math.cos(r) }
    : { x:  N * Math.cos(r), y: N * Math.sin(r) };
}

export function angleFromTip({ x, y, which }) {
  return which === 'ramp'
    ? Math.atan2(-x, y) / DEG
    : Math.atan2(y, x) / DEG;
}

export function forceMagnitude({ x, y }) {
  return Math.hypot(x, y);
}

// Holding W and the OTHER angle, each arrowhead is confined to a straight line
// through Q = (0, W):
//   flap:  y + x*cot(th) = W
//   ramp:  y - x*tan(al) = W
// A {slope, intercept} pair cannot represent a vertical line, so this blows up
// as al -> 90 (ramp) or th -> 0 (flap). It is safe only because the clamped
// domain (RAMP_MIN..RAMP_MAX = 5..85, FLAP_MAX = 85) caps both slopes at
// tan(85 deg) = cot(5 deg) ~= 11.43 -- steep, but finite.
export function constraintLine({ W, th, al, which }) {
  const slope = which === 'ramp'
    ? Math.tan(al * DEG)
    : -1 / Math.tan(th * DEG);
  return { slope, intercept: W };
}

// NA = W sin(th)/cos(th - al) is smallest where cos(th - al) = 1, i.e. al = th:
// the flap perpendicular to the ramp. There NA = W sin(th) and NB = W cos(th),
// the textbook decomposition. Geometrically it is the perpendicular foot of the
// flap's constraint line.
export function minFlapForce({ W, th }) {
  return { N: W * Math.sin(th * DEG), al: th };
}

// Nearest point on the line. Used instead of inverting force -> angle, because
// that inverse has two branches and produces visible jumps while dragging.
export function projectOntoLine({ x, y }, { slope, intercept }) {
  const dx = 1, dy = slope;
  const t = ((x - 0) * dx + (y - intercept) * dy) / (dx * dx + dy * dy);
  return { x: t * dx, y: intercept + t * dy };
}
