// Port Ascii's palette (the second world): every ramp is built from a recipe in OKLab, so the whole
// palette moves together when one number changes. Writes docs/city/palette.json (hex, dark to light,
// the shape KEYFRAMES has in index.html), which tools/city-sheet.mjs draws, and the game's copy into
// index.html (CITY_PALETTE, between its markers), which the city is drawn in. Once the palette is
// locked (step 2), the recipe retires and the game's copy is tuned by hand, as the Land's is.
//   node tools/city-palette.mjs [--out docs/city/palette.json]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/harness.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const out = path.resolve(ROOT, opt('out', 'docs/city/palette.json'));

// ---- colour maths: OKLab (Björn Ottosson), sRGB ---------------------------------------------
const lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const gam = c => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
function labToLin([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
}
const inGamut = rgb => rgb.every(c => c >= -1e-4 && c <= 1 + 1e-4);
const lch = (L, C, h) => [L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180)];
// a colour as hex, its chroma pulled in until it fits sRGB (hue and lightness kept)
function hex(lab) {
  let [L, a, b] = lab, lo = 0, hi = 1;
  if (!inGamut(labToLin([L, a, b]))) {
    for (let i = 0; i < 24; i++) { const k = (lo + hi) / 2; if (inGamut(labToLin([L, a * k, b * k]))) lo = k; else hi = k; }
    a *= lo; b *= lo;
  }
  return '#' + labToLin([L, a, b]).map(c => Math.round(Math.min(1, Math.max(0, gam(Math.min(1, Math.max(0, c))))) * 255).toString(16).padStart(2, '0')).join('');
}
const mix = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t);
// n steps from one OKLCH colour to another, straight through OKLab: a cool shadow and a warm light
// meet in a near-neutral middle, as the Land's hue-shifted ramps do
const ramp = (n, from, to) => Array.from({ length: n }, (_, i) => mix(lch(...from), lch(...to), n === 1 ? 0 : i / (n - 1)));

// ---- the recipe -----------------------------------------------------------------------------
// Materials as they look by day under the smog: [L, C, hue] at the dark end and the light end.
// Dusk and night are worked out from these by each direction's light (below), so a material keeps
// its character at every hour and every material changes in the same way.
const MATERIALS = {
  concrete: { n: 5, what: 'walls, pavements, stairs: the city\'s main surface', day: [[0.25, 0.008, 255], [0.76, 0.014, 85]] },
  stained: { n: 5, what: 'old concrete in the Stacks and the Docks, water-stained', day: [[0.22, 0.010, 230], [0.66, 0.020, 80]] },
  steel: { n: 5, what: 'frames, rails, the Spires\' cladding', day: [[0.22, 0.018, 250], [0.78, 0.022, 235]] },
  glass: { n: 4, what: 'dark panes and glass towers (unlit windows)', day: [[0.20, 0.016, 245], [0.58, 0.030, 235]] },
  asphalt: { n: 4, what: 'roads and the darkest ground', day: [[0.17, 0.006, 260], [0.42, 0.008, 250]] },
  tile: { n: 5, what: 'pale stone of the Spires\' plazas', day: [[0.40, 0.008, 255], [0.88, 0.010, 90]] },
  brick: { n: 5, what: 'old buildings low on the hill', day: [[0.26, 0.030, 30], [0.68, 0.060, 45]] },
  rust: { n: 5, what: 'corrugated sheds, cranes, containers at the Docks', day: [[0.24, 0.040, 40], [0.68, 0.090, 55]] },
  plastic: { n: 5, what: 'shopfront panels and awnings on Neon Row', day: [[0.26, 0.016, 340], [0.80, 0.030, 350]] },
  water: { n: 5, what: 'the harbour', day: [[0.14, 0.014, 230], [0.48, 0.030, 220]] },
  coat0: { n: 3, what: 'people: charcoal coats', day: [[0.22, 0.008, 260], [0.50, 0.012, 250]] },
  coat1: { n: 3, what: 'people: olive and brown coats', day: [[0.24, 0.022, 85], [0.52, 0.035, 80]] },
  coat2: { n: 3, what: 'people: wine-red coats', day: [[0.22, 0.040, 15], [0.48, 0.070, 20]] },
  coat3: { n: 3, what: 'people: navy coats', day: [[0.20, 0.035, 260], [0.46, 0.060, 255]] },
};

// Neon: lights, the same at every hour (the hour only changes how strongly they shine). Five steps:
// two spill tints for the surfaces a sign lights, the glow, the bright tube, the near-white core.
// Hues are spread round the wheel, and their glows step in lightness (green brightest, magenta darkest)
// so they stay apart in greyscale and for red-green colour-blind eyes, where hue alone would not.
const NEON = {
  cyan: { hue: 215, glow: [0.79, 0.150], district: 'spires', what: 'the Spires: cold white and ice cyan' },
  magenta: { hue: 350, glow: [0.63, 0.270], district: 'row', what: 'Neon Row: magenta' },
  green: { hue: 138, glow: [0.87, 0.230], district: 'stacks', what: 'the Stacks: fluorescent tube green' },
  orange: { hue: 58, glow: [0.71, 0.175], district: 'docks', what: 'the Docks: sodium orange' },
};
// "You can use this": the one warm white, brighter than any glow (by 0.08 or more), nearly without hue,
// with the neon's five steps. Doors you can
// enter, vendors' work lamps, lifts; and in the screens, whatever you can click.
const SIGNAL = { what: 'you can use this (and, in the screens, you can click this)', ramp: [[0.30, 0.030, 75], [0.46, 0.040, 78], [0.955, 0.032, 85], [0.975, 0.020, 88], [0.99, 0.010, 90]] };
const WINDOWS = {
  warm: { what: 'lit home windows (the Stacks, Neon Row)', ramp: [[0.30, 0.050, 60], [0.46, 0.085, 65], [0.64, 0.110, 72], [0.80, 0.100, 80]] },
  cool: { what: 'lit office windows (the Spires)', ramp: [[0.28, 0.030, 235], [0.46, 0.055, 230], [0.66, 0.065, 225], [0.86, 0.045, 220]] },
};

// Each direction is a mood for step 1's test: the same materials, districts and neon, under a
// different light. light: how each hour scales lightness (L) and chroma (C), the tint the shadows
// lean to ([chroma, hue]) and a floor so nothing is pure black. sky/haze/cloud/rain: the air.
const DIRECTIONS = {
  A: {
    name: 'Rain noir', note: 'blue-black nights, grey smog days, the neon held back; rain most nights (my pick)',
    neon: 1, light: {
      day: { L: 1, C: 1, tint: [0.004, 85], floor: 0.0 },
      dusk: { L: 0.60, C: 0.85, tint: [0.030, 330], floor: 0.035 },
      night: { L: 0.40, C: 0.55, tint: [0.030, 262], floor: 0.045 },
    },
    air: {
      day: { sky: [[0.50, 0.012, 85], [0.80, 0.024, 85], 6], haze: [[0.48, 0.010, 80], [0.78, 0.020, 85], 5], cloud: [[0.58, 0.010, 80], [0.86, 0.014, 85], 3], rain: [[0.58, 0.012, 240], [0.86, 0.010, 240], 3] },
      dusk: { sky: [[0.16, 0.050, 290], [0.70, 0.120, 50], 6], haze: [[0.24, 0.045, 320], [0.66, 0.100, 45], 5], cloud: [[0.30, 0.050, 330], [0.62, 0.090, 40], 3], rain: [[0.46, 0.030, 320], [0.76, 0.030, 40], 3] },
      night: { sky: [[0.10, 0.025, 265], [0.33, 0.055, 330], 6], haze: [[0.16, 0.028, 265], [0.36, 0.050, 325], 5], cloud: [[0.20, 0.032, 290], [0.42, 0.060, 340], 3], rain: [[0.48, 0.020, 250], [0.80, 0.016, 240], 3] },
    },
  },
  B: {
    name: 'Neon soak', note: 'violet-black nights, stronger and wetter neon, more signs to a street (the risk: mush)',
    neon: 1.12, light: {
      day: { L: 0.94, C: 1.1, tint: [0.012, 320], floor: 0.0 },
      dusk: { L: 0.58, C: 1.0, tint: [0.045, 320], floor: 0.04 },
      night: { L: 0.42, C: 0.7, tint: [0.045, 305], floor: 0.05 },
    },
    air: {
      day: { sky: [[0.50, 0.020, 320], [0.80, 0.030, 340], 6], haze: [[0.48, 0.018, 320], [0.78, 0.026, 340], 5], cloud: [[0.58, 0.018, 320], [0.86, 0.020, 340], 3], rain: [[0.58, 0.016, 300], [0.86, 0.014, 300], 3] },
      dusk: { sky: [[0.16, 0.070, 300], [0.66, 0.160, 0], 6], haze: [[0.24, 0.070, 310], [0.62, 0.130, 0], 5], cloud: [[0.30, 0.070, 310], [0.60, 0.120, 355], 3], rain: [[0.46, 0.050, 320], [0.76, 0.040, 350], 3] },
      night: { sky: [[0.11, 0.045, 300], [0.38, 0.100, 340], 6], haze: [[0.17, 0.050, 300], [0.40, 0.090, 335], 5], cloud: [[0.22, 0.055, 305], [0.46, 0.100, 345], 3], rain: [[0.50, 0.040, 320], [0.82, 0.030, 330], 3] },
    },
  },
  C: {
    name: 'Smog amber', note: 'amber haze day and dusk, warmer nights, cooler neon against it; drier',
    neon: 0.95, light: {
      day: { L: 0.96, C: 1.2, tint: [0.026, 70], floor: 0.0 },
      dusk: { L: 0.62, C: 1.0, tint: [0.050, 55], floor: 0.04 },
      night: { L: 0.40, C: 0.65, tint: [0.026, 45], floor: 0.045 },
    },
    air: {
      day: { sky: [[0.52, 0.060, 65], [0.84, 0.090, 80], 6], haze: [[0.50, 0.055, 65], [0.82, 0.080, 78], 5], cloud: [[0.60, 0.050, 70], [0.88, 0.060, 80], 3], rain: [[0.60, 0.030, 70], [0.86, 0.025, 75], 3] },
      dusk: { sky: [[0.20, 0.060, 30], [0.74, 0.150, 60], 6], haze: [[0.28, 0.060, 35], [0.70, 0.130, 58], 5], cloud: [[0.32, 0.060, 35], [0.66, 0.110, 55], 3], rain: [[0.48, 0.040, 40], [0.78, 0.040, 55], 3] },
      night: { sky: [[0.11, 0.022, 40], [0.36, 0.070, 50], 6], haze: [[0.17, 0.026, 40], [0.40, 0.065, 50], 5], cloud: [[0.22, 0.030, 40], [0.46, 0.070, 50], 3], rain: [[0.48, 0.020, 50], [0.80, 0.020, 60], 3] },
    },
  },
};

// A material under an hour's light: lightness scaled and lifted off black, chroma scaled, and the
// shadows leaned toward the hour's tint (the dark end most, the light end least).
function underLight(steps, lt) {
  return steps.map(([L, a, b], i) => {
    const t = steps.length === 1 ? 0 : i / (steps.length - 1), w = 1 - 0.65 * t;
    const [, ta, tb] = lch(0, lt.tint[0], lt.tint[1]);
    return [lt.floor + L * lt.L, a * lt.C + ta * w, b * lt.C + tb * w];
  });
}
function neonRamp(n, k) {
  const [gL, gC] = n.glow, C = Math.min(0.37, gC * k);
  return [[0.20, 0.050, n.hue], [0.32, 0.090, n.hue], [gL, C, n.hue], [Math.min(0.95, gL + 0.08), C * 0.62, n.hue], [0.97, 0.035, n.hue]].map(p => lch(...p));
}

const palette = {
  note: 'Draft palette for the city (the second world). Generated by tools/city-palette.mjs; every ramp runs dark to light. See docs/city/bible.md.',
  roles: {
    materials: Object.fromEntries(Object.entries(MATERIALS).map(([k, m]) => [k, m.what])),
    neon: Object.fromEntries(Object.entries(NEON).map(([k, n]) => [k, n.what])),
    neonSteps: ['spill (dark tint on surfaces)', 'spill (lit tint)', 'glow', 'bright tube', 'core'],
    signal: SIGNAL.what,
    windows: Object.fromEntries(Object.entries(WINDOWS).map(([k, w]) => [k, w.what])),
  },
  districts: Object.fromEntries(Object.entries(NEON).map(([k, n]) => [n.district, k])),
  directions: {},
};
for (const [id, d] of Object.entries(DIRECTIONS)) {
  const dir = { name: d.name, note: d.note, keyframes: {} };
  for (const hour of ['day', 'dusk', 'night']) {
    const lt = d.light[hour], air = d.air[hour], ramps = {};
    for (const [k, [from, to, n]] of Object.entries(air)) ramps[k] = ramp(n, from, to).map(hex);
    for (const [k, m] of Object.entries(MATERIALS)) ramps[k] = underLight(ramp(m.n, ...m.day), lt).map(hex);
    for (const [k, n] of Object.entries(NEON)) ramps['neon_' + k] = neonRamp(n, d.neon).map(hex);
    ramps.signal = SIGNAL.ramp.map(p => hex(lch(...p)));
    for (const [k, w] of Object.entries(WINDOWS)) ramps['window_' + k] = w.ramp.map(p => hex(lch(...p)));
    dir.keyframes[hour] = { lights: { day: 0.3, dusk: 0.8, night: 1 }[hour], ramps };
  }
  palette.directions[id] = dir;
}
// The game's copy (index.html, between its markers): for each mood and hour, the ramps the city
// replaces in the Land's keyframes (the air, the water, glass, brick) and its own materials.
const ENGINE = ['sky', 'haze', 'cloud', 'rain', 'water', 'glass', 'brick', 'concrete', 'stained', 'steel', 'asphalt', 'tile', 'rust', 'plastic'];
const game = path.join(ROOT, 'index.html'), html = fs.readFileSync(game, 'utf8');
const BEGIN = "// ---- Port Ascii's palette: written by tools/city-palette.mjs from its recipe; change the recipe, not this ----\n", END = "// ---- end of Port Ascii's palette ----";
const i0 = html.indexOf(BEGIN), i1 = html.indexOf(END);
if (i0 < 0 || i1 < i0) throw new Error("index.html has no Port Ascii palette markers");
const block = 'const CITY_PALETTE = {\n' + Object.entries(palette.directions).map(([id, d]) => `  ${id}: {   // ${d.name}\n` + ['day', 'dusk', 'night'].map(h =>
  `    ${h}: { ${ENGINE.map(n => `${n}: [${d.keyframes[h].ramps[n].map(c => `'${c}'`).join(', ')}]`).join(', ')} },`).join('\n') + '\n  },').join('\n') + '\n};\n';
fs.writeFileSync(game, html.slice(0, i0 + BEGIN.length) + block + html.slice(i1));
console.log('wrote the palette into index.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(palette, null, 1).replace(/\[\n\s+("#[0-9a-f]{6}",?\n\s+)+\]/g, m => '[' + m.match(/"#[0-9a-f]{6}"/g).join(', ') + ']') + '\n');
console.log('wrote', path.relative(ROOT, out));
