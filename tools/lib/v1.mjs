// Drive the pristine v1 page (reference/v1-index.html) frame by frame.
// v1 sizes its cells from the system monospace font; on the Mac it was built on that is 4x7 px
// (360x129 cells at 1440x900). Headless Linux has DejaVu, which measures 4x9, so we pin the
// metrics of the one glyph v1 measures to reproduce the Mac grid exactly.
export const MAC_METRICS = `(() => {
  const orig = CanvasRenderingContext2D.prototype.measureText;
  CanvasRenderingContext2D.prototype.measureText = function (text) {
    if (text !== '█') return orig.call(this, text);
    const px = parseFloat(this.font);
    return { width: px * 0.6, actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2 };
  };
})();`;

export const HIDE_OVERLAYS = '#hud,#help,#hint,#prompt,#panel{display:none!important}';

// Put the world into a scene's state and draw exactly one frame at page time tMs.
// scene: { seed, hour, cam: {x,y,z,yaw,pitch}, merchants: [{i, s}] , t, view }
export async function showScene(page, scene) {
  await page.evaluate(sc => {
    const TV = window.TV;
    if (TV.world.seed !== sc.seed) TV.regenerate(sc.seed);
    TV.view.dist = sc.view || 500;
    if (TV.setWeather) TV.setWeather(sc.weather || {});   // (v2: the scene's weather, or clear, so shots compare)
    if (TV.setThird) TV.setThird(!!sc.third);                // (v2: the scene's camera is the eyes, unless it asks for the hero in the third person)
    TV.clock.scale = 0;
    TV.setMode('fly');
    Object.assign(TV.cam, sc.cam);
    TV.setHour(sc.hour);
  }, scene);
  const T = (scene.t ?? 1000) * 1;
  const idle = () => page.evaluate(() => window.TV.whenIdle && window.TV.whenIdle());   // v2 draws in workers
  await page.evaluate(T => { window.__setNow(T); window.__step(0); }, T);   // settles dt from the last frame
  await idle();
  await page.evaluate(sc => {
    const TV = window.TV;
    Object.assign(TV.cam, sc.cam);
    if (sc.third) { TV.setMode('walk'); TV.setThird(true); }   // (v2: the hero stands where the eyes are, and the camera goes behind them)
    TV.setHour(sc.hour);   // again, now that the frame above blended the palette for this hour (lights, darkness)
    for (const m of sc.merchants || []) { const M = TV.world.merchants[m.i]; M.s = m.s; M.dir = m.dir ?? 1; if (m.walked != null) M.walked = m.walked; }
    TV.updateMerchants(0);
  }, scene);
  await page.evaluate(() => window.__step(0));                                 // dt = 0: nothing moves, one frame drawn
  await idle();
}
