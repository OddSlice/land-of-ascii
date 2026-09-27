// Mockup runner: load a scene's G-buffer, run a candidate, compose, save the PNG.
import { loadScene } from './gbuffer.js';
import * as A from './cand-a.js';
import * as B from './cand-b.js';
import * as C from './cand-c.js';
const CANDS = { a: A, b: B, c: C };
const scenes = new Map();
async function scene(name) { if (!scenes.has(name)) scenes.set(name, await loadScene(name)); return scenes.get(name); }

// 'c6' is candidate C with 2x6 rays per cell instead of 2x4.
window.renderMockup = async (cand, sceneName, savePath) => {
  const G = await scene(sceneName);
  const mod = CANDS[cand[0]];
  const res = mod.render(G, cand === 'c6' ? { raysY: 6 } : {});
  const canvas = document.getElementById('out');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const img = ctx.createImageData(res.frame.cols * res.frame.cw, res.frame.rows * res.frame.ch);
  const tc = performance.now();
  res.frame.compose(img);
  const composeMs = performance.now() - tc;
  ctx.putImageData(img, 0, 0);
  // Distinct colours actually on screen.
  const seen = new Set(); const u32 = new Uint32Array(img.data.buffer); for (let i = 0; i < u32.length; i++) seen.add(u32[i]);
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  if (savePath) await fetch('/save?path=' + encodeURIComponent(savePath), { method: 'POST', body: blob });
  return { info: mod.INFO, timings: { ...res.timings, composeMs }, stats: { ...res.stats, colorsOnScreen: seen.size, masksUsed: res.frame.masks.length } };
};
window.ready = true;

// Timing only: run a candidate n times on a scene (no PNG encoding), return per-stage medians.
window.benchMockup = async (cand, sceneName, n = 15) => {
  const G = await scene(sceneName);
  const mod = CANDS[cand[0]], opts = cand === 'c6' ? { raysY: 6 } : {};
  const canvas = document.getElementById('out'), ctx = canvas.getContext('2d');
  const runs = { cellsMs: [], composeMs: [], putMs: [] };
  for (let k = 0; k < n; k++) {
    const res = mod.render(G, opts);
    const img = ctx.createImageData(res.frame.cols * res.frame.cw, res.frame.rows * res.frame.ch);
    const t0 = performance.now(); res.frame.compose(img); const t1 = performance.now();
    ctx.putImageData(img, 0, 0); const t2 = performance.now();
    runs.cellsMs.push(res.timings.cellsMs + (res.timings.overlaysMs || 0)); runs.composeMs.push(t1 - t0); runs.putMs.push(t2 - t1);
  }
  const med = a => { const s = a.slice().sort((x, y) => x - y); return +s[s.length >> 1].toFixed(2); };
  return { cellsMs: med(runs.cellsMs), composeMs: med(runs.composeMs), putMs: med(runs.putMs), runs: n };
};
