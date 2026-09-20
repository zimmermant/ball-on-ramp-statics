import { DEG, flapWindow, FLAP_MAX } from './physics.js';

export const PERPENDICULAR_TOL = 0.6;
export const EDGE_TOL = 2;

export function messageFor(s) {
  if (Math.abs(s.al - s.th) < PERPENDICULAR_TOL) {
    return `The flap is perpendicular to the ramp. This is where it holds the ball ` +
           `with the least force: N_A is at its minimum, W·sin θ = ` +
           `${Math.round(s.W * Math.sin(s.th * DEG))} N, and the ramp carries exactly ` +
           `W·cos θ = ${Math.round(s.W * Math.cos(s.th * DEG))} N. ` +
           `That is the textbook decomposition.`;
  }
  const w = flapWindow(s.th);
  if (s.al - w.min < EDGE_TOL) {
    return `The flap is nearly parallel to the slope, so it has almost no grip — ` +
           `it is pushing ${Math.round(s.NA).toLocaleString('en-US')} N to hold a ` +
           `${Math.round(s.W)} N ball. Flatten it further and the force runs away ` +
           `toward infinity.`;
  }
  if (FLAP_MAX - s.al < EDGE_TOL) {
    return `The flap is now doing almost all the work, and the ramp is down to ` +
           `N_B = ${Math.round(s.NB)} N. It never quite reaches zero: the ball would ` +
           `only leave the ramp at a flap angle of 90 degrees, which is outside the ` +
           `range the flap can be set to.`;
  }
  return '';
}

export function createMessages(node) {
  return { render(s) { node.textContent = messageFor(s); } };
}
