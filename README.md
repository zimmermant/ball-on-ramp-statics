# A Ball on a Ramp

**[▶ Open the simulation](https://zimmermant.github.io/ball-on-ramp-statics/)**

An interactive sandbox for a three-force equilibrium problem: a ball rests on a ramp that
rises to the right, held from rolling downhill by a flap pressing on its downhill side. Drag
the ramp angle or the flap angle and watch the two contact forces resolve live, across four
linked panels — the scene, the ball's free-body diagram, the closed force triangle, and the
equilibrium equations.

Built for PHYS 291 (Statics).

## What it shows

1. **The contact forces are not free — the geometry fixes them.** Once you set the ramp
   angle and the flap angle, the flap force `N_A` and the ramp force `N_B` are determined;
   there is nothing left to choose.
2. **The textbook answer is a special case you find by dragging, not a formula you're
   handed.** Set the flap perpendicular to the ramp and the numbers resolve to the familiar
   `W sin θ` (flap) and `W cos θ` (ramp) — and a message confirms it. That configuration is
   also where the flap force is at its *minimum*.
3. **A badly angled flap needs enormous force.** Flatten it toward the slope and `N_A` runs
   toward infinity — the arrow leaves the panel, clipped with a chevron and a still-readable
   number, rather than pretending the diagram can show an infinite arrow.
4. **Rotating the flap upward unloads the ramp.** `N_B` decreases monotonically as the flap
   rotates up (it has no interior minimum, unlike `N_A`), heading toward zero as the ball
   nears lifting off the ramp entirely.

This is an exploration tool: no scoring, no answer checking, no student data collected.

## Why the flap's usable range slides

The flap has to lean into the slope enough to actually grip the ball, and it can't lean so
far that the ball would lift off the ramp. Both limits depend on the ramp angle, so the
flap's allowed window *slides* as you change the ramp — steepen the ramp far enough and the
flap visibly rotates to stay inside its new window, its contact point sliding around the
ball, even though you never touched the flap directly.

## The constraint-line idea

Put the ball's centre at the origin of the free-body diagram, and let `Q = (0, W)` mark the
point one weight-length straight above it. Holding the weight and the ramp angle fixed, the
flap force's arrowhead is confined to a straight line through `Q`. Holding the weight and the
flap angle fixed, the ramp force's arrowhead is confined to a different straight line, also
through `Q`. `Q` is the same point as the force triangle's third vertex.

That's why the scene panel and the free-body diagram can both be "live" at once and can never
disagree: dragging an arrowhead is a projection onto its line, not an inverse solve with
multiple branches to choose between. The scene and the FBD are two views of the same three
numbers, not two separate calculations that happen to agree.

## Using it

Open `dist/ball_on_ramp_statics.html` in any browser. No server, no install, works offline —
it's a single self-contained HTML file with the CSS and JavaScript inlined.

## Developing

    export NODE=/opt/homebrew/Cellar/node@22/22.23.2_1/bin/node   # default node is broken
    python3 -m http.server 8000        # then open http://localhost:8000/src/
    $NODE --test test/*.test.js        # run all tests (the directory form --test test/ is broken)
    $NODE build.js                     # rebuild dist/ball_on_ramp_statics.html

## Design

See `docs/superpowers/specs/2026-09-20-ball-on-ramp-design.md` in the repo root for the full
design, including the closed-form solution, the domain and why it's clamped, and the case for
why this is a point-particle problem in the first place.

## License

MIT — see `LICENSE`.
