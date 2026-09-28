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
  why: 'you start where you can walk to the castle gate (spawnAt): on the bigger world, 14 cells out could be a gully between badland terraces',
  from: '    cam.x = s.cx + 0.5; cam.z = ((s.cz + s.half + 14) & MASK) + 0.5;',
  to: '    cam.x = s.cx + 0.5; cam.z = ((s.cz + spawnAt(s)) & MASK) + 0.5;',
});
export function applyFixes(text) {
  for (const f of FIXES) {
    if (!text.includes(f.from)) throw new Error('fix no longer applies: ' + f.why);
    text = text.replace(f.from, f.to);
  }
  return text;
}
