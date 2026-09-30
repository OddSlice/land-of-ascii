// Contact sheets: several screenshots on one image, each labelled, scaled by nearest neighbour.
//   node tools/sheet.mjs --out shots/phase2/regions.png --cols 2 --scale 0.5 a.png "Label A" b.png "Label B" ...
// A label may be left out (the file name is used). Scale 0.5 halves every image. --crop x,y,w,h takes
// that part of every image (in its own pixels) before scaling, for a close look.
import fs from 'node:fs';
import path from 'node:path';
import { launch, ROOT } from './lib/harness.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const out = opt('out', 'sheet.png'), cols = +opt('cols', 2), scale = +opt('scale', 0.5), title = opt('title', ''), crop = (c => c && c.split(',').map(Number))(opt('crop', null));
const items = [];
for (let k = 0; k < args.length; k++) {
  const file = args[k], label = args[k + 1] && !/\.png$/i.test(args[k + 1]) ? args[++k] : path.basename(file, '.png');
  items.push({ label, data: 'data:image/png;base64,' + fs.readFileSync(path.resolve(ROOT, file)).toString('base64') });
}
const { browser, page } = await launch({ timeControl: false });
const url = await page.evaluate(async ({ items, cols, scale, title, crop }) => {
  const imgs = await Promise.all(items.map(it => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = it.data; })));
  const [cx, cy, cw, ch] = crop || [0, 0, imgs[0].width, imgs[0].height];
  const w = Math.round(cw * scale), h = Math.round(ch * scale), pad = 10, top = 26, head = title ? 34 : 0;
  const rows = Math.ceil(imgs.length / cols), can = document.createElement('canvas');
  can.width = cols * w + (cols + 1) * pad; can.height = head + rows * (h + top) + (rows + 1) * pad;
  const ctx = can.getContext('2d');
  ctx.fillStyle = '#101114'; ctx.fillRect(0, 0, can.width, can.height);
  ctx.imageSmoothingEnabled = false;
  ctx.font = '14px Menlo, monospace'; ctx.textBaseline = 'middle';
  if (title) { ctx.fillStyle = '#e6e1d4'; ctx.font = '16px Menlo, monospace'; ctx.fillText(title, pad, pad + 12); ctx.font = '14px Menlo, monospace'; }
  imgs.forEach((im, k) => {
    const x = pad + (k % cols) * (w + pad), y = head + pad + Math.floor(k / cols) * (h + top + pad);
    ctx.fillStyle = '#d8d4c8'; ctx.fillText(items[k].label, x, y + top / 2);
    ctx.drawImage(im, cx, cy, cw, ch, x, y + top, w, h);
  });
  return can.toDataURL('image/png');
}, { items, cols, scale, title, crop });
fs.mkdirSync(path.dirname(path.resolve(ROOT, out)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, out), Buffer.from(url.split(',')[1], 'base64'));
console.log(path.relative(ROOT, path.resolve(ROOT, out)));
await browser.close();
