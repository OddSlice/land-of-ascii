// Render candidate mockups from the dumped G-buffers.
//   node tools/render-mockups.mjs [a b c c6] [--scenes=vista,road]  -> mockups/<scene>/<cand>.png + tools/frames/mockup-stats.json
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, ROOT } from './lib/harness.mjs';

const args = process.argv.slice(2);
const sceneArg = args.find(a => a.startsWith('--scenes='));
const cands = args.filter(a => !a.startsWith('--'));
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/scenes.json'), 'utf8'));
const scenes = sceneArg ? sceneArg.slice(9).split(',') : cfg.scenes.map(s => s.name);
const { server, port } = await startServer();
const { browser, page } = await launch({ timeControl: false });
await page.goto(`http://127.0.0.1:${port}/tools/mockup/index.html`);
await page.waitForFunction(() => window.ready === true);
const statsFile = path.join(ROOT, 'tools/frames/mockup-stats.json');
const all = fs.existsSync(statsFile) ? JSON.parse(fs.readFileSync(statsFile, 'utf8')) : {};
for (const cand of (cands.length ? cands : ['a', 'b', 'c'])) for (const sc of scenes) {
  // run twice so the timing is taken with warm JIT and a built glyph table
  await page.evaluate(({ cand, sc }) => window.renderMockup(cand, sc, null), { cand, sc });
  const out = cand === 'c6' ? `tools/frames/${sc}/c6.png` : `mockups/${sc}/${cand}.png`;   // c6: the 2x6-ray variant, kept out of the repo
  const res = await page.evaluate(({ cand, sc, out }) => window.renderMockup(cand, sc, out), { cand, sc, out });
  (all[cand] ||= {})[sc] = res;
  console.log(cand, sc, JSON.stringify(res.timings, (k, v) => typeof v === 'number' ? +v.toFixed(2) : v), JSON.stringify(res.stats));
}
fs.writeFileSync(statsFile, JSON.stringify(all, null, 1));
await browser.close(); server.close();
