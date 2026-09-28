// v2's world is its own since phase 2; its movement code is still v1's (tools/check-verbatim.mjs).
//   1. Worlds: for several seeds, generating a world twice gives the same checksum of every world
//      array and object (heights, materials, regions, climate, water, roads, trees, structures and
//      their voxels, lights, clouds, birds, merchants), and it matches the checksum recorded in
//      tools/world-hashes.json. After a deliberate change to world generation, re-record with
//      --record. No height is NaN or out of reach, no land lies below the sea, and every region
//      is present.
//   2. Movement: v1 (reference/v1-index.html, with the fixes in tools/lib/v2-fixes.mjs applied as
//      it is served) is loaded with v2's world, and both are driven through one scripted session of
//      held keys and mouse turns, stepped through TV.update(1/60) and TV.updateMerchants(1/60): the
//      player, camera, merchants and clock must be bit-identical after every step. Along the way
//      the player never falls through the ground and never gets stuck.
//   3. Walks: from outside every castle gate and every tower door, walk in; both must end inside the
//      footprint, on the same path.
//   4. Bridges: on every seed, walk across every bridge from one bank to the other, both ways: the
//      walk must reach the far bank and never drop below the deck on the way (into the river).
//   5. Weather: each day's plan (rain or snow, dawn fog, aurora) is the same every time for a seed,
//      day and hour, stays within 0..1, and over 60 days each kind comes about as often as meant; the
//      day counts up as the clock passes midnight.
// Page time is frozen in both, so the render loop never runs between the steps we take.
//   node tools/test-sim.mjs [--record]
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, ROOT, TIME_CONTROL } from './lib/harness.mjs';
import { applyFixes } from './lib/v2-fixes.mjs';

const record = process.argv.includes('--record');
const SEEDS = [42, 7, 1234, 99991, 31337];
const HASH_FILE = path.join(ROOT, 'tools/world-hashes.json');
const { server, port } = await startServer();
const { browser, page: p1 } = await launch();
const v1Fixed = applyFixes(fs.readFileSync(path.join(ROOT, 'reference/v1-index.html'), 'utf8'));
await p1.route('**/reference/v1-index.html*', route => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: v1Fixed }));
await p1.addInitScript(() => { window.deckAt = () => -Infinity; window.spawnAt = s => s.half + 14; });   // (v1's own world has no bridges and starts as v1 did; v2's, taken below, brings its decks, and the session starts where v2 does)
const p2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await p2.addInitScript(TIME_CONTROL);
p2.on('pageerror', e => console.error('[v2 pageerror]', e.message));
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
  for (const k of ['H', 'mat', 'biome', 'heat', 'damp', 'water', 'road', 'treeMask', 'tex', 'nx', 'ny', 'nz']) { h = 2166136261 >>> 0; bytes(w[k]); parts[k] = h; }
  for (const k of ['seaLevel', 'rockLine', 'snowLine', 'rivers', 'roads', 'trees', 'birds', 'clouds', 'wind', 'lights']) { h = 2166136261 >>> 0; any(w[k]); parts[k] = h; }
  h = 2166136261 >>> 0; for (const s of w.structs) { const { tpl, ...rest } = s; any(rest); any(tpl.vox); any(tpl.topSolid); any(tpl.spans); num(tpl.sx); num(tpl.sy); num(tpl.sz); } parts.structs = h;
  h = 2166136261 >>> 0; for (const m of w.merchants) { any({ name: m.name, greeting: m.greeting, goods: m.goods, robe: m.robe, cells: m.cells, cum: m.cum, total: m.total, s: m.s, dir: m.dir, x: m.x, y: m.y, z: m.z }); } parts.merchants = h;
  return parts;
};
// Sanity of one world: heights, water, regions.
const WORLD_CHECK = () => {
  const TV = window.TV, w = TV.world, D = TV.defs, N = w.H.length, out = { nan: 0, above: 0, drowned: 0, top: -Infinity, regions: {} };
  const counts = new Array(D.BIOME_NAMES.length).fill(0);
  for (let i = 0; i < N; i++) {
    const h = w.H[i];
    if (!(h === h) || !Number.isFinite(h)) { out.nan++; continue; }
    if (h > out.top) out.top = h;
    if (h > 280) out.above++;                                   // out of reach: above the fly camera's ceiling (HEIGHT_SCALE × 2)
    if (h < w.seaLevel) out.drowned++;                          // nothing lies below the sea: the sea fills it
    counts[w.biome[i]]++;
  }
  for (let i = 0; i < w.trees.n; i++) if (!(w.trees.y[i] === w.trees.y[i])) out.nan++;
  let land = 0;
  for (let b = 1; b < counts.length; b++) land += counts[b];
  D.BIOME_NAMES.forEach((n, b) => { if (b) out.regions[n] = +(100 * counts[b] / land).toFixed(1); });
  return out;
};

async function load(page, url, seed) {
  await page.goto(`http://127.0.0.1:${port}/${url}?seed=${seed}`);
  await page.waitForFunction(() => window.TV && window.TV.world.structs.length > 0);
}

// ---- 1. worlds ----
console.log('1. worlds');
const recorded = fs.existsSync(HASH_FILE) ? JSON.parse(fs.readFileSync(HASH_FILE, 'utf8')) : { seeds: {} };
await load(p2, 'index.html', SEEDS[0]);
for (const seed of SEEDS) {
  const t0 = Date.now();
  await p2.evaluate(s => window.TV.regenerate(s), seed);
  const ms = Date.now() - t0;
  const h1 = await p2.evaluate(WORLD_HASH);
  const check = await p2.evaluate(WORLD_CHECK);
  await p2.evaluate(s => window.TV.regenerate(s + 1), seed);   // something else in between
  await p2.evaluate(s => window.TV.regenerate(s), seed);
  const h2 = await p2.evaluate(WORLD_HASH);
  const unstable = Object.keys(h1).filter(k => h1[k] !== h2[k]);
  const rec = recorded.seeds[seed];
  const changed = rec ? Object.keys(h1).filter(k => h1[k] !== rec[k]) : [];
  const missing = Object.entries(check.regions).filter(([, v]) => !(v > 0)).map(([n]) => n);
  if (unstable.length) fail(`seed ${seed}: generating twice differs in ${unstable.join(', ')}`);
  else if (!rec && !record) fail(`seed ${seed}: no recorded hashes (run with --record)`);
  else if (changed.length && !record) fail(`seed ${seed}: differs from the recorded world in ${changed.join(', ')} (if deliberate, run with --record)`);
  else if (check.nan) fail(`seed ${seed}: ${check.nan} NaN heights`);
  else if (check.above || check.drowned) fail(`seed ${seed}: ${check.above} heights out of reach, ${check.drowned} below the sea`);
  else if (missing.length) fail(`seed ${seed}: no ${missing.join(', ')}`);
  else console.log(`  seed ${seed}: deterministic${rec && !changed.length ? ', as recorded' : ''} (${Object.keys(h1).length} parts), ${ms} ms, highest ${check.top.toFixed(1)}; ` +
    Object.entries(check.regions).map(([n, v]) => `${n} ${v}%`).join(', '));
  if (record) recorded.seeds[seed] = h1;
}
if (record) {
  recorded.note = 'Checksums of each seed\'s world, part by part (tools/test-sim.mjs). Re-record with node tools/test-sim.mjs --record after a deliberate change to world generation. Recorded in Chromium.';
  fs.writeFileSync(HASH_FILE, JSON.stringify(recorded, null, 1) + '\n');
  console.log('  recorded tools/world-hashes.json');
}

// v2's world, in a form v1's page can take: the heights, tree trunks, landmarks and merchants its
// movement and merchant code read.
const WORLD_FOR_V1 = () => {
  const w = window.TV.world;
  return {
    H: Array.from(w.H), treeMask: Array.from(w.treeMask),
    structs: w.structs.map(s => ({ type: s.type, variant: s.variant, cx: s.cx, cz: s.cz, half: s.half, baseY: s.baseY, x0: s.x0, z0: s.z0, radius: s.radius, anchor: s.anchor,
      tpl: { sx: s.tpl.sx, sy: s.tpl.sy, sz: s.tpl.sz, spans: s.tpl.spans, topSolid: Array.from(s.tpl.topSolid) } })),
    merchants: w.merchants.map(m => ({ name: m.name, greeting: m.greeting, goods: m.goods, robe: m.robe, cells: m.cells, cum: Array.from(m.cum), total: m.total, s: m.s, dir: m.dir, walked: m.walked, x: m.x, y: m.y, z: m.z, seg: m.seg })),
    bridges: w.bridges.map(b => ({ cx: b.s.cx, cz: b.s.cz, x0: b.s.x0, z0: b.s.z0, sx: b.s.tpl.sx, sz: b.s.tpl.sz, alongX: b.alongX, deck: Array.from(b.deck) })), W: window.TV.defs.W,
  };
};
const TAKE_WORLD = d => {
  const w = window.TV.world;
  w.H.set(d.H); w.treeMask.set(d.treeMask);
  w.structs = d.structs.map(s => ({ ...s, tpl: { ...s.tpl, topSolid: Uint8Array.from(s.tpl.topSolid) } }));
  w.merchants = d.merchants.map(m => ({ ...m, cum: Float32Array.from(m.cum) }));
  // v1 with the merchant fix applied asks for the deck under a merchant: the same lookup as v2's deckAt
  const W = d.W, wrapDelta = v => v > W / 2 ? v - W : v < -W / 2 ? v + W : v;
  window.deckAt = (x, z) => {
    for (const b of d.bridges) {
      const lx = Math.floor(b.cx + wrapDelta(x - b.cx) - b.x0), lz = Math.floor(b.cz + wrapDelta(z - b.cz) - b.z0);
      if (lx >= 0 && lx < b.sx && lz >= 0 && lz < b.sz) return b.deck[b.alongX ? lx : lz];
    }
    return -Infinity;
  };
};
const START = () => { const TV = window.TV, c = TV.cam, p = TV.player; return { cam: { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch }, player: { mode: p.mode, feetY: p.feetY, vy: p.vy, grounded: p.grounded }, hours: TV.clock.hours }; };
const SET_START = st => { const TV = window.TV; Object.assign(TV.cam, st.cam); Object.assign(TV.player, st.player); TV.clock.hours = st.hours; };

// Both pages on seed 42, v1 carrying v2's world.
await load(p1, 'reference/v1-index.html', 42);
await load(p2, 'index.html', 42);
await p1.evaluate(TAKE_WORLD, await p2.evaluate(WORLD_FOR_V1));

// ---- 2. a scripted session ----
console.log('2. scripted session on v2\'s world, seed 42: v1\'s movement code and v2\'s');
const SCRIPT = [   // [seconds, keys held, yaw turn per second, extra action]
  [2.0, ['KeyW'], 0], [1.0, ['KeyW', 'ShiftLeft'], 0.8], [0.4, ['KeyW', 'Space'], 0], [1.5, ['KeyA'], -0.5],
  [2.0, ['KeyW'], 1.2], [0.8, ['KeyS', 'KeyD'], 0], [0.5, [], 0, 'fly'], [2.0, ['KeyW', 'Space'], 0.3],
  [1.0, ['KeyW', 'ShiftLeft'], 0], [0.5, [], 0, 'walk'], [3.0, [], 0], [4.0, ['KeyW'], -0.7], [2.0, ['KeyW', 'Space'], 0.2],
];
const start = await p2.evaluate(START);
for (const page of [p1, p2]) await page.evaluate(() => { window.TV.clock.scale = 1; });
await p1.evaluate(SET_START, start);
let steps = 0, firstDiff = null, fell = null;
const stuck = [];
for (const [secs, keys, turn, action] of SCRIPT) {
  const n = Math.round(secs * 60);
  const states = [];
  for (const page of [p1, p2]) {
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
        const st = STATE();
        // how far the feet are below the ground under them (walking only; > 0 would be falling through)
        st.push(TV.player.mode === 'walk' ? TV.groundAt(TV.cam.x, TV.cam.z, TV.player.feetY) - TV.player.feetY : 0);
        out.push(st);
      }
      return out;
    }, { n, keys, turn, action }));
  }
  for (let i = 0; i < n; i++) {
    const a = states[0][i].slice(0, -1), b = states[1][i].slice(0, -1);
    const j = a.findIndex((v, k) => !Object.is(v, b[k]));
    if (j >= 0 && !firstDiff) firstDiff = { step: steps + i, field: j, v1: a[j], v2: b[j] };
    const below = states[1][i][states[1][i].length - 1];
    if (!(below <= 1e-6) && !fell) fell = { step: steps + i, below };
  }
  // a walking segment of a second or more with movement keys held must get somewhere, unless a wall
  // or a rise too high to step up stands right ahead (walking into a cliff is not being stuck)
  const moving = keys.some(k => ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(k));
  const first = states[1][0], last = states[1][n - 1];
  if (moving && secs >= 1 && last[8] === 1 && Math.hypot(last[0] - first[0], last[2] - first[2]) < 0.1) {
    const rise = await p2.evaluate(() => { const TV = window.TV, c = TV.cam; return TV.groundAt(c.x + Math.cos(c.yaw) * 0.9, c.z + Math.sin(c.yaw) * 0.9, 1e9) - TV.player.feetY; });
    if (rise > 1.05) console.log(`  (${secs} s of ${keys.join('+')} at step ${steps}: against a rise of ${rise.toFixed(1)} ahead, not stuck)`);
    else stuck.push(`${secs} s of ${keys.join('+')} at step ${steps}`);
  }
  steps += n;
}
if (firstDiff) fail(`session diverges at step ${firstDiff.step}, field ${firstDiff.field}: v1 ${firstDiff.v1} v2 ${firstDiff.v2}`);
else console.log(`  ${steps} steps (${(steps / 60).toFixed(1)} s of play): player, camera, merchants and clock bit-identical`);
if (fell) fail(`the player's feet went ${fell.below.toFixed(3)} below the ground at step ${fell.step}`);
else console.log('  never below the ground');
if (stuck.length) fail('stuck: ' + stuck.join('; '));
else console.log('  never stuck');

// ---- 3. walks through every gate and door ----
console.log('3. gate and door walks, seed 42');
const walks = await p2.evaluate(() => window.TV.world.structs.map((s, i) => ({ i, type: s.type, cx: s.cx, cz: s.cz, half: s.half, z0: s.z0, sz: s.tpl.sz, W: window.TV.defs.W })).filter(s => s.type === 'castle' || s.type === 'tower'));
for (const s of walks) {
  const res = [];
  for (const page of [p1, p2]) {
    res.push(await page.evaluate(s => {
      const TV = window.TV, W = s.W;
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

// ---- 4. walks across every bridge ----
// Along the road over each bridge: where the deck is out in the open (not under the bank), walk it end
// to end both ways; and the road on either side must be within a step of the deck, so you can get on
// and off. (Whether the road beyond is walkable is up to the road: in rugged country it can climb a
// cliff next to a bridge.)
console.log('4. bridge walks, every seed');
for (const seed of SEEDS) {
  const res = await p2.evaluate(seed => {
    const TV = window.TV, W = TV.defs.W, w = TV.world, out = [], STEP = 1.05;
    if (w.seed !== seed) TV.regenerate(seed);
    TV.clock.scale = 0;
    const wrap = d => ((d % W) + W * 1.5) % W - W / 2, ctr = c => [(c % W) + 0.5, Math.floor(c / W) + 0.5];
    for (const b of w.bridges) {
      const s = b.s, deck = c => { const [x, z] = ctr(c), d = TV.deckAt(x, z); return d > -Infinity && d >= TV.groundAt(x, z, -1e9) - 0.05 ? d : null; };
      let path = null;
      for (const cells of w.roads) {
        const k0 = cells.findIndex(c => deck(c) !== null && TV.deckAt(...ctr(c)) === deck(c) && w.bridges.indexOf(b) === w.bridges.findIndex(bb => bb.s === s) && (() => { const [x, z] = ctr(c), lx = Math.floor(s.cx + wrap(x - s.cx) - s.x0), lz = Math.floor(s.cz + wrap(z - s.cz) - s.z0); return lx >= 0 && lx < s.tpl.sx && lz >= 0 && lz < s.tpl.sz; })());
        if (k0 < 0) continue;
        let k1 = k0; while (k1 + 1 < cells.length && deck(cells[k1 + 1]) !== null) k1++;
        path = cells.slice(Math.max(0, k0 - 1), Math.min(cells.length, k1 + 2));
        break;
      }
      if (!path) { out.push({ variant: s.variant, L: b.L, dir: 1, ok: false, why: 'no road over it' }); continue; }
      // getting on and off: the road cell either side against the deck next to it, where the road
      // there was walkable without the bridge (in rugged country a road can come down a cliff)
      const ends = [[path[0], path[1]], [path[path.length - 1], path[path.length - 2]]].map(([off, on]) => {
        const [x, z] = ctr(off), g = TV.deckAt(x, z) > -Infinity ? Math.max(TV.groundAt(x, z, -1e9), TV.deckAt(x, z)) : TV.groundAt(x, z, -1e9);
        const road = g - TV.groundAt(...ctr(on), -1e9);
        return road <= STEP ? +(g - deck(on)).toFixed(2) : 0;
      });
      for (const dir of [1, -1]) {
        const cells = (dir > 0 ? path : path.slice().reverse()).slice(1, -1);
        [TV.cam.x, TV.cam.z] = ctr(cells[0]); TV.cam.pitch = 0;
        TV.setMode('fly'); TV.cam.y = deck(cells[0]) + 1.6; TV.setMode('walk');
        for (const k of Object.keys(TV.keys)) TV.keys[k] = false;
        let k = 1, lowest = Infinity;
        // follow the road cell by cell, as a merchant does: face the next cell, walk, next
        for (let i = 0; i < 60 * 40 && k < cells.length; i++) {
          const [tx, tz] = ctr(cells[k]), ddx = wrap(tx - TV.cam.x), ddz = wrap(tz - TV.cam.z);
          if (Math.hypot(ddx, ddz) < 0.35) { k++; continue; }
          TV.cam.yaw = Math.atan2(ddz, ddx); TV.keys.KeyW = true;
          TV.update(1 / 60);
          const d = TV.deckAt(TV.cam.x, TV.cam.z);
          if (d > -Infinity) lowest = Math.min(lowest, TV.player.feetY - d);   // on the deck: never below it
        }
        TV.keys.KeyW = false;
        const reached = k >= cells.length;
        out.push({ variant: s.variant, L: b.L, dir, ok: reached && lowest > -0.05 && ends.every(e => e <= STEP), reached, lowest: +lowest.toFixed(3), ends, at: [Math.round(TV.cam.x), Math.round(TV.cam.z)], k, n: cells.length });
      }
    }
    return out;
  }, seed);
  for (const r of res) if (!r.ok) fail(`seed ${seed}: ${r.variant} bridge (${r.L} long), walking ${r.dir > 0 ? 'forward' : 'back'}: ${r.why || `reached=${r.reached} (cell ${r.k} of ${r.n}, at ${r.at}), lowest ${r.lowest} against the deck, road either side ${r.ends.join(' / ')} above it`}`);
  console.log(`  seed ${seed}: ${res.filter(r => r.dir > 0).map(r => r.variant + ' ' + r.L).join(', ') || 'no bridges'}${res.length && res.every(r => r.ok) ? ': walked across both ways on the deck; on and off within a step' : ''}`);
}

// ---- 5. weather ----
console.log('5. weather, every seed');
for (const seed of SEEDS) {
  const r = await p2.evaluate(seed => {
    const TV = window.TV, DAYS = 60;
    let rainDays = 0, fogDays = 0, auroraNights = 0, same = true, inRange = true;
    for (let d = 0; d < DAYS; d++) {
      let rain = 0, fog = 0, aur = 0;
      for (let h = 0; h < 24; h += 0.25) {
        const a = TV.weatherAt(seed, d, h), b = TV.weatherAt(seed, d, h);
        if (a.precip !== b.precip || a.fog !== b.fog || a.aurora !== b.aurora) same = false;
        for (const v of [a.precip, a.fog, a.aurora]) if (!(v >= 0 && v <= 1)) inRange = false;
        rain = Math.max(rain, a.precip); fog = Math.max(fog, a.fog); if (h >= 22) aur = Math.max(aur, a.aurora);
      }
      if (rain > 0.3) rainDays++; if (fog > 0.3) fogDays++; if (aur > 0.3) auroraNights++;
    }
    // the day counter: the clock passing midnight moves it on, and setting it back moves it back
    if (TV.world.seed !== seed) TV.regenerate(seed);
    TV.setWeather(null); TV.clock.hours = 23.9; TV.updateWeather(0);
    const d0 = TV.weather.day; TV.clock.hours = 0.1; TV.updateWeather(0); const d1 = TV.weather.day; TV.clock.hours = 23.8; TV.updateWeather(0); const d2 = TV.weather.day;
    return { same, inRange, rainDays: rainDays / DAYS, fogDays: fogDays / DAYS, auroraNights: auroraNights / DAYS, days: [d0, d1, d2] };
  }, seed);
  const ok = r.same && r.inRange && r.rainDays > 0.15 && r.rainDays < 0.6 && r.fogDays > 0.25 && r.fogDays < 0.75 && r.auroraNights > 0.15 && r.auroraNights < 0.65 && r.days[1] === r.days[0] + 1 && r.days[2] === r.days[0];
  if (!ok) fail(`seed ${seed}: weather ${JSON.stringify(r)}`);
  else console.log(`  seed ${seed}: over 60 days rain on ${Math.round(r.rainDays * 100)}%, dawn fog on ${Math.round(r.fogDays * 100)}%, an aurora on ${Math.round(r.auroraNights * 100)}% of nights; the same every time; the day turns at midnight`);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
await browser.close(); server.close();
process.exit(failures ? 1 : 0);
