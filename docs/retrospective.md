# Land of Ascii: a retrospective for the rebuild

Written on 9 Oct 2026, when Martin decided to rebuild the original world (the Land) from the ground up. This document explains:
- what was built and how;
- what was asked for at each step, and what came of it;
- every problem we hit: glitches, flicker, low frame rates, camera trouble;
- what a developer should take from it, and what to study in other games, to do better next time.

It is meant to stand on its own. The detailed step-by-step records are in `docs/phase1.md` to `docs/phase5.md`; this is the map to them.

⚠️ marks a problem: either something that went wrong and was fixed, or something still open.

---

## 1. The short version

| | |
|---|---|
| What | A first/third-person explorer whose picture is a mosaic of text characters: terrain, castles, towns, villages, farms, animals, people, merchants, day and night, weather. |
| Where | `~/claudecode/land-of-ascii`, public repo `OddSlice/land-of-ascii`, live at https://oddslice.github.io/land-of-ascii/ (GitHub Pages from `main`) |
| Size | One file, `index.html`: 8,888 lines, 571 KB, no build, no dependencies. Plus about 2,500 lines of Node tools, 101 MB of screenshots. |
| Time | 38 commits over 8 days (27 Sep to 4 Oct 2026), on top of v1 (Text Voxel) |
| Engine | A software renderer in JavaScript, running on the CPU in up to 6 Web Workers. No WebGL, no game engine. |
| World | A 1024 × 1024 seeded, wrapping heightmap, plus voxel "templates" for buildings, plus analytic 3D solids (spheres, capsules, cones) for plants, people, animals, props. |
| Speed | Mostly 60 fps at 1440×900 in Chromium on an M1 Max. Firefox often 45–55 fps. A new world takes 2.6–2.8 s to generate. |

**Why the rebuild:** each phase added real features, but the result felt bolted together:
- the look was decided late and changed twice;
- the simulation was locked to v1's old code by a "verbatim" rule;
- every feature had to be paid for in CPU time in a hand-written renderer;
- known rough edges kept piling up in the "still open" lists (section 9).

---

## 2. Where it came from

### v1: Text Voxel

- **Repo:** `OddSlice/text-voxel`, still live at https://oddslice.github.io/text-voxel/. It is pinned in this repo as `reference/v1-index.html` (commit `989360b`).
- **Size:** about 2,300 lines, 115 KB, one file.
- **Its world:**
  - a seeded 512×512 wrapping heightmap (value noise, ridged mountains, the sea at the 25th percentile of heights);
  - two rivers, carved by walking downhill;
  - castles, towers, ruins and stone circles as voxel templates;
  - A* roads between them;
  - about 5,600 trees, bushes and boulders;
  - birds and clouds;
  - 4 merchants walking the roads, with an HTML trade panel and gold;
  - torches and campfires;
  - first-person walking with gravity and collision, and a fly toggle (F).
- **Its renderer:** marched the heightmap per screen column into 4×7 px cells, one glyph and one colour per cell. That came to 3,500–4,200 colours on screen.
- ⚠️ **Martin's verdict on v1:** "a child's Paint drawing". It read as blurred mush, because each cell was one flat colour, the glyphs carried no shape, and nothing was art-directed.

### The v2 brief (`docs/brief.md`)

- Rebuild **only the renderer**, keep the simulation, and beat the look of **Swaggerfall**, a terminal RPG written in Rust with Ratatui.
- Research first, then mockups, then build.
- The traps were listed up front:
  - font block glyphs rasterise solid at small sizes;
  - colour channels must be clamped (an unclamped multiply once turned the sky yellow);
  - WebKit snaps text to whole pixels, so draw your own pixels rather than call `fillText`;
  - pointer lock is refused in the Claude app's browser pane;
  - anything that moves must be frozen in time between test screenshots.

### Phase 0: the direction (`docs/direction.md`, `docs/research.md`)

Three candidates were rendered from **real frames of v1's world**, not concept art: the same seed and the same three cameras, with v1's data dumped and re-rendered offline.

| | Idea | Verdict |
|---|---|---|
| A, Chroma blocks | half blocks `▀`, two colours a cell, dithered palette | crisp, but reads as pixel art |
| B, Ink & paper | letters on a page, density by brightness | the most "ASCII", but objects hard to read, shimmers |
| **C, Semantic mosaic** (chosen) | each cell is one glyph in two colours; edge cells pick from about 290 hand-drawn shapes by how the rays split; interior cells carry each material's own marks | crisp silhouettes, about 70 designed colours on screen |

✅ **Lesson that held up:** comparing candidates rendered from the real engine and the real world is far better than comparing concept art. Do it again.

---

## 3. How it is built

### 3.1 The file

Everything is in `index.html`, in this order (line numbers as of `491022a`):

| Lines | Section |
|---|---|
| 1–190 | HTML, CSS, HUD, start card |
| 193–256 | constants: world size, materials `MAT`, regions `BIOME`, render constants, ray kinds `K`, figure parts `PART` |
| 257–507 | **palettes**: `KEYFRAMES` (day, dusk, night colour ramps), `blendPalette` |
| 508–753 | helpers, noise, the `world` object, `generateWorld` |
| 754–1156 | regions (climate, terrain shaped per region), rivers |
| 1157–2163 | structures, settlements, castles and towns, towers, ruins |
| 2164–2500 | roads (v1's A*), bridges |
| 2501–3217 | farms, props, animals, people |
| 3218–3449 | Port Ascii (the second world, see section 10) |
| 3450–3664 | trees, birds, merchants |
| 3665–3809 | sky, time of day, lighting jobs |
| 3810–7163 | **`renderCore()`, the whole renderer** (about 3,350 lines) |
| 7164–7638 | canvas, input, movement (v1), trade panel (v1), HUD, world lifecycle |
| 7639–7814 | workers, the third-person camera |
| 7815–8649 | the bag / RPG inventory |
| 8650–8888 | legend, weather, main loop, `window.TV` (the debug handle the tools use) |

⚠️ **One 8,900-line file was a mistake for this size.** It worked for v1 at 2,300 lines. At 8,900:
- every change meant searching one huge file;
- the workers are built by turning `renderCore`'s source into a string (`workerSource()`), so the renderer must "stand alone": any constant it uses has to be passed in by hand, and forgetting one crashed the workers silently (see 9.6).

**Next time:** use ES modules, with the renderer in its own module that a worker imports. You can still ship one file by bundling at the end.

### 3.2 The world data

`world` holds flat typed arrays of `N = 1024 × 1024` cells:
- `H` heights, `mat` material, `water`, `biome`, `heat`, `damp`, `road`, `treeMask`, `farm`, `tex`;
- normals `nx`, `ny`, `nz`, light `shade`, occlusion `occ` and `ao`, `fogTop`, `wdepth`, `flow`.

Lists hold the rest:
- `structs`: buildings, each a voxel template;
- `trees`, `props`, `animals`, `people`, `merchants`, `lights`, `clouds`, `birds`.

The world wraps (a torus): every coordinate goes through `& MASK`.

**Scale:** 1 unit = 1 cell. The hero's eye is at 1.55, their head at 1.8. A doorway is 5 tall, a stair step 1. Walking manages a rise of up to 1.5 per cell (`MAX_SLOPE`).

⚠️ **Scale was a constant complaint:**
- the world felt small ("tall as a mountain, crossing three mountains and five castles in 30 seconds");
- later, towns felt cramped, because their streets had to be 7 cells wide for the camera (9.3).

**Next time:** decide the scale of everything first (hero, door, storey, street, walking speed, view distance) and write it down before building anything.

### 3.3 World generation (`generateWorld`, in order)

1. **Terrain:**
   - `fbmLand` value noise, plus ridged mountains;
   - heights to the power 1.5, times `HEIGHT_SCALE` 140 × `LIFT` 1.7 (peaks up to 238);
   - the sea at the 25th percentile.
2. **Regions:** temperature and moisture fields turned into percentiles of the land, then one of 8 regions per cell:
   - grassland, forest, pine forest, snowy peaks, badlands, marsh, beach, sea cliffs;
   - each region shapes its own ground: grassland smoothed into fields, badland mesas in 7-unit terraces, flat marsh with pools, beaches, sheer cliffs;
   - borders interleave in patches over about 10 cells.
3. **Rivers:** 4, carved by a steepest-descent walk. Everything below the sea floods.
4. **Castles and towns** (`placeCastles`, `buildTown`):
   - every site on an 8-cell grid is judged, and the best taken 360 cells apart (4–5 a world);
   - each castle is built round an Orthodox church, turned to face its walled town;
   - then villages and hamlets (`placeSettlements`), 80 cells of open country between any two settlements.
5. **Roads** (v1's A* over a half-size grid), then watchtowers on passes, ruins and standing stones in the wild, bridges where roads cross water.
6. **Farms and props:**
   - fields, pastures, hay meadows and windmills round settlements;
   - stalls, barrels, woodpiles, carts and signposts.
7. **Trees** by region (about 33,700 plants), **animals** (from hashes alone), **people** (walking maps and paths), birds, clouds, merchants, lights.
8. **The finish:** water fields, materials and normals (`paintGround`), occlusion and hollows, the dawn-fog field.

**Determinism:** everything comes from the seed. `test-sim.mjs` checks a checksum of every world array for 5 seeds against recorded values in `tools/world-hashes.json`. Re-record with `--record` after a deliberate change.

⚠️ **A world takes 2.6–2.8 s to generate,** with nothing on screen while it does (it was 0.13 s in phase 1). Memory is about 130 MB.

### 3.4 Buildings: voxel templates

Every landmark is a small voxel grid, a "template" (`makeTemplate`: `box`, `set`, `finalize`).
- `finalize` turns each column into a list of solid spans `[y0, y1, material]`. The renderer and the collision code read the spans, so overhangs, arches and interiors work.
- A whole village or town is one template. A struct record carries `cx, cz, x0, z0, baseY, half, radius, tpl` and its extras (domes, candles, bells, flags, chimneys).
- The renderer walks a ray cell by cell through each footprint it crosses (a 2D DDA, `marchStructure`).
- Movement asks `groundAt`, `ceilingAt` and `solidAt`, which look the footprint up with a linear scan of all structs.

⚠️ **What it cost:**
- Each landmark had to level the ground under itself. On a hilly 1024 world a village's square rises 40–80 units, so villages were terraced plot by plot (it looks it).
- Castles were "blocks of random stuff inside" until phase 4's redesign.
- Every wall is axis-aligned and every voxel a whole cell: no round towers, and corners where x and z faces alternate shimmer (9.1).
- A ray can cross at most 32 footprints (`MAX_INT`), and the list is cut, not sorted, when full: fine for the Land, a trap for a dense city.

### 3.5 Plants, figures and props: analytic solids

- Trees, bushes, palms, cacti and reeds, the hero, merchants, people, animals and props are all built from **spheres, ellipsoids, capsules, cylinders and cones**, intersected exactly per ray (Inigo Quilez's formulas) and depth-tested against the march.
- A figure is a rig of about 25 solids: hat, face, robe, sleeves, hands, legs, boots, pack.
- Detail drops with distance (`PROP_FAR`, `ANIMAL_FAR`, fewer parts past 35 cells), and nothing is thinner than 2.4 rays (`THIN`), or it falls between rays and blinks.

⚠️ **Costs and limits:**
- capsules (stall awnings, posts) are tested over their whole on-screen box: the four stalls of one market cost about 2 ms on one thread;
- canopies look faceted up close; palm fronds are tubes up close;
- faces are simple.

### 3.6 Living things are timetables, not simulations

A pattern that worked well and should be kept:
- **Animals:** `animalAt(animal, time)` gives where an animal is from the time alone (hashed spots, walk, graze). Only those within 180 cells are updated each frame, and only to push them away from you.
- **People:** `planOf(person, day)` is a whole day's plan, and `personAt(person, day, hour)` is where they are.
  - Paths come from per-settlement walking maps (`buildNav`) and Dijkstra fields (`navField`).
  - ⚠️ The first Dijkstra kept distances in 32-bit floats: cells were skipped or re-queued over and over, and generation took 4–10 s. It keeps them in 64-bit while searching now, 2–4 ms a search.
- **Weather:** `weatherAt(seed, day, hour)`, a pure function. Rain on about a third of days, dawn fog on half the mornings, an aurora on 4 nights in 10.

So far-away things cost nothing, any moment can be reproduced in a test, and time ×10 just works.

⚠️ **What it doesn't do:**
- people and animals walk through you and each other (no collision);
- nobody goes indoors (they vanish at the door at night);
- nothing sleeps;
- there are only a handful of lines of dialogue.

### 3.7 The renderer, frame by frame

A frame is **rays, then cells, then pixels**:
- the screen is a grid of 6×12 px cells by default (− / + step through 5×10 to 8×16);
- behind each cell, **2×4 rays**: 480 × 300 rays at 1440×900.

**Stage 1, rays (the march).** For each ray: what it hit (kind and segment, meaning which object and which face), its colour ramp, its position on the ramp (its light), its depth, and the firelight on it.
- **Terrain.** Per screen column, near to far.
  - The ground is sampled **where the ray crosses the lines of the height grid** (`ddNext`): every half cell near you, then 1, 2, 4 and 8 cells further off.
  - Heights are averaged to match (height mips, `mipLevel`), so samples are fixed to the ground and don't slide as you walk.
  - A 16×16 max-height grid lets the march skip ground that cannot show.
  - Rings 32 cells wide (`ringTop`, `stopDepth`) stop a column once nothing further can rise into its open rows.
- **Walls.** A step steeper than 1.5 over 3 is drawn as a sheer face (`wallAt`), lit from the light averaged around it. Rock faces are banded in strata.
- **Buildings.** Per footprint, a 2D DDA through its columns, drawing spans as faces, tops and undersides. Frescoes, icons and banners are painted per ray from where it lands on the wall (`paintedWall`).
- **Solids** (1b), then **ground marks** (1c): tufts, pebbles and flakes, placed in the world so they flow with the ground.
- **Reflections.** Water mirrors what stands beyond it, by the Fresnel term (section 6, water).

**Stage 2, cells.** Each cell turns its 8 rays into one glyph and two colours.
- **The mosaic look** (the first look):
  - *Edge cells:* where two things meet, the rays split into two groups, and a 256-entry table picks the best of about 290 hand-drawn masks (half and eighth blocks, quadrants, sextants, octants, wedges).
  - *Interior cells:* the material's own marks.
  - *Seams:* ░ and ▒ bands where tone really changes.
- **The painted look** (the default since phase 2):
  - each cell is two square pixels, each the average of 2×2 rays, in continuous colour;
  - each pixel carries a letter for its material, a shade off its colour (`"` grass, `%` rock, `~` water, `@` leaves, `#` stone);
  - after Glyphmoor.

**Stage 3, pixels.** Glyphs are bitmasks built in code (never a font), composed into one `ImageData` and shown with `image-rendering: pixelated`.

**Colour.** Three hand-built keyframe palettes (day, dusk, night), crossfaded by the clock.
- Every material has a ramp, dark to light and hue-shifted: shadows cooler, lights warmer.
- There are "far" ramps pulled toward the haze, and a warm firelight ramp.
- About 34–80 colours on screen, against v1's 4,000. This was the single biggest improvement in the look.
- Rules: nothing pure black, every channel clamped (`pack`).

**Lighting.**
- Sun and moon shadows come from `world.occ` (the top of whatever stands on each cell), walked toward the light on a 2×2-cell grid.
- Hollows darken from a blur of the heights (`ao`).
- Point lights (torches, windows, lanterns) are in 8-cell buckets. ⚠️ They are a **scalar warmth only, always the warm "lit" ramp**: no coloured light.
- Re-lighting a 1024 world took 20–40 ms. ⚠️ Done every 0.2 s, it stuttered the view; it is now done in 12 slices over 12 frames into a second buffer (`lightBegin` and `lightSlice`).

**Workers.**
- Up to 6 Web Workers, one fewer than the cores. Each runs a copy of `renderCore` on a vertical stripe of cells, plus one column either side, and hands its pixels back.
- The world goes to each worker once per seed, the light when the sun moves, and the camera, clock and palette every frame.
- **Rule:** the picture must be **identical to the byte** with any number of workers and with `?threads=0`. This rule found real bugs (9.6).

**True perspective (phase 4).** Looking up or down, each column's rays are turned by the pitch and the view is drawn through "source columns" (`beginSource` and `endSource`), so a tilted view is a true perspective rather than a stretched one (9.3).

### 3.8 Movement, camera, UI

- **Movement** is v1's code, unchanged except for listed fixes:
  - grounded walking at 5.5 cells/s, sprint 9.5, jump, gravity;
  - swept wall and slope collision against heights and structure spans;
  - fly mode at 70.
- **Third person** (phase 3):
  - a camera 6.4 cells behind the hero (`viewCam`), lifted over rising ground, pulled in by walls;
  - a "rig" of heights and distances as you look up and down, after Unity's Cinemachine, going into the hero's eyes at either end;
  - the hero is hidden within 2 cells of the camera;
  - plants and props between the camera and the hero are drawn see-through.
  - It is presentation only: `cam` stays the eyes, and v1's movement moves it.
- **UI:** an HTML layer over the canvas:
  - HUD (top left);
  - legend of keys (bottom left, H folds it);
  - start card;
  - the RPG inventory (on the right): a pixel paper doll, 10 equipment slots, 28 blocks, drag and drop, right-click menus, after RuneScape and Diablo;
  - the trade panel on the left, with sell at half price and buy back;
  - eating gives "well fed", a faster sprint.

---

## 4. Testing and tools

This part was strong and is worth keeping in spirit.

| Tool | What it does |
|---|---|
| `tools/test-sim.mjs` | Section by section: (1) world checksums for 5 seeds; (2) a 20.7 s scripted session run in v1 and v2 side by side, which must be bit-identical every step; (3) walks into every gate, door and house (553 houses); (4) walks across every bridge; (5) weather plans; (6) third-person walks where the camera may never enter the ground or a wall; (7) animals stay in their patches; (8) people over a whole day, never in a wall or water; (9) Port Ascii. |
| `tools/check-verbatim.mjs` + `tools/lib/v2-fixes.mjs` | v1's simulation code must appear in `index.html` byte for byte, except for 15 listed fixes (each a from/to edit with a reason). |
| `tools/shoot.mjs` + `tools/scenes.json` | Screenshots of about 99 fixed cameras (seed, hour, weather, gear, third person), with page time frozen (`__setNow`, `__step` in `tools/lib/harness.mjs`). |
| `tools/bench-v2.mjs` | Frame timings per scene (median of 5 windows of 60 frames), any browser, any number of workers, either look, any pitch. |
| `tools/flicker.mjs` | Walks or turns the camera with time frozen and counts pixels that **blink** (change, then change back a frame later). This is how flicker became a number. |
| `tools/find-views.mjs` | Re-aims scenes at landmarks after world generation changes them. |
| `tools/profile-v2.mjs`, `probe.mjs`, `map.mjs`, `palette.mjs`, `sheet.mjs` | Profiling, page probes, region maps, palette sheets, contact sheets. |

⚠️ **The costs of this rigour:**
- A full test run takes several minutes. Every world-generation change means re-recording checksums and re-aiming scenes.
- **The "verbatim v1" rule froze bad old code in place:** v1's roads (straight lines and right angles), v1's movement (no climbing), v1's merchants and trade. Phase 4 planned "roads that make sense" and "mountains you can climb"; they were never built, partly because touching v1 code meant listed fixes or retiring comparisons.
- Screenshots in the repo grew to 101 MB, and the `.git` folder to 116 MB.

**Next time:**
- keep determinism checks, worker-identity checks, the flicker metric and fixed-camera lookbooks;
- **don't** keep a byte-for-byte tie to an old codebase once you own the code.

---

## 5. Timeline: what Martin asked for, and what came of it

| Date | Step | Martin's ask | What was built |
|---|---|---|---|
| 27 Sep | Phase 0–1 | Rebuild the renderer; beat Swaggerfall | Research, 3 directions, C chosen; semantic mosaic, 3D solids, workers; v1's world ported verbatim |
| 28 Sep | Phase 2 step 1 | A new world (regions, villages, people, animals) | 8 regions, terrain per region, new materials, rock strata |
| 28 Sep | After review | "textures glitch and flicker; depth hard to read; lacks the painted look of the current trend (Glyphmoor); lacks reflections; needs soul and diversity" | **The painted look** (now the default), shadows and hollows, water mirrors |
| 28 Sep | Phase 2 step 2 | Land | Plants by region, cleaner ground, bridges, weather, fireflies, auroras |
| 28 Sep | Phase 3 | Third person like Ocarina of Time; gear that shows; a bigger world that takes time to cross; bolder colours; **no flicker**; then settlements | Steadier picture (flicker 3–10× lower), 1024 world, third-person hero and camera, gear on the hero, villages and hamlets |
| 28–29 Sep | Phase 4 | "Castles are blocks of random stuff inside" (Orthodox churches as inspiration); ground transitions random; roads; climbable mountains; spread castles | Churches, castles round churches, castle towns. **Roads, ground and mountains were never built.** |
| 30 Sep | Camera fixes | "Glitchy, skipping, fish lens looking down, the game moves my camera"; "why does the camera warp when I look down"; "why is the world getting smashed" | Wider streets, the camera rig, then true perspective |
| 30 Sep – 1 Oct | Phase 5 | An RPG inventory; eat the cheese; objects; then animals and people | Bag, then RPG inventory, farms, village props, animals, people |
| 1 Oct | Water | "Reflections too much; rivers look like a gap" | Fresnel reflections, water's own colour, ripples |
| 4 Oct | Second world | A cyberpunk city, planned properly | Art bible, palette, step 1a behind `?world=city` |
| 9 Oct | **Now** | Not happy; rebuild the original world from the ground up | This document |

The pattern to notice:
- each review found something basic: the look, flicker, scale, structures, camera, perspective;
- each fix was a patch on an architecture that was never designed for it;
- the biggest foundational choices (look, scale, camera, perspective) were changed **after** content had been built on them.

---

## 6. The visual systems, and how each turned out

| System | How | Result |
|---|---|---|
| Palette | 3 keyframes × about 55 ramps, hand-made hex, hue-shifted | ✅ The best decision of the project. |
| Mosaic look | edge shapes from 8 rays, material marks, seams | ⚠️ Crisp but flickers by design: marks pop between cells, seams switch on and off, shapes re-pick as silhouettes slide (5–6% of cells per frame when walking at night). |
| Painted look | 2 pixels a cell, a letter in each, continuous colour | ✅ Calmer (about 0.05–0.2% blinking). Became the default. Reads as "painted text", after Glyphmoor. |
| Shadows | occlusion grid walked toward the light | ✅ Good; recomputed in slices when the sun moves. |
| Water | first a mirror at 52–82%, now Fresnel × 0.6 with depth colour and ripples | ⚠️ The first version made rivers look like gaps; fixed. The water is still a flat floor you walk on, and waterfalls are flat steps. |
| Fog | layers by distance; a dawn valley fog field | ✅ Fine. The mosaic look has no fog or aurora. |
| Weather | pure function of seed and day; rain, snow, fog, aurora | ✅ Fine. |
| Night | warm lamps, windows, torches, fireflies, lantern | ⚠️ All point light is warm only (one ramp), and figures catch little of it. |
| Rock strata | bands by world height on steep faces | ✅ Mesas read as mesas. |
| Plants | analytic solids | ⚠️ Faceted canopies, tube-like fronds up close. |

---

## 7. Speed: what it cost, and where it went

Machine: Martin's M1 Max, 1440×900, 6 workers, painted look, unless noted.

| When | Chromium | Firefox | WebKit |
|---|---|---|---|
| Phase 1 (512 world) | 4.2–4.8 ms | 3.7–4.5 ms | 5.4–6.1 ms |
| Phase 2, painted look | 5.4–7.4 ms | 6.3–9.6 ms | 6.4–12.8 ms |
| Phase 3, 1024 world | 8.4–12.5 ms (busy machine) | 12.3–17.1 ms, **45–55 fps** | not measured |
| Phase 4, true perspective, behind the hero | +25–33% per stripe | road and village **53–55 fps** | 8.2–9.9 ms |
| Looking fully up or down | up to 10 ms | | |
| Phase 5, towns | market 7.4 ms | market 11.6 ms | |
| Port Ascii, whole-city views | 8.6–11.1 ms (56–60 fps) | 10.3–11.3 ms | |

Where the time goes:
- **The march** (terrain and buildings): the biggest share. It grew with the 1024 world, with true perspective (stripes march shared source columns twice), and with dense buildings.
- **Solids:** every tree, figure and prop is intersected per ray. Capsules are the worst (whole-box tests).
- **The cell stage and compose:** about 2–3 ms.
- **Lighting:** 20–40 ms per update on the 1024 world, sliced over 12 frames.

⚠️ **Measuring was unreliable:**
- Martin's Chrome often ran the game at 200%+ CPU in the background, and the Claude app's browser pane at about 290%. Many published numbers say "busy machine".
- WebKit's colour stage varied 4× between identical runs (2.4 ms to 9.3 ms).
- Firefox timings swing a lot from run to run.
- Rule learned: check `top` and close stray game tabs before benchmarking.

**The underlying problem:** a CPU software renderer in JavaScript spends a fixed budget of about 16 ms on everything. Each feature (perspective, people, stalls, water, a second world) had to be bought with milliseconds, and we were always near the edge in Firefox. A GPU (WebGL2/WebGPU) renderer drawing the same cell-mosaic look in a fragment shader would have had 10× the headroom. See section 11.

---

## 8. The camera, the long story

It was the most reported problem area, in four rounds on 30 Sep alone:

1. **Phase 3:** the view tilted by **shearing** (sliding the picture up and down, as in old ray-casters such as Doom). It looked right only to about 45°, so the third-person camera was limited to 49°.
2. **Towns:** "glitchy, skipping, fish lens looking down, the game moves my camera".
   - Cause: town gates were 3 wide and streets 5. The camera (6.4 behind) snapped in to about 2 cells whenever a wall got between it and the hero, showing the back of the hero's head from above.
   - Fix: streets 7 wide, gates 5, no lanes; the camera never closer than 2 cells (it goes into the eyes instead).
   - ⚠️ Cost: towns hold fewer houses (7–8 in a small town).
3. **"Why does the camera warp when I look down?"** The shear stretched everything. Each column's rays were turned by the pitch instead (`pixOfSlope`), and the camera got a rig (Cinemachine-style rings: higher and nearer looking down, low and near looking up, into the eyes at either end).
4. **"Why is the world getting smashed when looked down?"** Columns still kept their level spacing, so the bottom rows were stretched up to 2.6×, the top 4×, and the corners 16% in the everyday view. Fixed with true perspective (source columns).
   - ⚠️ This made each stripe do 25–33% more work, and dropped Firefox to 53–55 fps behind the hero.
   - ⚠️ Thin posts at the edge of a tilted view can come out a ray thinner or thicker.

**Lesson:** a real 3D camera with true perspective, and level design that leaves room for a third-person camera, are foundations. Both were retrofitted here, each time at a cost. On a GPU, perspective is free.

---

## 9. The problems log

Everything we discussed, grouped. Each item is marked ✅ (fixed) or ⚠️ (still open in the current build).

### 9.1 Glitches and flicker

- ✅ **Flicker when walking** (phase 3 step 1). Causes found:
  - ground sampled at fixed distances from the eye, sliding over the land;
  - sample spacing doubling at set distances;
  - steps drawn differently by how many screen rows they covered;
  - a wall's foot found by repeated halving that hopped;
  - letters taken from the march step instead of where the ray landed;
  - water ripples fixed to the screen;
  - the water mirror jumping a row at a time;
  - thin plant parts falling between rays.

  Fixed by sampling at grid lines, mips, slopes always from the previous step, and the `THIN` rule. Walking flicker fell 3–10×, turning flicker about 2×.
- ⚠️ **Turning still "crawls":** detail slides across pixels as the view turns.
- ⚠️ **Tower corners shimmer** where x and z faces alternate. Glyphmoor's commenters noted the same in that game.
- ⚠️ **The mosaic look flickers by design** (marks, seams, re-fitted shapes).
- ⚠️ Marsh pool shores and small distant flowers flicker a little.
- ✅ **Golden streaks down red terrace walls** (grass colour on rock faces). `wallAt` now prefers rock.
- ✅ **Sand spikes up mesa sides; wall feet painted in the ground's colour; stepped material edges; jagged shores** (phase 2 step 2).
- ⚠️ Roads at a shallow angle still step at close range.
- ⚠️ Cliff faces right in front of you are blocky, with a break at the horizon line.
- ⚠️ Badland terraces have scalloped grass edges.
- ⚠️ A flower at the lens is a big flat blob; a wall beside the camera can fill a side of the picture.

### 9.2 Low frame rates

See section 7. In summary:
- ⚠️ Firefox at 45–55 fps on the 1024 world and behind the hero after true perspective;
- ⚠️ looking fully up or down costs up to 10 ms;
- ⚠️ market stalls 2 ms on one thread;
- ⚠️ the lighting job used to stutter (now sliced);
- ⚠️ world generation 2.6–2.8 s with a blank screen;
- ⚠️ WebKit timings unstable.

### 9.3 Camera and perspective

See section 8.
- ✅ fish-eye and snapping in towns;
- ✅ shear stretch;
- ✅ squashed perspective.
- ⚠️ Still open:
  - the camera goes into the eyes with your back to a wall, in doors and gates, and on slopes steeper than about 50°;
  - at the far end of looking up, the hero leaves the bottom of the picture.

### 9.4 World design

- ✅ "Castles are blocks of random stuff inside" (castles rebuilt round churches).
- ✅ All castles bunched in the east (spread out).
- ✅ Towns too close (360 apart, 80 cells between settlements).
- ⚠️ **Never built from the phase 4 plan:**
  - roads that make sense (v1's roads still run in straight lines and right angles);
  - ground transitions that read;
  - climbable mountains (nothing steeper than 56° can be walked).
- ⚠️ Every town has the same plan. Villages on steep land are terraced plots with steep grass between. Houses have one room.
- ⚠️ Watchtowers stand wherever v1's roads happen to climb.
- ⚠️ Waiting since phase 5: docks on lakes, colourful farmland, things along the roads.
- ⚠️ No gameplay loop: no goal, no way to earn gold except selling what you bought, candles and the lucky pebble do nothing.

### 9.5 Bugs found by tests

- ✅ **NaN height:** `Math.pow` of a slightly negative base on a Float32Array; the cell then escaped the sea flood.
- ✅ **v1's road finder** assumed a 512 world: on 1024 it drew roads edge to edge, made 188 bridges, and gave up after 80,000 steps.
- ✅ **The hero's walk didn't animate in the real game** (speed was NaN on the first frame). The test harness hid it by taking an extra zero step.
- ✅ **The camera could end inside a gate's ceiling** (it checked its path but not its own spot).
- ✅ **Dijkstra precision** (Float32 distances against a Float64 queue).
- ✅ Doors up 2–6-unit banks, door paths through other houses, and ramps too steep: all caught by the house walks.

### 9.6 Engine correctness

- ✅ **Workers crashed silently** (a helper missing from `workerSource`) and the main thread took over, so screenshots looked fine. The harness now fails on any worker crash or page error.
- ✅ **Worker/thread mismatches:** stripes disagreeing about whole-object decisions (see-through plants), a glow test reading a neighbouring stripe's data, marks reading a neighbour ray's stale fields. Found only by comparing 4, 5, 6 and 7 workers against one thread.
- ⚠️ The rule that makes these bugs possible is the stripe split itself: anything reading neighbouring columns needs care.

### 9.7 UI and interaction

- ✅ The legend and key explanations were unclear, so they were redesigned.
- ⚠️ The right-click menu needs a mouse.
- ⚠️ Through your own eyes you don't see yourself eat.
- ⚠️ Pointer lock is refused in the Claude app's browser pane, so mouse-look must be tested in a real browser; in headless Chromium it drops v1 to 4 fps.

---

## 10. The second world (Port Ascii), for completeness

Built 4 Oct, behind `https://oddslice.github.io/land-of-ascii/?world=city`:
- `docs/city/bible.md`: the art bible, a design system with districts, palette roles and checks;
- `docs/city/research.md` and `step1.md`;
- palette tools: `tools/city-palette.mjs` and `city-sheet.mjs`;
- in the game: `generateCity` and window facades (`FACADE`, `facadeAt`).

The Land was checked unchanged to the byte. It is independent of the Land and can be kept, moved to the new build, or deleted. Its art-bible approach (decide the look and the rules first, then build) is what the Land never had.

---

## 11. What to do differently next time

### Decide these first, before any content

1. **The look, as an art bible:** palette roles, materials, glyph rules, lighting, a "never do" list, with real-engine mockups to choose from. The Land's look was chosen in phase 0, then replaced by the painted look after the first review.
2. **The scale:** hero, door, storey, street width (camera room!), walking speed, world size, how long it takes to cross, view distance.
3. **The camera:** third person from day one, with a rig and true perspective, and level design rules that leave it room.
4. **The renderer's budget:** a frame target per browser and how features will be paid for. Strongly consider the GPU (section 7).
5. **What the player does:** goals, earning, why to explore. Most phases added scenery; the game loop never arrived.

### Architecture

- **A WebGL2 (or WebGPU) renderer** that keeps the text-cell look:
  - render the scene into a low-resolution buffer of IDs, depths and normals;
  - a fragment shader picks each cell's glyph and two colours from a glyph atlas and palette textures.

  The same semantic-mosaic idea, roughly 10× the headroom, perspective free, no stripe-identity bugs.
- **Modules,** not one 9,000-line file. The renderer in a worker module.
- **World data designed for the renderer you choose:**
  - heightmap and voxel spans worked, but meant no round shapes, axis-aligned walls and corner shimmer;
  - signed distance fields or meshes are the alternatives to weigh.
- **Keep:**
  - deterministic generation from a seed;
  - timetables as pure functions;
  - the palette discipline;
  - fixed-camera lookbooks;
  - the flicker metric;
  - worker or GPU identity checks.
- **Don't keep:** v1's movement, roads and trade. Write your own and own them.

### Process

- **Phase by phase with a screenshot review is right**, but the review should come before foundations harden. Get Martin's eye on the look, scale and camera in week one, in a greybox world.
- **Benchmark on an idle machine,** in all three browsers, every step, with a fixed set of scenes.
- **Show motion, not just stills:** flicker and camera trouble were invisible in screenshots and found only by playing. Record short videos of fixed walks.

### Studying other examples (reverse engineering)

What worked when we studied Glyphmoor (frame by frame from its TikTok video) and Swaggerfall (from its devlogs). For each reference, write down:

1. **Cell density:** how many cells across the screen, and the cell's shape (square or 1:2). Glyphmoor is about 170 × 300 square cells in a 720×1280 video; Swaggerfall recommends 15–20k cells.
2. **Colours on screen,** and whether there is a fixed palette. Count from a still.
3. **What a cell carries:** one colour, two colours, a letter, a shape.
4. **How edges are drawn:** shapes, outlines, or just colour.
5. **How glyphs are chosen:** by material (Glyphmoor: `%` stone, `^` roof, `@` leaves), by brightness, by edge direction.
6. **Light:** shading steps or continuous, shadows, fog, night, coloured lights.
7. **Water:** mirror, Fresnel, own colour, ripples.
8. **Motion:** does it shimmer when walking or turning? Glyphmoor's own commenters spotted wall shimmer from building unit by unit.
9. **Scale and camera:** first or third person, how far you see, how big the world is, how long to cross it. Glyphmoor's 2 km map takes about 7 s to generate; another developer streams generation around the player.
10. **Performance tricks** the developer mentions: supersampling, godrays, frame-time work.
11. **What the comments praise and complain about.**

Then **prototype the look in the engine** on a small greybox scene, compare against the reference side by side at 100% zoom, and only then build the world.

---

## 12. Where everything is

| What | Where |
|---|---|
| The game | `index.html` (the Land by default, Port Ascii at `?world=city`) |
| v1, pinned | `reference/v1-index.html` |
| Notes for Claude | `CLAUDE.md` (layout, rules, commands, rough edges) |
| Briefs and phase records | `docs/brief.md`, `direction.md`, `research.md`, `phase1.md` to `phase5.md`, `phase2-world.md` |
| The second world | `docs/city/` |
| Tools | `tools/` (section 4); harness in `tools/lib/harness.mjs`, v1 fixes in `tools/lib/v2-fixes.mjs` |
| Screenshots | `shots/` by phase; scenes in `tools/scenes.json` |
| World checksums | `tools/world-hashes.json` |

Commands:

```sh
node tools/test-sim.mjs            # all simulation tests (--record after a deliberate world change)
node tools/check-verbatim.mjs      # v1 code unchanged except listed fixes
node tools/shoot.mjs [scene...]    # screenshots (--look mosaic, --threads 0, --third, --world city)
node tools/bench-v2.mjs [scene...] # frame timings (--browser firefox|webkit, --threads N, --pitch F)
node tools/flicker.mjs road 60 0.117 0 painted   # blinking pixels while walking
```
