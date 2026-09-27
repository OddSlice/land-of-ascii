# Research notes: what makes a text-mode world read as crafted

Phase 0 of the renderer rebuild. These are the findings the [direction document](direction.md) rests on, with sources. Where a claim comes from reading source code I link the file; where it comes from a page I could only reach through a search engine's excerpt, I say so.

## 0. What I could and could not look at

This work ran in a cloud container whose network policy allows GitHub and the package registries and blocks almost everything else: itch.io, img.itch.zone, YouTube, Wikipedia, unicode.org, lospec.com, 16colo.rs, hpjansson.org. The page-fetch tool goes through the same policy. So:

- **Swaggerfall**: I read the itch page and every devlog only as search-engine excerpts, and I could not watch the trailer, the gameplay video, the devlog videos or the TikTok/YouTube shorts, or load the web build. Nothing below about Swaggerfall comes from looking at its frames. The questions the brief asks about its frames (cell density on screen, colours on screen, how edges, skies, fog, night, interiors and faces are drawn) are answered from the devlogs where they speak to them and marked as unknown otherwise. Allowing `holonaut64.itch.io`, `img.itch.zone`, `html-classic.itch.zone`, `www.youtube.com` and `i.ytimg.com` in the environment's network settings, or dropping a few screenshots into the chat, would close that gap.
- **Everything hosted on GitHub** I read at the source: chafa, notcurses, TerminalImageViewer, Ratatui, Acerola's ASCII shader, Alex Harri's article and renderer, Surma's Ditherpunk, Asciicker's renderer, DawnBringer's palettes.

## 1. Swaggerfall (holonaut64)

What the devlogs say, in their words where I have them:

- A first-person open-world fantasy RPG in the terminal, written in Rust with Ratatui, exported to the web. "The graphics are ascii based and limited to what the command line offers (luckily this includes background colors for text glyphs)." ([itch page](https://holonaut64.itch.io/swaggerfall), [Votekicker](https://votekicker.com/projects/swaggerfall))
- **Density.** The developer recommends a font size giving about **15,000 text cells**, "a sweet spot where you can actually see things but the text is still big enough to read easily", and says 15–20k cells keep the UI readable ([0.1.10 alpha release](https://holonaut64.itch.io/swaggerfall/devlog/1648601/swaggerfall-alpha-release-0110)). At 1440×900 with 1:2 cells that is about 219×68 cells of about 6.6×13 px. v1 runs 360×129 = 46,440 cells, three times denser, which is one reason its glyphs cannot carry any shape.
- **Palette.** "By reducing the color palette, many cells share the same color and don't need updates in the terminal as often" ([0.1.13](https://holonaut64.itch.io/swaggerfall/devlog/1653303/0113-performance-visual-fixes)). The 3D model importer was changed to keep "up to 64 colors instead of 5" per model ([0.1.12](https://holonaut64.itch.io/swaggerfall/devlog/1652359/0112-gamepad-support-more)). So Swaggerfall's colour budget is deliberately small, per object and on screen.
- **Glyphs in the sky.** 0.1.11 "removed foreground glyphs from the sky during daytime (except in ASCII purist mode)" and added a brightness slider for terminals where colours come out too dark ([0.1.11](https://holonaut64.itch.io/swaggerfall/devlog/1648703/0111-brightness-setting)). Even Swaggerfall keeps the day sky as plain background colour and saves glyph texture for surfaces.
- **Supersampling.** Experimental *selective* supersampling at the ultra setting, which halves the frame rate; full supersampling "requires 4x more calculations per cell" and "is a performance killer" ([0.1.14](https://holonaut64.itch.io/swaggerfall/devlog/1664062/0114-better-cities-new-soundtrack)). 0.1.14 also added semi-transparent shallow water and sun and moon reflections.
- **0.1.15** added shadows and godrays (godrays cost about 20–30% of the frame rate), reworked twilight sky colouring and cloud lighting, and cut frame times by 30–40% in cities ([0.1.15](https://holonaut64.itch.io/swaggerfall/devlog/1672464/0115-shadows-painting-mercantilism-more-combat-skills)).
- **Frame time.** 0.1.13 halved frame times by giving distant deer a low level of detail ([0.1.13](https://holonaut64.itch.io/swaggerfall/devlog/1653303/0113-performance-visual-fixes)).
- The web build goes through Ratatui's web tooling; [Ratzilla](https://github.com/ratatui/ratzilla) offers DOM, Canvas and WebGL2 backends. I could not confirm which one Swaggerfall uses. Ratatui's canvas offers half-block, quadrant, sextant, octant and Braille markers ([marker.rs](https://github.com/ratatui/ratatui/blob/main/ratatui-core/src/symbols/marker.rs)).
- Not watched: [trailer](https://www.youtube.com/watch?v=_Oni8YKtfog), [gameplay](https://www.youtube.com/watch?v=E-KhW3qnucQ), [godrays and shadows](https://www.youtube.com/watch?v=mG9o7q--U40), [storms and sky overhaul](https://www.youtube.com/watch?v=AarwUODuJ3w), [3D rendering deep dive](https://www.youtube.com/watch?v=IVUydUWGYEM).

My reading: Swaggerfall's picture is background colour in a small palette at 15–20k cells, with foreground glyphs as texture on surfaces, and extra samples where edges are. To stand next to it and beat it we should sit in the same density band, draw edges by shape instead of by averaging, choose the palette by hand, give surfaces a glyph vocabulary, and light the night. Still unknown until I can see frames: how Swaggerfall draws silhouettes and faces, and how many colours it actually shows at once.

## 2. More than one pixel per cell: the block characters

- **Half blocks** `▀ ▄` (Block Elements, U+2580–U+259F): with the foreground on one half and the background on the other, one cell carries two independently coloured pixels. Because cells are about 1:2, those pixels are square. **Quadrants** `▘▝▖▗▚▞▙▛▜▟` give 2×2. **Sextants** (60 characters at U+1FB00–U+1FB3B, Unicode 13) give 2×3. **Octants** (230 characters at U+1CD00–U+1CDE5, [Unicode 16](https://unicode.org/charts/PDF/Unicode-16.0/U160-1CC00.pdf)) give 2×4. **Braille** (U+2800–U+28FF) gives 2×4 dots with gaps between them. The "smooth mosaic" wedges from U+1FB3C cut a cell with a diagonal ([Symbols for Legacy Computing](https://www.unicode.org/charts/PDF/U1FB00.pdf)).
- The best one-page account of the trade-offs is notcurses' own documentation ([notcurses_visual(3)](https://github.com/dankamongmen/notcurses/blob/master/doc/man/man3/notcurses_visual.3.md)):
  - 2×1 "will not distort the image whatsoever".
  - 3×2 stretches by 1.5 and splits unevenly in a 14 px tall cell.
  - 4×2 keeps the aspect ratio "but can lose color fidelity".
  - Braille "doesn't tend to work out very well for images".
  - Above all: "there are only ever two colors available to us in a given cell."
- Font support for sextants and octants is patchy, and the brief already notes that a font's `▓` rasterises solid at 4 px. For us that means every block, mosaic, shade and line glyph is a mask we build ourselves. Once we do that, font support stops mattering: an "octant" is just a bitmap in our atlas.

## 3. Choosing the glyph by shape

- **chafa** treats each symbol as an 8×8 coverage bitmap (a 64-bit word). It turns each cell into a bitmap with a contrasting colour pair, shortlists symbols by Hamming distance (popcount), then picks fg and bg as the mean (or median, "crisper") colour under and outside the symbol. Symbol classes include block, border, wedge, sextant, braille, ascii and legacy, and the default set is `block+border+space`. Dithering can be none, ordered, diffusion or noise, with a grain in cell units, and `--work` trades accuracy for speed. Sources: [chafa-symbol-map.c](https://github.com/hpjansson/chafa/blob/master/chafa/chafa-symbol-map.c), [chafa-work-cell.c](https://github.com/hpjansson/chafa/blob/master/chafa/internal/chafa-work-cell.c), [man page](https://github.com/hpjansson/chafa/blob/master/docs/chafa.xml). It is the gold standard for images, and it has to guess where objects end, which a game does not.
- **TerminalImageViewer** does the cheap version per 4×8 cell ([README](https://github.com/stefanhaustein/TerminalImageViewer/blob/master/README.md), [tiv_lib.cpp](https://github.com/stefanhaustein/TerminalImageViewer/blob/master/src/tiv_lib.cpp)):
  1. Take the colour channel with the widest range.
  2. Split that range in the middle into a 32-bit bitmap.
  3. Compare the bitmap against block and box-drawing bitmaps, dropping those that are just another glyph inverted.
  4. Recompute fg and bg for the winner.
- **Alex Harri, "ASCII characters are not pixels" (January 2026)** ([article source](https://github.com/alexharri/website/blob/master/posts/ascii-rendering.md), [renderer](https://github.com/alexharri/website/tree/master/scripts/ascii)):
  - Averaging each cell to one value is nearest-neighbour downsampling, and supersampling only blurs it: "that's the core problem: treating each grid cell as a pixel in an image."
  - He picks characters by nearest neighbour over 6-dimensional "shape vectors" from staggered sampling circles.
  - He sharpens boundaries with a "crunch" contrast step, plus a directional one that looks at samples just outside the cell to stop staircasing.
  - Cost: 100k lookups take 190 ms brute force, 66 ms with a k-d tree, and a few ms with a cache of quantised keys. He moved the sampling to the GPU to reach 60 fps on a phone.
- **Structure-based ASCII art** (Xu, Zhang, Wong, SIGGRAPH 2010, [paper](https://ttwong12.github.io/papers/asciiart/asciiart.pdf)): tone-based ASCII "leads to halftone-like results" and needs many cells. Matching line structure with an alignment-insensitive shape metric is what hand-made ASCII art does.
- **Acerola's ASCII shader** ([AcerolaFX_ASCII.fx](https://github.com/GarrettGunnell/AcerolaFX/blob/main/Shaders/AcerolaFX_ASCII.fx), [its glyph textures](https://github.com/GarrettGunnell/AcerolaFX/tree/main/Textures)):
  - Edges come from a difference of Gaussians plus depth and normal thresholds.
  - A Sobel angle is quantised to `| — / \` per pixel, and each 8×8 tile votes, with a minimum count before an edge glyph wins.
  - Everything else uses a 10-step fill ramp ` .:coPO?@█` from a hand-pixelled 8×8 texture, faded to the background with depth.
- **Text-mode demos.** Jari Komppa's [TextFX](https://solhsa.com/textfx/index.html) half-block filter tries both half-tall and half-wide splits per cell, turning 80×50 text into 160×100 16-colour pixels. The Text Mode Demo Contest's own description ([TMDC](https://tmdc.scene.org/), [interview](http://www.digital-tools-blog.com/interview/67-jari-komppa-on-text-mode-demos-and-the-tmdc-text-mode-demo-contest)) says the constraints force "different forms of anti-aliasing and careful adjustment of contrast and color balance". AAlib (1997, for the BB demo) is where real-time ASCII rendering of moving pictures started.
- **Asciicker** (a 3D ASCII game in the browser; [render.cpp](https://github.com/msokalski/asciicker/blob/master/render.cpp)) is the closest relative of this project:
  - It renders 2×2 samples per cell.
  - For each colour it finds the pair of xterm-256 cube colours whose segment passes closest and picks a glyph from ` ..::%` by where the colour falls along it (`create_auto_mat`). That is dithering with glyphs between two palette colours.
  - At silhouettes it splits cells into halves (`AverageGlyph` with masks 0xC, 0x3, 0xA, 0x5).
- **What image viewers get wrong for us.** Half-block viewers (viu, timg's block mode) are crisp but read as pixel art. Braille is sparse and dotty with one colour per cell. Density ramps smear shape. chafa-class matching is excellent, but on its own it looks "converted": it has no idea what a tree is, so it cannot give a tree tree-like texture.

## 4. Dithering, and dithering in motion

- Surma's [Ditherpunk](https://surma.dev/things/ditherpunk/) covers:
  - Dithering in linear light, not sRGB.
  - Bayer matrices, and their bias in dark areas.
  - Blue noise by Ulichney's void-and-cluster method, which is "just as fast to apply" as white noise.
  - Error diffusion.
  - Obra Dinn uses Bayer for people and objects and blue noise for the environment, so the two read apart.
- Lucas Pope's Obra Dinn devlog ([TIGSource, November 2017](https://dukope.com/devlogs/obra-dinn/tig-32/); summary in [Alan Zucconi](https://www.alanzucconi.com/2018/10/24/shader-showcase-saturday-11/)): screen-space dither shimmers when the camera moves and made players motion-sick at full screen. He pinned the pattern to the camera's rotation, but translation still swims.
- What that means here, which I confirmed while iterating: our cells are 6×12 px, so ordered dither **per cell** tiles the screen like a quilt. Dither belongs *inside* a cell (the `░ ▒ ▓` masks), used only in narrow bands where one tone meets the next. Surface texture belongs to the world, so it travels with the ground instead of swimming.

## 5. Palette and composition discipline

- **ANSI art** has 16 foreground colours and 8 background colours; "iCE colors" reuse the blink bit to get 16 backgrounds ([16colo.rs forum](https://forum.16colo.rs/t/ice-colors-or-blinking-text/27), [ANSI art](https://en.wikipedia.org/wiki/ANSI_art)). It is built on CP437 blocks, shades and box lines ([16colo.rs](https://16colo.rs/)).
- **PETSCII** is a 40×25 grid with one foreground colour per cell over one global background, from 16 colours ([Reunanen et al., "PETSCII – A Character Set and a Creative Platform"](https://czasopisma.uni.lodz.pl/Replay/article/download/5930/5595/16810), [Marq's PETSCII editor](https://www.kameli.net/marq/?page_id=2717)). Its art reads as crafted because a person picks each character for what it *is*.
- **Curated palettes.** DawnBringer's DB16 won PixelJoint's 16-colour palette competition. Its steps are built to be close to perceptually even ([PixelJoint thread](https://pixeljoint.com/forum/forum_posts.asp?TID=12795), [palette files](https://github.com/geoffb/dawnbringer-palettes)), and DB16 and DB32 ship as Aseprite presets. Hue shifting ([Slynyrd, Pixelblog 1](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes)) makes each ramp's shadows "a little more blue and less saturated (colder)" and its lights "a little more yellow and saturated (warmer)"; straight brightness ramps look lifeless and don't harmonise with each other.
- **Time of day as palettes.** Mark Ferrari's colour-cycling scenes take one piece of art through a sequence of palettes to cover all 24 hours ([Canvas Cycle](https://www.effectgames.com/demos/canvascycle/), [Q&A](https://www.effectgames.com/effect/article-Q_A_with_Mark_J_Ferrari.html)).
- **Roguelikes.** Brogue's "dancing" colours vary a tile's colour over time to keep the dungeon alive, and its light sources are coloured ([notes](http://anderoonies.github.io/2021/07/10/roguelike-dev-does-the-complete-roguelike-tutorial-weeks-1-and-2.html), [review](https://waltoriouswritesaboutgames.com/2011/10/26/roguelike-highlights-brogue/)). Cogmind's ASCII is line art: line segments with the odd block forming a semi-abstract outline ([gallery](https://www.gridsagegames.com/blog/2014/12/cogmind-ascii-art-gallery/), [particles](https://www.gridsagegames.com/blog/2014/03/particle-effects/)).

## 6. v1, measured

- **Grid.** 360×129 cells of 4×7 px (46k cells). One colour per cell, with the glyph's off-pixels drawn as a dimmed copy of that colour. The block glyphs are hand-built, so the dominant `▓` becomes a horizontal scanline weave.
- **Colours.** 3,533–4,199 distinct colours on screen in the three test scenes (`tools/frames/colour-counts.json`). They come from a 16-step shade ramp × 8 fog steps × a blended day/dusk/night palette × per-point light, so no palette identity survives.
- **Presentation.** The canvas is sized in CSS pixels (`canvas.width = innerWidth`) with no `image-rendering` rule. On a 2× display the browser upscales it with smoothing, so every cell edge gets a half-blended seam: [side-by-side](../mockups/compare/v1-retina-softening.png). This is independent of the art direction and cheap to fix.
- **Cost here.** This container runs v1 at 8.1 ms raymarch and 3.8 ms compose per frame at the spawn, against about 4 ms and 2 ms on your Mac, so every timing in the direction document is divided by 2.

## 7. Principles I took from all this

1. **Sit in Swaggerfall's density band** (15–20k cells) so each glyph is big enough to carry a shape. That means 6×12 px cells: 240×75 = 18,000 at 1440×900.
2. **Two colours per cell, always from a designed palette.** Tens of colours on screen, not thousands.
3. **Draw silhouettes with glyph shapes chosen from what the ray hit.** We know object ids and depths per ray, which image converters have to guess at.
4. **Give surfaces a vocabulary**: tufts, waves, crags, flakes, leaf clubs, needles, bark, mortar. Anchor it to the world and jitter it so it never lines up into rows. Keep the sky plain, with bands and stars.
5. **Fog as calm layers** (near → far ramp → haze → horizon) with narrow dithered seams. **Firelight as its own warm ramp**, and a glow in the air around flames.
6. **Every glyph is our own mask**: block, mosaic, wedge, shade, line and letter. Never trust the font.
7. **Present crisply**: `image-rendering: pixelated`, or a canvas sized in device pixels.
