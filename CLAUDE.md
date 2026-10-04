# Land of Ascii: notes for Claude

An explorer drawn as a mosaic of text glyphs, walked as a hero seen from behind (the third person, since phase 3) or through their eyes. The whole game is `index.html`: one file, no build, no dependencies. Serve the folder (or open the file) and add `?seed=42` for the world in `shots/`. It began as v2 of Text Voxel (https://github.com/OddSlice/text-voxel), which is the ancestor: v2 took over its simulation and rebuilt the renderer. The docs and tools still call this build "v2" and the ancestor "v1"; v1 matters only as the reference the regression tests compare against.

Read `docs/phase1.md` first. It explains how a frame is drawn, the workers, the tests, measured speed and the open issues.

**Phase 5 is in progress: read `docs/phase5.md`** (a lived-in world: your bag, then farms and village objects, animals, people). **Phase 4 (`docs/phase4.md`)** built castles with a purpose after Orthodox churches and castles spread out with towns; its roads, ground and climbable mountains come after phase 5. The game is public and playable at https://oddslice.github.io/land-of-ascii/ (GitHub Pages from `main`): every push to `main` is live, so keep `main` playable.

**Port Ascii, the second world (a cyberpunk city), is being planned: `docs/city/bible.md` is its art bible** (the design system: districts, colours with jobs, shapes, light, signs, people, screens, a never-do list, a checklist and the checks). Read it before touching anything in the city. Nothing in the game uses it yet.

**Phase 3 is done: `docs/phase3.md`.** It is Martin's direction after phase 2's second step (third person, a bigger and more open world after Ocarina of Time, no flicker, gear that shows on your hero, then settlements), the plan in five steps, and each step as it is built.

**Phase 2's brief is `docs/phase2-world.md`**, and its steps are recorded in `docs/phase2.md` (steps 1 and 2 built; its settlements become phase 3's step 5). It is the brief: varied land (regions, terrain, weather, bridges), villages and towns, people and animals, how the tests change once world generation changes, and the order of work (a design pass, then land, settlements, people and animals, finish), with a commit and screenshots after each step. `docs/phase2.md` records each step as it is built: what, the numbers, the tests, the speed.

## How index.html is laid out

In file order:

1. HTML/CSS/HUD markup.
2. **World and movement constants**, the materials `MAT` and the regions `BIOME`. Then the v2 constants: `CELL_PRESETS`, `RAYS_X/Y`, the ray kinds `K`, merchant parts `PART`, ray flags `F_*`.
3. **Palettes:** `KEYFRAMES` (day, dusk, night ramps), `blendPalette`, the live tables `COL` and `cur`.
4. **Simulation:** helpers, noise, world generation (`generateWorld`), then **regions** (phase 2: climate, region weights, shaping per region, the coast, the region per cell, marsh pools, and `paintGround`, which turns regions, slope and height into materials), then rivers, structures (phase 4: v2's own; castles round a church `buildFortress`, churches `buildChurch`, keeps and towers `buildKeep`, ruined churches `buildRuin`), **settlements** (phase 3: `placeSettlements`, `buildSettlement`, `buildHouse`), **castles and towns** (phase 4: `placeCastles` spreads a castle over each part of the land and turns it to face the walled town `buildTown` builds at its foot, `turnTemplate`), **watchtowers, ruins and stones** (phase 4: `placeTowers` on the roads' passes, `placeWild` out in the wild; both after the roads), their parts into the world (`structureExtras`, `structureLights`, `castleFlags`), roads, **farms** (phase 5: `placeFarms` lays fields, pastures and hay meadows round every settlement into `world.farm`, the fences, haystacks and windmill sails into the props; `buildWindmill`), **village life** (phase 5: `placeLife` lays market stalls, barrels, woodpiles, carts and signposts, at settlements and at crossroads, into the props; `indexProps` makes `world.props` of both), **animals** (phase 5: `placeAnimals` puts sheep, cows, hens, ducks and deer where they belong, each with its patch; `animalAt` is the timetable, a function of the time alone; `updateAnimals` moves those near you off from you and fills `world.herd` for the renderer), **people** (phase 5: `placePeople` gives each settlement a map for walking, `buildNav` and `navField` (Dijkstra), and its people: villagers, farmers, traders with a `shop`, guards; `planOf` is a villager's day, `legPath` their way, `personAt` where they are by the clock; `updatePeople` fills `world.crowd` and finds who you could greet; `greet`), trees (by region, off the farmland), birds, lights (`placeLights`, v2's own since phase 4), clouds, merchants, the water's own look (`makeWaterFields`: how far from the shore, which way the rivers flow), sky and lighting. World generation, settlements, structures and tree placement are v2's own (since phases 2 to 4); the rest is still v1's.
5. **`renderCore()`**, the whole renderer:
   - colour model;
   - glyph atlas;
   - the march: it samples the ground where each ray crosses the lines of the height grid (`ddNext`, spacings `DD_*` matched to the height averaging `mipLevel`), so its samples are fixed to the ground; walls are drawn by `wallAt`, rock is banded by steepness (`STRATA_*`), fields in crop rows (`rowStripe`, `FIELD_ROWS`: also in the painted look's colours);
   - 3D solids (`rasterPrim`, the tree builder `buildPlant`, the props `buildProp` (phase 5: fences, haystacks, windmill sails, market stalls, barrels, woodpiles, carts, signposts; each kind left out past its `PROP_FAR`), the merchant rig `buildMerchant`, the animals `buildAnimal` and the people `buildPerson` (phase 5, from `world.herd` and `world.crowd`), your hero `buildHero`); in the third person, plants and props near the camera or in front of the hero are drawn see-through (`LENS_*`, `heroBox`);
   - ground marks;
   - reflections;
   - cell stage (`shadeCells`);
   - overlays;
   - `compose`;
   - the painted look (`paintCells`, `composePainted`): two square pixels per cell in continuous colour, one letter each; water in its own colour (lighter in the shallows: `world.wdepth`; ripples running downstream: `world.flow`), mirroring only as much as the angle gives (`fresnel`, `WATER_MIRROR`);
   - the worker message interface.
6. **Canvas and grid**, then input, movement and trade/HUD/lifecycle (ported; the trade panel's list, buying, selling and buying back are v2's own since phase 5: `renderGoods`, `buy`, `sell`, `buyBack`).
7. **Presentation:**
   - the worker pool (`workerSource`, `startWorkers`, `syncWorkers`);
   - merchant poses (`merchantPose`, main thread) and `frameDesc`;
   - the third person: `updateHero` places `viewCam`, the camera behind your hero, and fills `hero`, their pose for the renderer (`V3_*` set the camera: distance, angles, tilt limit); `updateGear` turns the goods you own into `hero.gear` (`GEAR` bits, `GEAR_OF`, the tunic bought last);
   - the weather: `weatherAt` is each day's plan, `updateWeather` works out `wx`, what the renderer draws this frame;
   - your bag (phase 5): `bag` (what you have, what is put away, how long you are well fed, what you are eating, which of the 28 blocks each thing lies in: `grid`), `ITEM` (each good's slot, or food's time; a line and a note), the RPG inventory on the right (`#inv`: `openBag`, `renderInv`; the paper doll `drawDoll`, the slots `SLOTS`/`PAPER`, the blocks `layoutBag`, pixel icons `ICON_ART`/`iconURL`; a note, a menu and dragging: `primary`, `actionsFor`, `dropTarget`), `equipItem`, `unequipItem`, `eatItem`, `updateBag` and `syncInv` every frame; `updateGear` reads the bag, and `fedSprint` speeds v1's sprint (a listed fix);
   - the legend (`updateLegend`: the keys, each switch's current choice, a note when a setting changes; it replaces v1's `#help`, which is hidden);
   - the main loop, boot, and `window.TV`.

## Rules

- **Simulation changes are deliberate.**
  - World generation and tree placement are v2's own (phase 2). After a deliberate change to them, re-record the world checksums (`node tools/test-sim.mjs --record`), say what changed in `docs/phase2.md`, and re-aim the scenes (`tools/find-views.mjs`).
  - The rest of the simulation (movement, input, trade, rivers, roads, merchants, lighting) is still v1's code. (Structures, settlements, castles and towns, and the gate torches are v2's own since phase 4; the trade panel's list, buying and selling since phase 5.) For any change to it, add the exact edit to `tools/lib/v2-fixes.mjs`, so `check-verbatim.mjs` and `test-sim.mjs` keep proving nothing else moved. If a change is too big for a from/to edit, retire the relevant comparison and say so in the docs.
- **`renderCore()` must stand alone.** Each worker is built from its source (`workerSource()`). Inside it, use only its own code, the constants and helpers `workerSource()` passes in, and the objects `world`, `cam`, `clock`, `view`, `cur`, `light` and `COL`. A new constant or helper used inside the core must be added to `workerSource()`. Main-thread-only things (`ui`, `player`, the DOM) stay outside.
- **The third person is presentation only.** `cam` is your eyes, and v1's movement moves it. Every frame `updateHero` places `viewCam` behind the hero, and the renderer draws from it: the workers get it as their `cam`, and the main-thread render swaps it into `cam` for the frame and back. The simulation, the HUD and trade read `cam`, never `viewCam`. The camera must never end up inside the ground or a building (`test-sim.mjs` section 6).
- **Workers and the main thread must agree.** Rendering with `?threads=0` must give the same pixels as the default workers, in both looks. Check it after renderer changes (diff two `tools/shoot.mjs` runs, one with `--threads 0`, with `--look painted` and `--look mosaic`; also with `--threads 4`, `5` or `7`, which put the stripes' edges elsewhere). Anything that reads neighbouring columns must work within the columns a stripe computes (`grid.xr0`..`grid.xr1`, one cell wider than it draws). A choice about a whole solid (such as whether a plant is see-through) must be made from its box over the whole picture (`primBox[4]`, `primBox[5]`), not from the stripe's share of it.
- **Looking up and down is true perspective (phase 4).** The renderer turns each column's rays by the pitch (`pixOfSlope`, `slopeOfPix` in `renderCore`), and a tilted view (`vTilt`) is drawn through source columns (`beginSource`, `endSource`): in the row at height q a screen column looks across by its level amount over F = cos(pitch) − q·sin(pitch) (`rowF`, `fOfPix`), so the march, the solids and the shadows draw source columns spread as wide as the rows need, and each screen ray then takes the nearest one (`rayK`). Rules that follow:
  - anything that puts a height on the screen goes through `pixOfSlope(slope)` (height over forward distance), never `vHor - slope * f`; `rayQ[row]` is each row's slope;
  - during the source stage, `rayP`, `grid.xr0..xr1` and the ray arrays are the source's, and a screen x worked out from a lateral slope is a source column counted from `vK0` (subtract it before indexing; decisions over the whole picture, such as `primBox[4..5]` and see-through dithering, use the uncounted column);
  - anything placed across the screen after it sits at `w/2 + slope·f·fOfPix(y)`, and a world position worked out from a screen ray uses its own direction, `srcP[rayK[i]]`, not `rayP[x]`;
  - the march must draw the same in a row wherever it starts and stops (stripes draw shared source columns in different bands): no step that depends on what was drawn or skipped before;
  - nothing may read a field a ray did not write this frame: `u`, `v`, `w` belong only to walls, tops, undersides and marked solids, so check the ray's kind (a neighbouring ray's too) before reading them.
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
node tools/shoot.mjs hero --hud --js "TV.bagAdd('Wheel of cheese'); TV.openBag()"   # run page code before the shot (TV is window.TV); --hud shows panels
node tools/bench-v2.mjs          # frame timings (--threads 0, --browser firefox|webkit, --look painted|mosaic, --third)
node tools/profile-v2.mjs road   # CPU profile of a scene
node tools/probe.mjs road 'expr' # evaluate an expression in the page after showing a scene
node tools/find-views.mjs --write              # re-aim the region views and the aerial (--seed N, --aerial-only, --classic for phase 1's six, --landmarks for castles, towns, villages, towers, ruins and your hero); scenes marked fixed: true are left alone (except by --landmarks)
node tools/map.mjs [seed...]     # region maps -> shots/phase2/map-<seed>.png
node tools/palette.mjs           # the ground's ramps, day/dusk/night -> shots/phase2/palette.png
node tools/sheet.mjs --out x.png --cols 2 --scale 0.5 a.png "Label" b.png "Label"   # contact sheets
node tools/flicker.mjs road 60 0.117 0 painted   # blinking pixels per frame while the camera walks (time frozen; 4th arg turns; PAGE=other.html to compare a copy)
node tools/city-palette.mjs      # the city's draft palette, from its recipe -> docs/city/palette.json
node tools/city-sheet.mjs        # the city's art-bible sheets and colour checks -> shots/city/step0/ (--direction A|B|C; fails if a check breaks)
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
  - **After step 2:** the camera in the towns (wider streets and gates, no giant close-ups); looking up and down without stretching (the renderer turns the view, then draws it in true perspective); a camera rig, into your eyes as far as you look up or down; four or five castle towns a world, three villages, four hamlets, 80 cells of open country between any two.
  - Next (after phase 5): step 3 (roads that make sense), then ground that reads, then mountains you can climb.
- **Phase 5 is under way**, following `docs/phase5.md` (Martin, 30 Sep: an RPG inventory and eating the cheese, then more things in the world).
  - **Step 1 (your bag) is built:** I opens it (worn, carried, food and drink, odds and ends); eat or drink (the hero lifts the food to their mouth; well fed, you sprint a quarter faster for up to 5 minutes; FED on the HUD); wear or take off, carry or put away; merchants buy back at half price; the bag goes with you to a new world.
  - **Step 2a (farms) is built:** fields in crop rows (wheat, greens, ploughed soil), fenced pastures with a gate toward the settlement, hay meadows with haystacks, round every village, hamlet and town; a windmill with turning sails in most villages' fields.
  - **Step 2b (village and town life) is built:** market stalls under striped awnings in the corners of every town's market square; barrels by the taverns and smithies; woodpiles by about half the homes; carts by the barns and some farmhouses; signposts where the roads leave every settlement and at the crossroads in the country. None can be walked through; near the camera they are see-through, as the plants are.
  - **The feedback round (Martin, 1 Oct):** before he sends it to people, an RPG inventory, then animals, then people (steps 3 to 5; colourful farmland and things along the roads wait).
  - **Step 3 (an RPG inventory) is built:** I opens your bag on the right: your hero in pixels wearing what you wear, ten slots round them, 28 blocks below; pixel icons for every good; click, drag, right-click, hover; trading with the wares on the left and buying back.
  - **Step 4 (animals) is built:** sheep or cows in every pasture, flocks on open grass near the villages, hens before the houses, ducks on the nearest water, deer in the forests' clearings; they turn, walk and graze on a timetable, move off as you come close, and a deer bolts.
  - **Step 5 (people) is built:** villagers with a day of their own in every village and town (out after sunrise to the square, the well, the market or the chapel, home before dark), farmers hoeing the fields, a trader at each stall (E shows their wares), guards at the town gates; E greets anyone near, and they answer.
  - The feedback round is done: Martin sends the game out. Waiting: colourful farmland, things along the roads, docks on lakes.
- **Port Ascii (the second world) is in planning**, following `docs/city/bible.md`: a cyberpunk city in the spirit of Night City (elevation, megabuildings), chosen at the start alongside the Land (Martin, 30 Sep). On 4 Oct Martin asked for it to be planned from the ground up, design system first.
  - **Step 0 (the art bible) is written:** a harbour city on a hill where wealth rises with height (the Docks, the Stacks, Neon Row, the Spires), one neon colour per district over a quiet base, one warm white kept for "you can use this", signs in real words; the research (`docs/city/research.md`), a draft palette (`docs/city/palette.json`, from `tools/city-palette.mjs`) and sheets (`tools/city-sheet.mjs`). Claude Design was considered and not used for the world (see the research). Martin's decisions (4 Oct): the name Port Ascii, mood A (rain noir), a full day, rain most nights, signs in English and Cyrillic, a jellyfish hologram, the start at the docks, credits.
  - Next, when Martin says go: step 1, a test block in the real engine behind a hidden switch (`?world=city`), in three moods; then step 2 locks the palette into the game and a style contract into this file.
- **Speed on Martin's Mac** (M1 Max, painted look): on the 512 world, Chromium 5.7–7.5 ms a frame, Firefox 7.3–9.9 ms, WebKit 6.5–14.1 ms. The 1024 world has not been measured on an idle machine yet: with Chrome busy in the background it ran Chromium 8.4–12.5 ms, Firefox 12.3–17.1 ms. A world generates in about 2.3 s (0.5 s on the 512 world).
- **Rough edges:**
  - turning still crawls a little (detail sliding across the pixels);
  - roads at a shallow angle still step at close range;
  - cliff faces right in front of you are blocky, with a break at the horizon line;
  - palm fronds are tubes up close, and canopies look faceted;
  - merchant faces and outfits are simple;
  - third person: the camera rides a rig as you look up and down (`V3_RIG_DOWN`, `V3_RIG_UP`), into your eyes as far as you can look either way; it also goes into your eyes with your back to a wall and in doors and gates (it snaps in; it never shows the hero from closer than 2 cells); a flower at the lens is a big flat blob; the hero's green tunic is close to the fields' green;
  - gear and the bag: the things at the belt are small; candles and the lucky pebble do nothing; through your own eyes you do not see yourself eat, and from behind the food shows only while held up; the inventory's right-click menu needs the mouse or the menu key;
  - settlements: on steep land a village gets few houses and steep grass between its plots; houses have one room;
  - farms: the pastures are empty until the animals come; a gate is a gap (fences cannot be jumped); a village on rough land may have no windmill, and a windmill has no inside;
  - animals: they do not stand in your way (they move off first, but a quick walk passes through); nothing sleeps at night; they walk through haystacks and trunks in their patch;
  - people: they walk through you and each other; nobody goes inside (they vanish at their door at night); only the guards are out at night; a handful of lines each;
  - village things: no docks on the lakes yet; nobody minds the stalls and the signposts' boards are blank (people come in step 4); the four market stalls cost about 2 ms a frame drawn on one thread (capsules are tested over their whole box on screen);
  - towns: every town has the same plan, its streets wide for the camera (so a small castle's town holds only 7 or 8 houses); on a steep slope house footings show along the street; watchtowers stand where v1's roads happen to climb;
  - true perspective: behind your hero (always a little tilted) each stripe does a quarter to a third more work, since neighbouring stripes both march the columns where they meet; Firefox drops to 53–55 fps on the road and in the village there. Looking all the way up or down costs up to 10 ms a frame in Chromium. A thin post near the edge of a tilted view can come out a ray thinner or thicker (each screen ray takes the nearest source ray).
