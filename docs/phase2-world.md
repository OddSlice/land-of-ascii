# Phase 2: a new world

Phase 1 rebuilt how the world is drawn but kept v1's world. Phase 2 makes the world itself new: varied land, villages and towns, and people and animals living in them. The renderer from phase 1 stays: text cells, the palette, 3D solids, workers.

Chosen by Martin (27 Sep 2026): **varied land, villages and towns, people and animals**. Quests, signposts and useful items are not in this phase.

## What the world should have

### 1. Varied land

- **Regions, not one green valley.** A biome map from low-frequency temperature and moisture noise, plus height:
  - grassland;
  - deciduous forest;
  - pine forest;
  - snowy peaks;
  - red badlands (terraced mesas, dry washes);
  - marsh (flat, wet, pools and reeds);
  - beaches and sea cliffs along the coast.
  Neighbouring regions blend over a short band rather than meeting at hard lines.
- **Terrain shaped per region:**
  - mesas are terraced (stepped heights);
  - marsh is flattened, with pools cut into it;
  - cliffs are steep drops at the coast;
  - dunes or washes are optional.
- **New materials and ramps** in all three keyframe palettes (day, dusk, night), hue-shifted like the existing ones: sand, red rock, dry grass, mud, reeds. Each also needs its ground marks: sand ripples, cracks, reed stalks, snow.
- **Plants by region:**
  - Deciduous forest and pine forest stay as they are.
  - New 3D plants: shrubs and dead trees for the badlands, reed clumps for the marsh, sparse pines on the snow line, and cacti if the badlands want them.
  - All are built from the existing primitives (capsules, cones, ellipsoids).
- **Weather**, deterministic from seed and time so tests can pin it:
  - rain: falling streak glyphs, a darker palette blend, wet ground slightly darker;
  - snow: falling flakes in cold regions and at altitude;
  - fog banks that sit in valleys at dawn.
- **Bridges:** where a road crosses a river, a wooden or stone bridge (a voxel template) replaces v1's ford.

### 2. Villages and towns

- **Placement.** Settlements sit on flat ground by roads and rivers, in three sizes:
  - hamlet: 3–6 houses;
  - village: 8–15 houses, a square and a well;
  - town: walled, with a castle.
  Roads connect settlements first, then landmarks.
- **Buildings as voxel templates**, the same system as the castles:
  - cottage (stone footing, timber walls, stepped pitched roof);
  - longhouse;
  - tavern;
  - smithy;
  - chapel with a tower;
  - windmill (the sails as rotating 3D solids);
  - barn.
  Doors are walkable, as castle gates are now.
- **Around them:**
  - fences;
  - wells;
  - market stalls with awnings (3D solids);
  - fields with crop rows (a ground material with its own marks);
  - pastures fenced for animals;
  - docks on lakes.
- **At night:**
  - windows glow: a warm, emissive window material that lights the ground outside through the existing firelight path;
  - torches in the square.

### 3. People and animals

- **One figure rig for everyone.** Generalise `buildMerchant` into a figure builder with parameters:
  - clothing: robe, tunic and trousers, dress, armour;
  - cloth colours: new robe ramps;
  - hat: none, hood, cap, helmet, wide brim;
  - hair colour, beard;
  - height and build (children are smaller);
  - what they carry: staff, basket, spear, lantern, tool.
  Merchants stay as they are, as one kind of figure.
- **Villagers with a day.** Schedules by the clock:
  - at home at night (indoors, not drawn);
  - out at work by day: fields, the well, the market, the smithy;
  - wandering the square in the evening;
  - guards stand and patrol at town gates;
  - children run about.
  All of it is deterministic from seed and time. Talking (E) gives a greeting line through the existing panel, with no goods.
- **Animals:**
  - sheep and cows in pastures, wandering slowly;
  - deer in forests that bolt when you come close.
  Built from ellipsoid bodies, sphere heads and capsule legs, with a simple walk cycle.
- **Cost control:**
  - Figures and animals get a level of detail: the full rig up close, a 3–5 solid silhouette at distance.
  - Only figures within range are simulated in full.
  - Frame time stays within phase 1's budget: `tools/bench-v2.mjs`, all scenes at 60 fps in Chromium, Firefox and WebKit.

## Tests change with the world

`tools/test-sim.mjs` and `tools/check-verbatim.mjs` compare v2 with v1. Once world generation changes they stop applying:

- **Retire the world comparison.** Retire `check-verbatim.mjs` for the sections that change, and the world-identity part of `test-sim.mjs`.
- **Keep what still holds.** Keep the movement checks while the movement code is unchanged.
- **Add v2's own tests:**
  - generation is deterministic: the same seed gives the same world hash twice, and hashes are recorded for a few seeds;
  - no NaN or unreachable heights;
  - every settlement's houses, every gate and every door can be walked into from its road (extending the gate walks);
  - the scripted play session never falls through the world or gets stuck;
  - villager and animal positions at fixed times are deterministic.
- **Scenes.** Add scenes to `tools/scenes.json` for each region, a village by day and at night, a town gate, a pasture and a marsh in fog. Shoot them for review after each step.

## Order of work

1. **Design pass (one confirmation from Martin).**
   - Build the biome map and terrain shaping.
   - Shoot aerial views of 3–4 seeds plus one ground view per region.
   - Agree the regions and palette before going further.
2. **Land.** Materials and palettes, plants per region, bridges, then weather.
3. **Settlements.** Placement and roads, building templates, fences, fields, wells, docks, then night lighting.
4. **People and animals.** The figure rig, villagers and their schedules, animals, then level of detail.
5. **Finish.** Performance pass in all three browsers, docs (`docs/phase2.md`), and screenshots.

Commit after each step with screenshots. Keep `index.html` one self-contained file.
