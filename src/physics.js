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
export const FLAP_SPAN = 80;          // width of the flap's window, below FLAP_MAX
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
