// Chapter 3: the impact drive, simulated (sprinkler.js: makeImpact). Drawn in millimetres.
// Nothing here is keyframed. Each frame the model is advanced in steps of a ten-thousandth of a
// second: the jet's push on the spoon, the arm spring, the blow of the arm on the anvil (or on
// the trip tab), the friction of the washers, and the trip lever flipping at each collar. The
// drawing shows the angles the simulation gives. See sprinkler.js for every constant.
// The jet is drawn as drops leaving the nozzle at the real jet speed. While the spoon is in the
// jet, they leave the spoon instead, turned 70° to the side.
import { THREE, M, approach, clamp } from '../kit.js';
import { BAR, IMPACT, impactForces, makeImpact } from '../sprinkler.js';
import { COL, makeSprinkler, makeDrops, jetAt, NOZ_TIP, SPOON_S, SPOON_OUT, RISER, board, panelBg, rows, fitNarrow, framer, fitView, inReel } from '../parts.js';
import { sfx } from '../ui.js';

const S = 0.08, Y0 = RISER * S + 0.05, DEG = 180 / Math.PI;
const SLOWS = { 1: 1, 4: 0.25, 16: 1 / 16 };
const limits = (s) => ({ lo: (-s.arc / 2) / DEG, hi: (s.arc / 2) / DEG });

export default {
  id: 'impact',
  short: 'Tick, tick, tick',
  title: 'The arm, the spoon and the tick',
  subtitle: 'The jet throws the arm aside, a spring brings it back, and each tap turns the head a little.',
  view: { pos: [3.2, 25.6, 32.7], target: [-3.4, 7.6, 0] },
  learn: `<p>Watch one beat. At rest, the <b>spoon</b> sits in the jet. It turns part of the water sideways, and the water pushes back (Newton's third law: see <a href="https://glassbox.how/newtonclear/">NewtonClear</a>). That push <b>flings the arm</b> out of the jet.</p>
    <p>As the arm swings out it winds up the <b>arm spring</b>. The spring stops it and swings it home. The arm arrives fast and <b>strikes the anvil</b> on the body: tick. Like one flywheel hitting another, the arm shares its turning momentum with the head (<a href="https://glassbox.how/momentumclear/">MomentumClear</a>), and the head jumps round by <b>a few degrees</b>. Friction in the bearing washers stops it almost at once. Then the spoon is back in the jet, and it all happens again, two or three times a second.</p>
    <p>The arm does a second job. Every time it cuts through the jet it breaks the stream up and knocks some water short, so the ground near the sprinkler is watered as well as the far edge.</p>
    <p>To water only part of a circle, the head has a <b>trip lever</b>. At the end of the arc the lever meets a <b>collar</b> and flips, lifting a <b>tab</b> into the arm's way. Now the arm hits the tab early on its way out. Those blows push the head backwards, and they come much faster, so the head <b>chatters back</b> to the start. There the lever meets the other collar, drops the tab, and the slow forward ticking begins again.</p>
    <p>Not every sprinkler ticks. A <b>spinning lawn sprinkler</b> has bent arms and turns by the kick of its own jets, like Hero's steam engine of 2,000 years ago. A <b>pop-up rotor</b> hides a tiny water turbine and gears that turn the nozzle smoothly.</p>
    <p class="tip"><b>Try it:</b> choose the slowest speed and watch a single beat. Then go back to life speed and wait for the head to reach the end of its arc.</p>`,
  terms: [
    { t: 'Impact drive', d: 'Turning a sprinkler by letting a swinging arm strike its body again and again.' },
    { t: 'Momentum', d: 'Mass in motion. In a collision it is shared between the things that hit, never lost.' },
    { t: 'Anvil', d: 'The lug on the body that the returning arm strikes.' },
    { t: 'Trip tab', d: 'A stop the trip lever raises into the arm\'s path to drive the head backwards.' },
    { t: 'Part circle', d: 'A sprinkler set to sweep an arc and return, for field edges and corners.' },
  ],
  defaults: { slow: 4, p: 3, part: true, arc: 90 },
  controls: [
    { key: 'slow', type: 'seg', label: 'Speed', options: [{ v: 1, label: 'Life speed' }, { v: 4, label: '4× slower' }, { v: 16, label: '16× slower' }] },
    { key: 'p', type: 'range', label: 'Pressure at the sprinkler', min: 1, max: 5, step: 0.1, fmt: (v) => v.toFixed(1) + ' bar' },
    { key: 'part', type: 'toggle', label: 'Part circle (trip lever in use)', hint: 'Off: the head goes all the way round.' },
    { key: 'arc', type: 'range', label: 'Arc between the collars', min: 40, max: 300, step: 10, fmt: (v) => v.toFixed(0) + '°' },
    { key: 'go', type: 'buttons', label: 'Jump', items: [{ label: 'To the end of the arc', act: (s, inst) => inst.jump() }] },
  ],
  quiz: [
    { q: 'What turns the head of an impact sprinkler?', options: ['The jet pushing on the nozzle', 'The blow of the returning arm on the body', 'A gear train', 'The wind'], answer: 1, why: 'The spring swings the arm home and it strikes the anvil. The blow shares the arm\'s turning momentum with the head, which steps round a few degrees.' },
    { q: 'What stops the head after each tap?', options: ['The trip collar', 'The spoon', 'Friction in the bearing washers, squeezed by the water pressure', 'Nothing: it keeps coasting'], answer: 2, why: 'Pressure presses the spindle against a stack of washers. Their friction stops the head within a few degrees and holds it until the next tap.' },
    { q: 'Why does the head go back faster than it goes forward?', options: ['The pump speeds up', 'With the trip tab raised, the arm hits it after a short swing, so the blows come much more often', 'The spring gets stronger', 'Gravity helps'], answer: 1, why: 'A short swing takes less time. The blows on the tab push the head backwards many times a second.' },
  ],
  reel: [
    { ms: 6200, caption: 'The jet hits the spoon and flings the arm aside. A spring swings it back to strike the body: tick.', set: { slow: 4, p: 3, part: false, arc: 90 }, spin: 0 },
    { ms: 5600, caption: 'Each tick turns the head about three degrees. A trip lever flips at the end of the arc and it chatters back.', set: { slow: 1, p: 3, part: true, arc: 40 }, act: (s, inst) => inst.jump(), spin: 0 },
  ],

  build({ stage }) {
    const G = new THREE.Group(); G.scale.setScalar(S); G.position.y = Y0; stage.root.add(G);
    const sp = makeSprinkler({ cut: false }); G.add(sp.root);
    const sim = makeImpact();
    // the jet
    const dr = makeDrops(900, { size: 1.5 }); G.add(dr.mesh);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 1, 10), new THREE.MeshBasicMaterial({ color: COL.spray, toneMapped: false, transparent: true, opacity: 0.85 })); sp.head.add(core);
    const tip = jetAt(NOZ_TIP), spoonAt = jetAt(SPOON_S - 2), E = Math.atan2(jetAt(1)[1] - jetAt(0)[1], jetAt(1)[0]);
    core.rotation.z = -(Math.PI / 2 - E);
    // arc on the ground and a pointer
    const dial = new THREE.Group(); dial.position.y = -RISER + 0.6; G.add(dial);
    const ring = new THREE.Mesh(new THREE.RingGeometry(99, 104, 64), M.ghost(0x8ea0c0, 0.35)); ring.rotation.x = -Math.PI / 2; dial.add(ring);
    let arcMesh = null, arcKey = '';
    const pointer = new THREE.Mesh(new THREE.BoxGeometry(50, 1.5, 5), M.glow(0xffb547)); pointer.geometry.translate(78, 0, 0); dial.add(pointer);
    const lb = {
      tick: stage.label('', [-52, 118, 0], G, 'hot'), spoon: stage.label('Spoon', [86, 122, 0], sp.arm), anvil: stage.label('Anvil', [4, 96, -34], sp.head),
      tab: stage.label('Trip tab', [44, 60, 30], sp.head), mode: stage.label('', [30, -RISER + 8, 122], G),
    };
    // the chart: arm swing and head angle against time
    const WIN = 2.4, DT = 0.004, NS = Math.round(WIN / DT), tr = { phi: new Float32Array(NS), psi: new Float32Array(NS), rev: new Uint8Array(NS), n: 0 };
    let sNow = null;
    const bd = board(G, 180, 108, 1000, 600, (g, w, h) => {
      panelBg(g, w, h);
      g.fillStyle = '#e8eef8'; g.font = 'bold 40px sans-serif'; g.fillText('One simulated stretch of ' + WIN + ' s', 26, 50);
      const X = (i) => 110 + ((w - 140) * i) / (NS - 1);
      const band = (y0, y1, arr, lo, hi, color, name, unit) => {
        const Y = (v) => y1 - ((y1 - y0) * (clamp(v, lo, hi) - lo)) / (hi - lo);
        g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.beginPath(); g.moveTo(110, y1); g.lineTo(w - 30, y1); g.moveTo(110, y0); g.lineTo(w - 30, y0); g.stroke();
        g.font = '28px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)'; g.textAlign = 'right'; g.fillText(lo.toFixed(0) + unit, 100, y1 + 8); g.fillText(hi.toFixed(0) + unit, 100, y0 + 10); g.textAlign = 'left';
        g.fillStyle = color; g.fillText(name, 124, y0 + 30);
        g.strokeStyle = color; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath();
        for (let i = 0; i < tr.n; i++) { const v = arr[i]; if (i) g.lineTo(X(i), Y(v)); else g.moveTo(X(i), Y(v)); }
        g.stroke();
      };
      if (!tr.n) return;
      let pmax = 30; for (let i = 0; i < tr.n; i++) pmax = Math.max(pmax, tr.phi[i]);
      let a = Infinity, b = -Infinity; for (let i = 0; i < tr.n; i++) { a = Math.min(a, tr.psi[i]); b = Math.max(b, tr.psi[i]); }
      const mid = (a + b) / 2, half = Math.max(6, (b - a) / 2 + 1);
      for (let i = 0; i < tr.n; i++) if (tr.rev[i]) { g.fillStyle = 'rgba(255,90,90,.16)'; g.fillRect(X(i), 78, (w - 140) / (NS - 1) + 1, h - 110); }
      band(92, 300, tr.phi, 0, Math.ceil(pmax / 30) * 30, '#8ef0ff', 'arm swing', '°');
      band(350, 560, tr.psi, Math.floor(mid - half), Math.ceil(mid + half), '#ffb547', 'head angle: one step per tick', '°');
    }, [-132, -14, 30], 0.3);
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [0.8, 12.6, 0], [0.22, 0.6, 1], 47) : mode === 'narrow' ? fitView(stage, [1.6, 8.6, 0], [0.22, 0.6, 1], 40) : fitView(stage, [-4.6, 7.4, 0], [0.2, 0.55, 1], 38)));
    let trip = 0, acc = 0, tAcc = 0, redraw = 0, seed = 7, lastClick = 0, started = false, tickFlash = 0;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    let quiet = true, want = false;
    sim.onHit = (kind) => { if (kind !== 'bridge') tickFlash = 1; if (!quiet && !inReel() && performance.now() - lastClick > 70) { lastClick = performance.now(); sfx('click'); } };
    const v3 = new THREE.Vector3();
    return {
      jump() { want = true; },
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt); sNow = s;
        const mode = frame();
        fitNarrow(stage, [lb.anvil, lb.spoon], -0.1, 0);
        const L = limits(s), o = { P: s.p * BAR, d: 4, part: !!s.part, lo: L.lo, hi: L.hi }, f = impactForces(o.P, 4);
        if (!started) {
          // run the model for a few seconds first, so the chart starts full and the beat is steady
          started = true; sim.psi = s.part ? L.lo + 0.02 : 0;
          quiet = true;
          for (let t = 0; t < WIN; t += DT) { sim.advance(DT, o); if (tr.n < NS) tr.n++; tr.phi[tr.n - 1] = sim.phi * DEG; tr.psi[tr.n - 1] = sim.psi * DEG; tr.rev[tr.n - 1] = sim.rev && s.part ? 1 : 0; }
          quiet = false;
        }
        if (want) { want = false; if (s.part) sim.psi = sim.rev ? L.lo + 0.12 : L.hi - 0.12; }
        if (s.part) sim.psi = clamp(sim.psi, L.lo - 0.3, L.hi + 0.3);
        const simDt = dt * (SLOWS[s.slow] || 1), v = f.nz.v * 1000;      // jet speed, mm/s
        // advance the mechanism and the drops together, in slices, so each drop leaves from where the head and arm are
        const slices = Math.max(1, Math.min(24, Math.ceil(simDt / 0.0008))), h = simDt / slices;
        for (let k = 0; k < slices; k++) {
          sim.advance(h, o);
          tAcc += h; while (tAcc >= DT) { tAcc -= DT; if (tr.n < NS) tr.n++; else { tr.phi.copyWithin(0, 1); tr.psi.copyWithin(0, 1); tr.rev.copyWithin(0, 1); } tr.phi[tr.n - 1] = sim.phi * DEG; tr.psi[tr.n - 1] = sim.psi * DEG; tr.rev[tr.n - 1] = sim.rev && s.part ? 1 : 0; }
          acc += h * 7000;
          while (acc >= 1) {
            acc -= 1;
            const inJet = sim.phi < IMPACT.zone, cp = Math.cos(sim.psi), spn = Math.sin(sim.psi);
            // a point and a direction in the head's frame, turned by psi about the Y axis
            let px, py, pz, dx, dy, dz, sp2 = v;
            if (inJet) {
              const a = -sim.phi, ca = Math.cos(a), sa = Math.sin(a);         // the arm's own turn inside the head
              const ox = spoonAt[0] + 6, oy = spoonAt[1], oz = -3;
              px = ox * ca + oz * sa; pz = -ox * sa + oz * ca; py = oy;
              const jx = SPOON_OUT[0] + (rnd() - 0.5) * 0.5, jy = SPOON_OUT[1] + (rnd() - 0.5) * 0.3, jz = SPOON_OUT[2] + (rnd() - 0.5) * 0.3, l = Math.hypot(jx, jy, jz);
              dx = (jx * ca + jz * sa) / l; dz = (-jx * sa + jz * ca) / l; dy = jy / l; sp2 = v * (0.55 + rnd() * 0.2);
            } else { px = tip[0]; py = tip[1]; pz = 0; const j = (rnd() - 0.5) * 0.02, jz = (rnd() - 0.5) * 0.02; dx = Math.cos(E + j); dy = Math.sin(E + j); dz = jz; }
            const wx = px * cp + pz * spn, wz = -px * spn + pz * cp, wdx = dx * cp + dz * spn, wdz = -dx * spn + dz * cp, ag = rnd() * h;
            dr.emit(wx + wdx * sp2 * ag, py + dy * sp2 * ag, wz + wdz * sp2 * ag, wdx * sp2, dy * sp2, wdz * sp2, 0.03, 0, inJet ? 0.8 : 1);
          }
          dr.advance(h, { g: 9810, floor: -RISER });
        }
        dr.draw();
        trip = approach(trip, sim.rev && s.part ? 1 : 0, 30, dt);
        sp.pose({ psi: sim.psi, phi: sim.phi, trip, lo: L.lo, hi: L.hi, part: !!s.part });
        // the solid start of the jet: as far as the spoon when the spoon is in the way
        const len = sim.phi < IMPACT.zone ? SPOON_S - NOZ_TIP - 2 : 26;
        v3.set(...jetAt(NOZ_TIP + len / 2)); core.position.copy(v3); core.scale.set(1, len, 1);
        // the arc on the ground
        const ak = s.part ? s.arc : 360;
        if (ak !== arcKey) {
          arcKey = ak; if (arcMesh) { dial.remove(arcMesh); arcMesh.geometry.dispose(); }
          arcMesh = new THREE.Mesh(new THREE.RingGeometry(58, 98, 64, 1, s.part ? L.lo : 0, s.part ? L.hi - L.lo : Math.PI * 2), M.ghost(0x4fc3ff, 0.22)); arcMesh.rotation.x = -Math.PI / 2; dial.add(arcMesh);
        }
        pointer.rotation.y = sim.psi;
        tickFlash = Math.max(0, tickFlash - dt * 4);
        lb.tick.element.textContent = sim.beats ? `tick ${sim.beats}` : '';
        lb.tick.element.style.opacity = String(0.35 + 0.65 * tickFlash);
        lb.tab.visible = lb.tab.visible !== false && s.part && mode !== 'narrow';
        lb.tab.element.textContent = sim.rev ? 'Trip tab: raised' : 'Trip tab: down';
        lb.mode.element.textContent = !s.part ? 'Full circle' : sim.rev ? 'Reversing fast' : 'Stepping forwards';
        redraw += dt; if (redraw > 0.08 || inReel()) { redraw = 0; bd.redraw(); }
        if (mode === 'tall') bd.place([8, 212, -70], 1.22, 0, -0.42); else bd.place();
        bd.mesh.visible = mode !== 'narrow';
      },
      readout: (s) => {
        const f = impactForces(s.p * BAR, 4), bps = sim.period > 0 ? 1 / sim.period : 0, rate = Math.abs(sim.step) * bps * DEG;
        return rows(sim.rev && s.part ? 'Reversing' : `${bps.toFixed(1)} ticks a second`, [
          ['Arm swings out', (sim.swing * DEG).toFixed(0) + '°'],
          ['Head turns per tick', (sim.step * DEG).toFixed(1) + '°'],
          ['Turning rate', rate.toFixed(1) + '° a second'],
          ['One full turn would take', rate > 0.2 ? (360 / rate).toFixed(0) + ' s' : 'a long time'],
          ['Jet\'s push on the spoon', (f.kick / IMPACT.rSpoon).toFixed(1) + ' N'],
          ['Bearing friction', (f.friction * 1000).toFixed(0) + ' mN·m'],
        ], 'Simulated with typical part sizes: a 95 g brass arm, a 4 mm nozzle, wet washers.', 3, 280);
      },
    };
  },
};
