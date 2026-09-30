// Find a camera for every region of a world, so the scenes can be re-aimed whenever world
// generation changes. Each candidate spot and heading is scored by what an eye there would actually
// see: rays are marched out across the view over the heightmap, and every patch of ground that
// rises above the running horizon counts, by how much it shows of the region wanted. Inland regions
// are seen from within; the beach from the sand looking along the shore; sea cliffs from the water.
// An aerial view per seed looks down over as many regions as possible. With --classic it re-aims
// the six scenes phase 1 was measured on (castle vista, merchant on the road, campfire, merchant
// close up by day and by lantern light, the spawn gate at night) at the same things in this world.
// With --landmarks it aims the scenes of castles, towns, villages, churches, taverns, towers, ruins,
// hamlets, windmills, fields and your hero at those landmarks in this world (phase 4: they move whenever world
// generation changes); only their cameras change.
// Prints scenes for tools/scenes.json (or merges them in with --write).
//   node tools/find-views.mjs [--seed 42] [--hour 10.5] [--write] [--aerial-only | --classic | --landmarks]
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, ROOT } from './lib/harness.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = k => { const i = args.indexOf('--' + k); if (i < 0) return false; args.splice(i, 1); return true; };
const seed = +opt('seed', 42), hour = +opt('hour', 10.5), write = flag('write'), aerialOnly = flag('aerial-only'), classic = flag('classic'), landmarks = flag('landmarks');

const { server, port } = await startServer();
const { browser, page } = await launch();
await page.goto(`http://127.0.0.1:${port}/index.html?seed=${seed}&threads=0`);
await page.waitForFunction(() => window.TV && window.TV.world.structs.length > 0);
const scenes = await page.evaluate(({ seed, hour, aerialOnly, classic, landmarks }) => {
  const TV = window.TV, w = TV.world, B = TV.defs.BIOME, NAMES = TV.defs.BIOME_NAMES, W = TV.defs.W, M = W - 1;
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

  if (landmarks) {
    // Cameras aimed at the landmarks, for a 1440-wide shot (its focal length f): pitch is the centre's
    // slope times f (the renderer turns the view by it). Aerial cameras keep 6 above the ground.
    TV.regenerate(seed);
    const D = TV.defs, G = D.GATE_DIRS, f = 720 / Math.tan(75 * Math.PI / 360), S = w.structs;
    const turn = (dir, dx, dz) => dir === 0 ? [dx, dz] : dir === 1 ? [dz, -dx] : dir === 2 ? [-dx, -dz] : [-dz, dx];   // (turnOffset)
    const ground = (x, z) => TV.terrainHeight(((x % W) + W) % W, ((z % W) + W) % W);
    const aim = (x, y, z, tx, ty, tz, lift = 6) => {
      y = Math.max(y, ground(x, z) + lift);
      const dx = wrapD(tx - x), dz = wrapD(tz - z), dist = Math.hypot(dx, dz) || 1;
      return { x: wrap(x), y: +y.toFixed(2), z: wrap(z), yaw: deg(Math.atan2(dz, dx)), pitch: Math.round(f * (ty - y) / dist) };
    };
    const onFoot = (x, z, yaw) => ({ x: wrap(x), y: 0, z: wrap(z), yaw: deg(yaw), pitch: 0, ground: true });
    const inside = (x, y, z, yaw, pitch) => ({ x: wrap(x), y: +y.toFixed(2), z: wrap(z), yaw: deg(yaw), pitch });
    const set = (name, cam, more) => out.push({ name, cam, ...more });
    const mid = (a, b) => [a.cx + 0.5 + wrapD(b.cx - a.cx) / 2, a.cz + 0.5 + wrapD(b.cz - a.cz) / 2];
    // your hero, where the game starts you
    TV.regenerate(seed);
    for (const n of ['hero', 'hero-start', 'hero-dusk', 'hero-kit', 'hero-kit-side', 'hero-kit-front', 'hero-night', 'hero-night-none', 'hero-red', 'hero-blue', 'hero-russet']) set(n, onFoot(TV.cam.x, TV.cam.z, TV.cam.yaw));
    // the biggest castle and its town
    const castles = S.filter(s => s.type === 'castle'), big = castles.slice().sort((a, b) => b.half - a.half)[0];
    const town = t => S[t.town], kindOf = t => D.TOWN[t.variant];
    const townViews = (C, T, names) => {
      const [ox, oz] = G[T.gate], [px, pz] = turn(T.gate, 1, 0), P = kindOf(T), TD = P.deep, zc = P.square + ((TD - 1 - P.square) >> 1);
      const [gx, gz] = [T.gatePos[0] + 0.5, T.gatePos[1] + 0.5], [mx, mz] = mid(T, C);
      if (names.front) set(names.front, aim(gx + ox * 45, T.baseY + 55, gz + oz * 45, mx, C.baseY + 5, mz));
      if (names.street) set(names.street, onFoot(gx - ox * 12, gz - oz * 12, Math.atan2(-oz, -ox)));
      const kx = gx - ox * (TD - zc), kz = gz - oz * (TD - zc);   // (the middle of the market square)
      if (names.market) set(names.market, onFoot(kx - px * 3, kz - pz * 3, Math.atan2(pz, px)));
      if (names.night) set(names.night, aim(T.cx + px * 38 + ox * 8, T.baseY + 36, T.cz + pz * 38 + oz * 8, T.cx, T.baseY + 6, T.cz));
    };
    if (big) {
      townViews(big, town(big), { front: 'town-citadel', street: 'town-street', market: 'town-market', night: 'town-night' });
      const [ox, oz] = G[big.gate], [px, pz] = turn(big.gate, 1, 0), cx = big.cx + 0.5, cz = big.cz + 0.5;
      set('castle-citadel', aim(cx + px * 55 + ox * 25, big.baseY + 42, cz + pz * 55 + oz * 25, cx, big.baseY + 8, cz));
      // from behind it, at the first angle round from straight behind whose line to its towers the land leaves clear
      const back = Math.atan2(-oz, -ox);
      let flags = null;
      for (const da of [0.55, -0.55, 0.9, -0.9, 0.25, -0.25, 1.3, -1.3]) {
        const a = back + da, x = cx + Math.cos(a) * 48, z = cz + Math.sin(a) * 48, y = Math.max(big.baseY + 30, ground(x, z) + 8);
        let clear = true;
        for (let k = 1; k < 24 && clear; k++) { const t = k / 24; if (ground(x + (cx - x) * t, z + (cz - z) * t) > y + (big.baseY + 12 - y) * t - 1) clear = false; }
        if (clear) { flags = aim(x, y, z, cx, big.baseY + 12, cz); break; }
      }
      set('castle-flags', flags || aim(cx - ox * 50 + px * 30, big.baseY + 40, cz - oz * 50 + pz * 30, cx, big.baseY + 12, cz));
    }
    // a small castle's town, from outside its gate
    const small = castles.find(c => c.variant === 'small');
    if (small) {
      const T = town(small), [ox, oz] = G[T.gate], [mx, mz] = mid(T, small);
      set('town-small', aim(T.gatePos[0] + 0.5 + ox * 50, T.baseY + 55, T.gatePos[1] + 0.5 + oz * 50, mx, small.baseY + 5, mz));
    }
    // a fortress from above, and inside it: its church, its great hall, the keep's bell chamber (offsets
    // from its middle in the frame where its gate faces +z, turned with it)
    const fort = castles.find(c => c.variant === 'fortress');
    if (fort) {
      const [ox, oz] = G[fort.gate], [px, pz] = turn(fort.gate, 1, 0), cx = fort.cx + 0.5, cz = fort.cz + 0.5, y = fort.baseY;
      set('castle-fortress', aim(cx + ox * 42 + px * 22, y + 46, cz + oz * 42 + pz * 22, cx, y + 6, cz));
      const room = (dx, dz, dy, face, pitch) => { const [wx, wz] = turn(fort.gate, dx, dz), [fx, fz] = turn(fort.gate, Math.cos(face), Math.sin(face)); return inside(cx + wx, y + dy, cz + wz, Math.atan2(fz, fx), pitch); };
      set('castle-church', room(0, 3.1, 2.51, -Math.PI / 2, -30));
      set('castle-hall', room(10, 4, 2.51, -Math.PI / 2, -60)); set('castle-hall-night', room(10, 4, 2.51, -Math.PI / 2, -60));
      set('castle-keep', room(-12, -12.1, 21.2, Math.PI / 2, -200));
    }
    // a village: its street, from above, its tavern and its chapel inside and out
    const V = S.find(s => s.type === 'village' && s.houses.some(h => h.kind === 'tavern') && s.houses.some(h => h.kind === 'chapel'));
    if (V) {
      set('village', onFoot(V.cx + 0.5, V.cz + 20.5, -Math.PI / 2)); set('village-night', onFoot(V.cx + 0.5, V.cz + 20.5, -Math.PI / 2));
      set('village-aerial', aim(V.cx + 42, V.baseY + 40, V.cz + 37, V.cx, V.baseY + 5, V.cz));
      const into = (h, k) => { const [ox, oz] = G[h.dir]; return [h.door[0] - ox * k, h.door[2] - oz * k, Math.atan2(-oz, -ox)]; };
      const tav = V.houses.find(h => h.kind === 'tavern'), [tx, tz, ta] = into(tav, 2.1);
      set('tavern', inside(tx, tav.door[1] + 2.45, tz, ta, -40)); set('tavern-night', inside(tx, tav.door[1] + 2.45, tz, ta, -40));
      const ch = V.houses.find(h => h.kind === 'chapel'), [cx1, cz1, ca] = into(ch, 3.4), [cx2, cz2] = into(ch, 4.4);
      set('chapel', inside(cx1, ch.door[1] + 2.45, cz1, ca, -30)); set('chapel-night', inside(cx1, ch.door[1] + 2.45, cz1, ca, -30));
      set('chapel-frescoes', inside(cx2, ch.door[1] + 2.45, cz2, ca + Math.PI / 2, 40));
      const [ox, oz] = G[ch.dir], [cx3, cz3] = into(ch, 6);
      set('chapel-outside', aim(ch.door[0] + ox * 19 + oz * 2, ch.door[1] + 19, ch.door[2] + oz * 19 + ox * 2, cx3, ch.door[1] + 8, cz3));
    }
    // a watchtower from its road's side, a ruin, a hamlet's street
    const tw = S.find(s => s.type === 'tower');
    if (tw) { const [ox, oz] = G[tw.gate], [px, pz] = turn(tw.gate, 1, 0); set('tower', aim(tw.cx + 0.5 + ox * 20 + px * 8, tw.baseY + 18, tw.cz + 0.5 + oz * 20 + pz * 8, tw.cx + 0.5, tw.baseY + 12, tw.cz + 0.5)); }
    const wild = [B.FOREST, B.PINES, B.MARSH, B.BADLANDS], ruins = S.filter(s => s.type === 'ruin');
    const ruin = ruins.find(s => w.biome[idx(s.cx, s.cz)] === B.FOREST) || ruins.find(s => wild.includes(w.biome[idx(s.cx, s.cz)])) || ruins[0];
    if (ruin) set('ruin', aim(ruin.cx + 20, ruin.baseY + 10, ruin.cz + 15, ruin.cx + 0.5, ruin.baseY + 3, ruin.cz + 0.5, 4));
    const H = S.find(s => s.type === 'hamlet');
    if (H) set('hamlet', onFoot(H.cx + 0.5, H.cz + 18.5, -Math.PI / 2));
    // phase 5: a windmill from its village's side (its sails face the village), and a pasture on foot from
    // before its gate, the fields round it
    const mill = S.find(s => s.type === 'windmill');
    if (mill) { const [ox, oz] = G[mill.gate], [px, pz] = turn(mill.gate, 1, 0); set('windmill', aim(mill.cx + 0.5 + ox * 24 - px * 5, mill.baseY + 9, mill.cz + 0.5 + oz * 24 - pz * 5, mill.cx + 0.5, mill.baseY + 7, mill.cz + 0.5, 4), { title: 'A windmill in its village\'s fields, sails turning (10:30)', seed, hour: 10.5, t: 1000 }); }
    const V2 = S.find(s => s.type === 'village');
    if (V2) {
      let best = null;   // (the pasture cell nearest the village, then its block's middle)
      for (let dz = -60; dz <= 60; dz++) for (let dx = -60; dx <= 60; dx++) { const f = w.farm[idx(V2.cx + dx, V2.cz + dz)] & 7; if (f === 4 && (!best || Math.hypot(dx, dz) < best.d)) best = { dx, dz, d: Math.hypot(dx, dz) }; }
      if (best) {
        let sx = 0, sz = 0, n = 0;
        for (let dz = -11; dz <= 11; dz++) for (let dx = -11; dx <= 11; dx++) if ((w.farm[idx(V2.cx + best.dx + dx, V2.cz + best.dz + dz)] & 7) === 4) { sx += best.dx + dx; sz += best.dz + dz; n++; }
        const mx = V2.cx + 0.5 + sx / n, mz = V2.cz + 0.5 + sz / n, l = Math.hypot(sx / n, sz / n) || 1, ux = -sx / n / l, uz = -sz / n / l;   // (toward the village)
        const c = onFoot(mx + ux * 14, mz + uz * 14, Math.atan2(-uz, -ux)); c.pitch = -60;
        set('fields', c, { title: 'A pasture and the fields round a village (10:30)', seed, hour: 10.5, t: 1000 });
      }
    }
  }

  if (!aerialOnly && !classic && !landmarks) {
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
    // The spawn, outside the gate of the biggest castle's town (phase 4), at night.
    TV.regenerate(seed);
    out.push({ name: 'gate', title: "The spawn town's gate at night, 21:00", seed, hour: 21, t: 1000, cam: { x: wrap(TV.cam.x), y: 0, z: wrap(TV.cam.z), yaw: deg(TV.cam.yaw), pitch: 40, ground: true } });
    // A castle in its valley, from high up and far off, over its town (phase 4: the town lies before its
    // gate), with as many regions beyond it as possible.
    {
      let best = null;
      for (const s of w.structs.filter(s => s.type === 'castle')) for (let k = 0; k < 16; k++) {
        const a = k / 16 * Math.PI * 2, x = s.cx + Math.cos(a) * 90, z = s.cz + Math.sin(a) * 90, y = s.baseY + 45, [gx, gz] = [[0, 1], [1, 0], [0, -1], [-1, 0]][s.gate || 0];
        if (w.water[idx(x, z)] || w.H[idx(x, z)] > y - 10 || !los(x, z, y, s.cx, s.cz, s.baseY + 22)) continue;   // (the top of its church)
        const score = regionsAhead(x, z, a + Math.PI) + (Math.cos(a) * gx + Math.sin(a) * gz > 0.5 ? 3 : 0);
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
  if (!classic && !landmarks) {
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
      cam: { x: wrap(best.x + 0.5), y: 330, z: wrap(best.z + 0.5), yaw: deg(best.a), pitch: -330 } });   // (above the highest peaks)
  }
  return out;
}, { seed, hour, aerialOnly, classic, landmarks });

for (const s of scenes) console.log(JSON.stringify(s));
if (write) {
  const file = path.join(ROOT, 'tools/scenes.json');
  const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const s of scenes) {
    const k = cfg.scenes.findIndex(o => o.name === s.name);
    if (k >= 0 && cfg.scenes[k].fixed && !landmarks) { console.log(`kept ${s.name}: placed by hand (fixed)`); continue; }   // (--landmarks re-aims the hand-placed landmark scenes: that is what it is for)
    if (k >= 0 && landmarks) cfg.scenes[k].cam = s.cam;   // (only the camera: each scene keeps its hour, title, gear...)
    else if (k >= 0) cfg.scenes[k] = s; else cfg.scenes.push(s);
  }
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`wrote ${scenes.length} scenes to tools/scenes.json`);
}
await browser.close(); server.close();
