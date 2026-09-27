// Candidate B — "Ink & paper" (pure text: the picture is made of letters).
// 8x16 px cells (180x56), a hand-drawn 8x16 letter set, one letter colour per cell from a fixed
// 16-colour set, and one page colour for the whole screen:
//   * by day the page is paper and letters are ink: the darker a surface, the denser its letters
//     (typewriter-art rules), so the bright sky is open paper;
//   * at dusk and night the page turns dark and letters glow: the brighter, the denser.
// Each material has its own letters at each density (grass , ; v x &, water - ~ =, rock : ^ % #,
// leaves ' ; * % &, stone : = + # M ...), varied per cell by a world-anchored hash.
// The engine casts 2x4 rays per cell; where they split across a silhouette (an object against sky
// or against something much farther) the cell becomes a stroke | - _ / \ following the split,
// drawn in the nearer object's colour (the edge-glyph idea, driven by object ids and depth).
import { Frame } from './compose.js';
import { HAND8, parse } from './glyphs.js';
import { makeLook } from './look.js';
import { R } from './semantic.js';
import { sampleGrid } from './samples.js';
import { hex, packRGB, unpack, oklab, dist2, luma, hash2, clamp } from './color.js';
import { K } from './gbuffer.js';

const CW = 8, CH = 16;
export const INFO = { id: 'b', title: 'Ink & paper', cellW: CW, cellH: CH, sampleGrid: '2x4 rays per cell', colorsPerCell: '1 + page' };
const INKS = ['#0b0d13', '#ebe6d6', '#1f3563', '#3a6ea5', '#7fb0d6', '#1f4a2e', '#4c8a3a', '#a8c95a', '#5c3d24', '#b08545', '#545a66', '#a3a095', '#b23c2c', '#e0822f', '#f2cf63', '#6a4a7c'].map(hex);
// Letters per density level (0 = empty page .. 8 = densest), per material.
const LETTERS = {
  any:   [' ', '.`', ".,'", ':;', 'ic+', 'osx', 'ea%', '&8#', '@MW'],
  grass: [' ', '.`', ",.'", ";:,", 'iv;', 'vx', 'x%v', '&8', '@M'],
  water: [' ', '.', '-.', '~-', '=~', '~=', '=~s', '#=', 'MW'],
  rock:  [' ', '.`', ':.', '^:', '/^\\', '%/', '8%', '#8', 'MW'],
  snow:  [' ', '.', '`.', ':', '+:', '*+', '*', 'O*', '@O'],
  road:  [' ', '.', ',.', ':,', 'c:', 'oc', 'eo', '&e', '@&'],
  leaf:  [' ', '.', "'.", ";'", '*;', '%*', '&%', '@&', 'M@'],
  stone: [' ', '.', ':.', '=:', '+=', '#+', '#', 'M#', 'WM'],
  wood:  [' ', '.', '-', '=-', 'l=', '|l', '#|', '8#', 'M8'],
  skin:  [' ', '.', 'o', 'o', 'oO', 'O', 'O@', '@', '@'],
  fire:  ['.', '*', '^*', '*^', '&*', '@&', '@', 'M@', 'M'],
};
const RAMP_LETTERS = { [R.grass]: 'grass', [R.grass2]: 'grass', [R.water]: 'water', [R.rock]: 'rock', [R.snow]: 'snow', [R.road]: 'road', [R.leaf]: 'leaf', [R.conifer]: 'leaf', [R.stone]: 'stone', [R.wood]: 'wood', [R.skin]: 'skin', [R.fire]: 'fire', [R.lit]: 'road' };

export function render(G) {
  const meta = G.meta, look = makeLook(meta);
  const paper = look.kf === 'day';
  const cols = Math.floor(G.W / CW), rows = Math.floor(G.H / CH), F = new Frame(cols, rows, CW, CH);
  const gid = Object.fromEntries(Object.entries(HAND8).map(([k, v]) => [k, F.addMask(parse(v))]));
  const inkLab = INKS.map(oklab), inkP = INKS.map(packRGB);
  const page = paper ? 1 : 0, pageP = inkP[page];
  // nearest ink that isn't the page (and isn't paper on a dark page)
  const nearest = rgb => { const L = oklab(rgb); let b = -1, bd = 1e9; for (let i = 0; i < INKS.length; i++) { if (i === page || (!paper && i === 1)) continue; const d = dist2(L, inkLab[i]); if (d < bd) { bd = d; b = i; } } return inkP[b]; };
  const t0 = performance.now();
  const A = sampleGrid(G, CW, CH, 2, 4, [2, 6], [2, 6, 10, 14]);
  const t1 = performance.now();
  const { seg, ramp, pos, fog, lit, kind, depth, pix, SW } = A;
  const f = meta.f, yawCols = Math.round(meta.cam.yaw / (meta.fov / cols)), starAmt = meta.palette.stars;
  const same = (i, j) => seg[i] === seg[j] && !(kind[i] === K.TERRAIN && Math.abs(Math.log(depth[i] / depth[j])) > 0.2);
  const colOf = i => unpack(look.solid(ramp[i], pos[i], fog[i], lit[i], kind[i]));
  const inkFor = rgb => {
    if (paper) return nearest(rgb.map(v => v * 0.75));
    const m = Math.max(1, ...rgb), k = Math.min(3.5, 225 / m);   // same hue, lifted toward full brightness
    return nearest(rgb.map(v => v * k));
  };
  const idx = new Int32Array(8);
  let strokes = 0;
  const ys = [];
  for (let i = 0; i < ramp.length; i += 7) if (kind[i] !== K.SKY) ys.push(luma(colOf(i)));
  ys.sort((a, b) => a - b);
  const lo = ys[Math.floor(ys.length * 0.04)] || 0, hi = ys[Math.floor(ys.length * 0.97)] || 1;
  const expose = Y => clamp((Y - lo) / Math.max(0.05, hi - lo), 0, 1);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const base = r * 4 * SW + c * 2;
    for (let k = 0; k < 8; k++) idx[k] = base + (k >> 1) * SW + (k & 1);
    const i0 = idx[0];
    let other = -1, pat = 0;
    for (let k = 0; k < 8; k++) if (!same(idx[k], i0)) { pat |= 1 << k; if (other < 0) other = idx[k]; }
    if (other >= 0) {
      // A silhouette: one side is sky, or much farther than the other.
      const ratio = Math.max(depth[i0], depth[other]) / Math.max(0.5, Math.min(depth[i0], depth[other]));
      if (kind[i0] === K.SKY || kind[other] === K.SKY || ratio > 1.35) {
        const nearI = depth[i0] <= depth[other] ? i0 : other;
        let top = 0, bot = 0, left = 0, right = 0, dA = 0;
        const isNear = k => (idx[k] === nearI) || same(idx[k], nearI);
        for (let k = 0; k < 8; k++) { const b = isNear(k) ? 1 : 0, x = k & 1, y = k >> 1; if (y < 2) top += b; else bot += b; if (x === 0) left += b; else right += b; dA += b * ((x - 0.5) * 2) * ((y - 1.5) / 1.5); }
        const vS = Math.abs(left - right), hS = Math.abs(top - bot);
        let ch;
        if (vS >= 3 && hS <= 2) ch = '|';
        else if (hS >= 3 && vS <= 1) ch = bot > top ? (bot >= 4 && top === 0 ? '-' : '_') : '-';
        else ch = (dA > 0) === (left > right) ? '\\' : '/';
        if (vS === 0 && hS === 0) ch = '-';
        F.set(c, r, gid[ch], inkFor(colOf(nearI)), pageP);
        strokes++;
        continue;
      }
    }
    // A fill cell: the mean colour's darkness (paper) or brightness (ink) picks the density.
    let R0 = 0, G0 = 0, B0 = 0;
    for (let k = 0; k < 8; k++) { const col = colOf(idx[k]); R0 += col[0]; G0 += col[1]; B0 += col[2]; }
    const mean = [R0 / 8, G0 / 8, B0 / 8], Y = luma(mean), kd = kind[i0];
    const h = hash2(c + (kd === K.SKY ? yawCols : 0), r, 77);
    if (kd === K.SKY) {
      if (!paper && starAmt > 0.05 && h < 0.06 * starAmt) { F.set(c, r, gid[h < 0.01 ? '*' : h < 0.025 ? '+' : '.'], inkP[h < 0.012 ? 14 : 4], pageP); continue; }
      const t = pos[i0];                                   // 0 zenith .. 1 horizon
      const glow = G.ch.u[pix[i0]];
      if (glow > 0.2) { F.set(c, r, gid[glow > 0.5 ? 'O' : glow > 0.3 ? '*' : '+'], inkP[14], pageP); continue; }
      const dens = paper ? 0.5 * (1 - t) : 0.35 * t;         // paper: a little hatching high up; ink: a glow along the horizon
      const lv = h < dens * 0.6 ? (h < dens * 0.2 ? 2 : 1) : 0;
      F.set(c, r, gid[[' ', '.', '-'][lv]], inkFor(mean), pageP); continue;
    }
    const v = paper ? Math.pow(1 - expose(Y), 1.5) * 0.92 : 0.08 + expose(Y) * 0.92;
    const lvl = clamp(Math.floor(Math.pow(v, paper ? 1.1 : 0.85) * 9.4 + (h - 0.5) * 0.9), 0, 8);
    const set = LETTERS[RAMP_LETTERS[ramp[i0]] || 'any'];
    const opts = set[lvl], letter = opts[Math.floor(hash2(c + 11, r * 3 + 1, 5) * opts.length)];
    F.set(c, r, gid[letter], inkFor(mean), pageP);
  }
  for (const b of meta.birds) {
    const c = Math.floor(b.col / CW), r = Math.floor(b.row / CH);
    if (c >= 0 && c < cols && r >= 0 && r < rows) F.set(c, r, gid[b.frame === 0 ? 'v' : b.frame === 1 ? '~' : '^'], inkP[paper ? 0 : 10], pageP);
  }
  const t2 = performance.now();
  return { frame: F, timings: { samplesMs: t1 - t0, cellsMs: t2 - t1 }, stats: { cells: cols * rows, strokeCells: strokes, palette: paper ? 'sixteen inks on paper' : 'sixteen inks on ink' } };
}
