// Baseline: photograph the pristine v1 renderer from every scene camera, and time it.
//   node tools/capture-v1.mjs   -> mockups/<scene>/v1.png, tools/frames/<scene>/v1-dpr2.png, tools/frames/v1-timing.json
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, resolveCam, ROOT } from './lib/harness.mjs';
import { MAC_METRICS, HIDE_OVERLAYS, showScene } from './lib/v1.mjs';

const { seed, scenes } = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/scenes.json'), 'utf8'));
const { server, port } = await startServer();
const url = `http://127.0.0.1:${port}/reference/v1-index.html?seed=${seed}`;

async function open(opts) {
  const { browser, page } = await launch(opts);
  await page.addInitScript(MAC_METRICS);
  await page.goto(url);
  await page.waitForFunction(() => window.TV && window.TV.world.structs.length > 0);
  await page.addStyleTag({ content: HIDE_OVERLAYS });
  return { browser, page };
}

// 1. Deterministic screenshots at DPR 1 (what the old README screenshots show) and DPR 2
//    (what a Retina Mac actually displays: the 1440x900 canvas upscaled by the browser).
for (const dpr of [1, 2]) {
  const { browser, page } = await open({ dpr });
  for (const sc of scenes) {
    const cam = await resolveCam(page, sc);
    await showScene(page, { ...sc, seed, cam });
    const dir = path.join(ROOT, dpr === 1 ? 'mockups' : 'tools/frames', sc.name);
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, dpr === 1 ? 'v1.png' : 'v1-dpr2.png') });
    console.log(sc.name, 'dpr', dpr, JSON.stringify(cam));
  }
  await browser.close();
}

// 2. Timing on the real clock: park the camera, let v1 run ~3 s, read its own per-frame stats.
const timing = {};
{
  const { browser, page } = await open({ timeControl: false });
  for (const sc of scenes) {
    const cam = await resolveCam(page, sc);
    await page.evaluate(({ cam, hour }) => { TV.clock.scale = 0; TV.setMode('fly'); Object.assign(TV.cam, cam); TV.setHour(hour); }, { cam, hour: sc.hour });
    await page.waitForTimeout(800);
    await page.evaluate(() => { TV.stats.renderMs = 0; TV.stats.drawMs = 0; TV.stats.frames = 0; });
    await page.waitForTimeout(3000);
    timing[sc.name] = await page.evaluate(() => ({ frames: TV.stats.frames, raymarchMs: +(TV.stats.renderMs / TV.stats.frames).toFixed(2), composeMs: +(TV.stats.drawMs / TV.stats.frames).toFixed(2), cells: TV.grid.cols + 'x' + TV.grid.rows }));
    console.log(sc.name, JSON.stringify(timing[sc.name]));
  }
  await browser.close();
}
fs.mkdirSync(path.join(ROOT, 'tools/frames'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tools/frames/v1-timing.json'), JSON.stringify(timing, null, 1));
server.close();
