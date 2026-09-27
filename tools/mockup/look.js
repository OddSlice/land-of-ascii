// The shared colour model for the palette candidates (A and C). A sample's meaning (ramp, lighting
// position, fog, firelight) resolves to a LAYER and a TONE:
//   layer 0 near    : the material's own ramp, stepped by lighting
//   layer 1 far     : the material's "far" ramp (each step pulled halfway to the haze)
//   layer 2 haze    : the haze ramp, lighter with distance
//   layer 3 horizon : the last haze colour
//   layer 4 warm    : a warm ramp that takes over wherever a torch or campfire reaches
// solid() gives one palette colour (edges, and A's pixels with a dither threshold). plan() gives an
// interior cell its two colours: calm solid areas, and a narrow ░▒▓ band only where the cell sits
// on a boundary between two tones, two fog layers, or lit and unlit ground.
import { resolve, keyframeFor } from './palettes.js';
import { R, RAMP_IDS } from './semantic.js';
import { packRGB, mix, clamp } from './color.js';
import { K } from './gbuffer.js';

const FOG_EDGES = [0.16, 0.42, 0.8];
const WARM_AT = 0.22;
const NO_FOG = new Set([R.sky, R.sun, R.moon, R.fire, R.star, R.ink]);

export function makeLook(meta) {
  const kf = keyframeFor(meta.hour), pal = resolve(kf);
  const near = RAMP_IDS.map(n => pal.ramps[n] || [pal.ink]);
  const haze = pal.ramps.haze;
  const far = near.map((list, r) => {
    if (list.length < 3 || NO_FOG.has(r) || r === R.lit || r === R.haze) return list;
    const n = list.length;
    return [mix(list[1], haze[1], 0.5), mix(list[Math.max(1, n - 2)], haze[2], 0.5), mix(list[n - 1], haze[3], 0.5)];
  });
  const P = lists => lists.map(l => l.map(packRGB));
  const nearP = P(near), farP = P(far), hazeP = haze.map(packRGB), litP = pal.ramps.lit.map(packRGB);

  const layerOf = (ramp, fog) => NO_FOG.has(ramp) ? 0 : fog < FOG_EDGES[0] ? 0 : fog < FOG_EDGES[1] ? 1 : fog < FOG_EDGES[2] ? 2 : 3;
  const warmth = (lit, kind, pos) => lit * (kind === K.MERCHANT ? 0.35 : kind >= K.TREE && kind <= K.BOULDER ? 0.6 : 1) * (0.55 + 0.45 * pos);
  // The ramp and the continuous position X on it for a layer.
  function rampX(layer, ramp, pos, fog, warm) {
    if (layer === 4) return [litP, clamp(Math.pow(warm, 1.25) * (litP.length - 1) * 1.2, 0, litP.length - 1)];
    if (layer === 0) { const L = nearP[ramp]; return [L, pos * (L.length - 1)]; }
    if (layer === 1) { const L = farP[ramp]; return [L, pos * (L.length - 1)]; }
    if (layer === 2) return [hazeP, clamp(pos * 1.4 + (fog - FOG_EDGES[1]) / (FOG_EDGES[2] - FOG_EDGES[1]) * 1.6, 0, hazeP.length - 2)];
    return [hazeP, hazeP.length - 1];
  }
  function layerFor(ramp, pos, fog, lit, kind) {
    const layer = layerOf(ramp, fog), w = layer < 2 && !NO_FOG.has(ramp) ? warmth(lit, kind, pos) : 0;
    return w >= WARM_AT ? [4, w] : [layer, w];
  }
  // One colour. d (0..1) is an optional ordered-dither threshold for the tone step; 0.5 rounds.
  function solid(ramp, pos, fog, lit, kind, d = 0.5) {
    const [layer, w] = layerFor(ramp, pos, fog, lit, kind);
    const [L, X] = rampX(layer, ramp, pos, fog, w);
    return L[clamp(Math.floor(X + d), 0, L.length - 1)];
  }
  // An interior cell: { bg, fg, level } with level 0 (solid; fg is the tone to draw marks in),
  // or 1..3 for a ░ ▒ ▓ transition band from bg toward fg.
  function plan(ramp, pos, fog, lit, kind, out) {
    const [layer, w] = layerFor(ramp, pos, fog, lit, kind);
    const [L, X] = rampX(layer, ramp, pos, fog, w);
    const k = Math.floor(X), a = X - k, kk = clamp(k, 0, L.length - 1), k1 = clamp(k + 1, 0, L.length - 1);
    out.layer = layer; out.marks = layer === 0 || layer === 4; out.warm = layer === 4; out.ramp = L; out.tone = clamp(Math.round(X), 0, L.length - 1);
    // a fog layer boundary runs through this cell
    if (layer < 4 && !NO_FOG.has(ramp)) for (let e = 0; e < 3; e++) {
      const t = (fog - FOG_EDGES[e]) / 0.03;
      if (t > -1 && t < 1) {
        const lo = rampX(e, ramp, pos, FOG_EDGES[e] - 0.001, 0), hi = rampX(e + 1, ramp, pos, FOG_EDGES[e] + 0.001, 0);
        out.bg = lo[0][clamp(Math.round(lo[1]), 0, lo[0].length - 1)]; out.fg = hi[0][clamp(Math.round(hi[1]), 0, hi[0].length - 1)];
        out.level = t < -0.33 ? 1 : t < 0.33 ? 2 : 3; out.marks = false;
        return out;
      }
    }
    // the edge of a pool of firelight (figures and sprites switch cleanly instead)
    if (kind < K.TREE && (layer === 4 || (w > WARM_AT - 0.05 && w < WARM_AT))) {
      if (w < WARM_AT + 0.05) {
        const base = rampX(layerOf(ramp, fog), ramp, pos, fog, 0);
        out.bg = base[0][clamp(Math.round(base[1]), 0, base[0].length - 1)]; out.fg = litP[0];
        out.level = w < WARM_AT - 0.017 ? 1 : w < WARM_AT + 0.017 ? 2 : 3; out.marks = false;
        return out;
      }
    }
    // between two tones of the same ramp (not on figures and sprites: they stay in clean flat tones)
    if (kind < K.TREE && a > 0.42 && a < 0.58 && k1 !== kk) { out.bg = L[kk]; out.fg = L[k1]; out.level = a < 0.47 ? 1 : a < 0.53 ? 2 : 3; out.marks = false; return out; }
    const t = a >= 0.58 ? k1 : kk;
    out.bg = L[t]; out.level = 0; out.tone = t; out.ramp = L;
    out.fg = L[clamp(t + 1, 0, L.length - 1)]; out.fgDark = L[clamp(t - 1, 0, L.length - 1)];
    return out;
  }
  return { kf, pal, solid, plan, nearP, hazeP, litP, glow: packRGB(pal.glow), star: packRGB(pal.star), starBright: packRGB(pal.starBright), bird: packRGB(pal.bird), ink: packRGB(pal.ink) };
}
