# Lab Notebook — Ball on a Ramp

## 2026-09-20 (later) — whole-branch review, fix wave, and what it caught

### Summary

Eleven tasks built the app; a whole-branch review then found one Critical defect that all
eleven task reviews had walked past. Fixed, plus two Important items and a set of minors.
43 tests pass. `dist/ball_on_ramp_statics.html` is 40,905 bytes and rebuilds byte-identically
from `src/`.

### The Critical defect, and why it hid

The perpendicular-flap message recomputed `W*cos(th)` for the ramp force and called it
"exactly" that. It fires within a tolerance of `al === th`, and the two forces behave
differently there:

- **`N_A` is STATIONARY at `al = th`** — it is a minimum — so blurring by the tolerance cost
  it about **0.05 N**, invisible.
- **`N_B` is MONOTONIC there** — it has no interior minimum at all — so the same blur cost it
  up to **9.2 N, about 4.9%**.

At `W = 900, th = 78.5, al = 77.9` the message said the ramp carries exactly 179 N while the
free-body diagram, the triangle and the equations all showed 189 N. Dragging essentially
never lands on `al === th` exactly, so the contradicting case was the common one — in the
app's headline teaching moment.

**It hid because the test could not fail.** It evaluated only `al === th`, the single point
where recomputing and reading the live force coincide by construction. This is the same
pattern that produced three other defects on this branch, and it is worth stating as a rule:
*a test that samples only the point where two computations agree cannot tell you they are
different computations.*

The fix quotes `Math.round(s.NA)` and `Math.round(s.NB)` so the sentence can never disagree
with the panels, tightens the tolerance from 0.6 to 0.2 degrees so the `W sin th` / `W cos th`
framing stays honest, and adds a sweep across the whole band that fails against the old
recompute with a 3.1 N gap.

### The other two

- **`toMaths` was unguarded.** `test/fbd.test.js` round-tripped `px` against its own *copy* of
  the inverse, so dropping the y-flip in the real one would have broken every drag with the
  suite green. I had parked this citing the top-level name budget; the reviewer pointed out
  that `build.js` forbids *duplicate* names and `toMaths` is unique, so the budget was never
  the obstacle. It is now exported and pinned against the real function.
- **The build's duplicate detector missed every declarator after the first**, and the codebase
  already tripped it: `export const VB = {...}, PAD = 0.12;` left `PAD` unregistered. Fixed,
  and `scanForDuplicates` now has tests — including one asserting an *indented* `const` is NOT
  flagged, which is what lets `triangle.js`'s inner `px` legally shadow `fbd.js`'s.

### Open questions / next steps

1. **Todd's own browser confirmation** of `dist/ball_on_ramp_statics.html` over `file://` is the
   last gate, and it is the only evidence covering the renderer layer — no test instantiates
   `createFbd` or `createTriangle`, deliberately.
2. The new comma-scanner in `build.js` has three dormant gaps: a regex literal or a block
   comment containing a comma on a column-0 declaration would false-positive; a multi-LINE
   multi-declarator statement would false-negative. None is triggered today. A fully general
   guard needs a tokeniser rather than another special case.
3. Deliberately not tested, because closing it needs a hand-rolled SVG shim whose own
   correctness nothing verifies: the drag routing in `createFbd`, and that `triangle.js` draws
   the construction its test pins mathematically.

---

## 2026-09-20 — Task 11: build, docs, and ship

### Summary

Final task (11 of 11) for the ball-on-a-ramp statics sandbox. Ten prior tasks built the app
as ES modules under `src/` (`physics.js`, `svg.js`, `state.js`, `scene.js`, `fbd.js`,
`triangle.js`, `equations.js`, `messages.js`, `app.js`, plus `styles.css` and `index.html`),
with 29 passing unit tests. This task's job was the artifact students actually open: a single
self-contained HTML file, no server, no dependencies, working offline.

Built:

- `src/index.template.html` — a copy of `src/index.html` with the stylesheet `<link>`
  replaced by `<!--INLINE_CSS-->` and `<script type="module" src="app.js">` replaced by
  `<!--INLINE_JS-->`. `diff` against `src/index.html` shows exactly those two hunks, nothing
  else.
- `test/build.test.js` — four tests pinning `strip()` (imported from `build.js`) as a pure
  function: single-line import removed, multi-line import removed, single-line
  `export { ... }` block removed, `export function`/`export const` keep their declaration but
  lose the keyword. `build.js` was not modified — it already exported `strip` and already
  guarded `main()` behind the `process.argv[1] === pathToFileURL(...)` check from its Task 4
  port, so importing it for this test does not trigger a real build.
- `dist/ball_on_ramp_statics.html` — the generated deliverable, 39,696 characters as reported
  by `build.js` / 39,712 bytes on disk (the gap is a handful of multi-byte UTF-8 characters —
  θ, °, etc. — each 1 JS-string character but 2–3 UTF-8 bytes), well under the 250 KB budget.
- `README.md`, `LICENSE` (MIT), this file.

Test count: 29 (existing) + 4 (`build.test.js`) = 33, matching the brief's expected total
exactly.

### Why this was a port, not a fresh build: the concurrency argument

The flap is tangent to the ball, so its normal force acts along a radius and passes through
the ball's centre. The ramp's normal likewise acts along a radius, so it too passes through
the centre. The weight acts at the centre by definition. All three forces are therefore
**concurrent at a single point** — the ball's centre — which makes this a point-particle
equilibrium problem, structurally identical to the sibling app
(`point_particle_statics_simulation`, three ropes on a ring/three-force point). That shared
structure is what let this app reuse the sibling's architecture (state → physics → four
linked panels, the single-file build, the constraint-line drag machinery) rather than
starting from nothing: `svg.js`, `styles.css`, `build.js`, `triangle.js`, and the
constraint-line drag machinery in `fbd.js` transferred essentially unchanged, along with every
fix the sibling app earned (pointer-scoped drag capture, right-click guards,
`try { setPointerCapture } catch {}`, `getBBox`-based label nudging, the grab-offset fix for
off-scale arrowhead grabs). `physics.js` (new formulas, coupled clamp), `scene.js` (entirely
new geometry), and `messages.js` (new copy) were rewritten for this scenario.

### The sliding flap window and the approved coupling rule

State is exactly three numbers: `W` (ball weight), `th` (ramp angle), `al` (flap angle). `NA`
and `NB` are never stored — derived on every read via the closed form, so the panels cannot
drift out of agreement.

Equilibrium needs `cos(th - al) > 0` (the flap must lean into the slope enough to grip) and
`cos(al) > 0` (the ball must still press on the ramp), so the true domain for `al` is
`(th - 90, 90)` — a window that **slides** with the ramp angle rather than staying fixed. The
app clamps to the narrower `[th - 80, 85]`, leaving margin at both ends so the worst-case
force inside the clamp stays finite (about `5.7 × W` at the lower edge) rather than genuinely
diverging.

**Coupling rule (approved during design, carried through unchanged into this build):** the
ramp always moves to wherever it is dragged; `al` is then re-clamped into the *new* window,
and the flap visibly rotates to follow, its contact point sliding around the ball.
`setRampAngle` clamps `th` first, then re-clamps `al` against the new window, in one state
update — so no subscriber (no panel) ever renders the intermediate, briefly-invalid pair.
`setFlapAngle` just clamps `al` against the *current* `th`; it never moves the ramp. This
coupling is the one piece of genuinely new logic the sibling app didn't need, because its two
ropes' angles don't constrain each other the way the ramp constrains the flap here.

Verified live in the browser during this task's acceptance walk: starting from `al = -45°` at
`th = 30°` (near the flap's lower limit, window `[-50, 85]`), steepening the ramp via the
keyboard to `th = 70°` (window now `[-10, 85]`) reclamped `al` to exactly `-10.0°` in the same
interaction — the flap visibly rotated to the new edge, its contact point slid around the
ball, and the ball stayed supported on both contact points throughout (`NB` stayed positive:
`2836 N` at that configuration, not zero).

### Why the ball's radius is fixed, unlike the sibling's crate

The sibling app's crate is just a weight hanging at the end of a rope — its size has no
bearing on the physics, so it was drawn scaled to the crate's weight purely for visual
feedback. Here the ball's radius `R` is **load-bearing geometry**: it's what sets *both*
contact points (`Cb = P + d·(cos th, -sin th)` along the ramp, and `Ca` on the ball's own
circumference where the flap is tangent) and what makes the flap-handle-rides-a-circle
relationship (`FLAP_HANDLE_R = hypot(R, FLAP_UP)` about the ball's centre) fall out of the
geometry for free. Scaling `R` with `W`, the way the sibling scaled its crate, would move
both contact points and silently change the moment arms and hence the force balance — so `R`
is fixed at `70` (in `scene.js`) regardless of the weight slider.

### Deviations from the brief

None found. Both of `build.js`'s "confirm, do not rewrite" claims held exactly as stated:

- The `MODULES` manifest already read `physics.js, svg.js, state.js, scene.js, fbd.js,
  triangle.js, equations.js, messages.js, app.js` — the same nine names, same order, as the
  sibling.
- `strip` was already exported and `main()` was already guarded behind
  `process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href`, so
  `test/build.test.js` needed no change to `build.js` to import `strip` safely.

Both of the fixes the sibling app's own lab notebook recorded as "earned the hard way"
(stripping a multi-line import as a whole statement rather than line-by-line, and excluding
the SVG namespace literal from the external-URL check) were already present in this app's
`build.js` from the Task 4 port — confirmed by reading the file before running it, not
discovered by a failure this time.

### Verification performed

- **Duplicate-name assertion, proven to fire.** Appended a column-0 `const BALL_R = 1;` to
  `src/triangle.js` (colliding with `scene.js`'s top-level `export const BALL_R = 70`).
  Build failed with:
  ```
  Error: Duplicate top-level name "BALL_R" in triangle.js; already declared in scene.js. All modules share one scope after inlining, so names must be unique.
  ```
  Reverted with `git checkout -- src/triangle.js` (clean diff afterward) and rebuilt:
  `built dist/ball_on_ramp_statics.html  (39696 bytes, 9 modules)` — identical byte count to
  the pre-mutation build, confirming the revert was exact.
- `$NODE --test test/*.test.js` → **33 pass, 0 fail** (29 existing + 4 new in
  `build.test.js`).
- Self-containment on the built file: `grep -c "<script[^>]*src=\|<link[^>]*href="` → 0
  matches; the only `https?://` occurrence anywhere in the file is
  `http://www.w3.org/2000/svg` (the SVG XML namespace, required by
  `document.createElementNS`, never fetched over the network); no surviving `import`/`export`
  statement.
- Browser check on the actual built file (not `src/`), served statically from `dist/` via
  `python3 -m http.server` and loaded in a freshly created tab (not a reused one):
  - Default state on load: `W = 500 N`, `θ = 30.0°`, `N_A = 289 N`, `N_B = 577 N`, matching
    every panel, no console errors, exactly one network request (the page load itself, no
    further outbound requests at any point during interaction).
  - Dragging the ramp handle with the mouse (corrected for the screenshot-vs-viewport
    coordinate scale, a mistake on my part the first two attempts, not an app defect) moved
    `th` from `70.0°` to exactly `50.0°`, and `N_A`/`N_B` updated identically across the
    scene, FBD, triangle, and equations panels (`768 N` / `986 N` in all four).
  - Keyboard: Tab-focusing and arrow-keying every one of the five `role="slider"` handles
    (`ramp`, `flap` on the scene; `flap`, `ramp`, `w` on the FBD) changed `aria-valuenow` and
    re-rendered the app; each carries an `aria-label` naming its quantity and an
    `aria-valuetext` with live units (e.g. `"-45.0 degrees, flap force 966 newtons"`).
  - Perpendicular flap (`al = th = 30.0°`): `N_A = 250.0 N = W sin 30°`,
    `N_B = 433.0 N = W cos 30°`, and the textbook message displayed verbatim.
  - Flattening the flap toward the slope (`al = -49.0°` at `th = 30°`, one degree from the
    window's lower edge): `N_A` climbed to `1,310 N` and the "nearly parallel... force runs
    away toward infinity" message appeared; at `al = -10°`, `th = 70°` both `N_A` (`2706 N`)
    and `N_B` (`2836 N`) rendered with `→ off scale` chevron labels in the FBD panel, values
    still readable.
  - Force triangle stayed visibly closed at every configuration checked, including the
    perpendicular-flap case.
  - `read_console_messages` with `onlyErrors: true`: no errors, at any point in the session.

Full command output, byte counts, and the complete acceptance-criteria walk are recorded in
the Task 11 report at `.superpowers/sdd/2026-09-20-ball-on-ramp/task-11-report.md`.

### Open questions / next steps

- Acceptance criterion 11 — Todd opening `dist/ball_on_ramp_statics.html` directly from disk
  (`file://`) in his own browser — is explicitly out of this task's scope per the brief and
  the design spec (Claude's browser pane is Chromium and cannot script `file://` URLs, so its
  verification is not evidence about that environment). Not attempted here; still open.
- No other open items. All 11 tasks in the plan are complete pending that final human
  confirmation.
