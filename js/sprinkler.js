// SprinklerClear's physics, with no drawing in it: pressure and nozzles, a drop flying through
// air, the watering pattern of one sprinkler and of a field of them, Christiansen's uniformity
// coefficient, the impact-drive mechanism (arm, spoon, spring, bearing friction and trip), the
// field-efficiency ranges, and the heat that opens a fire sprinkler.
// Everything here is a model with stated constants. Where a number comes from a source, the source
// is named next to it.

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;

// ---------------------------------------------------------------- water, air, pressure
// Water at 25 °C: 997 kg/m³. Air at 25 °C and sea level: 1.18 kg/m³, viscosity 1.84e-5 Pa·s
// (CRC Handbook of Chemistry and Physics). g = 9.81 m/s².
export const RHO = 997, G = 9.81, BAR = 1e5, RHO_AIR = 1.18, MU_AIR = 1.84e-5;
// Hydrostatic pressure P = ρ g h: 9.78 kPa, about 0.1 bar, for every metre of height.
export const headPa = (h) => RHO * G * Math.max(0, h);
export const paToHead = (p) => p / (RHO * G);

// ---------------------------------------------------------------- the nozzle
// Torricelli: a nozzle turns pressure into speed, v = C·√(2P/ρ). Sprinkler nozzles are smooth
// tapers, so the discharge coefficient C is high: "about 0.96" (Irrigation Systems Management,
// section 11.3 "Sprinkler Performance", LibreTexts). Flow Q = area × speed.
// Check against a maker's table (Rain Bird 30H, 3/4 inch brass impact sprinkler, straight-bore
// 5/32 in = 3.97 mm nozzle, agricultural catalogue): 0.87, 1.05 and 1.22 m³/h at 2, 3 and 4 bar.
// This gives 0.87, 1.06 and 1.22.
export const C_NOZ = 0.96;
export function nozzle(P, dmm) {
  const v = C_NOZ * Math.sqrt((2 * Math.max(0, P)) / RHO), A = (Math.PI * (dmm / 1000) ** 2) / 4, Q = A * v;
  // thrust = momentum carried off each second, ρ·Q·v
  return { v, A, Q, lpm: Q * 60000, m3h: Q * 3600, thrust: RHO * Q * v };
}

// ---------------------------------------------------------------- one drop in the air
// A drop of diameter d is a small ball pulled down by gravity and held back by air drag,
//   m·dv/dt = m·g − ½·ρair·Cd·A·|v − wind|·(v − wind),
// with the drag coefficient of a sphere, Cd = 24/Re + 6/(1 + √Re) + 0.4 (F. M. White, "Viscous
// Fluid Flow"). This is the ballistic sprinkler model of Fukui, Nakanishi and Okamura (1980) and
// of Carrión, Tarjuelo and Montero (SIRIAS, Irrigation Science 20, 2001): every drop is taken to
// form at the nozzle and fly on its own. Real jets stay whole for the first metre or two and big
// drops flatten, so it is a model, not a measurement.
// Axes: x and z along the ground, y up. Returns where and when the drop lands.
export function fly(d, v0, elev, h0 = 0.6, { az = 0, wx = 0, wz = 0, dt = 0.008, path = null } = {}) {
  const k0 = (0.75 * RHO_AIR) / (RHO * d);                     // ½ρair·A/m = ¾·ρair/(ρ·d)
  const ce = Math.cos(elev);
  let x = 0, y = h0, z = 0, vx = v0 * ce * Math.cos(az), vy = v0 * Math.sin(elev), vz = v0 * ce * Math.sin(az), t = 0, top = h0;
  if (path) path.push(x, y, z);
  while (t < 30) {
    const rx = vx - wx, rz = vz - wz, s = Math.hypot(rx, vy, rz), Re = Math.max(1e-6, (RHO_AIR * s * d) / MU_AIR);
    const k = k0 * (24 / Re + 6 / (1 + Math.sqrt(Re)) + 0.4) * s;
    // drag taken implicitly, so tiny drops (large k) stay stable
    const f = 1 / (1 + k * dt);
    vx = (vx + k * dt * wx) * f; vz = (vz + k * dt * wz) * f; vy = (vy - G * dt) * f;
    const nx = x + vx * dt, ny = y + vy * dt, nz = z + vz * dt;
    if (ny <= 0) { const u = y / Math.max(1e-9, y - ny); x += (nx - x) * u; z += (nz - z) * u; t += dt * u; y = 0; if (path) path.push(x, 0, z); break; }
    x = nx; y = ny; z = nz; t += dt; if (y > top) top = y;
    if (path) path.push(x, y, z);
  }
  return { x, z, r: Math.hypot(x, z), t, top, vEnd: Math.hypot(vx, vy, vz) };
}
// The same throw with no air at all, for comparison: R = v²·sin 2θ / g (plus the riser's height).
export function flyVacuum(v0, elev, h0 = 0.6) {
  const vy = v0 * Math.sin(elev), t = (vy + Math.sqrt(vy * vy + 2 * G * h0)) / G;
  return { r: v0 * Math.cos(elev) * t, t, top: h0 + (vy * vy) / (2 * G) };
}

// ---------------------------------------------------------------- drop sizes
// A sprinkler jet breaks into drops of many sizes, mostly 0.5 to 4 mm (FAO Irrigation Water
// Management Training Manual No. 5, chapter 5). Higher pressure for the same nozzle tears it into
// smaller ones: Kincaid, Solomon and Oliphant ("Drop size distributions for irrigation
// sprinklers", Transactions of the ASAE 39(3), 1996) found the ratio of nozzle size to pressure
// to be what sets the sizes, and described them with an exponential curve of the kind used here:
//   share of the water in drops smaller than d:  F(d) = 1 − exp(−0.693·(d/d50)^n).
// Their coefficients were not to hand, so the numbers below are this box's own:
//   largest drop  dMax = 1.667·d^0.7·(3 bar / P)^0.36 mm (never above 6.5 mm, where drops break
//   up in flight). The three constants were fitted so that the largest drop lands at the radius
//   of throw in Rain Bird's 30H table (27° nozzle; 3.97, 4.37 and 4.76 mm; 1.7 to 5.5 bar):
//   the fit is within 0.4 m on every row (for example 3.97 mm: 12.9, 13.5, 14.0 m listed at 2, 3,
//   4 bar; 12.7, 13.7, 14.2 m here).
//   middle size   d50 = dMax × a share that falls as pressure rises (0.41 at 3 bar), and the
//   spread n rises with it. These two are chosen so the pattern behaves as the textbooks
//   describe: a doughnut when pressure is too low, too much close in when it is too high.
// The arm of an impact sprinkler also cuts through the jet on every beat and knocks some water
// short: ARM_SHARE of the flow is launched slower and flatter (a stated assumption).
export const ARM_SHARE = 0.12;
export function drops(P, dmm) {
  const pb = Math.max(0.2, P / BAR);
  const dMax = Math.min(6.5, 1.667 * Math.pow(dmm, 0.7) * Math.pow(3 / pb, 0.36));
  const share = clamp(0.41 * Math.pow(3 / pb, 0.5), 0.28, 0.86), d50 = share * dMax, n = clamp(1.6 + 0.8 * share / 0.41, 2, 3.4);
  const F = (d) => 1 - Math.exp(-0.693 * Math.pow(d / d50, n)), Fm = F(dMax);
  return { dMax, d50, n, F: (d) => Math.min(1, F(Math.min(d, dMax)) / Fm) };
}
// Radius of throw: where the largest drops land.
export function throwRadius(P, dmm, elevDeg = 27, h0 = 0.6, wind = 0) {
  const nz = nozzle(P, dmm), D = drops(P, dmm);
  return fly(D.dMax / 1000, nz.v, (elevDeg * Math.PI) / 180, h0, { wx: wind }).r;
}
// The angle that throws farthest. With no air it is 45°. Drag makes it lower.
export function bestAngle(P, dmm, h0 = 0.6) {
  const nz = nozzle(P, dmm), d = drops(P, dmm).dMax / 1000;
  let best = 0, br = 0;
  for (let a = 10; a <= 50; a += 0.5) { const r = fly(d, nz.v, (a * Math.PI) / 180, h0).r; if (r > br) { br = r; best = a; } }
  return { angle: best, r: br };
}

// ---------------------------------------------------------------- one sprinkler's footprint
// The water a single sprinkler lays down, as millimetres an hour on a grid of CELL-metre squares.
// Every drop size is flown from every compass direction (the head sweeps the full circle) through
// the wind, and its share of the flow is put down where it lands. Nothing about the shape of the
// pattern is typed in: the cone, the doughnut at low pressure and the stretch downwind all come
// out of the drop model.
export const CELL = 0.5, KN = 113, KH = (KN - 1) / 2;       // 113 cells: 28 m each way from the head
export function footprint(P, dmm, { elevDeg = 27, h0 = 0.6, wind = 0, windDir = 0, nAz = 90, nD = 44 } = {}) {
  const nz = nozzle(P, dmm), D = drops(P, dmm), g = new Float32Array(KN * KN), elev = (elevDeg * Math.PI) / 180;
  const wx = wind * Math.cos(windDir), wz = wind * Math.sin(windDir);
  const mmh = (nz.Q * 3600 * 1000) / (CELL * CELL);          // the whole flow on one cell, in mm/h
  const put = (x, z, w) => {
    const fx = x / CELL + KH, fz = z / CELL + KH, i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j;
    if (i < 0 || j < 0 || i >= KN - 1 || j >= KN - 1) return;
    g[j * KN + i] += w * (1 - a) * (1 - b); g[j * KN + i + 1] += w * a * (1 - b); g[(j + 1) * KN + i] += w * (1 - a) * b; g[(j + 1) * KN + i + 1] += w * a * b;
  };
  let fine = 0;
  for (let k = 0; k < nD; k++) {
    // size classes evenly spaced in diameter, from fine spray to the largest drop
    const d0 = (D.dMax * k) / nD, d1 = (D.dMax * (k + 1)) / nD, dm = Math.max(0.12, (d0 + d1) / 2) / 1000, w = D.F(d1) - D.F(d0);
    if (d1 <= 1) fine += w;
    for (let a = 0; a < nAz; a++) {
      const az = ((a + (k % 2) * 0.5) / nAz) * Math.PI * 2;
      const m = fly(dm, nz.v, elev, h0, { az, wx, wz, dt: 0.012 });
      put(m.x, m.z, (w * (1 - ARM_SHARE) * mmh) / nAz);
      const s = fly(dm, nz.v * 0.55, elev * 0.75, h0, { az, wx, wz, dt: 0.012 });
      put(s.x, s.z, (w * ARM_SHARE * mmh) / nAz);
    }
  }
  // two light passes of smoothing: a real head wobbles and its drops scatter
  const t = new Float32Array(KN * KN);
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 1; j < KN - 1; j++) for (let i = 1; i < KN - 1; i++) { const q = j * KN + i; t[q] = (g[q] * 4 + (g[q - 1] + g[q + 1] + g[q - KN] + g[q + KN]) * 2 + g[q - KN - 1] + g[q - KN + 1] + g[q + KN - 1] + g[q + KN + 1]) / 16; }
    g.set(t);
  }
  let rMax = 0, total = 0;
  for (let j = 0; j < KN; j++) for (let i = 0; i < KN; i++) { const v = g[j * KN + i]; total += v; if (v > 0.15) rMax = Math.max(rMax, Math.hypot(i - KH, j - KH) * CELL); }
  return { g, nz, D, fine, rMax, caught: (total * CELL * CELL) / (nz.Q * 3600 * 1000) };
}
// The average rate at each distance from the head (mm/h in rings CELL wide): the "radial pattern".
export function radial(fp, n = 44) {
  const sum = new Float64Array(n), cnt = new Float64Array(n);
  for (let j = 0; j < KN; j++) for (let i = 0; i < KN; i++) { const r = Math.hypot(i - KH, j - KH) * CELL, k = Math.round(r / CELL); if (k < n) { sum[k] += fp.g[j * KN + i]; cnt[k]++; } }
  return Array.from(sum, (v, k) => (cnt[k] ? v / cnt[k] : 0));
}

// ---------------------------------------------------------------- a field of sprinklers
// Sprinklers stand on a grid: `space` metres apart along a pipe and `row` metres between pipes
// (square), or with every other pipe shifted half a space (triangular). The map is the sum of
// every sprinkler's footprint. It is a piece from the middle of a large field, so sprinklers
// outside the map still throw water into it.
export function fieldMap(fp, { space = 12, row = space, tri = false, size = 36 } = {}) {
  const N = Math.round(size / CELL), m = new Float32Array(N * N), heads = [], reach = KH * CELL, half = size / 2;
  const j0 = Math.floor((-half - reach) / row), j1 = Math.ceil((half + reach) / row), i0 = Math.floor((-half - reach) / space) - 1, i1 = Math.ceil((half + reach) / space) + 1;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x = (i + (tri && j & 1 ? 0.5 : 0)) * space, z = j * row;
    if (Math.abs(x) <= half && Math.abs(z) <= half) heads.push([x, z]);
    // paste the footprint with its centre on (x, z)
    const ci = Math.round((x + half) / CELL), cj = Math.round((z + half) / CELL);
    const a0 = Math.max(0, ci - KH), a1 = Math.min(N - 1, ci + KH), b0 = Math.max(0, cj - KH), b1 = Math.min(N - 1, cj + KH);
    for (let b = b0; b <= b1; b++) { const ko = (b - cj + KH) * KN - ci + KH, mo = b * N; for (let a = a0; a <= a1; a++) m[mo + a] += fp.g[ko + a]; }
  }
  // Statistics over one repeating tile of the pattern at the centre of the map.
  const tw = Math.round(space / CELL), th = Math.round((tri ? 2 * row : row) / CELL), c = Math.round(half / CELL), vals = [];
  for (let b = 0; b < th; b++) for (let a = 0; a < tw; a++) { const x = c + a, y = c + b; if (x < N && y < N) vals.push(m[y * N + x]); }
  return { m, N, heads, ...uniformity(vals), gross: (fp.nz.Q * 3600 * 1000) / (space * row) };
}
// Christiansen's coefficient of uniformity (J. E. Christiansen, "Irrigation by Sprinkling",
// University of California Agricultural Experiment Station Bulletin 670, 1942):
//   CU = 100 × (1 − Σ|x − mean| / (n × mean)),
// where x are the depths caught in n cans set out on a grid. 100% is perfectly even.
// DU (low quarter) = 100 × mean of the driest quarter of the cans ÷ mean of all of them.
export function uniformity(vals) {
  const n = vals.length; if (!n) return { cu: 0, du: 0, mean: 0, min: 0, max: 0 };
  let sum = 0, min = Infinity, max = 0; for (const v of vals) { sum += v; if (v < min) min = v; if (v > max) max = v; }
  const mean = sum / n; let dev = 0; for (const v of vals) dev += Math.abs(v - mean);
  const sorted = Float32Array.from(vals).sort(), q = Math.max(1, Math.floor(n / 4)); let low = 0; for (let i = 0; i < q; i++) low += sorted[i];
  return { cu: mean > 0 ? 100 * (1 - dev / (n * mean)) : 0, du: mean > 0 ? (100 * low) / q / mean : 0, mean, min, max };
}
// How fast bare soil can soak water in once it is wet, mm an hour. FAO Irrigation Water
// Management Training Manual No. 5, Annex 2 (Brouwer and others): sand about 30 (the table prints
// "less than 30"), sandy loam 20 to 30, loam 10 to 20, clay loam 5 to 10, clay 1 to 5. Middle
// values are used.
export const SOILS = {
  sand: { name: 'Sand', intake: 30, range: 'about 30' },
  sandyloam: { name: 'Sandy loam', intake: 25, range: '20 to 30' },
  loam: { name: 'Loam', intake: 15, range: '10 to 20' },
  clayloam: { name: 'Clay loam', intake: 7.5, range: '5 to 10' },
  clay: { name: 'Clay', intake: 3, range: '1 to 5' },
};

// ---------------------------------------------------------------- the impact drive
// A simulation, not an animation. Typical sizes for a 3/4 inch brass impact sprinkler; the part
// values are estimates from its dimensions (brass, 8,500 kg/m³), stated here so they can be argued
// with. Angles in radians, SI units throughout.
//
//   phi  the arm's swing away from its rest position against the body (0 = resting on the anvil)
//   psi  the head's own angle on its bearing (forwards = the way the arm swings home)
//
// 1. The spoon. At rest the spoon sits in the jet. It turns part of the jet sideways, and the
//    water pushes back on the spoon with force F = share × ρ·Q·v (momentum flux of the jet).
//    The push needs the spoon to be full: water takes a moment to run along the curved spoon, so
//    the push builds up over a short time (the length of the spoon ÷ jet speed, a few thousandths
//    of a second). That short lag is what lets the returning arm reach the anvil and strike it
//    before the jet throws it out again.
// 2. The spring. A coil spring wound up a little even at rest (preload) pulls the arm home.
// 3. The blow. Arm and head collide like two flywheels: angular momentum is shared and a part of
//    the closing speed (the restitution) comes back as a bounce.
// 4. The bearing. Water pressure presses the head's flange up against a stack of washers. That
//    seals the joint and makes friction, torque = μ × (pressure × seal area + bearing spring)
//    × washer radius. Friction holds the head still against the spring's push and stops it a few
//    degrees after each blow.
// 5. The trip. In part-circle use, a lever on the head meets a collar at each end of the arc and
//    flips. Flipped, it puts a tab in the arm's way: the arm now hits the tab early in its
//    outward swing, and those blows drive the head backwards, quickly, until the lever meets the
//    other collar and flips back.
export const IMPACT = {
  Ia: 2.4e-4,        // arm about its pin, kg·m²: about 95 g of brass, spoon 65 mm out, counterweight
  Ib: 1.2e-4,        // head (body, nozzle, bridge) about the bearing axis, kg·m²
  rSpoon: 0.065,     // pin to spoon, m
  zone: 0.1,         // the swing over which the spoon is in the jet: 6.5 mm of arc at 65 mm
  share: 0.35,       // part of the jet's momentum flux turned into sideways push on the spoon
  lSpoon: 0.045,     // length of the water's path along the spoon, m
  k: 0.008,          // arm spring, N·m per radian
  pre: 0.9,          // arm spring preload, radians of wind-up at rest
  e: 0.4,            // restitution of the brass-on-brass blow
  mu: 0.08,          // washer friction, wet (a PTFE washer between two others)
  aSeal: 2.0e-4,     // area the pressure pushes on, m² (16 mm seal)
  fSpring: 6,        // bearing spring force, N
  rWasher: 0.0095,   // mean radius of the washer stack, m
  tab: 0.5,          // where the trip tab stops the arm, radians of swing (29°)
  max: 2.9,          // the arm meets the back of the bridge here (166°)
};
export function impactForces(P, dmm) {
  const nz = nozzle(P, dmm), c = IMPACT;
  return {
    nz,
    kick: c.share * nz.thrust * c.rSpoon,                      // torque of the jet on the arm, N·m
    fill: nz.v > 0.5 ? (2 * c.lSpoon) / nz.v : 1,              // time for the push to build, s
    friction: c.mu * (P * c.aSeal + c.fSpring) * c.rWasher,    // bearing friction torque, N·m
    preload: c.k * c.pre,
  };
}
export function makeImpact() {
  const c = IMPACT;
  const st = { phi: 0, u: 0, psi: 0, wb: 0, full: 0, rev: false, t: 0, beats: 0, lastBeat: 0, period: 0, step: 0, psiAtBeat: 0, swing: 0, peak: 0, hit: 0, hitKind: '', resting: true, flips: 0 };
  // One blow between arm and head. wa, wb: their speeds in the head's forward sense.
  function blow() {
    const wa = st.wb - st.u, rel = wa - st.wb, tot = c.Ia + c.Ib;
    const wb2 = (c.Ia * wa + c.Ib * st.wb + c.Ia * c.e * rel) / tot, wa2 = wb2 - c.e * rel;
    st.wb = wb2; st.u = wb2 - wa2; st.hit = Math.abs(rel);
  }
  // Advance by dt seconds (kept small by the caller). o: { P, d, part, lo, hi } (arc limits, radians).
  st.advance = (dt, o) => {
    const f = impactForces(o.P, o.d), H = 1e-4;
    let n = Math.max(1, Math.ceil(dt / H)); const h = dt / n;
    while (n--) {
      st.t += h;
      const inJet = st.phi < c.zone;
      st.full = inJet ? st.full + (1 - st.full) * (1 - Math.exp(-h / f.fill)) : 0;
      const tArm = (inJet ? st.full * f.kick : 0) - c.k * (st.phi + c.pre);   // outward torque on the arm
      if (st.resting) {
        // arm lying on the anvil: the two turn as one until the jet lifts the arm off
        if (tArm > 0) st.resting = false;
        else {
          if (st.wb !== 0) { const dw = (f.friction / (c.Ia + c.Ib)) * h; st.wb = Math.abs(st.wb) <= dw ? 0 : st.wb - Math.sign(st.wb) * dw; }
          st.psi += st.wb * h; st.u = 0; st.phi = 0;
        }
      }
      if (!st.resting) {
        // arm: Ia·(d²phi/dt²) = tArm, in the frame of the head (the head moves little and slowly)
        // head: the spring's reaction pushes it backwards; friction resists (and normally holds it)
        const tb = -c.k * (st.phi + c.pre);
        if (st.wb !== 0) { const wbN = st.wb + ((-Math.sign(st.wb) * f.friction + tb) / c.Ib) * h; st.wb = Math.sign(wbN) !== Math.sign(st.wb) ? 0 : wbN; }
        else if (Math.abs(tb) > f.friction) st.wb = ((tb + f.friction) / c.Ib) * h;
        st.psi += st.wb * h;
        st.u += (tArm / c.Ia) * h; st.phi += st.u * h;
        if (st.phi > st.peak) st.peak = st.phi;
        const stopOut = st.rev && o.part ? c.tab : c.max;
        if (st.phi >= stopOut && st.u > 0) { st.phi = stopOut; blow(); st.hitKind = st.rev && o.part ? 'tab' : 'bridge'; st.onHit?.(st.hitKind, st.hit); }
        if (st.phi <= 0 && st.u < 0) {
          st.phi = 0; blow(); st.hitKind = 'anvil'; st.onHit?.('anvil', st.hit);
          st.beats++; st.period = st.t - st.lastBeat; st.lastBeat = st.t; st.step = st.psi - st.psiAtBeat; st.psiAtBeat = st.psi; st.swing = st.peak; st.peak = 0;
          if (st.u < 0.3) { st.u = 0; st.resting = true; }
        }
      }
      // the trip lever meets a collar
      if (o.part) {
        if (!st.rev && st.psi >= o.hi) { st.rev = true; st.flips++; }
        else if (st.rev && st.psi <= o.lo) { st.rev = false; st.flips++; }
      } else st.rev = false;
    }
  };
  return st;
}

// ---------------------------------------------------------------- how much reaches the roots
// Field application efficiency: the share of the water delivered to the field that ends up stored
// where roots can use it.
//   fao: indicative values from FAO Irrigation Water Management Training Manual No. 4,
//        "Irrigation Scheduling" (Brouwer, Prins and Heibloem, 1989), Table 8:
//        surface (border, furrow, basin) 60%, sprinkler 75%, drip 90%.
//   lo, hi: the range the Indian Council of Agricultural Research gives, as quoted by the
//        Ministry of Jal Shakti (Press Information Bureau, 4 December 2025, release 2198945):
//        "only 30-50% in conventional flood irrigation", micro-irrigation "as high as 80-95%".
//        No such official range was found for sprinklers alone, so only FAO's figure is shown.
export const METHODS = {
  flood: { name: 'Flood', fao: 60, lo: 30, hi: 50 },
  sprinkler: { name: 'Sprinkler', fao: 75, lo: null, hi: null },
  drip: { name: 'Drip', fao: 90, lo: 80, hi: 95 },
};
// Water to pump for a crop that needs `need` mm a day over `ha` hectares: gross = net ÷ efficiency.
// 1 mm over 1 hectare is 10,000 litres.
export function waterBudget(need, eff, ha = 1) {
  const net = need * 10000 * ha, gross = net / (eff / 100);
  return { net, gross, lost: gross - net };
}
// A centre pivot of length L turning once in T hours. The pipe at distance r sweeps a ring of
// circumference 2πr, so each metre of pipe must deliver flow in proportion to r, and the outer
// tower travels at 2πL/T.
export function pivot(L, T, mmPerTurn) {
  const area = Math.PI * L * L, Q = (area * mmPerTurn) / 1000 / (T * 3600);    // m³/s
  return { area, ha: area / 10000, endSpeed: (2 * Math.PI * L) / (T * 60), Q, lps: Q * 1000, perMetreEnd: (2 * Q) / L };
}

// ---------------------------------------------------------------- the fire sprinkler
// Hot gas from a fire rises, hits the ceiling and spreads out as a thin, fast layer: the ceiling
// jet. Alpert's correlations (R. L. Alpert, Fire Technology 8, 1972; NFPA 72 Annex B; SFPE
// Handbook) give its temperature rise ΔT (K) and speed U (m/s) at distance r from the fire's
// centre line under a ceiling H above the fire, for a fire releasing Q kilowatts:
//   ΔT = 16.9·Q^(2/3) / H^(5/3)            for r/H ≤ 0.18
//   ΔT = 5.38·(Q/r)^(2/3) / H              for r/H > 0.18
//   U  = 0.96·(Q/H)^(1/3)                  for r/H ≤ 0.15
//   U  = 0.197·Q^(1/3)·H^(1/2) / r^(5/6)   for r/H > 0.15
export function ceilingJet(Q, H, r) {
  if (!(Q > 0)) return { dT: 0, U: 0 };
  const dT = r / H <= 0.18 ? (16.9 * Math.pow(Q, 2 / 3)) / Math.pow(H, 5 / 3) : (5.38 * Math.pow(Q / r, 2 / 3)) / H;
  const U = r / H <= 0.15 ? 0.96 * Math.pow(Q / H, 1 / 3) : (0.197 * Math.pow(Q, 1 / 3) * Math.sqrt(H)) / Math.pow(r, 5 / 6);
  return { dT, U };
}
// A fire that is free to grow is modelled as Q = α·t² (NFPA 72 Annex B; NFPA 92):
// slow 0.00293, medium 0.01172, fast 0.0469 kW/s².
export const GROWTH = { slow: { name: 'Slow', a: 0.00293 }, medium: { name: 'Medium', a: 0.01172 }, fast: { name: 'Fast', a: 0.0469 } };
// The glass bulb lags behind the gas around it. Response Time Index (RTI, in √(m·s)):
//   dTbulb/dt = √U · (Tgas − Tbulb) / RTI   (Heskestad and Bill, 1988; the model behind DETACT).
// NFPA 13: a fast-response element has RTI 50 or less, a standard-response one 80 or more.
// Typical values used here: a 3 mm bulb 35, a 5 mm bulb 110.
export const RESPONSE = { quick: { name: 'Quick (3 mm bulb)', rti: 35 }, standard: { name: 'Standard (5 mm bulb)', rti: 110 } };
// Bulb colours and the temperature each bursts at (NFPA 13 temperature classifications; the same
// colours are in ISO 6182-1 and EN 12259-1).
export const BULBS = [
  { c: 57, name: 'Orange', hex: 0xff8a2a, cls: 'ordinary' },
  { c: 68, name: 'Red', hex: 0xe53030, cls: 'ordinary' },
  { c: 79, name: 'Yellow', hex: 0xf2d43a, cls: 'intermediate' },
  { c: 93, name: 'Green', hex: 0x3fbf5a, cls: 'intermediate' },
  { c: 141, name: 'Blue', hex: 0x3f7bff, cls: 'high' },
];
