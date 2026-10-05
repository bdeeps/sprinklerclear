// Chapter 2: pressure into speed, speed into throw. Drawn in metres.
// A pump (or a tank high enough) sets the pressure at the nozzle. The nozzle turns it into speed,
// v = 0.96·√(2P/ρ) (sprinkler.js: nozzle). The jet then flies as drops through the air
// (sprinkler.js: fly, a ballistic model with sphere drag). The drawn drops are sampled from the
// model's drop-size curve and flown with the same drag law, at half life speed. The solid line is
// the path of the largest drops, which sets the radius of throw; the dashed line is the same
// throw with no air. The riser is 0.6 m tall.
import { THREE, M, clamp } from '../kit.js';
import { BAR, G as GRAV, nozzle, drops, fly, flyVacuum, bestAngle, paToHead } from '../sprinkler.js';
import { COL, makeDrops, miniSprinkler, cylY, boxAt, board, axes, plot, marker, rows, fitNarrow, framer, fitView } from '../parts.js';

const H0 = 0.6, SLOW = 0.5;
const rad = (a) => (a * Math.PI) / 180;
export function state(s) {
  const P = s.p * BAR, nz = nozzle(P, s.d), D = drops(P, s.d), path = [];
  const far = fly(D.dMax / 1000, nz.v, rad(s.angle), H0, { wx: s.wind, path }), vac = flyVacuum(nz.v, rad(s.angle), H0);
  return { P, nz, D, far, vac, path, head: paToHead(P) };
}
const windName = (v) => (Math.abs(v) < 0.05 ? 'calm' : (v > 0 ? 'tail wind ' : 'head wind ') + Math.abs(v).toFixed(1) + ' m/s');

export default {
  id: 'jet',
  short: 'Pressure and throw',
  title: 'Pressure, speed and throw',
  subtitle: 'The nozzle trades pressure for speed. The air decides how far that speed carries.',
  view: { pos: [7.2, 8.1, 32.9], target: [6.7, 4.4, 0] },
  learn: `<p>A sprinkler makes no push of its own. The push is the <b>pressure</b> in the pipe, and it comes from a <b>pump</b> or from height. Every metre of water standing above the nozzle adds about <b>0.1 bar</b> (P = ρgh: see <a href="https://glassbox.how/pressureclear/">PressureClear</a> and <a href="https://glassbox.how/tapclear/">TapClear</a>). A rooftop tank 10 m up gives only 1 bar. A farm sprinkler likes 2 to 4 bar, a tank 20 to 40 m high, which is why fields use pumps.</p>
    <p>The <b>nozzle</b> turns pressure into speed, the bargain at the heart of <a href="https://glassbox.how/bernoulliclear/">BernoulliClear</a>: speed = 0.96 × √(2 × pressure ÷ density). At 3 bar the jet leaves at about 23 metres a second, over 80 km/h. Four times the pressure gives only twice the speed.</p>
    <p>With no air, a jet that fast, thrown at 45 degrees, would land more than 50 metres away. It never does. The jet breaks into <b>drops</b>, and the air drags hard on something so small and so fast. A 4 mm drop keeps going for about 14 metres. A 1 mm drop gives up after four. So the <b>biggest drops set the throw</b>, and the small ones fall short and fill in the middle.</p>
    <p>Drag also changes the best angle. It punishes time spent in the air, so the farthest throw comes from a flatter launch, about 30 to 35 degrees here, not 45. Makers go lower still, to 23 to 27 degrees, because a low jet is stolen less by wind.</p>
    <p class="tip"><b>Try it:</b> set the angle to 45° and note the throw. Now lower it until the throw is longest. Then add a head wind.</p>`,
  terms: [
    { t: 'Pressure head', d: 'Pressure written as a height of water. 10 metres of water is about 1 bar.' },
    { t: 'Nozzle', d: 'A smooth narrowing that turns pressure into speed: v = C × √(2P/ρ), with C about 0.96.' },
    { t: 'Drag', d: 'The force of the air against a moving drop. It grows with the square of the speed and hits small drops hardest.' },
    { t: 'Radius of throw', d: 'How far from the sprinkler the farthest drops land.' },
    { t: 'Trajectory angle', d: 'The upward tilt of the nozzle. Farm sprinklers use about 23 to 27 degrees.' },
  ],
  defaults: { p: 3, d: 4, angle: 27, wind: 0 },
  controls: [
    { key: 'p', type: 'range', label: 'Pressure at the nozzle', min: 0.5, max: 6, step: 0.1, fmt: (v) => v.toFixed(1) + ' bar (a tank ' + paToHead(v * BAR).toFixed(0) + ' m up)' },
    { key: 'd', type: 'range', label: 'Nozzle size', min: 3, max: 6, step: 0.5, fmt: (v) => v.toFixed(1) + ' mm' },
    { key: 'angle', type: 'range', label: 'Nozzle angle', min: 5, max: 50, step: 1, fmt: (v) => v.toFixed(0) + '°' },
    { key: 'wind', type: 'range', label: 'Wind along the throw', min: -5, max: 5, step: 0.5, ends: ['head wind', 'tail wind'], fmt: windName },
  ],
  quiz: [
    { q: 'A sprinkler needs 3 bar. How high would a tank have to stand to give that with no pump?', options: ['About 3 m', 'About 10 m', 'About 30 m', 'About 300 m'], answer: 2, why: 'Each metre of water adds about 0.1 bar, so 3 bar needs about 30 m. That is a ten-storey building, so farms use pumps.' },
    { q: 'You raise the pressure to four times its value. What happens to the speed of the jet?', options: ['It doubles', 'It goes up four times', 'It goes up sixteen times', 'It stays the same'], answer: 0, why: 'Speed goes as the square root of pressure. Four times the pressure gives twice the speed.' },
    { q: 'Why is the best nozzle angle well below 45 degrees?', options: ['Because the nozzle is heavy', 'Because air drag punishes a long, high flight, so a flatter throw goes farther', 'Because water is lighter than air', 'Because of the riser'], answer: 1, why: 'With no air, 45° wins. With drag, a lower path spends less time fighting the air. Wind makes a low angle better still.' },
  ],
  reel: [
    { ms: 5600, caption: 'The nozzle trades pressure for speed. At 3 bar the jet leaves at 23 metres a second.', set: { d: 4, angle: 27, wind: 0 }, anim: { p: [0.8, 3] }, spin: 0 },
  ],

  build({ stage }) {
    const G = new THREE.Group(); stage.root.add(G);
    // ground with a tape measure
    const grass = boxAt(30, 0.1, 7, 9.5, -0.05, 0, M.matte(COL.grass)); G.add(grass);
    for (let x = 0; x <= 22; x += 1) G.add(boxAt(x % 5 ? 0.04 : 0.08, 0.02, x % 5 ? 0.5 : 1, x, 0.012, 3, M.glow(x % 5 ? 0x6f7b8f : 0xdfe6f2)));
    const tick = [5, 10, 15, 20].map((x) => stage.label(x + ' m', [x, 0.25, 3.3], G));
    // pump set, pipe and sprinkler
    const pump = new THREE.Group();
    pump.add(boxAt(1.1, 0.14, 0.7, 0, 0.07, 0, M.matte(0x4a4f5a)), boxAt(0.55, 0.42, 0.42, -0.2, 0.35, 0, M.plastic(0x2e7d5b)));
    const vol = cylY(0.26, -0.14, 0.14, M.metal(0x4f6fbf, { roughness: 0.4 }), 24); vol.rotation.x = Math.PI / 2; vol.position.set(0.3, 0.36, 0); pump.add(vol);
    pump.position.set(-2.6, 0, 0); G.add(pump);
    const pipe = cylY(0.045, -1.35, 1.35, M.plastic(0xdfe3ea), 12); pipe.rotation.z = Math.PI / 2; pipe.position.set(-1.25, 0.1, 0); G.add(pipe);
    const spr = miniSprinkler(H0, 2.2); G.add(spr);
    const gauge = stage.label('', [-2.6, 1.15, 0], G, 'hot');
    // the jet's drops, the two reference paths and the landing flag
    const dr = makeDrops(700, { size: 0.03 }); G.add(dr.mesh);
    const mkLine = (color, dashed) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 400), 3)); const l = new THREE.Line(g, dashed ? new THREE.LineDashedMaterial({ color, dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0.7 }) : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 })); l.frustumCulled = false; G.add(l); return l; };
    const pathLine = mkLine(0xffb547, false), vacLine = mkLine(0xffffff, true);
    const flag = new THREE.Group(); flag.add(boxAt(0.05, 1.2, 0.05, 0, 0.6, 0, M.glow(0xffb547)), boxAt(0.5, 0.3, 0.03, 0.27, 1.05, 0, M.glow(0xffb547))); G.add(flag);
    const lbFar = stage.label('', [0, 1.6, 0], G, 'hot'), lbVac = stage.label('', [0, 0, 0], G), lbPump = stage.label('Pump', [-2.6, -0.35, 1.2], G);
    // the chart: throw against angle, with and without air
    let cur = null, sNow = null, curves = null;
    const bd = board(G, 8.6, 5.4, 1050, 660, (g, w, h) => {
      const { X, Y } = axes(g, w, h, { title: 'Throw against nozzle angle', x0: 5, x1: 50, y0: 0, y1: 60, xt: [[10, '10°'], [20, '20°'], [30, '30°'], [40, '40°'], [50, '50°']], yt: [[0, '0'], [20, '20'], [40, '40'], [60, '60 m']], xl: 'nozzle angle', pad: [104, 80, 30, 96] });
      if (!cur) return;
      plot(g, X, Y, (a) => Math.min(60, curves.vac(a)), 5, 50, 'rgba(255,255,255,.6)', 5, 45, [12, 10]);
      plot(g, X, Y, (a) => curves.air(a), 5, 50, '#ffb547', 8, 45);
      g.font = '30px sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('no air', X(8), Y(Math.min(56, curves.vac(8))) - 12);
      g.fillStyle = '#ffb547'; g.fillText('through air (model)', X(34), Y(curves.air(40)) + 44);
      g.strokeStyle = '#5ce1a9'; g.lineWidth = 3; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(X(curves.best), Y(0)); g.lineTo(X(curves.best), Y(curves.air(curves.best))); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#5ce1a9'; g.fillText('best ' + curves.best.toFixed(0) + '°', X(curves.best) + 8, Y(0) - 12);
      marker(g, X(sNow.angle), Y(cur.far.r), cur.far.r.toFixed(1) + ' m', '#ffffff', w);
    }, [12.4, 8.3, -3.2]);
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [6.5, 5.2, 0], [-0.8, 0.28, 0.62], 30) : mode === 'narrow' ? fitView(stage, [7.5, 6, 0], [0.02, 0.12, 1], 42) : fitView(stage, [6.7, 3.5, 0], [0.02, 0.14, 1], 26.5)));
    let last = '', last2 = '', acc = 0, seed = 1;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const setLine = (line, pts, n) => { const a = line.geometry.attributes.position; for (let i = 0; i < 400; i++) { const k = Math.min(n - 1, i); a.setXYZ(i, pts[k * 3], pts[k * 3 + 1], pts[k * 3 + 2]); } a.needsUpdate = true; if (line.material.isLineDashedMaterial) line.computeLineDistances(); };
    return {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt);
        const mode = frame();
        fitNarrow(stage, [tick[0], tick[2], lbPump, lbVac], -0.12, 0);
        const key = [s.p, s.d, s.angle, s.wind].join();
        if (key !== last) {
          const k2 = [s.p, s.d, s.wind].join();
          last = key; cur = state(s); sNow = s;
          if (k2 !== last2) {
            last2 = k2;
            const nz = cur.nz, dm = cur.D.dMax / 1000, tab = [];
            for (let a = 5; a <= 50; a += 1) tab.push(fly(dm, nz.v, rad(a), H0, { wx: s.wind }).r);
            let bi = 0; tab.forEach((r, i) => { if (r > tab[bi]) bi = i; });
            curves = { air: (a) => { const k = clamp(a - 5, 0, 44.999), i = Math.floor(k); return tab[i] + (tab[i + 1] - tab[i]) * (k - i); }, vac: (a) => flyVacuum(nz.v, rad(a), H0).r, best: 5 + bi };
          }
          setLine(pathLine, cur.path, cur.path.length / 3);
          const vp = [], a = rad(s.angle), v = cur.nz.v; for (let i = 0; i <= 120; i++) { const t = (cur.vac.t * i) / 120; vp.push(v * Math.cos(a) * t, H0 + v * Math.sin(a) * t - 0.5 * GRAV * t * t, 0); }
          setLine(vacLine, vp, 121);
          bd.redraw();
        }
        // emit drops: sizes drawn from the model's distribution (by volume), then flown with drag
        const a = rad(s.angle), v = cur.nz.v, sim = dt * SLOW;
        spr.head.rotation.z = a - rad(25);
        acc += sim * (160 + cur.nz.lpm * 6);
        while (acc >= 1) {
          acc -= 1;
          // invert F by bisection for a random share
          const u = rnd(); let lo = 0.15, hi = cur.D.dMax; for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (cur.D.F(m) < u) lo = m; else hi = m; }
          const d = Math.max(0.25, (lo + hi) / 2), j = (rnd() - 0.5) * 0.03, age = rnd() * sim, jz = (rnd() - 0.5) * 0.02;
          const vx = v * Math.cos(a + j), vy = v * Math.sin(a + j);
          dr.emit(0.12 + vx * age, H0 + 0.07 + vy * age, jz * v * age, vx, vy, jz * v, 6, d / 1000, 0.7 + d * 0.38);
        }
        dr.update(sim, { g: GRAV, floor: 0.02, wx: s.wind, stretch: 1.3 });
        flag.position.x = cur.far.r; lbFar.position.set(cur.far.r, 1.75, 0); lbFar.element.textContent = `Largest drops land at ${cur.far.r.toFixed(1)} m`;
        const vx = Math.min(cur.vac.r, 21.5); lbVac.position.set(vx, Math.max(0.6, H0 + Math.tan(a) * vx - (GRAV * vx * vx) / (2 * v * v * Math.cos(a) ** 2)) + 0.5, 0);
        lbVac.element.textContent = `With no air: ${cur.vac.r.toFixed(0)} m`;
        gauge.element.textContent = `${s.p.toFixed(1)} bar`;
        if (mode === 'tall') bd.place([9.5, 11.2, -1.5], 1.25, -0.91); else bd.place();
        bd.mesh.visible = mode !== 'narrow';
      },
      readout: (s) => {
        const st = state(s), b = bestAngle(st.P, s.d, H0);
        return rows(`Throw ${st.far.r.toFixed(1)} m`, [
          ['Jet speed', st.nz.v.toFixed(1) + ' m/s'],
          ['Flow', st.nz.lpm.toFixed(1) + ' L/min'],
          ['Same push as a tank', st.head.toFixed(0) + ' m up'],
          ['Throw with no air', st.vac.r.toFixed(0) + ' m'],
          ['Largest drops', st.D.dMax.toFixed(1) + ' mm, ' + st.far.t.toFixed(1) + ' s in the air'],
          ['Best angle in still air', b.angle.toFixed(0) + '° (' + b.r.toFixed(1) + ' m)'],
        ], 'A model: each drop flies alone, with the drag of a sphere. ' + (s.p < 1.7 ? 'Below about 1.7 bar an impact sprinkler is under its working range.' : 'Checked against a maker\'s table for 4 to 4.8 mm nozzles.'), 3, 290);
      },
    };
  },
};
