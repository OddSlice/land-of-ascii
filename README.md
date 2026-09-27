# Land of Ascii

A first-person explorer drawn as a mosaic of text characters: a seeded world of terrain, rivers, castles, roads, forests, travelling merchants, torches and campfires, which you can walk, fly and trade in. Every cell of the screen is one glyph in two colours from a hand-built palette; the trees and merchants are real 3D solids.

Land of Ascii started as v2 of [Text Voxel](https://github.com/OddSlice/text-voxel): phase 1 rebuilt the renderer and took over v1's simulation (fixes are listed in `tools/lib/v2-fixes.mjs`). Phase 2 gives it a world of its own: see [docs/phase2-world.md](docs/phase2-world.md).

**Play:** open `index.html` (no build, no dependencies). `?seed=42` gives the world in the pictures below. v1 stays live for comparison: https://oddslice.github.io/text-voxel/.

| | |
|---|---|
| ![Merchant on the lake road, 18:00](shots/road.png) | ![A merchant walking toward you](shots/merchant.png) |
| ![Campfire at the stone circle, 22:30](shots/fire.png) | ![The castle gate at night](shots/gate.png) |

![v1 and v2, the same camera and hour](shots/compare-road.png)

## Controls

As v1: click to capture the mouse (Esc releases it; where pointer lock is refused, drag to look).

| Key | Action |
|---|---|
| W A S D | walk (or fly) |
| Space / Shift | jump / sprint (walking) · up / down (flying) |
| F | walk / fly |
| E | talk to the merchant named in the prompt |
| R | new random seed |
| T | clock ×10 |
| − / + | cell size: 5×10, 6×12, 7×14, 8×16 px |
| [ / ] | view distance |

## Docs

- **[docs/phase2-world.md](docs/phase2-world.md)**: the phase 2 brief (in progress). Varied land, villages and towns, people and animals, and the tests that change with the world.
- **[docs/phase1.md](docs/phase1.md)** covers the build:
  - how a frame is drawn, and the 3D merchants and trees;
  - the render workers;
  - the tests that guard the simulation;
  - measured speed;
  - what is still rough.
- **[docs/direction.md](docs/direction.md)**: phase 0. Three rendered directions and why C was chosen.
- **[docs/research.md](docs/research.md)**: Swaggerfall, mosaic characters, shape-matched glyphs, dithering, palettes, with sources.
- **[docs/brief.md](docs/brief.md)**: the brief.

## Tests and tools

You need Node 18+ and Playwright's Chromium.

```sh
node tools/test-sim.mjs          # the simulation still behaves as ported (same seeds, same inputs, exact)
node tools/check-verbatim.mjs    # the ported simulation code is unchanged except for listed fixes
node tools/shoot.mjs             # screenshots of the scenes in tools/scenes.json -> shots/
node tools/bench-v2.mjs          # frame timings per scene
```

- `reference/v1-index.html` is v1 pinned at commit `989360b`.
- The phase 0 mockup tools (`tools/mockup/`, `capture-*.mjs`, `render-mockups.mjs`) are described in [docs/direction.md](docs/direction.md).
