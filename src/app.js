import { createState } from './state.js';
import { createScene } from './scene.js';
import { createFbd } from './fbd.js';
import { createTriangle } from './triangle.js';
import { createEquations } from './equations.js';

const state = createState();

const els = {
  scene: document.getElementById('scene-svg'),
  fbd: document.getElementById('fbd-svg'),
  triangle: document.getElementById('triangle-svg'),
  equations: document.getElementById('equations'),
  messages: document.getElementById('messages'),
  wRange: document.getElementById('w-range'),
  wNumber: document.getElementById('w-number')
};

// Each panel is { render(s) }. They are pushed in by later tasks.
const panels = [];
panels.push(createScene(els.scene, {
  setRamp: deg => state.setRampAngle(deg),
  setFlap: deg => state.setFlapAngle(deg)
}));
panels.push(createFbd(els.fbd, {
  setRamp: deg => state.setRampAngle(deg),
  setFlap: deg => state.setFlapAngle(deg),
  setWeight: n => state.setWeight(n)
}));
panels.push(createTriangle(els.triangle));
panels.push(createEquations(els.equations));

function renderAll(s) {
  for (const p of panels) p.render(s);
  els.wRange.value = s.W.toFixed(0);
  // Do not fight the user while they are typing an exact weight into the box.
  if (document.activeElement !== els.wNumber) els.wNumber.value = s.W.toFixed(0);
}

els.wRange.addEventListener('input', e => state.setWeight(Number(e.target.value)));
els.wNumber.addEventListener('input', e => state.setWeight(Number(e.target.value)));

state.subscribe(renderAll);
renderAll(state.getState());

export { state, els, panels, renderAll };
