// The samples an engine's raymarch would hand to the cell stage: one per ray, on a regular grid
// of sx x sy rays per cell. Here each ray is read from the 1 px G-buffer at the ray's pixel.
import { Semantics, newSample } from './semantic.js';

export function sampleGrid(G, cw, ch, sx, sy, xs, ys) {
  const sem = new Semantics(G);
  const cols = Math.floor(G.W / cw), rows = Math.floor(G.H / ch), SW = cols * sx, SH = rows * sy, N = SW * SH;
  const S = { cols, rows, sx, sy, SW, SH, seg: new Int32Array(N), ramp: new Uint8Array(N), pos: new Float32Array(N), fog: new Float32Array(N), lit: new Float32Array(N), depth: new Float32Array(N), kind: new Uint8Array(N), pix: new Int32Array(N), refl: new Float32Array(N), reflRamp: new Uint8Array(N), reflPos: new Float32Array(N), reflFog: new Float32Array(N), sem };
  const tmp = newSample();
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const px = ((x / sx) | 0) * cw + xs[x % sx], py = ((y / sy) | 0) * ch + ys[y % sy], p = py * G.W + px, i = y * SW + x;
    sem.at(p, tmp);
    S.seg[i] = tmp.seg; S.ramp[i] = tmp.ramp; S.pos[i] = tmp.pos; S.fog[i] = tmp.fog; S.lit[i] = tmp.lit; S.depth[i] = tmp.depth; S.kind[i] = tmp.kind; S.pix[i] = p;
    if (tmp.refl) { S.refl[i] = tmp.refl; S.reflRamp[i] = tmp.reflRamp; S.reflPos[i] = tmp.reflPos; S.reflFog[i] = tmp.reflFog; }
  }
  return S;
}
