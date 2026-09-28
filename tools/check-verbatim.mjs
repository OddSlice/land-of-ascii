// Where v2's simulation is still v1's as written, plus the deliberate fixes in tools/lib/v2-fixes.mjs:
// these sections of reference/v1-index.html, with those fixes applied, must appear in index.html
// byte for byte. (tools/test-sim.mjs shows the movement code also behaves the same.)
// Retired in phase 2, because the world is now v2's own: the materials, the world state and
// generateWorld (v1 118-119, 261-360: regions, terrain shaping, coasts and marsh pools), tree
// placement and its constants (v1 906-958: plants by region) and the lighting update (v1 1100-1126:
// shadows and hollows).
//   node tools/check-verbatim.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/harness.mjs';
import { applyFixes, FIXES } from './lib/v2-fixes.mjs';

const v1 = applyFixes(fs.readFileSync(path.join(ROOT, 'reference/v1-index.html'), 'utf8')).split('\n');
const v2 = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SECTIONS = [   // [first line, last line, what]
  [89, 113, 'world and movement constants'],
  [202, 260, 'helpers and noise'],
  [361, 453, 'rivers'],
  [454, 775, 'structures'],
  [776, 905, 'roads'],
  [959, 1099, 'birds, lights, clouds, merchants, sky'],
  [1223, 1306, 'camera and input (up to the cell-size key)'],
  [1311, 1321, 'view distance, resize'],
  [1322, 1487, 'movement: walking, collision, flying'],
  [2083, 2235, 'talking and trade, HUD, world lifecycle'],
];
let bad = 0;
for (const [a, b, what] of SECTIONS) {
  const text = v1.slice(a - 1, b).join('\n');
  const ok = v2.includes(text);
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'DIFF'} v1 ${a}-${b} (${b - a + 1} lines): ${what}`);
}
console.log(`(with ${FIXES.length} deliberate fix${FIXES.length === 1 ? '' : 'es'} applied to v1 first)`);
process.exit(bad ? 1 : 0);
