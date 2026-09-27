// Candidate A — "Chroma blocks" (the safe one; the Swaggerfall lineage done carefully).
// 6x12 px cells (240x75). The engine casts 1x2 rays per cell: the upper-half-block ▀ carries two
// square 6x6 px pixels per cell (fg = top, bg = bottom), so the picture is a 240x150 mosaic in the
// art-directed palette, ordered-dithered (Bayer 4x4) between neighbouring ramp steps. Where both
// halves agree the cell is a flat colour and gets a texture mark instead (tuft, wave, crag...), the
// way terminal games put glyphs over background colours.
import { Frame } from './compose.js';
import { HAND6, parse, mask } from './glyphs.js';
import { makeLook } from './look.js';
import { R } from './semantic.js';
import { sampleGrid } from './samples.js';
import { bayer4, hash2, clamp } from './color.js';
import { K } from './gbuffer.js';

const CW = 6, CH = 12;
export const INFO = { id: 'a', title: 'Chroma blocks', cellW: CW, cellH: CH, sampleGrid: '1x2 rays per cell', colorsPerCell: 2 };
const MARKS = { [R.grass]: ['pair', 'tick', 'three'], [R.grass2]: ['tick', 'three'], [R.road]: ['grit', 'pebble'], [R.rock]: ['crag', 'pebbles'], [R.snow]: ['dot', 'flake'], [R.water]: ['wave', 'ripple'], [R.leaf]: ['leafo', 'club'], [R.conifer]: ['needles'] };

export function render(G) {
  const meta = G.meta, look = makeLook(meta);
  const cols = Math.floor(G.W / CW), rows = Math.floor(G.H / CH), F = new Frame(cols, rows, CW, CH);
  const id = m => F.addMask(m);
  const UPPER = id(mask(CW, CH, (x, y) => y < CH / 2));
  const H = Object.fromEntries(Object.entries(HAND6).map(([k, v]) => [k, id(parse(v))]));
  const t0 = performance.now();
  const A = sampleGrid(G, CW, CH, 1, 2, [3], [3, 9]);
  const t1 = performance.now();
  const { ramp, pos, fog, lit, kind, depth, pix, SW } = A;
  const f = meta.f, yawCols = Math.round(meta.cam.yaw / (meta.fov / cols)), starAmt = meta.palette.stars;
  const colorOf = (i, x, y) => {
    if (kind[i] === K.SKY && G.ch.u[pix[i]] > 0.12) { const g = G.ch.u[pix[i]]; return bayer4(x, y) < g * 1.4 ? look.glow : look.solid(ramp[i], pos[i], 0, 0, kind[i], bayer4(x, y)); }
    if (A.refl[i] > 0 && bayer4(x + 2, y + 1) < A.refl[i] * 0.9) return look.solid(A.reflRamp[i], A.reflPos[i], A.reflFog[i], 0, K.TERRAIN, bayer4(x, y));
    return look.solid(ramp[i], pos[i], fog[i], lit[i], kind[i], bayer4(x, y));
  };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const it = (2 * r) * SW + c, ib = it + SW;
    const top = colorOf(it, c, 2 * r), bot = colorOf(ib, c, 2 * r + 1);
    if (top !== bot) { F.set(c, r, UPPER, top, bot); continue; }
    // Flat cell: a mark from the material's vocabulary in the next ramp step, world-anchored.
    const kd = kind[it], rp = ramp[it];
    if (kd === K.SKY) {
      if (starAmt > 0.05 && hash2(c + yawCols, r, 77) < 0.05 * starAmt) { F.set(c, r, H.star1, look.starBright, bot); continue; }
      F.set(c, r, UPPER, top, bot); continue;
    }
    const mk = MARKS[rp], dep = depth[it];
    if (!mk || fog[it] > 0.16 || dep > 110) { F.set(c, r, UPPER, top, bot); continue; }
    const p = pix[it], u = G.ch.u[p], v = G.ch.v[p], fp = dep * CW / f;
    const h1 = kd === K.TERRAIN ? hash2(Math.floor(u / fp), Math.floor(v / fp), 3) : hash2(c, r, 3), h2 = hash2(c, r, 9);
    if (h1 > 0.55) { F.set(c, r, UPPER, top, bot); continue; }
    const other = look.solid(rp, clamp(pos[it] + (h2 > 0.5 ? 0.3 : -0.3), 0, 1), fog[it], lit[it], kd, 0.5);
    F.set(c, r, H[mk[Math.floor(h2 * mk.length)]], other, bot);
  }
  for (const b of meta.birds) {
    const c = Math.floor(b.col / CW), r = Math.floor(b.row / CH);
    if (c >= 0 && c < cols && r >= 0 && r < rows) { const i = r * cols + c; F.glyph[i] = b.frame === 0 ? H.birdv : b.frame === 1 ? H.birdm : H.birdup; F.fg[i] = look.bird; }
  }
  const t2 = performance.now();
  return { frame: F, timings: { samplesMs: t1 - t0, cellsMs: t2 - t1 }, stats: { cells: cols * rows, palette: look.kf } };
}
