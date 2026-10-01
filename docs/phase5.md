# Phase 5: a lived-in world

Martin's direction (30 Sep), after true perspective: back to adding more to the world. An inventory, like an RPG's, to see what you bought, and to eat the cheese; then the next phase of filling the world with things.

The plan, agreed the same day (his choices from three questions: food gives a small boost, merchants buy back at half price, and objects come before animals and people):

1. **Your bag.** I opens it: everything you have bought, in groups (worn, carried, food and drink, odds and ends). Eat or drink food: your hero lifts it to their mouth, and you are well fed for a while (you sprint faster). Wear or take off, carry or put away: you choose what shows on your hero. Merchants buy what you have for half its price.
2. **Farms and village life (objects).** What the phase 2 brief listed and was never built: fields with crop rows, fences and pastures by villages and hamlets, haystacks, woodpiles, carts and barrels, market stalls with awnings in the town squares, a windmill with turning sails, docks on lakes, signposts at crossroads. Built in two parts: 2a the farms (fields, pastures, haystacks, windmills), 2b life in the villages and towns (stalls, barrels, woodpiles, carts, signposts).
3. **Animals.** Sheep and cows grazing the pastures, deer in forests that bolt when you come near.
4. **People.** Villagers with a day (fields, the well, the market, home at night), guards at the town gates, a greeting when you talk to them.

After it, phase 4's last steps: roads that make sense, ground that reads, mountains you can climb (`docs/phase4.md`).

### The feedback round (1 Oct)

After step 2b Martin found the world "marginally improved" and asked for a bit more before he sends it to people for feedback. Of four choices (animals, people, colourful farmland, things along the roads) he picked animals and people, and asked for the bag to become an inventory as action RPGs have it, even RuneScape: on the right, the equipment slots and blocks of items. The order now:

3. **An RPG inventory.** Your hero in pixels with ten slots round them, 28 blocks below; click, drag, right-click, hover; trading beside it.
4. **Animals** (was 3): sheep and cows in the pastures and meadows, chickens round the village houses, ducks on ponds and lakes, deer in the forests that run off when you come near.
5. **People** (was 4): villagers with a day in every village and town, a trader behind each market stall, guards at the town gates, farmers in the fields; a greeting when you talk to them.

Colourful farmland (sunflowers, lavender, roses, orchards, vineyards) and things along the roads (docks, shrines, travellers' camps) wait.

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

## Step 3: an RPG inventory

Shots: `shots/phase5/step3/` (`sheet-inventory`: the bag, a note on hover, the right-click menu, dragging a tunic onto your hero, eating with the bag open, trading).

How the games do it, which this follows: RuneScape gives you 28 inventory slots and 11 worn-equipment slots laid out as a body ([interface](https://oldschool.runescape.wiki/w/Interface)); Diablo's inventory is a "paper doll" of the character dressed in what is equipped, with a grid of items below it ([paper doll](https://di.diablowiki.net/Paperdoll), [inventory](https://di.diablowiki.net/Inventory)).

### What changed

- **I opens your bag on the right** of the screen; the world stays in view (the game waits, as while you trade). In it:
  - **your hero, drawn in pixels,** wearing exactly what you wear and carry: the tunic's colour, cap, cloak, boots, the sword's hilt over the shoulder, the shield on the back, lantern, rope, kettle, map, the cider's flask;
  - **ten slots round them:** head, back, body and feet down the left; weapon, shield and light on the right; rope, kettle and map on the belt. An empty slot shows the shape of what goes in it, faint;
  - **28 blocks below** (4 by 7, as RuneScape's 28) for everything else, with a number on each stack;
  - your gold, and how long you stay well fed.
- **Every good has its own pixel icon,** 16 by 16, drawn in code from the game's colours. The cap takes your tunic's colour and the cloak turns brown over a red tunic, as on your hero.
- **Using things.** Click a block to eat or drink it (your hero eats it beside the open bag) or to put it on or carry it (whatever was in that slot goes back into the blocks). Click a slot to take it off or put it away. Right-click for every action and Examine. Hover over a block, or reach it with the keyboard, for a note: what it is, what it does, what a click does. **Drag** a block onto your hero or its slot to put it on, a slot into the blocks to take it off, a block onto another to move it.
- **Trading:** the merchant's wares on the left, in blocks with their prices (a coin mark; dimmed when you cannot pay), your bag on the right. Click a ware, or drag it into your bag, to buy; click a block of yours, or drag it onto their wares, to sell for half its price. What you sold them since you came is under BUY BACK, for what they paid.
- The key legend hides while a panel is open. The panels fit screens from 1280 by 720: smaller blocks below 760 pixels tall, bigger above 860.

### How it is built

- `bag.grid`: the 28 blocks, a good's name or nothing each; `layoutBag` keeps it in step (what is gone empties its block, what is new takes the first empty one). What is worn is kept as before (`bag.off`, `wardrobe.tunic`); `worn`, `inBlocks` (all but the one worn), `slotHolds`, `equipItem` and `unequipItem` build on it, and `toggleItem` stays for the tools.
- `ITEM` gives each good its slot (`SLOTS` and `PAPER` lay the slots out), or food's time and which it is in the hand, a line about it and a note on what it does.
- The pictures: `ICON_ART`, `DOLL_BASE`, `DOLL_GEAR` and `dollLayers` are pixel art in strings, with an outline added round every shape (`pixels`); `iconURL` draws each icon once (per tunic for the cap and the cloak); `drawDoll` paints your hero from `hero.gear`.
- The panel is HTML (`#inv`, built once; `renderInv` fills it), with a note (`#tip`), a menu (`#menu`) and a drag image (`#ghost`). Pointer events on the page handle clicks, right-clicks and drags (`primary`, `actionsFor`, `dropTarget`). `syncInv`, every frame, shows the bag while any panel is open and forgets the buy-back list when it closes.
- Trading: v1's `openPanel` and `closePanel` are unchanged (`check-verbatim.mjs` still compares them); `renderGoods`, v2's own since step 1, draws the wares and the buy-back list as blocks and the bag beside them (`buyBack`, `sold`).

### Numbers

- Tests: all pass. The bag test also checks the ten slots and 28 blocks, that what is worn sits in its slot and the rest in the blocks, putting on and taking off (a tunic, the cloak), and selling and buying back.
- A check driven by the mouse (hover, right-click, three drags, a click to eat, Esc, trading, selling, buying back, dragging a ware into the bag) passes in Chromium, Firefox and WebKit, with no errors in the page.
- The picture of the world is unchanged: the bag is a panel over it, and the renderer did not change.

### Still open

- ⚠️ The candle and the lucky pebble still do nothing.
- ⚠️ The right-click menu needs the mouse (or the keyboard's menu key); Tab and Enter reach and use every block.
- You cannot drop things on the ground, and there is no bank.

## Step 4: animals

Shots: `shots/phase5/step4/` (`sheet-animals`: a flock, sheep in a pasture, a cow, hens, ducks, a stag, deer at the forest's edge, the flock in the mosaic look).

### What changed

- **Sheep or cows in every pasture:** five to eight sheep, or two to four cows (brown, black, cream, or black with a white belt), each grazing its own part of the pasture.
- **A flock on open grass** 30 to 90 cells out from most villages and hamlets: six to ten sheep, now and then a black one.
- **Hens** before about half the village and hamlet houses: white, brown or black, with red combs, pecking in quick bobs.
- **Ducks** on the open water nearest each village, hamlet and town (a pond, a lake or a wide stream, not the sea): brown ducks, grey drakes with green heads, now and then a white one, dabbling with their tails up.
- **Deer** in the forests' clearings and at their edges: herds of two to five, red-brown with pale tails, the first a stag with antlers.
- **They live their day:** each turns, walks to a new spot and grazes there, head down, looking up now and then; their legs swing as they walk.
- **They notice you:** walk up to a sheep, a cow, a hen or a duck and it moves off (never out of its pen), heads up while you are near. A deer bolts when you come within 14 cells, bounding away, and keeps away a while before it goes back. Flying, you are not noticed.

### How it is built

- `placeAnimals`, in world generation after the trees, from hashes alone, so nothing else in the world changes: `world.animals`, each with its own patch (`x0`..`x1`, `z0`..`z1`; a flock shares its pasture or its grass out, a patch each, so none stands on another), a pen where it has one (pastures, flocks, hens, ducks), which of its kind it is (`v`) and its number (`k`). `placeFarms` now records the pastures (`world.pastures`).
- `animalAt`: the timetable, a function of the time alone. Each move's spot comes from the hashes of the animal and the move's number: turn, walk there (setting off and stopping gently), then graze, so any frame shows the same for the same moment, and animals far away cost nothing.
- `updateAnimals`, every frame, for the animals within 180 cells: the timetable's place, pushed away from you while you are near (`ANIMAL_KIND`: how near, how fast, how far), back to the timetable once you have gone, clamped to the pen; the way it faces follows where it goes; `world.herd` carries kind, place, heading, gait, head and speed to the renderer, and to the workers with each frame.
- `buildAnimal` (in `renderCore`) draws each kind from solids, as the figures are (`K.MERCHANT`, its parts `AP.*`); `ANIMAL_FAR` leaves each out past its distance (hens 45 cells, ducks 70, sheep 120, deer 150, cows 160). Legs are never thinner than about a ray; in the third person an animal between the camera and your hero is see-through, as the plants are.
- New fixed scenes: `flock`, `sheep`, `cows`, `hens`, `ducks`, `deer`, `deer-meadow` (third person: walk on and the deer bolt).

### Numbers

- Seed 42: 49 sheep, 11 cows, 44 hens, 9 ducks and 21 deer (in 6 herds). The other seeds: 30 to 90 sheep, 3 to 19 cows, 29 to 37 hens, 12 to 22 ducks, 5 to 46 deer (a dry world has few forests).
- Tests: all pass, with the world checksums re-recorded for a new part only (the animals as placed; the rest of every world is unchanged). The new section 7 checks every seed: each animal keeps to its patch over 120 moves, ducks always on the water and the rest never in it; and near you, a sheep moves off (to 3 cells) and stays in its pen, and a deer 6 cells off bolts (to 16 cells).
- Workers and the main thread agree, byte for byte in both looks, with 4, 5, 6 and 7 workers, over the seven animal scenes and the fields.
- Speed (Chromium, 6 workers, a quiet machine): about 0.1 to 0.2 ms a frame where there are animals (the flock 6.9 ms, the deer meadow 7.1 ms, the fields 7.8 ms), 60 fps; drawn on one thread, the flock costs 0.4 ms.

### Still open

- ⚠️ Animals do not stand in your way: they move off first, but a quick walk can pass through one.
- ⚠️ Nothing sleeps: the animals stay out at night.
- Ducks only where there is open water near a settlement; few deer on dry worlds.
- In their patch, animals walk through haystacks, barrels and tree trunks.

## Step 5: people

Shots: `shots/phase5/step5/` (`sheet-people`: the town street, the market, guards at the gate, farmers, a trader, a village square, a guard answering).

### What changed

- **People in every village, hamlet and town:** one or two to each home (cottages, longhouses, townhouses, the tavern, the smithy). Women in long dresses and headscarves, men in tunics and trousers, some in felt or fur hats, all in the game's colours.
- **A day of their own:** out of the door after sunrise (between 6:15 and 8:00); to the square, the well, the market or the chapel, standing about a while talking with their hands; on to another; home before dark (between 18:30 and 20:30). At night they are indoors. Every step is on ground one can walk: along the streets, through the gates, round the houses, never through a wall.
- **Farmers** (a third of the villagers, a sixth of the townsfolk) walk out to the fields in straw hats and hoe a row of their own, up and down, two and a half or five hours at a time.
- **A trader behind each market stall** by day (about 7:00 to 19:00), in an apron.
- **Two guards at every town's gate**, day and night: helmets, tabards in red or blue, spears and shields, pacing a little.
- **Talking to them.** Walk up to someone and the prompt says E greet and their name (E trade with, at a stall). A villager, a farmer or a guard answers with a line of their own on the note at the top, and looks at you with a hand raised; anyone you pass close turns their head to look. A trader shows their wares (bread, cheese, fish, cider and candles) as a merchant does, and buys from you too.
- On seed 42, 127 people: 86 villagers, 17 farmers, 16 traders and 8 guards; at 11:00 about nine in ten are out.

### How it is built

- `placePeople`, in world generation after the animals, from hashes alone. For each village, hamlet and town, `buildNav` makes a map for walking: a box over it and its fields, and for each cell the ground's height and whether one can stand there (dry, no trunk or prop, nothing built at body height). The places people go (`places`: the square, or a town's market, its well and the square before its castle; a chapel's door; up to three spots in the fields) each get a `navField`: Dijkstra over the map, how far it is and which way to step from every cell, never up more than a stair nor across a corner. Then the people: villagers and farmers (a home: the cell before their door), traders (their stall, hours and wares: `shop`), guards (their gate).
- `planOf(p, day)` is a villager's day, from the person and the day alone: when they leave, where they go (`spotOf`: a spot of their own round the place's middle, or a farmer's row), how long they stay, and home by bedtime; legs of [from, to, set off, arrive, leave]. `legPath` is the way, cached: from one's spot to the middle of the place ahead and out to one's spot there (or home), every step on the map. `personAt(p, day, hour)` gives where they are and what they do by the clock, so time ×10 makes their day go ten times faster.
- `updatePeople`, every frame, for the people of the settlements near you: their place; their head turned toward you when you are close, or a wave after you greet them; `world.crowd` for the renderer and the workers; and the one you could greet (`peopleUI.near`). The prompt is v1's, shown when no merchant is near; E (`greet`) answers with a note, or for a trader opens v1's trade panel on their `shop`.
- `buildPerson`, in `renderCore`, draws them as your hero is drawn, with skirts, scarves, hats, aprons, a hoe, a spear and a shield; fewer parts past 35 cells, none past 130.
- `buildTown` now also returns where its townsfolk gather (`market`, `well`, `square`).
- A bug found on the way: the first Dijkstra kept its distances in 32 bits and its queue in 64, so cells were skipped or queued over and over; it keeps them in 64 bits while it searches now, and each search takes 2 to 4 ms.
- New fixed scenes: `guards`, `farmer`, `trader`, `village-square`.

### Numbers

- Tests: all pass, with the world checksums re-recorded (the towns' gathering places, in the structs, and a new part for the people). The new section 8 checks every seed over a whole day, every 3 game minutes: nobody stands in a wall or in water, and nobody jumps; at 3:00 only the guards are out, and at 11:00 most people are (59 to 91 in a hundred). E near a villager greets them, and near a trader shows their wares.
- A world takes 0.2 to 0.4 s longer to make (2.6 to 2.8 s in all): the walking maps and about 90 searches.
- Workers and the main thread agree, byte for byte in both looks, with 4, 5, 6 and 7 workers, over the town street, the market, the guards, the farmers, a trader, a village square and where you start.
- Speed (Chromium, 6 workers, a quiet machine): within 0.1 to 0.2 ms of before (the town street 6.5 ms, the market 7.4, the village 8.5, where you start 7.6), 60 fps. Drawn on one thread, the market's people cost about 1.2 ms. Firefox: about 1 ms more in the towns (the market 11.6 ms). Moving everyone near you costs 0.02 ms a frame on the main thread.

### Still open

- ⚠️ People do not stand in your way, nor in each other's: they walk through you, and two can pass through each other.
- ⚠️ Nobody goes inside: people vanish at their door at night and appear there in the morning. At night only the guards are out.
- ⚠️ The merchants on the roads are still v1's, and greet in their own way (E opens their wares).
- First names only, and a handful of lines for each kind of person.
- This round is done: Martin sends the game out for feedback. Colourful farmland and things along the roads (docks, shrines, travellers' camps) wait.
