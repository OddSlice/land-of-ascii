// Screenshots of v2 (index.html) at fixed cameras, with page time frozen between calls.
//   node tools/shoot.mjs                      every scene in tools/scenes.json -> shots/<name>.png
//   node tools/shoot.mjs vista road           just those
//   node tools/shoot.mjs --cam x,y,z,yawDeg,pitch --hour 21 [--ground] [--seed 42] --out shots/x.png
// Options: --browser chromium|firefox|webkit, --dpr 2, --cells 0..3 (cell preset), --dir shots, --look painted|mosaic
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, ROOT } from './lib/harness.mjs';
import { HIDE_OVERLAYS, showScene } from './lib/v1.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = k => { const i = args.indexOf('--' + k); if (i < 0) return false; args.splice(i, 1); return true; };
const browserName = opt('browser', 'chromium'), dpr = +opt('dpr', 1), cells = opt('cells', null), dir = opt('dir', 'shots');
const threads = opt('threads', null), camArg = opt('cam', null), hour = +opt('hour', 12), seed = +opt('seed', 42), outArg = opt('out', null), tArg = +opt('t', 1000);
const ground = flag('ground'), keepHud = flag('hud'), lookArg = opt('look', null);
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/scenes.json'), 'utf8'));
let scenes;
if (camArg) {
  const [x, y, z, yaw, pitch] = camArg.split(',').map(Number);
  scenes = [{ name: path.basename(outArg || 'custom.png', '.png'), seed, hour, t: tArg, cam: { x, y, z, yaw, pitch, ground }, out: outArg }];
} else scenes = cfg.scenes.filter(s => !args.length || args.includes(s.name));

const { server, port } = await startServer();
const { browser, page } = await launch({ browser: browserName, dpr });
await page.goto(`http://127.0.0.1:${port}/index.html?seed=${scenes[0]?.seed ?? cfg.seed}${threads != null ? '&threads=' + threads : ''}${lookArg ? '&look=' + lookArg : ''}`);
await page.waitForFunction(() => window.TV && window.TV.world.structs.length > 0);
if (!keepHud) await page.addStyleTag({ content: HIDE_OVERLAYS });
if (cells != null) await page.evaluate(p => window.TV.setCells(p), +cells);
fs.mkdirSync(path.resolve(ROOT, dir), { recursive: true });
for (const sc of scenes) {
  const c = sc.cam, scSeed = sc.seed ?? cfg.seed;
  if (await page.evaluate(s => window.TV.world.seed !== s, scSeed)) await page.evaluate(s => window.TV.regenerate(s), scSeed);
  const camv = { x: c.x, y: c.y, z: c.z, yaw: c.yaw * Math.PI / 180, pitch: c.pitch };
  if (c.ground) camv.y = await page.evaluate(k => window.TV.groundAt(k.x, k.z, 1e9) + 1.55 + k.y, camv);
  await showScene(page, { seed: scSeed, hour: sc.hour, t: sc.t, cam: camv, merchants: sc.merchants, view: sc.view });
  const out = path.resolve(ROOT, sc.out || path.join(dir, `${sc.name}${browserName === 'chromium' ? '' : '-' + browserName}.png`));
  await page.screenshot({ path: out });
  const st = await page.evaluate(() => { const s = window.TV.stats; return { edges: s.edgeCells, threads: s.threads, cols: window.TV.grid.cols, rows: window.TV.grid.rows }; });
  console.log(path.relative(ROOT, out), JSON.stringify(st));
}
await browser.close(); server.close();
