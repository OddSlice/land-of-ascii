// Candidate C — "Semantic mosaic" (the ambitious one).
// 6x12 px cells (240x75). The engine casts 2x4 rays per cell (2x6 tested: no visible gain). Every cell gets exactly two palette
// colours and one glyph, chosen two ways:
//   * edge cells (two objects meet, or one object at two depths): the 8 samples split into two
//     groups and the 8-bit pattern indexes a table, built once, of the best-fitting shape among
//     ~300 hand-built masks (half and eighth blocks, quadrants, sextants, octants, smooth-mosaic
//     wedges), so silhouettes are traced by the glyph's shape instead of smeared by averaging;
//   * interior cells: the material's own vocabulary (tufts, waves, crags, flakes, leaf clubs,
//     needles, bark, mortar joints placed from world coordinates) in a neighbouring step of the
//     material's ramp; fog as calm layers (near, far ramp, haze, horizon); firelight as a warm
//     ramp; the sky as dithered bands with stars scattered per cell.
import { Frame } from './compose.js';
import { blockFamilies, dedupe, buildShapeLUT, HAND6, parse, shade, mask } from './glyphs.js';
import { makeLook } from './look.js';
import { R } from './semantic.js';
import { sampleGrid } from './samples.js';
import { bayer4, hash2, clamp } from './color.js';
import { K } from './gbuffer.js';

const CW = 6, CH = 12, SX = 2;
let SY = 6, YS = [1, 3, 5, 7, 9, 11];
const XS = [1, 4];
export const INFO = { id: 'c', title: 'Semantic mosaic', cellW: CW, cellH: CH, sampleGrid: '2x4 rays per cell', colorsPerCell: 2 };
const GRIDS = { 6: [1, 3, 5, 7, 9, 11], 4: [1, 4, 7, 10] };

const transitions = m => { let t = 0; for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const v = m[y * CW + x]; if (x + 1 < CW && m[y * CW + x + 1] !== v) t++; if (y + 1 < CH && m[(y + 1) * CW + x] !== v) t++; } return t; };
const SETUPS = {};
let SETUP = null;
function setup() {
  if (SETUPS[SY]) return (SETUP = SETUPS[SY]);
  const t0 = performance.now();
  const fam = dedupe(blockFamilies(CW, CH));
  const penalty = g => transitions(g.m) * 0.01 + (g.fam === 'octant' || g.fam === 'quad' || g.fam === 'sextant' ? 0.04 : 0);
  const { lut } = buildShapeLUT(fam, CW, CH, SX, SY, penalty);
  const hand = Object.fromEntries(Object.entries(HAND6).map(([k, v]) => [k, parse(v)]));
  // Marks drawn at one height in every cell line up into rows; each mark gets shifted copies.
  const shifted = (m, dx, dy) => mask(CW, CH, (x, y) => { const sx = x - dx, sy = y - dy; return sx >= 0 && sx < CW && sy >= 0 && sy < CH ? m[sy * CW + sx] : 0; });
  const jitter = {};
  for (const [k, m] of Object.entries(hand)) {
    let top = CH, bot = -1; for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (m[y * CW + x]) { top = Math.min(top, y); bot = Math.max(bot, y); }
    const list = [];
    for (let dy = -top; dy <= CH - 1 - bot; dy++) for (const dx of [-1, 0, 1]) list.push(shifted(m, dx, dy));
    jitter[k] = list;
  }
  SETUP = SETUPS[SY] = { fam, lut, hand, jitter, shades: [null, shade(CW, CH, 1), shade(CW, CH, 2), shade(CW, CH, 3)], setupMs: performance.now() - t0 };
  return SETUP;
}
// How often a material shows a mark in a near cell, and its marks.
const MARKS = {
  [R.grass]: [0.5, ['tick', 'pair', 'three', 'tufts', 'pair']], [R.grass2]: [0.5, ['tick', 'three', 'pair', 'three']],
  [R.road]: [0.45, ['grit', 'pebbles', 'pebble', 'grit']], [R.rock]: [0.5, ['pebbles', 'crag', 'pebble', 'crag']],
  [R.snow]: [0.4, ['dot', 'flake', 'dot']], [R.water]: [0.55, ['wave', 'ripple', 'wave', 'waves']],
  [R.leaf]: [0.6, ['club', 'leafo', 'club', 'leafpct']], [R.conifer]: [0.6, ['needles']],
  [R.cloud]: [0.25, ['ripple']],
};
const FAR_MARKS = { [R.grass]: 'dot', [R.grass2]: 'grit', [R.rock]: 'pebbles', [R.road]: 'grit', [R.leaf]: 'dot', [R.conifer]: 'dot', [R.water]: 'ripple' };

export function render(G, opts = {}) {
  SY = opts.raysY || 4; YS = GRIDS[SY]; INFO.sampleGrid = `2x${SY} rays per cell`;
  const S = setup();
  const meta = G.meta, look = makeLook(meta);
  const cols = Math.floor(G.W / CW), rows = Math.floor(G.H / CH), F = new Frame(cols, rows, CW, CH);
  const id = m => F.addMask(m);
  const SPACE = id(mask(CW, CH, () => 0)), FULL = id(mask(CW, CH, () => 1));
  const SHADE = [SPACE, id(S.shades[1]), id(S.shades[2]), id(S.shades[3])];
  const LUTG = S.fam.map(g => id(g.m));
  const H = Object.fromEntries(Object.entries(S.hand).map(([k, m]) => [k, id(m)]));
  const HJ = Object.fromEntries(Object.entries(S.jitter).map(([k, list]) => [k, list.map(id)]));
  const markGlyph = (name, h) => { const L = HJ[name]; return L[Math.floor(h * L.length) % L.length]; };

  const t0 = performance.now();
  const A = sampleGrid(G, CW, CH, SX, SY, XS, YS);
  const t1 = performance.now();

  const { seg, ramp, pos, fog, lit, depth, kind, pix, SW } = A;
  const pl = { bg: 0, fg: 0, fgDark: 0, level: 0, marks: false, layer: 0 };
  const yawCols = Math.round(meta.cam.yaw / (meta.fov / cols));
  const starAmt = meta.palette.stars, f = meta.f;
  const NS = SX * SY, grp = new Uint8Array(NS), idx = new Int32Array(NS);
  const same = (i, j) => seg[i] === seg[j] && !(kind[i] === K.TERRAIN && Math.abs(Math.log(depth[i] / depth[j])) > 0.2);
  let edges = 0, refl = 0, reflRamp = 0, reflPos = 0, reflFog = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const base = r * SY * SW + c * SX, d = bayer4(c, r);
    for (let k = 0; k < NS; k++) idx[k] = base + ((k / SX) | 0) * SW + (k % SX);
    const i0 = idx[0];
    // Seed the second group with the sample least like the first (another object, or a ridge).
    let seedB = -1;
    for (let k = 1; k < NS && seedB < 0; k++) if (!same(idx[k], i0)) seedB = idx[k];
    if (seedB >= 0) {
      let pat = 0, nB = 0, aP = 0, aF = 0, aL = 0, bP = 0, bF = 0, bL = 0;
      for (let k = 0; k < NS; k++) {
        const i = idx[k];
        const b = same(i, i0) ? 0 : same(i, seedB) ? 1 : (Math.abs(pos[i] - pos[seedB]) + Math.abs(fog[i] - fog[seedB]) < Math.abs(pos[i] - pos[i0]) + Math.abs(fog[i] - fog[i0]) ? 1 : 0);
        grp[k] = b;
        if (b) { pat |= 1 << k; nB++; bP += pos[i]; bF += fog[i]; bL += lit[i]; } else { aP += pos[i]; aF += fog[i]; aL += lit[i]; }
      }
      const nA = NS - nB;
      const ca = look.solid(ramp[i0], aP / nA, aF / nA, aL / nA, kind[i0]);
      const cb = look.solid(ramp[seedB], bP / nB, bF / nB, bL / nB, kind[seedB]);
      if (ca !== cb) {
        const fl = kind[seedB] === K.FLAME ? seedB : kind[i0] === K.FLAME ? i0 : -1;
        if (fl >= 0 && depth[fl] > 70) { const bgc = fl === seedB ? ca : cb; F.set(c, r, H.spark, look.solid(R.fire, 0.8, 0, 0, K.FLAME), bgc); edges++; continue; }
        const e = S.lut[pat], g = LUTG[e >> 1];
        if (e & 1) F.set(c, r, g, ca, cb); else F.set(c, r, g, cb, ca);
        edges++;
        continue;
      }
    }
    // ---- interior cell: the material speaks ----
    let P = 0, Fg = 0, L = 0;
    for (let k = 0; k < NS; k++) { const i = idx[k]; P += pos[i]; Fg += fog[i]; L += lit[i]; }
    P /= NS; Fg /= NS; L /= NS;
    let rf = 0, rk = 0;
    for (let k = 0; k < NS; k++) if (A.refl[idx[k]] > rf) { rf = A.refl[idx[k]]; rk = idx[k]; }
    refl = rf; reflRamp = A.reflRamp[rk]; reflPos = A.reflPos[rk]; reflFog = A.reflFog[rk];
    interior(c, r, kind[i0], ramp[i0], P, Fg, L, same(idx[4], i0) ? pix[idx[4]] : pix[i0], d, depth[i0]);
  }
  const t2 = performance.now();

  function interior(c, r, kd, rp, P, Fg, L, p, d, dep) {
    const ch = G.ch;
    if (kd === K.SKY) {
      const n = look.nearP[R.sky].length, X = P * (n - 1), k = Math.min(n - 2, Math.floor(X)), a = X - k;
      let bg = look.nearP[R.sky][k], fg = look.nearP[R.sky][k + 1];
      let g = a < 0.25 ? SPACE : a < 0.5 ? SHADE[1] : a < 0.75 ? SHADE[2] : SHADE[3];
      const glow = ch.u[p];
      if (glow > 0.12) { fg = look.glow; g = glow < 0.25 ? SHADE[1] : glow < 0.45 ? SHADE[2] : glow < 0.6 ? SHADE[3] : FULL; }
      if (starAmt > 0.05 && P < 0.85) {
        const h = hash2(c + yawCols, r, 77);
        if (h < 0.05 * starAmt) { F.set(c, r, h < 0.006 ? H.star3 : h < 0.018 ? H.star2 : H.star1, h < 0.012 ? look.starBright : look.star, bg); return; }
      }
      F.set(c, r, g, fg, bg); return;
    }
    look.plan(rp, P, Fg, L, kd, pl);
    const bg = pl.bg;
    if (kd === K.SUN || kd === K.MOON) { F.set(c, r, SPACE, bg, bg); return; }
    // Stone walls keep their mortar through tone changes: the courses are the wall's character.
    if (kd === K.WALL && rp === R.stone && pl.layer !== 2 && pl.layer !== 3) {
      const g = mortar(c, r);
      if (g !== SPACE) { const t = pl.level ? pl.bg : bg; F.set(c, r, g, darker(pl, t), t); return; }
    }
    // Water keeps its own colour; what stands on the far shore shows in it as broken strokes.
    if (rp === R.water && refl > 0.12 && pl.layer < 2) {
      const rc = look.solid(reflRamp, reflPos, reflFog, 0, K.TERRAIN);
      const h = hash2(c, r, 41), h2 = hash2(c + 3, r, 43);
      const w = h2 < refl * 1.1 ? (h < 0.4 ? 'waves' : h < 0.75 ? 'wave' : 'ripple') : null;
      F.set(c, r, w ? markGlyph(w, h) : SPACE, rc, bg); return;
    }
    if (pl.level) { F.set(c, r, SHADE[pl.level], pl.fg, bg); return; }
    if (pl.layer >= 2) { F.set(c, r, SPACE, bg, bg); return; }
    if (kd === K.TRUNK) { F.set(c, r, H.bark, darker(pl, bg), bg); return; }
    const u = ch.u[p], v = ch.v[p];
    // World-anchored marks at the scale of one cell's footprint (stable as you walk), sparser far off.
    let h1, h2;
    if (kd === K.TERRAIN) { const fp = Math.max(0.02, dep * CW / f); h1 = hash2(Math.floor(u / fp), Math.floor(v / fp), rp * 31 + 7); h2 = hash2(Math.floor(u / fp) + 17, Math.floor(v / fp), 99); }
    else { h1 = hash2(c, r, ch.obj[p] * 13 + kd); h2 = hash2(c + 7, r, ch.obj[p] * 7 + 3); }
    const h3 = hash2(c * 3 + 1, r * 5 + 2, 1234);
    if (pl.layer === 1) {
      const fm = FAR_MARKS[rp];
      if (fm && h1 < 0.3) { F.set(c, r, markGlyph(fm, hash2(c, r, 3)), darker(pl, bg), bg); return; }
      F.set(c, r, SPACE, bg, bg); return;
    }
    const mk = MARKS[rp];
    if (!mk) { F.set(c, r, SPACE, bg, bg); return; }
    const rate = mk[0] * clamp(1.3 - dep / 150, 0.15, 1);
    if (h1 > rate) { F.set(c, r, SPACE, bg, bg); return; }
    const glyph = markGlyph(mk[1][Math.floor(h2 * mk[1].length)], h3);
    // marks catch the light on the lit side of things and sink into the shade on the other
    const up = pl.warm ? true : P > 0.55 ? h2 > 0.25 : h2 > 0.75;
    F.set(c, r, glyph, up ? lighter(pl, bg) : darker(pl, bg), bg);
  }
  // Two steps away on the same ramp where the ramp allows, for marks that read at a glance.
  function lighter(pl, bg) { const L = pl.ramp; if (!L) return pl.fg; const t = pl.tone; return L[clamp(t + 2, 0, L.length - 1)] !== bg ? L[clamp(t + 2, 0, L.length - 1)] : L[clamp(t - 1, 0, L.length - 1)]; }
  function darker(pl, bg) { const L = pl.ramp; if (!L) return pl.fgDark; const t = pl.tone; return L[clamp(t - 2, 0, L.length - 1)] !== bg ? L[clamp(t - 2, 0, L.length - 1)] : L[clamp(t + 1, 0, L.length - 1)]; }
  // Stone walls: mortar where the voxel courses and the running-bond joints fall inside this cell.
  function mortar(c, r) {
    const ch = G.ch, W = G.W, x0 = c * CW, y0 = r * CH;
    const vTop = ch.v[y0 * W + x0 + 1], vBot = ch.v[(y0 + CH - 1) * W + x0 + 1];
    const pxPerUnit = Math.abs(vTop - vBot) > 1e-6 ? (CH - 1) / Math.abs(vTop - vBot) : 99;
    if (pxPerUnit < 4) return SPACE;
    const m = new Uint8Array(CW * CH);
    let any = false;
    for (let y = 1; y < CH; y++) {
      const va = ch.v[(y0 + y - 1) * W + x0 + 1], vb = ch.v[(y0 + y) * W + x0 + 1];
      if (Math.floor(va) !== Math.floor(vb)) { for (let x = 0; x < CW; x++) m[y * CW + x] = 1; any = true; }
    }
    if (pxPerUnit >= 7) {
      const ua = ch.u[(y0 + 6) * W + x0 + 1], ub = ch.u[(y0 + 6) * W + x0 + 4];
      for (let y = 0; y < CH; y++) {
        const course = Math.floor(ch.v[(y0 + y) * W + x0 + 1]), off = course & 1 ? 0.5 : 0;
        for (let x = 1; x < CW; x++) {
          const ux0 = ua + (ub - ua) * (x - 1.5) / 3, ux1 = ua + (ub - ua) * (x - 0.5) / 3;
          if (Math.floor(ux0 + off) !== Math.floor(ux1 + off)) { m[y * CW + x] = 1; any = true; }
        }
      }
    }
    return any ? id(m) : SPACE;
  }

  // ---- overlays: the air around a fire glows, sparks rise ----
  const dark = meta.light.darkness;
  if (dark > 0.3) for (const fl of meta.flames) {
    if (fl.zc > 150) continue;
    const fc = fl.col / CW, fr = (fl.rowBot - fl.heightPx * 0.5) / CH;
    const R0 = clamp(fl.heightPx / CH * 2.4, 1.5, 9) * (fl.kind === 'fire' ? 1.3 : 0.8);
    for (let r = Math.floor(fr - R0); r <= Math.ceil(fr + R0 * 0.6); r++) for (let c = Math.floor(fc - R0 * 2); c <= Math.ceil(fc + R0 * 2); c++) {
      if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
      const dx = (c + 0.5 - fc) / 2, dy = r + 0.5 - fr, q = Math.sqrt(dx * dx + dy * dy) / R0;
      if (q >= 1) continue;
      const i = r * cols + c;
      if (F.glyph[i] !== SPACE) continue;                  // leave shapes and marks alone; tint only plain cells
      const lv = q < 0.35 ? 2 : q < 0.7 ? 1 : 0;
      if (lv === 0 && hash2(c, r, 5) > 0.5) continue;
      F.glyph[i] = SHADE[lv + 1]; F.fg[i] = look.litP[Math.min(look.litP.length - 1, q < 0.35 ? 3 : 2)];
    }
    if (fl.kind === 'fire') for (let k = 0; k < 7; k++) {
      const h = hash2(k, Math.round(fl.col), 17), c = Math.round(fc + (h - 0.5) * 3), r = Math.round((fl.rowBot - fl.heightPx) / CH - 1 - k * 0.9 - h);
      if (c < 0 || c >= cols || r < 0 || r >= rows || h > 0.8) continue;
      const i = r * cols + c;
      F.glyph[i] = k < 2 ? H.spark : H.ember; F.fg[i] = look.solid(R.fire, 0.9 - k * 0.08, 0, 0, K.FLAME);
    }
  }
  // ---- overlays: birds as glyphs ----
  for (const b of meta.birds) {
    const c = Math.floor(b.col / CW), r = Math.floor(b.row / CH);
    if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
    const i = r * cols + c;
    F.glyph[i] = b.frame === 0 ? H.birdv : b.frame === 1 ? H.birdm : H.birdup;
    F.fg[i] = look.bird;
  }
  const t3 = performance.now();
  return { frame: F, timings: { samplesMs: t1 - t0, cellsMs: t2 - t1, overlaysMs: t3 - t2, setupMs: S.setupMs }, stats: { cells: cols * rows, edgeCells: edges, glyphsInSet: S.fam.length + Object.keys(S.hand).length + 4, palette: look.kf } };
}
