// Chapter 1: inside an impact sprinkler. A generic 3/4 inch brass head (parts.js: makeSprinkler),
// drawn in millimetres, whole or sliced through the middle to show the water's way up the riser,
// through the hollow spindle and out of the nozzle. With the water on, the arm is held aside so
// the jet can be seen leaving (chapter 3 lets the arm go).
// Numbers: jet speed and flow from sprinkler.js: nozzle(); the upward force on the bearing is
// pressure × the 16 mm seal area (IMPACT.aSeal) plus the bearing spring.
import { THREE, exploder, approach } from '../kit.js';
import { BAR, nozzle, IMPACT } from '../sprinkler.js';
import { makeSprinkler, makeStream, jetAt, NOZ_TIP, ELEV, RISER, rows, fitNarrow, framer, fitView, COL } from '../parts.js';

const S = 0.08, Y0 = RISER * S + 0.05;
const E = (ELEV * Math.PI) / 180;

export default {
  id: 'anatomy',
  short: 'Inside a sprinkler',
  title: 'Inside an impact sprinkler',
  subtitle: 'A pipe, a bearing, a nozzle, and a spring-loaded arm with a spoon on the end.',
  view: { pos: [10.6, 12.3, 34.8], target: [1.6, 8.6, 0] },
  learn: `<p>The sprinkler that goes <b>tick, tick, tick</b> across farms and cricket grounds is called an <b>impact sprinkler</b>. It has no motor and no gears. Everything it does is powered by the water passing through it.</p>
    <p>Water comes up the <b>riser</b>, a pipe that lifts the head above the crop. It passes through the <b>bearing</b>, a sleeve the head can turn in, then up the hollow <b>spindle</b> into the <b>body</b>. There it turns a corner and squeezes out of the <b>nozzle</b>, a smooth taper that ends in a hole about 4 mm wide. The nozzle points upwards at about 25 degrees.</p>
    <p>Above the nozzle a bar called the <b>arm</b> swings on a pin. One end carries a curved <b>spoon</b> that sits right in the jet. The other end is a <b>counterweight</b>. A coiled <b>arm spring</b> always pulls the arm back to its rest position against a lug on the body, the <b>anvil</b>.</p>
    <p>Down in the bearing, the water pressure pushes the spindle's flange up against a stack of <b>washers</b>. That squeeze seals the joint, and it gives just enough friction to hold the head still between taps. On the side, a <b>trip lever</b> and two <b>collars</b> make the head sweep an arc and turn back, instead of going right round.</p>
    <p>Garden sprinklers and fire sprinklers share a name and almost nothing else. The fire kind is in the last chapter.</p>
    <p class="tip"><b>Try it:</b> slide "Take it apart" to see every piece. Then put it back, turn the water on and follow the dots from the riser to the nozzle.</p>`,
  terms: [
    { t: 'Riser', d: 'The upright pipe that carries water to the sprinkler and holds it above the plants.' },
    { t: 'Nozzle', d: 'A smooth tapering hole that turns the pressure of the water into a fast, narrow jet.' },
    { t: 'Arm and spoon', d: 'A swinging bar with a curved scoop on its end. The jet hits the spoon and throws the arm sideways.' },
    { t: 'Bearing', d: 'The sleeve the head turns in. Washers inside it seal the joint and add a little friction.' },
    { t: 'Trip lever and collars', d: 'A lever on the head that flips when it meets a clip on the bearing, sending the head back the other way.' },
  ],
  defaults: { explode: 0, cut: true, water: false, p: 3 },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'apart'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'cut', type: 'toggle', label: 'Slice it open', hint: 'Cuts the riser, bearing, body and nozzle in half to show the bore.' },
    { key: 'water', type: 'toggle', label: 'Water on (arm held aside)' },
    { key: 'p', type: 'range', label: 'Pressure at the sprinkler', min: 1, max: 5, step: 0.1, fmt: (v) => v.toFixed(1) + ' bar' },
  ],
  quiz: [
    { q: 'What powers the tick-tick-tick of an impact sprinkler?', options: ['A small electric motor', 'A wind-up clockwork spring', 'The water jet itself, pushing on the spoon', 'Gravity'], answer: 2, why: 'The jet hits the spoon and throws the arm aside. A spring brings it back to tap the body. No motor is needed.' },
    { q: 'Why are there washers inside the bearing?', options: ['To filter the water', 'To seal the turning joint and give a little friction that holds the head still between taps', 'To make the ticking sound', 'To slow the jet'], answer: 1, why: 'Pressure squeezes the washers. They stop the joint leaking, and their friction lets the head move only a few degrees per tap.' },
    { q: 'What does the nozzle do to the water?', options: ['Heats it', 'Turns its pressure into speed', 'Adds air to it', 'Measures it'], answer: 1, why: 'Squeezing through the taper, the water trades pressure for speed. At 3 bar it leaves at about 23 metres a second.' },
  ],
  reel: [
    { ms: 5600, caption: 'How does a sprinkler work? This one has no motor: the water passing through it does everything.', set: { explode: 0, cut: true, water: true, p: 3 }, spin: 0.5 },
    { ms: 5400, caption: 'A riser, a bearing, a nozzle, and a swinging arm with a spoon that sits in the jet.', set: { cut: false, water: false }, anim: { explode: [0, 1] }, spin: 0.4 },
  ],

  build({ stage }) {
    const G = new THREE.Group(); G.scale.setScalar(S); G.position.y = Y0; stage.root.add(G);
    const whole = makeSprinkler({ cut: false }), sliced = makeSprinkler({ cut: true });
    G.add(whole.root, sliced.root);
    const offs = (sp) => {
      const p = sp.parts;
      return exploder([
        { obj: p.riser, off: [0, -46, 0] }, { obj: p.washers, off: [0, -31, 0] }, { obj: p.nipple, off: [0, -18, 0] },
        { obj: p.collarLo, off: [30, -18, 16] }, { obj: p.collarHi, off: [-30, -18, 16] }, { obj: p.bspring, off: [0, -7, 0] },
        { obj: p.nozzle, off: [44 * Math.cos(E), 44 * Math.sin(E), 0] }, { obj: p.anvil, off: [0, 0, -30] },
        { obj: p.lever, off: [6, 0, 36] }, { obj: p.leverArm, off: [3, 0, 18] }, { obj: p.armBody, off: [0, 40, 30] }, { obj: p.aspring, off: [0, 56, 0] },
      ]);
    };
    const exW = offs(whole), exS = offs(sliced);
    // water: dots up the bore and round the corner, then the jet
    const tip = jetAt(NOZ_TIP), far = jetAt(520);
    const inside = makeStream(70, [[0, -RISER + 2, -1, 8], [0, -30, -1, 5], [0, 40, -1, 3], [0, 64, -1, 3], [jetAt(14)[0], jetAt(14)[1], -1, 3], [tip[0], tip[1], -1, 1.4]], { size: 1.5 });
    const jet = makeStream(90, [[tip[0], tip[1], 0, 1.6], [far[0], far[1] - 7, 0, 9]], { size: 1.6, color: COL.spray });
    G.add(inside.mesh, jet.mesh);
    const lb = {
      riser: stage.label('Riser', [-34, -58, 0], G), bearing: stage.label('Bearing', [-40, 6, 0], G), washers: stage.label('Washers', [40, -16, 0], G),
      bspring: stage.label('Bearing spring', [-48, 44, 0], G), nozzle: stage.label('Nozzle', [58, 62, 0], G, 'hot'), body: stage.label('Body', [-38, 68, 0], G),
      arm: stage.label('Arm', [30, 126, 0], G, 'hot'), spoon: stage.label('Spoon', [90, 96, 0], G, 'hot'), weight: stage.label('Counterweight', [-58, 104, 0], G),
      aspring: stage.label('Arm spring', [-34, 142, 0], G), anvil: stage.label('Anvil', [4, 92, -16], G), lever: stage.label('Trip lever', [52, 40, 14], G), collars: stage.label('Trip collars', [56, 18, 0], G),
    };
    const home = Object.fromEntries(Object.entries(lb).map(([k, l]) => [k, l.position.clone()]));
    const move = { riser: [0, -46, 0], washers: [0, -31, 0], bearing: [0, -18, 0], collars: [30, -18, 16], bspring: [0, -7, 0], nozzle: [40, 18, 0], anvil: [0, 0, -30], lever: [6, 0, 36], arm: [0, 40, 30], spoon: [0, 40, 30], weight: [0, 40, 30], aspring: [0, 56, 0] };
    const frame = framer(stage, (mode, key) => { const z = key === 'x' ? 1.3 : 1; return mode === 'tall' ? fitView(stage, [1.9, 8.6, 0], [0.3, 0.14, 1], (key === 'x' ? 40 : 34)) : mode === 'narrow' ? fitView(stage, [1.6, 10.5, 0], [0.3, 0.14, 1], 44 * z) : fitView(stage, [1.6, 8.6, 0], [0.34, 0.14, 1], 27 * z); });
    let phi = 0, ex = -1, shown = 0;
    return {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt);
        frame(s.explode > 0.4 ? 'x' : '');
        fitNarrow(stage, [lb.washers, lb.bspring, lb.weight, lb.anvil, lb.collars, lb.aspring, lb.body], -0.1, 0.16);
        const cut = !!s.cut; whole.root.visible = !cut; sliced.root.visible = cut;
        if (ex !== s.explode) { ex = s.explode; exW(ex); exS(ex); for (const [k, l] of Object.entries(lb)) { const m = move[k] || [0, 0, 0]; l.position.set(home[k].x + m[0] * ex, home[k].y + m[1] * ex, home[k].z + m[2] * ex); } }
        const on = s.water && s.explode < 0.03;
        phi = approach(phi, on ? 1.1 : 0, 6, dt);
        const pose = { psi: 0, phi, trip: 0, lo: -0.6, hi: 0.9, part: true };
        whole.pose(pose); sliced.pose(pose);
        shown = on ? Math.min(1, shown + dt * 1.5) : Math.max(0, shown - dt * 3);
        const nz = nozzle(s.p * BAR, 4);
        inside.mesh.visible = cut && shown > 0.01; jet.mesh.visible = shown > 0.01;
        if (sliced.parts.water) sliced.parts.water.visible = cut && s.explode < 0.03;
        inside.update(dt, 0.25 + nz.v * 0.03, shown); jet.update(dt, 0.6 + nz.v * 0.07, shown);
        lb.nozzle.element.textContent = on ? `Nozzle: ${nz.v.toFixed(0)} m/s` : 'Nozzle';
      },
      readout: (s) => {
        const nz = nozzle(s.p * BAR, 4), up = s.p * BAR * IMPACT.aSeal + IMPACT.fSpring;
        return rows('3/4 inch impact sprinkler', [
          ['Nozzle', '4 mm, tilted 25°'],
          ['Jet speed', nz.v.toFixed(1) + ' m/s'],
          ['Flow', nz.lpm.toFixed(1) + ' L/min'],
          ['Jet thrust', nz.thrust.toFixed(1) + ' N'],
          ['Squeeze on the washers', up.toFixed(0) + ' N'],
        ], `At ${s.p.toFixed(1)} bar the water presses the washers together with the weight of about ${(up / 9.81).toFixed(1)} kg.`, 3, 270);
      },
    };
  },
};
