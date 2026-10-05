// Chapter 6: the fire sprinkler, a different machine with the same name. Drawn in metres.
// A room about 11 m square with nine pendent heads on a 3.6 m grid under the ceiling. A fire
// grows as Q = α·t² (sprinkler.js: GROWTH). The hot ceiling jet's temperature and speed at each
// head come from Alpert's correlations (ceilingJet), and each head's glass bulb warms with the
// lag set by its Response Time Index: dT/dt = √U·(Tgas − Tbulb)/RTI. A bulb bursts when it
// reaches its rated temperature, and only then does that head spray.
// Assumptions, stated: the room starts at 30 °C; once the first head opens the fire stops
// growing, and 8 s later it dies away with a time constant of 30 s (real sprinklers control or
// put out the fire; how fast depends on the fuel). Cooling of the hot gas by the spray is ignored.
// The clock runs 12 times faster than life. The large head on the right is the one nearest the
// fire, enlarged about 30 times.
import { THREE, M, clamp, tube } from '../kit.js';
import { ceilingJet, GROWTH, RESPONSE, BULBS } from '../sprinkler.js';
import { COL, boxAt, cylY, board, axes, rows, fitNarrow, framer, fitView, brass } from '../parts.js';

const SP = 3.6, ROOM = 11, AMB = 30, LAPSE = 12, HOLD = 8, DECAY = 30, K80 = 80;
const SPOTS = { under: [0, 0], side: [1.1, 0.5], between: [1.7, 1.5] };
const HEADS = []; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) HEADS.push([i * SP, j * SP]);
const bulbOf = (c) => BULBS.find((b) => b.c === c) || BULBS[1];

export function makeFire() {
  const f = { t: 0, Q: 0, t1: -1, Qhold: 0, Tb: HEADS.map(() => AMB), Tg: HEADS.map(() => AMB), open: HEADS.map(() => -1), near: 4, log: [], lit: false };
  f.reset = (lit = true) => { f.t = 0; f.Q = 0; f.t1 = -1; f.Qhold = 0; f.Tb.fill(AMB); f.Tg.fill(AMB); f.open.fill(-1); f.log = []; f.lit = lit; };
  f.advance = (dt, s) => {
    if (!f.lit) return;
    const spot = SPOTS[s.spot], rti = RESPONSE[s.resp].rti, a = GROWTH[s.grow].a;
    let n = Math.max(1, Math.ceil(dt / 0.1)); const h = dt / n;
    while (n--) {
      f.t += h;
      f.Q = f.t1 < 0 ? a * f.t * f.t : f.Qhold * (f.t - f.t1 < HOLD ? 1 : Math.exp(-(f.t - f.t1 - HOLD) / DECAY));
      let best = 1e9;
      HEADS.forEach((p, i) => {
        const r = Math.hypot(p[0] - spot[0], p[1] - spot[1]), j = ceilingJet(f.Q, s.h, r); if (r < best) { best = r; f.near = i; }
        f.Tg[i] = AMB + j.dT;
        if (f.open[i] < 0) { f.Tb[i] += ((Math.sqrt(j.U) * (f.Tg[i] - f.Tb[i])) / rti) * h; if (f.Tb[i] >= s.bulb) { f.open[i] = f.t; if (f.t1 < 0) { f.t1 = f.t; f.Qhold = f.Q; } } }
      });
      if (!f.log.length || f.t - f.log[f.log.length - 1].t >= 1) f.log.push({ t: f.t, Tb: f.Tb[f.near], Tg: f.Tg[f.near], T2: Math.max(...f.Tb.filter((_, i) => i !== f.near && f.open[i] < 0), AMB), Q: f.Q });
      if (f.t1 > 0 && f.t - f.t1 > 150) f.lit = false;
      if (f.t > 1500) f.lit = false;
    }
  };
  f.count = () => f.open.filter((x) => x >= 0).length;
  return f;
}

export default {
  id: 'fire',
  short: 'The fire sprinkler',
  title: 'The fire sprinkler: same name, different machine',
  subtitle: 'Each head is a sealed valve with its own heat trigger. Only the ones over the fire open.',
  view: { pos: [9.4, 13.1, 27.2], target: [2.3, 1.7, 0] },
  learn: `<p>A fire sprinkler shares a name with the garden kind and almost nothing else. It does not turn, it has no arm, and it may wait fifty years to work once.</p>
    <p>Each head is a <b>valve held shut</b>. In a <b>wet-pipe</b> system, the usual kind, the pipes above the ceiling are always full of water under pressure. A small cap blocks the hole in every head, and a <b>glass bulb</b> the size of a bean props the cap in place. The bulb is filled with a liquid and one small bubble. As the bulb warms, the liquid swells and squeezes the bubble away. At the rated temperature the glass <b>shatters</b>, the cap is pushed out, and water hits the <b>deflector</b>, which spreads it into an umbrella of drops.</p>
    <p>The colour of the liquid tells the temperature: <b>orange 57 °C, red 68 °C</b>, yellow 79 °C, green 93 °C, blue 141 °C. Red and orange are the ordinary ones. Hotter ratings go near ovens, boilers and skylights. Other heads use a <b>fusible link</b>, two plates soldered together, in place of the bulb.</p>
    <p>Here is what films get wrong. Every head has its own trigger and feels only its own heat. <b>Smoke does not set them off, and one head opening does not open the rest.</b> Hot gas from a fire rises, spreads under the ceiling and cools as it goes, so the head above the fire bursts first, and its spray usually holds the fire there. The US National Fire Protection Association counted real fires from 2017 to 2021: where sprinklers operated, <b>one head was enough in 77%</b> of them, and five or fewer in 96%. Only a <b>deluge</b> system, with open heads and a separate valve, soaks everything at once. Those protect places like aircraft hangars.</p>
    <p>In a <b>dry-pipe</b> system, for places that freeze, the pipes hold compressed air. An opening head lets the air out, and that drop in pressure opens a valve to let the water in. In India these systems follow IS 15105, with the heads made to IS 9972.</p>
    <p class="tip"><b>Try it:</b> light the fire under a head and count how many open. Then move the fire between the heads, or raise the ceiling, and try again.</p>`,
  terms: [
    { t: 'Glass bulb', d: 'A small sealed glass capsule of liquid that props a fire sprinkler shut and shatters at a set temperature.' },
    { t: 'Deflector', d: 'The toothed plate under the opening that breaks the stream into a wide umbrella of drops.' },
    { t: 'Wet-pipe system', d: 'Sprinkler pipes kept full of water under pressure, ready at every head.' },
    { t: 'Response Time Index (RTI)', d: 'A measure of how slowly a bulb warms. Thin fast-response bulbs are 50 or less, standard ones 80 or more.' },
    { t: 'Deluge system', d: 'A special system with open heads, where a separate valve releases water from all of them at once.' },
  ],
  defaults: { spot: 'under', bulb: 68, resp: 'quick', grow: 'medium', h: 3 },
  controls: [
    { key: 'go', type: 'buttons', label: 'The fire', items: [{ label: 'Light it again', act: (s, inst) => inst.light() }] },
    { key: 'spot', type: 'seg', label: 'Where the fire starts', options: [{ v: 'under', label: 'Under a head' }, { v: 'side', label: 'A metre aside' }, { v: 'between', label: 'Between heads' }] },
    { key: 'bulb', type: 'seg', label: 'Bulb colour', options: BULBS.map((b) => ({ v: b.c, label: b.name })), fmt: (v) => 'bursts at ' + v + ' °C' },
    { key: 'resp', type: 'seg', label: 'Bulb thickness', options: [{ v: 'quick', label: 'Fast, 3 mm' }, { v: 'standard', label: 'Standard, 5 mm' }], fmt: (v) => 'RTI ' + RESPONSE[v].rti },
    { key: 'grow', type: 'seg', label: 'How fast the fire grows', options: [{ v: 'slow', label: 'Slow' }, { v: 'medium', label: 'Medium' }, { v: 'fast', label: 'Fast' }] },
    { key: 'h', type: 'range', label: 'Ceiling height', min: 2.5, max: 6, step: 0.1, fmt: (v) => v.toFixed(1) + ' m' },
  ],
  quiz: [
    { q: 'A fire starts in one corner of a sprinklered office. What usually happens?', options: ['Every sprinkler in the building goes off', 'Every sprinkler in the room goes off', 'Only the one or two heads nearest the fire open', 'Nothing, until someone pulls a lever'], answer: 2, why: 'Each head has its own heat trigger. NFPA\'s count of real fires found one head was enough in 77% of cases where sprinklers operated.' },
    { q: 'What holds a fire sprinkler shut until it is needed?', options: ['An electric valve', 'A glass bulb of liquid (or a soldered link) that breaks when it gets hot', 'A float', 'The smoke alarm'], answer: 1, why: 'The bulb props a cap over the opening. Heat swells the liquid until the glass shatters, and the water pressure pushes the cap out.' },
    { q: 'A red bulb means the head opens at about:', options: ['30 °C', '68 °C', '141 °C', '500 °C'], answer: 1, why: 'Orange is 57 °C and red is 68 °C: the ordinary ratings. Blue, at 141 °C, is for hot places such as near ovens.' },
  ],
  reel: [
    { ms: 5600, caption: 'A fire sprinkler is different. Each head is a valve held shut by a small glass bulb of liquid.', set: { spot: 'under', bulb: 68, resp: 'quick', grow: 'fast', h: 3 }, act: (s, inst) => inst.light(), spin: 0 },
    { ms: 5800, caption: 'Heat bursts the bulb over the fire, and only that head sprays. Not every head at once, as in films.', set: { spot: 'under', bulb: 68, resp: 'quick', grow: 'fast', h: 3 }, spin: 0 },
  ],

  build({ stage }) {
    const G = new THREE.Group(); stage.root.add(G);
    const fire = makeFire();
    // room: floor, two back walls, ceiling grid and pipes
    G.add(boxAt(ROOM, 0.1, ROOM, 0, -0.05, 0, M.matte(0x2d323c)));
    const wallM = new THREE.MeshStandardMaterial({ color: 0x3a4150, roughness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const wallB = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, 1), wallM), wallL = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, 1), wallM); wallL.rotation.y = Math.PI / 2; G.add(wallB, wallL);
    const ceil = new THREE.Group(); G.add(ceil);
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), new THREE.MeshStandardMaterial({ color: 0x586070, roughness: 0.9, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })); slab.rotation.x = Math.PI / 2; ceil.add(slab);
    const pm = M.metal(0xc23b33, { roughness: 0.5, metalness: 0.4 });
    for (const z of [-SP, 0, SP]) { const p = cylY(0.045, -4.6, 4.2, pm, 10); p.rotation.z = Math.PI / 2; p.position.set(-0.2, -0.12, z); ceil.add(p); }
    const main = cylY(0.07, -SP - 0.2, SP + 0.2, pm, 10); main.rotation.x = Math.PI / 2; main.position.set(-4.8, -0.12, 0); ceil.add(main);
    const riser = cylY(0.07, 0, 1, pm, 10); riser.position.set(-4.8, 0, SP + 0.2); G.add(riser);
    // the nine heads (drawn about four times life size so they can be seen)
    const heads = HEADS.map(([x, z]) => {
      const g = new THREE.Group(); g.position.set(x, -0.12, z);
      g.add(cylY(0.04, -0.14, 0, brass(), 10));
      const bulb = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.1, 4, 8), new THREE.MeshBasicMaterial({ color: 0xe53030, toneMapped: false })); bulb.position.y = -0.22; g.add(bulb);
      const defl = cylY(0.11, -0.32, -0.3, brass(), 16); g.add(defl);
      ceil.add(g); return { g, bulb };
    });
    // flame, smoke and sprays
    const flame = new THREE.Group(); const fm1 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 14), M.glow(0xff7a1a, { transparent: true, opacity: 0.9 })), fm2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 12), M.glow(0xffd24a)); fm1.position.y = 0.5; fm2.position.y = 0.35; flame.add(fm1, fm2); G.add(flame);
    G.add(boxAt(0.9, 0.3, 0.7, 0, 0.15, 0, M.matte(0x3b2a20))); const crate = G.children[G.children.length - 1];
    const NS = 260, smoke = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0xb9bcc4, transparent: true, opacity: 0.16, depthWrite: false }), NS); smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage); smoke.frustumCulled = false; G.add(smoke);
    const NW = 9 * 40, spray = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 5, 4), new THREE.MeshBasicMaterial({ color: COL.spray, toneMapped: false }), NW); spray.instanceMatrix.setUsage(THREE.DynamicDrawUsage); spray.frustumCulled = false; G.add(spray);
    const o = new THREE.Object3D(), fr = (v) => v - Math.floor(v);
    // the enlarged head, in millimetres at 0.03 scene units each
    const big = new THREE.Group(); big.scale.setScalar(0.034); G.add(big);
    const bm = brass();
    big.add(cylY(11, 20, 34, bm, 24), cylY(13, 14, 20, bm, 6));
    for (const sgn of [-1, 1]) big.add(tube([[sgn * 9, 14, 0], [sgn * 15, 0, 0], [sgn * 14, -18, 0], [sgn * 5, -28, 0]], 2.2, bm, false, 30));
    big.add(cylY(5, -32, -26, bm, 16));
    const defl = new THREE.Group(); defl.add(cylY(15, -35, -33.6, bm, 24)); for (let i = 0; i < 12; i++) { const t = boxAt(4, 1.2, 2.4, 17 * Math.cos((i / 12) * Math.PI * 2), -34.3, 17 * Math.sin((i / 12) * Math.PI * 2), bm); t.rotation.y = -(i / 12) * Math.PI * 2; defl.add(t); } big.add(defl);
    const cap = cylY(5.5, 10, 14, M.metal(0xdfe4ec, { roughness: 0.3 }), 20); big.add(cap);
    const glass = new THREE.Mesh(new THREE.CapsuleGeometry(1, 30, 6, 14), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false })); glass.position.y = -8;
    const liquid = new THREE.Mesh(new THREE.CapsuleGeometry(0.78, 29, 6, 12), new THREE.MeshBasicMaterial({ color: 0xe53030, toneMapped: false })); liquid.position.y = -8;
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.85 }));
    big.add(liquid, bubble, glass);
    const NB = 150, bigSpray = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 6, 4), new THREE.MeshBasicMaterial({ color: COL.spray, toneMapped: false }), NB); bigSpray.instanceMatrix.setUsage(THREE.DynamicDrawUsage); bigSpray.frustumCulled = false; big.add(bigSpray);
    const NSH = 24, shards = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1.1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }), NSH); shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage); shards.frustumCulled = false; big.add(shards);
    const link = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })); link.frustumCulled = false; G.add(link);
    const lb = { bulb: stage.label('', [0, 0, 0], G, 'hot'), fire: stage.label('', [0, 0, 0], G), big: stage.label('The head nearest the fire, enlarged', [0, 0, 0], G), n: stage.label('', [0, 0, 0], G, 'hot') };
    // chart: the nearest bulb, the next hottest bulb and the hot gas, against time
    let sNow = null;
    const bd = board(G, 6.6, 4.3, 990, 645, (g, w, h) => {
      const L = fire.log, tMax = Math.max(120, Math.ceil((fire.t + 20) / 60) * 60), yMax = sNow ? Math.max(120, Math.ceil((sNow.bulb + 40) / 40) * 40) : 120;
      const xt = []; for (let t = 0; t <= tMax; t += tMax > 480 ? 120 : 60) xt.push([t, t / 60 + (t === 0 ? '' : ' min')]);
      const yt = []; for (let y = 0; y <= yMax; y += 40) yt.push([y, y + '°']);
      const { X, Y, pl, cw } = axes(g, w, h, { title: 'Bulb temperature', sub: sNow ? `fire: ${Math.round(fire.Q)} kW` : '', x0: 0, x1: tMax, y0: 0, y1: yMax, xt, yt, xl: 'time since the fire started', pad: [96, 80, 30, 96] });
      if (!sNow) return;
      g.strokeStyle = '#ff6a6a'; g.lineWidth = 4; g.setLineDash([12, 9]); g.beginPath(); g.moveTo(pl, Y(sNow.bulb)); g.lineTo(pl + cw, Y(sNow.bulb)); g.stroke(); g.setLineDash([]);
      g.font = '28px sans-serif'; g.fillStyle = '#ff8a8a'; g.fillText('bursts at ' + sNow.bulb + ' °C', pl + 12, Y(sNow.bulb) - 10);
      const line = (key, color, wd) => { g.strokeStyle = color; g.lineWidth = wd; g.lineJoin = 'round'; g.beginPath(); L.forEach((p, i) => { const y = Y(Math.min(yMax, p[key])); if (i) g.lineTo(X(p.t), y); else g.moveTo(X(p.t), y); }); g.stroke(); };
      if (L.length > 1) { line('Tg', 'rgba(255,255,255,.45)', 4); line('T2', '#8ef0ff', 5); line('Tb', '#ffb547', 8); }
      g.fillStyle = '#ffb547'; g.fillText('━ nearest head', pl + 12, 122); g.fillStyle = '#8ef0ff'; g.fillText('━ next head', pl + 250, 122); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText('━ hot gas at the nearest', pl + 440, 122);
    }, [9.2, 1.9, 2.4], 0.25);
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [0.9, 5.6, 0], [0.25, 0.42, 1], 34) : mode === 'narrow' ? fitView(stage, [0.8, 4.6, 0], [0.25, 0.42, 1], 36) : fitView(stage, [2.5, 1.9, 0], [0.26, 0.42, 1], 27.5)));
    let T = 0, last = '', redraw = 0, burstT = -1, capY = 0, lit0 = false;
    return {
      light() { fire.reset(true); burstT = -1; },
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt); T += dt; sNow = s;
        const mode = frame();
        fitNarrow(stage, [lb.fire, lb.big], -0.1, 0);
        const key = [s.spot, s.bulb, s.resp, s.grow, s.h].join();
        if (key !== last || !lit0) { last = key; lit0 = true; fire.reset(true); burstT = -1; }
        fire.advance(dt * LAPSE, s);
        const H = s.h, spot = SPOTS[s.spot], bc = bulbOf(s.bulb);
        ceil.position.y = H; wallB.scale.y = H; wallB.position.set(0, H / 2, -ROOM / 2); wallL.scale.y = H; wallL.position.set(-ROOM / 2, H / 2, 0); riser.scale.y = H - 0.12;
        // the fire: flame height from Heskestad's rule L ≈ 0.235·Q^0.4 (minus about one base width)
        const Lf = fire.Q > 1 ? clamp(0.235 * Math.pow(fire.Q, 0.4) - 0.3, 0.15, H) : 0.001, fl = 1 + 0.08 * Math.sin(T * 17) + 0.05 * Math.sin(T * 29);
        flame.position.set(spot[0], 0.3, spot[1]); flame.scale.set(clamp(0.4 + Lf * 0.5, 0.3, 1.6), Lf * fl, clamp(0.4 + Lf * 0.5, 0.3, 1.6)); flame.visible = fire.Q > 1; crate.position.set(spot[0], 0.15, spot[1]);
        // smoke: up the plume, then out along the ceiling, thinning as the fire dies
        const dens = clamp(fire.Q / 120, 0, 1);
        for (let i = 0; i < NS; i++) {
          const a = fr(i * 0.6180339887 + T * 0.22), az = fr(Math.sin(i * 12.9898) * 43758.5453) * Math.PI * 2, up = 0.42;
          if (i / NS > dens) { o.position.set(0, -1e5, 0); o.scale.setScalar(1e-4); }
          else if (a < up) { const y = (a / up) * (H - 0.25), r = 0.1 + y * 0.13 * fr(i * 0.731); o.position.set(spot[0] + Math.cos(az) * r, 0.4 + y * ((H - 0.65) / (H - 0.25)), spot[1] + Math.sin(az) * r); o.scale.setScalar(0.18 + y * 0.07); }
          else { const r = ((a - up) / (1 - up)) * 6.2; o.position.set(clamp(spot[0] + Math.cos(az) * r, -ROOM / 2, ROOM / 2), H - 0.2 - 0.1 * fr(i * 0.37), clamp(spot[1] + Math.sin(az) * r, -ROOM / 2, ROOM / 2)); o.scale.setScalar(0.34 + r * 0.03); }
          o.updateMatrix(); smoke.setMatrixAt(i, o.matrix);
        }
        smoke.instanceMatrix.needsUpdate = true;
        // heads: bulb colour and, once open, an umbrella of drops
        let q = 0;
        heads.forEach((hd, i) => {
          const open = fire.open[i] >= 0; hd.bulb.visible = !open; hd.bulb.material.color.set(bc.hex);
          for (let k = 0; k < 40; k++) {
            if (!open) { o.position.set(0, -1e5, 0); o.scale.setScalar(1e-4); }
            else { const t = fr(k / 40 + T * 0.9) * 0.75, az = k * 2.39996 + i, v = 2.2 + 1.6 * fr(k * 0.37), y0 = H - 0.45; o.position.set(HEADS[i][0] + Math.cos(az) * v * t, y0 - 0.6 * t - 4.905 * t * t, HEADS[i][1] + Math.sin(az) * v * t); o.scale.setScalar(o.position.y < 0 ? 1e-4 : 1); }
            o.updateMatrix(); spray.setMatrixAt(q++, o.matrix);
          }
        });
        spray.instanceMatrix.needsUpdate = true;
        // the enlarged head
        const ni = fire.near, Tn = fire.Tb[ni], opened = fire.open[ni] >= 0, np = HEADS[ni];
        const upTop = mode !== 'wide', bx = upTop ? 0.8 : 8.6, by = upTop ? H + 3.4 : 6.2, bz = upTop ? 0 : 1.5;
        big.scale.setScalar(upTop ? 0.05 : 0.034);
        big.position.set(bx, by, bz);
        const thin = s.resp === 'quick' ? 1.5 : 2.5; glass.scale.set(thin, 1, thin); liquid.scale.set(thin, 1, thin);
        liquid.material.color.set(bc.hex);
        const k = clamp((Tn - AMB) / (s.bulb - AMB), 0, 1);
        bubble.scale.setScalar(Math.max(0.05, thin * 0.7 * (1 - k))); bubble.position.set(0, 4 - k * 2, thin * 0.2);
        if (opened && burstT < 0) burstT = 0; if (!opened) burstT = -1;
        if (burstT >= 0) burstT += dt;
        glass.visible = liquid.visible = !opened; bubble.visible = !opened && k < 0.98;
        capY = opened ? Math.min(60, burstT * 160) : 0; cap.position.y = 12 - capY; cap.visible = capY < 58;
        for (let i = 0; i < NSH; i++) { if (burstT < 0 || burstT > 0.7) { o.position.set(0, -1e5, 0); o.scale.setScalar(1e-4); } else { const az = i * 2.4, v = 40 + 50 * fr(i * 0.37); o.position.set(Math.cos(az) * v * burstT, -8 + (fr(i * 0.71) - 0.3) * 60 * burstT - 120 * burstT * burstT, Math.sin(az) * v * burstT); o.rotation.set(i, burstT * 9, i * 2); o.scale.setScalar(1); } o.updateMatrix(); shards.setMatrixAt(i, o.matrix); }
        o.rotation.set(0, 0, 0); shards.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < NB; i++) {
          if (!opened || burstT < 0.25) { o.position.set(0, -1e5, 0); o.scale.setScalar(1e-4); }
          else { const a = fr(i * 0.6180339887 + T * 1.7), az = i * 2.39996; if (a < 0.3) { o.position.set(Math.cos(az) * 2.5, 12 - (a / 0.3) * 44, Math.sin(az) * 2.5); } else { const t = (a - 0.3) / 0.7, v = 46 + 26 * fr(i * 0.37); o.position.set(Math.cos(az) * (10 + v * t), -32 + 8 * t - 60 * t * t, Math.sin(az) * (10 + v * t)); } o.scale.setScalar(1); }
          o.updateMatrix(); bigSpray.setMatrixAt(i, o.matrix);
        }
        bigSpray.instanceMatrix.needsUpdate = true;
        link.geometry.attributes.position.setXYZ(0, np[0], H - 0.35, np[1]); link.geometry.attributes.position.setXYZ(1, bx, by - 0.2, bz); link.geometry.attributes.position.needsUpdate = true;
        lb.bulb.position.set(bx + (upTop ? 0 : 1.5), by - (upTop ? 2.1 : 0.3), bz); lb.bulb.element.textContent = opened ? 'Bulb burst: water flowing' : `Bulb ${Tn.toFixed(0)} °C, bursts at ${s.bulb} °C`;
        lb.big.position.set(bx, by + 1.55, bz);
        lb.fire.position.set(spot[0], Math.max(0.9, Lf + 0.8), spot[1] + 1.2); lb.fire.element.textContent = fire.Q > 1 ? `Fire: ${Math.round(fire.Q)} kW` : fire.t1 > 0 ? 'Fire out' : '';
        lb.fire.visible = lb.fire.visible && (fire.Q > 1 || fire.t1 > 0);
        lb.n.position.set(-ROOM / 2 + 3, 0.5, ROOM / 2 + 0.9); lb.n.element.textContent = `${fire.count()} of 9 heads open`;
        redraw += dt; if (redraw > 0.15) { redraw = 0; bd.redraw(); }
        if (mode === 'tall') bd.place([0.6, H + 9.4, -1], 1.55, 0.2, 0); else bd.place();
        bd.mesh.visible = mode !== 'narrow';
      },
      readout: (s) => {
        const n = fire.count(), ni = fire.near;
        return rows(`${n} of 9 heads open`, [
          ['Time since the fire started', fire.t >= 60 ? Math.floor(fire.t / 60) + ' min ' + Math.round(fire.t % 60) + ' s' : Math.round(fire.t) + ' s'],
          ['Fire', Math.round(fire.Q) + ' kW'],
          ['Hot gas at the nearest head', fire.Tg[ni].toFixed(0) + ' °C'],
          ['Its bulb', fire.open[ni] >= 0 ? 'burst at ' + Math.round(fire.open[ni]) + ' s' : fire.Tb[ni].toFixed(0) + ' °C of ' + s.bulb + ' °C'],
          ['Each open head sprays', 'about ' + Math.round(K80 * Math.sqrt(0.5)) + ' L/min'],
        ], n === 0 ? 'Every head feels only its own heat. The clock runs 12 times faster than life.' : n === 1 ? 'One head, over the fire. NFPA: one was enough in 77% of real fires where sprinklers operated.' : n + ' heads opened: the fire was between them, or grew large before the first one burst. NFPA: five or fewer in 96% of fires.', 3, 300);
      },
    };
  },
};
