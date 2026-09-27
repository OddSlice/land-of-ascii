# Land of Ascii: notes for Claude

A first-person explorer drawn as a mosaic of text glyphs. The whole game is `index.html`: one file, no build, no dependencies. Serve the folder (or open the file) and add `?seed=42` for the world in `shots/`. It began as v2 of Text Voxel (https://github.com/OddSlice/text-voxel), which is the ancestor: v2 took over its simulation and rebuilt the renderer. The docs and tools still call this build "v2" and the ancestor "v1"; v1 matters only as the reference the regression tests compare against.

Read `docs/phase1.md` first. It explains how a frame is drawn, the workers, the tests, measured speed and the open issues.

**Phase 2 is in progress: read `docs/phase2-world.md` before working on it.** It is the brief: varied land (regions, terrain, weather, bridges), villages and towns, people and animals, how the tests change once world generation changes, and the order of work (a design pass, then land, settlements, people and animals, finish), with a commit and screenshots after each step.

## How index.html is laid out

In file order:

1. HTML/CSS/HUD markup.
2. **World and movement constants.** Then the v2 constants: `CELL_PRESETS`, `RAYS_X/Y`, the ray kinds `K`, merchant parts `PART`, ray flags `F_*`.
3. **Palettes:** `KEYFRAMES` (day, dusk, night ramps), `blendPalette`, the live tables `COL` and `cur`.
4. **Simulation, ported from v1:** helpers, noise, world generation, structures, roads, trees, birds, lights, clouds, merchants, sky and lighting.
5. **`renderCore()`**, the whole renderer:
   - colour model;
   - glyph atlas;
   - the march;
   - 3D solids (`rasterPrim`, the tree builder `buildPlant`, the merchant rig `buildMerchant`);
   - ground marks;
   - reflections;
   - cell stage (`shadeCells`);
   - overlays;
   - `compose`;
   - the worker message interface.
6. **Canvas and grid**, then input, movement and trade/HUD/lifecycle (ported).
7. **Presentation:** the worker pool (`workerSource`, `startWorkers`, `syncWorkers`), merchant poses (`merchantPose`, main thread), `frameDesc`, the main loop, boot, and `window.TV`.

## Rules

- **Simulation changes are deliberate.** For any change to ported simulation code, add the exact edit to `tools/lib/v2-fixes.mjs`, so `check-verbatim.mjs` and `test-sim.mjs` keep proving nothing else moved. If a change is too big for a from/to edit, retire the relevant comparison and say so in the docs.
- **`renderCore()` must stand alone.** Each worker is built from its source (`workerSource()`). Inside it, use only its own code, the constants and helpers `workerSource()` passes in, and the objects `world`, `cam`, `clock`, `view`, `cur`, `light` and `COL`. A new constant or helper used inside the core must be added to `workerSource()`. Main-thread-only things (`ui`, `player`, the DOM) stay outside.
- **Workers and the main thread must agree.** Rendering with `?threads=0` must give the same pixels as the default workers. Check it after renderer changes (diff two `tools/shoot.mjs` runs, one with `--threads 0`).
- **Drawing rules:**
  - Glyphs are bitmasks built in code, never a font.
  - Every colour comes from the palette ramps.
  - Nothing is drawn pure black.
  - Every channel is clamped (`pack`).
- **Speed matters.** Target 60 fps at 1440×900 in Chromium, Firefox and WebKit. Measure with `tools/bench-v2.mjs` before and after renderer changes.

## Commands

You need Node 18+ and Playwright (`npm i -g playwright`, plus `npx playwright install` for Firefox and WebKit).

```sh
node tools/test-sim.mjs          # simulation regression: worlds, a scripted session, gate/door walks
node tools/check-verbatim.mjs    # ported simulation code unchanged except for v2-fixes.mjs
node tools/shoot.mjs [scene...]  # screenshots of tools/scenes.json scenes -> shots/  (--threads 0, --dpr 2, --cells 0..3)
node tools/shoot.mjs --cam x,y,z,yawDeg,pitch --hour 21 [--ground] --out shots/x.png
node tools/bench-v2.mjs          # frame timings (--threads 0; --browser firefox|webkit, not yet run)
node tools/profile-v2.mjs road   # CPU profile of a scene
node tools/probe.mjs road 'expr' # evaluate an expression in the page after showing a scene
```

Test harness notes:

- Tests freeze page time (`__setNow` / `__step` in `tools/lib/harness.mjs`) and wait for the workers with `TV.whenIdle()`.
- Pointer lock makes headless Chromium crawl (v1 drops to 4 fps), so tests never lock the pointer.

## Where things stand

- **Phase 1 is done:**
  - direction C with 3D merchants and trees;
  - render workers;
  - one simulation fix (NaN heights);
  - docs and screenshots.
- **Phase 2 is under way**, following `docs/phase2-world.md`.
- **Not yet measured:** Firefox and WebKit speed. The cloud session that built this had only Chromium.
- **Rough edges:**
  - distant ridges shimmer slightly in motion (heights aren't filtered at distance);
  - canopies look faceted up close;
  - merchant faces and outfits are simple.
