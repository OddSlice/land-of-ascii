# Phase 5: a lived-in world

Martin's direction (30 Sep), after true perspective: back to adding more to the world. An inventory, like an RPG's, to see what you bought, and to eat the cheese; then the next phase of filling the world with things.

The plan, agreed the same day (his choices from three questions: food gives a small boost, merchants buy back at half price, and objects come before animals and people):

1. **Your bag.** I opens it: everything you have bought, in groups (worn, carried, food and drink, odds and ends). Eat or drink food: your hero lifts it to their mouth, and you are well fed for a while (you sprint faster). Wear or take off, carry or put away: you choose what shows on your hero. Merchants buy what you have for half its price.
2. **Farms and village life (objects).** What the phase 2 brief listed and was never built: fields with crop rows, fences and pastures by villages and hamlets, haystacks, woodpiles, carts and barrels, market stalls with awnings in the town squares, a windmill with turning sails, docks on lakes, signposts at crossroads.
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
