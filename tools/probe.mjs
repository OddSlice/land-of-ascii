// Evaluate an expression inside v2 after showing a scene: node tools/probe.mjs <scene> '<js expression using TV>'
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, ROOT } from './lib/harness.mjs';
import { showScene } from './lib/v1.mjs';
const [name, expr] = process.argv.slice(2);
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/scenes.json'), 'utf8'));
const sc = cfg.scenes.find(s => s.name === name);
const { server, port } = await startServer();
const { browser, page } = await launch();
await page.goto(`http://127.0.0.1:${port}/index.html?seed=${cfg.seed}`);
await page.waitForFunction(() => window.TV && window.TV.world.structs.length > 0);
if (await page.evaluate(s => window.TV.world.seed !== s, sc.seed ?? cfg.seed)) await page.evaluate(s => window.TV.regenerate(s), sc.seed ?? cfg.seed);
const c = sc.cam, camv = { x: c.x, y: c.y, z: c.z, yaw: c.yaw * Math.PI / 180, pitch: c.pitch };
if (c.ground) camv.y = await page.evaluate(k => window.TV.groundAt(k.x, k.z, 1e9) + 1.55 + k.y, camv);
await showScene(page, { seed: sc.seed ?? cfg.seed, hour: sc.hour, t: sc.t, cam: camv, merchants: sc.merchants, view: sc.view, weather: sc.weather });
console.log(JSON.stringify(await page.evaluate(e => { const TV = window.TV; return eval(e); }, expr), null, 1));
await browser.close(); server.close();
