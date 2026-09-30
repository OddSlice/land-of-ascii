// CPU profile of v2 in Chromium for one scene: node tools/profile-v2.mjs <scene> [--frames 90] [--pitch F]
// (--pitch F: looking up or down by F screen heights, -1 all the way down, 1.3 all the way up)
// Prints self time per function (and per line for the top functions).
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, ROOT } from './lib/harness.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const frames = +opt('frames', 90), jsFlags = opt('js-flags', ''), pitchF = opt('pitch', null);
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/scenes.json'), 'utf8'));
const sc = cfg.scenes.find(s => s.name === (args[0] || 'vista'));
const { server, port } = await startServer();
const { browser, page } = await launch({ timeControl: false, jsFlags });
await page.goto(`http://127.0.0.1:${port}/${process.env.PAGE || "index.html"}?seed=${cfg.seed}&threads=0`);   // (drawn on the main thread, so the profile sees the renderer; PAGE= to profile another copy)
await page.waitForFunction(() => window.TV && window.TV.world.structs.length > 0);
const c = sc.cam, cam = { x: c.x, y: c.y, z: c.z, yaw: c.yaw * Math.PI / 180, pitch: pitchF != null ? +pitchF * page.viewportSize().height : c.pitch };
const setup = async () => page.evaluate(({ seed, view, cam, hour, ground, merchants }) => {
  const TV = window.TV;
  if (TV.world.seed !== seed) TV.regenerate(seed);
  TV.view.dist = view || 500;
  TV.clock.scale = 0; TV.setMode('fly');
  if (ground) cam.y = TV.groundAt(cam.x, cam.z, 1e9) + 1.55 + cam.y;
  window.__hold = () => { Object.assign(TV.cam, cam); for (const m of merchants || []) TV.world.merchants[m.i].s = m.s; };
  window.__hold(); TV.setHour(hour);
}, { seed: sc.seed ?? cfg.seed, view: sc.view, cam, hour: sc.hour, ground: !!c.ground, merchants: sc.merchants });
await setup();
await page.waitForTimeout(500);
await setup();
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
await cdp.send('Profiler.start');
await page.evaluate(n => new Promise(res => { const f0 = window.TV.stats.frames; const tick = () => { window.__hold(); if (window.TV.stats.frames - f0 >= n) res(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); }), frames);
const { profile } = await cdp.send('Profiler.stop');
const byId = new Map(profile.nodes.map(n => [n.id, n]));
const self = new Map(), lines = new Map();
const dt = profile.timeDeltas;
for (let k = 0; k < profile.samples.length; k++) {
  const n = byId.get(profile.samples[k]);
  const name = n.callFrame.functionName || '(anon)';
  const ms = (dt[k] || 0) / 1000;
  self.set(name, (self.get(name) || 0) + ms);
}
for (const n of profile.nodes) if (n.positionTicks) {
  const name = n.callFrame.functionName || '(anon)';
  for (const t of n.positionTicks) { const key = `${name}:${t.line}`; lines.set(key, (lines.get(key) || 0) + t.ticks); }
}
const total = [...self.values()].reduce((a, b) => a + b, 0);
console.log(`scene ${sc.name}, ${frames} frames, sampled ${total.toFixed(0)} ms`);
for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log(`${(v / frames).toFixed(2).padStart(7)} ms/frame  ${k}`);
console.log('--- hottest lines (ticks) ---');
for (const [k, v] of [...lines.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`${String(v).padStart(6)}  ${k}`);
await browser.close(); server.close();
