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
