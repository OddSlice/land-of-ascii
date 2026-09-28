// Flicker, measured: walk the camera forward (or turn it) with page time frozen, so only the camera
// moves, and count the cells that blink: change and change back a frame later (by more than 24 in
// some colour channel, or in their glyph). Prints blinks per frame, what the blinking pixels show and
// how far away they are (painted look), and a coarse map of where they are.
//   node tools/flicker.mjs <scene> [frames 60] [step 0.117] [turn 0] [look mosaic|painted]
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, ROOT } from './lib/harness.mjs';
import { showScene, HIDE_OVERLAYS } from './lib/v1.mjs';
const [name, framesArg = '60', stepArg = '0.117', turnArg = '0', lookArg = 'mosaic'] = process.argv.slice(2);
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/scenes.json'), 'utf8'));
const sc = cfg.scenes.find(s => s.name === name);
const { server, port } = await startServer();
const { browser, page } = await launch();
await page.goto(`http://127.0.0.1:${port}/${process.env.PAGE || 'index.html'}?seed=${sc.seed ?? cfg.seed}&threads=0&look=${lookArg}`);   // (PAGE=another copy of the game, to compare)
await page.waitForFunction(() => window.TV && window.TV.world.structs.length > 0);
await page.addStyleTag({ content: HIDE_OVERLAYS });
const c = sc.cam, camv = { x: c.x, y: c.y, z: c.z, yaw: c.yaw * Math.PI / 180, pitch: c.pitch };
if (c.ground) camv.y = await page.evaluate(k => window.TV.groundAt(k.x, k.z, 1e9) + 1.55 + k.y, camv);
await showScene(page, { seed: sc.seed ?? cfg.seed, hour: sc.hour, t: sc.t, cam: camv, merchants: sc.merchants, view: sc.view });
const out = await page.evaluate(async ({ frames, step, turn, painted }) => {
  const TV = window.TV, R = TV.renderer, A = R.atlas;
  const g = painted ? { glyph: R.paint.glyph, fg: R.paint.fg, bg: R.paint.bg, cols: R.grid.cols, rows: R.grid.rows * 2 } : R.grid;
  const n = g.cols * g.rows;
  // a colour change counts only if it is visible: more than 24 in some channel; a change of letter
  // only where the letter shows (painted: its colour stands off the cell's by more than 16)
  const far = (a, b) => { const d = x => Math.abs(((a >> x) & 255) - ((b >> x) & 255)); return d(0) > 24 || d(8) > 24 || d(16) > 24; };
  const shows = (fg, bg) => { const d = x => Math.abs(((fg >> x) & 255) - ((bg >> x) & 255)); return d(0) > 16 || d(8) > 16 || d(16) > 16; };
  const glyphDiff = (s1, s2, i) => s1.gl[i] !== s2.gl[i] && (!painted || shows(s1.fg[i], s1.bg[i]) || shows(s2.fg[i], s2.bg[i]));
  // classify glyph indices: shapes (edge cells), marks, shades (seams), mortar, plain
  const kind = new Uint8Array(A.masks.length);   // 0 plain, 1 shade, 2 edge shape, 3 mark, 4 mortar
  for (const s of A.SHADE) if (s !== A.SPACE) kind[s] = 1;
  for (const s of A.shapeGlyph) if (s !== A.SPACE && s !== A.FULL) kind[s] = kind[s] || 2;
  for (const m of A.mark) for (const s of m.at) if (!kind[s]) kind[s] = 3;
  for (let i = A.mortarBase; i < A.masks.length; i++) if (!kind[i]) kind[i] = 4;
  const hist = [];   // state per frame: glyph, fg, bg
  const kindNames = ['sky', 'terrain', 'wall', 'top', 'under', 'tree', 'conifer', 'bush', 'trunk', 'boulder', 'merchant', '11', 'cloud', 'flame', 'logs'];
  const pk = {}, pd = { near: 0, mid: 0, far: 0 };
  let rk = null, rdep = null, rfl = null;
  const how = { edge: 0, shade: 0, water: 0, face: 0, ground: 0 }, pairs = {};   // painted: did what the pixel shows change (an edge moving) or only its colour, and on what
  const blinks = new Uint16Array(n), changes = new Uint16Array(n), byKind = [0, 0, 0, 0, 0];
  const fx = Math.cos(TV.cam.yaw), fz = Math.sin(TV.cam.yaw);
  for (let f = 0; f < frames; f++) {
    TV.cam.x += fx * step; TV.cam.z += fz * step; TV.cam.yaw += turn;
    window.__step(0);
    await TV.whenIdle();
    if (painted) { const RH = R.grid.RH; rk = new Uint8Array(n); rdep = new Float32Array(n); rfl = new Uint8Array(n); for (let pi = 0; pi < n; pi++) { const c = pi % g.cols, pr = (pi / g.cols) | 0, ri = c * 2 * RH + pr * 2; rk[pi] = R.rays.kind[ri]; rdep[pi] = R.rays.depth[ri]; rfl[pi] = R.rays.flags[ri]; } }
    hist.push({ gl: g.glyph.slice(), fg: g.fg.slice(), bg: g.bg.slice(), rk, rfl });
    if (hist.length > 3) hist.shift();
    if (hist.length === 3) {
      const [a, b, c2] = hist;
      for (let i = 0; i < n; i++) {
        const ab = glyphDiff(a, b, i) || far(a.fg[i], b.fg[i]) || far(a.bg[i], b.bg[i]);
        const ac = !glyphDiff(a, c2, i) && !far(a.fg[i], c2.fg[i]) && !far(a.bg[i], c2.bg[i]) && (glyphDiff(b, c2, i) || far(b.fg[i], c2.fg[i]) || far(b.bg[i], c2.bg[i]));
        if (ab) changes[i]++;
        if (ab && ac) { blinks[i]++; byKind[painted ? 0 : Math.max(kind[a.gl[i]], kind[b.gl[i]])]++;
          if (far(a.bg[i], b.bg[i])) how.colour = (how.colour || 0) + 1; else if (glyphDiff(a, b, i)) how.glyph = (how.glyph || 0) + 1; else how.tint = (how.tint || 0) + 1;
          if (painted && a.rk[i] !== b.rk[i]) { const pair = [kindNames[a.rk[i]] || a.rk[i], kindNames[b.rk[i]] || b.rk[i]].sort().join('/'); pairs[pair] = (pairs[pair] || 0) + 1; }
          if (painted) { const nm = kindNames[rk[i]] || String(rk[i]); pk[nm] = (pk[nm] || 0) + 1; const d = rdep[i]; pd[d < 30 ? 'near' : d < 150 ? 'mid' : 'far']++;
            if (a.rk[i] !== b.rk[i]) how.edge++; else how.shade++;
            if (b.rk[i] === 1) { if (b.rfl[i] & 1) how.water++; else if (b.rfl[i] & 16) how.face++; else how.ground++; } } }
      }
    }
  }
  let total = 0, cellsBlinking = 0;
  for (let i = 0; i < n; i++) { total += blinks[i]; if (blinks[i] >= 2) cellsBlinking++; }
  // a heat map: one char per 4x3 block of cells
  const rowsOut = [];
  for (let r = 0; r < g.rows; r += 3) { let line = ''; for (let cc = 0; cc < g.cols; cc += 4) { let s = 0; for (let y = r; y < Math.min(g.rows, r + 3); y++) for (let x = cc; x < Math.min(g.cols, cc + 4); x++) s += blinks[y * g.cols + x]; line += s === 0 ? ' ' : s < 4 ? '.' : s < 12 ? ':' : s < 30 ? '*' : '#'; } rowsOut.push(line); }
  return { byWhat: pk, byDistance: pd, how, edges: pairs, cells: n, frames, blinksPerFrame: +(total / (frames - 2)).toFixed(1), cellsBlinkingTwiceOrMore: cellsBlinking, byKind: { plainOrColour: byKind[0], seam: byKind[1], edgeShape: byKind[2], mark: byKind[3], mortar: byKind[4] }, map: rowsOut.join('\n') };
}, { frames: +framesArg, step: +stepArg, turn: +turnArg, painted: lookArg === 'painted' });
console.log(JSON.stringify({ ...out, map: undefined }));
console.log(out.map);
await browser.close(); server.close();
