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

## Step 1b: castles round a church

Shots: `shots/phase4/step1/` (`sheet-castles`, `sheet-castle-inside`).

### What changed

- **Castles, towers and ruins are v2's own now** (v1's structures section retires from `check-verbatim.mjs`: its builders were replaced wholesale, which listed fixes cannot carry, since v1's page would call builders it does not have). The collision code that walks you through them is still v1's, and still checked.
- **A castle is built round a church** (`buildFortress`), in three sizes: small, fortress, and citadel.
  - A paved courtyard inside a curtain wall two thick, crenellated, with towers at the corners (and one in the middle of the west wall in the bigger two), flags on their tops.
  - A gatehouse in the middle of the south wall, its three-wide passage arched, in line with the church's door, so you walk from the gate straight up to the church.
  - **The church** (`buildChurch`, now in three sizes): a village chapel's size in the small castle, a bigger church (a deacon's door either side of the Royal Doors, four candle stands) in the fortress, and a cathedral with two small domes over its front corners in the citadel.
  - **The keep** (`buildKeep`) in the back left corner: a stair of wooden steps round the inside of its walls through a guard room (a table and a bench), a storeroom (barrels) and a chamber (a bed and a chest) to a bell chamber (open arches on every side, a bronze bell) under a pyramid roof, with arrow slits.
  - **The great hall** along the east wall (fortress and citadel): a long table with benches either side and the lord's chair at its head, a fire in the hearth at its end under a smoking chimney, banners on the walls (red or blue, a gold cross, a gold fringe) and torches between them that burn by day too.
  - A stair up the inside of the west wall to the wall-walk, and a well in the forecourt.
- **A tower on its own is a keep.**
- **A ruin is a ruined church** (`buildRuin`): its walls fallen to a ragged height, its roof and dome gone, a side broken through, rubble around, frescoes still on what stands.
- **New:**
  - bells (bronze, drawn as solids);
  - hearth fires (a campfire's logs, scaled down to the fire);
  - wall torches that burn by day (`sconce`);
  - painted banners (`MAT.BANNER`, painted like the frescoes).

  A castle's extra parts ride on its template (`T.extras`) and are put in the world by `structureExtras` and `structureLights`.

### Numbers

- **Speed**, painted look, on a quiet machine:

  | Scene | ms a frame |
  |---|---|
  | The fortress from above | 6.9 |
  | The citadel from above | 8.5 |
  | Inside the castle church | 5.3 |
  | The great hall | 5.1 |
  | The keep's bell chamber | 7.2 |

- **Workers and the main thread agree**, byte for byte in both looks.
- **Tests:** all pass, with the world checksums re-recorded. The gate walks now go through every new gatehouse into the church, and through every tower's door into the keep, on the same paths in v1 and v2.

### Scenes

- The castles moved (the new ones are bigger, so they sit on other sites), and took the field where the hero scenes stood, and the village of the village scenes.
  - The hero scenes now stand before the fortress's gate.
  - The village, tavern and chapel scenes moved to the village at (976, 868).
- New scenes: `castle-fortress`, `castle-citadel`, `castle-church`, `castle-hall`, `castle-hall-night`, `castle-keep`.

### Still open

- **The walls' insides are plain:** no arcaded galleries yet.
- **Castles still sit where v1's placement puts them,** bunched in the east. Step 2 spreads them over the world, with a town at each.

## Step 2: a castle to each part of the land, a walled town at its foot

Shots: `shots/phase4/step2/` (`sheet-towns`, `sheet-in-town`, `sheet-wild`, `sheet-maps`; the mosaic look in `mosaic/`).

### What changed

- **A castle to each part of the land** (`placeCastles`). Every site on an eight-cell grid is judged as a castle with a town before its gate. A good site is:
  - commanding: it stands above the land round it (against the land's mean height within some 40 cells), and above its town;
  - over a river or a shore where it can be (water 30 to 80 cells off);
  - dry, and not too rough to level (the land under the castle varies by 30 at most);
  - with room at its foot for a town: the land falls from the castle to the town's gate no more steeply than a street can climb (0.8 up for 1 along), and strays little from that slope.

  The best sites are taken in turn, each at least 300 cells from every other, up to eight: five to seven a world. The best site with room for it holds the citadel, the next best with room up to three fortresses, and the rest small castles. Before, seed 42's four castles all stood in its eastern half (see `sheet-maps`).
- **Castles face their towns.** A castle is turned so its gate faces its town, whichever way that lies (`turnTemplate` turns a template and everything riding on it: domes, candles, bells, flags). The gate torches turn with it (`placeLights` is v2's own now; v1's put every torch on the south side).
- **A walled town at every castle's foot** (`buildTown`), 41 to 55 cells wide and 42 to 50 deep:
  - a square before the castle's gate, as wide as the town;
  - the main street, from the square down through the town to the town's gate, climbing with the land;
  - a market street across the town halfway, opening into a market square with a well where it crosses the main street, torches at its corners;
  - lanes inside the side walls (at first: they went after step 2, see below);
  - the ground inside the walls levelled to the street's slope (level across the town, falling from the castle to the gate), and blended back to the land outside;
  - houses packed into the blocks between the streets, each where it fits most snugly against the streets, the walls and the houses already there (so they stand in rows), its door on a street, its plot levelled with the street before its door. The church and the tavern stand on the market, a smithy toward the gate, and homes fill the rest, most of them townhouses: two storeys, timber-framed, windows on both floors, a beam at the storey line. A small castle's town has no church of its own (the castle's chapel serves it);
  - a wall five high with crenels, a tower at each corner and a gatehouse over the main street with a torch either side, its ends meeting the castle's corners; flags in the castle's colours on its towers;
  - 8 to 18 houses (7 to 17 since the fix after step 2); windows glow and torches burn at night, chimneys smoke;
  - fields round it: no trees within 22 cells of its walls.
- **Where you start:** before the gate of the biggest castle's town, looking up its street to the castle (`spawnAt`, through a listed fix to v1's `spawn`), where the ground behind you is open, so the camera shows you the town.
- **Watchtowers on the passes** (`placeTowers`). Once the roads are laid, a tower stands beside every road that climbs 8 or more above both its ends, near the top of the climb, 11 to 20 cells off the road, its door toward it. Where fewer than three roads cross passes, the high points of the longest roads get one. Three to five a world, 90 apart at least. A tower's levelling never touches a road, and the way from its door is walkable.
- **Ruins in the wild** (`placeWild`): ruined churches, first only in forest, pine forest, marsh or badlands, at least 44 cells from any road and 80 from any town or village, 150 apart, turned any way. Standing stones keep 90 apart and off the roads. Neither has a road to it any more: you come upon them.
- **Villages and hamlets** fill the land between the castles, as before.
- **Roads** still run between the towns, villages and hamlets (v1's road builder: step 3 redoes them). A castle and its town meet the roads at the town's gate; a road laid twice (the castle and its town both asking for it) is kept once.

### Numbers

- A world generates in 2.1 to 2.4 s, as before.
- **Speed**, painted look. ⚠️ The Claude app and Chrome were busy in the background.

  | Scene | ms a frame |
  |---|---|
  | The citadel's town from outside its gate | 7.5 |
  | Up the street (third person) | 5.3 |
  | The market square (third person) | 6.1 |
  | The citadel and its town at night, from above | 9.0 |
  | A small castle's town | 7.9 |
  | The citadel from behind | 8.0 |
  | A village (third person), for comparison | 5.6 |

- **Workers and the main thread agree**, byte for byte in both looks, on all nine new scenes.
- **Tests:** all pass, with the world checksums re-recorded.
  - Gate walks go through every castle gate and tower door, whichever way they face, on the same path in v1 and v2.
  - House walks go into all 553 houses of every town, village and hamlet on the five test seeds (on seed 42, on the same paths in v1).
  - The third-person walk from the start goes through the town's gate. It found a camera bug: the camera checked the way back from the hero in quarter-cell steps but not its own spot, so under the gate's arch it could end just inside the ceiling. It checks its own spot now.

### Scenes

- Every scene was re-aimed:
  - the castle scenes to seed 42's fortress at (360, 224) and its citadel at (40, 808);
  - the village, tavern and chapel scenes to the village at (828, 884);
  - the hero scenes to the start, before the citadel's town gate;
  - the bridge scenes to seeds 31337 and 1234 (seed 7's bridges went with its old roads);
  - the six classic scenes by `find-views.mjs --classic`, whose vista now looks over a town at its castle.
- New scenes: `town-citadel`, `town-street`, `town-market`, `town-night`, `town-small`, `tower`, `ruin`.
- `tools/map.mjs` draws each castle, town, village and hamlet as its footprint, and towers, ruins and stones as dots.

### Still open

- The roads are still v1's, straight in places and with right angles: step 3.
- Every town has the same plan (a main street, a market street, lanes). On a steep slope the houses' footings show along the street.
- Watchtowers stand where the roads happen to climb; once step 3's roads go over real passes, they will mean more.
- Seed 1234 has no site with room for a citadel, so it has fortresses and small castles only.
- The castle walls' insides are still plain (no galleries).

## After step 2: the camera in the towns

Martin, trying step 2 (30 Sep): looking around felt glitchy and skipping, like a fish lens looking down; the game moved the camera by itself. It had worked in the version before.

Shots: `shots/phase4/step2/sheet-camera` (the same walk through the town's gate, before the fix and after).

### What was wrong

- The camera's code had hardly changed (step 2 added one check, of its own spot). What changed is where you play: you now start before a town's gate and walk straight into its streets.
- The camera stays 6.4 cells behind you and comes in closer when something is in the way. In the town's gate, three cells wide, and its streets, five wide, almost any turn of the mouse put a house or the gate's wall in its way:
  - it snapped in to about 2 cells in a single frame;
  - there, the back of the hero's head filled the picture, looking down at it (the fish lens);
  - it drifted back out over a second or two, only to be caught again.
- Step 1's start was an open field, where this was rare; the same happened in its castle's gate.

### The fix

- **Room in the towns:**
  - the main street and the market street are seven wide (they were five);
  - the town's gate and the castle's gate are five wide (they were three);
  - the narrow lanes inside the side walls are gone: the houses back onto the walls;
  - houses line the main street first, then the squares, then the market street.
- **The camera:**
  - it never shows the hero from closer than 2 cells: squeezed nearer, it goes into their eyes (before, the back of their head filled the picture);
  - when a wall stops it, it no longer rises to clear the ground beyond the wall (that rise made it look steeply down from close up);
  - it comes back out faster once the way is clear;
  - after a jump in place (a new world with R), it starts afresh behind you instead of swooping in from where it was.

### Numbers

- Turning a full circle at fixed spots in the citadel's town: the share of directions in which the camera ends up closer than 3 cells (in brackets, those in which the hero is hidden).

  | Spot | Before | After |
  |---|---|---|
  | The town's gate | 69% (53%) | 47% (0%) |
  | The upper street | 42% | 0% |
  | The market | 10% | 0% |
  | The castle's gate | 53% (42%) | 33% (0%) |

- A 27-second tour of the town (in through the gate, up the street looking about, a full turn, along the market street and back):
  - the hero shown from closer than 2.5 cells on 17 frames (70 before);
  - looking down more than 30° on none (36 before);
  - 9 snaps of more than a cell (12 before).
- ⚠️ The towns hold fewer houses: 7 or 8 in a small castle's town (10 to 12 before), 8 to 11 in a fortress's, 14 to 17 in the citadel's.
- ⚠️ On the steep forest walk of the tests, you see through the hero's eyes on 68 frames where before the back of their head filled the picture. The camera is where it was.
- Tests: all pass, with the world checksums re-recorded. The house walks go into all 501 houses on the five test seeds.
