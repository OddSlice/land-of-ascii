// The ground's colour ramps in the three keyframe palettes (day, dusk, night), dark to light, the
// new ones marked, as one sheet: node tools/palette.mjs [--out shots/phase2/palette.png]
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, ROOT } from './lib/harness.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const out = opt('out', 'shots/phase2/palette.png');
// [ramp, what it paints, new in phase 2]
const ROWS = [
  ['grass', 'grassland, forest floor', false], ['grass2', 'rougher grass, pine floor', false], ['drygrass', 'dry grass: grassland, badlands', true],
  ['reeds', 'reed beds: marsh', true], ['mud', 'mud: marsh', true], ['water', 'sea, rivers, pools', false],
  ['sand', 'beaches, dry washes', true], ['redrock', 'badlands, hot cliffs', true], ['rock', 'rock, cliffs, peaks', false],
  ['snow', 'snow', false], ['road', 'roads', false],
];

const { server, port } = await startServer();
const { browser, page } = await launch();
await page.goto(`http://127.0.0.1:${port}/index.html?seed=42&threads=0`);
await page.waitForFunction(() => window.TV && window.TV.world.structs.length > 0);
const url = await page.evaluate(ROWS => {
  const K = window.TV.defs.KEYFRAMES, keys = ['day', 'dusk', 'night'];
  const sw = 34, sh = 26, gap = 22, labelW = 250, pad = 16, head = 40, rowH = sh + 10;
  const colW = 5 * sw + gap, can = document.createElement('canvas');
  can.width = pad * 2 + labelW + keys.length * colW; can.height = pad * 2 + head + ROWS.length * rowH;
  const ctx = can.getContext('2d');
  ctx.fillStyle = '#101114'; ctx.fillRect(0, 0, can.width, can.height);
  ctx.textBaseline = 'middle';
  keys.forEach((k, c) => { ctx.fillStyle = '#e6e1d4'; ctx.font = '15px Menlo, monospace'; ctx.fillText(k, pad + labelW + c * colW, pad + 14); });
  ROWS.forEach(([name, what, isNew], r) => {
    const y = pad + head + r * rowH;
    ctx.font = '13px Menlo, monospace';
    ctx.fillStyle = isNew ? '#f0c060' : '#d8d4c8'; ctx.fillText(name + (isNew ? '  new' : ''), pad, y + sh / 2 - 6);
    ctx.fillStyle = '#8a8478'; ctx.font = '11px Menlo, monospace'; ctx.fillText(what, pad, y + sh / 2 + 8);
    keys.forEach((k, c) => {
      const ramp = K[k].ramps[name];
      ramp.forEach((hex, j) => { ctx.fillStyle = hex; ctx.fillRect(pad + labelW + c * colW + j * sw, y, sw, sh); });
    });
  });
  return can.toDataURL('image/png');
}, ROWS);
fs.mkdirSync(path.dirname(path.resolve(ROOT, out)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, out), Buffer.from(url.split(',')[1], 'base64'));
console.log(out);
await browser.close(); server.close();
