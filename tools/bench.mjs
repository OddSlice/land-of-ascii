// Median per-frame cost of each candidate's cell stage and compose, from the mockup code
// (unoptimised; an engine version would be leaner), in headless Chromium.
//   node tools/bench.mjs  -> tools/frames/bench.json
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, ROOT } from './lib/harness.mjs';
const { server, port } = await startServer();
const { browser, page } = await launch({ timeControl: false });
await page.goto(`http://127.0.0.1:${port}/tools/mockup/index.html`);
await page.waitForFunction(() => window.ready === true);
const out = {};
for (const cand of ['a', 'b', 'c', 'c6']) for (const sc of ['vista', 'road', 'fire']) {
  await page.evaluate(({ cand, sc }) => window.benchMockup(cand, sc, 3), { cand, sc });   // warm up
  const r = await page.evaluate(({ cand, sc }) => window.benchMockup(cand, sc, 15), { cand, sc });
  (out[cand] ||= {})[sc] = r;
  console.log(cand.padEnd(3), sc.padEnd(6), JSON.stringify(r));
}
fs.writeFileSync(path.join(ROOT, 'tools/frames/bench.json'), JSON.stringify(out, null, 1));
await browser.close(); server.close();
