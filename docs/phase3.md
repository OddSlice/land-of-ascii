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
