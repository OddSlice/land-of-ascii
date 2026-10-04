# Port Ascii, step 1: a test block in the engine

The plan for step 1 of the second world (see [bible.md](bible.md), "The plan"). Written on 4 Oct 2026, after Martin settled the bible's open questions; it waits for his go.

## What it is for

Step 0 drew the city as diagrams. Step 1 builds a small piece of it in the real engine, to settle with real frames what diagrams can't:

1. **The look:** mood A (Martin's pick) in the engine at day, dusk and night, with B and C beside it at night.
2. **Speed:** can the engine draw tall, dense buildings and many lights at 60 fps?
3. **Signs:** can real letters, English and Cyrillic, be read on a sign, in both looks?
4. **Light:** do coloured neon light and wet streets look good, and stay subtle?
5. **Readability:** do the four districts pass the four checks (greyscale, blur, "where am I", colour blindness)?

## What gets built

Everything sits behind a hidden switch: the address `?world=city` (with `&mood=A`, `B` or `C`). Without it, nothing changes. The Land's worlds and pictures must stay exactly the same, byte for byte: checked with the world checksums and with before-and-after shots of the Land's scenes, at every part.

- **The ground:** an island hill rising from the harbour (Hong Kong Island is the model), its slope in the four bands from the Docks to the Spires. Streets are terraced into the hill, and where one is too steep it becomes stairs, under the walking limit. Asphalt streets, concrete pavements, the Spires' plaza in pale tile. One main stair-street climbs from the docks to the summit, with one or two cross streets in each district. Every street is at least 7 cells wide (the camera rule).
- **Buildings,** each district in its own shapes, as simple voxel buildings:
  - the Docks: sheds and stacked containers;
  - the Stacks: big blocks with walkways between them;
  - Neon Row: mid-rise blocks with sign blades;
  - the Spires: towers with setbacks.

  Their windows are glass, about a third lit at night.
- **Landmarks, in simple form:** the crane over the water, BLOCK 9, and the tallest tower with its ring of light. The hologram jellyfish (a see-through thing that moves) may wait for a later step.
- **The palette:** the city's own day, dusk and night colours from `palette.json`, blended through the day as the Land's are.
- **Light:**
  - neon surfaces that glow by the hour;
  - coloured light from them on the walls and streets around them (today every lamp in the engine gives warm firelight, so lights get a colour);
  - street lights per district;
  - the warm-white signal on the doorways.
- **Signs with letters:** bitmaps for A to Z, 0 to 9 and the 30 Bulgarian capitals, painted onto sign faces the way the churches' frescoes are painted onto their walls, in both looks.
- **Weather:** rain most nights; wet streets mirroring the lights by the same angle rule as the water.
- **The start:** at the docks, looking up the hill.

**Not in step 1:** people and vendors, the elevated rail, flying cars, the screens' skin, the choice of world on the start screen.

## What you see

- The lookbook from the bible (as many of its 12 shots as the block holds):
  - in mood A at day, dusk and night;
  - in moods B and C at night, for comparison.
- Signs close up, in both looks.
- The four checks run on the shots.
- Frame times in Chromium, Firefox and WebKit.

## In three parts

Each part is committed and pushed once the Land is checked unchanged and the tests pass.

- **1a, the bones:**
  - the switch, the hill and its streets;
  - plain buildings with windows;
  - the palette in three moods;
  - the start at the docks.

  Sheet: the block in three moods and at three hours; first frame times.
- **1b, the neon:**
  - glowing signs with letters;
  - coloured light;
  - street lights;
  - the landmarks.

  Sheets: signs close up in both looks; each district at night.
- **1c, the rain:**
  - rain and wet streets;
  - the four checks;
  - frame times everywhere.

  Sheets: wet streets; the checks.

## ⚠️ Risks

- **Speed:** a city fills the picture with near walls and lights, and the engine walks through every building a ray crosses. If 60 fps doesn't hold, the fallbacks are:
  - fewer, bigger buildings;
  - lights left out by distance;
  - a shorter view distance in the city (the smog hides it).
- **Letters:** a letter needs about two text cells of height to read. Far-off signs become blocks of glow, as the bible intends; close ones should read. If they don't, signs get bigger.
- **Engine changes** (coloured light, letters on walls, wet streets) touch the renderer. The usual rules hold: the workers and the single thread must agree, and the Land's pictures must not change.

## Part 1a, the bones (built)

Martin said go on 4 Oct ("okay move to the next step").

**How to see it:** add `?world=city` to the game's address (https://oddslice.github.io/land-of-ascii/?world=city), and `&mood=B` or `&mood=C` for the other moods. R makes a new Port Ascii, and the address keeps the city. Without it, nothing has changed.

**The hill.** An island hill rises from the harbour on its north side to a summit 120 above the sea, in seven terraces:
- the quay (the Docks), 3 above the water;
- two terraces of the Stacks, at 21 and 39;
- two of Neon Row, at 58 and 77;
- the Spires' terrace at 98, and the summit at 120.

Each terrace has a street along its foot. Three streets climb the hill: the spine, straight up the middle to the summit's plaza and the tallest tower, and two that jog from terrace to terrace (the seed moves them). A climbing street rises evenly from one cross street to the next, 0.39 to 0.56 a cell (walking manages up to 1.5). Between the terraces stand concrete retaining walls. Beyond the built part, the hill's flanks and its back fall to the sea, rough and unbuilt.

**The blocks.** Every block between the streets is one structure holding its buildings: 27 blocks and the crane.
- **The Docks:** long sheds with saw-tooth roofs; containers stacked one to three high in the yards; a gantry crane on the quay, its boom out over the water.
- **The Stacks:** one or two huge blocks of homes to a block, 9 to 15 storeys, an alley between, water tanks and aerials on the roofs.
- **Neon Row:** narrower buildings shoulder to shoulder, 5 to 10 storeys, shop windows at street level, some with a smaller storey set back on top.
- **The Spires:** towers of glass between steel mullions, set back twice as they rise, a mast on top. Round the summit's plaza stand the tallest of them, and behind it the crown, 268 high.

**Windows are drawn, not built.** Each district's walls have their own pattern of windows: small and close in the Stacks; shops below and windows above on Neon Row; glass from floor to ceiling in the Spires; a row of small high windows in the Docks' sheds. The renderer draws them where a ray meets the wall (`FACADE`, `facadeAt`), so a whole wall of windows stays one block of voxels, which keeps the city fast. At night about a third of the homes' windows and half the shops are lit, each always the same one.

**The colours** are Port Ascii's own palette (`CITY_PALETTE`, written into the game by `tools/city-palette.mjs`), blended through the day as the Land's is, in mood A, B or C. **You start** on the quay at the foot of the spine, looking up the hill.

### What it shows

Sheets in `shots/city/step1a/`:
- [sheet-hours](../../shots/city/step1a/sheet-hours.png): from the harbour, and where you start, at 11:00, 18:48 and 21:30;
- [sheet-moods](../../shots/city/step1a/sheet-moods.png): the three moods, at night and at dusk;
- [sheet-streets](../../shots/city/step1a/sheet-streets.png): a street in each district by day, the view down from the summit, and the city from above.

What we learned:
- **The skyline steps up the hill,** as the bible asks: the low Docks, the Stacks' big blocks, Neon Row's pink, the Spires' glass, the crown tallest of all. From above, by day, the districts read by their materials and shapes alone.
- The first version had the Stacks so tall that they hid Neon Row. The hill is now steeper and the Stacks lower.
- The streets first ramped steeply over each terrace's edge, and the street ahead filled the view. Now they rise evenly.
- **At night the streets are dark:** only the windows are lit so far. Street lights and neon come in 1b.
- The moods differ in sky and tone. B (neon soak) can only really be judged once the neon is in.
- The Land's clouds looked like small lenses up at the city's height, so the city has none for now; a low cloud over it comes later.

### Speed

On Martin's Mac (M1 Max), 6 workers, painted look, the machine idle:

| Views | Chromium | Firefox |
|---|---|---|
| Street level: where you start, the Docks, the Stacks, Neon Row, the plaza | 4.7–7.3 ms a frame (60 fps) | 6.6–7.4 ms |
| The whole city: from the harbour, from above, down from the summit | 8.6–11.1 ms (56–60 fps) | 10.3–11.3 ms (57–59 fps) |
| The Land, for comparison: where you start, a town street, a road | 6.3–7.6 ms | 11.3 ms (where you start) |

⚠️ The views over the whole city are the heaviest, because the march walks through every block a ray crosses. They stay near 60 fps now; 1b's lights will add to them. If they need saving, the march over far blocks is where to save.

### Checks

- **The Land is untouched:** all 87 of its scenes, in both looks, came out identical to the byte before and after; its world checksums are as recorded, and all its tests pass.
- **Workers:** Port Ascii draws the same with 1, 4, 5, 6 or 7 workers, in both looks.
- **New tests** (`tools/test-sim.mjs` section 9):
  - the city is the same every time (checksums recorded for seeds 42 and 7);
  - every kind of block is there, and the crown is the tallest;
  - the address keeps `?world=city`;
  - in the third person you can walk from the start up the spine to the summit's plaza, and along every cross street from end to end, with the camera never in the ground or a building.
- **v1's code:** one listed change (`tools/lib/v2-fixes.mjs`): a new world keeps the address's world.

### Rough edges

- Nights are dark at street level until 1b's lights.
- The layout is regular: a grid of blocks, the same few buildings repeated.
- The Docks' containers are plain boxes, and nothing can be entered.
- The hill's flanks and back are bare.
