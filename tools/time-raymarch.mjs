// How much does the raymarch cost at the sample density each candidate needs? Uses the
// instrumented renderer (it also writes the per-sample attributes a v2 renderer would keep),
// on the real clock, forcing the cell size to the candidate's sample size.
//   node tools/time-raymarch.mjs  -> tools/frames/raymarch-timing.json
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, resolveCam, ROOT } from './lib/harness.mjs';

const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/scenes.json'), 'utf8'));
const sizes = [[4, 7, 'v1 cells (one sample per 4x7 cell)'], [6, 6, 'A: 1x2 per 6x12 cell'], [4, 4, 'B: 2x4 per 8x16 cell'], [3, 3, '2x4 per 6x12 cell'], [2, 2, 'C: 3x6 per 6x12 cell'], [3, 2, '2x6 per 6x12 cell']];
const { server, port } = await startServer();
const { browser, page } = await launch({ timeControl: false });
await page.goto(`http://127.0.0.1:${port}/tools/gbuffer/v1-gbuffer.html?seed=${cfg.seed}`);
await page.waitForFunction(() => window.TVX && window.TV.world.structs.length > 0);
await page.evaluate(() => { TV.clock.scale = 0; });
const out = {};
for (const sc of cfg.scenes) {
  const cam = await resolveCam(page, sc);
  out[sc.name] = {};
  for (const [w, h, label] of sizes) {
    const ms = await page.evaluate(({ sc, cam, w, h }) => {
      const { TV, TVX } = window;
      TV.setMode('fly'); Object.assign(TV.cam, cam); TV.clock.hours = sc.hour;
      TVX.setForceCell(w, h); TVX.setGb(sc.gbOn);
      TVX.blendPalette(sc.hour); TVX.buildLUT(); TVX.updateLighting();
      const times = [];
      for (let k = 0; k < 25; k++) {
        TVX.collectLights(1);
        const t0 = performance.now(); TVX.render(1); times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      return { median: +times[12].toFixed(2), p90: +times[22].toFixed(2), cols: TVX.grid.cols, rows: TVX.grid.rows };
    }, { sc: { ...sc, gbOn: false }, cam, w, h });
    const withGb = await page.evaluate(({ sc, cam, w, h }) => {
      const { TV, TVX } = window;
      TVX.setForceCell(w, h); TVX.setGb(true);
      const times = [];
      for (let k = 0; k < 25; k++) { TVX.collectLights(1); const t0 = performance.now(); TVX.render(1); times.push(performance.now() - t0); }
      times.sort((a, b) => a - b);
      return +times[12].toFixed(2);
    }, { sc, cam, w, h });
    out[sc.name][`${w}x${h}`] = { label, ...ms, medianWithAttributes: withGb };
    console.log(sc.name, `${w}x${h}`, label.padEnd(36), JSON.stringify(ms), 'with attributes', withGb);
  }
}
fs.writeFileSync(path.join(ROOT, 'tools/frames/raymarch-timing.json'), JSON.stringify(out, null, 1));
await browser.close(); server.close();
