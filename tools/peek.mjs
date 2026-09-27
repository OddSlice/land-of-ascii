// Quick look at v1 from a camera: node tools/peek.mjs out.png x y z yawDeg pitchPx hour [seed]
import { startServer, launch } from './lib/harness.mjs';
import { MAC_METRICS, HIDE_OVERLAYS, showScene } from './lib/v1.mjs';
const [out, x, y, z, yawDeg, pitch, hour, seed = 42] = process.argv.slice(2);
const { server, port } = await startServer();
const { browser, page } = await launch();
await page.addInitScript(MAC_METRICS);
await page.goto(`http://127.0.0.1:${port}/reference/v1-index.html?seed=${seed}`);
await page.waitForFunction(() => window.TV && window.TV.world.structs.length > 0);
await page.addStyleTag({ content: HIDE_OVERLAYS });
await showScene(page, { seed: +seed, hour: +hour, cam: { x: +x, y: +y, z: +z, yaw: +yawDeg * Math.PI / 180, pitch: +pitch } });
await page.screenshot({ path: out });
const g = await page.evaluate(() => ({ cols: TV.grid.cols, rows: TV.grid.rows, cw: TV.grid.cellW, ch: TV.grid.cellH, ground: TV.groundAt(TV.cam.x, TV.cam.z, 1e9) }));
console.log(out, JSON.stringify(g));
await browser.close(); server.close();
