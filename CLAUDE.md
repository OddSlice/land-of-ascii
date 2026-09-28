# Land of Ascii: notes for Claude

A first-person explorer drawn as a mosaic of text glyphs. The whole game is `index.html`: one file, no build, no dependencies. Serve the folder (or open the file) and add `?seed=42` for the world in `shots/`. It began as v2 of Text Voxel (https://github.com/OddSlice/text-voxel), which is the ancestor: v2 took over its simulation and rebuilt the renderer. The docs and tools still call this build "v2" and the ancestor "v1"; v1 matters only as the reference the regression tests compare against.

Read `docs/phase1.md` first. It explains how a frame is drawn, the workers, the tests, measured speed and the open issues.

**Phase 2 is in progress: read `docs/phase2-world.md` before working on it.** It is the brief: varied land (regions, terrain, weather, bridges), villages and towns, people and animals, how the tests change once world generation changes, and the order of work (a design pass, then land, settlements, people and animals, finish), with a commit and screenshots after each step. `docs/phase2.md` records each step as it is built: what, the numbers, the tests, the speed.

## How index.html is laid out

In file order:

1. HTML/CSS/HUD markup.
2. **World and movement constants**, the materials `MAT` and the regions `BIOME`. Then the v2 constants: `CELL_PRESETS`, `RAYS_X/Y`, the ray kinds `K`, merchant parts `PART`, ray flags `F_*`.
3. **Palettes:** `KEYFRAMES` (day, dusk, night ramps), `blendPalette`, the live tables `COL` and `cur`.
4. **Simulation:** helpers, noise, world generation (`generateWorld`), then **regions** (phase 2: climate, region weights, shaping per region, the coast, the region per cell, marsh pools, and `paintGround`, which turns regions, slope and height into materials), then rivers, structures, roads, trees (by region), birds, lights, clouds, merchants, sky and lighting. World generation and tree placement are v2's own since phase 2; the rest is still v1's.
5. **`renderCore()`**, the whole renderer:
   - colour model;
   - glyph atlas;
   - the march (it bands rock faces into strata, `STRATA_*`);
   - 3D solids (`rasterPrim`, the tree builder `buildPlant`, the merchant rig `buildMerchant`);
   - ground marks;
   - reflections;
   - cell stage (`shadeCells`);
   - overlays;
   - `compose`;
   - the painted look (`paintCells`, `composePainted`): two square pixels per cell in continuous colour, one letter each, water mirrors;
   - the worker message interface.
6. **Canvas and grid**, then input, movement and trade/HUD/lifecycle (ported).
7. **Presentation:** the worker pool (`workerSource`, `startWorkers`, `syncWorkers`), merchant poses (`merchantPose`, main thread), `frameDesc`, the main loop, boot, and `window.TV`.

## Rules

- **Simulation changes are deliberate.**
  - World generation and tree placement are v2's own (phase 2). After a deliberate change to them, re-record the world checksums (`node tools/test-sim.mjs --record`), say what changed in `docs/phase2.md`, and re-aim the scenes (`tools/find-views.mjs`).
  - The rest of the simulation (movement, input, trade, rivers, structures, roads, merchants, lighting) is still v1's code. For any change to it, add the exact edit to `tools/lib/v2-fixes.mjs`, so `check-verbatim.mjs` and `test-sim.mjs` keep proving nothing else moved. If a change is too big for a from/to edit, retire the relevant comparison and say so in the docs.
- **`renderCore()` must stand alone.** Each worker is built from its source (`workerSource()`). Inside it, use only its own code, the constants and helpers `workerSource()` passes in, and the objects `world`, `cam`, `clock`, `view`, `cur`, `light` and `COL`. A new constant or helper used inside the core must be added to `workerSource()`. Main-thread-only things (`ui`, `player`, the DOM) stay outside.
- **Workers and the main thread must agree.** Rendering with `?threads=0` must give the same pixels as the default workers, in both looks. Check it after renderer changes (diff two `tools/shoot.mjs` runs, one with `--threads 0`, with `--look painted` and `--look mosaic`). Anything that reads neighbouring columns must work within the columns a stripe computes (`grid.xr0`..`grid.xr1`, one cell wider than it draws).
- **Two looks.** Painted (the default since the step 1 review) and mosaic (step 1's; L switches, `?look=mosaic`). A renderer change must keep both working.
- **Drawing rules:**
  - Glyphs are bitmasks built in code, never a font.
  - Every colour comes from the palette ramps: stepped in the mosaic look, blended between steps in the painted look.
  - Nothing is drawn pure black.
  - Every channel is clamped (`pack`).
- **Speed matters.** Target 60 fps at 1440×900 in Chromium, Firefox and WebKit. Measure with `tools/bench-v2.mjs` before and after renderer changes.

## Commands

You need Node 18+ and Playwright (`npm i -g playwright`, plus `npx playwright install` for Firefox and WebKit). On Martin's Mac the harness uses the Playwright inside the global `@playwright/cli`, whose Chromium, Firefox and WebKit are installed.

```sh
node tools/test-sim.mjs          # worlds (deterministic, as recorded, sane, every region), v1's movement on v2's world, gate/door walks, bridge walks (--record)
node tools/check-verbatim.mjs    # the v1 code v2 still runs is unchanged except for v2-fixes.mjs
node tools/shoot.mjs [scene...]  # screenshots of tools/scenes.json scenes -> shots/  (--dir shots/phase2, --threads 0, --dpr 2, --cells 0..3)
node tools/shoot.mjs --cam x,y,z,yawDeg,pitch --hour 21 [--ground] [--seed 7] --out shots/x.png
node tools/bench-v2.mjs          # frame timings (--threads 0, --browser firefox|webkit, --look painted|mosaic)
node tools/profile-v2.mjs road   # CPU profile of a scene
node tools/probe.mjs road 'expr' # evaluate an expression in the page after showing a scene
node tools/find-views.mjs --write              # re-aim the region views and the aerial (--seed N, --aerial-only, --classic for phase 1's six); scenes marked fixed: true are left alone
node tools/map.mjs [seed...]     # region maps -> shots/phase2/map-<seed>.png
node tools/palette.mjs           # the ground's ramps, day/dusk/night -> shots/phase2/palette.png
node tools/sheet.mjs --out x.png --cols 2 --scale 0.5 a.png "Label" b.png "Label"   # contact sheets
node tools/flicker.mjs road 60 0.117 0 painted   # blinking pixels per frame while the camera walks (time frozen)
```

Test harness notes:

- Tests freeze page time (`__setNow` / `__step` in `tools/lib/harness.mjs`) and wait for the workers with `TV.whenIdle()`.
- A render worker that crashes falls back to the main thread without a visible sign, so the harness fails any run in which one does.
- Scenes in `tools/scenes.json` may carry their own `seed` and `view` (view distance). `TV.defs` exposes the palettes, materials and regions to the tools.
- Pointer lock makes headless Chromium crawl (v1 drops to 4 fps), so tests never lock the pointer.

## Where things stand

- **Phase 1 is done:**
  - direction C with 3D merchants and trees;
  - render workers;
  - one simulation fix (NaN heights);
  - docs and screenshots.
- **Phase 2 is under way**, following `docs/phase2-world.md`.
  - **Step 1 (design pass) is built**: regions, terrain shaping, five new ground materials, rock strata, trees by region, castles in clearings. See `docs/phase2.md`. Martin confirmed the regions and the palette on 28 Sep.
  - Martin's review of step 1 (Glyphmoor as the reference) led to the painted look, shadows and hollows, steadier ground and water mirrors; see "After step 1" in `docs/phase2.md`. He confirmed it: the painted look stays the default, and the living-world items are left to be iterated on.
  - Step 2 (land), part 1 is built: plants by region (palms, cacti, reeds, birches, snow pines, meadow flowers), cleaner ground (walls, material edges, shores, reflections) and bridges (`buildBridges`). See "Step 2, part 1" in `docs/phase2.md`. Next: weather (rain, snow, dawn fog) and night life (fireflies, auroras).
- **Speed on Martin's Mac** (M1 Max, painted look, ten scenes): Chromium 5.7–7.5 ms a frame, Firefox 7.3–9.9 ms, WebKit 6.5–14.1 ms (its colour stage varies a lot between runs), all at 60 fps. A world generates in about 0.5 s.
- **Rough edges:**
  - roads at a shallow angle still step at close range;
  - cliff faces right in front of you are blocky, with a break at the horizon line;
  - palm fronds are tubes up close, and canopies look faceted;
  - tower corners and hill crests still shimmer a little in motion;
  - merchant faces and outfits are simple.
