// Shared harness for the capture and mockup scripts: a tiny static server rooted at the repo,
// a headless Chromium with Playwright, and an init script that puts page time under our control
// (performance.now and requestAnimationFrame), so every frame we photograph is deterministic:
// merchants, birds, clouds and flames only move when we step the clock.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  // a local install, the cloud container's, or the copy inside a global playwright-cli (Homebrew node)
  for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright', '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright']) {
    try { return require(p); } catch (e) { /* try next */ }
  }
  throw new Error('playwright not found: npm i -g playwright (or run from a checkout that has it)');
}
// Firefox on macOS 27 cannot reach its profile folder (microsoft/playwright#42768); pointing
// CFFIXED_USER_HOME at a writable folder gets it going.
function launchOptions(browser, jsFlags) {
  if (browser === 'chromium') return { args: ['--enable-unsafe-swiftshader', ...(jsFlags ? [`--js-flags=${jsFlags}`] : [])] };
  if (browser === 'firefox' && process.platform === 'darwin') {
    const home = process.env.CFFIXED_USER_HOME || path.join(os.homedir(), 'Library/Caches/ms-playwright/cf-home');
    fs.mkdirSync(home, { recursive: true });
    return { env: { ...process.env, CFFIXED_USER_HOME: home } };
  }
  return {};
}

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.bin': 'application/octet-stream' };

// GET serves files under ROOT; POST /save?path=rel writes the body under ROOT (tools/frames etc.).
export function startServer(port = 0) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'POST' && url.pathname === '/save') {
      const rel = url.searchParams.get('path');
      const out = path.resolve(ROOT, rel);
      if (!out.startsWith(ROOT + path.sep)) { res.writeHead(400); return res.end('bad path'); }
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const ws = fs.createWriteStream(out);
      req.pipe(ws);
      ws.on('finish', () => { res.writeHead(200); res.end('ok'); });
      return;
    }
    const file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

// Page time is ours: performance.now() returns __now, rAF callbacks queue until __step().
export const TIME_CONTROL = `(() => {
  let now = 0;
  const queue = [];
  performance.now = () => now;
  window.requestAnimationFrame = cb => { queue.push(cb); return queue.length; };
  window.__setNow = t => { now = t; };
  window.__step = (dtMs = 0) => { now += dtMs; const list = queue.splice(0); for (const cb of list) cb(now); return list.length; };
})();`;

// timeControl: false leaves the page on the real clock (for timing runs).
export async function launch({ width = 1440, height = 900, browser = 'chromium', dpr = 1, timeControl = true, jsFlags = '' } = {}) {
  const pw = loadPlaywright();
  const b = await pw[browser].launch(launchOptions(browser, jsFlags));
  const page = await b.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  page.on('console', m => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    console.error('[console]', m.text());
    // a worker that dies falls back to the main thread silently, so the pictures still come out
    // right: fail the run instead, or a broken worker build goes unnoticed
    if (m.text().includes('render worker failed')) { console.error('FAIL: a render worker crashed'); process.exitCode = 1; }
  });
  if (timeControl) await page.addInitScript(TIME_CONTROL);
  return { browser: b, page };
}

// Resolve a scene's camera (degrees -> radians, ground-relative eye height) inside a v1-like page.
export async function resolveCam(page, scene) {
  const c = scene.cam;
  const cam = { x: c.x, y: c.y, z: c.z, yaw: c.yaw * Math.PI / 180, pitch: c.pitch };
  if (c.ground) cam.y = await page.evaluate(k => window.TV.groundAt(k.x, k.z, 1e9) + 1.55 + k.y, cam);
  return cam;
}
