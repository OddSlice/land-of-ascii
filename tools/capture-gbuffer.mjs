// Dump one frame's worth of world data per scene from the instrumented v1 renderer at 1x1 px cells
// (1440x900 samples): tools/frames/<scene>/*.bin + meta.json, plus v1-1px.png as a sanity image.
//   node tools/build-gbuffer.mjs && node tools/capture-gbuffer.mjs [scene...]
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, resolveCam, ROOT } from './lib/harness.mjs';

const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/scenes.json'), 'utf8'));
const only = process.argv.slice(2);
const { server, port } = await startServer();
const { browser, page } = await launch();
await page.goto(`http://127.0.0.1:${port}/tools/gbuffer/v1-gbuffer.html?seed=${cfg.seed}`);
await page.waitForFunction(() => window.TVX && window.TV.world.structs.length > 0);
await page.addStyleTag({ content: '#hud,#help,#hint,#prompt,#panel{display:none!important}' });

for (const sc of cfg.scenes) {
  if (only.length && !only.includes(sc.name)) continue;
  const cam = await resolveCam(page, sc);
  const t0 = Date.now();
  const meta = await page.evaluate(async ({ sc, cam }) => {
    const { TV, TVX } = window;
    TV.clock.scale = 0; TV.setMode('fly');
    Object.assign(TV.cam, cam);
    TV.clock.hours = sc.hour;
    for (const m of sc.merchants || []) { const M = TV.world.merchants[m.i]; M.s = m.s; M.dir = m.dir ?? 1; if (m.walked != null) M.walked = m.walked; }
    TV.updateMerchants(0);
    TVX.setForceCell(1, 1);
    const tSec = (sc.t ?? 1000) / 1000;
    TVX.blendPalette(sc.hour); TVX.buildLUT(); TVX.updateLighting(); TVX.collectLights(tSec);
    const r0 = performance.now();
    TVX.render(tSec);
    TVX.compose();
    const g = TVX.grid, gb = TVX.gb;
    const channels = {
      kind: gb.kind, mat: gb.mat, face: gb.face, tex: gb.tex, shade: gb.shade, u: gb.u, v: gb.v, reflAmt: gb.reflAmt,
      obj: gb.obj, light: gb.light, refl: gb.refl, depth: g.depth, color: g.colors, flags: g.flags,
    };
    const list = [];
    for (const [name, arr] of Object.entries(channels)) {
      const res = await fetch(`/save?path=tools/frames/${sc.name}/${name}.bin`, { method: 'POST', body: arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) });
      if (!res.ok) throw new Error('save failed ' + name);
      list.push({ name, type: arr.constructor.name, bytes: arr.byteLength });
    }
    const cur = JSON.parse(JSON.stringify(TVX.cur));
    const W = 512;
    return {
      scene: sc.name, title: sc.title, seed: TV.world.seed, hour: sc.hour, tSec,
      cols: g.cols, rows: g.rows, width: g.w, height: g.h, f: g.f, fov: TVX.FOV,
      cam: { ...TV.cam }, horizonPix: g.h * 0.5 + TV.cam.pitch, viewDist: TVX.view.dist,
      sun: TVX.sun(), moon: TVX.moon(), sky: TVX.skyState(sc.hour),
      light: { lx: TVX.light.lx, ly: TVX.light.ly, lz: TVX.light.lz, darkness: TVX.light.darkness },
      palette: cur, fogAmt: Array.from(TVX.FOG_AMT),
      seaLevel: TV.world.seaLevel, snowLine: TV.world.snowLine, rockLine: TV.world.rockLine,
      activeLights: TVX.activeLights.map(L => ({ x: L.x, y: L.y, z: L.z, r: L.r, color: [L.cr, L.cg, L.cb], i: L.i })),
      birds: TVX.gbMeta.birds, flames: TVX.gbMeta.flames, sprites: TVX.gbMeta.sprites,
      merchants: TV.world.merchants.map(m => ({ name: m.name, x: m.x, y: m.y, z: m.z, robe: m.robe })),
      renderMs1px: +(performance.now() - r0).toFixed(1),
      channels: list,
      kinds: { 255: 'unpainted', 0: 'sky', 1: 'terrain', 2: 'wall', 3: 'roof/top', 4: 'underside', 5: 'tree canopy', 6: 'conifer', 7: 'bush', 8: 'trunk', 9: 'boulder', 10: 'merchant', 11: 'bird', 12: 'cloud', 13: 'flame', 14: 'fire logs', 15: 'torch bracket', 16: 'sun', 17: 'moon' },
      mats: { 0: 'water', 1: 'grass', 2: 'rock', 3: 'snow', 4: 'haze', 5: 'stone', 6: 'wood', 7: 'leaf', 8: 'road', 9: 'grass2' },
      merchantParts: { 1: 'staff', 2: 'lantern', 3: 'boots', 4: 'trousers', 5: 'belt', 6: 'robe', 7: 'robe fold', 8: 'hand', 9: 'sleeve', 10: 'face', 11: 'eye', 12: 'hat brim', 13: 'hat crown' },
    };
  }, { sc, cam });
  const dir = path.join(ROOT, 'tools/frames', sc.name);
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 1));
  await page.screenshot({ path: path.join(dir, 'v1-1px.png') });
  console.log(sc.name, 'captured in', Date.now() - t0, 'ms; 1px render', meta.renderMs1px, 'ms; birds', meta.birds.length, 'flames', meta.flames.length, 'sprites', meta.sprites.length);
}
await browser.close();
server.close();
