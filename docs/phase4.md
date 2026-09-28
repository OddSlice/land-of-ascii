# Phase 4: a world that makes sense

Martin's direction after phase 3 (28 Sep), once friends could play it at https://oddslice.github.io/land-of-ascii/:

- structures need a fundamental redesign: castles are blocks of random stuff inside. Make castles make sense, taking inspiration from the inside of Orthodox churches;
- the transitions between grounds are a bit random;
- roads should make more sense;
- mountains should be climbable;
- castles should spread out;
- and two fixes first: the hero's walk did not animate, and the legend needed a better UI, explaining the two styles (L) and the resolution (− / +).

What was there at the start: castle rooms were empty stone boxes; every castle, tower and ruin on seed 42 sat in the eastern half; roads ran in straight lines and right angles like a city grid; nothing steeper than 56° could be walked up, with no paths up the mountains; regions met in random patches.

The plan, agreed the same day ("go"), one commit with screenshots per step:

1. **Castles with a purpose, a church at their heart**, after Bulgarian fortress-monasteries such as Rila and Tsarevets:
   - a gatehouse, a courtyard with the church in the middle, a hall, living wings with arcaded galleries, a tall keep;
   - the church Orthodox: a cross plan with a central dome on a drum and smaller domes, striped stone-and-brick walls, arched windows; inside, the nave under the dome with a chandelier of candles, the iconostasis (the screen of icons with the Royal Doors) before the altar in a rounded apse, frescoed walls, candle stands, light from high windows;
   - rooms with a job: a great hall with a long table and a hearth, a guard room, a bell chamber;
   - ruins become ruined monasteries; village chapels get a small iconostasis and candles.
2. **Castles spread across the whole world, each with a town:** one castle to each part of the land on a commanding site, a walled town at its foot, towers on the passes, ruins in the wild.
3. **Roads that make sense:** a main road between castles and towns and lanes to villages; winding smoothly, climbing in switchbacks, joining at junctions, crossing rivers where they are narrow.
4. **Ground that reads:** borders that follow the land (sand only by water, rock and scree on steep slopes, meadows in valleys, snow by height), with no random speckles.
5. **Mountains you can climb:** trails and passes the easy way, and scrambling up steep slopes, slower the steeper it gets (Martin said go to the recommendation of both).

## Before step 1: the walk, and the legend

- **The hero's walk did not animate in the game** (only in the test harness). On the very first frame there is no earlier position to measure a step from, and the speed became "not a number" there and stayed so, so the hero never counted as moving. The step is now measured only from a real earlier position, and the speed can never stay broken. A new test starts the way the game does (the harness had always taken one extra zero-length step first, which hid it).
- **The legend** (bottom left) replaces the help line:
  - the keys in groups (move, camera, world, style, detail), drawn as key caps;
  - each switch's choices, the current one lit in amber: walk or fly, your hero or your own eyes, time ×1 or ×10, painted or mosaic, the four cell sizes 5×10 to 8×16, the view distance;
  - a line on what the current style and detail mean (painted: soft colour, a letter in each pixel; mosaic: crisp glyphs, two colours to a cell; smaller cells are sharper and slower, bigger ones softer and faster);
  - a note at the top of the screen whenever a setting changes, saying what it is now and what that means;
  - H folds it away (remembered in the browser).
- **The start card** shows the main keys the same way, and on a touch screen says that the game needs a keyboard and a mouse.
- **The stats box** (top left) has the legend's darker panel, so its labels read over bright ground.

## Step 1a: the church (in the village chapels)

Shots: `shots/phase4/step1/` (`sheet-chapel`).

The church comes first, because the castles will be built round it (step 1b). It first stands in the villages: every village chapel is now a small Orthodox church (`buildChapel`).

### What changed

- **Walls two layers thick:**
  - outside, stone striped with brick (a course of brick every third), as in Byzantine and Bulgarian churches;
  - inside, frescoes up to the windows, and a starry vault above.
- **A drum** rises through the tiled roof over the nave. It is windowed and open below, so from the nave you look up into it. A smooth dome (gold or lead) and a gold Orthodox cross (three bars, the lowest slanting) stand on it.
- **A rounded apse** behind holds the altar.
- **The iconostasis** closes the sanctuary off from the nave: four icons, the Royal Doors between them, a row of small icons and a gilded crest.
- **Candles:** two candle stands before the iconostasis, and a horos (a ring chandelier of candles) hung on chains from the drum. They burn by day too, since a church is dark inside, and light the room.
- **New materials:** brick, marble (the floor, checkered with stone), fresco, icon, gilding and the starry vault, with day, dusk and night colours.
- **Painted walls** (`paintedWall`). The colour of each ray where it meets a fresco or an icon comes from where it lands on the wall, so both looks show the figures:
  - frescoes: a painted hanging in folds, ochre bands, and saints on lapis blue (a robe in folds, a face, a gold halo);
  - icons: figures on gold in gilded frames, a row of large ones and a row of small ones.

  A fresco is lit by the room and the candles without turning orange. Frescoes and icons always stand on the floor, so their figures are placed by height above the foot of the wall.
- **Solids:** domes are a new kind of solid (`K.DOME`); candle stands and chandeliers are drawn with the lights (`candlesAt`). A candle's flame has no halo of its own at night; its stand's light warms the room.
- **Speed:** a thin solid (a chain, a candle) that passes the lens is no longer drawn over the whole screen. Standing right under a chandelier, drawing the solids fell from 8.4 ms to 2.0 ms.

### Numbers

- Inside the chapel: 7.4 ms a frame (7.7 ms facing a frescoed wall). The village around it: 9.5 ms. ⚠️ Measured with Chrome busy in the background.
- Workers and the main thread give byte-identical frames in both looks.
- Tests: all pass, with the world checksums re-recorded. The house walks go into every chapel (and every other house) on every test seed.
