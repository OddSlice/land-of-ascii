// The frame: a grid of cells, each one glyph mask drawn in two colours. This is exactly the
// Canvas2D path an engine would take (compose into a Uint32 view of an ImageData, one putImageData).
export class Frame {
  constructor(cols, rows, cw, ch) {
    Object.assign(this, { cols, rows, cw, ch });
    this.glyph = new Int32Array(cols * rows);     // index into this.masks
    this.fg = new Uint32Array(cols * rows);
    this.bg = new Uint32Array(cols * rows);
    this.masks = [];
    this.maskIndex = new Map();
  }
  // Register a mask (deduplicated) and return its index.
  addMask(m) {
    const k = m.join('');
    let i = this.maskIndex.get(k);
    if (i === undefined) { i = this.masks.length; this.masks.push(m); this.maskIndex.set(k, i); }
    return i;
  }
  set(c, r, gi, fg, bg) { const i = r * this.cols + c; this.glyph[i] = gi; this.fg[i] = fg; this.bg[i] = bg; }
  compose(img) {
    const { cols, rows, cw, ch, glyph, fg, bg, masks } = this;
    const buf = new Uint32Array(img.data.buffer), stride = img.width;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, m = masks[glyph[i]], f = fg[i], b = bg[i];
      let k = 0;
      for (let y = 0; y < ch; y++) { const o = (r * ch + y) * stride + c * cw; for (let x = 0; x < cw; x++) buf[o + x] = m[k++] ? f : b; }
    }
  }
}
