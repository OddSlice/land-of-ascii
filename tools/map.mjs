// Top-down maps of whole worlds: the regions on the left, the ground as the day palette paints it
// (lit from the morning sun, with trees, roads and landmarks) on the right, and each region's
// share of the land underneath.
//   node tools/map.mjs [seed...]            default: 42 7 1234 31337 -> shots/phase2/map-<seed>.png
//   node tools/map.mjs --dir shots/x --scale 2
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, ROOT } from './lib/harness.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const dir = opt('dir', 'shots/phase2'), scale = +opt('scale', 1), hour = +opt('hour', 10);
const seeds = args.length ? args.map(Number) : [42, 7, 1234, 31337];

// Flat colours for the region map, chosen to tell regions apart, not to match the game.
const REGION_COLOURS = {
  sea: '#15233a', grassland: '#a6c45e', forest: '#3f7f38', 'pine forest': '#2f6f66', 'snowy peaks': '#e9eef2',
  badlands: '#c9653c', marsh: '#7f7a3c', beach: '#ead79e', 'sea cliffs': '#8d93a0',
};
// The ramp each material is drawn from (as MAT_RAMP in the renderer).
const MAT_RAMP_NAMES = ['water', 'grass', 'rock', 'snow', 'haze', 'stone', 'wood', 'leaf', 'road', 'grass2', 'sand', 'redrock', 'drygrass', 'mud', 'reeds'];

const { server, port } = await startServer();
const { browser, page } = await launch();
await page.goto(`http://127.0.0.1:${port}/index.html?seed=${seeds[0]}&threads=0`);
await page.waitForFunction(() => window.TV && window.TV.world.structs.length > 0);
fs.mkdirSync(path.resolve(ROOT, dir), { recursive: true });
for (const seed of seeds) {
  const url = await page.evaluate(({ seed, hour, scale, REGION_COLOURS, MAT_RAMP_NAMES }) => {
    const TV = window.TV, w = TV.world, D = TV.defs, W = D.W, N = W * W;
    if (w.seed !== seed) TV.regenerate(seed);
    TV.setHour(hour);
    const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const day = D.KEYFRAMES.day, ramps = MAT_RAMP_NAMES.map(n => day.ramps[n].map(hex));
    const regionRGB = D.BIOME_NAMES.map(n => hex(REGION_COLOURS[n]));
    const posLo = day.ambient * 0.3, posInv = 1 / (day.ambient + day.diffuse * 0.95 - posLo);
    const pad = 16, legendH = 84, cw = W * scale, can = document.createElement('canvas');
    can.width = cw * 2 + pad * 3; can.height = cw + pad * 2 + legendH;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#101114'; ctx.fillRect(0, 0, can.width, can.height);
    const img = ctx.createImageData(W * 2, W), px = img.data;
    const put = (x, z, rgb) => { const o = (z * W * 2 + x) * 4; px[o] = rgb[0]; px[o + 1] = rgb[1]; px[o + 2] = rgb[2]; px[o + 3] = 255; };
    const counts = new Array(D.BIOME_NAMES.length).fill(0);
    let land = 0;
    for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
      const i = z * W + x, b = w.biome[i];
      put(x, z, regionRGB[b]);
      if (b) { counts[b]++; land++; }
      const R = ramps[w.mat[i]], p = Math.min(1, Math.max(0, (w.shade[i] - posLo) * posInv));
      put(W + x, z, R[Math.round(p * (R.length - 1))]);
    }
    const T = w.trees, leaf = hex(day.ramps.leaf[1]), pine = hex(day.ramps.conifer[1]), bush = hex(day.ramps.leaf[3]), stone = hex(day.ramps.rock[3]);
    for (let k = 0; k < T.n; k++) put(W + (T.x[k] | 0), T.z[k] | 0, T.kind[k] === 1 ? pine : T.kind[k] === 0 ? leaf : T.kind[k] === 2 ? bush : stone);
    const off = document.createElement('canvas'); off.width = W * 2; off.height = W;
    off.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, W, W, pad, pad, cw, cw);
    ctx.drawImage(off, W, 0, W, W, pad * 2 + cw, pad, cw, cw);
    // landmarks: each castle and town as its footprint (castles white, towns amber, villages and hamlets
    // cream), a dot per tower (red), ruin (grey) or stone circle (violet)
    const FOOT = { castle: '#ffffff', town: '#ffb000', village: '#f0e0b0', hamlet: '#f0e0b0' }, DOT = { tower: '#ff4040', ruin: '#9a9a9a', stones: '#c080ff' };
    ctx.save(); ctx.beginPath(); ctx.rect(pad * 2 + cw, pad, cw, cw); ctx.clip();   // (footprints wrap round the edges)
    for (const s of w.structs) {
      const X = pad * 2 + cw, Y = pad;
      if (FOOT[s.type]) {
        ctx.strokeStyle = FOOT[s.type]; ctx.lineWidth = Math.max(1, scale);
        for (const ox of [0, -W, W]) for (const oz of [0, -W, W]) ctx.strokeRect(X + (s.x0 + ox) * scale, Y + (s.z0 + oz) * scale, s.tpl.sx * scale, s.tpl.sz * scale);
      } else if (DOT[s.type]) {
        const r = 3 * scale; ctx.fillStyle = DOT[s.type];
        ctx.fillRect(X + s.cx * scale - r, Y + s.cz * scale - r, r * 2, r * 2);
      }
    }
    ctx.restore();
    // legend: each region's colour and share of the land
    ctx.font = `${12}px Menlo, monospace`; ctx.textBaseline = 'middle';
    let lx = pad, ly = cw + pad + 22;
    D.BIOME_NAMES.forEach((n, b) => {
      if (!b) return;
      const label = `${n} ${(100 * counts[b] / land).toFixed(1)}%`;
      ctx.fillStyle = REGION_COLOURS[n]; ctx.fillRect(lx, ly - 6, 12, 12);
      ctx.fillStyle = '#d8d4c8'; ctx.fillText(label, lx + 18, ly);
      lx += ctx.measureText(label).width + 40;
      if (lx > can.width - 180) { lx = pad; ly += 22; }
    });
    ctx.fillStyle = '#8a8478';
    ctx.fillText(`seed ${seed}   regions (left) · ground at ${String(hour).padStart(2, '0')}:00 with trees, roads and landmarks (right): castles white, towns amber, villages cream, towers red, ruins grey, stones violet`, pad, ly + 24);
    return can.toDataURL('image/png');
  }, { seed, hour, scale, REGION_COLOURS, MAT_RAMP_NAMES });
  const out = path.resolve(ROOT, dir, `map-${seed}.png`);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log(path.relative(ROOT, out));
}
await browser.close(); server.close();
