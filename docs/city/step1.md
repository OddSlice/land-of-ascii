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
