# Phase 3: your hero in a bigger world

Martin's direction after step 2 of phase 2 (28 Sep), the first thing that sets Land of Ascii apart from its Glyphmoor reference:

- play in the third person, seeing your character from behind as in Ocarina of Time, and what you buy changes how your character looks;
- the world feels too small ("tall as a mountain, crossing three mountains and five castles in 30 seconds"): it should take time to cross a land, with things spread out, big open spaces and more distinctive colours, after Ocarina of Time;
- the flicker as you pass, mostly on water and mountains, is very annoying;
- then continue with the settlements.

The plan, agreed the same day, one commit with screenshots per step:

1. **A steady picture:** fix the flicker.
2. **A bigger, more open world:** a map with four times the area, landforms twice as big, landmarks spread out with open fields between them, walking a little slower, and bolder colours by region.
3. **Third person:** a camera behind and above your hero that the mouse swings around; the hero turns to where it walks; V switches back to first person.
4. **Gear on the hero:** what you buy shows on your character (cloak, boots, a lantern that lights the night, and new things to buy).
5. **Settlements**, the old step 3 of phase 2: villages and towns in the open fields.

## Step 1: a steady picture

Shots: `shots/phase3/step1/` (`sheet-before-after.png`). Flicker is motion, so stills cannot show it; the numbers below are the proof, and walking about is the test.

### What flickered, and why

Flicker was measured with `tools/flicker.mjs`: walk the camera forward (or turn it) with time frozen, and count the pixels that blink, changing and changing back a frame later. Blinks were traced to their rays, frame by frame, until each cause was found:

- **The ground was sampled at set distances from the eye.**
  - As you walked, every sample slid over the ground, so the slopes between samples, the light and the colours wavered.
  - Where the sample spacing doubled (at fixed distances), the heights were not yet smoothed to match, so the change showed.
- **A step whose previous sample was hidden was drawn flat**, not as a slope. Whether that sample was hidden changed from frame to frame.
- **How a step was drawn depended on how many screen rows it covered** (a wall, a banded rock face, or a slope). As ridges in front shifted a row, the choice flipped.
- **The foot of a wall was found by halving its step six times**, and the rounding made it hop back and forth.
- **Each pixel's letter came from the march step's ground, not from where its ray landed**, so letters flickered at every material edge.
- **The letter tint flipped between darker and lighter** at one brightness.
- **Water:**
  - the ripple was fixed to the screen, not to the water;
  - the mirror jumped a row at a time;
  - where a sample of the mirror could not be used (water, or something in front), the whole reflection snapped to the sky's colour.
- **Thin things** (fronds, stalks, twigs and trunks far off) were thinner than two rays, and fell between them.

### What changed

- **The march samples the ground where each ray crosses the lines of the height grid** (`ddNext`), across the set of lines it runs across most.
  - The spacing is half a cell at your feet, then a cell, then 2 and 4 cells further off.
  - Those points are fixed to the ground, so they stay put as you walk.
  - Each spacing starts where the heights are averaged to that size (`mipLevel`, `DD_*`), so the change of spacing does not show.
- **The light far off is averaged the same smooth way** (`marchShade`), never switching at a set distance.
- **The ground at the previous step is always known** (`prevGround`): a step is always a slope from the ground before it.
- **How a step is drawn depends only on the lie of the land:**
  - A wall is chosen by its steepness, near and far alike (`wallAt`).
  - Rock banding fades in with steepness.
  - The foot of a wall is read off in proportion within the last bracket of the halving.
- **Letters:**
  - Each pixel's letter is that of the ground where its ray lands.
  - The tint turns over gradually.
  - Letters fade out between 60 and 160 cells away, so far land is smooth paint and the text is for up close.
- **Water:**
  - The ripple is fixed to the water and calmer.
  - The mirror is read between rows.
  - An unusable mirror sample is made up by the sky for its own share only.
- **Plants' parts are never thinner than 2.4 rays across** (`THIN`).

### Numbers

Blinking pixels per frame, as a share of the picture (painted look, 1440×900, walking a step of 0.117 cells a frame):

| Walk | Before | After |
|---|---|---|
| Badlands | 0.21% | 0.028% |
| Snowy peaks | 0.20% | 0.033% |
| Castle valley | 0.14% | 0.036% |
| The boardwalk over the bay | 0.19% | 0.051% |
| Over the sea toward the cliffs | 0.60% | 0.061% |
| Marsh | 0.38% | 0.093% |
| Seed 42 from the air | 0.10% | 0.06% |

Turning while walking (0.23° a frame):

| Walk | Before | After |
|---|---|---|
| Castle valley | 1.0% | 0.44% |
| The boardwalk | 0.95% | 0.55% |
| Snowy peaks | 0.27% | 0.16% |

So walking flickers 3 to 10 times less, and turning about twice as little.

### Speed

- About the same as before.
- It was measured side by side with the phase 2 version on the same busy machine: Martin's Chrome was running the game throughout, so these frame times run high.

| | Before | After |
|---|---|---|
| Chromium | 7.9–9.6 ms | 7.2–9.4 ms |
| Firefox | 11.7–14.5 ms | 12.9–15.9 ms |
| WebKit | 10.5–17.8 ms | 10.1–21.0 ms (as noisy as ever) |

- A first version sampled every line and kept the finest spacing longer. It doubled the march's cost, until it:
  - sampled one set of lines per ray;
  - averaged the heights sooner;
  - replaced a logarithm at every step with a straight-line fit.
- Workers and the main thread give byte-identical frames in both looks, across 14 scenes.

### Tests and tools

- **All tests pass.** The worlds are unchanged (this step touched only the renderer).
- **`tools/flicker.mjs`** counts a letter change only where the letter shows. It splits blinks by:
  - an edge moving, or only the colour;
  - a letter, a colour, or a tint;
  - water, faces or ground;
  - which kinds of thing traded places.

  It can measure another copy of the game (`PAGE=zz-before.html`).
- **`tools/profile-v2.mjs`** profiles the renderer on the main thread (`?threads=0`), also for another copy (`PAGE=`).

### Still open

- **Turning** still crawls a little: detail slides across the pixels as the view turns.
- **In the marsh**, pool shores and small flowers far off still flicker a little.
- **Walking through a palm's crown** at head height flashes its fronds by. The third-person camera (step 3) sits above them.

## Step 2: a bigger, more open world

Shots: `shots/phase3/step2/` (sheets: `sheet-regions`, `sheet-classic`, `sheet-aerials`, `sheet-more` for bridges and weather, `sheet-maps`).

### What changed

- **The world is 1024 cells across**, four times the area (`W`, one of v1's constants, through a listed fix).
- **Its landforms are twice as wide and 1.7 times as tall** (`LAND`, `LIFT`).
  - Mountains reach 238 (they were 140).
  - The climate, the regions and their borders, mesas and washes, coasts, beaches, sea cliffs, forests, the patches of rough and dry ground, and the valleys the dawn fog fills all grow with the land.
  - The base terrain uses `fbmLand` (the helpers' `fbm`, twice as wide).
  - Small things keep their size: marsh hummocks, a rock's ragged edge, a terrace's 7-unit step.
- **Landmarks are spread out.** There are as many castles, towers, ruins and stone circles as before in four times the land, so they stand about 2.7 times further apart.
  - Roads reach twice as far, 440 instead of 220 (listed fix).
  - There are four rivers instead of two (listed fix).
- **Open fields.** Grassland is smoothed toward the lie of the land much more (0.7, was 0.45), into broad green fields after Hyrule Field. It has fewer dry patches, the odd lone tree, and few groves.
- **Walking is a jog, 5.5 cells a second** (was 7), and sprinting 9.5 (was 12), so crossing the world takes about three minutes on foot. Flying is faster: 70 (was 45).
- **Bolder colours**, after Ocarina of Time:

  | Ground | Colour |
  |---|---|
  | Fields | vivid yellow-green |
  | Rough grass | its own deeper green |
  | Dry grass | golden |
  | Canopies | richer greens |
  | Pines | deep teal |
  | Red rock | a saturated orange canyon |
  | Water | a brighter lake blue |
  | Sand | warm |
  | Sky | a little more saturated |

  Dusk and night keep their hues with the same ramps a little more saturated.
- **Where you start** (`spawnAt`, listed fix): in front of the biggest castle's gate, at the furthest spot up to 20 cells out from which you can walk straight to the gate. v1's 14 cells out could land in a gully between badland terraces.
- **A terrace's face is its rock rim**, not the grass on its top (`wallAt` prefers a rock cell among the higher ones). Before this, golden streaks ran down the red walls.

### Bugs the bigger world found

- **v1's road finder** took a row of its half-size grid to be 256 cells, which was only true of a 512 world. It drew every road as a straight line from one edge of the map to the other, and every crossing of water became a bridge (188 of them). It also gave up after 80,000 steps. Both are fixed through listed fixes.
- **Lighting a four-times-bigger world** took 20-40 ms, done every 0.2 s, and stuttered the view. It is now worked out a slice at a time over 12 frames (about 2 ms each) into a second buffer, then swapped in. The sun's view comes first, then every cell's light. The rows of each slice are whole numbers: a first try with fractional rows made every read slow, taking 500 ms. With the clock running, the worst frame gap is 23 ms (it was 42).

### Numbers (seed 42)

| | Before (phase 3, step 1) | After |
|---|---|---|
| World | 512 × 512 | 1024 × 1024 |
| Highest peak | 140 | 238 |
| Plants | 8,677 | about 33,700 |
| Generating a world | 0.5 s | 2.3 s |
| Memory | about 70 MB | about 130 MB |
| Bridges | 1 | 4 (and 15 on the five test seeds) |

### Tests

All pass, with the worlds re-recorded.

- **v1's movement** stays bit-identical on the bigger world. v1's page runs at 1024 with ten listed fixes: map size, rivers, speeds, road reach, the road finder, and the spawn. It is given the spawn rule, as it is given `deckAt`.
- **The "never stuck" check** now tells walking into a cliff (a rise too high to step up right ahead) apart from being stuck.
- **The tools** read the world's size from the game (`TV.defs.W`) instead of assuming 512.

### Flicker and speed

- **Flicker on the new land, walking:**

  | Walk | Blinking per frame |
  |---|---|
  | The open field | 0.005% |
  | The boardwalk | 0.020% |
  | The castle valley | 0.031% |
  | The badlands | 0.066% |

- **Speed**, measured while Martin's Chrome ran the game at full tilt in the background, which slowed every browser by about 40% in earlier comparisons:
  - Chromium: 8.4-12.5 ms a frame.
  - Firefox: 12.3-17.1 ms, 45-55 fps.
  - ⚠️ Firefox is below 60 fps while the machine is that busy. It needs a measurement on an idle machine.

### Still open

- **A new world takes 2.3 s to generate** with nothing on screen. A "building the world" message would help.
- **The golden tops of badland terraces meet the rock in a scalloped edge.**
- **The sea-cliffs, bridge and weather scenes are placed by hand** for seed 42 (and 31337's boardwalk).

## Step 3: third person

Shots: `shots/phase3/step3/` (sheets: `sheet-hero`, `sheet-moves`, `sheet-first-third`, `sheet-looks`).

### What changed

- **You see your hero**, from behind and above as in Ocarina of Time (`buildHero`): golden hair, a green tunic with a belt, brown trousers and dark boots, built from the same spheres, capsules and cones as the merchants.
  - They turn to face the way they walk, smoothly, over about a third of a second.
  - Their legs and arms swing with the distance walked.
  - In a jump the stride stops, the knees come up and the arms go out.
  - A soft shadow lies on the ground under them, also in a jump.
  - In water they wade, drawn up to their thighs in it: in v1, water is a floor you walk on, and that has not changed.
- **The camera** sits 6.4 cells behind the hero, along the way you look. It looks at their head, so they stand in the lower middle of the picture with the land ahead above them.
  - Mouse left and right swings it around the hero.
  - Mouse up and down raises and lowers it: from just below head height to 49°, and 11° when you look level.
  - **Rising ground behind lifts the camera over it**, as in Ocarina of Time: at once as the ground comes up, easing back down after.
  - **Walls, and slopes too steep to rise over, bring it closer**, at once. It eases back out when the way is clear, and keeps a little room from walls to either side.
  - **Squeezed right up behind the hero**, backed into a wall or at the foot of a cliff, it slides into their eyes.
  - It follows the hero's height a little behind, so you see them jump and step up, and the picture does not jolt.
- **Plants never hide your hero.**
  - A plant between the camera and the hero, over them on screen, is drawn with every other ray, so it is see-through.
  - Plants right at the lens are drawn with one ray in four, or not at all where they touch it.
- **V** switches between your hero and your own eyes. Flying is always your own eyes. The help line says so (listed fix).
- **The simulation is untouched.** `cam` is still your eyes, and v1's movement moves them. The renderer draws from `viewCam`, the camera behind the hero, and gets the hero's pose with every frame.

### Why the camera stops at 49°

The renderer tilts the view by sliding the picture up and down (a shear, as in the classic ray-casters), not by turning it. Every column of the picture stays one upright slice of the world, which is what makes the march fast.

A shear looks right up to about 45°. Beyond that it stretches everything upright: at 60°, trees became tall bands. So:

- the camera rises to 49°;
- the view tilts at most 51° (v1's mouse allowed 44°);
- past that, the camera comes closer instead.

### Numbers

- **Tests:** four scripted walks, 2,100 steps in all:
  - from the start through the castle gate, then backing into its walls;
  - down and up a steep hillside;
  - through a pine forest;
  - across the open field.

  The camera was never inside the ground (at least 0.47 above it) or a building. The hero faced the way they walked, within 6° while you turn.
- **Squeezed into the eyes:** only where the script backs the hero into the keep's walls, and on none of the 1,320 steps of the other three walks. A first try that allowed only v1's tilt went into the eyes on 177 of the 480 steps through the pine forest.
- **Workers and the main thread give byte-identical frames in both looks,** across six scenes and four moves (walking, walking sideways, walking back, jumping).
- **Speed:** third person costs about the same as first person, since the view from behind and above sees less far land. Measured side by side while Martin's Chrome was busy in the background:

  | Scene | Your own eyes | Your hero |
  |---|---|---|
  | The road | 9.6 ms | 9.2 ms |
  | A merchant | 8.8 ms | 9.1 ms |
  | Grassland hill | 8.0 ms | 8.0 ms |
  | Snowy peaks | 7.1 ms | 8.8 ms |
  | Badlands | 9.3 ms | 11.0 ms |

  On a quieter run, the same third-person views took 5.5–7.2 ms.

### Tests and tools

- **`test-sim.mjs` section 6** walks the hero with the third-person camera stepped every frame. It fails if:
  - the camera goes into the ground or a building;
  - the hero does not face the way they walk;
  - V or flying does not give back your own eyes.
- **`shoot.mjs`**:
  - `--third` puts the hero where a custom camera stands. With scene names, it draws those scenes in the third person (`<name>-3rd.png`).
  - `--walk KeyW+Space --frames 14` holds keys for some frames before the shot, for poses (`<name>-w+space-14.png`).
- **`bench-v2.mjs --third`** times scenes in the third person.
- **Scenes:** `hero`, `hero-start`, `hero-forest` and `hero-dusk` are third-person scenes (`third: true`). The scene helper switches them to walking once the camera is placed.
- **`TV` exports** `setThird`, `updateHero`, `view3`, `viewCam`, `hero`, `terrainHeight` and `solidAt` for the tools.

### Still open

- **The hero's green tunic is close to the fields' green.** Tunics in colours come with step 4.
- **The camera goes into your eyes** on slopes steeper than about 50° and with your back to a wall.
- **Looking down steeply** (high over a slope), upright things stretch a little: the shear.
- **Rivers in steep gorges** make busy pictures from above.
- **Near the camera:**
  - a flower right at the lens is a big flat blob;
  - a wall beside the camera can fill a side of the picture (a standing stone by the road, in `sheet-first-third`).
- **At night the hero is dark** until the lantern of step 4.
