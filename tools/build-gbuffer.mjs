// Build tools/gbuffer/v1-gbuffer.html: the v1 page with its renderer instrumented to record, for
// every pixel it paints, WHAT it painted (terrain, wall, roof, tree, merchant part, sky...), its
// material, its lighting term, depth, world or sprite-local coordinates, point-light contribution
// and water-reflection source. The world simulation is untouched; only the renderer is annotated.
//
// A few of v1's cell-sized details are made resolution-independent here, because the G-buffer is
// rendered with 1x1 px cells and they would otherwise turn into per-pixel noise: the ragged canopy
// edge and conifer jag are hashed in canopy-local units, and trunks get a physical width. Those
// are renderer choices, not world data, so every candidate starts from the same honest geometry.
//
//   node tools/build-gbuffer.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/harness.mjs';

let src = fs.readFileSync(path.join(ROOT, 'reference/v1-index.html'), 'utf8');
function rep(anchor, replacement) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) throw new Error(`anchor found ${n} times:\n${anchor}`);
  src = src.replace(anchor, () => replacement);
}
const after = (anchor, add) => rep(anchor, anchor + add);
const before = (anchor, add) => rep(anchor, add + anchor);

// --- state -----------------------------------------------------------------------------------
after(`  img: null, buf: null, masks: [],
};`, `

// ---- G-buffer instrumentation (added by tools/build-gbuffer.mjs) ----
let forceCell = null, gbOn = true;
const gb = { n: 0 };
function gbAlloc(n) {
  gb.n = n;
  gb.kind = new Uint8Array(n); gb.mat = new Uint8Array(n); gb.face = new Uint8Array(n); gb.tex = new Uint8Array(n);
  gb.shade = new Float32Array(n); gb.u = new Float32Array(n); gb.v = new Float32Array(n); gb.reflAmt = new Float32Array(n);
  gb.obj = new Int32Array(n); gb.light = new Uint32Array(n); gb.refl = new Int32Array(n);
}
// Attributes of the thing about to be painted; paint()/put() copy them into the G-buffer.
let gK = 0, gM = 0, gS = 0, gO = 0, gU = 0, gV = 0, gL = 0, gT = 0, gF = 0;
// gMode 0: u/v as given; 1: wall (v = height above gBase per row); 2: horizontal plane at gPlaneY (u/v = world x/z per row)
let gMode = 0, gPlaneY = 0, gBase = 0, gDist = 0, gDistLo = 0, gLit = false, gLX = 0, gLZ = 0;
const gbMeta = { birds: [], flames: [], sprites: [] };
function merchantPart(u, v, au, bob, spread, lantern, wideEnough) {
  if (u > 0.42 && u < 0.56 && v < 1.75 + bob && v > 0) return 1;           // staff
  if (lantern && u < -0.34 && u > -0.5 && v > 0.62 && v < 0.82) return 2;   // lantern
  if (v < 0.16) return 3;                                                   // boots
  if (v < 0.42) return 4;                                                   // trousers
  if (v < 1.32) {
    if (au < 0.3) { if (v > 0.95 && v < 1.03) return 5; return ((((u * 7 + v * 4) | 0) & 1) && v < 0.9) ? 7 : 6; }   // belt, robe fold, robe
    return v < 0.9 ? 8 : 9;                                                  // hand, sleeve
  }
  if (v < 1.78) {
    const dx = u / 0.2, dy = (v - 1.55) / 0.22;
    if (dx * dx + dy * dy <= 1) return wideEnough && v > 1.55 && v < 1.66 && Math.abs(au - 0.08) < 0.035 ? 11 : 10;   // eye, face
    return 12;                                                              // hat brim
  }
  return 13;                                                                // hat crown
}`);

after(`  grid.cellH = Math.max(3, Math.round(glyphH));`, `
  if (forceCell) { grid.cellW = forceCell.w; grid.cellH = forceCell.h; }`);
after(`  grid.cells = new Uint8Array(n); grid.colors = new Uint32Array(n); grid.depth = new Float32Array(n); grid.flags = new Uint8Array(n);`, `
  gbAlloc(n);`);

// --- point-light contribution on its own ------------------------------------------------------
before(`let skyRow = new Uint32Array(0);`, `// What litColor() would add at a point, packed 0xBBGGRR (clamped), for the G-buffer.
function lightAdd(x, y, z) {
  const TB = TREE_BUCKETS;
  const list = lightBuckets[((Math.floor(z / TREE_BUCKET) % TB + TB) % TB) * TB + ((Math.floor(x / TREE_BUCKET) % TB + TB) % TB)];
  if (list.length === 0) return 0;
  let r = 0, g = 0, b = 0;
  for (let k = 0; k < list.length; k++) {
    const L = list[k];
    const dx = wrapDelta(x - L.x), dz = wrapDelta(z - L.z);
    if (dx > L.r || dx < -L.r || dz > L.r || dz < -L.r) continue;
    const dy = y - L.y, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d >= L.r) continue;
    const a = 1 - d / L.r, att = a * a * L.i * 210;
    r += L.cr * att; g += L.cg * att; b += L.cb * att;
  }
  return pack(r, g, b) & 0xffffff;
}

`);

// --- render(): per-frame reset, paint hook ---------------------------------------------------
rep(`  cells.fill(UNPAINTED);
  depth.fill(Infinity);
  flags.fill(0);`, `  cells.fill(UNPAINTED);
  depth.fill(Infinity);
  flags.fill(0);
  gb.kind.fill(255); gb.refl.fill(-1); gb.reflAmt.fill(0); gb.light.fill(0); gb.tex.fill(0);
  gbMeta.birds = []; gbMeta.flames = []; gbMeta.sprites = [];`);

after(`  let col = 0, ybuf = 0, left = 0, dx = 0, dz = 0;`, `

  // G-buffer: attributes of whatever paint() just claimed, resolved per row where they vary.
  const gbWrite = (i, r) => {
    gb.kind[i] = gK; gb.mat[i] = gM; gb.shade[i] = gS; gb.obj[i] = gO; gb.tex[i] = gT; gb.face[i] = gF;
    const s = ((r + 0.5) * cellH - horizonPix) / f;   // slope of this row's ray below the horizon
    if (gMode === 1) {                                  // wall: u along the face, v = height above the structure base
      const y = camY - s * gDist;
      gb.u[i] = gU; gb.v[i] = y - gBase;
      gb.light[i] = gLit ? lightAdd(gLX, y, gLZ) : 0;
    } else if (gMode === 2) {                           // horizontal surface at gPlaneY: where this row's ray meets it
      let t = s > 1e-6 ? (camY - gPlaneY) / s : gDist;
      if (!(t <= gDist)) t = gDist; else if (t < gDistLo) t = gDistLo;
      const wx = camX + dx * t, wz = camZ + dz * t;
      gb.u[i] = wx; gb.v[i] = wz;
      gb.light[i] = gLit ? lightAdd(wx, gPlaneY, wz) : 0;
    } else { gb.u[i] = gU; gb.v[i] = gV; gb.light[i] = gL; }
  };`);

rep(`      if (cells[i] === UNPAINTED) { cells[i] = g; colors[i] = c; depth[i] = z; flags[i] = flag; left--; }`,
    `      if (cells[i] === UNPAINTED) { cells[i] = g; colors[i] = c; depth[i] = z; flags[i] = flag; left--; if (gbOn) gbWrite(i, r); }`);

// terrain
before(`    paint(row, ybuf, g, c, z, flag);`, `    gK = 1; gM = m; gS = shade[idx] + (m === MAT.WATER ? 0.12 : 0); gO = idx; gT = tx | (flag === 3 ? 16 : 0); gF = 0;
    gMode = 2; gPlaneY = H[idx]; gDist = z; gDistLo = z - 1.2 - z * 0.008; gLit = lightsOn && z < 120;
`);

// structures
after(`    const s = A.s, tpl = s.tpl, sx = tpl.sx, sz = tpl.sz, baseY = s.baseY;`, `
    const sIdx = world.structs.indexOf(s);`);
after(`            if (prevTop > eyeY && prevTop > y0 + 1) sh *= 0.45;   // interior face: the air beside it, at eye level, is under something solid`, `
            gK = 2; gM = m; gS = sh; gO = sIdx; gT = 0; gF = (face >= 0 ? face : 4) | (prevTop > eyeY && prevTop > y0 + 1 ? 8 : 0);
            gMode = 1; gDist = tt; gBase = baseY; gLX = ix + 0.5; gLZ = iz + 0.5; gLit = lightsOn && tt < 120;
            gU = face < 2 ? camZ + dz * tt : camX + dx * tt;   // where the ray meets this face, measured along the wall`);
before(`                paint(rF, rT, G.DARK, ct, tt, 0);`, `                gK = 3; gM = m; gS = thisTop > y1 + 1 ? fb[4] * 0.45 : fb[4]; gO = sIdx; gT = 0; gF = 4 | (thisTop > y1 + 1 ? 8 : 0);
                gMode = 2; gPlaneY = wTop; gDistLo = tt; gDist = tn; gLit = lightsOn && tt < 120;
`);
rep(`              if (rU > rB) paint(rB, rU, G.DARK, lutColor(m, fb[5] * 0.7, fog), tt, 0);`,
    `              if (rU > rB) { gK = 4; gM = m; gS = fb[5] * 0.7; gO = sIdx; gT = 0; gF = 5; gMode = 2; gPlaneY = wBot; gDistLo = tt; gDist = tn; gLit = false; paint(rB, rU, G.DARK, lutColor(m, fb[5] * 0.7, fog), tt, 0); }`);

// sky (stars are not recorded per pixel: every candidate scatters its own over its own grid)
rep(`      cells[i] = g; colors[i] = c; flags[i] = 2;`, `      cells[i] = g; colors[i] = c; flags[i] = 2;
      let glow = 0;
      if (sunScreen) { const ex = (col - sunScreen.col) / sunScreen.rx, ey = (r - sunScreen.row) / sunScreen.ry, d2 = ex * ex + ey * ey; if (d2 > 1 && d2 < 49) glow = Math.exp(-Math.sqrt(d2) * 0.5) * 0.75; }
      gb.kind[i] = g === G.FULL ? (c === sunC ? 16 : 17) : 0; gb.mat[i] = 0; gb.face[i] = 0; gb.tex[i] = 0; gb.obj[i] = 0;
      gb.shade[i] = clamp(r / Math.max(1, horizonRow), 0, 1); gb.u[i] = glow; gb.v[i] = 0; gb.light[i] = 0;`);

// --- sprites -----------------------------------------------------------------------------------
rep(`    if (zc < depth[idx]) { cells[idx] = g; colors[idx] = color; depth[idx] = zc; flags[idx] = 0; }`,
    `    if (zc < depth[idx]) { cells[idx] = g; colors[idx] = color; depth[idx] = zc; flags[idx] = 0;
      if (gbOn) gb.kind[idx] = gK, gb.mat[idx] = gM, gb.shade[idx] = gS, gb.obj[idx] = gO, gb.u[idx] = gU, gb.v[idx] = gV, gb.light[idx] = gL, gb.tex[idx] = gT, gb.face[idx] = 0, gb.refl[idx] = -1, gb.reflAmt[idx] = 0; }`);
after(`  const wind = world.wind;`, `
  const lightsOnS = activeLights.length > 0;`);

// birds
before(`      const colC = Math.round(colF), c = fogged(birdC, fogK);`, `      gK = 11; gM = 0; gS = 0; gO = 0; gU = 0; gV = 0; gL = 0; gT = 0;
      gbMeta.birds.push({ col: colF, row, zc, frame: Math.floor(t * 4 + sp.obj.flap) % 3 });
`);
// clouds
rep(`          if (inside) put(r, cc, G.DARK, shade, zc);`,
    `          if (inside) { gK = 12; gM = 0; gS = clamp(0.55 - v * 0.6, 0, 1); gO = world.clouds.indexOf(c); gU = u; gV = v; gL = 0; gT = 0; put(r, cc, G.DARK, shade, zc); }`);
// flames, logs, torch brackets
rep(`          put(r, c, G.FULL, q < 0.45 && v < 0.75 ? core : q < 0.8 ? mid : rim, zc);`,
    `          gK = 13; gM = q < 0.45 && v < 0.75 ? 0 : q < 0.8 ? 1 : 2; gS = v; gO = world.lights.indexOf(L); gU = u / hwR; gV = v; gL = 0; gT = 0;
          put(r, c, G.FULL, q < 0.45 && v < 0.75 ? core : q < 0.8 ? mid : rim, zc);`);
after(`      const rowBot = Math.round(baseRow + 0.15 * L.size / vPerRow), R = Math.max(2, Math.ceil(fh / vPerRow));`, `
      gbMeta.flames.push({ kind: L.kind, col: colF, rowBot, zc, halfWidthPx: fw / uPerCol, heightPx: fh / vPerRow, light: world.lights.indexOf(L) });`);
before(`        const dark = pack(60, 40, 24);`, `        gK = 14; gM = 0; gS = 0; gO = world.lights.indexOf(L); gU = 0; gV = 0; gL = 0; gT = 0;
`);
before(`        put(rowBot, Math.round(colF), G.DARK, pack(40, 34, 30), zc);`, `        gK = 15; gM = 0; gS = 0; gO = world.lights.indexOf(L); gU = 0; gV = 0; gL = 0; gT = 0;
`);
// vegetation and rocks
after(`    const i = sp.i, size = trees.size[i], kind = sp.kind;`, `
    gL = lightsOnS ? lightAdd(trees.x[i], trees.y[i] + 1.5, trees.z[i]) : 0;`);
before(`          put(r, c, G.DARK, fogged(packRGB(cc), fogK), zc);`, `          gK = 9; gM = 0; gS = sh; gO = i; gU = u; gV = v; gT = 0;
`);
rep(`        const jag = 0.9 + 0.2 * hash2(r + seedT, i, 5);`, `        const jag = 0.9 + 0.2 * hash2(Math.floor(tt * 24) + seedT, i, 5);`);
rep(`          const sh = clamp(0.28 + 0.5 * (0.5 + 0.5 * u * sunSign) - 0.25 * local + (1 - tt) * 0.15, 0.08, 1);
          put(r, c, G.DARK, leafC(sh), zc);`, `          const sh = clamp(0.28 + 0.5 * (0.5 + 0.5 * u * sunSign) - 0.25 * local + (1 - tt) * 0.15, 0.08, 1);
          gK = 6; gM = 0; gS = sh; gO = i; gU = u; gV = tt; gT = tier;
          put(r, c, G.DARK, leafC(sh), zc);`);
rep(`          if (d > 1.15 || d > 0.78 + 0.35 * hash2(c + seedT, r, 9)) continue;
          const sh = clamp(0.55 + 0.3 * u * sunSign - 0.45 * v - 0.25 * d, 0.08, 1);
          put(r, c, G.DARK, leafC(sh), zc);`, `          if (d > 1.15 || d > 0.78 + 0.35 * hash2(Math.floor((u + 2) * 5) + seedT, Math.floor((v + 2) * 5), 9)) continue;
          const sh = clamp(0.55 + 0.3 * u * sunSign - 0.45 * v - 0.25 * d, 0.08, 1);
          gK = kind === SPRITE.BUSH ? 7 : 5; gM = 0; gS = sh; gO = i; gU = u; gV = v; gT = 0;
          put(r, c, G.DARK, leafC(sh), zc);`);
rep(`      for (let r = Math.max(0, rowBot); r < Math.min(rows, Math.round(baseRow)); r++) {
        const sh = ((r + seedT) & 1) ? 0.3 : 0.45;                // bark stripes
        put(r, c, G.DARK, fogged(packRGB(mixRGB(wd[0], wd[1], sh)), fogK), zc);
        if (halfW > 3) put(r, c + 1, G.DARK, fogged(packRGB(mixRGB(wd[0], wd[1], sh * 0.7)), fogK), zc);
      }`, `      const tw = Math.max(0.5, 0.11 * size * k / cellW);        // G-buffer: a trunk about a fifth of a unit thick, at any distance
      for (let r = Math.max(0, rowBot); r < Math.min(rows, Math.round(baseRow)); r++) {
        const vv = (baseRow - r) / Math.max(1, baseRow - rowBot);
        for (let cc = Math.round(colF - tw); cc <= Math.round(colF + tw); cc++) {
          const uu = (cc + 0.5 - colF) / tw;
          const sh = clamp(0.4 + 0.25 * uu * sunSign, 0.1, 1);
          gK = 8; gM = 0; gS = sh; gO = i; gU = uu; gV = vv; gT = 0;
          put(r, cc, G.DARK, fogged(packRGB(mixRGB(wd[0], wd[1], sh)), fogK), zc);
        }
      }`);
after(`          colors[idx] = scalePacked(colors[idx], 0.72);`, `
          gb.tex[idx] |= 0x80;`);
// merchants
after(`  const lantern = light.darkness > 0.05;`, `
  gL = activeLights.length > 0 ? lightAdd(m.x, m.y + 1, m.z) : 0;
  gbMeta.sprites.push({ kind: 'merchant', i: world.merchants.indexOf(m), col: colF, rowBot: Math.round(baseRow), zc, heightPx: HEAD * k });`);
rep(`        if (col !== null) put(r, c, g, col, zc);`,
    `        if (col !== null) { gK = 10; gM = merchantPart(u, v, au, bob, spread, lantern, wideEnough); gS = side; gO = world.merchants.indexOf(m); gU = u; gV = v; gT = 0; put(r, c, g, col, zc); }`);

// reflections
after(`        colors[i] = mixPacked(colors[i], scalePacked(colors[j], 0.8), (flags[i] === 3 ? 0.22 : 0.5) * fade);`, `
        gb.refl[i] = j; gb.reflAmt[i] = (flags[i] === 3 ? 0.22 : 0.5) * fade;`);

// --- handle -------------------------------------------------------------------------------------
before(`window.TV = {`, `window.TVX = { render, compose, setupGrid, grid, gb, gbMeta, blendPalette, buildLUT, updateLighting, collectLights, clock, cam, world, view, light, cur, FOG_AMT, FOV, skyState, activeLights,
  setForceCell: (w, h) => { forceCell = w ? { w, h } : null; setupGrid(); }, setGb: on => { gbOn = on; }, sun: () => sunScreen, moon: () => moonScreen };
`);
rep(`<title>Text Voxel</title>`, `<title>Text Voxel v1 (G-buffer build)</title>`);

const out = path.join(ROOT, 'tools/gbuffer/v1-gbuffer.html');
fs.writeFileSync(out, src);
console.log('wrote', path.relative(ROOT, out), src.length, 'bytes');
