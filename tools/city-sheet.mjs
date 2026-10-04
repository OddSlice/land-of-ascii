// Picture sheets for the city's art bible (the second world, step 0), drawn from docs/city/palette.json:
//   sheet-city     the city on its hill at night (a diagram, not a render) and the four districts;
//   sheet-moods    the three moods (directions) step 1 will test, each at day, dusk and night;
//   sheet-palette  every ramp of a direction at the three hours, the neon and the signal, and the
//                  colour checks (colour-blind simulations and greyscale) with their verdicts.
//   node tools/city-sheet.mjs [--dir shots/city/step0] [--direction A] [--dpr 1]
// The checks are also printed, and the run fails if one does not pass.
import fs from 'node:fs';
import path from 'node:path';
import { launch, ROOT } from './lib/harness.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const dir = path.resolve(ROOT, opt('dir', 'shots/city/step0'));
const pick = opt('direction', 'A'), dpr = +opt('dpr', 1);
const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/city/palette.json'), 'utf8'));
const HOURS = ['day', 'dusk', 'night'];
const DISTRICTS = [   // left to right up the hill (the order of the diagram)
  { id: 'docks', name: 'THE DOCKS', where: 'bottom · industry and the harbour', neon: 'orange', mats: ['rust', 'stained', 'asphalt'], sign: 'GATE 3', sign2: 'СКЛАД 3', style: 'stencil', landmark: 'a giant crane over the water', words: 'heavy · rusty · wide' },
  { id: 'stacks', name: 'THE STACKS', where: 'lower slopes · homes', neon: 'green', mats: ['stained', 'brick', 'concrete'], sign: 'БЛОК 9', sign2: 'REPAIR', style: 'painted', landmark: 'the biggest block, its number lit', words: 'dense · repeated · lived-in' },
  { id: 'row', name: 'NEON ROW', where: 'middle · shops, food, nights out', neon: 'magenta', mats: ['plastic', 'concrete', 'glass'], sign: 'NOODLES', sign2: 'ДЮНЕР', style: 'blade', landmark: 'a giant hologram jellyfish', words: 'loud · shiny · crowded' },
  { id: 'spires', name: 'THE SPIRES', where: 'the summit · corporations', neon: 'cyan', mats: ['glass', 'steel', 'tile'], sign: 'TOWER ONE', sign2: 'КУЛА', style: 'thin', landmark: 'the tallest tower, ringed with light', words: 'cold · quiet · expensive' },
];

// ---- colour maths for the checks: OKLab, and Machado, Oliveira & Fernandes (2009) at severity 1,
// applied in linear RGB -------------------------------------------------------------------------
const lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const gam = c => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
const toLin = h => [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16) / 255));
const toHex = rgb => '#' + rgb.map(c => Math.round(gam(Math.min(1, Math.max(0, c))) * 255).toString(16).padStart(2, '0')).join('');
function oklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
const greyHex = h => { const L = oklab(toLin(h))[0], y = L * L * L; return toHex([y, y, y]); };   // OKLab lightness as a grey
const CVD = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
const simHex = (h, m) => { const c = toLin(h); return toHex(m.map(r => r[0] * c[0] + r[1] * c[1] + r[2] * c[2])); };
const dist = (h1, h2) => { const a = oklab(toLin(h1)), b = oklab(toLin(h2)); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); };

// The rules (docs/city/bible.md, "The checks"): district colours at least DISTRICT_MIN apart for normal,
// protanopic and deuteranopic eyes; the signal brighter than every glow by SIGNAL_LEAD; tritanopia and
// greyscale are reported (the districts' shapes carry those).
const DISTRICT_MIN = 0.12, SIGNAL_LEAD = 0.08;
function checks(R) {
  const glow = Object.fromEntries(DISTRICTS.map(d => [d.neon, R['neon_' + d.neon][2]]));
  const signal = R.signal[2], views = { normal: h => h, ...Object.fromEntries(Object.entries(CVD).map(([k, m]) => [k, h => simHex(h, m)])), greyscale: greyHex };
  const rows = [];
  for (const [view, f] of Object.entries(views)) {
    const cols = Object.fromEntries(Object.entries(glow).map(([k, h]) => [k, f(h)])), keys = Object.keys(cols);
    let min = Infinity, pair = '';
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
      const d = dist(cols[keys[i]], cols[keys[j]]); if (d < min) { min = d; pair = keys[i] + ' / ' + keys[j]; }
    }
    const required = ['normal', 'protanopia', 'deuteranopia'].includes(view);
    rows.push({ view, cols, signal: f(signal), min, pair, required, pass: !required || min >= DISTRICT_MIN });
  }
  const lead = oklab(toLin(signal))[0] - Math.max(...Object.values(glow).map(h => oklab(toLin(h))[0]));
  return { rows, lead, leadPass: lead >= SIGNAL_LEAD };
}

// ---- the city on its hill, as a diagram (SVG, 1440 x 620; drawn smaller for the moods) ----------
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const GROUND = [[0, 560], [150, 556], [380, 544], [520, 510], [700, 460], [860, 410], [1040, 350], [1180, 296], [1300, 262], [1440, 248]];
function groundY(x) {
  for (let i = 1; i < GROUND.length; i++) if (x <= GROUND[i][0]) {
    const [x0, y0] = GROUND[i - 1], [x1, y1] = GROUND[i], t = (x - x0) / (x1 - x0);
    return y0 + (y1 - y0) * (1 - Math.cos(t * Math.PI)) / 2;
  }
  return GROUND[GROUND.length - 1][1];
}
const SHORE = 150, W = 1440, H = 620;

function skyline(R, lights, { labels = true, id = 'k' } = {}) {
  const rnd = mulberry32(7), s = [], glowK = lights, F = `url(#${id}b)`, F2 = `url(#${id}c)`;
  const rect = (x, y, w, h, fill, extra = '') => s.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" ${extra}/>`);
  // a light: its halo (blurred), then the sharp shape, then its core
  const neonRect = (x, y, w, h, ramp, k = 1) => {
    rect(x - 3, y - 3, w + 6, h + 6, ramp[2], `opacity="${(0.55 * glowK * k).toFixed(2)}" filter="${F}"`);
    rect(x, y, w, h, ramp[3], `opacity="${Math.min(1, 0.25 + glowK * k).toFixed(2)}"`);
    if (w > 2 && h > 2) rect(x + w * 0.3, y + h * 0.15, Math.max(1, w * 0.4), h * 0.7, ramp[4], `opacity="${(glowK * k).toFixed(2)}"`);
  };
  const lamp = (x, y, ramp, r = 2.4) => {
    s.push(`<circle cx="${x}" cy="${y}" r="${r * 5}" fill="${ramp[2]}" opacity="${(0.5 * glowK).toFixed(2)}" filter="${F2}"/>`);
    s.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${ramp[4]}" opacity="${Math.min(1, 0.3 + glowK).toFixed(2)}"/>`);
  };
  const pool = (x, ramp, rx = 26) => s.push(`<ellipse cx="${x}" cy="${groundY(x) + 2}" rx="${rx}" ry="5" fill="${ramp[1]}" opacity="${(0.8 * glowK).toFixed(2)}" filter="${F}"/>`);
  // the signal: a doorway you can go through, in the one warm white, at street level
  const door = x => { const y = groundY(x); neonRect(x - 4, y - 13, 8, 12, R.signal, 0.9); };
  const windows = (x, y, w, h, lit, warm, step = [9, 11]) => {
    for (let cx = x + 5; cx < x + w - 6; cx += step[0]) for (let cy = y + 8; cy < y + h - 6; cy += step[1]) {
      const on = rnd() < lit * (0.15 + 0.85 * glowK);
      rect(cx, cy, 4, 5, on ? warm[1 + Math.floor(rnd() * 3)] : R.glass[1]);
    }
  };

  // the sky in bands, as the engine draws it, and the low cloud lit from below
  const sky = R.sky, bands = [0, 80, 160, 240, 320, 410, 600];
  sky.forEach((c, i) => rect(0, bands[i], W, bands[i + 1] - bands[i] + 1, c));
  for (let x = -60; x < W + 60; x += 80 + rnd() * 50) {
    const cy = 30 + rnd() * 30, rx = 70 + rnd() * 50, ry = 16 + rnd() * 10;
    s.push(`<ellipse cx="${x.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}" fill="${R.cloud[0]}"/>`);
    s.push(`<ellipse cx="${(x + 6).toFixed(0)}" cy="${(cy + ry * 0.55).toFixed(0)}" rx="${(rx * 0.8).toFixed(0)}" ry="${(ry * 0.45).toFixed(0)}" fill="${R.cloud[1]}" opacity="0.7"/>`);
  }
  // haze over the far sea
  rect(0, 470, W, 90, R.haze[2], 'opacity="0.35"');
  // the harbour, with the lights of the Docks mirrored in it
  rect(0, 556, SHORE + 4, H - 556, R.water[1]);
  for (let y = 566; y < H; y += 9) rect(4 + (y * 7) % 23, y, 60 + (y * 13) % 50, 1.5, R.water[3], 'opacity="0.6"');

  // the elevated rail climbs the hill behind the streets, through every district
  const railPts = [];
  for (let x = SHORE + 20; x <= 1320; x += 20) railPts.push([x, groundY(x) - 46]);
  for (let x = SHORE + 40; x <= 1300; x += 90) rect(x - 2, groundY(x) - 46, 4, 46, R.steel[1]);
  s.push(`<polyline points="${railPts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${R.steel[2]}" stroke-width="4"/>`);
  for (let i = 0; i < railPts.length; i += 2) s.push(`<circle cx="${railPts[i][0]}" cy="${(railPts[i][1] - 3).toFixed(1)}" r="1.3" fill="${R.window_cool[3]}" opacity="${(0.3 + 0.7 * glowK).toFixed(2)}"/>`);

  const N = name => R['neon_' + name];
  // THE SPIRES (drawn first: their towers stand behind Neon Row's roofs at the boundary)
  // [x, width, top]: only the landmark (no top given) climbs into the cloud
  const towers = [[1075, 34, 168], [1130, 46, 112], [1196, 40, 136], [1262, 58, 0], [1338, 44, 100], [1396, 38, 128]];
  towers.forEach(([x, w, h], i) => {
    const base = groundY(x + w / 2) + 4, top = h || 4, mid = top + (base - top) * 0.35;
    rect(x, mid, w, base - mid, R.glass[0]);
    rect(x + w * 0.15, top, w * 0.7, mid - top + 1, R.glass[0]);
    s.push(`<polygon points="${x + w * 0.15},${top} ${x + w * 0.85},${top} ${x + w / 2},${top - (i % 2 ? 26 : 14)}" fill="${R.steel[1]}"/>`);
    windows(x, mid, w, base - mid, 0.32, R.window_cool, [8, 12]);
    windows(x + w * 0.15, top, w * 0.7, mid - top, 0.25, R.window_cool, [8, 12]);
    neonRect(x - 1, mid, 2, base - mid, N('cyan'), 0.55);
    neonRect(x + w * 0.15 - 1, top, 2, mid - top, N('cyan'), 0.45);
    if (!h) {   // the landmark: the tallest tower, through the cloud, ringed with light below it
      s.push(`<ellipse cx="${x + w / 2}" cy="${top + 58}" rx="${w * 0.95}" ry="7" fill="none" stroke="${N('cyan')[2]}" stroke-width="7" opacity="${(0.6 * glowK).toFixed(2)}" filter="${F}"/>`);
      s.push(`<ellipse cx="${x + w / 2}" cy="${top + 58}" rx="${w * 0.95}" ry="7" fill="none" stroke="${N('cyan')[4]}" stroke-width="2" opacity="${Math.min(1, 0.3 + glowK).toFixed(2)}"/>`);
    }
  });
  for (const [cx, rx] of [[1240, 90], [1310, 80], [1185, 60]]) s.push(`<ellipse cx="${cx}" cy="26" rx="${rx}" ry="22" fill="${R.cloud[0]}" opacity="0.92"/><ellipse cx="${cx + 4}" cy="40" rx="${rx * 0.8}" ry="9" fill="${R.cloud[1]}" opacity="0.6"/>`);
  door(1110); door(1300);   // lobbies
  neonRect(1176, groundY(1150) - 160, 20, 5, N('cyan'), 0.5);   // a sky bridge
  rect(1176, groundY(1150) - 160, 20, 5, R.steel[2], 'opacity="0.5"');
  // the plaza before the towers: pale stone under white light
  rect(1040, groundY(1100) - 1, 400, 3, R.tile[2]);

  // NEON ROW: mid-rise blocks wrapped in signs, the hologram over the crossing
  for (let x = 712; x < 1040;) {
    const w = 46 + rnd() * 40, base = groundY(x + w / 2) + 4, h = 80 + rnd() * 70;
    rect(x, base - h, w, h, R.plastic[0]);
    if (rnd() < 0.5) rect(x + w * 0.2, base - h - 16, w * 0.6, 17, R.plastic[0]);
    windows(x, base - h, w, h, 0.45, R.window_warm);
    const blades = 1 + Math.floor(rnd() * 2);
    for (let b = 0; b < blades; b++) neonRect(x + 4 + rnd() * (w - 14), base - h + 12 + rnd() * (h * 0.4), 7, 26 + rnd() * 30, N('magenta'));
    if (rnd() < 0.6) neonRect(x + 6, base - 34, w - 12, 6, N('magenta'), 0.8);
    if (rnd() < 0.45) door(x + w / 2);
    pool(x + w / 2, N('magenta'), w * 0.6);
    x += w + 6;
  }
  { // the hologram: a jellyfish drifting over the crossing
    const cx = 905, cy = 300, m = N('magenta');
    s.push(`<path d="M ${cx - 40} ${cy} Q ${cx} ${cy - 62} ${cx + 40} ${cy} Z" fill="${m[3]}" opacity="${(0.32 * glowK).toFixed(2)}" filter="${F}"/>`);
    s.push(`<path d="M ${cx - 40} ${cy} Q ${cx} ${cy - 62} ${cx + 40} ${cy}" fill="none" stroke="${m[4]}" stroke-width="2" opacity="${(0.85 * glowK).toFixed(2)}"/>`);
    for (let k = 0; k < 7; k++) {
      const tx = cx - 32 + k * 10.5;
      s.push(`<path d="M ${tx} ${cy} q 6 18 0 34 q -6 16 0 32" fill="none" stroke="${m[2]}" stroke-width="1.5" opacity="${(0.6 * glowK).toFixed(2)}"/>`);
    }
  }

  // THE STACKS: huge repeated blocks, green stairwells, walkways, tanks and aerials
  const blocks = [[392, 104, 170], [506, 92, 220], [608, 120, 250]];
  blocks.forEach(([x, w, h], i) => {
    const base = groundY(x + w / 2) + 6, top = base - h;
    rect(x, top, w, h, R.stained[0]);
    windows(x, top, w, h, 0.38, R.window_warm, [9, 10]);
    neonRect(x + w - 10, top + 12, 3, h - 20, N('green'), 0.7);   // the stairwell's tube lights
    rect(x + 12, top - 12, 14, 12, R.stained[1]);   // a water tank
    s.push(`<line x1="${x + w - 26}" y1="${top}" x2="${x + w - 26}" y2="${top - 30}" stroke="${R.steel[2]}" stroke-width="1.5"/>`);
    if (i === 2) {   // the landmark: the biggest block, its number lit
      s.push(`<text x="${x + 20}" y="${top + 54}" font-family="Menlo, monospace" font-weight="700" font-size="44" fill="${N('green')[2]}" opacity="${(0.7 * glowK).toFixed(2)}" filter="${F}">9</text>`);
      s.push(`<text x="${x + 20}" y="${top + 54}" font-family="Menlo, monospace" font-weight="700" font-size="44" fill="${N('green')[3]}" opacity="${Math.min(1, 0.3 + glowK).toFixed(2)}">9</text>`);
    }
    if (i === 1) door(x + w / 2);
    if (i < 2) { const [nx] = blocks[i + 1]; const wy = top + 60 + i * 30; rect(x + w, wy, nx - x - w, 4, R.steel[1]); neonRect(x + w + 2, wy - 3, nx - x - w - 4, 1.5, N('green'), 0.5); }
  });

  // THE DOCKS: long sheds with saw-tooth roofs, stacked containers, sodium lamps, the crane
  [[178, 84, 34], [282, 92, 40]].forEach(([x, w, h]) => {
    const base = groundY(x + w / 2) + 4;
    rect(x, base - h, w, h, R.rust[0]);
    for (let t = x; t < x + w - 1; t += 14) s.push(`<polygon points="${t},${base - h} ${t + 14},${base - h} ${t + 14},${base - h - 10}" fill="${R.rust[1]}"/>`);
    rect(x + 8, base - 14, 12, 14, R.window_warm[1], `opacity="${(0.2 + 0.6 * glowK).toFixed(2)}"`);
  });
  door(338);   // a stall that sells
  const boxes = [R.rust[2], R.brick[2], R.stained[2], R.coat3[1], R.rust[1]];
  for (let c = 0; c < 9; c++) { const x = 168 + (c % 3) * 21, y = groundY(x) - 9 - Math.floor(c / 3) * 9; rect(x, y, 20, 8.5, boxes[c % boxes.length]); }
  [200, 300, 372].forEach(x => { const y = groundY(x); rect(x - 1, y - 58, 2, 58, R.steel[1]); lamp(x, y - 60, N('orange')); pool(x, N('orange'), 30); });
  { // the landmark: a gantry crane at the water's edge, its boom over the harbour
    const x = SHORE - 4, base = groundY(x) + 2, top = 330, st = R.rust[2];
    for (const lx of [x, x + 30]) s.push(`<line x1="${lx}" y1="${base}" x2="${lx}" y2="${top}" stroke="${st}" stroke-width="4"/>`);
    for (let y = base; y > top + 10; y -= 26) s.push(`<polyline points="${x},${y} ${x + 30},${y - 13} ${x},${y - 26}" fill="none" stroke="${st}" stroke-width="1.5"/>`);
    s.push(`<line x1="${x - 120}" y1="${top}" x2="${x + 120}" y2="${top}" stroke="${st}" stroke-width="5"/>`);
    for (let bx = x - 120; bx < x + 120; bx += 16) s.push(`<polyline points="${bx},${top} ${bx + 8},${top - 10} ${bx + 16},${top}" fill="none" stroke="${st}" stroke-width="1.2"/>`);
    lamp(x - 110, top + 6, N('orange'), 2.6); lamp(x + 110, top + 6, N('orange'), 2.6); lamp(x + 15, top - 8, N('orange'), 3);
    s.push(`<line x1="${x - 70}" y1="${top}" x2="${x - 70}" y2="${top + 120}" stroke="${R.steel[2]}" stroke-width="1"/>`);
    rect(x - 80, top + 120, 20, 9, R.rust[1]);
    // its lights in the water
    for (const lx of [x - 110, x - 40, x + 6]) for (let y = 566; y < H; y += 7) rect(lx - 2 + ((y * 5) % 7) - 3, y, 6, 2, N('orange')[2], `opacity="${(0.45 * glowK).toFixed(2)}"`);
  }

  // the hill itself, its streets along the top edge, wet
  s.push(`<path d="M ${SHORE} ${H} L ${SHORE} ${groundY(SHORE)} ${Array.from({ length: 65 }, (_, i) => { const x = SHORE + (W - SHORE) * i / 64; return `L ${x.toFixed(1)} ${groundY(x).toFixed(1)}`; }).join(' ')} L ${W} ${H} Z" fill="${R.asphalt[0]}"/>`);
  s.push(`<polyline points="${Array.from({ length: 65 }, (_, i) => { const x = SHORE + (W - SHORE) * i / 64; return `${x.toFixed(1)},${groundY(x).toFixed(1)}`; }).join(' ')}" fill="none" stroke="${R.concrete[2]}" stroke-width="2"/>`);
  // the rain, over everything
  const rain = mulberry32(3);
  for (let i = 0; i < 260; i++) { const x = rain() * W, y = rain() * H; s.push(`<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - 5).toFixed(0)}" y2="${(y + 16).toFixed(0)}" stroke="${R.rain[1]}" stroke-width="1" opacity="0.22"/>`); }

  if (labels) {
    const spans = { docks: [SHORE + 10, 380], stacks: [392, 704], row: [716, 1036], spires: [1048, 1430] };
    for (const d of DISTRICTS) {
      const [x0, x1] = spans[d.id], y = 600, c = N(d.neon)[2];
      s.push(`<line x1="${x0}" y1="${y - 16}" x2="${x1}" y2="${y - 16}" stroke="${c}" stroke-width="2" opacity="0.8"/>`);
      s.push(`<text x="${x0}" y="${y + 4}" font-family="Menlo, monospace" font-size="14" font-weight="700" letter-spacing="2" fill="${c}">${d.name}</text>`);
    }
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <defs><filter id="${id}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="${id}c" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter></defs>${s.join('')}</svg>`;
}

// ---- the pages ------------------------------------------------------------------------------
const CSS = `body { margin: 0; background: #0b0c10; color: #c9d1d9; font-family: ui-monospace, Menlo, monospace; }
  .page { width: 1440px; box-sizing: border-box; padding: 22px 0 26px; } .page.pad { padding: 22px 28px 26px; } .pad { padding: 0 28px; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #e6edf3; letter-spacing: 1px; } h2 { font-size: 15px; margin: 22px 0 10px; color: #e6edf3; }
  .sub { color: #8b949e; font-size: 13px; line-height: 1.5; } .note { color: #6e7681; font-size: 12px; }
  .chip { display: inline-block; width: 26px; height: 22px; } .row { display: flex; align-items: center; gap: 0; }
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 18px; }
  .card { background: #11141a; border: 1px solid #222832; padding: 14px 14px 12px; }
  .card h3 { margin: 0; font-size: 16px; letter-spacing: 2px; } .card .where { color: #8b949e; font-size: 12px; margin: 3px 0 10px; }
  .card .lab { color: #6e7681; font-size: 11px; margin: 8px 0 3px; } .card .txt { font-size: 12.5px; color: #c9d1d9; }
  .signbox { background: #07080b; height: 118px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; margin-top: 4px; }
  table { border-collapse: collapse; } td { padding: 3px 10px 3px 0; font-size: 12.5px; vertical-align: middle; }
  .pass { color: #7ee787; } .fail { color: #ff7b72; } .info { color: #8b949e; }`;
const chips = (ramp, w = 26, h = 22) => `<span class="row">${ramp.map(c => `<span class="chip" style="background:${c};width:${w}px;height:${h}px"></span>`).join('')}</span>`;
// a district's sign style, for one word (the signs come in English and Cyrillic, both in every district)
function sign(d, ramp, word) {
  const glow = `text-shadow: 0 0 6px ${ramp[2]}, 0 0 16px ${ramp[2]}, 0 0 28px ${ramp[1]}; color: ${ramp[3]};`;
  if (d.style === 'blade') return `<div style="${glow} font-weight:700; font-size:13px; line-height:12px; writing-mode:vertical-rl; text-orientation:upright; letter-spacing:-1px; border:2px solid ${ramp[2]}; padding:4px 2px; box-shadow: 0 0 10px ${ramp[2]}">${word}</div>`;
  if (d.style === 'thin') return `<div style="${glow} font-weight:300; font-size:17px; letter-spacing:7px">${word}</div>`;
  if (d.style === 'stencil') return `<div style="${glow} font-weight:700; font-size:26px; letter-spacing:5px; border-top:3px solid ${ramp[2]}; border-bottom:3px solid ${ramp[2]}; padding:2px 8px; font-size:20px">${word}</div>`;
  return `<div style="${glow} font-weight:800; font-size:24px; letter-spacing:2px">${word}</div>`;
}

function citySheet(R) {
  const day = P.directions[pick].keyframes.day.ramps;
  const cards = DISTRICTS.map(d => {
    const n = R['neon_' + d.neon];
    return `<div class="card"><h3 style="color:${n[2]}">${d.name}</h3><div class="where">${d.where}</div>
      <div class="lab">its light</div>${chips(n, 30, 20)}
      <div class="lab">its materials, by day: ${d.mats.join(', ')}</div>${d.mats.map(m => `<div style="margin-bottom:3px">${chips(day[m], 30, 12)}</div>`).join('')}
      <div class="lab">its signs, in English and Cyrillic</div><div class="signbox" style="${d.style === 'blade' ? 'flex-direction:row; gap:18px' : ''}">${sign(d, n, d.sign)}${sign(d, n, d.sign2)}</div>
      <div class="lab">landmark</div><div class="txt">${d.landmark}</div>
      <div class="lab">in three words</div><div class="txt">${d.words}</div></div>`;
  }).join('');
  return `<div class="page"><div class="pad"><h1>PORT ASCII · THE CITY ON ITS HILL</h1>
    <div class="sub">Wealth rises with height: the Docks by the water, the Stacks on the lower slopes, Neon Row in the middle, the Spires on the summit.
    The colder and cleaner the light, the higher you are. One neon colour per district; everything else stays dark and quiet.
    The warm white doorways are the one thing kept for "you can use this".</div>
    <div class="note">A diagram drawn from the draft palette (direction ${pick}, night, raining), not a render: step 1 shows the real thing in the engine.</div></div>
    <div style="margin-top:14px; height:${H}px; overflow:hidden">${skyline(R, 1, { id: 'main' })}</div>
    <div class="pad"><div class="cards">${cards}</div></div></div>`;
}

function moodsSheet() {
  const L = { day: 0.3, dusk: 0.8, night: 1 };
  const rows = Object.entries(P.directions).map(([id, d]) => `<h2>${id} · ${d.name}${id === pick ? '  (my pick)' : ''}</h2><div class="sub" style="margin:-4px 0 8px">${d.note.replace(' (my pick)', '')}</div>
    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px">${HOURS.map(h => `<div><div style="height:${Math.round(H * 448 / W)}px; overflow:hidden">${skyline(d.keyframes[h].ramps, L[h], { labels: false, id: id + h })}</div><div class="note" style="margin-top:3px">${h}</div></div>`).join('')}</div>`).join('');
  return `<div class="page pad"><h1>THREE MOODS TO TRY IN STEP 1</h1>
    <div class="sub">The same city, the same districts and the same neon under three different lights. Step 1 renders a test block in the real engine in each, from the same cameras; you pick one.</div>${rows}</div>`;
}

function paletteSheet(R, ck) {
  const mats = ['sky', 'haze', 'cloud', 'rain', 'concrete', 'stained', 'steel', 'glass', 'asphalt', 'tile', 'brick', 'rust', 'plastic', 'water', 'coat0', 'coat1', 'coat2', 'coat3'];
  const what = { sky: 'sky, top to horizon', haze: 'fog and smog layers', cloud: 'the low cloud, lit from below', rain: 'rain', ...P.roles.materials };
  const K = P.directions[pick].keyframes;
  const ramps = `<table><tr><td></td>${HOURS.map(h => `<td class="note">${h}</td>`).join('')}<td></td></tr>${mats.map(m => `<tr><td style="width:96px">${m}</td>${HOURS.map(h => `<td>${chips(K[h].ramps[m], 24, 20)}</td>`).join('')}<td class="note">${what[m] || ''}</td></tr>`).join('')}</table>`;
  const lights = `<table>${DISTRICTS.map(d => `<tr><td style="width:96px">${d.neon}</td><td>${chips(R['neon_' + d.neon], 40, 24)}</td><td class="note">${P.roles.neon[d.neon]}</td></tr>`).join('')}
    <tr><td>signal</td><td>${chips(R.signal, 40, 24)}</td><td class="note">${P.roles.signal}</td></tr>
    <tr><td>windows</td><td>${chips(R.window_warm, 40, 24)} ${chips(R.window_cool, 40, 24)}</td><td class="note">warm: homes and shops · cool: offices in the Spires</td></tr>
    <tr><td></td><td class="note">${P.roles.neonSteps.join(' · ')}</td><td></td></tr></table>`;
  const names = DISTRICTS.map(d => d.neon);
  const checkRows = ck.rows.map(r => `<tr><td style="width:120px">${r.view}</td><td>${chips(names.map(n => r.cols[n]), 34, 24)}</td><td style="padding-left:6px">${chips([r.signal], 34, 24)}</td>
    <td>closest: ${r.pair} ${r.min.toFixed(3)}</td><td class="${r.required ? (r.pass ? 'pass' : 'fail') : 'info'}">${r.required ? (r.pass ? 'pass' : 'FAIL') + ` (needs ${DISTRICT_MIN})` : 'reported: shapes carry it'}</td></tr>`).join('');
  return `<div class="page pad"><h1>THE PALETTE · DIRECTION ${pick} (${P.directions[pick].name.toUpperCase()})</h1>
    <div class="sub">Every ramp runs dark to light, shadows leaning cool, as the Land's do. Materials change with the hour; lights (neon, the signal, windows) do not, only how strongly they shine.</div>
    <h2>Materials and air, by the hour</h2>${ramps}
    <h2>Lights: the same at every hour</h2>${lights}
    <h2>The checks</h2><div class="sub" style="margin-bottom:8px">The four district glows (orange, green, magenta, cyan) and the signal, as different eyes see them. Distances are in OKLab (0 = the same colour).</div>
    <table>${checkRows}</table>
    <div class="sub" style="margin-top:8px">The signal is brighter than the brightest glow by <span class="${ck.leadPass ? 'pass' : 'fail'}">${ck.lead.toFixed(3)}</span> (needs ${SIGNAL_LEAD}): it reads by brightness, for everyone and in greyscale.</div></div>`;
}

// ---- render ---------------------------------------------------------------------------------
const R = P.directions[pick].keyframes.night.ramps, ck = checks(R);
for (const r of ck.rows) console.log(`${r.view.padEnd(13)} closest ${r.pair.padEnd(18)} ${r.min.toFixed(3)}  ${r.required ? (r.pass ? 'pass' : 'FAIL') : 'reported'}`);
console.log(`signal lead ${ck.lead.toFixed(3)}  ${ck.leadPass ? 'pass' : 'FAIL'}`);
if (!ck.leadPass || ck.rows.some(r => !r.pass)) process.exitCode = 1;

fs.mkdirSync(dir, { recursive: true });
const { browser, page } = await launch({ width: 1440, height: 900, dpr, timeControl: false });
for (const [name, body] of [['sheet-city', citySheet(R)], ['sheet-moods', moodsSheet()], ['sheet-palette', paletteSheet(R, ck)]]) {
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>${CSS}</style>${body}`);
  const file = path.join(dir, name + '.png');
  await page.screenshot({ path: file, fullPage: true });
  console.log('wrote', path.relative(ROOT, file));
}
await browser.close();
