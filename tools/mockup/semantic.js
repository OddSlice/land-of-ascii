// From G-buffer pixels to meaning: which ramp, where on it (lighting), how fogged, how firelit,
// and which object (segment) a sample belongs to. Candidates turn this into colour and glyphs.
import { K, MAT, PART } from './gbuffer.js';

export const RAMP_IDS = ['sky', 'haze', 'grass', 'grass2', 'rock', 'snow', 'water', 'stone', 'wood', 'road', 'leaf', 'conifer', 'cloud', 'skin', 'dark', 'robe0', 'robe1', 'robe2', 'robe3', 'fire', 'lit', 'sun', 'moon', 'ink', 'star'];
export const R = Object.fromEntries(RAMP_IDS.map((n, i) => [n, i]));
const MAT_RAMP = { [MAT.WATER]: R.water, [MAT.GRASS]: R.grass, [MAT.ROCK]: R.rock, [MAT.SNOW]: R.snow, [MAT.HAZE]: R.haze, [MAT.STONE]: R.stone, [MAT.WOOD]: R.wood, [MAT.LEAF]: R.leaf, [MAT.ROAD]: R.road, [MAT.GRASS2]: R.grass2 };

export class Semantics {
  constructor(G) {
    this.G = G;
    const m = G.meta, pal = m.palette;
    this.lo = pal.ambient * 0.3;                // darkest lit value a surface reaches (interiors, undersides)
    this.hi = pal.ambient + pal.diffuse * 0.95; // sunlit slope
    this.vd = m.viewDist;
    this.merchantRobe = m.merchants.map(x => R['robe' + x.robe]);
  }
  fogAt(depth) { const u = (depth / this.vd - 0.15) / 0.85; return u <= 0 ? 0 : u >= 1 ? 0.93 : Math.pow(u, 1.4) * 0.93; }
  // Fill out = {seg, ramp, pos, fog, lit, depth, kind} for G-buffer pixel p.
  at(p, out) {
    const { ch } = this.G;
    const kind = ch.kind[p], mat = ch.mat[p], obj = ch.obj[p], shade = ch.shade[p], depth = ch.depth[p];
    let ramp = R.ink, pos = 0.5, seg = kind << 24;
    const rel = (shade - this.lo) / (this.hi - this.lo);
    switch (kind) {
      case K.SKY: ramp = R.sky; pos = shade; seg = 0; break;
      case K.SUN: ramp = R.sun; pos = 1; break;
      case K.MOON: ramp = R.moon; pos = 1; break;
      case K.TERRAIN: ramp = MAT_RAMP[mat]; pos = rel - (ch.tex[p] & 0x80 ? 0.22 : 0); seg |= mat; break;
      case K.WALL: case K.TOP: case K.UNDER: ramp = MAT_RAMP[mat]; pos = rel; seg |= (obj << 4) | (ch.face[p] & 7); break;
      case K.TREE: case K.BUSH: ramp = R.leaf; pos = shade; seg |= obj; break;
      case K.CONIFER: ramp = R.conifer; pos = shade; seg |= obj; break;
      case K.TRUNK: ramp = R.wood; pos = shade; seg |= obj; break;
      case K.BOULDER: ramp = R.rock; pos = shade; seg |= obj; break;
      case K.CLOUD: ramp = R.cloud; pos = shade; seg |= obj; break;
      case K.FLAME: ramp = R.fire; pos = mat === 0 ? 1 : mat === 1 ? 0.72 : 0.38; seg |= (obj << 2) | mat; break;
      case K.LOGS: ramp = R.wood; pos = 0.1; seg |= obj; break;
      case K.BRACKET: case K.BIRD: ramp = R.dark; pos = 0.2; seg |= obj; break;
      case K.MERCHANT: {
        const side = shade, lit = (side - 0.8) / 0.2;   // 1 on the sun side, 0 in its shade
        seg |= (obj << 8) | mat;
        if (mat === PART.FACE || mat === PART.HAND) { ramp = R.skin; pos = 0.45 + 0.55 * lit; }
        else if (mat === PART.EYE) { ramp = R.ink; pos = 0; }
        else if (mat === PART.ROBE || mat === PART.SLEEVE) { ramp = this.merchantRobe[obj]; pos = 0.45 + 0.55 * lit; }
        else if (mat === PART.FOLD) { ramp = this.merchantRobe[obj]; pos = 0.1 + 0.3 * lit; }
        else if (mat === PART.STAFF) { ramp = R.wood; pos = 0.5 + 0.5 * lit; }
        else if (mat === PART.LANTERN) { ramp = R.fire; pos = 0.9; }
        else { ramp = R.dark; pos = 0.3 + 0.5 * lit; }
        break;
      }
      default: ramp = R.ink; pos = 0; seg = 255 << 24;
    }
    out.kind = kind; out.seg = seg; out.ramp = ramp;
    out.pos = pos < 0 ? 0 : pos > 1 ? 1 : pos;
    out.depth = depth;
    out.fog = kind === K.SKY || kind === K.SUN || kind === K.MOON || kind === K.FLAME ? 0 : this.fogAt(depth);
    out.lit = kind === K.FLAME ? 0 : Math.min(1, (ch.light[p] & 255) / 190);
    out.refl = 0;
    if (kind === K.TERRAIN && mat === MAT.WATER && ch.refl[p] >= 0 && ch.reflAmt[p] > 0.05) {
      const q = ch.refl[p];
      if (!this._r) this._r = {};
      const r2 = this.at(q, this._r);
      out.refl = ch.reflAmt[p]; out.reflRamp = r2.ramp; out.reflPos = Math.max(0, r2.pos - 0.2); out.reflFog = r2.fog; out.reflKind = r2.kind;
    }
    return out;
  }
}
export const newSample = () => ({ kind: 0, seg: 0, ramp: 0, pos: 0, fog: 0, lit: 0, depth: 0, refl: 0, reflRamp: 0, reflPos: 0, reflFog: 0, reflKind: 0 });
