// Chapter 5: the farm. Three ways to water the same crop, side by side: flooding a border strip,
// a line of sprinklers, and drip lines. The 3D strips are an illustration (each 10 m by 26 m,
// half a scene unit to the metre); the numbers are a water budget:
//   water to pump = what the crop needs ÷ field application efficiency   (sprinkler.js: waterBudget)
// with 1 mm over 1 hectare = 10,000 litres. The efficiency slider is yours to move; it starts at
// FAO's indicative figure for each method (60, 75, 90%), and the chart marks the range the Indian
// Council of Agricultural Research gives for flood and for micro-irrigation (sprinkler.js: METHODS).
// The soil faces at the front are sketches of where the water goes, not computed.
import { THREE, M, clamp } from '../kit.js';
import { METHODS, waterBudget, pivot } from '../sprinkler.js';
import { COL, boxAt, cylY, miniSprinkler, board, panelBg, rows, fitNarrow, framer, fitView, fmt } from '../parts.js';

const SC = 0.5, W = 10, L = 26, GAP = 2.4, DEPTH = 5, ORDER = ['flood', 'sprinkler', 'drip'];
const cx = (i) => (i - 1) * (W + GAP);
const litres = (v) => (v >= 1e5 ? (v / 1e5).toFixed(2) + ' lakh L' : Math.round(v).toLocaleString('en-IN') + ' L');

function soilFace(kind) {
  const c = document.createElement('canvas'); c.width = 500; c.height = 250; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 250); gr.addColorStop(0, '#6b4a32'); gr.addColorStop(1, '#4a3324'); g.fillStyle = gr; g.fillRect(0, 0, 500, 250);
  const root = 110;
  g.fillStyle = 'rgba(79,195,255,.62)';
  if (kind === 'flood') { g.beginPath(); g.moveTo(0, 0); g.lineTo(500, 0); g.lineTo(500, 205); g.quadraticCurveTo(250, 245, 0, 215); g.closePath(); g.fill(); }
  if (kind === 'sprinkler') { g.beginPath(); g.moveTo(0, 0); g.lineTo(500, 0); g.lineTo(500, 122); for (let x = 500; x >= 0; x -= 50) g.lineTo(x, 124 + 14 * Math.sin(x * 0.045)); g.closePath(); g.fill(); }
  if (kind === 'drip') for (let i = 0; i < 5; i++) { const x = 50 + i * 100; g.beginPath(); g.ellipse(x, 52, 36, 62, 0, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = '#fff'; g.setLineDash([12, 9]); g.lineWidth = 3; g.beginPath(); g.moveTo(0, root); g.lineTo(500, root); g.stroke(); g.setLineDash([]);
  g.font = 'bold 30px sans-serif'; g.fillStyle = '#fff'; g.fillText('root depth', 12, root + 32);
  g.fillText(kind === 'flood' ? 'much sinks past the roots' : kind === 'sprinkler' ? 'wet to about root depth' : 'wet only at each plant', 12, 236);
  // roots
  g.strokeStyle = 'rgba(230,240,200,.8)'; g.lineWidth = 2;
  for (let i = 0; i < 5; i++) { const x = 50 + i * 100; for (const d of [-16, 0, 16]) { g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + d, 50, x + d * 1.6, root - 12); g.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export default {
  id: 'farm',
  short: 'Flood, sprinkler, drip',
  title: 'On the farm: flood, sprinkler or drip',
  subtitle: 'The crop needs the same water each way. What changes is how much you must pump.',
  view: { pos: [1.9, 26.4, 35.3], target: [-1.4, 3.2, 2.2] },
  onChange(s, key) { if (key === 'method' || key === null) s.eff = METHODS[s.method].fao; },
  learn: `<p>A crop does not care how its water arrives. It needs a certain depth each day, a few millimetres, down where its roots are. The question for the farmer is how much water must be <b>pumped</b> to get that much to the roots. The share that gets there is the <b>field application efficiency</b>.</p>
    <p><b>Flood irrigation</b> lets water run down the field as a sheet. It is cheap and needs no pressure, but the top of the field soaks for longest and much of the water sinks below the roots or runs off the far end. The UN's Food and Agriculture Organization (FAO) uses 60% as a guide for well-run surface irrigation. India's farm research council, ICAR, puts ordinary flood irrigation at only 30 to 50%.</p>
    <p><b>Sprinklers</b> rain the water on evenly, so less is wasted in the soil. Their losses are in the air: wind drift, evaporation and uneven overlap. FAO's guide figure is 75%. Portable sets of aluminium or plastic pipes with impact sprinklers are a common sight in states such as Rajasthan, Haryana and Madhya Pradesh. Big <b>rain guns</b> throw 30 metres and more, and <b>centre pivots</b>, a pipe on wheeled towers circling a well, draw the green circles you see from a plane: a 400 m pivot waters 50 hectares.</p>
    <p><b>Drip irrigation</b> skips the air altogether. Thin pipes run along the rows and let water out drop by drop at each plant, so little wets bare soil. FAO's guide is 90%, and ICAR gives 80 to 95% for micro-irrigation. Fertiliser can ride in with the water, which is called <b>fertigation</b>. Drip costs more and suits crops in rows.</p>
    <p>These are guide figures, not promises: a well-levelled flooded field can beat a badly run sprinkler set. But the gap is why India's <b>Per Drop More Crop</b> scheme pays 45 to 55% of the cost of drip and sprinkler systems. By July 2026 it had covered over 115 lakh hectares. It matters most where the water is pumped from the ground: see <a href="https://glassbox.how/droughtclear/">DroughtClear</a>.</p>
    <p class="tip"><b>Try it:</b> pick Flood, then drag the efficiency down to 35%, the lower end of ICAR's range. Compare the litres with Drip.</p>`,
  terms: [
    { t: 'Field application efficiency', d: 'Of the water put on a field, the share that ends up stored where the roots can use it.' },
    { t: 'Flood (surface) irrigation', d: 'Letting water flow over the soil in a sheet or along furrows.' },
    { t: 'Drip irrigation', d: 'Pipes along the crop rows that release water slowly at each plant.' },
    { t: 'Centre pivot', d: 'A long sprinkler pipe on wheeled towers that turns about a fixed point, watering a circle.' },
    { t: 'Fertigation', d: 'Feeding fertiliser to plants by dissolving it in the irrigation water.' },
  ],
  defaults: { method: 'flood', eff: 60, need: 5, ha: 1 },
  controls: [
    { key: 'method', type: 'seg', label: 'How the water is put on', options: [{ v: 'flood', label: 'Flood' }, { v: 'sprinkler', label: 'Sprinkler' }, { v: 'drip', label: 'Drip' }], fmt: (v) => 'FAO guide ' + METHODS[v].fao + '%' },
    { key: 'eff', type: 'range', label: 'Field application efficiency', min: 30, max: 95, step: 1, fmt: (v) => v.toFixed(0) + '%', hint: 'Starts at FAO\'s guide figure. ICAR: flood 30 to 50%, micro-irrigation 80 to 95%.' },
    { key: 'need', type: 'range', label: 'Water the crop uses', min: 2, max: 9, step: 0.5, fmt: (v) => v.toFixed(1) + ' mm a day' },
    { key: 'ha', type: 'range', label: 'Size of the field', min: 0.5, max: 10, step: 0.5, fmt: (v) => v.toFixed(1) + ' hectares' },
  ],
  quiz: [
    { q: 'A crop needs 50,000 litres a day and the field application efficiency is 50%. How much must be pumped?', options: ['25,000 litres', '50,000 litres', '75,000 litres', '100,000 litres'], answer: 3, why: 'Water to pump = need ÷ efficiency. 50,000 ÷ 0.5 = 100,000 litres. Half of it never reaches the roots.' },
    { q: 'Where does a sprinkler system lose most of its water?', options: ['Deep below the roots', 'In the air: wind drift and evaporation, plus uneven overlap', 'Inside the pump', 'It loses none'], answer: 1, why: 'Sprinklers wet the soil quite evenly, so less sinks too deep. Their losses happen before the drops land, and where patterns do not overlap well.' },
    { q: 'Why does drip irrigation waste so little?', options: ['It uses colder water', 'It puts water only at each plant, slowly, so little wets bare soil or blows away', 'It uses bigger pipes', 'It runs at high pressure'], answer: 1, why: 'Drip wets a small bulb of soil at each plant. Nothing flies through the air and the gaps between rows stay dry.' },
  ],
  reel: [
    { ms: 5400, caption: 'Flood irrigation gets 30 to 60 percent of the water to the roots. Sprinklers about 75, drip about 90.', set: { need: 5, ha: 1 }, anim: { method: ['flood', 'drip'] }, spin: 0 },
  ],

  build({ stage }) {
    const G = new THREE.Group(); G.scale.setScalar(SC); G.position.y = DEPTH * SC; stage.root.add(G);
    const strips = ORDER.map((kind, i) => {
      const g = new THREE.Group(); g.position.x = cx(i); G.add(g);
      const top = boxAt(W, 0.2, L, 0, -0.1, 0, M.matte(kind === 'drip' ? 0x6d4d35 : 0x5a3f2c)); g.add(top);
      const slab = boxAt(W, DEPTH, L, 0, -DEPTH / 2 - 0.2, 0, M.matte(0x4a3324)); g.add(slab);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(W, DEPTH), new THREE.MeshBasicMaterial({ map: soilFace(kind), toneMapped: false })); face.position.set(0, -DEPTH / 2 - 0.2, L / 2 + 0.03); g.add(face);
      const frameBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W + 0.5, 0.5, L + 0.5)), new THREE.LineBasicMaterial({ color: 0xffb547 })); frameBox.position.y = 0.1; g.add(frameBox);
      return { g, kind, frameBox, lb: stage.label('', [0, 4.6, -L / 2], g) };
    });
    // crops
    const NP = 5 * 13 * 3, plants = new THREE.InstancedMesh(new THREE.ConeGeometry(0.42, 1.1, 7), M.matte(0x3f9a4c), NP), o = new THREE.Object3D();
    let q = 0; for (let i = 0; i < 3; i++) for (let r = 0; r < 5; r++) for (let k = 0; k < 13; k++) { o.position.set(cx(i) - 4 + r * 2, 0.55, -12 + k * 2); o.updateMatrix(); plants.setMatrixAt(q++, o.matrix); }
    plants.castShadow = true; G.add(plants);
    // flood: a head channel and a sheet of water that creeps down the strip
    const F = strips[0].g;
    F.add(boxAt(W, 0.5, 1.2, 0, 0.15, -L / 2 - 0.8, M.matte(0x3a3f49)));
    const chan = boxAt(W - 0.6, 0.1, 0.8, 0, 0.42, -L / 2 - 0.8, new THREE.MeshBasicMaterial({ color: COL.water, toneMapped: false })); F.add(chan);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, 1), new THREE.MeshBasicMaterial({ color: COL.water, transparent: true, opacity: 0.6, toneMapped: false, depthWrite: false })); sheet.rotation.x = -Math.PI / 2; sheet.position.y = 0.12; F.add(sheet);
    // sprinklers: a lateral with three heads
    const Sg = strips[1].g;
    const lat = cylY(0.09, -L / 2, L / 2, M.plastic(0xdfe3ea), 10); lat.rotation.x = Math.PI / 2; lat.position.set(1, 0.12, 0); Sg.add(lat);
    const sh = [-8.6, 0, 8.6].map((z) => { const m = miniSprinkler(1.2, 3); m.position.set(1, 0, z); Sg.add(m); return m; });
    const NJ = 3 * 26, jets = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 4), new THREE.MeshBasicMaterial({ color: COL.spray, toneMapped: false }), NJ); jets.instanceMatrix.setUsage(THREE.DynamicDrawUsage); jets.frustumCulled = false; Sg.add(jets);
    // drip: a line along every row and a drop at every plant
    const Dg = strips[2].g;
    for (let r = 0; r < 5; r++) { const t = cylY(0.07, -L / 2, L / 2, M.plastic(0x15171c), 8); t.rotation.x = Math.PI / 2; t.position.set(-4 + r * 2 + 0.45, 0.1, 0); Dg.add(t); }
    Dg.add(boxAt(W, 0.16, 0.16, 0, 0.1, -L / 2 + 0.2, M.plastic(0x15171c)));
    const ND = 65, dripDrops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: COL.water, toneMapped: false }), ND); dripDrops.instanceMatrix.setUsage(THREE.DynamicDrawUsage); Dg.add(dripDrops);
    const wet = new THREE.InstancedMesh(new THREE.CircleGeometry(0.5, 12), new THREE.MeshBasicMaterial({ color: 0x3a2a1e }), ND); q = 0;
    for (let r = 0; r < 5; r++) for (let k = 0; k < 13; k++) { o.position.set(-4 + r * 2 + 0.45, 0.02, -12 + k * 2); o.rotation.set(-Math.PI / 2, 0, 0); o.scale.setScalar(1); o.updateMatrix(); wet.setMatrixAt(q++, o.matrix); }
    o.rotation.set(0, 0, 0); Dg.add(wet);
    // the chart
    let sNow = null;
    const bd = board(G, 33, 11.5, 1320, 460, (g, w, h) => {
      panelBg(g, w, h); if (!sNow) return;
      g.fillStyle = '#e8eef8'; g.font = 'bold 38px sans-serif'; g.fillText('Of every 100 litres put on the field, how many reach the roots', 30, 52);
      const x0 = 250, x1 = w - 330, X = (v) => x0 + ((x1 - x0) * v) / 100;
      g.font = '26px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.textAlign = 'center'; [0, 25, 50, 75, 100].forEach((v) => { g.fillText(String(v), X(v), 444); g.fillRect(X(v), 84, 1.5, 330); }); g.textAlign = 'left';
      ORDER.forEach((k, i) => {
        const m = METHODS[k], y = 110 + i * 106, on = k === sNow.method, e = on ? sNow.eff : m.fao;
        g.globalAlpha = on ? 1 : 0.55;
        g.fillStyle = '#e8eef8'; g.font = (on ? 'bold ' : '') + '34px sans-serif'; g.fillText(m.name, 30, y + 44);
        g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x0, y, x1 - x0, 62);
        g.fillStyle = on ? '#4fc3ff' : '#3b86b3'; g.fillRect(x0, y, X(e) - x0, 62);
        if (m.lo !== null) { g.strokeStyle = '#5ce1a9'; g.lineWidth = 5; g.strokeRect(X(m.lo), y - 7, X(m.hi) - X(m.lo), 76); }
        g.fillStyle = '#ffb547'; g.fillRect(X(m.fao) - 3, y - 12, 6, 86);
        g.fillStyle = '#fff'; g.font = 'bold 34px sans-serif'; g.fillText(e.toFixed(0) + ' reach the roots', x1 + 16, y + 30);
        g.font = '26px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(litres(waterBudget(sNow.need, e, sNow.ha).gross) + ' a day', x1 + 16, y + 62);
        g.globalAlpha = 1;
      });
      g.font = '24px sans-serif'; g.fillStyle = '#ffb547'; g.fillText('▍FAO guide', 30, 444); g.fillStyle = '#5ce1a9'; g.fillText('▢ ICAR range', x1 + 60, 444);
    }, [0, -1.3, L / 2 + 8.5], 0, -0.95);
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [0, 1.5, 4.5], [0.06, 0.8, 1], 47) : mode === 'narrow' ? fitView(stage, [0, 3, 0], [0.1, 0.6, 1], 56) : fitView(stage, [-5.6, 0.4, 6.5], [0.1, 0.7, 1], 49)));
    let T = 0, last = '';
    const fr = (v) => v - Math.floor(v);
    return {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt); T += dt; sNow = s;
        const mode = frame();
        fitNarrow(stage, [], -0.1, 0.08);
        strips.forEach((st) => { const on = st.kind === s.method; st.frameBox.visible = on; st.lb.element.textContent = METHODS[st.kind].name + (on ? ': ' + s.eff.toFixed(0) + '%' : ''); st.lb.element.className = 'lbl' + (on ? ' hot' : ''); });
        // flood: the sheet advances for 9 s, stands, then soaks away
        const u = fr(T / 14), adv = clamp(u / 0.62, 0, 1), fade = u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1, len = Math.max(0.01, adv * L);
        sheet.scale.set(1, len, 1); sheet.position.z = -L / 2 + len / 2; sheet.material.opacity = 0.6 * fade;
        // sprinklers: drops on simple arcs (an illustration: 5.5 m throw)
        let k = 0;
        sh.forEach((m, i) => {
          const th = T * 1.1 + i * 2.1; m.head.rotation.y = -th;
          for (let j = 0; j < 26; j++) { const a = fr(j / 26 + T * 0.9), t = a * 1.1, az = th - t * 1.1 + (j % 2 ? Math.PI : 0), v = 6.2; o.position.set(1 + Math.cos(az) * v * 0.82 * t, 1.25 + v * 0.57 * t - 4.905 * t * t, m.position.z + Math.sin(az) * v * 0.82 * t); o.scale.setScalar(o.position.y < 0 ? 1e-4 : 1); o.updateMatrix(); jets.setMatrixAt(k++, o.matrix); }
        });
        jets.instanceMatrix.needsUpdate = true;
        // drip: one drop falls at each emitter, out of step with its neighbours
        k = 0; for (let r = 0; r < 5; r++) for (let j = 0; j < 13; j++) { const a = fr(T * 0.7 + (r * 13 + j) * 0.381); o.position.set(-4 + r * 2 + 0.45, 0.1 - 0.02 * a, -12 + j * 2); o.scale.setScalar(a < 0.5 ? 0.4 + a * 1.2 : 1e-4); o.updateMatrix(); dripDrops.setMatrixAt(k++, o.matrix); }
        dripDrops.instanceMatrix.needsUpdate = true;
        const key = [s.method, s.eff, s.need, s.ha].join();
        if (key !== last) { last = key; bd.redraw(); }
        bd.mesh.visible = mode !== 'narrow';
      },
      readout: (s) => {
        const b = waterBudget(s.need, s.eff, s.ha), m = METHODS[s.method], drip = waterBudget(s.need, METHODS.drip.fao, s.ha), pv = pivot(400, 24, 8);
        return rows(litres(b.gross) + ' a day', [
          ['The crop uses', litres(b.net)],
          ['Never reaches the roots', litres(b.lost), b.lost > b.net ? 'no' : ''],
          [m.name + ': FAO guide', m.fao + '%'],
          ['ICAR range', m.lo === null ? 'none given' : m.lo + ' to ' + m.hi + '%'],
          ['Drip at 90% would pump', litres(drip.gross)],
          ['A 400 m centre pivot waters', pv.ha.toFixed(0) + ' hectares'],
        ], `${s.need.toFixed(1)} mm a day on ${s.ha.toFixed(1)} ha. 1 mm on 1 hectare is 10,000 litres.`, 3, 300);
      },
    };
  },
};
