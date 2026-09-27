// Colour helpers. Colours travel as [r, g, b] arrays (0..255) and as packed little-endian
// 0xAABBGGRR words for the frame buffer. Every packer clamps every channel.
export const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
export const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const toHex = c => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
export const pack = (r, g, b) => (0xff000000 | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255)) >>> 0;
export const packRGB = c => pack(c[0], c[1], c[2]);
export const unpack = p => [p & 255, (p >> 8) & 255, (p >> 16) & 255];
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const luma = c => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

// OKLab (Björn Ottosson) for perceptual nearest-colour picks.
const s2l = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
export function oklab(c) {
  const r = s2l(c[0]), g = s2l(c[1]), b = s2l(c[2]);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
export const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

// Ordered-dither thresholds in [0, 1): Bayer 4x4 and 8x8.
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer4 = (x, y) => (B4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
// Bayer 8x8 by the recursive definition M(2n) = [[4M, 4M+2], [4M+3, 4M+1]].
const B8 = (() => {
  let m = [[0, 2], [3, 1]];
  while (m.length < 8) {
    const n = m.length, next = Array.from({ length: 2 * n }, () => new Array(2 * n));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = 4 * m[y][x];
      next[y][x] = v; next[y][x + n] = v + 2; next[y + n][x] = v + 3; next[y + n][x + n] = v + 1;
    }
    m = next;
  }
  return Float32Array.from(m.flat(), v => (v + 0.5) / 64);
})();
export const bayer8 = (x, y) => B8[(y & 7) * 8 + (x & 7)];

// Integer hash -> [0, 1), the same one v1 uses, for world-anchored variation.
export function hash2(x, y, s) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
