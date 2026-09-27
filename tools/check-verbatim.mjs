// v2 keeps v1's simulation as written: these sections of reference/v1-index.html must appear in
// index.html byte for byte. (tools/test-sim.mjs proves they also behave the same.)
//   node tools/check-verbatim.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/harness.mjs';

const v1 = fs.readFileSync(path.join(ROOT, 'reference/v1-index.html'), 'utf8').split('\n');
const v2 = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SECTIONS = [   // [first line, last line, what]
  [89, 113, 'world and movement constants'],
  [118, 119, 'materials'],
  [202, 1126, 'helpers, noise, terrain, rivers, structures, roads, trees, birds, lights, clouds, merchants, sky and lighting'],
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
process.exit(bad ? 1 : 0);
