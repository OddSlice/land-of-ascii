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
  why: 'the help line names the L key, which switches between the painted and the mosaic look',
  from: "  helpEl.textContent = `${move} · ${look}\\nF ${player.mode === 'walk' ? 'fly mode' : 'walk mode'} · R new seed · T time ×10 · − / + resolution · [ / ] view distance`;",
  to: "  helpEl.textContent = `${move} · ${look}\\nF ${player.mode === 'walk' ? 'fly mode' : 'walk mode'} · R new seed · T time ×10 · − / + resolution · [ / ] view distance · L look`;",
});
FIXES.push({
  why: 'merchants cross bridges on the deck: where a road crosses water, phase 2 builds a bridge over it (v1 walked them through the ford)',
  from: '  m.y = terrainHeight(m.x, m.z);\n  m.seg = lo;',
  to: '  m.y = Math.max(terrainHeight(m.x, m.z), deckAt(m.x, m.z));   // (on a bridge, its deck)\n  m.seg = lo;',
});
export function applyFixes(text) {
  for (const f of FIXES) {
    if (!text.includes(f.from)) throw new Error('fix no longer applies: ' + f.why);
    text = text.replace(f.from, f.to);
  }
  return text;
}
