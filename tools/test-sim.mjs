// v2's simulation came from v1 and must still behave exactly like it, apart from the deliberate
// fixes in tools/lib/v2-fixes.mjs: v1 (reference/v1-index.html, with those fixes applied as it is
// served) and v2 (index.html) are driven side by side and must agree exactly.
//   1. World: for several seeds, a checksum of every world array and object (heights, materials,
//      water, roads, trees, structures and their voxels, lights, clouds, birds, merchants).
//   2. Simulation: one scripted session of held keys and mouse turns, stepped through
//      TV.update(1/60) and TV.updateMerchants(1/60); the player, camera, merchants and clock must
//      be bit-identical after every step.
//   3. Walks: from outside every castle gate and every tower door, walk in; both must end inside
//      the footprint, on the same path.
//   4. No NaN: no height in any of v2's worlds is NaN (the first fix).
// Page time is frozen in both, so the render loop never runs between the steps we take.
//   node tools/test-sim.mjs
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, ROOT } from './lib/harness.mjs';
import { applyFixes } from './lib/v2-fixes.mjs';

const SEEDS = [42, 7, 1234, 99991, 31337];
const { server, port } = await startServer();
const { browser, page: p1 } = await launch();
const v1Fixed = applyFixes(fs.readFileSync(path.join(ROOT, 'reference/v1-index.html'), 'utf8'));
await p1.route('**/reference/v1-index.html*', route => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: v1Fixed }));
const p2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const { TIME_CONTROL } = await import('./lib/harness.mjs');
await p2.addInitScript(TIME_CONTROL);
p2.on('pageerror', e => console.error('[v2 pageerror]', e.message));
const pages = [['v1', p1, 'reference/v1-index.html'], ['v2', p2, 'index.html']];
let failures = 0;
const fail = msg => { failures++; console.log('  FAIL ' + msg); };

// Hash every byte of the world's state. Float arrays are hashed through their raw bytes, so a NaN
// matches only the same NaN.
const WORLD_HASH = () => {
  const TV = window.TV, w = TV.world;
  let h = 2166136261 >>> 0;
  const bytes = a => { const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); for (let i = 0; i < u.length; i++) h = Math.imul(h ^ u[i], 16777619) >>> 0; };
  const num = v => bytes(Float64Array.of(v));
  const str = s => { for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; };
  const any = v => {
    if (v === null || v === undefined) return str(String(v));
    if (typeof v === 'number') return num(v);
    if (typeof v === 'string') return str(v);
    if (typeof v === 'boolean') return str(v ? 'T' : 'F');
    if (typeof v === 'function') return;
    if (ArrayBuffer.isView(v)) return bytes(v);
    if (Array.isArray(v)) { num(v.length); for (const x of v) any(x); return; }
    for (const k of Object.keys(v).sort()) { str(k); any(v[k]); }
  };
  const parts = {};
  for (const k of ['H', 'mat', 'water', 'road', 'treeMask', 'tex', 'nx', 'ny', 'nz']) { h = 2166136261 >>> 0; bytes(w[k]); parts[k] = h; }
  for (const k of ['seaLevel', 'rockLine', 'snowLine', 'rivers', 'roads', 'trees', 'birds', 'clouds', 'wind', 'lights']) { h = 2166136261 >>> 0; any(w[k]); parts[k] = h; }
  h = 2166136261 >>> 0; for (const s of w.structs) { const { tpl, ...rest } = s; any(rest); any(tpl.vox); any(tpl.topSolid); any(tpl.spans); num(tpl.sx); num(tpl.sy); num(tpl.sz); } parts.structs = h;
  h = 2166136261 >>> 0; for (const m of w.merchants) { any({ name: m.name, greeting: m.greeting, goods: m.goods, robe: m.robe, cells: m.cells, cum: m.cum, total: m.total, s: m.s, dir: m.dir, x: m.x, y: m.y, z: m.z }); } parts.merchants = h;
  return parts;
};
const STATE = () => {
  const TV = window.TV, c = TV.cam, p = TV.player;
  const out = [c.x, c.y, c.z, c.yaw, c.pitch, p.feetY, p.vy, p.grounded ? 1 : 0, p.mode === 'walk' ? 1 : 0, TV.clock.hours];
  for (const m of TV.world.merchants) out.push(m.x, m.y, m.z, m.s, m.dir, m.walked, m.seg);
  out.push(TV.ui.nearest ? TV.world.merchants.indexOf(TV.ui.nearest) : -1);
  return out;
};

async function load(page, url, seed) {
  await page.goto(`http://127.0.0.1:${port}/${url}?seed=${seed}`);
  await page.waitForFunction(() => window.TV && window.TV.world.structs.length > 0);
}

// ---- 1. worlds ----
console.log('1. worlds');
for (const seed of SEEDS) {
  const res = [];
  for (const [, page, url] of pages) { await load(page, url, seed); res.push(await page.evaluate(WORLD_HASH)); }
  const bad = Object.keys(res[0]).filter(k => res[0][k] !== res[1][k]);
  const nan = await p2.evaluate(() => { const H = window.TV.world.H, T = window.TV.world.trees; let n = 0; for (let i = 0; i < H.length; i++) if (H[i] !== H[i]) n++; for (let i = 0; i < T.n; i++) if (T.y[i] !== T.y[i]) n++; return n; });
  if (bad.length) fail(`seed ${seed}: differs in ${bad.join(', ')}`);
  else if (nan) fail(`seed ${seed}: ${nan} NaN heights in v2`);
  else console.log(`  seed ${seed}: identical (${Object.keys(res[0]).length} parts), no NaN heights`);
}

// ---- 2. a scripted session ----
console.log('2. scripted session, seed 42');
const SCRIPT = [   // [seconds, keys held, yaw turn per second, extra action]
  [2.0, ['KeyW'], 0], [1.0, ['KeyW', 'ShiftLeft'], 0.8], [0.4, ['KeyW', 'Space'], 0], [1.5, ['KeyA'], -0.5],
  [2.0, ['KeyW'], 1.2], [0.8, ['KeyS', 'KeyD'], 0], [0.5, [], 0, 'fly'], [2.0, ['KeyW', 'Space'], 0.3],
  [1.0, ['KeyW', 'ShiftLeft'], 0], [0.5, [], 0, 'walk'], [3.0, [], 0], [4.0, ['KeyW'], -0.7], [2.0, ['KeyW', 'Space'], 0.2],
];
for (const [, page, url] of pages) {
  await load(page, url, 42);
  await page.evaluate(() => { window.TV.clock.scale = 1; });
}
let steps = 0, firstDiff = null;
for (const [secs, keys, turn, action] of SCRIPT) {
  const n = Math.round(secs * 60);
  const states = [];
  for (const [, page] of pages) {
    states.push(await page.evaluate(({ n, keys, turn, action }) => {
      const TV = window.TV, out = [];
      if (action) TV.setMode(action);
      for (const k of Object.keys(TV.keys)) TV.keys[k] = false;
      for (const k of keys) TV.keys[k] = true;
      const STATE = () => {
        const c = TV.cam, p = TV.player, o = [c.x, c.y, c.z, c.yaw, c.pitch, p.feetY, p.vy, p.grounded ? 1 : 0, p.mode === 'walk' ? 1 : 0, TV.clock.hours];
        for (const m of TV.world.merchants) o.push(m.x, m.y, m.z, m.s, m.dir, m.walked, m.seg);
        o.push(TV.ui.nearest ? TV.world.merchants.indexOf(TV.ui.nearest) : -1);
        return o;
      };
      for (let i = 0; i < n; i++) {
        TV.cam.yaw += turn / 60;
        TV.update(1 / 60); TV.updateMerchants(1 / 60); TV.updateNearest();
        out.push(STATE());
      }
      return out;
    }, { n, keys, turn, action }));
  }
  for (let i = 0; i < n; i++) {
    const a = states[0][i], b = states[1][i];
    const j = a.findIndex((v, k) => !Object.is(v, b[k]));
    if (j >= 0 && !firstDiff) firstDiff = { step: steps + i, field: j, v1: a[j], v2: b[j] };
  }
  steps += n;
}
if (firstDiff) fail(`session diverges at step ${firstDiff.step}, field ${firstDiff.field}: v1 ${firstDiff.v1} v2 ${firstDiff.v2}`);
else console.log(`  ${steps} steps (${(steps / 60).toFixed(1)} s of play): player, camera, merchants and clock bit-identical`);

// ---- 3. walks through every gate and door ----
console.log('3. gate and door walks, seed 42');
const walks = await p1.evaluate(() => window.TV.world.structs.map((s, i) => ({ i, type: s.type, cx: s.cx, cz: s.cz, half: s.half, z0: s.z0, sz: s.tpl.sz })).filter(s => s.type === 'castle' || s.type === 'tower'));
for (const s of walks) {
  const res = [];
  for (const [, page, url] of pages) {
    await load(page, url, 42);
    res.push(await page.evaluate(s => {
      const TV = window.TV, W = 512;
      TV.clock.scale = 0; TV.setMode('walk');
      for (const k of Object.keys(TV.keys)) TV.keys[k] = false;
      // stand three cells outside the south-facing entrance, facing north, and walk in
      TV.cam.x = s.cx + 0.5; TV.cam.z = ((s.z0 + s.sz + 3) % W + W) % W; TV.cam.yaw = -Math.PI / 2; TV.cam.pitch = 0;
      TV.setMode('fly'); TV.setMode('walk');   // settle the feet on the ground below
      TV.keys.KeyW = true;
      const path = [];
      for (let i = 0; i < 60 * 6; i++) { TV.update(1 / 60); if (i % 30 === 0) path.push([TV.cam.x, TV.cam.y, TV.cam.z]); }
      TV.keys.KeyW = false;
      const dz = ((TV.cam.z - s.cz) % W + W * 1.5) % W - W / 2;   // wrapped offset from the centre
      return { inside: Math.abs(dz) < s.half, dz: +dz.toFixed(2), y: +TV.cam.y.toFixed(2), path };
    }, s));
  }
  const same = JSON.stringify(res[0].path) === JSON.stringify(res[1].path);
  const ok = res[0].inside && res[1].inside && same;
  if (!ok) fail(`${s.type} ${s.i}: v1 inside=${res[0].inside} (dz ${res[0].dz}), v2 inside=${res[1].inside} (dz ${res[1].dz}), same path=${same}`);
  else console.log(`  ${s.type.padEnd(6)} #${String(s.i).padEnd(2)} walked in: ${res[1].dz} from the centre, eye at ${res[1].y}; identical path`);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
await browser.close(); server.close();
process.exit(failures ? 1 : 0);
