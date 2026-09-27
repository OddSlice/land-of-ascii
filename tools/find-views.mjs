// Find a camera for every region of a world, so the scenes can be re-aimed whenever world
// generation changes. Each candidate spot and heading is scored by what an eye there would actually
// see: rays are marched out across the view over the heightmap, and every patch of ground that
// rises above the running horizon counts, by how much it shows of the region wanted. Inland regions
// are seen from within; the beach from the sand looking along the shore; sea cliffs from the water.
// An aerial view per seed looks down over as many regions as possible. With --classic it re-aims
// the six scenes phase 1 was measured on (castle vista, merchant on the road, campfire, merchant
// close up by day and by lantern light, the spawn gate at night) at the same things in this world.
// Prints scenes for tools/scenes.json (or merges them in with --write).
//   node tools/find-views.mjs [--seed 42] [--hour 10.5] [--write] [--aerial-only | --classic]
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, ROOT } from './lib/harness.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = k => { const i = args.indexOf('--' + k); if (i < 0) return false; args.splice(i, 1); return true; };
const seed = +opt('seed', 42), hour = +opt('hour', 10.5), write = flag('write'), aerialOnly = flag('aerial-only'), classic = flag('classic');

const { server, port } = await startServer();
const { browser, page } = await launch();
await page.goto(`http://127.0.0.1:${port}/index.html?seed=${seed}&threads=0`);
await page.waitForFunction(() => window.TV && window.TV.world.structs.length > 0);
const scenes = await page.evaluate(({ seed, hour, aerialOnly, classic }) => {
  const TV = window.TV, w = TV.world, B = TV.defs.BIOME, NAMES = TV.defs.BIOME_NAMES, W = 512, M = W - 1;
  if (w.seed !== seed) TV.regenerate(seed);
  const idx = (x, z) => ((Math.floor(z) & M) * W) + (Math.floor(x) & M);
  const wrapD = d => d > W / 2 ? d - W : d < -W / 2 ? d + W : d;
  const deg = a => { let d = (a * 180 / Math.PI) % 360; if (d > 180) d -= 360; if (d <= -180) d += 360; return Math.round(d * 10) / 10; };
  const wrap = v => +(((v % W) + W) % W).toFixed(2);
  const clock = `${Math.floor(hour)}:${String(Math.round(hour % 1 * 60)).padStart(2, '0')}`;
  const title = b => `${NAMES[b][0].toUpperCase() + NAMES[b].slice(1)}, ${clock}`;
  const nearStruct = (x, z, pad) => w.structs.some(s => Math.max(Math.abs(wrapD(x - s.cx)), Math.abs(wrapD(z - s.cz))) <= s.half + pad);
  const footprint = new Uint8Array(W * W);
  for (const s of w.structs) for (let z = -s.half - 2; z <= s.half + 2; z++) for (let x = -s.half - 2; x <= s.half + 2; x++) footprint[idx(s.cx + x, s.cz + z)] = 1;
  const clearAround = (x, z, r) => { for (let oz = -r; oz <= r; oz++) for (let ox = -r; ox <= r; ox++) if (w.treeMask[idx(x + ox, z + oz)]) return false; return true; };
  // What an eye at (x, z, eye) looking along yaw sees: for 11 rays across the middle of the view,
  // every sample that rises above the running horizon adds want(cell, distance).
  const look = (x, z, eye, yaw, want, far = 150) => {
    let score = 0;
    for (let k = -5; k <= 5; k++) {
      const a = yaw + k * 0.1, dx = Math.cos(a), dz = Math.sin(a);
      let horizon = -Infinity;
      for (let s = 3; s <= far; s += s < 40 ? 1 : 3) {
        const i = idx(x + dx * s, z + dz * s), slope = (w.H[i] - eye) / s;
        if (slope > horizon) { horizon = slope; score += want(i, s); }
      }
    }
    return score;
  };
  const out = [];

  if (!aerialOnly && !classic) {
    // [region, eye above the ground, pitch (px of horizon shift), nearest and farthest distance
    // that counts in full, how far to look]. The peaks are seen from below them, from anywhere.
    const views = [[B.GRASSLAND, 1.5, -110, 20, 110, 150], [B.FOREST, 1.5, -40, 8, 45, 70], [B.PINES, 1.5, -60, 12, 80, 110], [B.PEAKS, 2, 50, 40, 200, 220], [B.BADLANDS, 3, -80, 25, 120, 160], [B.MARSH, 1, -150, 8, 80, 110]];
    for (const [b, lift, pitch, near, mid, far] of views) {
      let best = null;
      for (let z = 0; z < W; z += 6) for (let x = 0; x < W; x += 6) {
        const i = idx(x, z);
        if ((b === B.PEAKS ? !w.biome[i] || w.biome[i] === b : w.biome[i] !== b) || (b === B.GRASSLAND && w.heat[i] > 0.6) || w.water[i] || w.road[i] || !clearAround(x, z, 2) || nearStruct(x, z, 20)) continue;
        const eye = TV.groundAt(x + 0.5, z + 0.5, 1e9) + 1.55 + lift;
        for (let k = 0; k < 16; k++) {
          const yaw = k / 16 * Math.PI * 2;
          // the region itself counts most at middle distance; open water and other regions a
          // little; a landmark in view counts against (it belongs to other scenes)
          // (grassland is judged by its green, mild-climate heart, not its dry patches or hot hills)
          const sc = look(x + 0.5, z + 0.5, eye, yaw, (c, s) => footprint[c] ? -3 : (w.biome[c] === b && (b !== B.GRASSLAND || (w.mat[c] !== TV.defs.MAT.DRYGRASS && w.heat[c] < 0.6)) ? 1 : w.water[c] ? 0.1 : -0.3) * (s < near ? 0.3 : s < mid ? 1 : 0.6), far);
          if (!best || sc > best.sc) best = { sc, x, z, yaw };
        }
      }
      if (best) out.push({ name: 'region-' + NAMES[b].replace(/ /g, '-'), title: title(b), seed, hour, t: 1000, cam: { x: best.x + 0.5, y: lift, z: best.z + 0.5, yaw: deg(best.yaw), pitch, ground: true } });
    }
    // Beach: on the sand, looking along it (the sand counts most, the sea a little).
    {
      let best = null;
      for (let z = 0; z < W; z += 3) for (let x = 0; x < W; x += 3) {
        const i = idx(x, z);
        if (w.biome[i] !== B.BEACH || w.water[i] || !clearAround(x, z, 2) || nearStruct(x, z, 20)) continue;
        const eye = TV.groundAt(x + 0.5, z + 0.5, 1e9) + 1.55 + 1;
        for (let k = 0; k < 16; k++) {
          const yaw = k / 16 * Math.PI * 2;
          const sc = look(x + 0.5, z + 0.5, eye, yaw, (c, s) => (w.biome[c] === B.BEACH ? 1 : w.water[c] ? 0.25 : 0.02) * (s < 60 ? 1 : 0.3), 120);
          if (!best || sc > best.sc) best = { sc, x, z, yaw };
        }
      }
      if (best) out.push({ name: 'region-beach', title: title(B.BEACH), seed, hour, t: 1000, cam: { x: best.x + 0.5, y: 1, z: best.z + 0.5, yaw: deg(best.yaw), pitch: -90, ground: true } });
    }
    // Sea cliffs: afloat, well out on open water, looking at a long line of them.
    {
      let best = null;
      for (let z = 0; z < W; z += 4) for (let x = 0; x < W; x += 4) {
        const i = idx(x, z);
        if (!w.water[i] || w.biome[i] !== B.SEA || !clearAround(x, z, 0)) continue;
        let open = true;   // nothing but water for 30 cells around
        for (let k = 0; k < 16 && open; k++) for (let s = 6; s <= 30 && open; s += 6) if (!w.water[idx(x + Math.cos(k / 8 * Math.PI) * s, z + Math.sin(k / 8 * Math.PI) * s)] && k % 2 === 0) open = false;
        if (!open) continue;
        const eye = w.H[i] + 1.55 + 4;
        for (let k = 0; k < 16; k++) {
          const yaw = k / 16 * Math.PI * 2;
          const sc = look(x + 0.5, z + 0.5, eye, yaw, (c, s) => (w.biome[c] === B.CLIFFS ? 1 : footprint[c] ? -3 : 0) * (s > 35 && s < 100 ? 1 : 0.2), 130);
          if (!best || sc > best.sc) best = { sc, x, z, yaw };
        }
      }
      if (best) out.push({ name: 'region-sea-cliffs', title: title(B.CLIFFS), seed, hour, t: 1000, cam: { x: best.x + 0.5, y: 4, z: best.z + 0.5, yaw: deg(best.yaw), pitch: -20, ground: true } });
    }
  }

  if (classic) {
    const top = new Float32Array(W * W);   // the ground, or the top of whatever stands on it
    for (let i = 0; i < W * W; i++) top[i] = w.H[i];
    for (const s of w.structs) for (let lz = 0; lz < s.tpl.sz; lz++) for (let lx = 0; lx < s.tpl.sx; lx++) {
      const t = s.tpl.topSolid[lx * s.tpl.sz + lz];
      if (t) { const i = idx(s.x0 + lx, s.z0 + lz); top[i] = Math.max(top[i], s.baseY + t); }
    }
    const los = (ax, az, ay, bx, bz, by) => {   // nothing between the two points: ground, walls or stones
      const dx = wrapD(bx - ax), dz = wrapD(bz - az), n = Math.ceil(Math.hypot(dx, dz) * 2);
      for (let k = 1; k < n - 2; k++) { const t = k / n; if (top[idx(ax + dx * t, az + dz * t)] > ay + (by - ay) * t) return false; }
      return true;
    };
    const regionsAhead = (x, z, yaw) => { const seen = new Set(); for (let s = 20; s <= 300; s += 10) for (const o of [-0.4, 0, 0.4]) seen.add(w.biome[idx(x + Math.cos(yaw + o) * s, z + Math.sin(yaw + o) * s)]); return seen.size; };
    // The spawn, outside the biggest castle's gate, at night.
    TV.regenerate(seed);
    out.push({ name: 'gate', title: "The spawn castle's gate at night, 21:00", seed, hour: 21, t: 1000, cam: { x: wrap(TV.cam.x), y: 0, z: wrap(TV.cam.z), yaw: -90, pitch: 40, ground: true } });
    // A castle in its valley, from high up and far off, with as many regions beyond it as possible.
    {
      let best = null;
      for (const s of w.structs.filter(s => s.type === 'castle')) for (let k = 0; k < 16; k++) {
        const a = k / 16 * Math.PI * 2, x = s.cx + Math.cos(a) * 90, z = s.cz + Math.sin(a) * 90, y = s.baseY + 45;
        if (w.water[idx(x, z)] || w.H[idx(x, z)] > y - 10 || !los(x, z, y, s.cx, s.cz, s.baseY + 8)) continue;
        const score = regionsAhead(x, z, a + Math.PI);
        if (!best || score > best.score) best = { score, x, z, y, yaw: a + Math.PI };
      }
      if (best) out.push({ name: 'vista', title: 'Castle in the valley, 09:30', seed, hour: 9.5, t: 1000, cam: { x: wrap(best.x), y: +best.y.toFixed(2), z: wrap(best.z), yaw: deg(best.yaw), pitch: -165 } });
    }
    // A campfire at a stone circle at night, from a little above and away.
    {
      let best = null;
      w.lights.forEach(L => {
        if (L.kind !== 'fire') return;
        for (let k = 0; k < 16; k++) {
          const a = k / 16 * Math.PI * 2, x = L.x + Math.cos(a) * 28, z = L.z + Math.sin(a) * 28, y = L.y + 10;
          if (w.water[idx(x, z)] || w.H[idx(x, z)] > y - 4 || !los(x, z, y, L.x, L.z, L.y + 0.8)) continue;
          const score = regionsAhead(x, z, a + Math.PI) + (w.H[idx(x, z)] < y - 10 ? 1 : 0);
          if (!best || score > best.score) best = { score, x, z, y, yaw: a + Math.PI };
        }
      });
      // tilt so the fire sits a little below the middle of a 1440×900 frame (pitch shifts the horizon, in px)
      const f = 720 / Math.tan(75 * Math.PI / 360);
      if (best) out.push({ name: 'fire', title: 'Campfire at the stone circle, 22:30', seed, hour: 22.5, t: 1000, cam: { x: wrap(best.x), y: +best.y.toFixed(2), z: wrap(best.z), yaw: deg(best.yaw), pitch: Math.round(520 - 450 - f * 10 / 28) } });
    }
    // A merchant on the road: from behind at dusk, and walking toward you by day and by lantern light,
    // on the straightest, most level stretch of any merchant's road.
    {
      let m = null, mi = 0, s0 = 0, at = null;
      const on = mm => s => {
        s = Math.max(0, Math.min(mm.total, s));
        let lo = 0, hi = mm.cells.length - 1;
        while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (mm.cum[mid] <= s) lo = mid; else hi = mid; }
        const a = mm.cells[lo], b = mm.cells[hi], t = mm.cum[hi] > mm.cum[lo] ? (s - mm.cum[lo]) / (mm.cum[hi] - mm.cum[lo]) : 0;
        return [(a & M) + 0.5 + wrapD((b & M) - (a & M)) * t, ((a / W) | 0) + 0.5 + wrapD(((b / W) | 0) - ((a / W) | 0)) * t];
      };
      let best = Infinity;
      w.merchants.forEach((mm, k) => {
        const f = on(mm);
        for (let s = 14; s < mm.total - 30; s += 4) {
          const p = [-12, -6, 0, 6, 12, 18, 24].map(d => f(s + d)), hs = p.map(([x, z]) => w.H[idx(x, z)]);
          const bend = Math.abs(wrapD(p[6][0] - p[0][0]) * wrapD(p[3][1] - p[0][1]) - wrapD(p[6][1] - p[0][1]) * wrapD(p[3][0] - p[0][0])) / 36;
          const rough = Math.max(...hs) - Math.min(...hs), trees = p.some(([x, z]) => w.treeMask[idx(x, z)]);
          const cost = bend + rough + (trees ? 50 : 0) + (p.some(([x, z]) => w.water[idx(x, z)]) ? 50 : 0);
          if (cost < best) { best = cost; m = mm; mi = k; s0 = s; at = f; }
        }
      });
      const [mx, mz] = at(s0), [bx, bz] = at(s0 - 10), [ax, az] = at(s0 + 8);
      const merchants = [{ i: mi, s: s0, dir: 1, walked: 3.3 }];
      out.push({ name: 'road', title: `${m.name} on the road, 18:00`, seed, hour: 18, t: 1000, merchants, cam: { x: wrap(bx), y: 0.2, z: wrap(bz), yaw: deg(Math.atan2(wrapD(mz - bz), wrapD(mx - bx))), pitch: 10, ground: true } });
      const toward = deg(Math.atan2(wrapD(mz - az), wrapD(mx - ax)));
      out.push({ name: 'merchant', title: `${m.name} walking toward you, 10:30`, seed, hour: 10.5, t: 1000, merchants, cam: { x: wrap(ax), y: 0, z: wrap(az), yaw: toward, pitch: 0, ground: true } });
      out.push({ name: 'merchant-night', title: 'The same, at 21:30, by lantern light', seed, hour: 21.5, t: 1000, merchants, cam: { x: wrap(ax), y: 0, z: wrap(az), yaw: toward, pitch: 0, ground: true } });
    }
  }

  // Aerial: high over the spot from which the most different regions lie ahead, looking down.
  if (!classic) {
    let best = null;
    for (let z = 0; z < W; z += 32) for (let x = 0; x < W; x += 32) for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2, seen = new Map();
      for (let s = 60; s <= 420; s += 12) for (const off of [-0.45, -0.2, 0, 0.2, 0.45]) {
        const b = w.biome[idx(x + Math.cos(a + off) * s, z + Math.sin(a + off) * s)];
        seen.set(b, (seen.get(b) || 0) + 1);
      }
      const score = [...seen.values()].filter(n => n >= 4).length;   // regions seen more than in passing
      if (!best || score > best.score) best = { score, x, z, a };
    }
    out.push({ name: `aerial-${seed}`, title: `Seed ${seed} from the air, ${clock}`, seed, hour, t: 1000, view: 700,
      cam: { x: wrap(best.x + 0.5), y: 190, z: wrap(best.z + 0.5), yaw: deg(best.a), pitch: -330 } });
  }
  return out;
}, { seed, hour, aerialOnly, classic });

for (const s of scenes) console.log(JSON.stringify(s));
if (write) {
  const file = path.join(ROOT, 'tools/scenes.json');
  const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const s of scenes) {
    const k = cfg.scenes.findIndex(o => o.name === s.name);
    if (k >= 0) cfg.scenes[k] = s; else cfg.scenes.push(s);
  }
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`wrote ${scenes.length} scenes to tools/scenes.json`);
}
await browser.close(); server.close();
