# Phase 5: a lived-in world

Martin's direction (30 Sep), after true perspective: back to adding more to the world. An inventory, like an RPG's, to see what you bought, and to eat the cheese; then the next phase of filling the world with things.

The plan, agreed the same day (his choices from three questions: food gives a small boost, merchants buy back at half price, and objects come before animals and people):

1. **Your bag.** I opens it: everything you have bought, in groups (worn, carried, food and drink, odds and ends). Eat or drink food: your hero lifts it to their mouth, and you are well fed for a while (you sprint faster). Wear or take off, carry or put away: you choose what shows on your hero. Merchants buy what you have for half its price.
2. **Farms and village life (objects).** What the phase 2 brief listed and was never built: fields with crop rows, fences and pastures by villages and hamlets, haystacks, woodpiles, carts and barrels, market stalls with awnings in the town squares, a windmill with turning sails, docks on lakes, signposts at crossroads. Built in two parts: 2a the farms (fields, pastures, haystacks, windmills), 2b life in the villages and towns (stalls, barrels, woodpiles, carts, signposts).
3. **Animals.** Sheep and cows grazing the pastures, deer in forests that bolt when you come near.
4. **People.** Villagers with a day (fields, the well, the market, home at night), guards at the town gates, a greeting when you talk to them.

After it, phase 4's last steps: roads that make sense, ground that reads, mountains you can climb (`docs/phase4.md`).

## Step 1: your bag

Shots: `shots/phase5/step1/` (`sheet-bag`: the bag and a merchant's panel; `sheet-eat`: eating the cheese).

### What changed

- **I opens your bag** (and I or Esc closes it). It is drawn on the trade panel, and the game waits while it is open, as it does while you trade. What you have is listed in groups, with how many:
  - **worn:** cap, cloak, boots and tunics, each worn or in the bag (Take off, Wear). Wearing another tunic takes the one you had off; taking off your tunic puts the green one back on;
  - **carried:** lantern, sword, shield, rope, kettle, map (Put away, Carry). The lantern lights the way after dark only while you carry it;
  - **food and drink:** bread, cheese, salted fish, cider (Eat, Drink), each with how long it keeps you well fed;
  - **odds and ends:** candles, the lucky pebble.
- **Eating.** The bag closes so you see it: your hero holds the food up beside their head (so it shows from behind), brings it to their mouth for two bites, and it gets smaller after each; 1.8 seconds in all. Bread, cheese, a fish and the cider flask each have their own shape in the hand. A note at the top says what you ate and how it tasted.
- **Well fed.** Bread keeps you well fed for 1:30, cheese 3:00, salted fish 2:00, cider 1:00, adding up to 5:00 at most. Well fed, you sprint a quarter faster. The HUD shows FED and the time left while it lasts; the bag says it too.
- **Selling.** A merchant's panel lists their goods to buy, and below, what is in your bag to sell, for half their own price for it (or half what it usually costs, if they do not sell it). Selling what you wear takes it off your hero. Before, gold only ever went down.
- **Your bag goes with you to a new world** (R), as your gold does. (Before, a new world's merchants forgot what you had bought from theirs, so you started with nothing on.)
- The legend and the start screen name the I key.

### How it is built

- `bag` holds what you have (`items`: name, count), what you have taken off or put away (`off`), how long you stay well fed (`fed`) and what you are eating (`eat`). `ITEM` gives each good its group and, for food, its time and taste. `updateGear` reads the bag, so what shows on your hero follows it.
- Buying and the merchant's list are v2's own now (`renderGoods`, `buy`, `sell`, `sellPrice`); `check-verbatim.mjs` no longer compares v1's (v1 2127-2152), and still checks the rest of v1's talking, HUD and world lifecycle.
- The sprint is v1's movement code: well fed, it runs `fedSprint()` times faster, a listed fix in `tools/lib/v2-fixes.mjs`. The tests give v1 a `fedSprint` that is always 1, so v1's movement and v2's still agree.
- The renderer gets how far through a bite you are and what you eat with the hero (`hero.eat`, `hero.food`); `buildHero` raises the right arm and puts the food in the hand.
- `tools/shoot.mjs` takes `--js 'code'`: run in the page before each shot (as `TV`), a frame then drawn; with `--hud`, panels show. It is how the shots of the bag and the bite were taken.

### Numbers

- Tests: all pass. A new one fills a bag and checks that what you own shows on your hero, that what you put away does not (the lantern), the tunic bought last is worn and taking it off puts the green one back, eating takes one and makes you well fed and sprint faster while the hand lifts the food, a merchant pays half, and the bag goes with you to a new world. v1's movement still agrees with v2's.
- Workers and the main thread agree, byte for byte, with each food in the hand.
- The bag costs nothing to draw: it is a panel, and the hand's food is a solid or two.

### Still open

- ⚠️ Through your own eyes (V) you do not see yourself eat; only the note says so.
- ⚠️ From behind, the food shows while it is held up; at the mouth, your hero's head hides it.
- Candles and the lucky pebble do nothing yet.

## Step 2a: farms

Shots: `shots/phase5/step2/` (`sheet-farms`: a village in its fields, a pasture, a windmill, where you start, and the mosaic look).

### What changed

- **Farmland round every village, hamlet and town** (`placeFarms`), in blocks of 12 cells squared on the settlement's middle, out to 30 cells past a village's edge (20 for a hamlet, 26 for a town). Only gentle, dry ground takes it: no roads (nor a cell either side), no water, no footprints, nothing steep, nothing far above or below the settlement. Trees keep off it.
- **Fields** (most blocks): strips three or four cells wide of **wheat** (half of them), **greens** and **ploughed soil**, the rows running one way over each block, a row to a cell. Rows are drawn lighter and furrows darker, fading out by 64 cells, in both looks; between the rows of greens lies bare soil. Wheat takes the straw of the thatched roofs, and letters of its own in the painted look.
- **Pastures** (about one block in six): grass, fenced round the edge with posts and two rails that follow the ground, and a gate of two cells on the side toward the settlement. The fences stand in the way, as tree trunks do. The animals come in step 3.
- **Hay meadows** (about one in ten): two to four round haystacks, which you cannot walk through.
- **A windmill for each village**, where the land allows: on the highest ground of its farmland that is out in the fields (most of the ground round it could be farmed) and clear of the roads. A round plaster tower on a stone footing, tapering up, a thatched cap, a door and a window toward the village, and four sails, each a stock and a sail of slats, turning slowly to face the village. Trees keep further off it. On seed 42, two of the three villages have one; the third has no open rise.

### How it is built

- `world.farm` holds what grows on each cell (`FARM`, plus 8 where the rows run along z); `paintGround` turns it into the fields' materials (`MAT.WHEAT`, `GREENS`, `SOIL`, and the 2s for rows along z). The renderer draws the rows from where each ray lands (`rowStripe`, `FIELD_ROWS`, `FIELD_SOIL`): in the march, near and far, and in the painted look's colours.
- Fences, haystacks and the sails are **props**: `world.props` (where, which way, how big, what), in buckets as the trees are, built into solids near the eye (`buildProp`). A fence's posts stand on the ground under each; far off (past 70 cells) a fence has half the posts, and past 120 none (it would be thinner than the rays). The cells a fence or a haystack stands on go into the walking mask after the trees (`world.propBlocks`).
- The windmill is a structure (`buildWindmill`), turned to face its village; the renderer draws and walks it as any other.
- New landmark scenes, aimed by `node tools/find-views.mjs --landmarks --write`: `windmill` and `fields`.

### Numbers

- Seed 42: 9,800 cells of fields (5,400 of wheat, 1,800 of greens, 2,500 ploughed), 1,250 of pasture in 8 pastures, 2,600 of hay meadow with 68 haystacks, 45 runs of fence, two windmills.
- Tests: all pass, with the world checksums re-recorded (the heights under the windmills, the ground's materials, fewer trees, the fences and haystacks in the walking mask, the windmills among the structures). Every gate, door and house walk still gets in; v1's movement still agrees with v2's.
- Workers and the main thread agree, byte for byte in both looks, with 5 and 6 workers, over the start, a village from the air and on foot, the grassland, a pasture and a windmill.
- Speed: drawn on one thread, the village from the air costs about 2% more (the rows add a little; fewer trees on the farmland take a little away).

### Still open

- ⚠️ The pastures are empty until step 3's animals.
- ⚠️ You cannot open a gate: it is a gap. Fences are not jumped over.
- The windmill has no inside; its door is painted dark.

## Step 2b: village and town life

Shots: `shots/phase5/step2b/` (`sheet-life`: the market square, a stall, barrels, a woodpile, a farm cart, a crossroads).

### What changed

- **Market stalls in every town's market square**, one in each corner the two streets leave free, facing the market street. Four posts, a counter with goods on it, and an awning of stripes (a colour and plain canvas) sloping down over the front, its stripes ending in a scalloped edge. The two in the corners with a torch post are two cells wide, beside the post; the other two are three wide.
- **Barrels** against the wall beside the taverns' doors (two) and the smithies' (one).
- **Woodpiles:** logs stacked along the wall beside the door, at about half the cottages, longhouses and townhouses.
- **Carts** beside every barn and about a third of the farmhouses (longhouses) outside the towns: along the front wall, sacks on the bed, the shafts down on the ground at one end.
- **Signposts.** Where the road leaves every village, hamlet and town, two cells off it: a board pointing along the road and one pointing home. At every crossroads out in the country: a board along each road, up to four (roads that leave within 35 degrees of each other share one).
- You cannot walk through any of them. Near the camera, or between it and your hero, they are drawn see-through, as the plants are (and now the fences, haystacks and sails too).

### How it is built

- One list of props for the farms and the villages (`newProps`, `addProp`), indexed into `world.props` once both have laid theirs (`indexProps`). New kinds: `PROP.STALL`, `BARREL`, `WOODPILE`, `CART`, `SIGNPOST` and `ARM` (a crossroads' third and fourth boards, on the same post).
- `placeLife` lays them, after the farms. A spot must be dry and off the roads (a town's street will do, beside its houses), with nothing built there (`solidAt`), no other prop, and out of every door's way (the door's cell and three out, three wide). `buildTown` gives its market's corners (`stalls`: where, which way, how wide).
- Crossroads: road cells round which a ring of cells five out (`MEET_RING`) crosses three roads or more, away from anything built, are gathered into meetings; one signpost to 24 cells of road.
- `buildProp` builds each from solids. `PROP_FAR` leaves each kind out past its own distance (100 cells for barrels, woodpiles and signposts, 160 for stalls and carts); posts and shafts are never thinner than about a ray (as the fences' and the plants'); past 50 cells an awning has fewer, wider stripes, and past 90 the goods and sacks are left out.
- New fixed scenes: `market`, `stall`, `barrels`, `woodpile`, `farm-cart`, `crossroads`.

### Numbers

- Seed 42: 16 market stalls in 4 towns, 19 barrels, 28 woodpiles, 4 carts (a barn's, three farmhouses'), 16 signposts (11 where roads leave settlements, 5 at crossroads).
- Tests: all pass, with the world checksums re-recorded (the cells the new things stand on join the walking mask; towns carry their stalls). Every gate, door and house walk still gets in (70 houses on seed 42, 62 to 83 on the others); v1's movement still agrees with v2's.
- Workers and the main thread agree, byte for byte in both looks, with 4, 5, 6 and 7 workers, over the market square, a stall, the barrels, a woodpile, a farm cart, a crossroads, the town market street, a village and a hamlet.
- Speed (Chromium, 6 workers, on a quiet machine): the market square and the town market street hold 60 fps, a frame 6.7 and 7.2 ms (6.7 and 7.1 before); the village and the crossroads do not change. Drawn on one thread, the four stalls cost about 2 ms in the market (two thirds of it the awnings' stripes). Firefox: about 1.4 ms more on the town market street (10.7 ms), the same elsewhere.

### Still open

- ⚠️ Docks on lakes, in the plan's list for this step, are not built yet.
- ⚠️ The stalls have no one behind them, and the boards on the signposts are blank: the people come in step 4.
- A world has few barns (one on seed 42), so most carts stand by farmhouses.
- Capsules (the awnings' stripes, posts, branches) are tested over their whole box on screen; a tighter bound per column would make every solid of that kind cheaper.
