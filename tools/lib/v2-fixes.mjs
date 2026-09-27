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
export function applyFixes(text) {
  for (const f of FIXES) {
    if (!text.includes(f.from)) throw new Error('fix no longer applies: ' + f.why);
    text = text.replace(f.from, f.to);
  }
  return text;
}
