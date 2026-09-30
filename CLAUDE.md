# Land of Ascii: notes for Claude

An explorer drawn as a mosaic of text glyphs, walked as a hero seen from behind (the third person, since phase 3) or through their eyes. The whole game is `index.html`: one file, no build, no dependencies. Serve the folder (or open the file) and add `?seed=42` for the world in `shots/`. It began as v2 of Text Voxel (https://github.com/OddSlice/text-voxel), which is the ancestor: v2 took over its simulation and rebuilt the renderer. The docs and tools still call this build "v2" and the ancestor "v1"; v1 matters only as the reference the regression tests compare against.

Read `docs/phase1.md` first. It explains how a frame is drawn, the workers, the tests, measured speed and the open issues.

**Phase 4 is in progress: read `docs/phase4.md`** (castles with a purpose after Orthodox churches, castles spread out with towns, roads, ground, climbable mountains). The game is public and playable at https://oddslice.github.io/land-of-ascii/ (GitHub Pages from `main`): every push to `main` is live, so keep `main` playable.

**Phase 3 is done: `docs/phase3.md`.** It is Martin's direction after phase 2's second step (third person, a bigger and more open world after Ocarina of Time, no flicker, gear that shows on your hero, then settlements), the plan in five steps, and each step as it is built.

**Phase 2's brief is `docs/phase2-world.md`**, and its steps are recorded in `docs/phase2.md` (steps 1 and 2 built; its settlements become phase 3's step 5). It is the brief: varied land (regions, terrain, weather, bridges), villages and towns, people and animals, how the tests change once world generation changes, and the order of work (a design pass, then land, settlements, people and animals, finish), with a commit and screenshots after each step. `docs/phase2.md` records each step as it is built: what, the numbers, the tests, the speed.

## How index.html is laid out

In file order:

1. HTML/CSS/HUD markup.
2. **World and movement constants**, the materials `MAT` and the regions `BIOME`. Then the v2 constants: `CELL_PRESETS`, `RAYS_X/Y`, the ray kinds `K`, merchant parts `PART`, ray flags `F_*`.
3. **Palettes:** `KEYFRAMES` (day, dusk, night ramps), `blendPalette`, the live tables `COL` and `cur`.
4. **Simulation:** helpers, noise, world generation (`generateWorld`), then **regions** (phase 2: climate, region weights, shaping per region, the coast, the region per cell, marsh pools, and `paintGround`, which turns regions, slope and height into materials), then rivers, structures (phase 4: v2's own; castles round a church `buildFortress`, churches `buildChurch`, keeps and towers `buildKeep`, ruined churches `buildRuin`), **settlements** (phase 3: `placeSettlements`, `buildSettlement`, `buildHouse`), **castles and towns** (phase 4: `placeCastles` spreads a castle over each part of the land and turns it to face the walled town `buildTown` builds at its foot, `turnTemplate`), **watchtowers, ruins and stones** (phase 4: `placeTowers` on the roads' passes, `placeWild` out in the wild; both after the roads), their parts into the world (`structureExtras`, `structureLights`, `castleFlags`), roads, trees (by region), birds, lights (`placeLights`, v2's own since phase 4), clouds, merchants, sky and lighting. World generation, settlements, structures and tree placement are v2's own (since phases 2 to 4); the rest is still v1's.
5. **`renderCore()`**, the whole renderer:
   - colour model;
   - glyph atlas;
   - the march: it samples the ground where each ray crosses the lines of the height grid (`ddNext`, spacings `DD_*` matched to the height averaging `mipLevel`), so its samples are fixed to the ground; walls are drawn by `wallAt`, rock is banded by steepness (`STRATA_*`);
   - 3D solids (`rasterPrim`, the tree builder `buildPlant`, the merchant rig `buildMerchant`, your hero `buildHero`); in the third person, plants near the camera or in front of the hero are drawn see-through (`LENS_*`, `heroBox`);
   - ground marks;
   - reflections;
   - cell stage (`shadeCells`);
   - overlays;
   - `compose`;
   - the painted look (`paintCells`, `composePainted`): two square pixels per cell in continuous colour, one letter each, water mirrors;
   - the worker message interface.
6. **Canvas and grid**, then input, movement and trade/HUD/lifecycle (ported).
7. **Presentation:**
   - the worker pool (`workerSource`, `startWorkers`, `syncWorkers`);
   - merchant poses (`merchantPose`, main thread) and `frameDesc`;
   - the third person: `updateHero` places `viewCam`, the camera behind your hero, and fills `hero`, their pose for the renderer (`V3_*` set the camera: distance, angles, tilt limit); `updateGear` turns the goods you own into `hero.gear` (`GEAR` bits, `GEAR_OF`, the tunic bought last);
   - the weather: `weatherAt` is each day's plan, `updateWeather` works out `wx`, what the renderer draws this frame;
   - the legend (`updateLegend`: the keys, each switch's current choice, a note when a setting changes; it replaces v1's `#help`, which is hidden);
   - the main loop, boot, and `window.TV`.

## Rules

- **Simulation changes are deliberate.**
  - World generation and tree placement are v2's own (phase 2). After a deliberate change to them, re-record the world checksums (`node tools/test-sim.mjs --record`), say what changed in `docs/phase2.md`, and re-aim the scenes (`tools/find-views.mjs`).
  - The rest of the simulation (movement, input, trade, rivers, roads, merchants, lighting) is still v1's code. (Structures, settlements, castles and towns, and the gate torches are v2's own since phase 4.) For any change to it, add the exact edit to `tools/lib/v2-fixes.mjs`, so `check-verbatim.mjs` and `test-sim.mjs` keep proving nothing else moved. If a change is too big for a from/to edit, retire the relevant comparison and say so in the docs.
- **`renderCore()` must stand alone.** Each worker is built from its source (`workerSource()`). Inside it, use only its own code, the constants and helpers `workerSource()` passes in, and the objects `world`, `cam`, `clock`, `view`, `cur`, `light` and `COL`. A new constant or helper used inside the core must be added to `workerSource()`. Main-thread-only things (`ui`, `player`, the DOM) stay outside.
- **The third person is presentation only.** `cam` is your eyes, and v1's movement moves it. Every frame `updateHero` places `viewCam` behind the hero, and the renderer draws from it: the workers get it as their `cam`, and the main-thread render swaps it into `cam` for the frame and back. The simulation, the HUD and trade read `cam`, never `viewCam`. The camera must never end up inside the ground or a building (`test-sim.mjs` section 6).
- **Workers and the main thread must agree.** Rendering with `?threads=0` must give the same pixels as the default workers, in both looks. Check it after renderer changes (diff two `tools/shoot.mjs` runs, one with `--threads 0`, with `--look painted` and `--look mosaic`). Anything that reads neighbouring columns must work within the columns a stripe computes (`grid.xr0`..`grid.xr1`, one cell wider than it draws). A choice about a whole solid (such as whether a plant is see-through) must be made from its box over the whole picture (`primBox[4]`, `primBox[5]`), not from the stripe's share of it.
- **Two looks.** Painted (the default since the step 1 review) and mosaic (step 1's; L switches, `?look=mosaic`). A renderer change must keep both working. The mosaic look draws rain, snow and fireflies as marks, and has no fog or aurora.
- **Weather is the same for a given seed, day and hour.** `wx` reaches the workers with every frame, and the storm greying is applied to the palette before it is sent.
- **Drawing rules:**
  - Glyphs are bitmasks built in code, never a font.
  - Every colour comes from the palette ramps: stepped in the mosaic look, blended between steps in the painted look.
  - Nothing is drawn pure black.
  - Every channel is clamped (`pack`).
- **Speed matters.** Target 60 fps at 1440×900 in Chromium, Firefox and WebKit. Measure with `tools/bench-v2.mjs` before and after renderer changes.

## Commands

You need Node 18+ and Playwright (`npm i -g playwright`, plus `npx playwright install` for Firefox and WebKit). On Martin's Mac the harness uses the Playwright inside the global `@playwright/cli`, whose Chromium, Firefox and WebKit are installed.

```sh
node tools/test-sim.mjs          # worlds (deterministic, as recorded, sane, every region), v1's movement on v2's world, gate/door walks, bridge walks, weather, the third-person camera (--record)
node tools/check-verbatim.mjs    # the v1 code v2 still runs is unchanged except for v2-fixes.mjs
node tools/shoot.mjs [scene...]  # screenshots of tools/scenes.json scenes -> shots/  (--dir shots/phase2, --threads 0, --dpr 2, --cells 0..3)
node tools/shoot.mjs --cam x,y,z,yawDeg,pitch --hour 21 [--ground] [--third] [--seed 7] --out shots/x.png   # --third: your hero stands there
node tools/shoot.mjs --third road         # scenes drawn in the third person -> <name>-3rd.png
node tools/shoot.mjs --walk KeyW+Space --frames 14 hero   # hold keys for some frames first, for poses -> hero-w+space-14.png
node tools/bench-v2.mjs          # frame timings (--threads 0, --browser firefox|webkit, --look painted|mosaic, --third)
node tools/profile-v2.mjs road   # CPU profile of a scene
node tools/probe.mjs road 'expr' # evaluate an expression in the page after showing a scene
node tools/find-views.mjs --write              # re-aim the region views and the aerial (--seed N, --aerial-only, --classic for phase 1's six); scenes marked fixed: true are left alone
node tools/map.mjs [seed...]     # region maps -> shots/phase2/map-<seed>.png
node tools/palette.mjs           # the ground's ramps, day/dusk/night -> shots/phase2/palette.png
node tools/sheet.mjs --out x.png --cols 2 --scale 0.5 a.png "Label" b.png "Label"   # contact sheets
node tools/flicker.mjs road 60 0.117 0 painted   # blinking pixels per frame while the camera walks (time frozen; 4th arg turns; PAGE=other.html to compare a copy)
```

Test harness notes:

- Tests freeze page time (`__setNow` / `__step` in `tools/lib/harness.mjs`) and wait for the workers with `TV.whenIdle()`.
- A render worker that crashes falls back to the main thread without a visible sign, so the harness fails any run in which one does.
- Scenes in `tools/scenes.json` may carry their own `seed`, `view` (view distance) and `weather` (pinned; without it a scene is clear). `TV.defs` exposes the palettes, materials and regions to the tools.
- Scenes are drawn through your own eyes, flying, unless they say `third: true`: then the scene helper (`showScene`) switches to walking once the camera is placed, and the hero stands where the eyes were.
- The harness also fails any run with an error in the page.
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
  - **Step 2 (land) is built** (see "Step 2, part 1" and "part 2" in `docs/phase2.md`):
    - plants by region (palms, cacti, reeds, birches, snow pines, meadow flowers);
    - cleaner ground (walls, material edges, shores, reflections);
    - bridges (`buildBridges`);
    - weather from the seed and the day (rain, snow, dawn valley fog), with fireflies and auroras at night.
  - Its step 3 (settlements) moved to phase 3.
- **Phase 3 is done**, following `docs/phase3.md`.
  - **Step 1 (a steady picture) is built:** the march samples points fixed to the ground; drawing choices depend on the land, not on screen rows; letters come from where each ray lands and fade out far off; water mirrors blend; thin plant parts are at least 2.4 rays across. Flicker is 3–10 times lower walking, about half turning, at the same speed.
  - **Step 2 (a bigger, more open world) is built:** 1024 cells across, landforms twice as wide and 1.7 times as tall (`LAND`, `LIFT`, `fbmLand`), landmarks spread out, open green fields, walking at 5.5, bolder colours after Ocarina of Time, lighting worked out over 12 frames (`lightBegin`/`lightSlice`), v1's road finder fixed for the bigger grid, a spawn you can walk from (`spawnAt`).
  - **Step 3 (third person) is built:** your hero seen from behind and above (`buildHero`), turning to where they walk, with walk and jump poses and wading in water; a camera that rises over ground behind, comes closer before walls and steep slopes, and slides into the eyes when squeezed (`updateHero`, `viewCam`); plants in front of the hero or at the lens see-through; V for your own eyes.
  - **Step 4 (gear on your hero) is built:** what you buy shows (cap, cloak, sword, shield, boots, lantern, rope, kettle, flask, map, tunics in four colours); the lantern lights the ground after dark; eight merchants selling 7 to 9 of 18 goods; 300 gold to start (listed fixes).
  - **Step 5, part 1 (settlements) is built:** four villages and six hamlets a world, terraced on the hillsides; cottages, longhouses, a tavern, a smithy, a chapel and barns you can walk into; new materials (plaster, tiles, thatch, glass); glowing windows, lamps and torches at night; chimney smoke; flags on castles. Every house door is walked into by the tests.
  - Step 5, part 2 (towns) folded into phase 4.
- **Phase 4 is under way**, following `docs/phase4.md`.
  - **Step 1 (castles with a purpose) is built:** castles round an Orthodox church (iconostasis, frescoes, candles, domes), a keep with its bell, a great hall; village chapels as small churches; ruins as ruined churches.
  - **Step 2 (castles spread out, each with a town) is built:** five to seven castles a world, 300 apart on commanding sites, each facing a walled town at its foot (a street climbing to the castle, a market square with a well, two-storey townhouses, a wall with towers and a gatehouse); you start before the biggest castle's town gate; watchtowers on the roads' passes; ruins and standing stones in the wild, off the roads.
  - Next: step 3 (roads that make sense), then ground that reads, then mountains you can climb.
- **Speed on Martin's Mac** (M1 Max, painted look): on the 512 world, Chromium 5.7–7.5 ms a frame, Firefox 7.3–9.9 ms, WebKit 6.5–14.1 ms. The 1024 world has not been measured on an idle machine yet: with Chrome busy in the background it ran Chromium 8.4–12.5 ms, Firefox 12.3–17.1 ms. A world generates in about 2.3 s (0.5 s on the 512 world).
- **Rough edges:**
  - turning still crawls a little (detail sliding across the pixels);
  - roads at a shallow angle still step at close range;
  - cliff faces right in front of you are blocky, with a break at the horizon line;
  - palm fronds are tubes up close, and canopies look faceted;
  - merchant faces and outfits are simple;
  - third person: the camera goes into your eyes on slopes steeper than about 50°, with your back to a wall and in doors and gates (it snaps in; it never shows the hero from closer than 2 cells); looking down steeply stretches upright things a little (the tilt is a shear); a flower at the lens is a big flat blob; the hero's green tunic is close to the fields' green;
  - gear: nothing to sell and no way to earn gold (v1's trade); what you own is always worn; the things at the belt are small;
  - settlements: on steep land a village gets few houses and steep grass between its plots; houses have one room;
  - towns: every town has the same plan, its streets wide for the camera (so a small castle's town holds only 7 or 8 houses); on a steep slope house footings show along the street; watchtowers stand where v1's roads happen to climb.
