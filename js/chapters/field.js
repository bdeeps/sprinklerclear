// Chapter 4: even watering. A piece from the middle of a large field, drawn at half a scene unit
// to the metre. One sprinkler's footprint is computed by flying every drop size in every compass
// direction through the wind (sprinkler.js: footprint). The map on the ground is the sum of the
// footprints of all the sprinklers on the grid (fieldMap), in millimetres an hour, and
// Christiansen's coefficient of uniformity is worked out from it over one repeating tile.
// Sprinkler: a 4 mm nozzle at 27° on a 0.6 m riser. The drawn jets follow the model's own drop
// paths; the heads turn faster than life (one turn in 8 s) so the eye can follow them.
import { THREE, M, arrow, clamp } from '../kit.js';
import { BAR, nozzle, drops, fly, footprint, radial, fieldMap, throwRadius, SOILS, CELL } from '../sprinkler.js';
import { COL, miniSprinkler, board, panelBg, rampRGB, rampCss, rows, fitNarrow, framer, fitView } from '../parts.js';

const SC = 0.5, SIZE = 36, D_NOZ = 4, ELEV = 27, H0 = 0.6, TOP = 16, NAZ = 16, PER = 18, MAXH = 64, OMEGA = 0.8;
const rad = (a) => (a * Math.PI) / 180;
let cache = { key: '', fp: null, rad: null, R: 0 };
function sprinkler(s) {
  const key = s.p + '|' + s.wind;
  if (cache.key !== key) { const fp = footprint(s.p * BAR, D_NOZ, { elevDeg: ELEV, h0: H0, wind: s.wind, windDir: 0 }); cache = { key, fp, rad: radial(fp), R: throwRadius(s.p * BAR, D_NOZ, ELEV, H0) }; }
  return cache;
}
export function state(s) {
  const c = sprinkler(s), f = fieldMap(c.fp, { space: s.space, tri: s.tri === 'tri', size: SIZE });
  return { ...c, f, soil: SOILS[s.soil] };
}

export default {
  id: 'field',
  short: 'Even watering',
  title: 'Overlap: watering a field evenly',
  subtitle: 'One sprinkler waters a cone, heavy near and light far. Neighbours fill each other in.',
  view: { pos: [0.4, 30, 30], target: [-0.6, 2.2, -2.6] },
  learn: `<p>One sprinkler alone waters badly. Most of its water falls within a few metres, and less and less lands towards the edge of its circle. A crop watered like that would be drowned in the middle and thirsty at the rim.</p>
    <p>The fix is <b>overlap</b>. Sprinklers are set on a grid, close enough that each one throws water almost to the feet of its neighbours. Where one is fading out, the next is strong, and the sums come out nearly level. A common rule is to space them at about <b>half the wetted diameter</b>, closer still where it is windy.</p>
    <p>How level? In 1942 the engineer <b>J. E. Christiansen</b> gave farmers a number for it. Set out cans on a grid, run the sprinklers, and measure the depth in each. His <b>coefficient of uniformity</b> is CU = 100 × (1 − average miss ÷ average depth), where a can's miss is how far it is from the average. If every can holds the same, CU is 100%. Guidance from the US soil service asks for at least 75% on field crops and 85% on shallow-rooted or high-value ones.</p>
    <p><b>Pressure</b> matters as much as spacing. Too little, and the jet does not break up: big drops fly to the rim and leave a <b>doughnut</b> with a dry middle. Too much, and the jet shatters into mist that falls close in and drifts away on the wind. <b>Wind</b> bends every pattern and steals the fine drops.</p>
    <p>Last, the <b>soil</b> has a say. Sand can drink 30 mm an hour, clay only 1 to 5. Put water on faster than the soil soaks it in and it ponds and runs off.</p>
    <p class="tip"><b>Try it:</b> stretch the spacing until dry patches appear and watch CU fall. Then drop the pressure to 1 bar and find the doughnuts.</p>`,
  terms: [
    { t: 'Overlap', d: 'Setting sprinklers close enough that their wetted circles cover each other.' },
    { t: 'Coefficient of uniformity (CU)', d: 'Christiansen\'s score for evenness: 100 × (1 − average miss ÷ average depth). 100% is perfectly even.' },
    { t: 'Application rate', d: 'How fast water is put on the ground, in millimetres an hour. 1 mm is 1 litre on every square metre.' },
    { t: 'Intake rate', d: 'How fast a soil can soak water in. Sand is fast, clay is slow.' },
    { t: 'Wetted diameter', d: 'The width of the circle one sprinkler waters: twice its radius of throw.' },
  ],
  defaults: { space: 12, tri: 'sq', p: 3, wind: 0, soil: 'loam' },
  controls: [
    { key: 'space', type: 'range', label: 'Spacing between sprinklers', min: 6, max: 22, step: 1, fmt: (v, s) => v.toFixed(0) + ' m (' + Math.round((100 * v) / (2 * sprinkler(s).R)) + '% of the wetted width)' },
    { key: 'tri', type: 'seg', label: 'Layout', options: [{ v: 'sq', label: 'Square' }, { v: 'tri', label: 'Triangular' }] },
    { key: 'p', type: 'range', label: 'Pressure at the sprinklers', min: 1, max: 5, step: 0.25, fmt: (v) => v.toFixed(2) + ' bar' },
    { key: 'wind', type: 'range', label: 'Wind', min: 0, max: 6, step: 0.5, fmt: (v) => (v < 0.05 ? 'calm' : v.toFixed(1) + ' m/s (' + Math.round(v * 3.6) + ' km/h)') },
    { key: 'soil', type: 'seg', label: 'Soil', options: [{ v: 'sand', label: 'Sand' }, { v: 'loam', label: 'Loam' }, { v: 'clayloam', label: 'Clay loam' }, { v: 'clay', label: 'Clay' }], fmt: (v) => 'soaks in ' + SOILS[v].range + ' mm/h' },
  ],
  quiz: [
    { q: 'Why are sprinklers placed so close that their circles overlap?', options: ['To use more water', 'Because one sprinkler puts down less and less water towards its rim, and its neighbours fill that in', 'To make the pipes shorter', 'So they can share one nozzle'], answer: 1, why: 'A single sprinkler waters a cone: heavy near, light far. Overlapping cones add up to a nearly level sheet.' },
    { q: 'Cans across a field all catch exactly the same depth. What is Christiansen\'s CU?', options: ['0%', '50%', '100%', 'It cannot be worked out'], answer: 2, why: 'CU = 100 × (1 − average miss ÷ average depth). If no can misses the average, CU is 100%.' },
    { q: 'What happens when the pressure is far too low?', options: ['A fine mist forms', 'The jet stays in big drops that land in a ring, leaving a doughnut with a dry middle', 'Nothing changes', 'The sprinkler turns faster'], answer: 1, why: 'Without enough pressure the jet does not break up. Big drops all fly about the same distance and land in a ring.' },
  ],
  reel: [
    { ms: 5600, caption: 'One sprinkler waters a cone: heavy near, light far. So sprinklers overlap to fill each other in.', set: { tri: 'sq', p: 3, wind: 0, soil: 'loam' }, anim: { space: [22, 12] }, spin: 0 },
    { ms: 5400, caption: 'Christiansen\'s 1942 score, CU, measures the evenness. Too little pressure leaves dry doughnuts.', set: { space: 12, tri: 'sq', wind: 0 }, anim: { p: [3, 1] }, spin: 0 },
  ],

  build({ stage }) {
    const G = new THREE.Group(); G.scale.setScalar(SC); stage.root.add(G);
    // the map on the ground
    const small = document.createElement('canvas'), N = Math.round(SIZE / CELL); small.width = small.height = N;
    const sg = small.getContext('2d'), img = sg.createImageData(N, N);
    const big = document.createElement('canvas'); big.width = big.height = 432; const bg = big.getContext('2d');
    const tex = new THREE.CanvasTexture(big); tex.colorSpace = THREE.SRGBColorSpace;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); ground.rotation.x = -Math.PI / 2; ground.position.y = 0.02; G.add(ground);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(SIZE + 1.2, 0.3, SIZE + 1.2), M.matte(0x2a211a)); rim.position.y = -0.16; G.add(rim);
    // sprinklers and their jets
    const heads = []; for (let i = 0; i < MAXH; i++) { const h = miniSprinkler(H0, 3.2); h.visible = false; G.add(h); heads.push(h); }
    const jets = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: COL.spray, toneMapped: false, transparent: true, opacity: 0.85 }), MAXH * PER);
    jets.instanceMatrix.setUsage(THREE.DynamicDrawUsage); jets.frustumCulled = false; G.add(jets);
    const o = new THREE.Object3D(), fr = (v) => v - Math.floor(v);
    // wind arrow
    const wa = arrow(0xffffff, 6, 1.4, 0.16); wa.rotation.z = -Math.PI / 2; wa.position.set(-SIZE / 2, 5.5, -SIZE / 2 - 1); G.add(wa);
    const lbWind = stage.label('', [-SIZE / 2 + 3, 7.2, -SIZE / 2 - 1], G), lbTile = stage.label('CU is measured on this tile', [0, 0.6, 0], G);
    const tile = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), new THREE.LineBasicMaterial({ color: 0xffffff })); tile.rotation.x = -Math.PI / 2; tile.position.y = 0.08; G.add(tile);
    // the board: the score, the colour key and one sprinkler's pattern
    let cur = null, sNow = null;
    const score = board(G, 17, 9.2, 680, 368, (g, w, h) => {
      panelBg(g, w, h); if (!cur) return;
      const cu = cur.f.cu, col = cu >= 85 ? '#5ce1a9' : cu >= 75 ? '#ffb547' : '#ff6a6a';
      g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '32px sans-serif'; g.fillText('Uniformity (Christiansen\'s CU)', 34, 54);
      g.fillStyle = col; g.font = 'bold 150px sans-serif'; g.fillText(cu.toFixed(0) + '%', 30, 200);
      g.font = '30px sans-serif'; g.fillStyle = col; g.fillText(cu >= 85 ? 'even enough for any crop' : cu >= 75 ? 'fair: fine for deep-rooted field crops' : 'patchy: dry spots and wasted water', 34, 256);
      g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(`sprinklers ${sNow.space} m apart at ${sNow.p.toFixed(1)} bar`, 34, 304);
      g.fillText(`average ${cur.f.mean.toFixed(1)} mm/h, driest ${cur.f.min.toFixed(1)}, wettest ${cur.f.max.toFixed(1)}`, 34, 346);
    }, [-9, 8.6, -SIZE / 2 - 2.5], 0, -0.12);
    const bd = board(G, 21, 15.3, 680, 496, (g, w, h) => {
      panelBg(g, w, h); if (!cur) return;
      // one sprinkler's radial pattern
      const x0 = 110, x1 = w - 40, y0 = 86, y1 = 300, X = (r) => x0 + ((x1 - x0) * r) / 20, Y = (v) => y1 - ((y1 - y0) * clamp(v, 0, 12)) / 12;
      g.fillStyle = '#e8eef8'; g.font = 'bold 36px sans-serif'; g.fillText('One sprinkler alone', 26, 48);
      g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, y1); g.lineTo(x1, y1); g.stroke();
      g.font = '26px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)'; g.textAlign = 'center'; [0, 5, 10, 15, 20].forEach((r) => g.fillText(r + (r === 20 ? ' m' : ''), X(r), y1 + 32));
      g.textAlign = 'right'; [0, 6, 12].forEach((v) => g.fillText(String(v), x0 - 10, Y(v) + 10)); g.textAlign = 'left'; g.fillText('mm/h', x0 + 8, y0 + 14);
      g.beginPath(); g.moveTo(X(0), Y(0));
      for (let k = 0; k <= 40; k++) g.lineTo(X(k * CELL), Y(cur.rad[k]));
      g.lineTo(X(20), Y(0)); g.closePath(); g.fillStyle = 'rgba(79,195,255,.35)'; g.fill(); g.strokeStyle = '#4fc3ff'; g.lineWidth = 5; g.stroke();
      g.strokeStyle = '#ffb547'; g.lineWidth = 4; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(X(sNow.space), y0); g.lineTo(X(sNow.space), y1); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ffb547'; g.fillText('its neighbour', Math.min(X(sNow.space) + 8, x1 - 160), y0 + 44);
      // colour key for the map
      for (let i = 0; i < 480; i++) { g.fillStyle = rampCss(i / 480); g.fillRect(110 + i, 384, 1.5, 34); }
      g.fillStyle = 'rgba(255,255,255,.75)'; g.textAlign = 'center'; [0, 4, 8, 12, 16].forEach((v) => g.fillText(String(v), 110 + (480 * v) / TOP, 450)); g.textAlign = 'left'; g.fillText('map: millimetres an hour', 110, 484);
    }, [9, 11.5, -SIZE / 2 - 2.5], 0, -0.12);
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [0, 2, 5], [0.02, 0.95, 1], 49) : mode === 'narrow' ? fitView(stage, [0, 2.6, -1], [0.03, 0.95, 1], 50) : fitView(stage, [-0.4, 2.6, -2.2], [0.03, 0.85, 1], 39)));
    let last = '', T = 0, paths = null, pkey = '';
    const draw = () => {
      const m = cur.f.m, c = [0, 0, 0];
      for (let i = 0; i < N * N; i++) { rampRGB(m[i] / TOP, c); img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255; }
      sg.putImageData(img, 0, 0); bg.imageSmoothingEnabled = true; bg.drawImage(small, 0, 0, 432, 432); tex.needsUpdate = true;
    };
    return {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt); T += dt;
        const mode = frame();
        fitNarrow(stage, [lbTile], -0.1, 0);
        const key = [s.space, s.tri, s.p, s.wind].join();
        if (key !== last) {
          last = key; cur = state(s); sNow = s; draw(); bd.redraw(); score.redraw();
          heads.forEach((h, i) => { const p = cur.f.heads[i]; h.visible = !!p; if (p) h.position.set(p[0], 0, p[1]); });
          const tw = s.space, th = s.tri === 'tri' ? 2 * s.space : s.space; tile.scale.set(tw, th, 1); tile.position.set(tw / 2, 0.08, th / 2); lbTile.position.set(tw / 2, 1.2, th + 1);
          tile.visible = tw <= SIZE / 2 && th <= SIZE / 2; lbTile.visible = lbTile.visible && tile.visible;
        }
        // drop paths for the drawn jets: the largest and the middle drop, from 16 compass directions
        const pk = s.p + '|' + s.wind;
        if (pk !== pkey) {
          pkey = pk; const nz = nozzle(s.p * BAR, D_NOZ), D = drops(s.p * BAR, D_NOZ); paths = [];
          for (const d of [D.dMax, D.d50]) for (let a = 0; a < NAZ; a++) { const path = []; const r = fly(d / 1000, nz.v, rad(ELEV), H0, { az: (a / NAZ) * Math.PI * 2, wx: s.wind, dt: 0.05, path }); paths.push({ path, t: r.t, n: path.length / 3 }); }
        }
        const nh = Math.min(MAXH, cur.f.heads.length);
        let q = 0;
        for (let i = 0; i < nh; i++) {
          const hp = cur.f.heads[i], ph = fr(i * 0.6180339887) * Math.PI * 2;
          heads[i].head.rotation.y = -(OMEGA * T + ph);
          for (let k = 0; k < PER; k++) {
            const cls = k % 3 === 2 ? 1 : 0, age0 = fr(k / PER + i * 0.37 + T / 1.6);
            // which way the head pointed when this drop left
            const tFl = paths[cls * NAZ].t, age = age0 * tFl, th = OMEGA * (T - age) + ph, ai = ((Math.round((th / (Math.PI * 2)) * NAZ) % NAZ) + NAZ) % NAZ, P = paths[cls * NAZ + ai];
            const f = Math.min(P.n - 1.001, (age / P.t) * (P.n - 1)), j = Math.floor(f), u = f - j, pa = P.path;
            // turn the stored path by the small angle between the true direction and the stored one
            const da = th - (ai / NAZ) * Math.PI * 2, cx = Math.cos(da), sx = Math.sin(da);
            const x = pa[j * 3] + (pa[j * 3 + 3] - pa[j * 3]) * u, y = pa[j * 3 + 1] + (pa[j * 3 + 4] - pa[j * 3 + 1]) * u, z = pa[j * 3 + 2] + (pa[j * 3 + 5] - pa[j * 3 + 2]) * u;
            o.position.set(hp[0] + x * cx - z * sx, y, hp[1] + x * sx + z * cx); o.scale.setScalar(cls ? 0.1 : 0.14); o.updateMatrix(); jets.setMatrixAt(q++, o.matrix);
          }
        }
        o.position.set(0, -1e5, 0); o.scale.setScalar(1e-4); o.updateMatrix(); for (; q < MAXH * PER; q++) jets.setMatrixAt(q, o.matrix);
        jets.instanceMatrix.needsUpdate = true;
        wa.set(2 + s.wind * 1.4); wa.visible = s.wind > 0.05; lbWind.visible = wa.visible && mode !== 'narrow'; lbWind.element.textContent = `Wind ${s.wind.toFixed(1)} m/s`;
        if (mode === 'tall') { bd.place([0, 5.4, SIZE / 2 + 17], 1.15, 0, -0.95); score.place([0, 9, -SIZE / 2 - 5], 1.6, 0, -0.5); } else { bd.place(); score.place(); }
        bd.mesh.visible = mode !== 'narrow'; score.mesh.visible = mode === 'tall';
      },
      readout: (s) => {
        const st = state(s), f = st.f, soil = st.soil, pond = f.max > soil.intake, wet = f.mean > soil.intake;
        return rows(`CU ${f.cu.toFixed(0)}%`, [
          ['Average rate', f.mean.toFixed(1) + ' mm/h'],
          ['Driest to wettest spot', f.min.toFixed(1) + ' to ' + f.max.toFixed(1) + ' mm/h'],
          ['Each sprinkler', st.fp.nz.lpm.toFixed(1) + ' L/min, throws ' + st.R.toFixed(1) + ' m'],
          ['Time to put on 25 mm', f.mean > 0.05 ? (25 / f.mean).toFixed(1) + ' h' : 'never'],
          [soil.name + ' soaks in', 'about ' + soil.intake + ' mm/h', wet ? 'no' : pond ? '' : 'ok'],
          ['Water in drops under 1 mm', Math.round(st.fp.fine * 100) + '%'],
        ], wet ? 'Water arrives faster than this soil can drink: it ponds and runs off.' : pond ? 'The wettest spots get water faster than this soil can drink.' : s.p < 1.7 ? 'Pressure too low: the jets do not break up, and each sprinkler leaves a ring.' : s.wind >= 4 ? 'Strong wind: farmers move sprinklers closer, or water at night when it drops.' : 'CU of 75% suits field crops; 85% is asked for shallow-rooted or high-value crops.', 3, 300);
      },
    };
  },
};
