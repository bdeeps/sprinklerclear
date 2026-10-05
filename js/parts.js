// SprinklerClear's shared drawing kit: screen helpers, chart boards, parts turned on a lathe (whole
// or sliced in half to show the bore), a free-flying spray of drops, and the impact sprinkler
// itself, drawn in millimetres. No physics lives here (see sprinkler.js).
import { THREE, M, clamp, lerp } from './kit.js';

export const COL = {
  brass: 0xd0a245, cut: 0xf0d590, steel: 0xc3c8d1, iron: 0x8a909c, water: 0x4fc3ff, deep: 0x2f86d6, spray: 0xbfe8ff,
  good: 0x5ce1a9, warn: 0xffb547, red: 0xff5a5a, grass: 0x2f6b3a, soil: 0x6b4a32, white: 0xf3f4f6, dark: 0x3a3f49, plastic: 0x23262d,
};
export const brass = (o = {}) => M.metal(COL.brass, { roughness: 0.36, metalness: 0.85, side: THREE.DoubleSide, ...o });
export const cutFace = (color = COL.cut, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.15, side: THREE.DoubleSide, ...o });
export const waterMat = (color = COL.water, opacity = 0.55) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });

// ---------------------------------------------------------------- screen helpers
export const inReel = () => document.body.classList.contains('gb-reel');
export const narrowScreen = () => window.innerWidth < 560 && !inReel();
export const isPortrait = (stage) => stage.camera.aspect < 0.9;
export function rows(head, list, note = '', keep = 3, width = 300) {
  const nar = narrowScreen();
  return `<div style="max-width:${width}px"><div class="big">${head}</div>` + (nar ? list.slice(0, keep) : list).map(([a, b, cls]) => `<div class="row"><span>${a}</span><b${cls ? ` class="${cls}"` : ''}>${b}</b></div>`).join('') + (note && !nar ? `<small>${note}</small>` : '') + '</div>';
}
// On a phone-width stage hide minor labels and nudge the picture down, clear of the readout.
export function fitNarrow(stage, minor = [], y = -0.14, wideX = 0) {
  const narrow = stage.host.clientWidth < 560 && !inReel();
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const sy = narrow ? y : 0, sx = narrow || inReel() ? 0 : wideX;
  if (!stage.shift || stage.shift[1] !== sy || stage.shift[0] !== sx) stage.setShift(sx, sy);
  return narrow;
}
// The stage backs the camera off on narrow frames (stage.js). fitView undoes that, so a view can
// be given as a true distance D from the target along dir.
export const aspectK = (stage) => Math.min(2.5, Math.max(1, 1.45 / Math.max(0.3, stage.camera.aspect)));
export function fitView(stage, target, dir, D) {
  const k = aspectK(stage), d = new THREE.Vector3(...dir).normalize().multiplyScalar(D / k);
  return { pos: [target[0] + d.x, target[1] + d.y, target[2] + d.z], target };
}
// Call every frame. Re-frames when the stage flips between wide, phone-narrow and tall (the
// upright video), or when key changes. pick(mode, key) returns { pos, target } or nothing.
export function framer(stage, pick) {
  let last = null;
  return (key = '') => {
    const mode = stage.host.clientWidth < 560 && !inReel() ? 'narrow' : isPortrait(stage) ? 'tall' : 'wide';
    const id = mode + '|' + key;
    if (id === last) return mode;
    const first = last === null; last = id;
    const v = pick(mode, key);
    if (v && (!stage.moved || !first)) stage.setView(v.pos, v.target, first ? 0.4 : 0.9);
    return mode;
  };
}
export const fmt = (v, d = 1) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-IN') : v.toFixed(d));

// ---------------------------------------------------------------- chart boards
// A canvas on a plane. place(pos, scale, rotY) moves it (for the tall video frame); place() puts it home.
export function board(root, w, h, pxW, pxH, draw, pos, rotY = 0, rotX = 0) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => { draw(g, pxW, pxH); tex.needsUpdate = true; };
  redraw();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  mesh.position.set(...pos); mesh.rotation.set(rotX, rotY, 0); root.add(mesh);
  const b = { mesh, redraw, home: { p: new THREE.Vector3(...pos), ry: rotY, rx: rotX } };
  b.place = (p = null, scale = 1, ry = b.home.ry, rx = b.home.rx) => {
    if (p) { mesh.position.set(...p); mesh.rotation.set(rx, ry, 0); mesh.scale.setScalar(scale); }
    else { mesh.position.copy(b.home.p); mesh.rotation.set(b.home.rx, b.home.ry, 0); mesh.scale.setScalar(1); }
  };
  return b;
}
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(8,10,16,.9)'; g.beginPath(); g.roundRect(0, 0, w, h, 22); g.fill(); }
// Axes for a simple line chart. Returns X(v), Y(v) mappers.
export function axes(g, w, h, { title, sub = '', x0 = 0, x1 = 1, y0 = 0, y1 = 1, xt = [], yt = [], xl = '', pad = [92, 70, 30, 60] }) {
  panelBg(g, w, h);
  const [pl, pt, pr, pb] = pad, cw = w - pl - pr, ch = h - pt - pb;
  const X = (v) => pl + (cw * (v - x0)) / (x1 - x0), Y = (v) => pt + ch * (1 - (v - y0) / (y1 - y0));
  g.fillStyle = '#e8eef8'; g.font = 'bold 44px sans-serif'; g.textAlign = 'left'; g.fillText(title, 26, 54);
  if (sub) { g.font = '30px sans-serif'; g.fillStyle = 'rgba(255,255,255,.62)'; g.textAlign = 'right'; g.fillText(sub, w - 26, 54); g.textAlign = 'left'; }
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.font = '30px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)';
  for (const [v, t] of yt) { g.beginPath(); g.moveTo(pl, Y(v)); g.lineTo(pl + cw, Y(v)); g.stroke(); g.textAlign = 'right'; g.fillText(t, pl - 12, Y(v) + 11); }
  g.textAlign = 'center';
  for (const [v, t] of xt) { g.fillText(t, X(v), pt + ch + 36); g.beginPath(); g.moveTo(X(v), pt + ch); g.lineTo(X(v), pt + ch + 6); g.stroke(); }
  if (xl) g.fillText(xl, pl + cw / 2, h - 14);
  g.textAlign = 'left';
  return { X, Y, pl, pt, cw, ch };
}
export function plot(g, X, Y, fn, a, b, color, width = 6, n = 90, dash = null) {
  g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.setLineDash(dash || []); g.beginPath();
  for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n, y = fn(x); if (i) g.lineTo(X(x), Y(y)); else g.moveTo(X(x), Y(y)); }
  g.stroke(); g.setLineDash([]);
}
export function marker(g, x, y, text, color = '#ffb547', w = 9999) {
  g.fillStyle = color; g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
  if (text) { g.font = 'bold 36px sans-serif'; const tw = g.measureText(text).width; g.fillText(text, x + 18 + tw > w - 10 ? x - 18 - tw : x + 18, Math.max(34, y - 14)); }
}
// Millimetres an hour to a colour: dry brown, through green, to deep blue for a soaking.
const RAMP = [[0, [92, 62, 40]], [0.18, [176, 142, 70]], [0.4, [92, 190, 110]], [0.62, [70, 200, 230]], [0.85, [60, 120, 255]], [1, [150, 90, 255]]];
export function rampRGB(k, out = [0, 0, 0]) {
  k = clamp(k, 0, 1);
  for (let i = 1; i < RAMP.length; i++) if (k <= RAMP[i][0]) { const a = RAMP[i - 1], b = RAMP[i], u = (k - a[0]) / (b[0] - a[0]); out[0] = lerp(a[1][0], b[1][0], u); out[1] = lerp(a[1][1], b[1][1], u); out[2] = lerp(a[1][2], b[1][2], u); return out; }
  return out;
}
export const rampCss = (k) => { const c = rampRGB(k); return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; };

// ---------------------------------------------------------------- turned parts
// A part turned on a lathe: a closed outline of [r, y] points spun round the Y axis, each face
// with its own crisp normals. cut: keep the back half (z ≤ 0) and close the sliced faces.
export function turn(profile, mat, capMat = null, { cut = false, seg = 40 } = {}) {
  const grp = new THREE.Group(), n = profile.length;
  for (let i = 0; i < n; i++) {
    const p = profile[i], q = profile[(i + 1) % n];
    if (p[0] < 1e-6 && q[0] < 1e-6) continue;
    const g = new THREE.LatheGeometry([new THREE.Vector2(Math.max(1e-4, p[0]), p[1]), new THREE.Vector2(Math.max(1e-4, q[0]), q[1])], cut ? seg / 2 : seg, cut ? Math.PI / 2 : 0, cut ? Math.PI : Math.PI * 2);
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; grp.add(m);
  }
  if (cut && capMat) for (const sgn of [1, -1]) {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(profile.map(([r, y]) => new THREE.Vector2(sgn * r, y)))), capMat);
    m.position.z = 0.02; grp.add(m);
  }
  return grp;
}
export function cylY(r, y0, y1, mat, seg = 28, r1 = r) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r, y1 - y0, seg), mat);
  m.position.y = (y0 + y1) / 2; m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function boxAt(w, h, d, x, y, z, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
// A coil spring round the Y axis.
export function helix(R, y0, y1, turns, wire, mat) {
  const nn = Math.max(8, Math.round(turns * 22)), pts = [];
  for (let i = 0; i <= nn; i++) { const t = i / nn, a = t * turns * Math.PI * 2; pts.push(new THREE.Vector3(R * Math.cos(a), lerp(y0, y1, t), -R * Math.sin(a))); }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), nn * 2, wire, 6, false), mat);
  m.castShadow = true;
  return m;
}
export function plate(polys, mat, z = 0) {
  const m = new THREE.Mesh(new THREE.ShapeGeometry(polys.map((p) => new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x, y))))), mat);
  m.position.z = z;
  return m;
}
// Make a part see-through or solid again.
export function ghost(obj, on, opacity = 0.16) {
  obj.traverse((o) => {
    if (!o.material || o.isCSS2DObject) return;
    const m = o.material;
    if (m.userData.op0 === undefined) { m.userData.op0 = m.opacity; m.userData.tr0 = m.transparent; m.userData.dw0 = m.depthWrite; }
    m.transparent = on || m.userData.tr0; m.opacity = on ? opacity : m.userData.op0; m.depthWrite = on ? false : m.userData.dw0;
    o.castShadow = !on;
  });
}

// ---------------------------------------------------------------- free-flying drops
// A pool of drops, each with its own position and velocity, moved by gravity (and air drag when a
// drop size is given). emit() adds one; drops vanish at the floor or when their time is up.
export function makeDrops(n, { color = COL.spray, size = 1, opacity = 0.92 } = {}) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: opacity < 1, opacity }), n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = false;
  const P = new Float32Array(n * 3), V = new Float32Array(n * 3), life = new Float32Array(n), kd = new Float32Array(n), sz = new Float32Array(n), o = new THREE.Object3D();
  let next = 0;
  const api = { mesh, n };
  // k: the drop's diameter in metres, for air drag (0 for none); s: size multiplier
  api.emit = (x, y, z, vx, vy, vz, t = 3, k = 0, s = 1) => {
    const i = next; next = (next + 1) % n;
    P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; V[i * 3] = vx; V[i * 3 + 1] = vy; V[i * 3 + 2] = vz; life[i] = t; kd[i] = k; sz[i] = s;
    return i;
  };
  api.clear = () => { life.fill(0); };
  // g: gravity in scene units per s²; floor: y where drops stop; wind [wx, wz] in scene units/s
  // advance: move every drop by dt without redrawing (call several times a frame, then draw once)
  api.advance = (dt, { g = 9.81, floor = 0, wx = 0, wz = 0 } = {}) => {
    for (let i = 0; i < n; i++) {
      if (life[i] <= 0) continue;
      const a = i * 3;
      if (kd[i] > 0) {
        // the same drag law as sprinkler.js: fly(), for scenes drawn in metres (kd is the drop's diameter in metres)
        const d = kd[i], rx = V[a] - wx, rz = V[a + 2] - wz, s = Math.hypot(rx, V[a + 1], rz), Re = Math.max(1e-6, (1.18 * s * d) / 1.84e-5), k = ((0.75 * 1.18) / (997 * d)) * (24 / Re + 6 / (1 + Math.sqrt(Re)) + 0.4) * s, f = 1 / (1 + k * dt);
        V[a] = (V[a] + k * dt * wx) * f; V[a + 2] = (V[a + 2] + k * dt * wz) * f; V[a + 1] = (V[a + 1] - g * dt) * f;
      } else V[a + 1] -= g * dt;
      P[a] += V[a] * dt; P[a + 1] += V[a + 1] * dt; P[a + 2] += V[a + 2] * dt; life[i] -= dt;
      if (P[a + 1] < floor) life[i] = 0;
    }
  };
  api.draw = (stretch = 1) => {
    for (let i = 0; i < n; i++) {
      if (life[i] <= 0) { o.position.set(0, -1e5, 0); o.scale.setScalar(1e-4); }
      else { const a = i * 3; o.position.set(P[a], P[a + 1], P[a + 2]); o.scale.set(size * sz[i], size * sz[i] * stretch, size * sz[i]); }
      o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  api.update = (dt, opts = {}) => { api.advance(dt, opts); api.draw(opts.stretch || 1); };
  return api;
}
// Drops that follow a fixed path of [x, y, z] points round and round (water inside a pipe).
export function makeStream(n, pts, { color = COL.water, size = 1, spread = 1 } = {}) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshBasicMaterial({ color, toneMapped: false }), n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = false;
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2] || 0)), false, 'centripetal', 0.3), o = new THREE.Object3D(), v = new THREE.Vector3();
  const fr = (x) => x - Math.floor(x), ph = Array.from({ length: n }, (_, i) => fr((i + 0.5) * 0.6180339887)), jx = ph.map((_, i) => (fr(i * 0.7548776662) - 0.5) * 2 * spread), jz = ph.map((_, i) => -fr(i * 0.5698402910) * spread);
  let clock = 0;
  return { mesh, update(dt, speed, show = 1) {
    clock += dt * speed;
    for (let i = 0; i < n; i++) {
      const u = fr(ph[i] + clock);
      if (i / n >= show) { o.position.set(0, -1e5, 0); o.scale.setScalar(1e-4); }
      else { curve.getPoint(u, v); const w = typeof pts[0][3] === 'number' ? lerp(pts[0][3], pts[pts.length - 1][3], u) : 1; o.position.set(v.x + jx[i] * w, v.y, v.z + jz[i] * w); o.scale.setScalar(size); }
      o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  } };
}

// ---------------------------------------------------------------- the impact sprinkler
// A generic 3/4 inch brass impact sprinkler, in millimetres. Y is up, the bearing axis is the Y
// axis, and with the head at angle 0 the nozzle points along +X, tilted ELEV degrees up.
// Seen from above, the head turns forwards anticlockwise; the arm swings out clockwise.
// Parts (bottom to top):
//   riser      the pipe the sprinkler screws onto (fixed)
//   nipple     the bearing: a threaded sleeve the head's spindle turns in (fixed)
//   washers    three washers between the spindle's flange and the nipple: seal and friction
//   collars    two wire clips on the nipple whose tangs set the ends of the arc (fixed)
//   bspring    the bearing spring: holds the washers tight when the pressure is low
//   body       spindle tube, body and bridge with the pin: one casting that turns
//   nozzle     the tapered nozzle screwed into the body
//   anvil      the lug on the body that the arm strikes
//   lever      the trip lever on the body, with the tab that it raises into the arm's way
//   arm        the arm with its spoon and counterweight, swinging on the pin
//   aspring    the arm spring round the pin
export const RISER = 80, ELEV = 25, SPOON_X = 64, LEVER_AZ = Math.atan2(9.6, 19.8), BODY_Y = 68;
const E = (ELEV * Math.PI) / 180, CE = Math.cos(E), SE = Math.sin(E);
export const jetAt = (s) => [s * CE, BODY_Y + s * SE, 0];        // a point s mm along the jet's line from the body's centre
export const NOZ_TIP = 46, SPOON_S = SPOON_X / CE;
// Where the spoon sends the water, in the arm's own frame: turned 70° towards −Z, still climbing.
export const SPOON_OUT = [Math.cos(1.22) * CE, Math.cos(1.22) * SE, -Math.sin(1.22)];
export function makeSprinkler({ cut = false, nozzleD = 4 } = {}) {
  const root = new THREE.Group(), fixed = new THREE.Group(), head = new THREE.Group(), arm = new THREE.Group();
  root.add(fixed, head); head.add(arm);
  const bm = brass(), cf = cutFace(), steel = M.metal(COL.steel, { roughness: 0.3, side: THREE.DoubleSide }), iron = M.metal(COL.iron, { roughness: 0.55, metalness: 0.6, side: THREE.DoubleSide });
  const o = { cut, seg: 44 };
  // fixed parts
  const riser = turn([[10.5, -RISER], [13.5, -RISER], [13.5, -24], [17, -22], [17, 0], [11.5, 0], [11.5, -20], [10.5, -22]], iron, cutFace(0xb4bac4), o);
  const nipple = turn([[7, -14], [11.5, -14], [11.5, 0], [16, 0], [16, 10], [10.5, 10], [10.5, 36], [7, 36]], bm, cf, o);
  const washers = new THREE.Group();
  [[-17, 0xf2f2ee], [-16, 0x2b2e36], [-15, 0xf2f2ee]].forEach(([y, c]) => washers.add(turn([[6.7, y], [9.6, y], [9.6, y + 0.9], [6.7, y + 0.9]], M.plastic(c, { side: THREE.DoubleSide }), M.plastic(c, { side: THREE.DoubleSide }), o)));
  const collar = (y) => {
    const g = new THREE.Group(), wm = M.metal(0xe9edf3, { roughness: 0.25 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(11.4, 0.9, 8, 40, Math.PI * 1.9), wm); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring);
    g.add(boxAt(17, 1.8, 1.8, 19.5, y, 0, wm), boxAt(1.8, 9, 1.8, 27.5, y, 0, wm));
    return g;
  };
  const collarLo = collar(22), collarHi = collar(28);
  fixed.add(riser, nipple, washers, collarLo, collarHi);
  // the turning casting: spindle, body, bridge, pin
  const body = new THREE.Group();
  body.add(turn([[4.5, -20], [9.5, -20], [9.5, -17.1], [6.5, -17.1], [6.5, 55], [11, 57], [13, 62], [13, 74], [10, 81], [4, 84], [0, 84], [0, 73], [4.5, 70]], bm, cf, o));
  const bridgePts = [[-9, 76, 0], [-20, 90, 0], [-22, 116, 0], [-14, 129, 0], [0, 132, 0]];
  const bridge = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bridgePts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.4), 40, 3.2, 10), bm); bridge.castShadow = true;
  body.add(bridge, cylY(5, 129.5, 135, bm, 20), cylY(1.8, 84, 131, steel, 12));
  const anvil = new THREE.Group(); anvil.add(boxAt(5, 26, 5, 15, 96, -4.6, bm));
  const bspring = helix(9, 37, 55, 4.5, 1, steel);
  const nozzle = new THREE.Group();
  const rn = nozzleD / 2;
  const nz = turn([[4, 9], [7.5, 9], [7.5, 30], [9, 30], [9, 37], [6, 38], [rn + 2.2, NOZ_TIP], [rn, NOZ_TIP], [rn, 42], [4, 34]], bm, cf, o);
  nz.rotation.z = -(Math.PI / 2 - E); nozzle.add(nz); nozzle.position.y = BODY_Y;
  // trip lever on the +Z side (the side the arm swings out to)
  const lever = new THREE.Group(), lm = M.metal(0xe9edf3, { roughness: 0.25 });
  lever.add(boxAt(2.4, 54, 2.4, 0, -25, 0, lm), boxAt(2.4, 20, 2.4, 0, 10, 0, lm), cylY(3, -2.2, 2.2, lm, 14));
  lever.children[2].rotation.x = Math.PI / 2; lever.children[2].position.set(0, 0, 0);
  const tab = boxAt(3.2, 12, 3.2, 0, 0, 0, M.plastic(COL.red));
  lever.add(tab);
  lever.position.set(19.8, 74, 9.6);
  const leverArm = boxAt(9, 3, 3, 15, 74, 7.4, bm); leverArm.rotation.y = -0.45;
  head.add(body, anvil, bspring, nozzle, lever, leverArm);
  // the arm: hub, bar, spoon, counterweight
  const armBody = new THREE.Group();
  armBody.add(cylY(6, 100, 112, bm, 24), boxAt(64, 5, 4, 26, 106, 0, bm), boxAt(11, 10, 11, -11, 106, 0, bm), boxAt(5, 13, 4, 60, 102, 0, bm));
  const spoonFrame = new THREE.Group(); spoonFrame.position.set(...jetAt(SPOON_S - 3)); spoonFrame.rotation.z = E;
  const sm = brass({ color: 0xe0b24e });
  const curve = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 13, 20, 1, true, 0, 1.22), sm); curve.position.set(0, 0, 2.6 - 10); curve.castShadow = true;
  const lip = boxAt(12, 1.2, 8, 5, 7, -1, sm), lip2 = boxAt(12, 1.2, 8, 5, -7, -1, sm);
  spoonFrame.add(curve, lip, lip2);
  armBody.add(spoonFrame);
  const aspring = helix(4.6, 113.5, 128.5, 5, 0.8, steel);
  arm.add(armBody); head.add(aspring);
  // water seen in the sliced bore
  let water = null;
  if (cut) {
    const nzPoly = [[0, -4], [34, -4], [42, -rn], [NOZ_TIP, -rn], [NOZ_TIP, rn], [42, rn], [34, 4], [0, 4]].map(([s, t]) => [s * CE - t * SE, BODY_Y + s * SE + t * CE]);
    water = plate([[[-10.5, -RISER], [10.5, -RISER], [10.5, -20], [-10.5, -20]], [[-4.5, -20], [4.5, -20], [4.5, 72], [-4.5, 72]], nzPoly], waterMat(), 0.12);
    root.add(water);
  }
  const parts = { riser, nipple, washers, collarLo, collarHi, body, anvil, bspring, nozzle, lever, leverArm, tab, arm, armBody, aspring, water };
  // Pose: head angle psi, arm swing phi, trip flipped (0..1), arc limits for the collars.
  const api = { root, fixed, head, arm, parts };
  api.pose = ({ psi = 0, phi = 0, trip = 0, lo = null, hi = null, part = true } = {}) => {
    head.rotation.y = psi; arm.rotation.y = -phi;
    tab.position.y = lerp(20, 29, trip); lever.rotation.x = lerp(-0.1, 0.1, trip);
    tab.material.color.set(trip > 0.5 ? COL.red : 0x8a909c);
    collarLo.visible = collarHi.visible = part && lo !== null;
    if (lo !== null) { collarLo.rotation.y = lo - LEVER_AZ - 0.1; collarHi.rotation.y = hi - LEVER_AZ + 0.1; }
  };
  api.pose();
  return api;
}
// A small, simple sprinkler on a riser for scenes drawn in metres (height h metres).
export function miniSprinkler(h = 0.6, k = 1) {
  const g = new THREE.Group(), bm = brass(), head = new THREE.Group();
  g.add(cylY(0.02 * k, 0, h, M.metal(COL.iron, { roughness: 0.5 }), 10));
  head.add(cylY(0.035 * k, -0.04 * k, 0.05 * k, bm, 12));
  const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.014 * k, 0.026 * k, 0.14 * k, 10), bm); nz.rotation.z = -(Math.PI / 2 - E); nz.position.set(0.06 * k, 0.03 * k, 0); head.add(nz);
  head.add(boxAt(0.2 * k, 0.016 * k, 0.02 * k, 0.05 * k, 0.1 * k, 0, bm));
  head.position.y = h; g.add(head); g.head = head;
  return g;
}
export { THREE, M, clamp, lerp };
