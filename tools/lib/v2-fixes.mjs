// Deliberate changes v2 makes to the simulation it took from v1. The v1 comparison tests apply
// these same edits to reference/v1-index.html first, so they keep checking that nothing else
// changed.
export const FIXES = [
  {
    why: 'the lowest cell could get a NaN height: on a Float32Array the minimum can round below itself, and pow() of a negative base is NaN',
    from: '  for (let i = 0; i < N; i++) H[i] = Math.pow((H[i] - min) / range, 1.5) * HEIGHT_SCALE;',
    to: '  for (let i = 0; i < N; i++) H[i] = Math.pow(Math.max(0, (H[i] - min) / range), 1.5) * HEIGHT_SCALE;',
  },
];
FIXES.push({
  why: 'the help line names the L key, which switches between the painted and the mosaic look, and V, which switches between your hero (third person) and your own eyes',
  from: "  helpEl.textContent = `${move} · ${look}\\nF ${player.mode === 'walk' ? 'fly mode' : 'walk mode'} · R new seed · T time ×10 · − / + resolution · [ / ] view distance`;",
  to: "  helpEl.textContent = `${move} · ${look}\\nF ${player.mode === 'walk' ? 'fly mode' : 'walk mode'} · R new seed · T time ×10 · − / + resolution · [ / ] view distance · L look · V hero or eyes`;",
});
FIXES.push({
  why: 'merchants cross bridges on the deck: where a road crosses water, phase 2 builds a bridge over it (v1 walked them through the ford)',
  from: '  m.y = terrainHeight(m.x, m.z);\n  m.seg = lo;',
  to: '  m.y = Math.max(terrainHeight(m.x, m.z), deckAt(m.x, m.z));   // (on a bridge, its deck)\n  m.seg = lo;',
});
// Phase 3: a bigger world (docs/phase3.md, step 2).
FIXES.push({
  why: 'phase 3: the world is 1024 cells across (four times the area), so a land takes time to cross',
  from: 'const W = 512, MASK = W - 1, N = W * W;',
  to: 'const W = 1024, MASK = W - 1, N = W * W;',
});
FIXES.push({
  why: 'phase 3: four rivers for four times the land',
  from: 'const RIVER_COUNT = 2;',
  to: 'const RIVER_COUNT = 4;',
});
FIXES.push({
  why: 'phase 3: walking a little slower (a jog, not a sprint), flying faster over the bigger world',
  from: 'const WALK_SPEED = 7, SPRINT_MULT = 12 / 7, FLY_SPEED = 45;',
  to: 'const WALK_SPEED = 5.5, SPRINT_MULT = 9.5 / 5.5, FLY_SPEED = 70;',
});
FIXES.push({
  why: 'phase 3: landmarks stand twice as far apart, so roads reach twice as far',
  from: 'const ROAD_MAX_LEN = 220;      // landmarks further apart than this get no road\nconst ROAD_EXTRA_LINK = 150;',
  to: 'const ROAD_MAX_LEN = 440;      // landmarks further apart than this get no road\nconst ROAD_EXTRA_LINK = 300;',
});
FIXES.push({
  why: 'the road finder took a row of its half-size grid to be 256 cells (right only for a 512 world), and gave up after 80,000 steps (too few for the longer roads)',
  from: '    if (++expanded > 80000) return null;\n    const x = n & GM, z = n >> 8, h0 = cellH(x, z), g0 = g[n];',
  to: '    if (++expanded > 320000) return null;\n    const x = n & GM, z = (n / G) | 0, h0 = cellH(x, z), g0 = g[n];',
});
FIXES.push({
  why: 'the same, where the road finder reads its path back',
  from: 'path.push([(n & GM) << 1, (n >> 8) << 1]);',
  to: 'path.push([(n & GM) << 1, ((n / G) | 0) << 1]);',
});
FIXES.push({
  why: 'you start where you can walk to the gate (spawnAt): on the bigger world, 14 cells out could be a gully between badland terraces; and (phase 4) before the gate of the biggest castle\'s town, which faces whichever way the town lies, looking up its street to the castle',
  from: '    cam.x = s.cx + 0.5; cam.z = ((s.cz + s.half + 14) & MASK) + 0.5;\n    for (let k = 0; k < 6 && world.treeMask[(cam.z | 0) * W + (cam.x | 0)]; k++) cam.x = ((cam.x + 1) % W);   // not inside a tree\n    cam.yaw = -Math.PI / 2;',
  to: '    [cam.x, cam.z, cam.yaw] = spawnAt(s);   // (before its town\'s gate, facing up the street to the castle)\n    for (let k = 0; k < 6 && world.treeMask[(cam.z | 0) * W + (cam.x | 0)]; k++) cam.x = ((cam.x + 1) % W);   // not inside a tree',
});
export function applyFixes(text) {
  for (const f of FIXES) {
    if (!text.includes(f.from)) throw new Error('fix no longer applies: ' + f.why);
    text = text.replace(f.from, f.to);
  }
  return text;
}
// Phase 3, step 4: gear on your hero (docs/phase3.md).
FIXES.push({
  why: 'phase 3: twice the merchants for four times the land (so you meet one), and a bigger purse for the new gear',
  from: 'const MERCHANT_COUNT = 4, MERCHANT_SPEED = 3, TALK_RADIUS = 4, START_GOLD = 100;',
  to: 'const MERCHANT_COUNT = 8, MERCHANT_SPEED = 3, TALK_RADIUS = 4, START_GOLD = 300;',
});
FIXES.push({
  why: 'phase 3: new goods that show on your hero: a pointed cap, a short sword, a round shield, tunics in three colours',
  from: "  ['Copper kettle', 18, 30], ['Flask of cider', 5, 9], ['Rope, twenty feet', 10, 18], ['Lucky pebble', 1, 3],\n];",
  to: "  ['Copper kettle', 18, 30], ['Flask of cider', 5, 9], ['Rope, twenty feet', 10, 18], ['Lucky pebble', 1, 3],\n  ['Pointed cap', 8, 15], ['Short sword', 40, 70], ['Round shield', 35, 60], ['Red tunic', 20, 35], ['Blue tunic', 20, 35], ['Russet tunic', 20, 35],\n];",
});
FIXES.push({
  why: 'phase 3: each merchant sells 7 to 9 of the 18 goods (4 or 5 of 12 before), so most goods can be found in a world',
  from: '    const count = 4 + ((rng() * 2) | 0);',
  to: '    const count = 7 + ((rng() * 3) | 0);',
});
