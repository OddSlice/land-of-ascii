// Frame timing for v2 on the real clock: node tools/bench-v2.mjs [scene...] [--browser firefox] [--frames 120]
// Each scene's camera is held still (clock frozen at the scene's hour) while frames run at full
// speed; reports the median over several windows of the mean ms per stage (with workers, the
// slowest stripe's), the wall time from dispatch to picture (frameMs), and the frame rate.
// --threads N sets the number of render workers (0: draw on the main thread).
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, ROOT } from './lib/harness.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const browserName = opt('browser', 'chromium'), frames = +opt('frames', 60), runs = +opt('runs', 5), width = +opt('width', 1440), height = +opt('height', 900), pageFile = opt('page', 'index.html'), threads = opt('threads', null);
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/scenes.json'), 'utf8'));
const scenes = cfg.scenes.filter(s => !args.length || args.includes(s.name));
const { server, port } = await startServer();
const { browser, page } = await launch({ browser: browserName, timeControl: false, width, height });
await page.goto(`http://127.0.0.1:${port}/${pageFile}?seed=${cfg.seed}${threads != null ? '&threads=' + threads : ''}`);
await page.waitForFunction(() => window.TV && window.TV.world.structs.length > 0);
const rows = [];
for (const sc of scenes) {
  const c = sc.cam;
  const cam = { x: c.x, y: c.y, z: c.z, yaw: c.yaw * Math.PI / 180, pitch: c.pitch };
  const r = await page.evaluate(async ({ seed, view, cam, hour, ground, merchants, frames, runs }) => {
    const TV = window.TV;
    if (TV.world.seed !== seed) TV.regenerate(seed);
    TV.view.dist = view || 500;
    TV.clock.scale = 0; TV.setMode('fly');
    if (ground) cam.y = TV.groundAt(cam.x, cam.z, 1e9) + 1.55 + cam.y;
    const hold = () => { Object.assign(TV.cam, cam); for (const m of merchants || []) { const M = TV.world.merchants[m.i]; M.s = m.s; } };
    hold(); TV.setHour(hour);
    await new Promise(res => setTimeout(res, 300));
    hold(); TV.setHour(hour);
    // several windows; each stage reports its median, so one slow window (GC, a noisy neighbour
    // on the machine) does not decide the result
    const keys = ['marchMs', 'spriteMs', 'marksMs', 'renderMs', 'cellMs', 'drawMs', 'frameMs'], wins = [];
    for (let k = 0; k < runs; k++) {
      const s0 = Object.fromEntries(keys.map(k => [k, TV.stats[k]])), f0 = TV.stats.frames, t0 = performance.now();
      await new Promise(res => { const tick = () => { hold(); if (TV.stats.frames - f0 >= frames) res(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
      const n = TV.stats.frames - f0, wall = performance.now() - t0;
      const o = Object.fromEntries(keys.map(k => [k, (TV.stats[k] - s0[k]) / n]));
      o.fps = n / wall * 1000; o.threads = TV.stats.threads;
      wins.push(o);
    }
    const med = k => { const v = wins.map(o => o[k]).sort((a, b) => a - b); return +v[v.length >> 1].toFixed(2); };
    return Object.fromEntries([...keys, 'fps', 'threads'].map(k => [k, med(k)]));
  }, { seed: sc.seed ?? cfg.seed, view: sc.view, cam, hour: sc.hour, ground: !!c.ground, merchants: sc.merchants, frames, runs });
  rows.push({ scene: sc.name, ...r });
}
console.table(rows);
await browser.close(); server.close();
